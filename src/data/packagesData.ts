export interface PackageDefinition {
  id: string;
  name: string;
  category: string;
  activities: string[];
  optionalActivities?: string[];
  description?: string;
}

// ---------------- 1. DATABASE LENGKAP PAKET ANAK / SISWA (51 PAKET RESMI D'KANDANG) ----------------
export const STUDENT_PACKAGES: PackageDefinition[] = [
  // A. Farmer Cilik & Edukasi Peternakan
  {
    id: 'iam-farmer',
    name: "I AM'A FARMER",
    category: 'Farmer Cilik',
    activities: ['Ice Breaking', 'Memerah Sapi', 'Menyusui Cempe', 'Menanam Tanaman Hias', 'Berkuda', 'Memberi Pakan Ternak'],
    optionalActivities: ['Mengenal Peralatan, Hewan & Tanaman'],
    description: 'Paket edukasi peternakan dan pertanian lengkap terfavorit dengan pengalaman berkuda dan memerah sapi'
  },
  {
    id: 'little-farmer',
    name: 'LITTLE FARMER',
    category: 'Farmer Cilik',
    activities: ['Ice Breaking', 'Memerah Sapi', 'Menyusui Cempe', 'Menanam Tanaman Hias', 'Memberi Pakan Ternak'],
    optionalActivities: ['Mengenal Peralatan, Hewan & Tanaman'],
    description: 'Paket peternak cilik seru dengan interaksi satwa dan menanam tanaman hias'
  },
  {
    id: 'little-farmer-rice',
    name: 'LITTLE FARMER RICE',
    category: 'Farmer Cilik',
    activities: ['Memerah Sapi', 'Menanam Padi', 'Memandikan Kerbau', 'Memberi Pakan Ternak'],
    optionalActivities: ['Mengenal Peralatan, Hewan & Tanaman'],
    description: 'Sensasi bertani tradisional di sawah lumpur, menanam padi, dan memandikan kerbau'
  },
  {
    id: 'little-farmer-caping',
    name: 'LITTLE FARMER CAPING',
    category: 'Farmer Cilik',
    activities: ['Melukis Caping', 'Memerah Sapi', 'Menanam Tanaman Hias', 'Memberi Pakan Ternak'],
    optionalActivities: ['Mengenal Peralatan, Hewan & Tanaman'],
    description: 'Edukasi bertani dikombinasikan dengan melukis caping bambu khas petani yang bisa dibawa pulang'
  },
  {
    id: 'little-farmer-layang',
    name: 'LITTLE FARMER LAYANG - LAYANG',
    category: 'Farmer Cilik',
    activities: ['Melukis Layangan', 'Memerah Sapi', 'Menyusui Cempe', 'Memberi Pakan Ternak'],
    optionalActivities: ['Mengenal Peralatan, Hewan & Tanaman'],
    description: 'Kreativitas melukis layang-layang tradisional dan edukasi satwa ternak'
  },
  {
    id: 'little-farmer-paint-can',
    name: 'LITTLE FARMER PAINTING CAN',
    category: 'Farmer Cilik',
    activities: ['Melukis Kaleng', 'Memerah Sapi', 'Menyusui Cempe', 'Memberi Pakan Ternak'],
    optionalActivities: ['Mengenal Peralatan, Hewan & Tanaman'],
    description: 'Kreasi seni daur ulang melukis kaleng serbaguna dan memberi pakan satwa'
  },
  {
    id: 'little-farmer-dairy',
    name: 'LITTLE FARMER DAIRY',
    category: 'Farmer Cilik',
    activities: ['Membuat Yogurt', 'Memerah Sapi', 'Menyusui Cempe', 'Memberi Pakan Ternak'],
    optionalActivities: ['Mengenal Peralatan, Hewan & Tanaman'],
    description: 'Praktek pengolahan hasil ternak susu segar menjadi yogurt lezat dan memerah sapi'
  },
  {
    id: 'little-farmer-cake',
    name: 'LITTLE FARMER CAKE',
    category: 'Farmer Cilik',
    activities: ['Menghias Cup Cake', 'Memerah Sapi', 'Menyusui Cempe', 'Memberi Pakan Ternak'],
    optionalActivities: ['Mengenal Peralatan, Hewan & Tanaman'],
    description: 'Aktivitas kuliner menghias cup cake manis dan berinteraksi dengan cempe lucu'
  },
  {
    id: 'little-farmer-flyingfox',
    name: 'LITTLE FARMER FLYING FOX',
    category: 'Farmer Cilik',
    activities: ['Flying Fox', 'Menyusui Cempe', 'Memberi Pakan Ternak', 'Menanam Tanaman Hias'],
    optionalActivities: ['Mengenal Peralatan, Hewan & Tanaman'],
    description: 'Kombinasi petualangan flying fox memacu adrenalin dan edukasi satwa'
  },
  {
    id: 'little-farmer-archery',
    name: 'LITTLE FARMER ARCHERY',
    category: 'Farmer Cilik',
    activities: ['Memanah', 'Menyusui Cempe', 'Memberi Pakan Ternak', 'Menanam Tanaman Hias'],
    optionalActivities: ['Mengenal Peralatan, Hewan & Tanaman'],
    description: 'Latihan ketangkasan memanah (archery) edukatif untuk anak'
  },
  {
    id: 'little-farmer-catchfish',
    name: 'LITTLE FARMER CATCH FISH',
    category: 'Farmer Cilik',
    activities: ['Menangkap Ikan', 'Menyusui Cempe', 'Memberi Pakan Ternak', 'Menanam Tanaman Hias'],
    optionalActivities: ['Mengenal Peralatan, Hewan & Tanaman'],
    description: 'Keseruan basah-basahan menangkap ikan di kolam lumpur alami'
  },

  // B. Tour & Edukasi Singkat
  {
    id: 'edubes',
    name: 'EDUBES',
    category: 'Tour & Edukasi',
    activities: ['Mengenal Peralatan, Hewan & Tanaman'],
    optionalActivities: ['Tour Agrowisata Bersama Fasilitator'],
    description: 'Tour edukasi keliling mengenal seluruh satwa, flora, dan instalasi agrowisata'
  },
  {
    id: 'fast-tour-pakan',
    name: 'FAST TOUR - Pakan Ternak',
    category: 'Tour & Edukasi',
    activities: ['Mengenal Peralatan, Hewan & Tanaman', 'Memberi Pakan Ternak'],
    optionalActivities: [],
    description: 'Tour singkat interaktif memberi pakan rumput segar langsung ke hewan ternak'
  },
  {
    id: 'fast-tour-perah',
    name: 'FAST TOUR - Memerah Sapi',
    category: 'Tour & Edukasi',
    activities: ['Mengenal Peralatan, Hewan & Tanaman', 'Memerah Sapi'],
    optionalActivities: [],
    description: 'Tour kilat berfokus pada edukasi dan praktek langsung memerah susu sapi perah'
  },

  // C. Cooking & Seni Kreativitas (Craft)
  {
    id: 'fun-cooking',
    name: 'FUN COOKING',
    category: 'Cooking & Craft',
    activities: ['Membuat Es Buah / Es Sarang Burung', 'Menghias Cup Cake / Pizza / Martabak / Omelete'],
    optionalActivities: ['Mengenal Peralatan, Hewan & Tanaman'],
    description: 'Workshop memasak seru dan higienis untuk melatih motorik halus siswa'
  },
  {
    id: 'amazing-craft-caping',
    name: 'AMAZING CRAFT - Caping',
    category: 'Cooking & Craft',
    activities: ['Melukis Caping', 'Melukis Layang - Layang', 'Menghias Potty'],
    optionalActivities: ['Mengenal Peralatan, Hewan & Tanaman'],
    description: 'Paket seni melukis caping petani dan kerajinan tangan tradisional'
  },
  {
    id: 'amazing-craft-kaleng',
    name: 'AMAZING CRAFT - Kaleng',
    category: 'Cooking & Craft',
    activities: ['Melukis Kaleng', 'Melukis Layang - Layang', 'Menghias Potty'],
    optionalActivities: ['Mengenal Peralatan, Hewan & Tanaman'],
    description: 'Eksplorasi seni daur ulang dan menghias potty tanaman mini'
  },
  {
    id: 'funtastic-science',
    name: 'FUNTASTIC SCIENCE',
    category: 'Sains & Teknologi',
    activities: ['Ice Breaking & Game', 'Science Show', 'Science Challenge'],
    optionalActivities: ['PILIH 1 Staterkit (Isi di Pilihan Custom)'],
    description: 'Eksperimen sains atraktif dan seru dengan starter kit praktek mandiri'
  },

  // D. Outbound, Farming & 3R Lingkungan
  {
    id: 'outbound-basic',
    name: 'OUTBOUND',
    category: 'Outbound & Petualangan',
    activities: ['Ice Breaking', 'High Rope', 'Flying Fox', 'Fun Archery / Berkuda'],
    optionalActivities: ['Paket Fun Game A / B / C'],
    description: 'Petualangan outbound jembatan tali gantung, flying fox, dan olahraga ketangkasan'
  },
  {
    id: 'amazing-farming',
    name: 'AMAZING FARMING',
    category: 'Pertanian & Agro',
    activities: ['Ice Breaking', 'Edukasi Biogas', 'Inseminasi Buatan', 'Menanam Padi'],
    optionalActivities: ['Paket Fun Game A / B / C'],
    description: 'Edukasi mendalam seputar siklus energi biogas, ilmu ternak, dan menanam padi'
  },
  {
    id: '3r-package',
    name: '3R PACKAGE',
    category: 'Lingkungan & Sains',
    activities: ['Ice Breaking', 'Membuat Pupuk Kompos / Pupuk Kandang', 'Olahan Minyak Jelantah', 'Kreasi Barang Bekas'],
    optionalActivities: ['Paket Fun Game A / B / C', 'Touring D\'Kandang'],
    description: 'Edukasi ekologi Reduce, Reuse, Recycle, daur ulang jelantah menjadi lilin aromaterapi'
  },
  {
    id: 'young-entrepreneur',
    name: 'YOUNG ENTREPRENEUR',
    category: 'Enterpreneur & Skill',
    activities: ['Ice Breaking', 'High Rope', 'Flying Fox', 'Boomerang'],
    optionalActivities: ['Mengenal Peralatan, Hewan & Tanaman'],
    description: 'Membangun jiwa kepemimpinan, keberanian, dan keterampilan melempar bumerang'
  },

  // E. Outbound Boomerang & Catch Fish dengan Pilihan Fun Game
  {
    id: 'outbound-boomerang-fgb',
    name: 'OUTBOUND BOOMERANG - Fun Game B',
    category: 'Outbound & Petualangan',
    activities: ['Ice Breaking', 'High Rope', 'Flying Fox', 'Boomerang'],
    optionalActivities: ['Fun Game B: Volcano, Spon Estafet, Sungai Beracun, Hola Hope Race, Back Ball'],
    description: 'Outbound lengkap bumerang disertai Fun Game B'
  },
  {
    id: 'outbound-boomerang-fgc',
    name: 'OUTBOUND BOOMERANG - Fun Game C',
    category: 'Outbound & Petualangan',
    activities: ['Ice Breaking', 'High Rope', 'Flying Fox', 'Boomerang'],
    optionalActivities: ['Fun Game C: Snow Ball, Volcano, Spon Estafet, Tarik Tambang, Sungai Beracun'],
    description: 'Outbound lengkap bumerang disertai Fun Game C'
  },
  {
    id: 'outbound-catchfish-fga',
    name: 'OUTBOUND CATCH FISH - Fun Game A',
    category: 'Outbound & Petualangan',
    activities: ['Ice Breaking', 'High Rope', 'Flying Fox', 'Menangkap Ikan'],
    optionalActivities: ['Fun Game A: Snow Ball, Tarik Tambang, Sungai Beracun, Snake Ballon, Hola Hope Race'],
    description: 'Outbound menangkap ikan disertai Fun Game A'
  },
  {
    id: 'outbound-catchfish-fgb',
    name: 'OUTBOUND CATCH FISH - Fun Game B',
    category: 'Outbound & Petualangan',
    activities: ['Ice Breaking', 'High Rope', 'Flying Fox', 'Menangkap Ikan'],
    optionalActivities: ['Fun Game B: Volcano, Spon Estafet, Sungai Beracun, Hola Hope Race, Back Ball'],
    description: 'Outbound menangkap ikan disertai Fun Game B'
  },
  {
    id: 'outbound-catchfish-fgc',
    name: 'OUTBOUND CATCH FISH - Fun Game C',
    category: 'Outbound & Petualangan',
    activities: ['Ice Breaking', 'High Rope', 'Flying Fox', 'Menangkap Ikan'],
    optionalActivities: ['Fun Game C: Snow Ball, Volcano, Spon Estafet, Tarik Tambang, Sungai Beracun'],
    description: 'Outbound menangkap ikan disertai Fun Game C'
  },

  // F. Paket Budidaya & Ketahanan Pangan
  {
    id: 'pengolahan-limbah',
    name: 'PENGOLAHAN LIMBAH',
    category: 'Pertanian & Agro',
    activities: ['Ice Breaking', 'Edukasi Pilah Sampah', 'Membuat Pupuk Kohe', 'Melukis Kaleng', 'Membuat Biogas'],
    optionalActivities: ['PILIH 2 KEGIATAN FUN GAME (Isi di Pilihan Custom)'],
    description: 'Pengolahan limbah organik kotoran hewan (kohe) menjadi pupuk dan energi bersih'
  },
  {
    id: 'budidaya',
    name: 'BUDIDAYA',
    category: 'Pertanian & Agro',
    activities: ['Ice Breaking', 'Edukasi Pilah Sampah', 'Inseminasi Buatan', 'Praktek Stek Tanaman', 'Membuat Baglog Jamur'],
    optionalActivities: ['PILIH 2 KEGIATAN FUN GAME (Isi di Pilihan Custom)'],
    description: 'Praktek budidaya tanaman stek, kultur baglog jamur tiram, dan peternakan'
  },
  {
    id: 'ketahanan-pangan',
    name: 'KETAHANAN PANGAN',
    category: 'Pertanian & Agro',
    activities: ['Ice Breaking', 'Edukasi Pilah Sampah', 'Menanam Padi', 'Membuat Telur Asin', 'Membuat Yogurt', 'Sembelih Ayam'],
    optionalActivities: ['PILIH 2 KEGIATAN FUN GAME (Isi di Pilihan Custom)'],
    description: 'Edukasi kemandirian pangan, pembuatan telur asin, yogurt segar, dan penanaman padi'
  },
  {
    id: 'urban-farming',
    name: 'URBAN FARMING',
    category: 'Pertanian & Agro',
    activities: ['Membuat Hydroponik', 'Kokedama', 'Membuat Pupuk Kompos'],
    optionalActivities: ['PILIH 2 KEGIATAN FUN GAME (Isi di Pilihan Custom)'],
    description: 'Teknologi pertanian perkotaan, instalasi hidroponik, kokedama lumut, dan kompos'
  },
  {
    id: 'entrepreneur-farmer',
    name: 'ENTREPRENEUR FARMER',
    category: 'Enterpreneur & Skill',
    activities: ['Ice Breaking', 'Inseminasi Buatan', 'Membuat Yogurt', 'Membuat Telur Asin', 'Kreasi Kokedama', 'Membuat Pupuk Kompos', 'Pupuk Kandang'],
    optionalActivities: ['PILIH 2 KEGIATAN FUN GAME (Isi di Pilihan Custom)'],
    description: 'Paket komprehensif wirausaha agribisnis dari hulu ke hilir'
  },

  // G. Camping Ground & Berkemah
  {
    id: 'camping-basic',
    name: 'CAMPING',
    category: 'Camping Ground',
    activities: ['Free Tiket Masuk', 'Tenda', 'Matras', 'Lampu Tembak', 'Api Unggun', 'Makan 2x'],
    optionalActivities: [],
    description: 'Pengalaman bermalam di alam terbuka dengan tenda dome dan api unggun kebersamaan'
  },
  {
    id: 'fullcamp-fga',
    name: 'FULL CAMP - Fun Game A',
    category: 'Camping Ground',
    activities: ['Free Tiket Masuk', 'Camping Ground', 'Tenda & Matras', '3x Makan', 'Kegiatan Edukasi', 'Fun Game', 'Lampu Tembak', 'Api Unggun'],
    optionalActivities: ['Paket Fun Game A: Snow Ball, Tarik Tambang, Sungai Beracun, Snake Ballon, Hola Hope Race'],
    description: 'Paket perkemahan penuh 2 hari 1 malam lengkap dengan edukasi dan Fun Game A'
  },
  {
    id: 'fullcamp-fgb',
    name: 'FULL CAMP - Fun Game B',
    category: 'Camping Ground',
    activities: ['Free Tiket Masuk', 'Camping Ground', 'Tenda & Matras', '3x Makan', 'Kegiatan Edukasi', 'Fun Game', 'Lampu Tembak', 'Api Unggun'],
    optionalActivities: ['Paket Fun Game B: Volcano, Spon Estafet, Sungai Beracun, Hola Hope Race, Back Ball'],
    description: 'Paket perkemahan penuh 2 hari 1 malam lengkap dengan edukasi dan Fun Game B'
  },
  {
    id: 'fullcamp-fgc',
    name: 'FULL CAMP - Fun Game C',
    category: 'Camping Ground',
    activities: ['Free Tiket Masuk', 'Camping Ground', 'Tenda & Matras', '3x Makan', 'Kegiatan Edukasi', 'Fun Game', 'Lampu Tembak', 'Api Unggun'],
    optionalActivities: ['Paket Fun Game C: Snow Ball, Volcano, Spon Estafet, Tarik Tambang, Sungai Beracun'],
    description: 'Paket perkemahan penuh 2 hari 1 malam lengkap dengan edukasi dan Fun Game C'
  },
  {
    id: 'sewa-campground',
    name: 'SEWA CAMPROUND',
    category: 'Camping Ground',
    activities: ['Free Tiket Masuk', 'Lampu Tembak', 'Tempat Camping 2 Hari 1 Malam'],
    optionalActivities: [],
    description: 'Penyewaan area lahan camping ground asri untuk rombongan mandiri'
  },

  // H. Gathering & Komunitas
  {
    id: 'gathering-standard',
    name: 'GATHERING',
    category: 'Gathering & Komunitas',
    activities: ['Free Tiket Masuk', 'Tempat Kumpul', 'Speaker & Mic', 'Berkuda / Flying Fox / Archery', 'Kokedama'],
    optionalActivities: ['Paket Fun Game A / B / C'],
    description: 'Gathering kebersamaan keluarga/sekolah dengan fasilitas sound system dan wahana ketangkasan'
  },
  {
    id: 'ngumpul',
    name: 'NGUMPUL',
    category: 'Gathering & Komunitas',
    activities: ['Free Tiket Masuk', 'Tempat Kumpul', 'Speaker & Mic', 'Makan 1x (Paket A, B & X)'],
    optionalActivities: [],
    description: 'Tempat berkumpul santai dan sajian hidangan saung resto'
  },
  {
    id: 'gathering-mafun-fga',
    name: 'GATHERING - MaFun - Fun Game A',
    category: 'Gathering & Komunitas',
    activities: ['Free Tiket Masuk', 'Tempat Kumpul', 'Speaker & Mic', 'Makan 1x (Paket A, B & X)', 'Fun Game', 'Welcome Drink'],
    optionalActivities: ['Paket Fun Game A: Snow Ball, Tarik Tambang, Sungai Beracun, Snake Ballon, Hola Hope Race'],
    description: 'Makan bersama, welcome drink, dan Fun Game A seru'
  },
  {
    id: 'gathering-mafun-fgb',
    name: 'GATHERING - MaFun - Fun Game B',
    category: 'Gathering & Komunitas',
    activities: ['Free Tiket Masuk', 'Tempat Kumpul', 'Speaker & Mic', 'Makan 1x (Paket A, B & X)', 'Fun Game', 'Welcome Drink'],
    optionalActivities: ['Paket Fun Game B: Volcano, Spon Estafet, Sungai Beracun, Hola Hope Race, Back Ball'],
    description: 'Makan bersama, welcome drink, dan Fun Game B seru'
  },
  {
    id: 'gathering-mafun-fgc',
    name: 'GATHERING - MaFun - Fun Game C',
    category: 'Gathering & Komunitas',
    activities: ['Free Tiket Masuk', 'Tempat Kumpul', 'Speaker & Mic', 'Makan 1x (Paket A, B & X)', 'Fun Game', 'Welcome Drink'],
    optionalActivities: ['Paket Fun Game C: Snow Ball, Volcano, Spon Estafet, Tarik Tambang, Sungai Beracun'],
    description: 'Makan bersama, welcome drink, dan Fun Game C seru'
  },
  {
    id: 'gathering-makoary',
    name: 'GATHERING - MaKoAry',
    category: 'Gathering & Komunitas',
    activities: ['Free Tiket Masuk', 'Tempat Kumpul', 'Speaker & Mic', 'Makan 1x (Paket A, B & X)', 'Kokedama', 'Welcome Drink'],
    optionalActivities: [],
    description: 'Gathering santai, sajian kuliner saung resto, workshop kokedama tanaman jepang'
  },
  {
    id: 'gathering-kocher',
    name: 'GATHERING - KoCher',
    category: 'Gathering & Komunitas',
    activities: ['Free Tiket Masuk', 'Tempat Kumpul', 'Speaker & Mic', 'Makan 1x (Paket A, B & X)', 'Kokedama & Archery', 'Welcome Drink'],
    optionalActivities: [],
    description: 'Gathering dengan workshop seni kokedama dan latihan memanah memikat'
  },
  {
    id: 'gathering-makoary-fun-fga',
    name: 'GATHERING - MaKoAry Fun - Fun Game A',
    category: 'Gathering & Komunitas',
    activities: ['Free Tiket Masuk', 'Tempat Kumpul', 'Speaker & Mic', 'Makan 1x (Paket A, B & X)', 'Kokedama & Archery', 'Fun Game', 'Welcome Drink'],
    optionalActivities: ['Paket Fun Game A'],
    description: 'Kombinasi lengkap makan saung resto, kokedama, panahan, dan Fun Game A'
  },
  {
    id: 'gathering-makoary-fun-fgb',
    name: 'GATHERING - MaKoAry Fun - Fun Game B',
    category: 'Gathering & Komunitas',
    activities: ['Free Tiket Masuk', 'Tempat Kumpul', 'Speaker & Mic', 'Makan 1x (Paket A, B & X)', 'Kokedama & Archery', 'Fun Game', 'Welcome Drink'],
    optionalActivities: ['Paket Fun Game B'],
    description: 'Kombinasi lengkap makan saung resto, kokedama, panahan, dan Fun Game B'
  },
  {
    id: 'gathering-makoary-fun-fgc',
    name: 'GATHERING - MaKoAry Fun - Fun Game C',
    category: 'Gathering & Komunitas',
    activities: ['Free Tiket Masuk', 'Tempat Kumpul', 'Speaker & Mic', 'Makan 1x (Paket A, B & X)', 'Kokedama & Archery', 'Fun Game', 'Welcome Drink'],
    optionalActivities: ['Paket Fun Game C'],
    description: 'Kombinasi lengkap makan saung resto, kokedama, panahan, dan Fun Game C'
  },

  // I. Outbound Team Building
  {
    id: 'teambuilding-fga',
    name: 'OUTBOUND TEAM BUILDING - Fun Game A',
    category: 'Team Building',
    activities: ['Ice Breaking & Game', 'High Rope', 'Flying Fox', 'Game Rotation', 'Final Project'],
    optionalActivities: ['Paket Fun Game A: Snow Ball, Tarik Tambang, Sungai Beracun, Snake Ballon, Hola Hope Race'],
    description: 'Membangun sinergi tim, komunikasi efektif, dan kepemimpinan dengan Fun Game A'
  },
  {
    id: 'teambuilding-fgb',
    name: 'OUTBOUND TEAM BUILDING - Fun Game B',
    category: 'Team Building',
    activities: ['Ice Breaking & Game', 'High Rope', 'Flying Fox', 'Game Rotation', 'Final Project'],
    optionalActivities: ['Paket Fun Game B: Volcano, Spon Estafet, Sungai Beracun, Hola Hope Race, Back Ball'],
    description: 'Membangun sinergi tim, komunikasi efektif, dan kepemimpinan dengan Fun Game B'
  },
  {
    id: 'teambuilding-fgc',
    name: 'OUTBOUND TEAM BUILDING - Fun Game C',
    category: 'Team Building',
    activities: ['Ice Breaking & Game', 'High Rope', 'Flying Fox', 'Game Rotation', 'Final Project'],
    optionalActivities: ['Paket Fun Game C: Snow Ball, Volcano, Spon Estafet, Tarik Tambang, Sungai Beracun'],
    description: 'Membangun sinergi tim, komunikasi efektif, dan kepemimpinan dengan Fun Game C'
  },

  // J. Custom
  {
    id: 'custom-package',
    name: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    category: 'Custom',
    activities: ['Aktivitas & Wahana Custom Sesuai Kesepakatan Khusus'],
    optionalActivities: ['Bebas memilih wahana, workshop, dan game'],
    description: 'Susunan aktivitas dan logistik dirancang khusus menyesuaikan kebutuhan dan anggaran sekolah'
  }
];

// ---------------- 2. DATABASE PAKET GURU (SESUAI TABEL RESMI D'KANDANG) ----------------
export const TEACHER_PACKAGES: PackageDefinition[] = [
  {
    id: 'guru-mager',
    name: 'MAGER',
    category: 'Paket Guru',
    activities: ['Tiket Masuk', 'Saung Transit VIP', 'Akses Bersantai'],
    optionalActivities: ['Tanpa Kegiatan Fisik'],
    description: 'Paket pendamping santai: Free tiket masuk dan akses saung istirahat nyaman'
  },
  {
    id: 'guru-asik',
    name: 'ASIK',
    category: 'Paket Guru',
    activities: ['Tiket Masuk', 'Saung Transit VIP'],
    optionalActivities: ['Pilihan Kegiatan: Kokedama / Archery'],
    description: 'Paket santai dengan pilihan aktivitas kreasi Kokedama atau olahraga Memanah (Archery)'
  },
  {
    id: 'guru-seru-fga',
    name: 'SERU - Fun Game A',
    category: 'Paket Guru',
    activities: ['Tiket Masuk', 'Saung Transit VIP', 'FUN GAME A'],
    optionalActivities: ['Pilihan Kegiatan: Kokedama / Archery'],
    description: 'Paket seru kebersamaan guru dengan rangkaian FUN GAME A + Kokedama / Archery'
  },
  {
    id: 'guru-seru-fgb',
    name: 'SERU - Fun Game B',
    category: 'Paket Guru',
    activities: ['Tiket Masuk', 'Saung Transit VIP', 'FUN GAME B'],
    optionalActivities: ['Pilihan Kegiatan: Kokedama / Archery'],
    description: 'Paket seru kebersamaan guru dengan rangkaian FUN GAME B + Kokedama / Archery'
  },
  {
    id: 'guru-seru-fgc',
    name: 'SERU - Fun Game C',
    category: 'Paket Guru',
    activities: ['Tiket Masuk', 'Saung Transit VIP', 'FUN GAME C'],
    optionalActivities: ['Pilihan Kegiatan: Kokedama / Archery'],
    description: 'Paket seru kebersamaan guru dengan rangkaian FUN GAME C + Kokedama / Archery'
  },
  {
    id: 'guru-free-foc',
    name: 'GURU PENDAMPING SEKOLAH (FREE FOC)',
    category: 'Paket Guru',
    activities: ['Tiket Masuk Bebas Biaya (Sesuai Kuota FOC)', 'Akses Saung Transit & Pendampingan Siswa'],
    optionalActivities: [],
    description: 'Guru pembimbing yang mendapatkan tiket masuk gratis sesuai kuota Free of Charge'
  },
  {
    id: 'guru-custom',
    name: 'CUSTOM PAKET GURU',
    category: 'Paket Guru',
    activities: ['Disesuaikan dengan kebutuhan khusus guru sekolah'],
    optionalActivities: [],
    description: 'Paket guru kustomisasi sesuai kesepakatan'
  }
];

// ---------------- 3. DATABASE PAKET PENDAMPING (ORANG TUA / WALI) ----------------
export const COMPANION_PACKAGES: PackageDefinition[] = [
  {
    id: 'comp-mager',
    name: 'MAGER',
    category: 'Paket Pendamping',
    activities: ['Tiket Masuk', 'Saung Transit & Area Santai'],
    optionalActivities: ['Tanpa Kegiatan Fisik'],
    description: 'Paket santai orang tua: Tiket masuk dan menikmati suasana asri agrowisata'
  },
  {
    id: 'comp-asik',
    name: 'ASIK',
    category: 'Paket Pendamping',
    activities: ['Tiket Masuk', 'Saung Transit'],
    optionalActivities: ['Pilihan Kegiatan: Kokedama / Archery'],
    description: 'Paket aktif orang tua dengan kreasi Kokedama atau olahraga Memanah (Archery)'
  },
  {
    id: 'comp-seru-fga',
    name: 'SERU - Fun Game A',
    category: 'Paket Pendamping',
    activities: ['Tiket Masuk', 'FUN GAME A'],
    optionalActivities: ['Pilihan Kegiatan: Kokedama / Archery'],
    description: 'Fun game seru orang tua / wali murid paket A + Kokedama / Archery'
  },
  {
    id: 'comp-seru-fgb',
    name: 'SERU - Fun Game B',
    category: 'Paket Pendamping',
    activities: ['Tiket Masuk', 'FUN GAME B'],
    optionalActivities: ['Pilihan Kegiatan: Kokedama / Archery'],
    description: 'Fun game seru orang tua / wali murid paket B + Kokedama / Archery'
  },
  {
    id: 'comp-seru-fgc',
    name: 'SERU - Fun Game C',
    category: 'Paket Pendamping',
    activities: ['Tiket Masuk', 'FUN GAME C'],
    optionalActivities: ['Pilihan Kegiatan: Kokedama / Archery'],
    description: 'Fun game seru orang tua / wali murid paket C + Kokedama / Archery'
  },
  {
    id: 'comp-tiket-only',
    name: 'TIKET MASUK PENDAMPING SAJA',
    category: 'Paket Pendamping',
    activities: ['Akses Tiket Masuk Gate Agrowisata'],
    optionalActivities: [],
    description: 'Hanya tiket masuk gate tanpa fasilitas kegiatan khusus'
  },
  {
    id: 'comp-custom',
    name: 'CUSTOM PAKET PENDAMPING',
    category: 'Paket Pendamping',
    activities: ['Disesuaikan dengan kebutuhan khusus rombongan pendamping'],
    optionalActivities: [],
    description: 'Paket pendamping kustomisasi sesuai kesepakatan'
  }
];

// ---------------- 4. DEFINISI RINCIAN FUN GAME A, B, C ----------------
export const FUN_GAME_VARIANTS = {
  'Fun Game A': {
    name: 'Paket Fun Game A',
    games: ['A. Snow Ball', 'D. Tarik Tambang', 'E. Sungai Beracun', 'F. Snake Ballon', 'G. Hola Hope Race']
  },
  'Fun Game B': {
    name: 'Paket Fun Game B',
    games: ['B. Volcano', 'C. Spon Estafet', 'E. Sungai Beracun', 'G. Hola Hope Race', 'H. Back Ball']
  },
  'Fun Game C': {
    name: 'Paket Fun Game C',
    games: ['A. Snow Ball', 'B. Volcano', 'C. Spon Estafet', 'D. Tarik Tambang', 'E. Sungai Beracun']
  }
};

// ---------------- 5. KATALOG TAMBAHAN (ADDITIONAL & ADD-ONS) ----------------
export const ADDITIONAL_CATALOG_PRESETS = [
  // Wahana
  { name: 'Berkuda Keliling Track Agrowisata', category: 'wahana' as const, defaultPrice: 25000, unitName: 'pax' },
  { name: 'Flying Fox Dewasa & Anak (Safety Gear Lengkap)', category: 'wahana' as const, defaultPrice: 25000, unitName: 'pax' },
  { name: 'Fun Archery / Memanah Sasaran Edukasi', category: 'wahana' as const, defaultPrice: 20000, unitName: 'pax' },
  { name: 'Menangkap Ikan di Kolam Lumpur Alami', category: 'wahana' as const, defaultPrice: 20000, unitName: 'pax' },
  { name: 'Menunggang Delman Hias Keliling Farm', category: 'wahana' as const, defaultPrice: 15000, unitName: 'pax' },
  { name: 'Bebek Gowes & Kolam Perahu Air', category: 'wahana' as const, defaultPrice: 20000, unitName: 'pax' },

  // Konsumsi (F&B)
  { name: 'Makan Siang Saung Resto (Nasi Bento Ayam Goreng, Sambal, Sayur & Mineral)', category: 'fnb' as const, defaultPrice: 25000, unitName: 'pax' },
  { name: 'Paket Prasmanan Saung VIP (Nasi Liwet Komplit, Ayam Bakar, Ikan, Lalapan)', category: 'fnb' as const, defaultPrice: 45000, unitName: 'pax' },
  { name: 'Susu Murni Segar Pasteurisasi Botol D\'Kandang (250 ml)', category: 'fnb' as const, defaultPrice: 12000, unitName: 'botol' },
  { name: 'Yogurt Probiotik Buah Asli D\'Kandang (Cup 150 ml)', category: 'fnb' as const, defaultPrice: 10000, unitName: 'cup' },
  { name: 'Snack Box Tradisional (2 Kue Basah + Air Mineral Gelas)', category: 'fnb' as const, defaultPrice: 12000, unitName: 'box' },
  { name: 'Coffee Break & Teh Hangat Gula Aren Saung VIP', category: 'fnb' as const, defaultPrice: 15000, unitName: 'pax' },

  // Souvenir & Edukasi
  { name: 'Souvenir Caping Lukis Bambu Petani', category: 'souvenir' as const, defaultPrice: 15000, unitName: 'pcs' },
  { name: 'Starterkit Menanam (Potty Lukis, Media Tanam & Bibit Sayur Organik)', category: 'souvenir' as const, defaultPrice: 15000, unitName: 'set' },
  { name: 'Souvenir Mug Keramik & Goodie Bag D\'Kandang', category: 'souvenir' as const, defaultPrice: 20000, unitName: 'pcs' },
  { name: 'Bibit Tanaman Hias / Sayur Siap Tanam', category: 'souvenir' as const, defaultPrice: 10000, unitName: 'polybag' },

  // Fasilitas & Logistik
  { name: 'Banner Selamat Datang Rombongan Sekolah (4 x 1 Meter)', category: 'fasilitas' as const, defaultPrice: 150000, unitName: 'banner' },
  { name: 'Sewa Saung Utama / Hall VIP Ber-AC (Sound System + 2 Wireless Mic)', category: 'fasilitas' as const, defaultPrice: 500000, unitName: 'event' },
  { name: 'Pemandu Khusus / MC Acara Interaktif Sekolah', category: 'fasilitas' as const, defaultPrice: 350000, unitName: 'event' },
  { name: 'Dokumentasi Foto & Video Kegiatan Field Trip (Google Drive HD)', category: 'fasilitas' as const, defaultPrice: 750000, unitName: 'event' }
];
