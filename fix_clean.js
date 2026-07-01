const fs=require("fs");
let p="C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js";
let c=fs.readFileSync(p,"utf-8");
c=c.replace(/\u5bb8[\ue11f]?\u63d2/g,"已学");
c=c.replace(/=== 0  \(/g,"=== 0 ? (");
c=c.replace(/=== "ios"  /g,'=== "ios" ? ');
fs.writeFileSync(p,c,"utf-8");
console.log("OK");