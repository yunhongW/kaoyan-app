const fs = require('fs');
const p = 'C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js';
let t = fs.readFileSync(p, 'utf-8');
// Fix missing < in </Text> - pattern: Chinese char + /Text>
t = t.replace(/([\u4e00-\u9fff\u2600-\u26ff\u2700-\u27bf])\/Text>/g, '$1<\\/Text>');
// Also fix standalone cases
t = t.replace('回今天/Text>', '回今天</Text>');
t = t.replace('已添加 ✨/Text>', '已添加 ✨</Text>');
fs.writeFileSync(p, t, 'utf-8');
console.log('Fixed closing tags');
