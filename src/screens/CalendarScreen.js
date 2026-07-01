import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as store from "../store";
import { fmtDate } from "../utils";
import { colors, spacing, borderRadius, shadows, typography } from "../theme";

// ---- 颜色等级 ----
const LEVELS = [
  { max: 0,      bg: "#f2f0ec", fg: colors.textSecondary, label: "无" },
  { max: 60,     bg: "#ddeedd", fg: colors.text,          label: "~1h" },
  { max: 180,    bg: "#a8c9a8", fg: colors.text,          label: "1~3h" },
  { max: 360,    bg: "#6b8f6e", fg: "#fff",              label: "3~6h" },
  { max: Infinity, bg: "#3d6b40", fg: "#fff",             label: "6h+" },
];

function getLevel(minutes) {
  for (const l of LEVELS) if (minutes <= l.max) return l;
  return LEVELS[LEVELS.length - 1];
}

// ---- 日期格子 ----
const CELL_SIZE = "14.28%"; // 1/7

function DayCell({ date, minutes, isToday, isOther, isSelected, onPress }) {
  const level = getLevel(minutes);
  const clickable = !isOther;

  return (
    <TouchableOpacity
      onPress={clickable ? onPress : null}
      activeOpacity={0.5}
      style={[
        cell.box,
        { backgroundColor: isOther ? "transparent" : level.bg },
        isToday && cell.today,
        isSelected && cell.selected,
      ]}
    >
      <Text style={[
        cell.num,
        { color: isOther ? colors.textTertiary : level.fg },
        isToday && cell.todayNum,
        isSelected && { color: colors.accentDark },
      ]}>
        {date.getDate()}
      </Text>
      {!isOther && (
        <Text style={[cell.min, { color: level.fg === "#fff" ? "rgba(255,255,255,0.7)" : colors.textTertiary }]}>
          {minutes === 0 ? "" : minutes < 60 ? `${minutes}m` : `${(minutes / 60).toFixed(1)}h`}
        </Text>
      )}
    </TouchableOpacity>
  );
}
const cell = StyleSheet.create({
  box: {
    width: CELL_SIZE, aspectRatio: 1, borderRadius: borderRadius.md,
    alignItems: "center", justifyContent: "center", paddingVertical: 2,
  },
  today: { borderWidth: 2, borderColor: colors.accent },
  todayNum: { fontWeight: "800" },
  selected: { borderWidth: 2, borderColor: colors.primary },
  num: { fontSize: 14, fontWeight: "600" },
  min: { fontSize: 8, marginTop: 1 },
});

// ---- 月份统计卡片 ----
function MonthSummary({ year, month }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const last = new Date(year, month + 1, 0);
      let totalMins = 0, days = 0, maxDay = null;
      for (let d = 1; d <= last.getDate(); d++) {
        const date = new Date(year, month, d);
        const key = fmtDate(date);
        const m = await store.totalActual(key);
        if (m > 0) { days++; totalMins += m; if (!maxDay || m > maxDay.m) maxDay = { d: d, m: m }; }
      }
      setStats({ totalMins, days, avg: days > 0 ? Math.round(totalMins / days) : 0, maxDay });
    })();
  }, [year, month]);

  if (!stats) return null;

  return (
    <View style={ms.wrap}>
      <View style={ms.item}>
        <Text style={ms.num}>{Math.round(stats.totalMins / 60 * 10) / 10}h</Text>
        <Text style={ms.label}>总学习</Text>
      </View>
      <View style={ms.div} />
      <View style={ms.item}>
        <Text style={ms.num}>{stats.days}天</Text>
        <Text style={ms.label}>学习天数</Text>
      </View>
      <View style={ms.div} />
      <View style={ms.item}>
        <Text style={ms.num}>{stats.avg}分</Text>
        <Text style={ms.label}>日均</Text>
      </View>
    </View>
  );
}
const ms = StyleSheet.create({
  wrap: {
    flexDirection: "row", backgroundColor: colors.bg, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  item: { flex: 1, alignItems: "center" },
  num: { ...typography.h3, color: colors.primary },
  label: { ...typography.tiny, color: colors.textSecondary, marginTop: 2 },
  div: { width: 1, backgroundColor: colors.borderLight, marginVertical: spacing.xs },
});

// ---- 主屏幕 ----
export default function CalendarScreen({ onSelectDate }) {
  const [calDate, setCalDate] = useState(new Date());
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMonth = useCallback(async () => {
    setLoading(true);
    const y = calDate.getFullYear(), m = calDate.getMonth();
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);

    // 中国习惯：周一始 → pad = (dayOfWeek + 6) % 7
    const pad = (first.getDay() + 6) % 7;
    const prev = new Date(y, m, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const items = [];
    // 上月
    for (let i = pad - 1; i >= 0; i--)
      items.push({ date: new Date(y, m - 1, prev.getDate() - i), other: true });
    // 本月
    for (let i = 1; i <= last.getDate(); i++)
      items.push({ date: new Date(y, m, i), other: false });
    // 下月
    const rem = 42 - items.length;
    for (let i = 1; i <= rem; i++)
      items.push({ date: new Date(y, m + 1, i), other: true });

    // 批量加载：一次性调 totalActual，内部缓存已命中
    const result = await Promise.all(
      items.map(async (item) => {
        const mins = await store.totalActual(fmtDate(item.date));
        return { ...item, minutes: mins };
      })
    );
    setDays(result);
    setLoading(false);
  }, [calDate]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  const goPrev = () => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1));
  const goNext = () => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1));
  const goToday = () => setCalDate(new Date());

  const monthLabel = `${calDate.getFullYear()}年${calDate.getMonth() + 1}月`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>📅 学习日历</Text>
        <TouchableOpacity style={styles.todayBadge} onPress={goToday}>
          <Text style={styles.todayBadgeText}>今天</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, shadows.md]}>
        {/* 月份导航 */}
        <View style={styles.nav}>
          <TouchableOpacity onPress={goPrev} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity onPress={goNext} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* 月度统计 */}
        <MonthSummary year={calDate.getFullYear()} month={calDate.getMonth()} />

        {/* 星期行（周一始） */}
        <View style={styles.weekRow}>
          {["一","二","三","四","五","六","日"].map((w, i) => (
            <Text key={i} style={[styles.weekLabel, i === 6 && { color: colors.danger }]}>{w}</Text>
          ))}
        </View>

        {/* 网格 */}
        {loading ? (
          <ActivityIndicator style={{ padding: 20 }} color={colors.primary} />
        ) : (
          <View style={styles.grid}>
            {days.map((item, i) => (
              <DayCell
                key={i}
                date={item.date}
                minutes={item.minutes}
                isToday={fmtDate(item.date) === fmtDate(new Date())}
                isOther={item.other}
                onPress={() => onSelectDate && onSelectDate(new Date(item.date))}
              />
            ))}
          </View>
        )}

        {/* 图例 */}
        <View style={styles.legend}>
          {LEVELS.map((l, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, {
                backgroundColor: l.bg,
                borderWidth: l.max === 0 ? 1 : 0,
                borderColor: colors.border,
              }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  pageHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: spacing.lg,
  },
  pageTitle: { ...typography.h2, color: colors.text },
  todayBadge: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: 12, borderWidth: 1, borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  todayBadgeText: { ...typography.small, color: colors.primary, fontWeight: "600" },
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.borderLight,
  },
  nav: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.md, marginBottom: spacing.md,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.bg,
  },
  monthLabel: { ...typography.h3, minWidth: 120, textAlign: "center", color: colors.text },
  weekRow: { flexDirection: "row", marginBottom: spacing.xs },
  weekLabel: {
    width: CELL_SIZE, textAlign: "center", ...typography.small,
    color: colors.textSecondary, fontWeight: "600", paddingVertical: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  legend: {
    flexDirection: "row", flexWrap: "wrap", gap: spacing.sm,
    justifyContent: "center", marginTop: spacing.lg,
    paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { ...typography.tiny, color: colors.textSecondary },
});
