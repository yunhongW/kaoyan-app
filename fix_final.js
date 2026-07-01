const fs = require("fs");
const path = require("path");

const p = "C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js";

// Read the current file to salvage the working JS logic
// Then rebuild all string content with proper Unicode
let t = fs.readFileSync(p, "utf-8");

// Strategy: replace all known corrupted strings systematically
const fixes = [
    // Fix comments
    ["=====", "====="],
    // Fix all the corrupted ternary operators (missing ?)
    [/(\d+)\s{2,}\((?=["\w])/g, "$1 ? ("],
    [/(\w+)\s{2,}\((?=["\w])/g, "$1 ? ("],
];

// Actually forget incremental. Let me just fix the SPECIFIC remaining issues:
// 1. The modal ternary
t = t.replace("showCustomInput  (", "showCustomInput ? (");
// 2. Check for FlatList
t = t.replace("FlatList\r\n  data", "FlatList data");  
// 3. Fix the >0 ternary patterns in map
t = t.replace(/act > 0  /g, "act > 0 ? ");
t = t.replace(/pl > 0  /g, "pl > 0 ? ");
t = t.replace(/pct >= 100  /g, "pct >= 100 ? ");
t = t.replace(/> 0  /g, "> 0 ? ");

// Fix the year/month display
t = t.replace("calDate.getFullYear()", "calDate.getFullYear()");

fs.writeFileSync(p, t, "utf-8");
console.log("Fixed remaining issues");
