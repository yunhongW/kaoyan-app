const fs = require('fs');
const p = 'C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js';
let t = fs.readFileSync(p, 'utf-8');
let lines = t.split('\n');
// Fix line 688 - simplify the timerText style to avoid Platform.select spread
lines[687] = '  timerText: { ...typography.bodyBold, color: colors.accent, minWidth: 50, textAlign: "center" },';
t = lines.join('\n');
fs.writeFileSync(p, t, 'utf-8');
console.log('Fixed');
