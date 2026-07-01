const fs = require("fs");

// ========== Chinese text as \uXXXX ==========
const Z = {
  tHook: "\u8ba1\u65f6\u5668 Hook",
  aBar: "\u52a8\u753b\u8fdb\u5ea6\u6761",
  pDot: "\u8109\u51b2\u70b9",
  dHook: "\u6570\u636e Hook",
  main: "\u4e3b\u5c4f\u5e55",
  kaoyan: "\u8003\u7814\u4e13\u5c5e\u529f\u80fd",
  fanqie: "\u756a\u8304\u949f\u903b\u8f91",
  focusEnd: "\u4e13\u6ce8\u7ed3\u675f\uff0c\u8fdb\u5165\u4f11\u606f",
  noteEnd: "\u5e26\u5907\u6ce8\u7684\u7ed3\u675f",
  pomoStart: "\u756a\u8304\u6a21\u5f0f\u4e0b\u7684\u5f00\u59cb\uff1a\u540c\u65f6\u542f\u52a8\u8ba1\u65f6\u5668\u548c\u756a\u8304\u949f",
};

// Read backup - extract ASCII-only lines (the JS logic without Chinese strings)
const backup = fs.readFileSync("C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\DailyScreen_backup.js", "utf-8");

// Strategy: restore the file by fixing ALL remaining issues in one pass
let c = backup;

// Fix all known patterns:
var fixes = [
  ["\u5bb8\u63d2", "\u5df2\u5b66"],
  ['=== 0  (', '=== 0 ? ('],
  ['=== "ios"  ', '=== "ios" ? '],
  ['" ? defaultValue={', '"\n                      defaultValue={'],
  ['" ? onEndEditing={', '"\n                      onEndEditing={'],
  ['" ? value={customName}', '"\n                   value={customName}'],
  ['" ? maxLength={20}', '"\n                  maxLength={20}'],
  ['" ? keyboardType="number-pad"', '"\n                      keyboardType="number-pad"'],
  ['" ? returnKeyType="done"', '"\n                  returnKeyType="done"'],
  ['" ? onSubmitEditing={', '"\n                  onSubmitEditing={'],
  ['" ? ListEmptyComponent={', '"\n                  ListEmptyComponent={'],
  ['selectTextOnFocus?', 'selectTextOnFocus\n                      '],
  ['autoFocus?', 'autoFocus\n                  '],
  ['FlatList?', 'FlatList\n                  '],
  ['" ? data={', '"\n  data={'],
];
for (var i = 0; i < fixes.length; i++) {
  while (c.indexOf(fixes[i][0]) >= 0) {
    c = c.replace(fixes[i][0], fixes[i][1]);
  }
}

// Fix style comments: "// text ? prop: {" -> "// text\n  prop: {"
c = c.replace(/\/\/ [^?]+\? (\w+: \{)/g, function(m, prop) {
  return m.split(" ? ")[0] + "\n  " + prop;
});

// Fix other comment merges
c = c.replace(/\/\/ [^?\n]+[\?][^?\n]*/g, function(m) {
  return m.replace(" ? ", "\n");
});

// Fix all remaining missing ? in StyleSheet
c = c.replace(/=== "ios" {2,}\d+/g, '=== "ios" ? ');
c = c.replace(/(\d+)\s{3,}(\d+)\s*:/g, "$1 ? $2 :");

fs.writeFileSync("C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js", c, "utf-8");
console.log("Regenerated!");