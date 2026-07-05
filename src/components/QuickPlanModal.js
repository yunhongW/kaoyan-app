import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as store from "../store";
import { colors, spacing, borderRadius, shadows, typography } from "../theme";

const MINUTE_PRESETS = [30, 60, 90, 120, 150, 180];

export default function QuickPlanModal({ visible, dateStr, subjects, onApply, onClose }) {
  const [plan, setPlan] = useState({});
  const [yesterdayPlan, setYesterdayPlan] = useState(null);
  const [template, setTemplate] = useState(null);

  useEffect(() => {
    if (visible) {
      // 初始化 plan：默认所有科目 0 分钟
      const init = {};
      subjects.forEach((s) => { init[s] = 0; });
      setPlan(init);
      // 加载昨天的计划和模板
      (async () => {
        const d = new Date(dateStr + "T00:00:00");
        d.setDate(d.getDate() - 1);
        const yKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const yp = await store.getDayPlan(yKey);
        setYesterdayPlan(Object.keys(yp).length > 0 ? yp : null);
        const tp = await store.getDailyTemplate();
        setTemplate(Object.keys(tp).length > 0 ? tp : null);
      })();
    }
  }, [visible, dateStr]);

  const toggleSubject = (s) => {
    setPlan((prev) => {
      const next = { ...prev };
      if (next[s] > 0) {
        next[s] = 0; // 取消勾选
      } else {
        next[s] = 60; // 默认 60 分钟
      }
      return next;
    });
  };

  const setMinutes = (s, mins) => {
    setPlan((prev) => ({ ...prev, [s]: Math.max(0, Math.round(mins)) }));
  };

  const applyPlan = (source) => {
    setPlan((prev) => {
      const merged = { ...prev };
      Object.keys(source).forEach((s) => {
        merged[s] = source[s];
      });
      return merged;
    });
  };

  const handleApply = async () => {
    const filtered = {};
    Object.keys(plan).forEach((s) => {
      if (plan[s] > 0) filtered[s] = plan[s];
    });
    if (Object.keys(filtered).length === 0) {
      onClose();
      return;
    }
    await store.applyDayPlan(dateStr, filtered);
    onClose();
    if (onApply) onApply();
  };

  const handleSaveTemplate = async () => {
    const filtered = {};
    Object.keys(plan).forEach((s) => {
      if (plan[s] > 0) filtered[s] = plan[s];
    });
    if (Object.keys(filtered).length === 0) return;
    await store.saveDailyTemplate(filtered);
    setTemplate(filtered);
  };

  const activeCount = Object.values(plan).filter((m) => m > 0).length;
  const totalMins = Object.values(plan).reduce((s, m) => s + m, 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, shadows.lg]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>快速规划</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 450 }} contentContainerStyle={{ padding: spacing.xl }}>
            {/* 快捷操作栏 */}
            <View style={styles.quickOps}>
              {yesterdayPlan && (
                <TouchableOpacity style={styles.opBtn} onPress={() => applyPlan(yesterdayPlan)}>
                  <Ionicons name="copy-outline" size={14} color={colors.primary} />
                  <Text style={styles.opBtnText}>复制昨天</Text>
                </TouchableOpacity>
              )}
              {template && (
                <TouchableOpacity style={styles.opBtn} onPress={() => applyPlan(template)}>
                  <Ionicons name="bookmark" size={14} color={colors.accent} />
                  <Text style={[styles.opBtnText, { color: colors.accent }]}>应用模板</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 科目列表 */}
            {subjects.map((s) => (
              <View key={s} style={styles.subjRow}>
                <TouchableOpacity
                  style={styles.subjCheck}
                  onPress={() => toggleSubject(s)}
                >
                  <Ionicons
                    name={plan[s] > 0 ? "checkbox" : "square-outline"}
                    size={20}
                    color={plan[s] > 0 ? colors.primary : colors.textTertiary}
                  />
                  <Text style={[styles.subjName, plan[s] > 0 && { color: colors.text, fontWeight: "600" }]}>
                    {s}
                  </Text>
                </TouchableOpacity>

                {plan[s] > 0 && (
                  <View style={styles.minRow}>
                    <TouchableOpacity
                      style={styles.minBtn}
                      onPress={() => setMinutes(s, Math.max(0, plan[s] - 10))}
                    >
                      <Ionicons name="remove" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.minInput}
                      keyboardType="number-pad"
                      value={String(plan[s])}
                      onChangeText={(t) => setMinutes(s, parseInt(t) || 0)}
                      selectTextOnFocus
                    />
                    <TouchableOpacity
                      style={styles.minBtn}
                      onPress={() => setMinutes(s, plan[s] + 10)}
                    >
                      <Ionicons name="add" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.minUnit}>分</Text>
                    {/* 快捷预设 */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: spacing.xs }}>
                      {MINUTE_PRESETS.map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[styles.preset, plan[s] === m && styles.presetActive]}
                          onPress={() => setMinutes(s, m)}
                        >
                          <Text style={[styles.presetText, plan[s] === m && { color: colors.primary, fontWeight: "700" }]}>
                            {m >= 60 ? Math.floor(m / 60) + "h" : m + "m"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            ))}

            {/* 底部总结 */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>
                {activeCount} 科 · 共 {totalMins} 分钟
                {totalMins >= 60 ? ` (${Math.floor(totalMins / 60)}h${totalMins % 60 > 0 ? totalMins % 60 + "m" : ""})` : ""}
              </Text>
            </View>

            {/* 按钮 */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.saveTemplateBtn} onPress={handleSaveTemplate}>
                <Ionicons name="bookmark-outline" size={16} color={colors.accent} />
                <Text style={styles.saveTemplateText}>保存为模板</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyBtn, activeCount === 0 && { opacity: 0.4 }]}
                onPress={handleApply}
                disabled={activeCount === 0}
              >
                <Text style={styles.applyBtnText}>一键应用</Text>
              </TouchableOpacity>
            </View>
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
    maxHeight: "90%", paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  modalTitle: { ...typography.h3, color: colors.text },

  quickOps: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  opBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.bg,
  },
  opBtnText: { fontSize: 12, fontWeight: "600", color: colors.primary },

  subjRow: {
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    paddingVertical: spacing.sm,
  },
  subjCheck: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  subjName: { ...typography.body, color: colors.textTertiary },

  minRow: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginLeft: 28, marginTop: spacing.sm, marginBottom: spacing.xs,
  },
  minBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.bg,
  },
  minInput: {
    width: 44, height: 32, textAlign: "center",
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.sm,
    ...typography.bodyBold, color: colors.text, padding: 0,
    backgroundColor: colors.card,
  },
  minUnit: { ...typography.tiny, color: colors.textSecondary },
  preset: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: borderRadius.sm, backgroundColor: colors.bg,
    marginLeft: 3,
  },
  presetActive: { backgroundColor: colors.primaryBg },
  presetText: { fontSize: 11, color: colors.textTertiary },

  summaryRow: {
    flexDirection: "row", justifyContent: "center",
    paddingVertical: spacing.md, marginTop: spacing.md,
    backgroundColor: colors.primaryBg, borderRadius: borderRadius.md,
  },
  summaryText: { ...typography.bodyBold, color: colors.primary },

  btnRow: {
    flexDirection: "row", gap: spacing.md, marginTop: spacing.lg,
  },
  saveTemplateBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs,
    borderWidth: 1, borderColor: colors.accent, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, backgroundColor: colors.accentLight,
  },
  saveTemplateText: { ...typography.body, color: colors.accent, fontWeight: "600" },
  applyBtn: {
    flex: 2, backgroundColor: colors.primary, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: "center",
  },
  applyBtnText: { ...typography.bodyBold, color: colors.textInverse },
});
