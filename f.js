const fs=require('fs');
var p='C:\Users\吴习凡\Documents\timer\kaoyan-app\src\screens\DailyScreen.js'
var t=fs.readFileSync(p,'utf-8');
var q=String.fromCharCode(34);
t=t.replace('=== '+q+'ios'+q+'  50','=== '+q+'ios'+q+' ? 50');
fs.writeFileSync(p,t,'utf-8');
console.log('ok');
