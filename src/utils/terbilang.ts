/**
 * Utilitas Konversi Angka ke Huruf (Terbilang Bahasa Indonesia)
 * Digunakan untuk pencetakan resmi Kwitansi, Faktur, dan Kuitansi Keuangan D'Kandang Farm
 */

const SATUAN = [
  '',
  'Satu',
  'Dua',
  'Tiga',
  'Empat',
  'Lima',
  'Enam',
  'Tujuh',
  'Delapan',
  'Sembilan',
  'Sepuluh',
  'Sebelas'
];

export function terbilang(n: number): string {
  const num = Math.floor(Math.abs(n));
  if (num === 0) return 'Nol Rupiah';

  function convert(val: number): string {
    if (val < 12) {
      return SATUAN[val];
    } else if (val < 20) {
      return convert(val - 10) + ' Belas';
    } else if (val < 100) {
      const sisa = val % 10;
      return convert(Math.floor(val / 10)) + ' Puluh' + (sisa ? ' ' + convert(sisa) : '');
    } else if (val < 200) {
      const sisa = val - 100;
      return 'Seratus' + (sisa ? ' ' + convert(sisa) : '');
    } else if (val < 1000) {
      const sisa = val % 100;
      return convert(Math.floor(val / 100)) + ' Ratus' + (sisa ? ' ' + convert(sisa) : '');
    } else if (val < 2000) {
      const sisa = val - 1000;
      return 'Seribu' + (sisa ? ' ' + convert(sisa) : '');
    } else if (val < 1000000) {
      const sisa = val % 1000;
      return convert(Math.floor(val / 1000)) + ' Ribu' + (sisa ? ' ' + convert(sisa) : '');
    } else if (val < 1000000000) {
      const sisa = val % 1000000;
      return convert(Math.floor(val / 1000000)) + ' Juta' + (sisa ? ' ' + convert(sisa) : '');
    } else if (val < 1000000000000) {
      const sisa = val % 1000000000;
      return convert(Math.floor(val / 1000000000)) + ' Miliar' + (sisa ? ' ' + convert(sisa) : '');
    } else if (val < 1000000000000000) {
      const sisa = val % 1000000000000;
      return convert(Math.floor(val / 1000000000000)) + ' Triliun' + (sisa ? ' ' + convert(sisa) : '');
    }
    return '';
  }

  const result = convert(num).trim().replace(/\s+/g, ' ');
  return `${result} Rupiah`;
}

/**
 * Format terbilang resmi dengan pagar pembuka dan penutup: # [Teks Terbilang] #
 */
export function formatTerbilangResmi(nominal: number): string {
  if (isNaN(nominal) || nominal <= 0) return '# Nol Rupiah #';
  return `# ${terbilang(nominal)} #`;
}
