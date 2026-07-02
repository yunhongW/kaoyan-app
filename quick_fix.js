const fs=require("fs");
const p="C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js";
let d=fs.readFileSync(p,"utf-8");
d=d.split('"center" },\n  timerText:').join('');
fs.writeFileSync(p,d,"utf-8");
console.log("OK");