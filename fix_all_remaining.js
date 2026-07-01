const fs=require("fs");
let p="C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js";
let t=fs.readFileSync(p,"utf-8");
// Fix ALL missing ternary operators
let r=/(\w+(?:\s*[=!><]+\s*\w+)*)\s{3,}(?=["\w({])/g;
let prev;
do{prev=t;t=t.replace(r,function(m,$1){return $1+" ? "})}while(t!==prev);
// Fix known over-replacements (style props that got ?)
t=t.replace(/onPress \? {/g,"onPress={()=>{");
t=t.replace(/style \? {/g,"style={");
t=t.replace(/key \? {/g,"key={");
t=t.replace(/keyExtractor \? {/g,"keyExtractor={");
t=t.replace(/contentContainerStyle \? {/g,"contentContainerStyle={");
t=t.replace(/renderItem \? {/g,"renderItem={");
t=t.replace(/ListEmptyComponent \? {/g,"ListEmptyComponent={");
t=t.replace(/data \? {/g,"data={");
fs.writeFileSync(p,t,"utf-8");
console.log("Fixed");
