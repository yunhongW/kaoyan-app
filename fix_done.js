const fs=require('fs'); 
var p='C:\Users\吴习凡\Documents\timer\kaoyan-app\src\screens\DailyScreen.js'; 
var c=fs.readFileSync(p,'utf-8'); 
c=c.split('=== 0  (').join('=== 0 ? ('); 
c=c.split('=== "ios"  ').join('=== "ios" ? '); 
c=c.split('selectTextOnFocus').join('selectTextOnFocus\n                      '); 
c=c.split('autoFocus').join('autoFocus\n                  '); 
fs.writeFileSync(p,c,'utf-8'); 
console.log('done'); 
