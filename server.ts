import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 8080;
const WEBHOOK_QUEUE_FILE = path.join(__dirname, '.sheets-webhook-queue.json');

export interface WebhookStagingRow {
  id: string;
  receivedAt: string;
  spreadsheetId?: string;
  spreadsheetName?: string;
  sheetName?: string;
  rawRow: Record<string, any>;
}

function readWebhookQueue(): WebhookStagingRow[] {
  try {
    if (fs.existsSync(WEBHOOK_QUEUE_FILE)) {
      const content = fs.readFileSync(WEBHOOK_QUEUE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.warn('[WebhookQueue] Failed to read queue file:', err);
  }
  return [];
}

function writeWebhookQueue(queue: WebhookStagingRow[]): void {
  try {
    fs.writeFileSync(WEBHOOK_QUEUE_FILE, JSON.stringify(queue.slice(0, 2000), null, 2), 'utf-8');
  } catch (err) {
    console.warn('[WebhookQueue] Failed to persist queue file:', err);
  }
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi pada environment server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // 1. Health & Webhook Status Endpoint
  app.get('/api/health', (_req, res) => {
    const queue = readWebhookQueue();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      webhookQueueCount: queue.length
    });
  });

  // 2. AI-Assisted Smart Column Mapper Endpoint (Gemini API)
  app.post('/api/ai/map-columns', async (req, res) => {
    try {
      const { headers, sampleRows } = req.body || {};
      if (!Array.isArray(headers) || headers.length === 0) {
        res.status(400).json({ error: 'Parameter headers (array nama kolom) wajib dikirim.' });
        return;
      }

      const ai = getGenAIClient();
      const samplePreview = Array.isArray(sampleRows) ? sampleRows.slice(0, 3) : [];

      const prompt = `Anda adalah asisten akuntansi sistem ERP D'Kandang Amazing Farm.
Tugas Anda adalah memetakan daftar nama kolom (header) dari file Excel / Google Sheets pengguna ke dalam field skema standar cash_transactions.

Daftar nama kolom dari file pengguna:
${JSON.stringify(headers)}

Contoh isi baris data (maksimal 3 baris pertama):
${JSON.stringify(samplePreview, null, 2)}

Aturan pemetaan:
- Pilih PERSIS salah satu nama kolom dari daftar header pengguna untuk setiap field yang cocok.
- Jika tidak ada kolom yang cocok untuk suatu field, isi dengan string kosong "".
- dateCol: kolom tanggal transaksi / tanggal faktur (misal: Tanggal, Tgl, Date).
- receivedDateCol: kolom tanggal uang diterima / masuk rekening (jika ada kolom terpisah).
- typeCol: kolom jenis arus kas masuk/keluar/debit/kredit (misal: Tipe, Jenis, Masuk/Keluar, In/Out, Type).
- descriptionCol: kolom uraian / deskripsi / keterangan / keperluan / nama item transaksi.
- amountCol: kolom nominal rupiah / jumlah uang / total harga (misal: Nominal, Jumlah (Rp), Total, Amount).
- qtyCol: kolom kuantitas / jumlah barang (misal: Qty, Kuantitas, Volume).
- unitCol: kolom satuan barang (misal: Satuan, Unit).
- unitPriceCol: kolom harga satuan (misal: Harga Satuan, Unit Price).
- sourceAccountCol: kolom nama rekening bank atau kas sumber/tujuan (misal: Rekening, Bank, Sumber Dana, Account).
- budgetCol: kolom pos anggaran / departemen / divisi.
- schoolOrEntityCol: kolom nama sekolah / klien / instansi / vendor / pelanggan.
- paymentStageCol: kolom tahap pembayaran (misal: DP, Termin, Pelunasan, Status Bayar).
- incomeSourceCol: kolom kategori sumber pendapatan (misal: Kunjungan Sekolah, Tiket, Susu, Resto).
- referenceCol: kolom nomor referensi / nomor bukti / no kwitansi / no invoice.
- categoryCol: kolom kategori arus kas (Operating, Investing, Financing).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              dateCol: { type: Type.STRING },
              receivedDateCol: { type: Type.STRING },
              typeCol: { type: Type.STRING },
              descriptionCol: { type: Type.STRING },
              amountCol: { type: Type.STRING },
              qtyCol: { type: Type.STRING },
              unitCol: { type: Type.STRING },
              unitPriceCol: { type: Type.STRING },
              sourceAccountCol: { type: Type.STRING },
              budgetCol: { type: Type.STRING },
              schoolOrEntityCol: { type: Type.STRING },
              paymentStageCol: { type: Type.STRING },
              incomeSourceCol: { type: Type.STRING },
              referenceCol: { type: Type.STRING },
              categoryCol: { type: Type.STRING }
            },
            required: [
              'dateCol',
              'receivedDateCol',
              'typeCol',
              'descriptionCol',
              'amountCol',
              'qtyCol',
              'unitCol',
              'unitPriceCol',
              'sourceAccountCol',
              'budgetCol',
              'schoolOrEntityCol',
              'paymentStageCol',
              'incomeSourceCol',
              'referenceCol',
              'categoryCol'
            ]
          }
        }
      });

      const rawText = (response.text ?? '{}').trim();
      const parsedMapping = JSON.parse(rawText);

      // Sanitize: ensure mapped values actually exist in headers
      const headerSet = new Set(headers);
      const sanitizedMapping: Record<string, string> = {};
      for (const [key, val] of Object.entries(parsedMapping)) {
        sanitizedMapping[key] = typeof val === 'string' && headerSet.has(val) ? val : '';
      }

      res.json({
        success: true,
        mapping: sanitizedMapping
      });
    } catch (error: any) {
      console.error('[/api/ai/map-columns] Error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Gagal menjalankan pemetaan kolom dengan Gemini AI.'
      });
    }
  });

  // 3. Server-Side Proxy for Google Sheets Public CSV Export (Avoids Browser CORS)
  app.get('/api/sheets/fetch-csv', async (req, res) => {
    try {
      const spreadsheetId = String(req.query.spreadsheetId || '').trim();
      const gid = String(req.query.gid || '0').trim();
      const sheetName = String(req.query.sheetName || '').trim();

      if (!spreadsheetId) {
        res.status(400).json({ error: 'Parameter spreadsheetId wajib diisi.' });
        return;
      }

      const sheetParam = sheetName
        ? `&sheet=${encodeURIComponent(sheetName)}`
        : `&gid=${encodeURIComponent(gid || '0')}`;
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?tqx=out:csv${sheetParam}`;
      const exportUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(gid || '0')}`;

      let csvText = '';
      const gvizRes = await fetch(gvizUrl);
      if (gvizRes.ok) {
        csvText = await gvizRes.text();
      } else {
        const exportRes = await fetch(exportUrl);
        if (!exportRes.ok) {
          res.status(400).json({
            error: 'Gagal mengunduh CSV dari Google Sheets. Pastikan akses berbagi diset ke "Siapa saja yang memiliki link dapat melihat".'
          });
          return;
        }
        csvText = await exportRes.text();
      }

      if (csvText.trim().startsWith('<!DOCTYPE html') || csvText.trim().startsWith('<html')) {
        res.status(403).json({
          error: 'Spreadsheet masih terkunci (Privat). Ubah akses berbagi Google Sheets menjadi "Siapa saja yang memiliki link" atau gunakan OAuth.'
        });
        return;
      }

      res.json({
        success: true,
        csvText
      });
    } catch (error: any) {
      console.error('[/api/sheets/fetch-csv] Error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Gagal menarik data CSV dari Google Sheets.'
      });
    }
  });

  // 4. Google Apps Script Webhook Endpoint (POST /api/webhooks/sheets-sync)
  app.post('/api/webhooks/sheets-sync', (req, res) => {
    try {
      const body = req.body || {};
      const spreadsheetId = String(body.spreadsheetId || 'gsheet_webhook').trim();
      const spreadsheetName = String(body.spreadsheetName || 'Google Sheets Webhook').trim();
      const sheetName = String(body.sheetName || 'Sheet1').trim();

      let incomingRows: Record<string, any>[] = [];
      if (Array.isArray(body.rows)) {
        incomingRows = body.rows.filter((r: any) => r && typeof r === 'object');
      } else if (body.row && typeof body.row === 'object') {
        incomingRows = [body.row];
      } else if (body.date || body.description || body.amount || body.Tanggal || body.Uraian || body.Nominal) {
        incomingRows = [body];
      }

      if (incomingRows.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Payload webhook tidak memiliki data baris (rows / row) yang valid.'
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const currentQueue = readWebhookQueue();

      const newItems: WebhookStagingRow[] = incomingRows.map((rawRow, idx) => ({
        id: `wh_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        receivedAt: nowIso,
        spreadsheetId,
        spreadsheetName,
        sheetName,
        rawRow
      }));

      const updatedQueue = [...newItems, ...currentQueue].slice(0, 2000);
      writeWebhookQueue(updatedQueue);

      res.json({
        success: true,
        queuedCount: newItems.length,
        totalQueueSize: updatedQueue.length,
        timestamp: nowIso,
        message: `${newItems.length} baris transaksi berhasil diterima oleh Webhook ERP D'Kandang dan siap divalidasi/disinkronkan.`
      });
    } catch (error: any) {
      console.error('[/api/webhooks/sheets-sync] Error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Internal server error saat memproses webhook Google Sheets.'
      });
    }
  });

  // 5. Get Pending Google Apps Script Webhook Queue
  app.get('/api/webhooks/sheets-sync/queue', (_req, res) => {
    const queue = readWebhookQueue();
    res.json({
      success: true,
      count: queue.length,
      queue
    });
  });

  // 6. Acknowledge / Clear Processed Webhook Queue Items
  app.post('/api/webhooks/sheets-sync/ack', (req, res) => {
    const { ids, clearAll } = req.body || {};
    if (clearAll) {
      writeWebhookQueue([]);
      res.json({ success: true, remainingCount: 0 });
      return;
    }

    const idSet = new Set(Array.isArray(ids) ? ids : []);
    const current = readWebhookQueue();
    const remaining = current.filter(item => !idSet.has(item.id));
    writeWebhookQueue(remaining);

    res.json({
      success: true,
      remainingCount: remaining.length
    });
  });

  // Mount Vite Dev Server or Static Production Assets
  const distPath = path.join(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[D'Kandang ERP Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
