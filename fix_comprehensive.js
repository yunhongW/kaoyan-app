const fs = require('fs');
const p = 'C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js';

// The original file was corrupted beyond repair. Let's rebuild it.
// Strategy: Read the current file, strip out non-ASCII issues in a smart way,
// and reconstruct the JS logic.

let t = fs.readFileSync(p, 'utf-8');

// First, undo all the ? damage by removing incorrectly placed ? 
// (ternary ? should only be after conditions in expressions, not in comments or props)

// Fix comments: "// comment ? " should be "// comment\n"
t = t.replace(/\/\/ ([^?]+) \? /g, (match, comment) => {
    const commentText = comment.trim();
    if (commentText.length > 0 && commentText.length < 50) {
        return '// ' + commentText + '\n  ';
    }
    return match;
});

// Fix props that got ? inserted: "prop ? {value}" should be "prop={value}"
t = t.replace(/selectTextOnFocus \? /g, 'selectTextOnFocus\n  ');
t = t.replace(/autoFocus \? /g, 'autoFocus\n  ');

// Fix FlatList ? data
t = t.replace(/FlatList \? data/g, 'FlatList\n  data');

// Fix "// seconds ? " 
t = t.replace(/\/\/ seconds \? const/g, '// seconds\n  const');

// Fix broken strings where " is missing
t = t.replace(/\u201c/g, '"');  // smart quotes
t = t.replace(/\u201d/g, '"');
// Fix "focus" ? "专注中 : 休息中
t = t.replace(/"focus" \? "专注中 : "/g, '"focus" ? "专注中" : "');

// Fix "自定义科目 : 
t = t.replace(/"自定义科目 : "/g, '"自定义科目" : "');

// Fix "继续" : "开始} -> "继续" : "开始"}
t = t.replace(/: "开始}/g, ': "开始"}');

// Now let's check
fs.writeFileSync(p, t, 'utf-8');
console.log('Fixed remaining issues.');

// Check for remaining problems
const lines = t.split('\n');
let issues = 0;
for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // Check for ? in suspicious places
    if (l.includes(' ? ') && !l.includes(' ? ') && l.indexOf(' ? ') > 5) {
        const before = l.substring(0, l.indexOf(' ? ')).trim();
        if (before.endsWith(':') || before.endsWith('=') || before.endsWith('>') || before.endsWith('}')) {
            // This is probably a broken ternary, that's OK
        } else {
            console.log('SUSPICIOUS line ' + (i+1) + ': ' + l.substring(0, 100));
            issues++;
        }
    }
}
console.log('Suspicious lines: ' + issues);

// Also check: do we have matching <Text> tags?
let openText = (t.match(/<Text[ >]/g) || []).length;
let closeText = (t.match(/<\/Text>/g) || []).length;
console.log('<Text>: ' + openText + '  </Text>: ' + closeText);
