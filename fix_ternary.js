const fs = require('fs');
const p = 'C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js';
let t = fs.readFileSync(p, 'utf-8');
t = t.replace(/pl > 0\s+(?=Math)/g, 'pl > 0 ? ');
t = t.replace(/pl > 0\s+(?=act)/g, 'pl > 0 ? ');
t = t.replace(/act > 0\s+(?=\?)/g, 'act > 0 ? ');
t = t.replace(/act > 0\s+(?=\")/g, 'act > 0 ? ');
fs.writeFileSync(p, t, 'utf-8');
console.log('Fixed ternaries.');
