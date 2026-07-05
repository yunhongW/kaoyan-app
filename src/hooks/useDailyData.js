import { useState, useEffect, useCallback } from "react";
import * as store from "../store";

export default function useDailyData(dateStr) {
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
