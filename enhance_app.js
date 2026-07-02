const fs = require("fs");

// ===== Fix DailyScreen =====
let ds = fs.readFileSync("C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js", "utf-8");

// Fix duplicate timerText style
ds = ds.split('  timerText: { ...typography.bodyBold, color: colors.accent, minWidth: 50, textAlign: "center" },\n  timerText: { ...typography.bodyBold, color: colors.accent, minWidth: 50, textAlign: "center", ...Platform.select').join('  timerText: { ...typography.bodyBold, color: colors.accent, minWidth: 50, textAlign: "center", ...Platform.select');

// Add daily goal feature: a simple daily study target
// Find the summary card section and add a goal indicator
var goalCode = '\n              {/* Daily goal */}\n              {dailyGoal > 0 && (\n                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>\n                  <Ionicons name="flag-outline" size={12} color={colors.textTertiary} />\n                  <Text style={{ fontSize: 10, color: colors.textTertiary }}>\n                    \u76ee\u6807 {dailyGoal}\u5206 | \u5df2\u5b8c\u6210 {Math.min(100, Math.round(summary.actual/dailyGoal*100))}%
                  </Text>\n                </View>\n              )}';

// Insert after summaryPct display
var summaryEnd = ds.indexOf('</View>\n\n        {/* \u79d1\u76ee\u5217\u8868 */}');
if (summaryEnd > 0) {
  ds = ds.slice(0, summaryEnd) + goalCode + ds.slice(summaryEnd);
}

// Add dailyGoal state and load it
ds = ds.replace('const [examDaysLeft, setExamDaysLeft] = useState(null);', 
  'const [examDaysLeft, setExamDaysLeft] = useState(null);\n  const [dailyGoal, setDailyGoal] = useState(0);');

// Load daily goal
ds = ds.replace('setExamDaysLeft(days);\n    })();\n  }, []);',
  'setExamDaysLeft(days);\n      const g = await store.getDailyGoal();\n      if (g) setDailyGoal(g);\n    })();\n  }, []);');

// Add study note modal UI - make it work properly
// Find where handlePomoStop is and make sure it shows note input
var modalInsert = '\n      {/* \u5907\u6ce8\u8f93\u5165\u5f39\u7a97 */}\n      <Modal visible={showNoteInput} transparent animationType="fade" onRequestClose={() => setShowNoteInput(false)}>\n        <View style={styles.modalOverlay}>\n          <View style={[styles.modal, shadows.lg]}>\n            <View style={styles.modalHeader}>\n              <Text style={styles.modalTitle}>\u8bb0\u5f55\u5907\u6ce8</Text>\n              <TouchableOpacity onPress={() => setShowNoteInput(false)}>\n                <Ionicons name="close" size={22} color={colors.textSecondary} />\n              </TouchableOpacity>\n            </View>\n            <View style={{ padding: spacing.xl }}>\n              <TextInput\n                style={styles.customInput}\n                placeholder="\u4f8b\u5982\uff1a\u80cc\u4e86\u8096\u56db\u3001\u505a\u4e862019\u771f\u9898" \n                value={sessionNote}\n                onChangeText={setSessionNote}\n                autoFocus\n                multiline\n                maxLength={200}\n              />\n              <View style={{ flexDirection: "row", gap: spacing.md, justifyContent: "flex-end" }}>\n                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setSessionNote(""); setShowNoteInput(false); }}>\n                  <Text style={styles.cancelBtnText}>\u8df3\u8fc7</Text>\n                </TouchableOpacity>\n                <TouchableOpacity style={styles.confirmBtn} onPress={() => handleStopWithNote(activeSubject)}>\n                  <Text style={styles.confirmBtnText}>\u4fdd\u5b58</Text>\n                </TouchableOpacity>\n              </View>\n            </View>\n          </View>\n        </View>\n      </Modal>';

// Insert before the closing </View> of the main container
var closingView = ds.lastIndexOf("\n    </View>\n  );\n}\n\nconst styles");
if (closingView > 0) {
  ds = ds.slice(0, closingView) + modalInsert + ds.slice(closingView);
}

fs.writeFileSync("C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\DailyScreen.js", ds, "utf-8");
console.log("Fixed DailyScreen");

// ===== Add daily goal to store =====
var store = fs.readFileSync("C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\store.js", "utf-8");
if (!store.includes("getDailyGoal")) {
  store = store.replace("export async function batchTotalActual(dateStrs) {",
    'export async function getDailyGoal() {\n  await load();\n  return cache.settings.dailyGoal || 0;\n}\n\nexport async function setDailyGoal(mins) {\n  await load();\n  cache.settings.dailyGoal = mins;\n  await save();\n}\n\nexport async function batchTotalActual(dateStrs) {');
  fs.writeFileSync("C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\store.js", store, "utf-8");
  console.log("Added daily goal to store");
}

// ===== Add daily goal setting to SettingsScreen =====
var ss = fs.readFileSync("C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\SettingsScreen.js", "utf-8");
if (!ss.includes("dailyGoal")) {
  // Add daily goal setting after exam date section
  ss = ss.replace("</ScrollView>",
    '      <View style={[styles.card, shadows.md]}>\n        <Text style={styles.sectionTitle}>\u2600\ufe0f \u6bcf\u65e5\u5b66\u4e60\u76ee\u6807</Text>\n        <View style={styles.row}>\n          <Text style={styles.label}>\u6bcf\u5929\u5b66\u4e60\u76ee\u6807\uff08\u5206\u949f\uff09</Text>\n          <TextInput\n            style={styles.input}\n            keyboardType="number-pad"\n            defaultValue={String(dailyGoal)}\n            placeholder="\u4f8b\u5982\uff1a480"\n            onEndEditing={async (e) => {\n              const v = parseInt(e.nativeEvent.text) || 0;\n              setDailyGoal(v);\n              await store.setDailyGoal(v);\n              if (refreshAll) refreshAll();\n            }}\n          />\n        </View>\n        <Text style={{ ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm }}>\n          \u8bbe\u7f6e\u540e\u9996\u9875\u4f1a\u663e\u793a\u5b66\u4e60\u8fdb\u5ea6\u6761\uff0c\u5e2e\u52a9\u4f60\u5b8c\u6210\u6bcf\u65e5\u76ee\u6807
        </Text>\n      </View>\n    </ScrollView>');
  
  // Add dailyGoal state
  ss = ss.replace("const [examDate, setExamDate] = useState(null);",
    "const [examDate, setExamDate] = useState(null);\n  const [dailyGoal, setDailyGoal] = useState(0);");
  
  // Load dailyGoal
  ss = ss.replace("setExamDate(ed);\n    })();\n  }, []);",
    "setExamDate(ed);\n      const dg = await store.getDailyGoal();\n      if (dg) setDailyGoal(dg);\n    })();\n  }, []);");
  
  fs.writeFileSync("C:\\Users\\吴习凡\\Documents\\timer\\kaoyan-app\\src\\screens\\SettingsScreen.js", ss, "utf-8");
  console.log("Added daily goal to Settings");
}

console.log("Done! All enhancements applied.");