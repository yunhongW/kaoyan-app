const fs = require("fs");

const zh = {
  timerHook: "\u8ba1\u65f6\u5668 Hook",
  animBar: "\u52a8\u753b\u8fdb\u5ea6\u6761",
  pulseDot: "\u8109\u51b2\u70b9",
  dataHook: "\u6570\u636e Hook",
  mainScreen: "\u4e3b\u5c4f\u5e55",
  headerDate: "\u9876\u680f + \u65e5\u671f",
  progressCard: "\u8fdb\u5ea6\u5361\u7247",
  subjectList: "\u79d1\u76ee\u5217\u8868",
  header_: "\u5934\u90e8",
  progressBar: "\u8fdb\u5ea6\u6761",
  actions_: "\u64cd\u4f5c\u533a",
  planInput: "\u8ba1\u5212\u8f93\u5165",
  timerBtns: "\u8ba1\u65f6\u6309\u94ae",
  studyingHint: "\u5b66\u4e60\u4e2d\u5e95\u90e8\u63d0\u793a",
  addBtn_: "\u6dfb\u52a0\u6309\u94ae",
  addModal: "\u6dfb\u52a0\u5f39\u7a97",
};

const t = fs.readFileSync("C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\DailyScreen_backup.js", "utf-8");
let r = t;

// Fix all the remaining "? " in JSX props
// The problem: regex replaced newline+indent with " ? "
// Solution: replace ALL " ? " with a newline+8 spaces to restore JSX props
// First, find all " ? " patterns and analyze if they should be ternaries or newlines

// Manual fix of known over-replaced props:
var propFixes = [
  ["\" ? defaultValue", "\"\n                      defaultValue"],
  ["\" ? onEndEditing", "\"\n                      onEndEditing"],
  ["\" ? value", "\"\n                   value"],
  ["\" ? ListEmptyComponent", "\"\n                  ListEmptyComponent"],
];
for (var i = 0; i < propFixes.length; i++) {
  while (r.indexOf(propFixes[i][0]) >= 0) {
    r = r.replace(propFixes[i][0], propFixes[i][1]);
  }
}

// Fix comment merged lines
r = r.replace(/\/\/ \S+ \? /g, function(m) {
  return m.replace(" ? ", "\n  ");
});

fs.writeFileSync("C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js", r, "utf-8");
console.log("Regenerated");