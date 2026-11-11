const fs = require('fs');
let code = fs.readFileSync('src/utils/invoiceHelper.ts', 'utf8');

const regex = /function printDirectHtml\([^\)]+\) \{[\s\S]*?doc\.close\(\);\n  \}\n\}/;
code = code.replace(regex, '');

fs.writeFileSync('src/utils/invoiceHelper.ts', code);
