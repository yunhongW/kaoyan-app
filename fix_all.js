const fs = require("fs");
const p = "C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js";
let t = fs.readFileSync(p, "utf-8");
// Fix all double-space-separated ternaries (where ? was lost)
t = t.replace(/(\w+)\s{2,}(?=["\/\w])/g, "$1 ? ");
fs.writeFileSync(p, t, "utf-8");
const lines = t.split("\n");
console.log("Line 376:", lines[375]);
console.log("Line 386:", lines[385]);
