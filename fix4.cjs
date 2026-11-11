const fs = require('fs');
let code = fs.readFileSync('src/context/ERPContext.tsx', 'utf8');

// The first replacement in fix2 might have missed due to multiple instances. Let's do it generally
code = code.replace(
  `      paidAmount: 0,\n      status: 'issued'\n    };\n    setSalesInvoices(prev => [newInv, ...prev]);`,
  `      paidAmount: 0,\n      status: 'issued',\n      items: soData.items.map(i => ({ sku: i.sku || 'ITEM', name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),\n      discount: 0\n    };\n    setSalesInvoices(prev => [newInv, ...prev]);`
);
fs.writeFileSync('src/context/ERPContext.tsx', code);
