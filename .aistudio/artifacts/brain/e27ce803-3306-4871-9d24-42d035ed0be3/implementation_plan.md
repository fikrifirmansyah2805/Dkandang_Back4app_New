# Rencana Pemeliharaan Menyeluruh (Full Maintenance) & Integrasi Kategori Aktivitas Keuangan dengan Bagan Akun (COA)

## 1. Tujuan Utama
Melakukan pemeliharaan menyeluruh (*end-to-end maintenance*) di seluruh modul ERP D'Kandang Amazing Farm hingga ke detail fungsi dan otomatisasi terkecil, menyempurnakan penginputan **Kategori Aktivitas Keuangan (Operasional, Investasi, Pendanaan)** agar terhubung langsung dengan **Akun Lawan pada Bagan Akun (COA)** melalui filter cerdas dan rekomendasi otomatis, serta menyinkronkan **Laporan Laba Rugi, Neraca, Laporan Arus Kas PSAK 2, Jurnal Umum, dan Buku Besar** beserta filter periode dinamis.

---

## 2. Pemetaan File & Fungsi Terdampak (Pra-Eksekusi)
Sesuai instruksi standar, berikut daftar seluruh file dan fungsi yang akan diperbarui secara terpadu:

1. **`/src/types/index.ts`**
   - Memperluas tipe `CashTransaction` dengan properti eksplisit `coaAccountCode?: string` dan `coaAccountName?: string` (selain `contraAccountCode` yang sudah ada) serta memetakan atribut `cashFlowCategory?: 'operating' | 'investing' | 'financing'` pada `Account` (Bagan Akun / COA) agar setiap akun COA memiliki keterkaitan resmi dengan kategori aktivitas keuangan PSAK 2.
2. **`/src/data/mockData.ts`**
   - Memperkaya daftar `mockChartOfAccounts` dari 18 akun menjadi **32 akun COA komprehensif** yang mencakup detail operasional agro-edukasi, aset biologis/investasi satwa & kandang, serta pendanaan/modal:
     - **Aset Lancar & Kas (`11xx`)**: Kas & Setara Kas (`1110`–`1116`), Piutang Usaha & Rombongan Sekolah (`1120`), Piutang Karyawan/Kasbon (`1125`), Persediaan Pakan & Obat Satwa (`1130`), Persediaan Bahan F&B & Merchandise (`1140`), Sewa/Biaya Dibayar di Muka (`1160`).
     - **Aset Investasi / Tidak Lancar (`1150` & `12xx`)**: Aset Biologis Satwa & Ternak (`1150`), Tanah & Lahan Agro (`1205`), Aset Tetap Bangunan, Kandang & Wahana (`1210`), Peralatan, Mesin & Kendaraan Operasional (`1220`), Akumulasi Penyusutan Aset Tetap (`1230`).
     - **Kewajiban / Liabilitas (`21xx` & `22xx`)**: Hutang Usaha / Supplier (`2110`), Pendapatan Diterima di Muka / Deposit Booking Sekolah (`2120`), Hutang Gaji & Insentif (`2130`), Hutang Pajak (`2140`), Pinjaman Bank / Pembiayaan Jangka Panjang (`2210`).
     - **Ekuitas / Modal (`31xx`)**: Modal Disetor Pemilik (`3110`), Tambahan Modal / Investasi Pemilik (`3120`), Prive / Penarikan Pemilik (`3130`), Laba Ditahan (`3210`).
     - **Pendapatan Operasional (`41xx` & `42xx`)**: Pendapatan Tiket & Wahana (`4110`), Pendapatan Kunjungan Rombongan Sekolah (`4115`), Pendapatan Resto & Cafe (`4120`), Pendapatan Retail, Susu & Pakan (`4130`), Pendapatan Sewa Venue & Outbound (`4140`), Pendapatan Lain-lain / Bunga Bank (`4210`).
     - **Beban Pokok & Operasional (`51xx` & `61xx`)**: HPP Pakan, Bibit & Perawatan Satwa (`5110`), HPP Bahan Baku F&B & Merchandise (`5120`), Beban Gaji, Upah & THR SDM (`6110`), Beban Listrik, Air, Internet & Kebersihan (`6120`), Beban Pemasaran, Komisi & Promosi (`6130`), Beban Pemeliharaan Wahana & Kandang (`6140`), Beban Administrasi, ATK & Perizinan (`6150`), Beban Penyusutan Aset (`6160`).
3. **`/src/utils/dataRecoveryHelper.ts`**
   - Menyatukan logika pemetaan Kategori Aktivitas Keuangan (`operating` | `investing` | `financing`) dengan Akun Lawan COA ke dalam fungsi terpusat:
     - `getRelevantCOAAccountsForActivity(coaList, type, category)`: Memfilter akun COA yang relevan berdasarkan jenis transaksi (`inflow` / `outflow`) dan kategori aktivitas (`operating` / `investing` / `financing`).
     - `suggestContraAccountForTransaction(params)`: Memberikan rekomendasi otomatis Akun Lawan COA paling presisi berdasarkan `category`, `type`, `incomeSource`, `budgetDivision`, dan kata kunci `description`.
     - `inferContraAccount(tx, coaList)`: Menghormati `tx.contraAccountCode` / `tx.coaAccountCode` yang dipilih pengguna, atau menggunakan fungsi saran otomatis untuk menentukan akun lawan dan kategori aktivitas PSAK 2 yang konsisten pada pembentukan Jurnal Umum (`buildDeterministicJournalsAndCOA`).
4. **`/src/context/ERPContext.tsx`**
   - Memperbaiki `addCashTransaction`, `updateCashTransaction`, dan `deleteCashTransaction` agar selalu menyimpan `contraAccountCode` & `coaAccountName` yang dipilih/disarankan, membuat Jurnal Umum *double-entry* yang akurat untuk aktivitas **Operasional, Investasi, maupun Pendanaan**, serta menjaga sinkronisasi saldo Rekening Bank (`bank_accounts`) dan Bagan Akun (`coa`) secara deterministik.
   - Memastikan otomatisasi lintas modul (pembayaran Gaji Payroll SDM, persetujuan Pengajuan Anggaran/Belanja, pembayaran Invoice Penjualan & Rombongan Sekolah, serta Stock Opname Inventori) secara otomatis menetapkan `category` dan `contraAccountCode` COA yang tepat.
5. **`/src/components/finance/FinanceModule.tsx`**
   - Memperbarui modal **Input & Edit Transaksi Kas** (`showAddTxModal`):
     - Saat pengguna memilih **Jenis Transaksi** (`Kas Masuk` / `Kas Keluar`) dan **Kategori Aktivitas Keuangan** (`Operasional` / `Investasi` / `Pendanaan`), dropdown **Akun Lawan Bagan Akun (COA)** otomatis memfilter daftar akun COA yang relevan dengan aktivitas tersebut.
     - Menyediakan **Saran Otomatis (Auto-Suggest)** Akun Lawan COA ketika pengguna memilih Sumber Pendapatan (`incomeSource`), Anggaran (`selectedBudgetId`), atau mengetik Keterangan transaksi, disertai opsi tombol cepat `"Tampilkan Semua COA"` bila pengguna ingin memilih akun lintas kategori.
     - Menampilkan **Preview Jurnal Otomatis (Debit vs Kredit)** secara *real-time* di dalam modal sebelum transaksi disimpan, sehingga pengguna melihat persis akun Kas/Bank dan Akun Lawan COA mana yang akan dijurnal di Modul Akuntansi.
   - Menampilkan badge kode & nama Akun Lawan COA pada tabel Buku Kas dan modal Detail Transaksi Kas, serta memperbarui fitur edit transaksi agar Akun Lawan COA dan Kategori Aktivitas dapat dikoreksi kapan saja.
6. **`/src/components/accounting/AccountingModule.tsx`**
   - Menghubungkan filter **`reportPeriod`** (`Semua Periode`, atau per bulan `YYYY-MM`) secara penuh ke **Jurnal Umum, Buku Besar, Laporan Laba Rugi (P&L), Neraca (Balance Sheet), dan Laporan Arus Kas PSAK 2** sehingga pergantian periode langsung menghitung ulang mutasi dan saldo berdasarkan transaksi/jurnal pada periode tersebut.
   - Menambahkan seksi/tab **Laporan Arus Kas (PSAK 2)** yang terintegrasi dengan mutasi COA (Arus Kas dari Aktivitas Operasional, Aktivitas Investasi, dan Aktivitas Pendanaan) serta memvalidasi keseimbangan Kas Akhir terhadap total saldo Kas & Setara Kas (`1110`–`1116`) di Neraca.
   - Menambahkan tombol **"Tambah / Kelola Akun COA"** dan **"Audit & Sinkronisasi Ulang Jurnal-COA"** yang benar-benar berfungsi penuh untuk menjaga integritas saldo akuntansi kapan saja.
7. **`/src/components/reports/CustomTransactionReportsModule.tsx`**
   - Menambahkan kolom & filter berdasarkan **Akun Lawan COA** dan **Kategori Aktivitas (Operasional / Investasi / Pendanaan)** pada laporan transaksi kustom serta ekspor CSV/cetak laporan.

---

## 3. Alur Interaksi & Penyimpanan Data (Firestore & State)
- **Saat memilih Kategori Aktivitas Keuangan (`Operasional` / `Investasi` / `Pendanaan`) di Modal Input Kas**:
  - State `txCategory` berubah -> memicu pemfilteran daftar `relevantCoaAccounts` dan memilih otomatis `selectedContraCoaCode` terbaik -> menampilkan preview jurnal `Debit [Akun] / Kredit [Akun]`.
- **Saat tombol Simpan Transaksi diklik**:
  - Menyimpan dokumen ke koleksi Firestore `cash_transactions` (lengkap dengan `category`, `contraAccountCode`, `coaAccountName`).
  - Membuat dokumen jurnal berpasangan di koleksi Firestore `journal` (`journalEntries`) dan memperbarui saldo di koleksi `coa` (`chartOfAccounts`) serta `bank_accounts`.
- **Saat mengubah Filter Periode (`reportPeriod`) di Modul Akuntansi**:
  - Menghitung ulang mutasi Laba Rugi, posisi Neraca, Buku Besar, dan Laporan Arus Kas PSAK 2 secara *real-time* sesuai periode yang dipilih.

---

## 4. Verifikasi & Sinkronisasi Database
1. Menjalankan skrip pemeliharaan & sinkronisasi deterministik ke Cloud Firestore (`ai-studio-enterpriseerpsui-e27ce803-3306-4871-9d24-42d035ed0be3`) untuk memperbarui koleksi `coa` (32 akun lengkap), melengkapi atribut `contraAccountCode` & `coaAccountName` pada seluruh `cash_transactions`, serta menyinkronkan ulang `journal` dan `bank_accounts`.
2. Memvalidasi kode dengan `npx tsc --noEmit`, `npm run build`, `compile_applet`, dan `lint_applet` hingga 0 error.
