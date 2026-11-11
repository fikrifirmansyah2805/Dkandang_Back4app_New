const fs = require('fs');
let code = fs.readFileSync('src/context/ERPContext.tsx', 'utf8');

// fix addSalesOrder
code = code.replace(
  `      paidAmount: 0,\n      status: 'issued'\n    };\n    setSalesInvoices(prev => [newInv, ...prev]);\n    await saveDocument('sales_invoices', newInv);\n    showNotification(\`Surat Pesanan \${soNum} dibuat bersama Faktur \${invNum}\`, 'success');`,
  `      paidAmount: 0,\n      status: 'issued',\n      items: soData.items.map(i => ({ sku: i.sku || 'ITEM', name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),\n      discount: 0\n    };\n    setSalesInvoices(prev => [newInv, ...prev]);\n    await saveDocument('sales_invoices', newInv);\n    showNotification(\`Surat Pesanan \${soNum} dibuat bersama Faktur \${invNum}\`, 'success');`
);

fs.writeFileSync('src/context/ERPContext.tsx', code);
