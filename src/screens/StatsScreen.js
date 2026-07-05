import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from "react-native";
import * as store from "../store";
import { fmtDate, weekDays } from "../utils";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, shadows, typography } from "../theme";
import ExamScoreTrend from "../components/ExamScoreTrend";
import { useIsFocused } from "@react-navigation/native";

// ===== 周柱状图 =====
function WeeklyChart({ refreshKey }) {
  const [data, setData] = useState([]);
  useEffect(() => {
    (async () => {
      const t = new Date(); const dow = t.getDay();
      const mon = new Date(t); mon.setDate(t.getDate() - ((dow + 6) % 7));
      const arr = []; let mx = 1;
      for (let i = 0; i < 7; i++) {
        const d = new Date(mon); d.setDate(mon.getDate() + i);
        const m = await store.totalActual(fmtDate(d));
        arr.push(m); if (m > mx) mx = m;
      }
      setData(arr.map((v) => ({ val: v, pct: (v / mx) * 100 })));
    })();
  }, [refreshKey]);

  const total = data.reduce((s, d) => s + d.val, 0);
  const avg = data.length > 0 ? Math.round(total / data.length) : 0;

  return (
    <View>
      <View style={wc.summary}>
        <View style={wc.summaryItem}>
          <Text style={wc.summaryNum}>{total}</Text>
          <Text style={wc.summaryLabel}>本周总学习(分)</Text>
        </View>
        <View style={wc.summaryDivider} />
        <View style={wc.summaryItem}>
          <Text style={wc.summaryNum}>{avg}</Text>
          <Text style={wc.summaryLabel}>日均(分)</Text>
        </View>
      </View>
      <View style={wc.chart}>
        {data.map((d, i) => {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const dayDate = new Date(); dayDate.setDate(dayDate.getDate() - ((dayDate.getDay() + 6) % 7) + i);
          const isToday = fmtDate(dayDate) === fmtDate(today);
          return (
            <View key={i} style={wc.barWrap}>
              <Text style={wc.barVal}>{d.val > 0 ? d.val : ""}</Text>
              <View
                style={[
                  wc.bar,
                  {
                    height: `${Math.max(3, d.pct)}%`,
                    backgroundColor: d.val > 0
                      ? isToday ? colors.accent : colors.primary
                      : colors.barBg,
                  },
                ]}
              />
              <Text style={[wc.barLabel, isToday && { color: colors.accent, fontWeight: "700" }]}>
                {weekDays[i]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
const wc = StyleSheet.create({
  summary: {
    flexDirection: "row", backgroundColor: colors.bg, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryNum: { ...typography.h2, color: colors.text },
  summaryLabel: { ...typography.tiny, color: colors.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: colors.borderLight },
  chart: { flexDirection: "row", alignItems: "flex-end", height: 130, gap: 4 },
  barWrap: { flex: 1, alignItems: "center", height: "100%", justifyContent: "flex-end" },
  bar: { width: "100%", maxWidth: 28, borderRadius: 4, minHeight: 3 },
  barVal: { fontSize: 9, color: colors.textTertiary, marginBottom: 3 },
  barLabel: { ...typography.tiny, color: colors.textSecondary, marginTop: 4 },
});

// ===== 科目分布图 =====
function SubjectChart({ refreshKey }) {
  const [segments, setSegments] = useState([]);
  const palette = ["#6b8f6e","#d4a853","#8faf8f","#c4956a","#7a9e7e","#b8a070"];

  useEffect(() => {
    (async () => {
      const totals = await store.getSubjectTotals();
      const entries = Object.entries(totals).filter(([, v]) => v > 0);
      const total = entries.reduce((s, [, v]) => s + v, 0);
      setSegments(entries.map(([s, v], i) => ({
        name: s, val: v,
        pct: total > 0 ? Math.round((v / total) * 100) : 0,
        color: palette[i % palette.length],
      })));
    })();
  }, [refreshKey]);

  if (segments.length === 0) {
    return <Text style={{ textAlign: "center", color: colors.textTertiary, padding: 30 }}>暂无学习数据</Text>;
  }

  return (
    <View>
      <View style={sc.barRow}>
        {segments.map((s, i) => (
          <View key={s.name} style={[sc.seg, { flex: Math.max(1, s.pct), backgroundColor: s.color }]} />
        ))}
      </View>
      {segments.map((s) => (
        <View key={s.name} style={sc.item}>
          <View style={sc.itemLeft}>
            <View style={[sc.dot, { backgroundColor: s.color }]} />
            <Text style={sc.itemName}>{s.name}</Text>
          </View>
          <View style={sc.itemRight}>
            <View style={sc.itemBarBg}>
              <View style={[sc.itemBar, { width: `${s.pct}%`, backgroundColor: s.color }]} />
            </View>
            <Text style={sc.itemVal}>{s.val}分</Text>
            <Text style={sc.itemPct}>{s.pct}%</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
const sc = StyleSheet.create({
  barRow: { flexDirection: "row", height: 24, borderRadius: 6, overflow: "hidden", marginBottom: spacing.lg },
  seg: { minWidth: 4 },
  item: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  itemName: { ...typography.body, color: colors.text, fontWeight: "500" },
  itemRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 2 },
  itemBarBg: { flex: 1, height: 6, backgroundColor: colors.barBg, borderRadius: 3, overflow: "hidden" },
  itemBar: { height: "100%", borderRadius: 3 },
  itemVal: { ...typography.small, fontWeight: "600", color: colors.text, minWidth: 40, textAlign: "right" },
  itemPct: { ...typography.tiny, color: colors.textSecondary, minWidth: 32, textAlign: "right" },
});

// ===== 连续学习徽章 =====
function StreakBadge({ streak }) {
  const getMessage = (n) => {
    if (n === 0) return "今天还没开始学习哦";
    if (n < 3) return "好的开始！继续坚持 💪";
    if (n < 7) return "不错哦，保持节奏！🔥";
    if (n < 14) return "自律使人自由！⭐";
    if (n < 30) return "太强了，你已经形成了习惯！🌟";
    return "考研王者！你是真正的猛士！👑";
  };
  return (
    <View style={sb.wrapper}>
      <View style={sb.badge}>
        <Text style={sb.flame}>🔥</Text>
        <Text style={sb.num}>{streak}</Text>
        <Text style={sb.label}>天连续学习</Text>
      </View>
      <Text style={sb.message}>{getMessage(streak)}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  wrapper: { alignItems: "center", paddingVertical: spacing.md },
  badge: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.accentLight, borderRadius: 20,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  flame: { fontSize: 24 },
  num: { ...typography.h1, fontSize: 28, color: colors.accentDark },
  label: { ...typography.body, color: colors.accentDark, fontWeight: "600" },
  message: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
});


// ===== 专注度评分 =====
function FocusScoreBar({ score }) {
  const getColor = (s) => {
    if (s >= 80) return colors.accent;
    if (s >= 50) return colors.primary;
    if (s >= 30) return colors.warning;
    return colors.textTertiary;
  };
  const getLabel = (s) => {
    if (s >= 80) return "超棒！保持状态";
    if (s >= 60) return "不错，继续加油";
    if (s >= 40) return "还可以再专注一些";
    if (s >= 20) return "今天状态一般哦";
    return "还没开始学习";
  };
  return (
    <View style={{ alignItems: "center", paddingVertical: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
        <Text style={{ fontSize: 36, fontWeight: "700", color: getColor(score) }}>{score}</Text>
        <Text style={{ ...typography.body, color: colors.textSecondary }}>/100</Text>
      </View>
      <Text style={{ ...typography.caption, color: getColor(score), marginTop: 4 }}>{getLabel(score)}</Text>
      <View style={{ width: "100%", height: 6, backgroundColor: colors.barBg, borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
        <View style={{ width: Math.min(100, score) + "%", height: "100%", backgroundColor: getColor(score), borderRadius: 3 }} />
      </View>
    </View>
  );
}

// ===== 周报总结 =====
function WeeklyReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await store.getWeeklyReport();
      setReport(r);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Text style={{ textAlign: "center", padding: 20, color: colors.textTertiary }}>加载中...</Text>;
  if (!report || report.totalMins === 0) return <Text style={{ textAlign: "center", padding: 20, color: colors.textTertiary }}>本周还没有学习数据</Text>;

  return (
    <View>
      <View style={{ flexDirection: "row", marginBottom: spacing.md, gap: spacing.sm }}>
        <View style={[wc.summary, { flex: 1 }]}>
          <Text style={wc.summaryNum}>{Math.round(report.totalMins / 60 * 10) / 10}h</Text>
          <Text style={wc.summaryLabel}>总学习</Text>
        </View>
        <View style={[wc.summary, { flex: 1 }]}>
          <Text style={wc.summaryNum}>{report.activeDays}天</Text>
          <Text style={wc.summaryLabel}>学习天数</Text>
        </View>
        <View style={[wc.summary, { flex: 1 }]}>
          <Text style={wc.summaryNum}>{report.activeDays > 0 ? Math.round(report.totalMins / report.activeDays) : 0}分</Text>
          <Text style={wc.summaryLabel}>日均</Text>
        </View>
      </View>

      {Object.keys(report.subjectTotals).length > 0 && (
        <View style={{ marginTop: spacing.sm }}>
          <Text style={{ ...typography.small, color: colors.textSecondary, marginBottom: spacing.sm, fontWeight: "600" }}>各科学习时间</Text>
          {Object.entries(report.subjectTotals).sort((a, b) => b[1] - a[1]).map(([name, mins]) => (
            <View key={name} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs }}>
              <Text style={{ ...typography.small, color: colors.text, minWidth: 60 }}>{name}</Text>
              <View style={{ flex: 1, height: 6, backgroundColor: colors.barBg, borderRadius: 3, overflow: "hidden" }}>
                <View style={{ width: (mins / Math.max(...Object.values(report.subjectTotals))) * 100 + "%", height: "100%", backgroundColor: colors.primary, borderRadius: 3 }} />
              </View>
              <Text style={{ ...typography.tiny, color: colors.textSecondary, minWidth: 40, textAlign: "right" }}>{mins}分</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ===== 成绩趋势 =====
function ExamScoreSection({ refreshKey }) {
  const [papers, setPapers] = useState([]);
  const [scoreTarget, setScoreTarget] = useState(70);

  useEffect(() => {
    (async () => {
      const p = await store.getExamPapers();
      setPapers(p.sort((a, b) => a.date.localeCompare(b.date)));
      const s = await store.getSettings();
      if (s.scoreTarget) setScoreTarget(s.scoreTarget);
    })();
  }, [refreshKey]);

  const handleDelete = async (id) => {
    await store.deleteExamPaper(id);
    setPapers((prev) => prev.filter((p) => p.id !== id));
  };

  return <ExamScoreTrend papers={papers} scoreTarget={scoreTarget} onDelete={handleDelete} />;
}
// ===== 主页面 =====
export default function StatsScreen() {
  const isFocused = useIsFocused();
  const [streak, setStreak] = useState(0);
  const [focusScore, setFocusScore] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => { if (isFocused) setRefreshKey(k => k + 1); }, [isFocused]);
  useEffect(() => { (async () => setStreak(await store.getStreak()))(); }, [refreshKey]);
  useEffect(() => {
    (async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      setFocusScore(await store.getFocusScore(fmtDate(today)));
    })();
  }, [refreshKey]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>📊 学习统计</Text>

      <View style={[styles.card, shadows.md]}>
        <Text style={styles.cardTitle}>本周趋势</Text>
        <WeeklyChart refreshKey={refreshKey} />
      </View>

      <View style={[styles.card, shadows.md]}>
        <Text style={styles.cardTitle}>科目分布</Text>
        <SubjectChart refreshKey={refreshKey} />
      </View>

      <View style={[styles.card, shadows.md]}>
        <Text style={styles.cardTitle}>专注度评分</Text>
        <FocusScoreBar score={focusScore} />
      </View>

      <View style={[styles.card, shadows.md]}>
        <Text style={styles.cardTitle}>本周总结</Text>
        <WeeklyReport />
      </View>

      <View style={[styles.card, shadows.md]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
          <Text style={styles.cardTitle}>真题记录</Text>
        </View>
        <ExamScoreSection refreshKey={refreshKey} />
      </View>

      <View style={[styles.card, shadows.md]}>
        <Text style={styles.cardTitle}>连续学习</Text>
        <StreakBadge streak={streak} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.lg },
  pageTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  cardTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.lg },
});
