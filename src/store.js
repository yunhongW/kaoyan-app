import AsyncStorage from "@react-native-async-storage/async-storage";
import { fmtDate, fmtTime, weekDays } from "./utils";

const KEY = "kaoyan_data";
const DEFAULT_SUBJECTS = ["政治", "英语", "数学", "专业课"];

let cache = null;
let loading = null; // promise-based lock

async function load() {
  if (cache) return cache;
  if (loading) return loading; // 等待已有加载
  loading = _doLoad();
  try { return await loading; }
  finally { loading = null; }
}

async function _doLoad() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) cache = JSON.parse(raw);
  } catch (_) {}
  if (!cache || !cache.subjects) {
    cache = { subjects: [...DEFAULT_SUBJECTS], records: {}, examDate: null, settings: { pomodoro: 25, breakTime: 5 } };
  }
  _migrate();
  return cache;
}

function _migrate() {
  Object.keys(cache.records).forEach((d) => {
    const day = cache.records[d];
    Object.keys(day).forEach((s) => {
      if (!day[s].sessions) day[s].sessions = [];
      if (typeof day[s].planned !== "number") day[s].planned = 0;
    });
  });
  if (!cache.reviewTopics) cache.reviewTopics = {};
  if (!cache.milestones) cache.milestones = [];
  if (!cache.dailyNotes) cache.dailyNotes = {};
}

async function save() {
  await AsyncStorage.setItem(KEY, JSON.stringify(cache));
}

// ---- 批量获取多天的实际时长 ----
export async function batchTotalActual(dateStrs) {
  await load();
  const result = {};
  dateStrs.forEach((ds) => {
    const day = cache.records[ds] || {};
    let t = 0;
    Object.keys(day).forEach((s) => {
      if (day[s].sessions)
        t += day[s].sessions.reduce((sum, x) => sum + (x.duration || 0), 0);
    });
    result[ds] = t;
  });
  return result;
}

export async function getSubjects() {
  await load();
  return [...cache.subjects]; // 返回拷贝防止外部修改
}

export async function addSubject(name) {
  await load();
  name = name.trim();
  if (!name || cache.subjects.includes(name)) return false;
  cache.subjects.push(name);
  await save();
  return true;
}

export async function removeSubject(name) {
  await load();
  cache.subjects = cache.subjects.filter((s) => s !== name);
  Object.keys(cache.records).forEach((d) => delete cache.records[d][name]);
  await save();
}

function ensureDay(dateStr) {
  if (!cache.records[dateStr]) cache.records[dateStr] = {};
  return cache.records[dateStr];
}

export async function ensureSubject(dateStr, subject) {
  await load();
  const day = ensureDay(dateStr);
  if (!day[subject]) day[subject] = { planned: 0, sessions: [] };
  await save();
  return day[subject];
}

export async function setPlanned(dateStr, subject, minutes) {
  await load();
  const day = ensureDay(dateStr);
  if (!day[subject]) day[subject] = { planned: 0, sessions: [] };
  day[subject].planned = Math.max(0, Math.round(minutes));
  await save();
}

export async function addSession(dateStr, subject, duration) {
  await load();
  const day = ensureDay(dateStr);
  if (!day[subject]) day[subject] = { planned: 0, sessions: [] };
  const now = new Date();
  const end = new Date(now.getTime() + Math.round(duration) * 60000);
  day[subject].sessions.push({
    start: fmtTime(now),
    end: fmtTime(end),
    duration: Math.round(duration),
  });
  await save();
}

export async function getActual(dateStr, subject) {
  await load();
  const day = cache.records[dateStr] || {};
  const rec = day[subject];
  if (!rec || !rec.sessions) return 0;
  return rec.sessions.reduce((s, x) => s + (x.duration || 0), 0);
}

export async function totalActual(dateStr) {
  await load();
  const day = cache.records[dateStr] || {};
  let t = 0;
  Object.keys(day).forEach((s) => {
    t += day[s].sessions
      ? day[s].sessions.reduce((sum, x) => sum + (x.duration || 0), 0)
      : 0;
  });
  return t;
}

export async function totalPlanned(dateStr) {
  await load();
  const day = cache.records[dateStr] || {};
  let t = 0;
  Object.keys(day).forEach((s) => {
    if (day[s]) t += day[s].planned || 0;
  });
  return t;
}

export async function getCompleted(dateStr) {
  await load();
  const day = cache.records[dateStr] || {};
  const out = [];
  for (const s of Object.keys(day)) {
    const p = day[s].planned || 0;
    if (p > 0) {
      const a = day[s].sessions
        ? day[s].sessions.reduce((sum, x) => sum + (x.duration || 0), 0)
        : 0;
      if (a >= p) out.push(s);
    }
  }
  return out;
}

export async function activeCount(dateStr) {
  await load();
  const day = cache.records[dateStr] || {};
  return Object.keys(day).filter(
    (k) =>
      day[k].planned > 0 ||
      (day[k].sessions && day[k].sessions.length > 0)
  ).length;
}

export async function getSubjectTotals() {
  await load();
  const t = {};
  cache.subjects.forEach((s) => (t[s] = 0));
  Object.keys(cache.records).forEach((d) => {
    const day = cache.records[d];
    Object.keys(day).forEach((s) => {
      if (t[s] === undefined) t[s] = 0;
      const a = day[s].sessions
        ? day[s].sessions.reduce((sum, x) => sum + (x.duration || 0), 0)
        : 0;
      t[s] += a;
    });
  });
  return t;
}

export async function getStreak() {
  await load();
  let n = 0;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const d = new Date(t);
    d.setDate(d.getDate() - i);
    const key = fmtDate(d);
    const day = cache.records[key] || {};
    let total = 0;
    Object.keys(day).forEach((s) => {
      if (day[s].sessions)
        total += day[s].sessions.reduce((sum, x) => sum + (x.duration || 0), 0);
    });
    if (total > 0) n++;
    else break;
  }
  return n;
}

export async function removeFromDay(dateStr, subject) {
  await load();
  const day = cache.records[dateStr];
  if (day) delete day[subject];
  await save();
}

export async function exportJSON() {
  await load();
  return JSON.stringify(cache, null, 2);
}

export async function importJSON(jsonStr) {
  try {
    const p = JSON.parse(jsonStr);
    if (!p.subjects || !p.records) return { success: false, error: "格式错误" };
    // 验证数据结构
    if (typeof p.subjects !== "object" || typeof p.records !== "object")
      return { success: false, error: "数据字段类型错误" };
    cache = p;
    _migrate();
    await save();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function clearAll() {
  cache = { subjects: [...DEFAULT_SUBJECTS], records: {} };
  await save();
}

export async function getDayRecords(dateStr) {
  await load();
  const day = cache.records[dateStr];
  if (!day) return {};
  // 返回浅拷贝
  const copy = {};
  Object.keys(day).forEach((k) => {
    copy[k] = {
      planned: day[k].planned,
      sessions: day[k].sessions.map((s) => ({ ...s })),
    };
  });
  return copy;
}

// ---- 考研专属功能 ----

export async function getExamDate() {
  await load();
  return cache.examDate || null;
}

export async function setExamDate(dateStr) {
  await load();
  cache.examDate = dateStr;
  await save();
}

export async function getDaysUntilExam() {
  await load();
  if (!cache.examDate) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const exam = new Date(cache.examDate + "T00:00:00");
  const diff = Math.ceil((exam.getTime() - now.getTime()) / 86400000);
  return diff;
}

export async function getSettings() {
  await load();
  return { ...cache.settings };
}

export async function updateSettings(s) {
  await load();
  cache.settings = { ...cache.settings, ...s };
  await save();
}


// ---- 学习提醒通知 ----
export async function setNotificationTime(hour, minute) {
  await load();
  cache.notificationTime = { hour, minute };
  await save();
}

export async function getNotificationTime() {
  await load();
  return cache.notificationTime || { hour: 8, minute: 0 };
}

// ---- 科目权重/建议时间 ----
export async function setSubjectWeight(name, weight) {
  await load();
  if (!cache.subjectWeights) cache.subjectWeights = {};
  cache.subjectWeights[name] = Math.max(1, Math.min(5, weight || 3));
  await save();
}

export async function getSubjectWeights() {
  await load();
  return cache.subjectWeights || {};
}

export async function getSuggestedMinutes(subject, totalDailyMinutes) {
  await load();
  const weights = cache.subjectWeights || {};
  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0) || 1;
  const w = weights[subject] || 3;
  return Math.round((w / totalWeight) * totalDailyMinutes);
}

// ---- 真题/模拟卷记录 ----
export async function addExamPaper(paper) {
  await load();
  if (!cache.examPapers) cache.examPapers = [];
  cache.examPapers.push({
    id: Date.now().toString(),
    subject: paper.subject,
    year: paper.year,
    score: paper.score,
    totalScore: paper.totalScore || 100,
    duration: paper.duration || 0,
    date: paper.date || fmtDate(new Date()),
    notes: paper.notes || "",
  });
  await save();
  return cache.examPapers.length;
}

export async function getExamPapers() {
  await load();
  return cache.examPapers || [];
}

export async function deleteExamPaper(id) {
  await load();
  if (cache.examPapers) {
    cache.examPapers = cache.examPapers.filter((p) => p.id !== id);
    await save();
  }
}

// ---- 心情打卡 ----
export async function setMood(dateStr, mood, note) {
  await load();
  if (!cache.moods) cache.moods = {};
  cache.moods[dateStr] = { mood: mood || "okay", note: note || "", date: dateStr };
  await save();
}

export async function getMood(dateStr) {
  await load();
  if (!cache.moods) return null;
  return cache.moods[dateStr] || null;
}

export async function getAllMoods() {
  await load();
  return cache.moods || {};
}

// ---- 每天总结 ----
export async function getDailySummary(dateStr) {
  await load();
  const day = cache.records[dateStr];
  if (!day) return null;
  let totalMinutes = 0;
  const subjects = [];
  let pomoCount = 0;
  let notes = [];
  Object.keys(day).forEach((s) => {
    if (day[s].sessions) {
      const subjTotal = day[s].sessions.reduce((sum, x) => sum + (x.duration || 0), 0);
      if (subjTotal > 0) {
        totalMinutes += subjTotal;
        subjects.push({ name: s, minutes: subjTotal });
        day[s].sessions.forEach((ss) => {
          if (ss.note) notes.push(ss.note);
          if (ss.duration === 25) pomoCount++;
        });
      }
    }
  });
  const mood = cache.moods?.[dateStr] || null;
  return { date: dateStr, totalMinutes, subjects, pomoCount, notes, mood };
}

// ---- 专注度评分 ----
export async function getFocusScore(dateStr) {
  await load();
  const day = cache.records[dateStr];
  if (!day) return 0;
  let totalPlanned = 0, totalActual = 0, pomoCount = 0;
  Object.keys(day).forEach((s) => {
    if (day[s]) {
      totalPlanned += day[s].planned || 0;
      if (day[s].sessions) {
        day[s].sessions.forEach((ss) => {
          totalActual += ss.duration || 0;
          if (ss.duration >= 20 && ss.duration <= 30) pomoCount++;
        });
      }
    }
  });
  if (totalActual === 0) return 0;
  const planRate = totalPlanned > 0 ? Math.min(1, totalActual / totalPlanned) : 0.5;
  const effort = Math.min(1, totalActual / 480);
  const pomoBonus = Math.min(1, pomoCount / 8);
  return Math.round((planRate * 40 + effort * 35 + pomoBonus * 25));
}

// ---- 周报数据 ----
export async function getWeeklyReport() {
  await load();
  const today = new Date();
  const dow = today.getDay();
  const mon = new Date(today);
  mon.setDate(today.getDate() - ((dow + 6) % 7));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    const key = fmtDate(d);
    const summary = await getDailySummary(key);
    days.push({ date: key, summary, dayName: weekDays[((d.getDay() + 6) % 7)] });
  }
  const totalMins = days.reduce((s, d) => s + (d.summary?.totalMinutes || 0), 0);
  const activeDays = days.filter((d) => (d.summary?.totalMinutes || 0) > 0).length;
  const subjectTotals = {};
  days.forEach((d) => {
    if (d.summary?.subjects) {
      d.summary.subjects.forEach((subj) => {
        subjectTotals[subj.name] = (subjectTotals[subj.name] || 0) + subj.minutes;
      });
    }
  });
  let totalScore = 0;
  for (const d of days) {
    totalScore += await getFocusScore(d.date);
  }
  const avgScore = activeDays > 0 ? Math.round(totalScore / activeDays) : 0;
  return { days, totalMins, activeDays, subjectTotals, avgScore };
}
// Session with notes
export async function addSessionWithNote(dateStr, subject, duration, note) {
  await load();
  const day = ensureDay(dateStr);
  if (!day[subject]) day[subject] = { planned: 0, sessions: [] };
  const now = new Date();
  const end = new Date(now.getTime() + Math.round(duration) * 60000);
  day[subject].sessions.push({
    start: fmtTime(now),
    end: fmtTime(end),
    duration: Math.round(duration),
    note: note || "",
  });
  await save();
}

// ---- 复习进度追踪 ----

export async function getReviewTopics() {
  await load();
  return cache.reviewTopics || {};
}

export async function addReviewTopicGroup(subject, topicName) {
  await load();
  if (!cache.reviewTopics[subject]) cache.reviewTopics[subject] = [];
  cache.reviewTopics[subject].push({
    id: Date.now().toString(),
    name: topicName.trim(),
    chapters: [],
  });
  await save();
}

export async function addChapter(subject, topicId, chapterName) {
  await load();
  const topics = cache.reviewTopics[subject];
  if (!topics) return;
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) return;
  topic.chapters.push({
    id: Date.now().toString(),
    name: chapterName.trim(),
    completed: false,
  });
  await save();
}

export async function toggleChapterComplete(subject, topicId, chapterId) {
  await load();
  const topics = cache.reviewTopics[subject];
  if (!topics) return;
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) return;
  const ch = topic.chapters.find((c) => c.id === chapterId);
  if (ch) ch.completed = !ch.completed;
  await save();
}

export async function deleteReviewTopicGroup(subject, topicId) {
  await load();
  if (cache.reviewTopics[subject]) {
    cache.reviewTopics[subject] = cache.reviewTopics[subject].filter((t) => t.id !== topicId);
    await save();
  }
}

export async function deleteChapter(subject, topicId, chapterId) {
  await load();
  const topics = cache.reviewTopics[subject];
  if (!topics) return;
  const topic = topics.find((t) => t.id === topicId);
  if (!topic) return;
  topic.chapters = topic.chapters.filter((c) => c.id !== chapterId);
  await save();
}

export async function getReviewProgress(subject) {
  await load();
  const topics = cache.reviewTopics[subject] || [];
  let totalChapters = 0, completedChapters = 0;
  topics.forEach((t) => {
    t.chapters.forEach((c) => {
      totalChapters++;
      if (c.completed) completedChapters++;
    });
  });
  return {
    totalChapters,
    completedChapters,
    pct: totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0,
    topics,
  };
}

export async function getAllReviewProgress() {
  await load();
  const result = {};
  for (const subject of cache.subjects) {
    result[subject] = await getReviewProgress(subject);
  }
  Object.keys(cache.reviewTopics).forEach((s) => {
    if (!result[s]) result[s] = { totalChapters: 0, completedChapters: 0, pct: 0, topics: [] };
  });
  return result;
}

// ---- 学习里程碑 ----

export async function getMilestones() {
  await load();
  return cache.milestones || [];
}

export async function addMilestone({ title, subject, targetDate, totalMinutes }) {
  await load();
  const today = fmtDate(new Date());
  const ms = {
    id: Date.now().toString(),
    title: title.trim(),
    subject,
    targetDate,
    totalMinutes: Math.round(totalMinutes),
    completedMinutes: 0,
    createdAtDate: today,
    dailyTarget: 0,
  };
  cache.milestones.push(ms);
  await save();
  await recalculateMilestones();
  return ms.id;
}

export async function updateMilestone(id, updates) {
  await load();
  const ms = cache.milestones.find((m) => m.id === id);
  if (!ms) return;
  Object.assign(ms, updates);
  await save();
}

export async function deleteMilestone(id) {
  await load();
  cache.milestones = cache.milestones.filter((m) => m.id !== id);
  await save();
}

export async function recalculateMilestones() {
  await load();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  cache.milestones.forEach((ms) => {
    let completed = 0;
    Object.keys(cache.records).forEach((dateStr) => {
      if (dateStr < ms.createdAtDate) return;
      const day = cache.records[dateStr];
      if (!day || !day[ms.subject]) return;
      const sessions = day[ms.subject].sessions || [];
      completed += sessions.reduce((s, x) => s + (x.duration || 0), 0);
    });
    ms.completedMinutes = completed;
    const target = new Date(ms.targetDate + "T00:00:00");
    const remainingDays = Math.max(1, Math.ceil((target.getTime() - today.getTime()) / 86400000));
    const remainingMinutes = Math.max(0, ms.totalMinutes - completed);
    ms.dailyTarget = Math.round(remainingMinutes / remainingDays);
  });
  await save();
}

// ---- 每日笔记 ----

export async function getDailyNote(dateStr) {
  await load();
  return (cache.dailyNotes && cache.dailyNotes[dateStr]) || "";
}

export async function setDailyNote(dateStr, text) {
  await load();
  if (!cache.dailyNotes) cache.dailyNotes = {};
  cache.dailyNotes[dateStr] = text.trim();
  await save();
}

// ---- 快捷规划 ----

export async function getDayPlan(dateStr) {
  await load();
  const day = cache.records[dateStr];
  if (!day) return {};
  const plan = {};
  Object.keys(day).forEach((s) => {
    if (day[s].planned > 0) plan[s] = day[s].planned;
  });
  return plan;
}

export async function applyDayPlan(dateStr, plan) {
  await load();
  const day = ensureDay(dateStr);
  Object.keys(plan).forEach((s) => {
    if (!day[s]) day[s] = { planned: 0, sessions: [] };
    day[s].planned = Math.max(0, Math.round(plan[s]));
  });
  await save();
}

export async function getDailyTemplate() {
  await load();
  return cache.dailyTemplate || {};
}

export async function saveDailyTemplate(plan) {
  await load();
  cache.dailyTemplate = plan;
  await save();
}
