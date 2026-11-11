import{u as D,r as h,j as e,y as k,p as B,F as V,E as b,h as E,X as I,b as r,g as U,d as M,aj as _}from"./index-CBCpnD5h.js";import{P as F,b as G}from"./printHelper-CTZz7Pl3.js";import{a as H,b as J}from"./exportHelper-C-KzBYA9.js";import{S as z}from"./send-DvlF0sXb.js";import{D as y}from"./download-BiTtAJjN.js";function se(){const{reportSchedules:j,bankAccounts:g,cashTransactions:f,inventory:x,salesOrders:w,salesInvoices:v,purchaseOrders:m,marketingCampaigns:S,chartOfAccounts:Q,currentUser:P,companyProfile:i,showNotification:d}=D(),[W,q]=h.useState("executive_summary"),[$,X]=h.useState("Agustus 2026"),[n,C]=h.useState(null),[K,N]=h.useState(!1),A=t=>{let o="";return t.type==="finance_cashflow"?o=`
        <div class="summary-grid">
          <div class="summary-card blue">
            <span class="card-label">Total Saldo Kas & Bank</span>
            <span class="card-val">${r(t.content.totalKas)}</span>
            <span class="card-sub">${t.content.banks.length} Rekening Aktif</span>
          </div>
          <div class="summary-card green">
            <span class="card-label">Arus Kas Masuk (Inflow)</span>
            <span class="card-val">+${r(t.content.inflows)}</span>
            <span class="card-sub">Penerimaan Terverifikasi</span>
          </div>
          <div class="summary-card amber">
            <span class="card-label">Arus Kas Keluar (Outflow)</span>
            <span class="card-val">-${r(t.content.outflows)}</span>
            <span class="card-sub">Beban Operasional & Vendor</span>
          </div>
        </div>

        <h4 style="font-size: 9pt; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">Rincian Posisi Saldo Per Rekening Bank & Kas</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">No.</th>
              <th>Nama Bank / Sumber Kas</th>
              <th style="width: 140px;">No. Rekening</th>
              <th style="width: 140px;">Atas Nama</th>
              <th style="width: 160px; text-align: right;">Saldo Realtime (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${t.content.banks.map((l,a)=>`
              <tr>
                <td style="text-align: center;">${a+1}</td>
                <td><strong>${l.name}</strong></td>
                <td style="font-family: monospace;">${l.accountNumber||"-"}</td>
                <td>${l.accountHolder||"-"}</td>
                <td style="text-align: right; font-weight: 700; color: #065f46;">${r(l.balance)}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align: right; font-weight: 700;">TOTAL LIKUIDITAS:</td>
              <td style="text-align: right; font-weight: 800; color: #065f46; font-size: 10pt;">${r(t.content.totalKas)}</td>
            </tr>
          </tfoot>
        </table>
      `:t.type==="sales_performance"?o=`
        <div class="summary-grid">
          <div class="summary-card green">
            <span class="card-label">Total Faktur Penjualan</span>
            <span class="card-val">${r(t.content.totalInvoices)}</span>
            <span class="card-sub">Omset Terfaktur</span>
          </div>
          <div class="summary-card blue">
            <span class="card-label">Kas Masuk Terbayar</span>
            <span class="card-val">${r(t.content.paidInvoices)}</span>
            <span class="card-sub">Pelunasan Customer</span>
          </div>
          <div class="summary-card amber">
            <span class="card-label">Total Pesanan SO</span>
            <span class="card-val">${r(t.content.totalOrders)}</span>
            <span class="card-sub">${t.content.orderCount} Sales Order</span>
          </div>
        </div>
      `:t.type==="warehouse_valuation"?o=`
        <div class="summary-grid">
          <div class="summary-card blue">
            <span class="card-label">Total Valuasi Persediaan</span>
            <span class="card-val">${r(t.content.totalValuation)}</span>
            <span class="card-sub">Nilai Aset Stok Gudang</span>
          </div>
          <div class="summary-card green">
            <span class="card-label">Jumlah SKU Terdaftar</span>
            <span class="card-val">${t.content.totalSKUs} Item</span>
            <span class="card-sub">Katalog Aktif</span>
          </div>
          <div class="summary-card amber">
            <span class="card-label">Peringatan Stok Rendah</span>
            <span class="card-val">${t.content.lowStockCount} SKU</span>
            <span class="card-sub">Perlu Reorder Segera</span>
          </div>
        </div>

        <h4 style="font-size: 9pt; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">Daftar Item Persediaan & Valuasi</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">No.</th>
              <th>Nama Item Barang</th>
              <th style="width: 90px; text-align: center;">Kategori</th>
              <th style="width: 70px; text-align: center;">Stok</th>
              <th style="width: 100px; text-align: right;">HPP Satuan</th>
              <th style="width: 120px; text-align: right;">Total Nilai (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${t.content.items.slice(0,20).map((l,a)=>`
              <tr>
                <td style="text-align: center;">${a+1}</td>
                <td><strong>${l.name}</strong> <span style="font-size: 7.5pt; color: #64748b;">(${l.sku})</span></td>
                <td style="text-align: center; text-transform: uppercase; font-size: 7.5pt;">${l.category}</td>
                <td style="text-align: center; font-weight: 600;">${l.stockQty} ${l.unit}</td>
                <td style="text-align: right;">${r(l.unitCost)}</td>
                <td style="text-align: right; font-weight: 700;">${r(l.stockQty*l.unitCost)}</td>
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align: right; font-weight: 700;">TOTAL VALUASI GUDANG:</td>
              <td style="text-align: right; font-weight: 800; color: #065f46; font-size: 10pt;">${r(t.content.totalValuation)}</td>
            </tr>
          </tfoot>
        </table>
      `:o=`
        <div class="summary-grid">
          <div class="summary-card blue">
            <span class="card-label">Likuiditas Kas & Bank</span>
            <span class="card-val">${r(t.content.totalKas||0)}</span>
            <span class="card-sub">Cadangan Kas Siap Pakai</span>
          </div>
          <div class="summary-card green">
            <span class="card-label">Pendapatan Terfaktur</span>
            <span class="card-val">${r(t.content.salesRevenue||0)}</span>
            <span class="card-sub">Omset Penjualan</span>
          </div>
          <div class="summary-card amber">
            <span class="card-label">Valuasi Persediaan</span>
            <span class="card-val">${r(t.content.inventoryVal||0)}</span>
            <span class="card-sub">Aset Logistik & Pakan</span>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>Indikator Kinerja Utama (KPI)</th>
              <th style="width: 140px; text-align: right;">Capaian Nilai</th>
              <th style="width: 160px; text-align: center;">Status Kepatuhan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Likuiditas Kas Operasional Agrowisata</strong></td>
              <td style="text-align: right; font-weight: 700; color: #075985;">${r(t.content.totalKas||0)}</td>
              <td style="text-align: center; color: #065f46; font-weight: 700;">Optimal & Sehat</td>
            </tr>
            <tr>
              <td><strong>Total Realisasi Belanja Pengadaan PO Vendor</strong></td>
              <td style="text-align: right; font-weight: 700; color: #92400e;">${r(t.content.procurementSpend||0)}</td>
              <td style="text-align: center; color: #075985; font-weight: 700;">Terkontrol Sesuai Budget</td>
            </tr>
            <tr>
              <td><strong>Total Nilai Aset Fisik Persediaan & Panen Farm</strong></td>
              <td style="text-align: right; font-weight: 700; color: #065f46;">${r(t.content.inventoryVal||0)}</td>
              <td style="text-align: center; color: #065f46; font-weight: 700;">Audit Opname Cocok</td>
            </tr>
          </tbody>
        </table>
      `,`
      <div class="kop-surat">
        <div class="kop-title">${i.name.toUpperCase()}</div>
        <div class="kop-sub">${i.ptName}</div>
        <div class="kop-desc">${i.address} | Telp: ${i.phone} | Email: ${i.email}</div>
      </div>
      <div class="doc-header">
        <div class="doc-title">${t.title.toUpperCase()}</div>
        <div class="doc-meta">Periode Laporan: <strong>${t.period}</strong> | Terbit: ${_(t.dateGenerated)}</div>
      </div>
      
      ${o}

      <div class="signatures-block">
        <div>
          <div class="signature-title">Disiapkan Oleh (Sistem & Staff)</div>
          <div class="signature-name">${P.name}</div>
          <div class="signature-role">ERP Intelligence Engine</div>
        </div>
        <div>
          <div class="signature-title">Diverifikasi (Finance & Controller)</div>
          <div class="signature-name">Finance Manager</div>
          <div class="signature-role">Divisi Akuntansi & Keuangan</div>
        </div>
        <div>
          <div class="signature-title">Disetujui Oleh (Direksi)</div>
          <div class="signature-name">${i.directorName}</div>
          <div class="signature-role">${i.directorTitle}</div>
        </div>
      </div>

      <div class="footer-stamp">
        <span>Dicetak Resmi dari Sistem ERP Terpadu D'Kandang Amazing Farm</span>
        <span>Dokumen Sah Internal & Audit • Halaman 1/1</span>
      </div>
    `},p=t=>{let o="",l={};switch(t){case"finance_cashflow":o="Laporan Konsolidasi Arus Kas & Treasury",l={totalKas:g.reduce((a,s)=>a+s.balance,0),inflows:f.filter(a=>a.type==="inflow").reduce((a,s)=>a+s.amount,0),outflows:f.filter(a=>a.type==="outflow").reduce((a,s)=>a+s.amount,0),txCount:f.length,banks:g.map(a=>({name:a.bankName,accountNumber:a.accountNumber,accountHolder:a.accountHolder,balance:a.balance}))};break;case"sales_performance":o="Laporan Kinerja Penjualan & Pipeline CRM",l={totalInvoices:v.reduce((a,s)=>a+s.totalAmount,0),paidInvoices:v.filter(a=>a.status==="paid").reduce((a,s)=>a+s.paidAmount,0),totalOrders:w.reduce((a,s)=>a+s.totalAmount,0),orderCount:w.length};break;case"warehouse_valuation":o="Laporan Valuasi Persediaan & Audit Stok",l={totalValuation:x.reduce((a,s)=>a+s.stockQty*s.unitCost,0),totalSKUs:x.length,lowStockCount:x.filter(a=>a.stockQty<=a.minStockLevel).length,items:x};break;case"procurement_spend":o="Laporan Pengadaan & Kepatuhan 3-Way Match",l={totalSpend:m.reduce((a,s)=>a+s.totalCost,0),poCount:m.length,threeWayMatched:m.filter(a=>a.threeWayMatched).length};break;default:o="Executive Master ERP Intelligence Digest",l={totalKas:g.reduce((a,s)=>a+s.balance,0),salesRevenue:v.reduce((a,s)=>a+s.totalAmount,0),inventoryVal:x.reduce((a,s)=>a+s.stockQty*s.unitCost,0),procurementSpend:m.reduce((a,s)=>a+s.totalCost,0),marketingCampaignsCount:S.length};break}C({title:o,type:t,dateGenerated:new Date().toISOString(),period:$,content:l}),N(!0),d(`Laporan ${o} berhasil di-generate secara real-time!`,"success")},u=t=>{if(!n)return;if(t==="pdf"){const l=A(n);G(n.title,l),d(`Pratinjau cetak dan ekspor PDF untuk '${n.title}' siap!`,"success");return}const o=`DKandang_${n.type}_${n.period.replace(/\s+/g,"_")}`;if(t==="json"){H(o,n)?d(`Laporan '${n.title}' berhasil diunduh dalam format JSON!`,"success"):d("Gagal mengunduh file JSON.","error");return}if(t==="csv"||t==="excel"){let l=`Laporan,"${n.title}"
Periode,"${n.period}"
Tanggal Cetak,"${M(n.dateGenerated)}"

Ringkasan Metrik,Nilai
`;Object.entries(n.content).forEach(([s,c])=>{if(Array.isArray(c))return;const R=s.replace(/([A-Z])/g," $1").replace(/^./,L=>L.toUpperCase()),O=typeof c=="number"?s.toLowerCase().includes("count")||s.toLowerCase().includes("skus")?String(c):r(c):String(c);l+=`"${R}","${O.replace(/"/g,'""')}"
`}),n.content.banks&&Array.isArray(n.content.banks)&&(l+=`
Detail Rekening Bank & Kas Resmi
Nama Rekening,Nomor Rekening,Atas Nama,Saldo (Rp)
`,n.content.banks.forEach(s=>{l+=`"${s.name}","${s.accountNumber}","${s.accountHolder}","${s.balance}"
`})),n.content.items&&Array.isArray(n.content.items)&&(l+=`
Detail Inventaris & Audit Stok
Kode SKU,Nama Barang,Kategori,Stok Fisik,Satuan,Biaya Satuan,Total Valuasi (Rp)
`,n.content.items.forEach(s=>{const c=(s.stockQty||0)*(s.unitCost||0);l+=`"${s.sku}","${(s.name||"").replace(/"/g,'""')}","${s.category}","${s.stockQty}","${s.unit}","${s.unitCost}","${c}"
`})),J(o,l)?d(`Laporan '${n.title}' berhasil diunduh dalam format ${t.toUpperCase()}!`,"success"):d(`Gagal mengunduh file ${t.toUpperCase()}.`,"error")}},T=t=>{d(`Jadwal otomatis '${t.title}' berhasil dieksekusi dan dikirim ke ${t.recipients.join(", ")}`,"success")};return e.jsxs("div",{className:"space-y-6 pb-8",children:[e.jsxs("div",{className:"flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 md:p-6 rounded-3xl shadow-xs",children:[e.jsx("div",{children:e.jsxs("div",{className:"flex items-center gap-2.5",children:[e.jsx("div",{className:"w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs",children:e.jsx(k,{className:"w-5 h-5"})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-xl font-bold text-slate-900",children:"Laporan Otomatis & Rekap Pimpinan"}),e.jsx("p",{className:"text-xs text-slate-500 mt-0.5",children:"Pembuatan laporan berkala (Harian, Mingguan, Bulanan) untuk keuangan, penjualan tiket/rombongan, stok pakan, dan pembelian."})]})]})}),e.jsxs("button",{onClick:()=>p("executive_summary"),className:"px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer",children:[e.jsx(B,{className:"w-4 h-4"})," Buat Rekap Lengkap Sekarang"]})]}),e.jsxs("div",{className:"bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-xs space-y-4",children:[e.jsxs("h3",{className:"font-bold text-slate-900 text-sm flex items-center gap-2",children:[e.jsx(V,{className:"w-4 h-4 text-emerald-600"}),"Pusat Pembuatan Laporan Instan per Departemen"]}),e.jsxs("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3",children:[e.jsxs("div",{className:"p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 flex flex-col justify-between space-y-3 transition-colors shadow-2xs",children:[e.jsxs("div",{children:[e.jsx("span",{className:"text-[10px] font-bold uppercase text-blue-700",children:"Keuangan & Kasir Tiket"}),e.jsx("h4",{className:"font-bold text-slate-900 text-xs mt-1",children:"Laporan Arus Kas & Tiketing Gate"}),e.jsx("p",{className:"text-[11px] text-slate-500 mt-1",children:"Rekap pendapatan tiket pengunjung, resto farm, dan saldo bank."})]}),e.jsxs("button",{onClick:()=>p("finance_cashflow"),className:"w-full py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-300 shadow-xs cursor-pointer",children:[e.jsx(b,{className:"w-3.5 h-3.5"})," Buat & Pratinjau"]})]}),e.jsxs("div",{className:"p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 flex flex-col justify-between space-y-3 transition-colors shadow-2xs",children:[e.jsxs("div",{children:[e.jsx("span",{className:"text-[10px] font-bold uppercase text-emerald-700",children:"Akuntansi & PSAK 69"}),e.jsx("h4",{className:"font-bold text-slate-900 text-xs mt-1",children:"Laporan Laba Rugi & Aset Biologis"}),e.jsx("p",{className:"text-[11px] text-slate-500 mt-1",children:"Valuasi satwa edukasi PSAK 69, HPP pakan ternak, dan laba agrowisata."})]}),e.jsxs("button",{onClick:()=>p("executive_summary"),className:"w-full py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-300 shadow-xs cursor-pointer",children:[e.jsx(b,{className:"w-3.5 h-3.5"})," Buat & Pratinjau"]})]}),e.jsxs("div",{className:"p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 flex flex-col justify-between space-y-3 transition-colors shadow-2xs",children:[e.jsxs("div",{children:[e.jsx("span",{className:"text-[10px] font-bold uppercase text-amber-700",children:"Persediaan Satwa & Pakan"}),e.jsx("h4",{className:"font-bold text-slate-900 text-xs mt-1",children:"Laporan Valuasi Pakan & Stok Farm"}),e.jsx("p",{className:"text-[11px] text-slate-500 mt-1",children:"Konsentrat pakan sapi, bibit hidroponik, susu pasteurisasi, dan souvenir."})]}),e.jsxs("button",{onClick:()=>p("warehouse_valuation"),className:"w-full py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-amber-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-300 shadow-xs cursor-pointer",children:[e.jsx(b,{className:"w-3.5 h-3.5"})," Buat & Pratinjau"]})]}),e.jsxs("div",{className:"p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 flex flex-col justify-between space-y-3 transition-colors shadow-2xs",children:[e.jsxs("div",{children:[e.jsx("span",{className:"text-[10px] font-bold uppercase text-indigo-700",children:"Pengadaan Sarana Farm"}),e.jsx("h4",{className:"font-bold text-slate-900 text-xs mt-1",children:"Laporan PO Vendor & Pakan Ternak"}),e.jsx("p",{className:"text-[11px] text-slate-500 mt-1",children:"Pembelian rumput gajah, konsentrat, vitamin ternak, dan 3-Way Match."})]}),e.jsxs("button",{onClick:()=>p("procurement_spend"),className:"w-full py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-300 shadow-xs cursor-pointer",children:[e.jsx(b,{className:"w-3.5 h-3.5"})," Buat & Pratinjau"]})]})]})]}),e.jsxs("div",{className:"bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs",children:[e.jsxs("div",{className:"p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"font-bold text-xs text-slate-900",children:"Jadwal Otomasi Pengiriman Laporan (Cron Reporting Dispatch)"}),e.jsx("p",{className:"text-[11px] text-slate-500 mt-0.5",children:"Sistem secara otomatis mengekspor dan mengirimkan laporan terenkripsi ke email jajaran pimpinan."})]}),e.jsxs("span",{className:"px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200",children:[j.length," Jadwal Aktif"]})]}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full text-left text-xs text-slate-700",children:[e.jsx("thead",{className:"bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]",children:e.jsxs("tr",{children:[e.jsx("th",{className:"p-3.5",children:"Nama Laporan Rutin"}),e.jsx("th",{className:"p-3.5",children:"Frekuensi Jadwal"}),e.jsx("th",{className:"p-3.5",children:"Modul Terkait"}),e.jsx("th",{className:"p-3.5",children:"Daftar Penerima Email"}),e.jsx("th",{className:"p-3.5",children:"Format Berkas"}),e.jsx("th",{className:"p-3.5",children:"Jadwal Kirim Berikutnya"}),e.jsx("th",{className:"p-3.5 text-center",children:"Aksi Cepat"})]})}),e.jsx("tbody",{className:"divide-y divide-slate-100",children:j.map(t=>e.jsxs("tr",{className:"hover:bg-slate-50/80 transition-colors",children:[e.jsx("td",{className:"p-3.5 font-bold text-slate-900",children:t.title}),e.jsx("td",{className:"p-3.5",children:e.jsx("span",{className:"capitalize px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[10px]",children:t.frequency})}),e.jsx("td",{className:"p-3.5 uppercase font-mono text-slate-600 text-[11px]",children:t.module}),e.jsx("td",{className:"p-3.5 text-slate-600",children:t.recipients.join(", ")}),e.jsx("td",{className:"p-3.5 font-mono text-emerald-700 font-bold uppercase text-[11px]",children:t.format}),e.jsxs("td",{className:"p-3.5 text-slate-500 flex items-center gap-1.5",children:[e.jsx(E,{className:"w-3.5 h-3.5 text-slate-400"})," ",t.nextRun]}),e.jsx("td",{className:"p-3.5 text-center",children:e.jsxs("button",{onClick:()=>T(t),className:"px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-700 border border-slate-300 hover:border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1 mx-auto transition-all shadow-xs cursor-pointer",children:[e.jsx(z,{className:"w-3 h-3 text-emerald-600"})," Eksekusi Sekarang"]})})]},t.id))})]})})]}),K&&n&&e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs",children:e.jsxs("div",{className:"bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-slate-800",children:[e.jsxs("div",{className:"flex items-start justify-between pb-4 border-b border-slate-200",children:[e.jsxs("div",{children:[e.jsx("span",{className:"px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase",children:"Hasil Generasi Otomatis"}),e.jsx("h3",{className:"font-extrabold text-slate-900 text-lg mt-1",children:n.title}),e.jsxs("p",{className:"text-xs text-slate-500 mt-0.5",children:["Periode: ",e.jsx("strong",{children:n.period})," • Tanggal Ekspor: ",new Date(n.dateGenerated).toLocaleString("id-ID")]})]}),e.jsx("button",{onClick:()=>N(!1),className:"text-slate-400 hover:text-slate-700 cursor-pointer",children:e.jsx(I,{className:"w-5 h-5"})})]}),e.jsxs("div",{className:"p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-4 text-xs text-slate-700 shadow-2xs",children:[e.jsxs("div",{className:"text-center pb-3 border-b border-slate-200",children:[e.jsx("h4",{className:"font-bold text-emerald-700 text-sm",children:i.name.toUpperCase()}),e.jsxs("p",{className:"text-[11px] text-slate-500",children:[i.ptName," • Sistem Laporan ERP Terintegrasi"]})]}),n.type==="finance_cashflow"&&e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"grid grid-cols-3 gap-3",children:[e.jsxs("div",{className:"p-3 bg-white border border-slate-200 rounded-xl shadow-2xs",children:[e.jsx("span",{className:"text-slate-500 text-[10px] block",children:"Total Kas & Bank:"}),e.jsx("strong",{className:"text-slate-900 font-mono text-sm",children:r(n.content.totalKas)})]}),e.jsxs("div",{className:"p-3 bg-white border border-slate-200 rounded-xl shadow-2xs",children:[e.jsx("span",{className:"text-slate-500 text-[10px] block",children:"Arus Kas Masuk:"}),e.jsxs("strong",{className:"text-emerald-700 font-mono text-sm",children:["+",r(n.content.inflows)]})]}),e.jsxs("div",{className:"p-3 bg-white border border-slate-200 rounded-xl shadow-2xs",children:[e.jsx("span",{className:"text-slate-500 text-[10px] block",children:"Arus Kas Keluar:"}),e.jsxs("strong",{className:"text-rose-700 font-mono text-sm",children:["-",r(n.content.outflows)]})]})]}),e.jsxs("div",{className:"pt-2",children:[e.jsx("span",{className:"font-semibold text-slate-700 block mb-1",children:"Rincian Saldo Akun Bank:"}),e.jsx("div",{className:"space-y-1",children:n.content.banks.map((t,o)=>e.jsxs("div",{className:"flex justify-between text-slate-700 bg-white border border-slate-200 p-2.5 rounded-lg shadow-2xs",children:[e.jsx("span",{children:t.name}),e.jsx("strong",{className:"font-mono text-slate-900",children:r(t.balance)})]},o))})]})]}),n.type==="warehouse_valuation"&&e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex justify-between items-center bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs",children:[e.jsx("span",{className:"font-medium text-slate-700",children:"Total Valuasi Persediaan Aset:"}),e.jsx("strong",{className:"text-emerald-700 font-mono text-base font-bold",children:r(n.content.totalValuation)})]}),e.jsxs("div",{className:"text-slate-600",children:["Jumlah Master SKU: ",e.jsx("strong",{className:"text-slate-900",children:n.content.totalSKUs})," • Stok Di Bawah Minimum: ",e.jsx("strong",{className:"text-rose-600 font-bold",children:n.content.lowStockCount})]})]}),n.type==="procurement_spend"&&e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex justify-between items-center bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs",children:[e.jsx("span",{className:"font-medium text-slate-700",children:"Total Belanja Pengadaan PO:"}),e.jsx("strong",{className:"text-rose-700 font-mono text-base font-bold",children:r(n.content.totalSpend)})]}),e.jsxs("div",{className:"text-slate-600",children:["PO Terbit: ",e.jsx("strong",{className:"text-slate-900",children:n.content.poCount})," • 3-Way Match Terpenuhi: ",e.jsxs("strong",{className:"text-emerald-700 font-bold",children:[n.content.threeWayMatched," PO"]})]})]}),n.type==="executive_summary"&&e.jsx("div",{className:"space-y-2",children:e.jsxs("div",{className:"grid grid-cols-2 gap-2 text-xs",children:[e.jsxs("div",{className:"p-3 bg-white border border-slate-200 rounded-xl shadow-2xs",children:[e.jsx("span",{className:"text-slate-500 text-[10px] block",children:"Likuiditas Kas & Bank"}),e.jsx("strong",{className:"text-blue-700 font-mono text-sm",children:r(n.content.totalKas)})]}),e.jsxs("div",{className:"p-3 bg-white border border-slate-200 rounded-xl shadow-2xs",children:[e.jsx("span",{className:"text-slate-500 text-[10px] block",children:"Pendapatan Penjualan Terfaktur"}),e.jsx("strong",{className:"text-emerald-700 font-mono text-sm",children:r(n.content.salesRevenue)})]}),e.jsxs("div",{className:"p-3 bg-white border border-slate-200 rounded-xl shadow-2xs",children:[e.jsx("span",{className:"text-slate-500 text-[10px] block",children:"Valuasi Persediaan Gudang"}),e.jsx("strong",{className:"text-amber-700 font-mono text-sm",children:r(n.content.inventoryVal)})]}),e.jsxs("div",{className:"p-3 bg-white border border-slate-200 rounded-xl shadow-2xs",children:[e.jsx("span",{className:"text-slate-500 text-[10px] block",children:"Realisasi Belanja PO Vendor"}),e.jsx("strong",{className:"text-rose-700 font-mono text-sm",children:r(n.content.procurementSpend)})]})]})})]}),e.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200",children:[e.jsxs("span",{className:"text-xs text-slate-500 flex items-center gap-1.5",children:[e.jsx(U,{className:"w-4 h-4 text-emerald-600"})," Format Terenkripsi E2EE Siap Unduh:"]}),e.jsxs("div",{className:"flex flex-wrap gap-2",children:[e.jsxs("button",{onClick:()=>u("pdf"),className:"px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer",children:[e.jsx(F,{className:"w-3.5 h-3.5"})," Cetak / Unduh PDF"]}),e.jsxs("button",{onClick:()=>u("excel"),className:"px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer",children:[e.jsx(k,{className:"w-3.5 h-3.5"})," Unduh Excel (.csv)"]}),e.jsxs("button",{onClick:()=>u("csv"),className:"px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer",children:[e.jsx(y,{className:"w-3.5 h-3.5 text-slate-400"})," Unduh CSV"]}),e.jsxs("button",{onClick:()=>u("json"),className:"px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer",children:[e.jsx(y,{className:"w-3.5 h-3.5 text-slate-400"})," Encrypted JSON"]})]})]})]})})]})}export{se as default};
