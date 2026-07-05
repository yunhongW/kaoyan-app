import React, { useState } from "react";
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as store from "../store";
import { colors, spacing, borderRadius, shadows, typography } from "../theme";

export default function MilestoneForm({ visible, onClose, onCreated, subjects }) {
  const [title, setTitle] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || "");
  const [targetDate, setTargetDate] = useState("");
  const [totalMinutes, setTotalMinutes] = useState("");
  const [showDateHint, setShowDateHint] = useState(false);

  const presetMinutes = [600, 1200, 1800, 3000, 6000]; // 10h, 20h, 30h, 50h, 100h

  const handleSave = async () => {
    if (!title.trim() || !selectedSubject || !targetDate.trim() || !totalMinutes) return;
    await store.addMilestone({
      title: title.trim(),
      subject: selectedSubject,
      targetDate: targetDate.trim(),
      totalMinutes: parseInt(totalMinutes),
    });
    setTitle("");
    setTargetDate("");
    setTotalMinutes("");
    onClose();
    if (onCreated) onCreated();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, shadows.lg]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>添加学习里程碑</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
            {/* Title */}
            <Text style={styles.label}>目标名称</Text>
            <TextInput
              style={styles.input}
              placeholder="例如：完成高数第一轮复习"
              value={title}
              onChangeText={setTitle}
              maxLength={50}
            />

            {/* Subject */}
            <Text style={styles.label}>科目</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
              {subjects.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.subjectChip, selectedSubject === s && styles.subjectChipActive]}
                  onPress={() => setSelectedSubject(s)}
                >
                  <Text style={[styles.subjectChipText, selectedSubject === s && { color: "#fff" }]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Target date */}
            <Text style={styles.label}>目标日期</Text>
            <TouchableOpacity onPress={() => setShowDateHint(!showDateHint)}>
              <TextInput
                style={styles.input}
                placeholder="2026-08-15"
                value={targetDate}
                onChangeText={setTargetDate}
                maxLength={10}
                keyboardType="numbers-and-punctuation"
              />
            </TouchableOpacity>
            {showDateHint && (
              <Text style={styles.hint}>格式：YYYY-MM-DD，如 2026-08-15</Text>
            )}

            {/* Total minutes */}
            <Text style={styles.label}>预估总学习时长（分钟）</Text>
            <TextInput
              style={styles.input}
              placeholder="例如：3000（即 50 小时）"
              value={totalMinutes}
              onChangeText={setTotalMinutes}
              keyboardType="number-pad"
            />
            <View style={styles.presets}>
              {presetMinutes.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={styles.presetChip}
                  onPress={() => setTotalMinutes(String(m))}
                >
                  <Text style={styles.presetText}>{Math.round(m / 60)}h</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview */}
            {title && targetDate && totalMinutes && (
              <View style={styles.preview}>
                <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
                <Text style={styles.previewText}>
                  目标"{title}"将在 {targetDate} 前完成，共需约 {Math.round(parseInt(totalMinutes) / 60)} 小时。{'\n'}
                  系统会根据你每天的{selectedSubject}学习时长自动追踪进度，并给出每日建议学习量。
                </Text>
              </View>
            )}

            {/* Save button */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>创建里程碑</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modal: {
    backgroundColor: colors.card, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl,
    maxHeight: "85%", paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  modalTitle: { ...typography.h3, color: colors.text },
  label: { ...typography.small, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...typography.body, backgroundColor: colors.bg, marginBottom: spacing.sm,
  },
  hint: { ...typography.tiny, color: colors.textTertiary, marginBottom: spacing.sm },
  subjectChip: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: borderRadius.md, marginRight: spacing.sm,
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
  },
  subjectChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  subjectChipText: { ...typography.small, color: colors.text },
  presets: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  presetChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm, backgroundColor: colors.primaryBg,
  },
  presetText: { ...typography.tiny, color: colors.primary, fontWeight: "600" },
  preview: {
    flexDirection: "row", gap: spacing.sm, backgroundColor: colors.accentLight,
    borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  previewText: { flex: 1, ...typography.caption, color: colors.accentDark, lineHeight: 20 },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: "center",
  },
  saveBtnText: { ...typography.bodyBold, color: colors.textInverse },
});
