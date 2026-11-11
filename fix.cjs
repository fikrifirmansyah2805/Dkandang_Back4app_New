const fs = require('fs');
let code = fs.readFileSync('src/context/ERPContext.tsx', 'utf8');

const badString = `      status: 'issued',\n      items: quote.items.map(i => ({ sku: 'ITEM', name: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.totalPrice })),\n      discount: 0`;
code = code.split(badString).join(`      status: 'issued'`);

fs.writeFileSync('src/context/ERPContext.tsx', code);
