import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as store from "../store";
import { colors, spacing, borderRadius, shadows, typography } from "../theme";

export default function SettingsScreen({ refreshAll }) {
  const [subjects, setSubjects] = useState([]);
  const [newName, setNewName] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [examDate, setExamDateState] = useState("");
  const [showExamDateInput, setShowExamDateInput] = useState(false);
  const [examDateInput, setExamDateInput] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setSubjects(await store.getSubjects());
    const ed = await store.getExamDate();
    if (ed) setExamDateState(ed);
  }

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const ok = await store.addSubject(newName);
    if (ok) { setNewName(""); setShowAdd(false); load(); if (refreshAll) refreshAll(); }
    else Alert.alert("提示", "科目已存在或名称无效");
  };

  const handleRemove = (name) => {
    Alert.alert("删除科目", `确定要删除"${name}"吗？\n相关的学习记录也会被清除。`, [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: async () => { await store.removeSubject(name); load(); if (refreshAll) refreshAll(); } },
    ]);
  };

  const handleExport = async () => {
    try {
      const json = await store.exportJSON();
      const { shareAsync } = require("expo-file-system");
      const { writeAsStringAsync, documentDirectory } = require("expo-file-system");
      const path = documentDirectory + "kaoyan_backup.json";
      await writeAsStringAsync(path, json);
      await shareAsync(path);
    } catch (_) {
      Alert.alert("导出", "数据已准备好，请使用文件分享功能。");
    }
  };

  const handleClear = () => {
    Alert.alert("清除所有数据", "此操作不可撤销！确定要清除所有学习记录吗？", [
      { text: "取消", style: "cancel" },
      { text: "清除", style: "destructive", onPress: async () => { await store.clearAll(); load(); if (refreshAll) refreshAll(); } },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>⚙️ 设置</Text>

      {/* 科目管理 */}
      <View style={[styles.card, shadows.md]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>管理科目</Text>
          <TouchableOpacity style={styles.addIconBtn} onPress={() => setShowAdd(!showAdd)}>
            <Ionicons name={showAdd ? "close" : "add"} size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {showAdd && (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="新科目名称"
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={handleAdd}
              maxLength={20}
              returnKeyType="done"
              autoFocus
            />
            <TouchableOpacity style={styles.confirmBtn} onPress={handleAdd}>
              <Text style={styles.confirmBtnText}>添加</Text>
            </TouchableOpacity>
          </View>
        )}

        {subjects.map((s, i) => (
          <View key={s} style={[styles.subjectItem, i === subjects.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={styles.subjectLeft}>
              <View style={[styles.subjectDot, { backgroundColor: colors.subjectColors?.[i % 8] || colors.primary }]} />
              <Text style={styles.subjectName}>{s}</Text>
            </View>
            <TouchableOpacity onPress={() => handleRemove(s)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        ))}
      </View>


      {/* 考研目标 */}
      <View style={[styles.card, shadows.md]}>
        <Text style={styles.cardTitle}>🎯 考研目标</Text>
        {examDate ? (
          <View style={styles.examDateRow}>
            <View>
              <Text style={styles.examDateLabel}>考研日期</Text>
              <Text style={styles.examDateValue}>{examDate}</Text>
            </View>
            <TouchableOpacity onPress={() => { setExamDateInput(examDate); setShowExamDateInput(true); }}>
              <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>修改</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={{ ...typography.caption, marginBottom: 8 }}>设置考研日期，首页将显示倒计时</Text>
            <TouchableOpacity style={styles.setDateBtn} onPress={() => { setExamDateInput(""); setShowExamDateInput(true); }}>
              <Text style={styles.setDateBtnText}>设置考研日期</Text>
            </TouchableOpacity>
          </View>
        )}
        {showExamDateInput && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ ...typography.tiny, color: colors.textSecondary, marginBottom: 4 }}>格式：2026-12-19</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="2026-12-19"
                value={examDateInput}
                onChangeText={setExamDateInput}
                maxLength={10}
              />
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={async () => {
                  if (examDateInput.trim()) {
                    await store.setExamDate(examDateInput.trim());
                    setExamDateState(examDateInput.trim());
                    setShowExamDateInput(false);
                  }
                }}
              >
                <Text style={styles.confirmBtnText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>


      {/* 每日学习目标 */}
      <View style={[styles.card, shadows.md]}>
        <Text style={styles.cardTitle}>每日学习目标</Text>
        <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: 8 }}>
          设置每天的总学习时长目标，首页会显示完成进度
        </Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TextInput
            style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, backgroundColor: colors.bg }}
            placeholder="例如：480（即8小时）"
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={async (e) => {
              const val = parseInt(e.nativeEvent.text) || 0;
              await store.updateSettings({ dailyTarget: val });
              Alert.alert("已设置", "每日学习目标已更新为 " + val + " 分钟");
            }}
          />
          <Text style={{ ...typography.body, color: colors.textSecondary }}>分钟/天</Text>
        </View>
      </View>
      {/* 数据管理 */}
      <View style={[styles.card, shadows.md]}>
        <Text style={styles.cardTitle}>数据管理</Text>
        <View style={styles.dataBtns}>
          <TouchableOpacity style={styles.dataBtn} onPress={handleExport}>
            <Ionicons name="download-outline" size={20} color={colors.primary} />
            <Text style={styles.dataBtnText}>导出备份</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dataBtn} onPress={() => Alert.alert("导入", '请通过文件 App 导入 JSON 备份文件。')}>
            <Ionicons name="folder-open-outline" size={20} color={colors.primary} />
            <Text style={styles.dataBtnText}>导入备份</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Ionicons name="warning-outline" size={16} color={colors.danger} />
          <Text style={styles.clearBtnText}>清除所有数据</Text>
        </TouchableOpacity>
      </View>

      {/* 关于 */}
      <View style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>📚 考研学习计时器</Text>
        <Text style={styles.aboutVer}>版本 1.0.0</Text>
        <Text style={styles.aboutDesc}>每天进步一点点，考研上岸不是梦 🌟</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  pageTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  cardTitle: { ...typography.h3, color: colors.text },
  addIconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primaryBg, alignItems: "center", justifyContent: "center",
  },
  inputRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, ...typography.body,
    backgroundColor: colors.bg,
  },
  confirmBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl, justifyContent: "center",
  },
  confirmBtnText: { ...typography.bodyBold, color: colors.textInverse },
  subjectItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  subjectLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  subjectDot: { width: 8, height: 8, borderRadius: 4 },
  subjectName: { ...typography.body, color: colors.text, fontWeight: "500" },
  examDateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  examDateLabel: { ...typography.caption, color: colors.textSecondary },
  examDateValue: { ...typography.h3, color: colors.accent, marginTop: 2 },
  setDateBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: 8, alignItems: "center", backgroundColor: colors.primaryBg },
  setDateBtnText: { color: colors.primary, fontWeight: "600", fontSize: 13 },

  deleteBtn: { padding: spacing.sm },
  dataBtns: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  dataBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, backgroundColor: colors.bg,
  },
  dataBtnText: { ...typography.small, color: colors.text, fontWeight: "600" },
  clearBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    borderWidth: 1, borderColor: colors.dangerBg, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, backgroundColor: colors.dangerBg,
  },
  clearBtnText: { ...typography.small, color: colors.danger, fontWeight: "600" },
  aboutCard: { alignItems: "center", paddingVertical: spacing.xxl },
  aboutTitle: { ...typography.h3, color: colors.textSecondary },
  aboutVer: { ...typography.caption, color: colors.textTertiary, marginTop: 4 },
  aboutDesc: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm },
});
