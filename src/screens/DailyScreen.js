import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, FlatList, Animated, Platform, Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as store from "../store";
import { fmtDate, formatTimer } from "../utils";
import { colors, spacing, borderRadius, shadows, typography } from "../theme";

// ===== 计时器 Hook =====
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
// ===== AnimatedBar =====
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

// ===== PulseDot =====
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

// ===== useDailyData =====
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

// ===== NoteModal =====
function NoteModal({ visible, subject, onConfirm, onCancel }) {
  const [noteText, setNoteText] = useState("");
  const examples = ["背了肖四", "做了2019真题", "复习了高数", "背了单词", "看了网课"];

  useEffect(() => {
    if (visible) setNoteText("");
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, shadows.lg]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>学习备注</Text>
            <TouchableOpacity onPress={onCancel}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: spacing.xl }}>
            <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.md }}>
              {subject} — 记录一下学了什么
            </Text>
            <TextInput
              style={styles.customInput}
              placeholder="例如：背了肖四第三章"
              value={noteText}
              onChangeText={setNoteText}
              autoFocus
              maxLength={100}
              returnKeyType="done"
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg }}>
              {examples.map((ex) => (
                <TouchableOpacity
                  key={ex}
                  style={styles.noteExample}
                  onPress={() => setNoteText(ex)}
                >
                  <Text style={styles.noteExampleText}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.customBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelBtnText}>跳过</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => onConfirm(noteText.trim())}>
                <Text style={styles.confirmBtnText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  );
}

// ===== DailyScreen =====
export default function DailyScreen({ date, onDateChange }) {
  const dateStr = fmtDate(date);
  const { dayData, subjects, summary, refresh } = useDailyData(dateStr);
  const timer = useTimer();
  const [modalVisible, setModalVisible] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState("");

  const [examDaysLeft, setExamDaysLeft] = useState(null);
  const [dailyTarget, setDailyTarget] = useState(0);

  // Pomodoro
  const [pomodoroMode, setPomodoroMode] = useState(false);
  const [pomoRemaining, setPomoRemaining] = useState(25 * 60);
  const [pomoState, setPomoState] = useState("idle");
  const pomoLen = 25 * 60;
  const breakLen = 5 * 60;
  const pomoInterval = useRef(null);

  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [pendingSubject, setPendingSubject] = useState(null);
  const [pendingMinutes, setPendingMinutes] = useState(0);

  useEffect(() => { refresh(); }, [date]);

  useEffect(() => {
    (async () => {
      const days = await store.getDaysUntilExam();
      setExamDaysLeft(days);
      const s = await store.getSettings();
      if (s.dailyTarget) setDailyTarget(s.dailyTarget);
    })();
  }, []);

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
    if (el > 0) {
      setPendingSubject(s);
      setPendingMinutes(Math.round(el));
      setNoteModalVisible(true);
    }
  };

  const handleNoteConfirm = async (note) => {
    if (note) {
      await store.addSessionWithNote(dateStr, pendingSubject, pendingMinutes, note);
    } else {
      await store.addSession(dateStr, pendingSubject, pendingMinutes);
    }
    setNoteModalVisible(false);
    setPendingSubject(null);
    setPendingMinutes(0);
    refresh();
  };

  const handleNoteCancel = async () => {
    await store.addSession(dateStr, pendingSubject, pendingMinutes);
    setNoteModalVisible(false);
    setPendingSubject(null);
    setPendingMinutes(0);
    refresh();
  };

  const startPomodoro = () => {
    setPomoState("focus");
    setPomoRemaining(pomoLen);
    if (pomoInterval.current) clearInterval(pomoInterval.current);
    pomoInterval.current = setInterval(() => {
      setPomoRemaining(prev => {
        if (prev <= 1) {
          clearInterval(pomoInterval.current);
          Vibration.vibrate([0, 500, 200, 500]);
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

  const handlePomoStart = (s) => {
    Vibration.vibrate(10);
    timer.start(s);
    startPomodoro();
  };

  const handlePomoStop = async (s) => {
    stopPomodoro();
    await handleStop(s);
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

  const examWeeksLeft = examDaysLeft !== null && examDaysLeft > 0
    ? Math.floor(examDaysLeft / 7) + "周" + (examDaysLeft % 7) + "天"
    : "";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Text style={styles.appTitle}>考研学习</Text>
            {examDaysLeft !== null && examDaysLeft > 0 && (
              <Text style={styles.countdown}>
                倒计时 {examDaysLeft} 天
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.pomoToggle, pomodoroMode && styles.pomoToggleActive]}
              onPress={() => { setPomodoroMode(!pomodoroMode); stopPomodoro(); }}
            >
              <Text style={[styles.pomoToggleText, pomodoroMode && {color: "#fff"}]}>番茄</Text>
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
        {examWeeksLeft && (
          <Text style={styles.examDetail}>
            还剩 {examWeeksLeft} ({Math.round((365 - examDaysLeft) / 365 * 100)}% 已用)
          </Text>
        )}
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Summary card */}
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
          {dailyTarget > 0 && (
            <View style={styles.dailyTargetRow}>
              <Text style={styles.dailyTargetLabel}>今日目标 {dailyTarget} 分钟</Text>
              <View style={styles.dailyTargetBarBg}>
                <View style={[styles.dailyTargetBar, {
                  width: Math.min(100, (summary.actual / dailyTarget) * 100) + "%",
                  backgroundColor: summary.actual >= dailyTarget ? colors.accent : colors.primary,
                }]} />
              </View>
              <Text style={styles.dailyTargetPct}>
                {Math.min(100, Math.round(summary.actual / dailyTarget * 100))}%
              </Text>
            </View>
          )}
        </View>
        {/* Pomo banner */}
        {pomodoroMode && pomoState !== "idle" && (
          <View style={[styles.pomoBanner, {
            backgroundColor: pomoState === "focus" ? colors.accentLight : colors.primaryBg,
          }]}>
            <Text style={styles.pomoBannerIcon}>
              {pomoState === "focus" ? "专注中" : "休息中"}
            </Text>
            <Text style={styles.pomoBannerTime}>
              {Math.floor(pomoRemaining / 60)}:{String(pomoRemaining % 60).padStart(2, "0")}
            </Text>
          </View>
        )}

        {/* Subject list */}
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

            const lastNote = rec.sessions && rec.sessions.length > 0
              ? rec.sessions[rec.sessions.length - 1].note
              : null;

            let stText, stBg, stCol;
            if (isRun) { stText = "学习中"; stBg = colors.accentLight; stCol = colors.accentDark; }
            else if (isPs) { stText = "已暂停"; stBg = colors.warningBg; stCol = colors.warning; }
            else if (done) { stText = "已完成"; stBg = colors.successBg; stCol = colors.success; }
            else if (act > 0) { stText = "已学 " + act + "分"; stBg = colors.tagBg; stCol = colors.tagText; }
            else { stText = "未开始"; stBg = colors.tagBg; stCol = colors.tagText; }

            return (
              <View key={subj} style={[styles.subjCard, shadows.sm, done && styles.cardDone]}>
                {/* Header */}
                <View style={styles.subjHeader}>
                  <View style={styles.subjNameWrap}>
                    {isRun && <PulseDot color={colors.accent} size={8} />}
                    {!isMaster && (
                      <View style={styles.customTag}>
                        <Text style={styles.customTagText}>自定义</Text>
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

                {/* Progress bar */}
                <View style={styles.progressRow}>
                  <AnimatedBar pct={pct} height={5} color={pct >= 100 ? colors.accent : colors.primary} />
                  <Text style={[styles.progressNum, { color: pct >= 100 ? colors.accent : colors.text }]}>
                    {act} / {pl}
                  </Text>
                </View>

                {/* Recent note */}
                {lastNote && !isRun && !isPs && (
                  <View style={styles.noteRow}>
                    <Ionicons name="chatbubble-ellipses-outline" size={12} color={colors.textTertiary} />
                    <Text style={styles.noteText}>{lastNote}</Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actions}>
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
                    <Text style={styles.planLabel}>分</Text>
                  </View>

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

                {/* Running hint */}
                {isRun && (
                  <View style={styles.timerHint}>
                    {pomodoroMode && pomoState !== "idle" && (
                      <Text style={styles.pomoInfoText}>
                        {pomoState === "focus" ? "专注中" : "休息中"} {Math.floor(pomoRemaining / 60)}:{String(pomoRemaining % 60).padStart(2, "0")} |
                      </Text>
                    )}
                    <PulseDot color={colors.accent} size={6} />
                    <Text style={styles.timerHintText}> 计时中 ... </Text>
                    <Text style={styles.timerHintTime}>{formatTimer(sec)}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* Add button */}
        <TouchableOpacity style={styles.addBtn}
          onPress={() => { setShowCustomInput(false); setModalVisible(true); }}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
          <Text style={styles.addBtnText}>添加科目</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, shadows.lg]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showCustomInput ? "自定义科目" : "选择要学习的科目"}
              </Text>
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
                    <Text style={styles.modalEmpty}>今天所有科目都已添加</Text>
                  }
                />
                <TouchableOpacity style={styles.modalCustomBtn} onPress={() => setShowCustomInput(true)}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.modalCustomText}>创建自定义科目</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Note modal */}
      <NoteModal
        visible={noteModalVisible}
        subject={pendingSubject}
        onConfirm={handleNoteConfirm}
        onCancel={handleNoteCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

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

  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateArrow: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  dateCenter: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dateText: { ...typography.bodyBold, color: colors.text },
  goTodayBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 10, backgroundColor: colors.primaryBg },
  goTodayText: { ...typography.tiny, color: colors.primary, fontWeight: "600" },
  examDetail: { ...typography.tiny, color: colors.textTertiary, textAlign: "center", marginTop: spacing.xs },

  scrollArea: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 40 },

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
  statLabel: { ...typography.tiny, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.borderLight, marginVertical: spacing.xs },

  dailyTargetRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight },
  dailyTargetLabel: { ...typography.tiny, color: colors.textSecondary, minWidth: 100 },
  dailyTargetBarBg: { flex: 1, height: 6, backgroundColor: colors.barBg, borderRadius: 3, overflow: "hidden" },
  dailyTargetBar: { height: "100%", borderRadius: 3 },
  dailyTargetPct: { ...typography.small, fontWeight: "600", color: colors.primary, minWidth: 36, textAlign: "right" },

  pomoBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md,
    paddingVertical: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.lg,
  },
  pomoBannerIcon: { ...typography.bodyBold, color: colors.text },
  pomoBannerTime: { ...typography.h3, color: colors.accentDark, fontWeight: "700" },

  subjCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  cardDone: { borderColor: colors.successBg, backgroundColor: "#fafffa" },
  subjHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  subjNameWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  subjName: { ...typography.h3, color: colors.text },
  customTag: { backgroundColor: colors.accentLight, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  customTagText: { fontSize: 9, color: colors.accentDark, fontWeight: "600" },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: "600" },

  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  progressNum: { ...typography.small, fontWeight: "600", minWidth: 60, textAlign: "right" },

  noteRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: spacing.sm, paddingLeft: 2 },
  noteText: { fontSize: 11, color: colors.textTertiary, fontStyle: "italic" },

  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  planBox: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.bg, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  planLabel: { ...typography.tiny, color: colors.textSecondary },
  planInput: { width: 32, height: 24, textAlign: "center", ...typography.small, color: colors.text, fontWeight: "600", padding: 0 },

  timerBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xs, justifyContent: "flex-end" },

  btnStart: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
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
  timerText: { ...typography.bodyBold, color: colors.accent, minWidth: 50, textAlign: "center", ...Platform.select({ default: {} }) },
  pomoInfo: { flexDirection: "row", alignItems: "center", backgroundColor: colors.accentLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  pomoInfoText: { fontSize: 11, fontWeight: "600", color: colors.accentDark },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  countdown: { fontSize: 11, fontWeight: "700", color: colors.accent, backgroundColor: colors.accentLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  pomoToggle: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  pomoToggleActive: { backgroundColor: colors.accent },
  pomoToggleText: { fontSize: 10, fontWeight: "700", color: colors.textSecondary },

  removeBtn: { padding: spacing.sm, marginLeft: spacing.xs },

  timerHint: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginTop: spacing.md, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  timerHintText: { ...typography.tiny, color: colors.accent },
  timerHintTime: { ...typography.small, fontWeight: "700", color: colors.accent },

  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    borderWidth: 2, borderColor: colors.border, borderStyle: "dashed",
    borderRadius: borderRadius.lg, padding: spacing.lg,
    backgroundColor: colors.card,
  },
  addBtnText: { ...typography.body, color: colors.primary, fontWeight: "600" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
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
  modalAddIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryBg, alignItems: "center", justifyContent: "center" },
  modalEmpty: { textAlign: "center", ...typography.caption, padding: spacing.xxl },
  modalCustomBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  modalCustomText: { ...typography.body, color: colors.primary, fontWeight: "600" },

  customArea: { padding: spacing.xl },
  customInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    ...typography.body, marginBottom: spacing.lg,
  },
  customBtns: { flexDirection: "row", gap: spacing.md, justifyContent: "flex-end" },
  cancelBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  cancelBtnText: { ...typography.body, color: colors.textSecondary },
  confirmBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  confirmBtnText: { ...typography.bodyBold, color: colors.textInverse },

  noteExample: { backgroundColor: colors.accentLight, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  noteExampleText: { fontSize: 12, color: colors.accentDark },

  emptyState: { alignItems: "center", paddingVertical: spacing.xxl * 2 },
  emptyTitle: { ...typography.h3, color: colors.textSecondary, marginTop: spacing.md },
  emptyDesc: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },
});
