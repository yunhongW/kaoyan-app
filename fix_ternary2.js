const fs = require('fs');
const p = 'C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js';
let t = fs.readFileSync(p, 'utf-8');

// Fix missing ? in ternary operators (lost during encoding corruption)
t = t.replace(/isToday  "/g, 'isToday ? "');
t = t.replace(/pomoState === "focus"  "/g, 'pomoState === "focus" ? "');
t = t.replace(/pomoState === "focus"  \?/g, 'pomoState === "focus" ? ');

fs.writeFileSync(p, t, 'utf-8');
console.log('Fixed more ternaries.');
