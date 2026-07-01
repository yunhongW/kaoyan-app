const fs=require("fs");
let p="C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js";
let t=fs.readFileSync(p,"utf-8");
// Fix: "focus" ? "🍅 专注中 : "☕ -> "focus" ? "🍅 专注中" : "☕
t=t.replace('\uD83C\uDF4D 专注中 : "','\uD83C\uDF4D 专注中" : "');
fs.writeFileSync(p,t,"utf-8");
const l=t.split("\n");
console.log(l[497]);
