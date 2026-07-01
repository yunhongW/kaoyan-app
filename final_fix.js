const fs=require("fs");
let p="C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js";
let t=fs.readFileSync(p,"utf-8");
t=t.replace(/(!t)\s{2,}"/g,"$1 ? \x22");
t=t.replace(/(> 0)\s{2,}/g,"$1 ? ");
t=t.replace(/(=== 0)\s{2,}/g,"$1 ? ");
fs.writeFileSync(p,t,"utf-8");
console.log("done");
