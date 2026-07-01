const fs = require("fs");
const p = "C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js";

const L = (s) => s; // no-op for ASCII
// For Chinese text: use Unicode escapes
const ZH = {
    t1: "\u8ba1\u65f6\u5668", // 计时器
    t2: "\u52a8\u753b\u8fdb\u5ea6\u6761", // 动画进度条
    t3: "\u8109\u51b2\u70b9", // 脉冲点
    t4: "\u6570\u636e", // 数据
    t5: "\u4e3b\u5c4f\u5e55", // 主屏幕
    t6: "\u8003\u7814\u4e13\u5c5e\u529f\u80fd", // 考研专属功能
    t7: "\u756a\u8304\u949f\u903b\u8f91", // 番茄钟逻辑
    t8: "\u4e13\u6ce8\u7ed3\u675f\uff0c\u8fdb\u5165\u4f11\u606f", // 专注结束，进入休息
    t9: "\u5e26\u5907\u6ce8\u7684\u7ed3\u675f", // 带备注的结束
    t10: "\u756a\u8304\u6a21\u5f0f\u4e0b\u7684\u5f00\u59cb\uff1a\u540c\u65f6\u542f\u52a8\u8ba1\u65f6\u5668\u548c\u756a\u8304\u949f", // 番茄模式下的开始：同时启动计时器和番茄钟
};

const content = fs.readFileSync(p, "utf-8");
let result = content;

// Fix all remaining missing "?" in ternary operators systematically
// Pattern: condition followed by 2+ spaces followed by value
result = result.replace(/(["\w])\s{3,}(?=["\w({])/g, "$1 ? ");
result = result.replace(/(\d+)\s{2,}(?=\d)/g, "$1 ? ");
result = result.replace(/(\w+)\s{2,}(?=["\w({])/g, "$1 ? ");

// But also fix places where "? " was incorrectly added to StyleSheet and comments
// Fix comment lines that got "? " inserted
result = result.replace(/\/\/ ([^?]+) \? /g, "// $1\n  ");

// Fix specific corrupted strings
result = result.replace(/\u5b98\u63d2/g, "\u5df2\u5b66"); // 宸插 -> 已学
result = result.replace(/\u5bb8/g, "\u5df2"); // 宸 -> 已

fs.writeFileSync(p, result, "utf-8");
console.log("Fixed");
