import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, FlatList, Animated, Platform, Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as store from "../store";
import { fmtDate, formatTimer } from "../utils";
import { colors, spacing, borderRadius, shadows, typography } from "../theme";

// ===== 计时器Hook =====
function useTimer() {
  const timers = useRef({});
  const activeRef = useRef(null);
  const [, force] = useState(0);
  const intervals = useRef({});

  const tick = useCallback(() => force((n) => n + 1), []);

  const secs = useCallback((subj) => {
    const t = timers.current[subj];
    if (!t) return 0;
    let e = t.elapsed || 0;
    if (t.state === "running") e += Date.now() - t.start;
    return Math.floor(e / 1000);
  }, []);

  const start = useCallback((subj) => {
    if (activeRef.current && activeRef.current !== subj) {
      const t = timers.current[activeRef.current];
      if (t && t.state === "running") {
        t.elapsed += Date.now() - t.start;
        clearInterval(intervals.current[activeRef.current]);
        t.state = "stopped";
      }
    }
    timers.current[subj] = { start: Date.now(), elapsed: 0, state: "running" };
    activeRef.current = subj;
    intervals.current[subj] = setInterval(tick, 1000);
    tick();
  }, [tick]);

  const pause = useCallback((subj) => {
    const t = timers.current[subj];
    if (!t || t.state !== "running") return;
    t.state = "paused";
    t.elapsed += Date.now() - t.start;
    clearInterval(intervals.current[subj]);
    if (activeRef.current === subj) activeRef.current = null;
    tick();
  }, [tick]);

  const resume = useCallback((subj) => {
    if (activeRef.current && activeRef.current !== subj) {
      const ot = timers.current[activeRef.current];
      if (ot && ot.state === "running") {
        ot.elapsed += Date.now() - ot.start;
        clearInterval(intervals.current[activeRef.current]);
        ot.state = "stopped";
      }
    }
    const t = timers.current[subj];
    if (!t || t.state !== "paused") return;
    t.state = "running"; t.start = Date.now();
    intervals.current[subj] = setInterval(tick, 1000);
    activeRef.current = subj;
    tick();
  }, [tick]);

  const stop = useCallback((subj) => {
    const t = timers.current[subj];
    if (!t) return 0;
    clearInterval(intervals.current[subj]);
    delete intervals.current[subj];
    let e = t.elapsed || 0;
    if (t.state === "running") e += Date.now() - t.start;
    delete timers.current[subj];
    if (activeRef.current === subj) activeRef.current = null;
    tick();
    return Math.round(e / 6000) / 10;
  }, [tick]);

  const state = useCallback((subj) => {
    const t = timers.current[subj];
    return !t ? "stopped" : t.state;
  }, []);

  useEffect(() => {
    return () => { Object.values(intervals.current).forEach((iv) => clearInterval(iv)); };
  }, []);

  return { start, pause, resume, stop, secs, state, active: activeRef.current };
}

// ===== 动画进度条=====
function AnimatedBar({ pct, height = 6, color = colors.primary }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [pct]);
  return (
    <View style={[barStyles.bg, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[
          barStyles.fill,
          {
            height,
            borderRadius: height / 2,
            backgroundColor: color,
            width: anim.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}
const barStyles = StyleSheet.create({
  bg: { backgroundColor: colors.barBg, overflow: "hidden", flex: 1 },
  fill: { position: "absolute", left: 0, top: 0 },
});

// ===== 脉冲点=====
function PulseDot({ color = colors.accent, size = 8 }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <Animated.View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color, opacity: pulse,
      }}
    />
  );
}

// ===== 数据 Hook =====
function useDailyData(dateStr) {
  const [dayData, setDayData] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [summary, setSummary] = useState({ planned: 0, actual: 0, pct: 0, completed: 0, total: 0 });
  const refresh = useCallback(async () => {
    const d = await store.getDayRecords(dateStr);
    setDayData(d);
    setSubjects(await store.getSubjects());
    const [pl, ac, c, ct] = await Promise.all([
      store.totalPlanned(dateStr),
      store.totalActual(dateStr),
      store.getCompleted(dateStr),
      store.activeCount(dateStr),
    ]);
    setSummary({ planned: pl, actual: ac, pct: pl > 0 ? Math.round((ac / pl) * 100) : 0, completed: c.length, total: ct });
  }, [dateStr]);
  useEffect(() => { refresh(); }, [refresh]);
  return { dayData, subjects, summary, refresh };
}

// ===== 主屏幕=====
export default function DailyScreen({ date, onDateChange }) {
  const dateStr = fmtDate(date);
  const { dayData, subjects, summary, refresh } = useDailyData(dateStr);
  const timer = useTimer();
  const [modalVisible, setModalVisible] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState("");
  // 考研专属功能
  const [examDaysLeft, setExamDaysLeft] = useState(null);
  const [pomodoroMode, setPomodoroMode] = useState(false);
  const [pomoRemaining, setPomoRemaining] = useState(25 * 60); // seconds
const [pomoState, setPomoState] = useState("idle"); // idle | focus | break ? const [sessionNote, setSessionNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);
  const pomoLen = 25 * 60;
  const breakLen = 5 * 60;
  const pomoInterval = useRef(null);


  useEffect(() => { refresh(); }, [date]);
  // Load countdown
  useEffect(() => {
    (async () => {
      const days = await store.getDaysUntilExam();
      setExamDaysLeft(days);
    })();
  }, []);

  // Timer cross-date protection
  const dateRef = useRef(date);
  useEffect(() => {
    if (dateRef.current && dateRef.current.getTime() !== date.getTime()) {
      const active = timer.active;
      if (active) {
        const oldDateStr = fmtDate(dateRef.current);
        const elapsed = timer.stop(active);
        if (elapsed > 0) {
          store.addSession(oldDateStr, active, Math.round(elapsed));
          refresh();
        }
      }
    }
    dateRef.current = date;
  }, [date]);

  const handleStart = (s) => { Vibration.vibrate(10); timer.start(s); };
  const handlePause = (s) => { Vibration.vibrate(5); timer.pause(s); };
  const handleResume = (s) => timer.resume(s);
  const handleStop = async (s) => {
    const el = timer.stop(s);
    if (el > 0) { await store.addSession(dateStr, s, Math.round(el)); refresh(); }
  };


  // 番茄钟逻辑
  const startPomodoro = () => {
    setPomoState("focus");
    setPomoRemaining(pomoLen);
    if (pomoInterval.current) clearInterval(pomoInterval.current);
    pomoInterval.current = setInterval(() => {
      setPomoRemaining(prev => {
        if (prev <= 1) {
          clearInterval(pomoInterval.current);
          Vibration.vibrate([0, 500, 200, 500]);
          // 专注结束，进入休息
          setPomoState("break");
          setPomoRemaining(breakLen);
          pomoInterval.current = setInterval(() => {
            setPomoRemaining(prev2 => {
              if (prev2 <= 1) {
                clearInterval(pomoInterval.current);
                Vibration.vibrate([0, 500, 200, 500]);
                setPomoState("idle");
                setPomoRemaining(pomoLen);
                return 0;
              }
              return prev2 - 1;
            });
          }, 1000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopPomodoro = () => {
    if (pomoInterval.current) clearInterval(pomoInterval.current);
    setPomoState("idle");
    setPomoRemaining(pomoLen);
  };

  // 带备注的结束
  const handleStopWithNote = async (s) => {
    const el = timer.stop(s);
    if (el > 0) {
      if (sessionNote.trim()) {
        await store.addSessionWithNote(dateStr, s, Math.round(el), sessionNote.trim());
      } else {
        await store.addSession(dateStr, s, Math.round(el));
      }
      setSessionNote("");
      setShowNoteInput(false);
      refresh();
    }
  };

  // 番茄模式下的开始：同时启动计时器和番茄钟
  const handlePomoStart = (s) => {
    Vibration.vibrate(10);
    timer.start(s);
    setActiveSubject(s);
    startPomodoro();
  };

  const handlePomoStop = async (s) => {
    stopPomodoro();
    await handleStopWithNote(s);
  };

  const handleAddCustom = async () => {
    const n = customName.trim();
    if (!n) return;
    await store.ensureSubject(dateStr, n);
    setCustomName(""); setShowCustomInput(false); setModalVisible(false);
    refresh();
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isToday = date.getTime() === today.getTime();

  const allSubjects = [
    ...subjects.filter((s) => dayData[s]),
    ...Object.keys(dayData).filter((s) => !subjects.includes(s)),
  ];

  return (
    <View style={styles.container}>
      {/* 顶栏 + 日期 */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}><Text style={styles.appTitle}>📚 考研学习</Text>{examDaysLeft !== null && examDaysLeft > 0 && <Text style={styles.countdown}>⏱ 倒计时 {examDaysLeft} 天</Text>}</View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={[styles.pomoToggle, pomodoroMode && styles.pomoToggleActive]} onPress={() => { setPomodoroMode(!pomodoroMode); stopPomodoro(); }}><Text style={[styles.pomoToggleText, pomodoroMode && {color: "#fff"}]}>🍅</Text></TouchableOpacity><TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => onDateChange(-1)} style={styles.dateArrow}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.dateCenter}>
            <Text style={styles.dateText}>
              {isToday ? "今天" : date.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" })}
            </Text>
            {!isToday && (
              <TouchableOpacity onPress={() => onDateChange(0, true)} style={styles.goTodayBadge}>
                <Text style={styles.goTodayText}>回今天</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => onDateChange(1)} style={styles.dateArrow}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 进度卡片 */}
        <View style={[styles.summaryCard, shadows.md]}>
          <View style={styles.summaryTop}>
            <Text style={styles.summaryLabel}>今日总进度</Text>
            <View style={styles.summaryPctWrap}>
              <Text style={[styles.summaryPct, { color: summary.pct >= 100 ? colors.accent : colors.primary }]}>
                {summary.pct}%
              </Text>
            </View>
          </View>
          <AnimatedBar pct={Math.min(100, summary.pct)} height={8} color={summary.pct >= 100 ? colors.accent : colors.primary} />
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{summary.planned}</Text>
              <Text style={styles.statLabel}>计划(分)</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{summary.actual}</Text>
              <Text style={styles.statLabel}>已学(分)</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: summary.completed === summary.total && summary.total > 0 ? colors.accent : colors.text }]}>
                {summary.completed}/{summary.total}
              </Text>
              <Text style={styles.statLabel}>已完成</Text>
            </View>
          </View>
        </View>

        {/* 科目列表 */}
        {allSubjects.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>还没有学习计划</Text>
            <Text style={styles.emptyDesc}>点击下方按钮添加今天的科目</Text>
          </View>
        ) : (
          allSubjects.map((subj) => {
            const rec = dayData[subj] || { planned: 0, sessions: [] };
            const pl = rec.planned || 0;
            const act = rec.sessions ? rec.sessions.reduce((s, x) => s + (x.duration || 0), 0) : 0;
            const pct = pl > 0 ? Math.min(100, Math.round((act / pl) * 100)) : 0;
            const done = pl > 0 && act >= pl;
            const ts = timer.state(subj);
            const isRun = ts === "running";
            const isPs = ts === "paused";
            const sec = timer.secs(subj);
            const isMaster = subjects.includes(subj);

            let stText, stBg, stCol;
            if (isRun) { stText = "学习中"; stBg = colors.accentLight; stCol = colors.accentDark; }
            else if (isPs) { stText = "已暂停"; stBg = colors.warningBg; stCol = colors.warning; }
            else if (done) { stText = "已完成"; stBg = colors.successBg; stCol = colors.success; }
            else if (act > 0) { stText = `已学 ${act}分`;stBg = colors.tagBg; stCol = colors.tagText; }
            else { stText = "未开始"; stBg = colors.tagBg; stCol = colors.tagText; }

            const isTiming = isRun || isPs;

            return (
              <View key={subj}
                style={[
                  styles.subjectCard,
                  shadows.sm,
                  isRun && styles.cardActive,
                  done && styles.cardDone,
                ]}
              >
                {/* 头部 */}
                <View style={styles.subjHeader}>
                  <View style={styles.subjNameWrap}>
                    {isRun && <PulseDot color={colors.accent} size={8} />}
                    {!isMaster && (
                      <View style={styles.customTag}>
                        <Text style={styles.customTagText}>馃搶</Text>
                      </View>
                    )}
                    <Text style={[styles.subjName, isRun && { color: colors.accentDark }]}>
                      {subj}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: stBg }]}>
                    <Text style={[styles.statusText, { color: stCol }]}>{stText}</Text>
                  </View>
                </View>

                {/* 进度条*/}
                <View style={styles.progressRow}>
                  <AnimatedBar pct={pct} height={5} color={pct >= 100 ? colors.accent : colors.primary} />
                  <Text style={[styles.progressNum, { color: pct >= 100 ? colors.accent : colors.text }]}>
                    {act} / {pl}
                  </Text>
                </View>

                {/* 操作区*/}
                <View style={styles.actions}>
                  {/* 计划输入 */}
                  <View style={styles.planBox}>
                    <Text style={styles.planLabel}>计划</Text>
                    <TextInput style={styles.planInput}
                      keyboardType="number-pad"
                      defaultValue={String(pl)}
                      selectTextOnFocus
                      onEndEditing={async (e) => {
                        await store.setPlanned(dateStr, subj, parseInt(e.nativeEvent.text) || 0);
                        refresh();
                      }}
                    />
                    <Text style={styles.planLabel}>鍒</Text>
                  </View>

                  {/* 计时按钮 */}
                  <View style={styles.timerBox}>
                    {isRun ? (
                      <>
                        <TouchableOpacity style={styles.btnPause} onPress={() => handlePause(subj)}>
                          <Ionicons name="pause" size={14} color={colors.accentDark} />
                          <Text style={styles.btnPauseText}>暂停</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnStop} onPress={() => pomodoroMode ? handlePomoStop(subj) : handleStop(subj)}>
                          <Ionicons name="stop" size={14} color={colors.danger} />
                        </TouchableOpacity>
                        <Text style={styles.timerText}>{formatTimer(sec)}</Text>
                      </>
                    ) : isPs ? (
                      <>
                        <TouchableOpacity style={styles.btnResume} onPress={() => handleResume(subj)}>
                          <Ionicons name="play" size={14} color={colors.primary} />
                          <Text style={styles.btnResumeText}>继续</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnStop} onPress={() => handleStop(subj)}>
                          <Ionicons name="stop" size={14} color={colors.danger} />
                        </TouchableOpacity>
                        <Text style={styles.timerText}>{formatTimer(sec)}</Text>
                      </>
                    ) : (
                      <TouchableOpacity style={styles.btnStart} onPress={() => pomodoroMode ? handlePomoStart(subj) : handleStart(subj)}>
                        <Ionicons name="play" size={14} color={colors.textInverse} />
                        <Text style={styles.btnStartText}>{act > 0 ? "继续" : "开始"}</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity style={styles.removeBtn}
                    onPress={async () => { await store.removeFromDay(dateStr, subj); refresh(); }}
                  >
                    <Ionicons name="close" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>

                {/* 学习中底部提示*/}
                {isRun && (
                  <View style={styles.timerHint}>
                    {pomodoroMode && pomoState !== "idle" && (
                      <Text style={styles.pomoInfoText}>
                        {pomoState === "focus" ? "🍅 专注中" : "☕ 休息中"} {Math.floor(pomoRemaining / 60)}:{String(pomoRemaining % 60).padStart(2, "0")} | 
                      </Text>
                    )}
                    <PulseDot color={colors.accent} size={6} />
                    <Text style={styles.timerHintText}> 计时中 · </Text>
                    <Text style={styles.timerHintTime}>{formatTimer(sec)}</Text>
                  </View>
                )}
                  </View>
            );
          })
        )
        }

        {/* 添加按钮 */}
        <TouchableOpacity style={styles.addBtn}
          onPress={() => { setShowCustomInput(false); setModalVisible(true); }}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
          <Text style={styles.addBtnText}>添加科目</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 添加弹窗 */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, shadows.lg]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{showCustomInput ? "自定义科目" : "选择要学习的科目"}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setShowCustomInput(false); setCustomName(""); }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {showCustomInput ? (
              <View style={styles.customArea}>
                <TextInput style={styles.customInput}
                  placeholder="输入科目名称"
                   value={customName}
                  onChangeText={setCustomName}
                  autoFocus
                  maxLength={20}
                  returnKeyType="done"
                  onSubmitEditing={handleAddCustom}
                />
                <View style={styles.customBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCustomInput(false)}>
                    <Text style={styles.cancelBtnText}>返回</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={handleAddCustom}>
                    <Text style={styles.confirmBtnText}>添加</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <FlatList
                   data={subjects.filter((s) => !dayData[s] || (!dayData[s].planned && (!dayData[s].sessions || dayData[s].sessions.length === 0)))}
                  keyExtractor={(item) => item}
                  contentContainerStyle={styles.modalList}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.modalItem}
                      onPress={async () => { await store.ensureSubject(dateStr, item); setModalVisible(false); refresh(); }}
                    >
                      <Text style={styles.modalItemName}>{item}</Text>
                      <View style={styles.modalAddIcon}>
                        <Ionicons name="add" size={18} color={colors.primary} />
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.modalEmpty}>今天所有科目都已添加 ✨</Text>
                  }
                />
                <TouchableOpacity style={styles.modalCustomBtn} onPress={() => setShowCustomInput(true)}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.modalCustomText}>鍒涘缓自定义科目</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    backgroundColor: colors.card,
    paddingTop: Platform.OS === "ios" ? 50 : 12,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  appTitle: { ...typography.h2, color: colors.text },
  headerRight: { flexDirection: "row", gap: spacing.sm },
  iconBtn: { padding: spacing.xs },

  // Date nav
  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateArrow: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  dateCenter: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dateText: { ...typography.bodyBold, color: colors.text },
  goTodayBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 10, backgroundColor: colors.primaryBg },
  goTodayText: { ...typography.tiny, color: colors.primary, fontWeight: "600" },

  // Scroll area
  scrollArea: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 40 },

  // Summary card
  summaryCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  summaryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  summaryLabel: { ...typography.body, color: colors.textSecondary, fontWeight: "500" },
  summaryPctWrap: { backgroundColor: colors.primaryBg, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md },
  summaryPct: { ...typography.h3, fontWeight: "700" },
  summaryStats: { flexDirection: "row", marginTop: spacing.md },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { ...typography.h2, color: colors.text },
  statLabel: { ...typography.tiny, color: colors.textSecondary, marginTop: 3 },
  statDivider: { width: 1, backgroundColor: colors.borderLight, marginVertical: spacing.xs },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  emptyDesc: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },

  // Subject card
  subjectCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  cardActive: { borderColor: colors.accent, backgroundColor: "#fffdf7" },
  cardDone: { borderColor: colors.success, backgroundColor: "#f8fbf8" },
  subjHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  subjNameWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  subjName: { ...typography.body, fontWeight: "600", color: colors.text, flexShrink: 1 },
  customTag: { backgroundColor: colors.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  customTagText: { fontSize: 10 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 8 },
  statusText: { ...typography.tiny, fontWeight: "700" },

  // Progress
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  progressNum: { ...typography.small, fontWeight: "600", minWidth: 60, textAlign: "right" },

  // Actions area
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  planBox: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.bg, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  planLabel: { ...typography.tiny, color: colors.textSecondary, fontWeight: "500" },
  planInput: { ...typography.body, fontWeight: "600", color: colors.text, minWidth: 28, padding: 0, textAlign: "center" },

  timerBox: { flexDirection: "row", alignItems: "center", gap: spacing.xs },

  btnStart: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  btnStartText: { ...typography.small, color: colors.textInverse, fontWeight: "600" },

  btnPause: {
    flexDirection: "row", alignItems: "center", gap: 3,
    borderWidth: 1, borderColor: colors.accent, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.md, backgroundColor: colors.accentLight,
  },
  btnPauseText: { ...typography.small, color: colors.accentDark, fontWeight: "600" },

  btnResume: {
    flexDirection: "row", alignItems: "center", gap: 3,
    borderWidth: 1, borderColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.md, backgroundColor: colors.primaryBg,
  },
  btnResumeText: { ...typography.small, color: colors.primary, fontWeight: "600" },

  btnStop: {
    borderWidth: 1, borderColor: colors.dangerBg, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  timerText: { ...typography.bodyBold, color: colors.accent, minWidth: 50, textAlign: "center" },
  timerText: { ...typography.bodyBold, color: colors.accent, minWidth: 50, textAlign: "center", ...Platform.select({ default: {} }) },
  pomoInfo: { flexDirection: "row", alignItems: "center", backgroundColor: colors.accentLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  pomoInfoText: { fontSize: 11, fontWeight: "600", color: colors.accentDark },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  countdown: { fontSize: 11, fontWeight: "700", color: colors.accent, backgroundColor: colors.accentLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  pomoToggle: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  pomoToggleActive: { backgroundColor: colors.accent },
  pomoToggleText: { fontSize: 15 },

  removeBtn: { padding: spacing.sm, marginLeft: spacing.xs },

  timerHint: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginTop: spacing.md, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  timerHintText: { ...typography.tiny, color: colors.accent },
  timerHintTime: { ...typography.small, fontWeight: "700", color: colors.accent },

  // Add button
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    borderWidth: 2, borderColor: colors.border, borderStyle: "dashed",
    borderRadius: borderRadius.lg, padding: spacing.lg,
    backgroundColor: colors.card,
  },
  addBtnText: { ...typography.body, color: colors.primary, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: colors.card, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl,
    maxHeight: "70%", paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  modalTitle: { ...typography.h3, color: colors.text },
  modalList: { paddingVertical: spacing.sm },
  modalItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: spacing.lg, paddingHorizontal: spacing.xl,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  modalItemName: { ...typography.body, color: colors.text, fontWeight: "500" },
  modalAddIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primaryBg, alignItems: "center", justifyContent: "center",
  },
  modalEmpty: { textAlign: "center", ...typography.caption, padding: spacing.xxl },
  modalCustomBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  modalCustomText: { ...typography.body, color: colors.primary, fontWeight: "600" },

  // Custom input
  customArea: { padding: spacing.xl },
  customInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...typography.body, marginBottom: spacing.lg,
  },
  customBtns: { flexDirection: "row", gap: spacing.md, justifyContent: "flex-end" },
  cancelBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  cancelBtnText: { ...typography.body, color: colors.textSecondary },
  confirmBtn: {
    backgroundColor: colors.primary, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  confirmBtnText: { ...typography.bodyBold, color: colors.textInverse },
});