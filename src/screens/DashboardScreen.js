import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import * as store from "../store";
import { fmtDate } from "../utils";
import { colors, spacing, borderRadius, shadows, typography } from "../theme";
import AnimatedBar from "../components/AnimatedBar";
import ProgressRing from "../components/ProgressRing";
import ReviewManager from "../components/ReviewManager";
import MilestoneForm from "../components/MilestoneForm";
import useDailyData from "../hooks/useDailyData";

export default function DashboardScreen() {
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dateStr = fmtDate(today);

  const { subjects, summary, refresh: refreshDaily } = useDailyData(dateStr);
  const [examDaysLeft, setExamDaysLeft] = useState(null);
  const [dailyTarget, setDailyTarget] = useState(0);
  const [allReviewProgress, setAllReviewProgress] = useState({});
  const [milestones, setMilestones] = useState([]);
  const [dailyNote, setDailyNote] = useState("");
  const [focusScore, setFocusScore] = useState(0);
  const [currentMood, setCurrentMood] = useState("");

  // Modals
  const [reviewVisible, setReviewVisible] = useState(false);
  const [milestoneFormVisible, setMilestoneFormVisible] = useState(false);

  const loadAll = useCallback(async () => {
    const days = await store.getDaysUntilExam();
    setExamDaysLeft(days);
    const s = await store.getSettings();
    if (s.dailyTarget) setDailyTarget(s.dailyTarget);
    await store.recalculateMilestones();
    const ms = await store.getMilestones();
    setMilestones(ms.filter((m) => m.completedMinutes < m.totalMinutes));
    const prog = await store.getAllReviewProgress();
    setAllReviewProgress(prog);
    const note = await store.getDailyNote(dateStr);
    setDailyNote(note);
    const fs = await store.getFocusScore(dateStr);
    setFocusScore(fs);
    const md = await store.getMood(dateStr);
    if (md) setCurrentMood(md.mood);
  }, [dateStr]);

  useEffect(() => { if (isFocused) { refreshDaily(); loadAll(); } }, [isFocused]);

  const handleMoodQuick = async (mood) => {
    setCurrentMood(mood);
    await store.setMood(dateStr, mood, "");
  };

  const examPct = examDaysLeft !== null ? Math.round((365 - examDaysLeft) / 365 * 100) : 0;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ===== 倒计时头部 ===== */}
        <View style={[styles.countdownCard, shadows.md]}>
          <View style={styles.countdownRow}>
            <View>
              <Text style={styles.countdownLabel}>距离考研</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                <Text style={styles.countdownNum}>{examDaysLeft !== null ? examDaysLeft : "--"}</Text>
                <Text style={styles.countdownUnit}>天</Text>
              </View>
            </View>
            <ProgressRing pct={examPct} size={64} strokeWidth={6} color={colors.accent} />
          </View>
          <View style={styles.countdownBarBg}>
            <View style={[styles.countdownBarFill, { width: `${examPct}%` }]} />
          </View>
          <Text style={styles.countdownSub}>
            {examDaysLeft !== null && examDaysLeft > 0
              ? `已过去 ${examPct}%，还剩 ${Math.floor(examDaysLeft / 7)} 周 ${examDaysLeft % 7} 天`
              : "请先在设置中设置考研日期"}
          </Text>
        </View>

        {/* ===== 今日进度卡 ===== */}
        <View style={[styles.card, shadows.md]}>
          <Text style={styles.cardTitle}>今日学习进度</Text>
          {dailyTarget > 0 && (
            <View style={styles.targetRow}>
              <Text style={styles.targetLabel}>目标 {dailyTarget} 分钟</Text>
              <View style={styles.targetBarBg}>
                <View style={[styles.targetBar, {
                  width: `${Math.min(100, Math.round(summary.actual / dailyTarget * 100))}%`,
                  backgroundColor: summary.actual >= dailyTarget ? colors.accent : colors.primary,
                }]} />
              </View>
              <Text style={styles.targetPct}>{Math.min(100, Math.round(summary.actual / dailyTarget * 100))}%</Text>
            </View>
          )}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{summary.planned}</Text>
              <Text style={styles.statLabel}>计划(分)</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{summary.actual}</Text>
              <Text style={styles.statLabel}>已学(分)</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: focusScore >= 80 ? colors.accent : colors.primary }]}>{focusScore}</Text>
              <Text style={styles.statLabel}>专注度</Text>
            </View>
          </View>
          {subjects.filter((s) => summary.total > 0).length > 0 && (
            <AnimatedBar pct={Math.min(100, summary.pct)} height={6} color={summary.pct >= 100 ? colors.accent : colors.primary} />
          )}
        </View>

        {/* ===== 复习进度 ===== */}
        <View style={[styles.card, shadows.md]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>复习进度追踪</Text>
            <TouchableOpacity onPress={() => setReviewVisible(true)}>
              <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>管理</Text>
            </TouchableOpacity>
          </View>
          {Object.keys(allReviewProgress).length === 0 ? (
            <Text style={styles.emptyHint}>还没有复习计划，点击"管理"开始添加</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
              {Object.entries(allReviewProgress).map(([subj, prog]) => {
                if (prog.totalChapters === 0) return null;
                return (
                  <TouchableOpacity
                    key={subj}
                    style={styles.reviewCard}
                    onPress={() => setReviewVisible(true)}
                  >
                    <ProgressRing pct={prog.pct} size={50} strokeWidth={4} color={colors.primary} />
                    <Text style={styles.reviewSubject}>{subj}</Text>
                    <Text style={styles.reviewDetail}>{prog.completedChapters}/{prog.totalChapters} 章</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ===== 活跃里程碑 ===== */}
        <View style={[styles.card, shadows.md]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>学习里程碑</Text>
            <TouchableOpacity onPress={() => setMilestoneFormVisible(true)}>
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {milestones.length === 0 ? (
            <Text style={styles.emptyHint}>还没有里程碑，点击 + 创建一个</Text>
          ) : (
            milestones.map((ms) => {
              const pct = ms.totalMinutes > 0 ? Math.min(100, Math.round(ms.completedMinutes / ms.totalMinutes * 100)) : 0;
              const onTrack = ms.completedMinutes >= (ms.totalMinutes * (ms.dailyTarget > 0 ? 0.5 : 0));
              return (
                <View key={ms.id} style={styles.msCard}>
                  <View style={styles.msHeader}>
                    <Text style={styles.msTitle}>{ms.title}</Text>
                    <View style={[styles.msTag, { backgroundColor: onTrack ? colors.successBg : colors.warningBg }]}>
                      <Text style={[styles.msTagText, { color: onTrack ? colors.success : colors.warning }]}>
                        {onTrack ? "正常" : "落后"}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <Text style={styles.msSubject}>{ms.subject}</Text>
                    <Text style={styles.msDate}>目标 {ms.targetDate}</Text>
                  </View>
                  <View style={styles.msBarRow}>
                    <View style={styles.msBarBg}>
                      <View style={[styles.msBarFill, { width: `${pct}%`, backgroundColor: onTrack ? colors.success : colors.warning }]} />
                    </View>
                    <Text style={styles.msBarText}>{pct}%</Text>
                  </View>
                  <Text style={styles.msSuggestion}>
                    今日建议：{ms.dailyTarget} 分钟 · 已学 {ms.completedMinutes}/{ms.totalMinutes} 分
                  </Text>
                  <TouchableOpacity
                    style={{ position: "absolute", top: 8, right: 8 }}
                    onPress={async () => {
                      await store.deleteMilestone(ms.id);
                      setMilestones((prev) => prev.filter((m) => m.id !== ms.id));
                    }}
                  >
                    <Ionicons name="close" size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* ===== 快捷操作 ===== */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate("学习")}>
            <View style={[styles.quickIcon, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="play" size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickText}>开始学习</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => setMilestoneFormVisible(true)}>
            <View style={[styles.quickIcon, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="flag" size={22} color={colors.accent} />
            </View>
            <Text style={styles.quickText}>添加目标</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => setReviewVisible(true)}>
            <View style={[styles.quickIcon, { backgroundColor: colors.successBg }]}>
              <Ionicons name="checkbox" size={22} color={colors.success} />
            </View>
            <Text style={styles.quickText}>复习打卡</Text>
          </TouchableOpacity>
        </View>

        {/* ===== 心情快捷打卡 ===== */}
        <View style={[styles.card, shadows.md]}>
          <Text style={styles.cardTitle}>今日心情</Text>
          <View style={styles.moodRow}>
            {[
              { emoji: "\u{1F929}", key: "great", label: "超棒" },
              { emoji: "\u{1F60A}", key: "good", label: "不错" },
              { emoji: "\u{1F914}", key: "okay", label: "还行" },
              { emoji: "\u{1F61E}", key: "bad", label: "不好" },
              { emoji: "\u{1F4AA}", key: "tired", label: "累了" },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.moodBtn, currentMood === item.key && styles.moodBtnActive]}
                onPress={() => handleMoodQuick(item.key)}
              >
                <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
                <Text style={[styles.moodLabel, currentMood === item.key && { color: colors.accent }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ===== 每日笔记 ===== */}
        <View style={[styles.card, shadows.md]}>
          <Text style={styles.cardTitle}>今日笔记</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="今天有什么想记录的吗？"
            value={dailyNote}
            onChangeText={setDailyNote}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            onBlur={() => { if (dailyNote.trim()) store.setDailyNote(dateStr, dailyNote); }}
            onSubmitEditing={() => { if (dailyNote.trim()) store.setDailyNote(dateStr, dailyNote); }}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modals */}
      <ReviewManager visible={reviewVisible} onClose={() => { setReviewVisible(false); loadAll(); }} />
      <MilestoneForm
        visible={milestoneFormVisible}
        subjects={subjects}
        onClose={() => setMilestoneFormVisible(false)}
        onCreated={loadAll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingTop: Platform.OS === "ios" ? 50 : spacing.lg },

  // Countdown
  countdownCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  countdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  countdownLabel: { ...typography.caption, color: colors.textSecondary },
  countdownNum: { fontSize: 42, fontWeight: "800", color: colors.accent },
  countdownUnit: { ...typography.h3, color: colors.accent },
  countdownBarBg: { height: 6, backgroundColor: colors.barBg, borderRadius: 3, overflow: "hidden", marginBottom: spacing.sm },
  countdownBarFill: { height: "100%", backgroundColor: colors.accent, borderRadius: 3 },
  countdownSub: { ...typography.tiny, color: colors.textTertiary, textAlign: "center" },

  // Card
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  cardTitle: { ...typography.h3, color: colors.text },

  // Target bar
  targetRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  targetLabel: { ...typography.tiny, color: colors.textSecondary, minWidth: 90 },
  targetBarBg: { flex: 1, height: 6, backgroundColor: colors.barBg, borderRadius: 3, overflow: "hidden" },
  targetBar: { height: "100%", borderRadius: 3 },
  targetPct: { ...typography.small, fontWeight: "700", color: colors.primary, minWidth: 36, textAlign: "right" },

  // Stats
  statsRow: { flexDirection: "row", marginTop: spacing.md },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { ...typography.h2, color: colors.text },
  statLabel: { ...typography.tiny, color: colors.textSecondary, marginTop: 2 },

  // Review
  emptyHint: { ...typography.caption, color: colors.textTertiary, textAlign: "center", paddingTop: spacing.md },
  reviewCard: {
    alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    marginRight: spacing.md,
  },
  reviewSubject: { ...typography.small, fontWeight: "600", color: colors.text, marginTop: spacing.xs },
  reviewDetail: { ...typography.tiny, color: colors.textSecondary },

  // Milestones
  msCard: {
    backgroundColor: colors.bg, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  msHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  msTitle: { ...typography.body, fontWeight: "600", color: colors.text, flex: 1, marginRight: 24 },
  msTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  msTagText: { fontSize: 10, fontWeight: "600" },
  msSubject: { ...typography.tiny, color: colors.primary, fontWeight: "600", backgroundColor: colors.primaryBg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  msDate: { ...typography.tiny, color: colors.textTertiary },
  msBarRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  msBarBg: { flex: 1, height: 5, backgroundColor: colors.barBg, borderRadius: 3, overflow: "hidden" },
  msBarFill: { height: "100%", borderRadius: 3 },
  msBarText: { ...typography.tiny, fontWeight: "700", color: colors.textSecondary, minWidth: 32, textAlign: "right" },
  msSuggestion: { ...typography.tiny, color: colors.accentDark, marginTop: spacing.xs },

  // Quick actions
  quickRow: { flexDirection: "row", marginBottom: spacing.lg, gap: spacing.md },
  quickBtn: {
    flex: 1, alignItems: "center", backgroundColor: colors.card,
    borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  quickText: { ...typography.small, color: colors.text, fontWeight: "600" },

  // Mood
  moodRow: { flexDirection: "row", justifyContent: "space-around" },
  moodBtn: { alignItems: "center", padding: spacing.sm, borderRadius: borderRadius.md },
  moodBtnActive: { backgroundColor: colors.accentLight },
  moodLabel: { ...typography.tiny, color: colors.textTertiary, marginTop: 2 },

  // Note
  noteInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...typography.body, backgroundColor: colors.bg, minHeight: 80,
  },
});
