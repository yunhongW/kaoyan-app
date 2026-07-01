const fs=require("fs");
let p="C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js";
let c=fs.readFileSync(p,"utf-8");
// Fix merged comments in StyleSheet section
// Pattern: "// text ? property: {" should be "// text\n  property: {"
c=c.replace(/\/\/ [^?]+\? (\w+: \{)/g, function(m, prop) {
  return m.split(" ? ")[0] + "\n  " + prop;
});
// Also fix "// text? text" patterns (missing space before ?)
c=c.replace(/\/\/ [^?\n]+\? [^?\n]+/g, function(m) {
  return m.replace(" ? ", "\n  ");
});
fs.writeFileSync(p,c,"utf-8");
console.log("Fixed style comments");