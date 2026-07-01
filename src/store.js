import AsyncStorage from "@react-native-async-storage/async-storage";

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
    start: _fmtTime(now),
    end: _fmtTime(end),
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
    const key = _fmtDate(d);
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

function _fmtTime(d) {
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function _fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

// Session with notes
export async function addSessionWithNote(dateStr, subject, duration, note) {
  await load();
  const day = ensureDay(dateStr);
  if (!day[subject]) day[subject] = { planned: 0, sessions: [] };
  const now = new Date();
  const end = new Date(now.getTime() + Math.round(duration) * 60000);
  day[subject].sessions.push({
    start: _fmtTime(now),
    end: _fmtTime(end),
    duration: Math.round(duration),
    note: note || "",
  });
  await save();
}
