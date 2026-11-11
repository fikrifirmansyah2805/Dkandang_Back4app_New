/**
 * Enterprise ERP Export Helper Utility for D'Kandang Amazing Farm
 * 
 * Provides robust, cross-browser, cross-platform file export capabilities:
 * - CSV export with automatic UTF-8 BOM for Microsoft Excel & Google Sheets compatibility
 * - Strict character escaping (quotes, commas, newlines)
 * - Safe Blob + URL.createObjectURL download workflow (no URL length limits or URI encoding errors)
 * - Support for JSON, Word (.doc), and text file exports
 */

/**
 * Escapes a cell value for CSV format according to RFC 4180
 */
export function escapeCSVCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '""';
  }
  
  const stringValue = String(value);
  
  // Escape double quotes by doubling them (" -> "")
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Triggers a safe browser download of any Blob object
 */
export function downloadBlob(blob: Blob, filename: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    // Must be in DOM for Firefox and some webview containers
    document.body.appendChild(link);
    link.click();
    
    // Cleanup after short delay to allow browser to start download
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 300);
    
    return true;
  } catch (err) {
    console.error(`[exportHelper] Failed to download file "${filename}":`, err);
    return false;
  }
}

/**
 * Exports structured headers and rows to a CSV file with UTF-8 BOM for seamless Excel compatibility
 */
export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): boolean {
  try {
    const formattedHeaders = headers.map(h => escapeCSVCell(h)).join(',');
    const formattedRows = rows.map(row => 
      row.map(cell => escapeCSVCell(cell)).join(',')
    );

    // Prepend UTF-8 BOM (\uFEFF) so Excel on Windows/Mac detects UTF-8 automatically
    const csvContent = '\uFEFF' + [formattedHeaders, ...formattedRows].join('\r\n');
    
    const blob = new Blob([csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });

    const finalFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    return downloadBlob(blob, finalFilename);
  } catch (err) {
    console.error('[exportHelper] Error in exportToCSV:', err);
    return false;
  }
}

/**
 * Exports pre-formatted raw CSV text to a file with UTF-8 BOM
 */
export function exportRawCSV(filename: string, rawCsvContent: string): boolean {
  try {
    // Add UTF-8 BOM if not already present
    const content = rawCsvContent.startsWith('\uFEFF') 
      ? rawCsvContent 
      : '\uFEFF' + rawCsvContent;

    const blob = new Blob([content], { 
      type: 'text/csv;charset=utf-8;' 
    });

    const finalFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    return downloadBlob(blob, finalFilename);
  } catch (err) {
    console.error('[exportHelper] Error in exportRawCSV:', err);
    return false;
  }
}

/**
 * Exports data to a JSON file
 */
export function exportToJSON(filename: string, data: any): boolean {
  try {
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { 
      type: 'application/json;charset=utf-8;' 
    });

    const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    return downloadBlob(blob, finalFilename);
  } catch (err) {
    console.error('[exportHelper] Error in exportToJSON:', err);
    return false;
  }
}

/**
 * Exports HTML content as a Microsoft Word compatible (.doc) file
 */
export function exportToWordDoc(filename: string, title: string, htmlBody: string): boolean {
  try {
    const wordDocumentContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <meta charset="utf-8">
        <title>${title}</title>
      </head>
      <body>
        ${htmlBody}
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + wordDocumentContent], {
      type: 'application/msword;charset=utf-8'
    });

    const finalFilename = filename.endsWith('.doc') ? filename : `${filename}.doc`;
    return downloadBlob(blob, finalFilename);
  } catch (err) {
    console.error('[exportHelper] Error in exportToWordDoc:', err);
    return false;
  }
}
