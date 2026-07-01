const fs=require("fs");
let p="C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js";
let t=fs.readFileSync(p,"utf-8");
// Manually fix all known corrupted patterns
var fixes = [
    // Props that got ? instead of newline+indent
    ['" ? defaultValue={String(pl)}', '"\n                      defaultValue={String(pl)}'],
    ['" ? onEndEditing={async (e) => {', '"\n                      onEndEditing={async (e) => {'],
    ['" ? maxLength={20}', '"\n                  maxLength={20}'],
    ['" ? keyboardType="number-pad"', '"\n                      keyboardType="number-pad"'],
    ['" ? returnKeyType="done"', '"\n                  returnKeyType="done"'],
    ['" ? onSubmitEditing={handleAddCustom}', '"\n                  onSubmitEditing={handleAddCustom}'],
    ['" ? ListEmptyComponent={', '"\n                  ListEmptyComponent={'],
    // Comments that had ? inserted
    ['// ===== 计时器 ? ', '// ===== 计时器 Hook =====\n'],
    ['// ===== 动画进度条 ? ', '// ===== 动画进度条 =====\n'],
    ['// ===== 脉冲点 ? ', '// ===== 脉冲点 =====\n'],
    ['// ===== 数据 ? ', '// ===== 数据 Hook =====\n'],
    ['// ===== 主屏幕 ? ', '// ===== 主屏幕 =====\n'],
    ['// 考研专属功能 ? ', '// 考研专属功能\n  '],
    ['// 番茄钟逻辑 ? ', '// 番茄钟逻辑\n  '],
    ['// 专注结束，进入休息 ? ', '// 专注结束，进入休息\n          '],
    ['// 带备注的结束 ? ', '// 带备注的结束\n      '],
    ['// 番茄模式下的开始：同时启动计时器和番茄钟 ? ', '// 番茄模式下的开始：同时启动计时器和番茄钟\n  '],
    ['// 顶栏 ? ', '// 顶栏 + 日期\n      '],
    ['// 进度卡片 ? ', '// 进度卡片\n        '],
    ['// 科目列表 ? ', '// 科目列表\n        '],
    ['// 头部 ? ', '// 头部\n                '],
    ['// 进度条 ? ', '// 进度条\n                '],
    ['// 操作区 ? ', '// 操作区\n                '],
    ['// 计划输入 ? ', '// 计划输入\n                  '],
    ['// 计时按钮 ? ', '// 计时按钮\n                  '],
    ['// 学习中底部提示 ? ', '// 学习中底部提示\n                '],
    ['// 添加按钮 ? ', '// 添加按钮\n        '],
    ['// 添加弹窗 ? ', '// 添加弹窗\n      '],
];
for (var i = 0; i < fixes.length; i++) {
    while (t.indexOf(fixes[i][0]) >= 0) {
        t = t.split(fixes[i][0]).join(fixes[i][1]);
    }
}
fs.writeFileSync(p, t, "utf-8");
console.log("Fixed " + fixes.length + " patterns");