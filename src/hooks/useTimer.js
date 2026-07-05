import { useState, useRef, useCallback, useEffect } from "react";

export default function useTimer() {
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
