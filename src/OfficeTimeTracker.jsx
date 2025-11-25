import React, { useEffect, useState, useRef } from 'react';
import {
  Clock,
  Coffee,
  LogIn,
  LogOut,
  Edit2,
  X,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';

/**
 * OfficeTimeTracker.jsx
 *
 * Features:
 * - Office schedule: 9:30 - 17:30 (8h window)
 * - Required work hours: 7h
 * - Base break: 60 minutes, extra minutes if you arrive earlier than 9:30
 * - Multiple breaks allowed, limited by total allowed break
 * - Punch In / Punch Out / Break In / Break Out
 * - Edit times for punch and breaks
 * - LocalStorage persistence (versioned)
 * - Daily auto-reset with session-history stored
 * - Export CSV and clear data
 * - Hooks for optional cloud sync (commented)
 */

/* =========================
   CONFIG
   ========================= */
const STORAGE_KEY = 'office-tracker-v2'; // change version to force migrations
const HISTORY_KEY = 'office-tracker-history-v2';
const DATE_KEY = 'office-tracker-date-v2';

const OFFICE_START = { hours: 9, minutes: 30 };
const BASE_BREAK_MINUTES = 60;
const REQUIRED_WORK_HOURS = 7; // in hours

/* =========================
   UTILITIES
   ========================= */
const iso = (d) => (d ? new Date(d).toISOString() : null);
const fromIso = (s) => (s ? new Date(s) : null);

const minutesBetween = (a, b) => Math.max(0, Math.floor((b - a) / (1000 * 60)));

const formatShort = (d) =>
  d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';

const formatFull = (d) =>
  d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '--:--';

const formatDuration = (minutes) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const todayDateString = () => new Date().toDateString();

/* =========================
   COMPONENT
   ========================= */
export default function OfficeTimeTracker() {
  // Live clock
  const [now, setNow] = useState(new Date());

  // Primary state for current day
  const [punchIn, setPunchIn] = useState(null); // Date | null
  const [punchOut, setPunchOut] = useState(null); // Date | null
  const [breaks, setBreaks] = useState([]); // [{ start: Date, end: Date, minutes }]
  const [onBreak, setOnBreak] = useState(false);
  const [breakStart, setBreakStart] = useState(null); // Date | null

  // UI editing
  const [editMode, setEditMode] = useState(null); // {type: 'punchIn'|'punchOut'|'break', index, field:'start'|'end'}
  const [editValue, setEditValue] = useState(''); // "HH:MM"

  // Summary + derived
  const [summary, setSummary] = useState(null);

  // History of days
  const [history, setHistory] = useState([]); // array of day records

  // Loading flag orthogonally
  const initedRef = useRef(false);

  /* -------------------------
     Live clock
     ------------------------- */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  /* -------------------------
     Load data from localStorage
     ------------------------- */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const obj = JSON.parse(saved);
        setPunchIn(fromIso(obj.punchIn));
        setPunchOut(fromIso(obj.punchOut));
        setBreaks((obj.breaks || []).map((b) => ({ start: fromIso(b.start), end: fromIso(b.end), minutes: b.minutes })));
        setOnBreak(!!obj.onBreak);
        setBreakStart(fromIso(obj.breakStart));
      }

      const hist = localStorage.getItem(HISTORY_KEY);
      if (hist) setHistory(JSON.parse(hist));

      const savedDate = localStorage.getItem(DATE_KEY);
      const today = todayDateString();

      if (!savedDate) {
        localStorage.setItem(DATE_KEY, today);
      } else if (savedDate !== today) {
        // If we have today's data, but storage has older date, we want auto-archive
        // We'll perform a reset after archiving current day's data if any
        archiveAndResetIfNeeded(savedDate);
      }
    } catch (err) {
      console.error('Error loading storage', err);
    } finally {
      initedRef.current = true;
      recalcSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------
     Auto-save whenever core state changes
     ------------------------- */
  useEffect(() => {
    if (!initedRef.current) return;
    saveState();
    recalcSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [punchIn, punchOut, breaks, onBreak, breakStart]);

  /* -------------------------
     Auto-reset at midnight (simple approach: check once a minute)
     ------------------------- */
  useEffect(() => {
    const check = () => {
      const savedDate = localStorage.getItem(DATE_KEY);
      const today = todayDateString();
      if (savedDate && savedDate !== today) {
        archiveAndResetIfNeeded(savedDate);
      }
    };
    const id = setInterval(check, 60 * 1000); // every minute
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------
     Save current state to localStorage
     ------------------------- */
  const saveState = () => {
    try {
      const obj = {
        punchIn: iso(punchIn),
        punchOut: iso(punchOut),
        breaks: breaks.map((b) => ({ start: iso(b.start), end: iso(b.end), minutes: b.minutes })),
        onBreak,
        breakStart: iso(breakStart),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      localStorage.setItem(DATE_KEY, todayDateString());
    } catch (err) {
      console.error('Error saving state', err);
    }
  };

  /* -------------------------
     Archive today's record into history and reset for new day
     ------------------------- */
  const archiveAndResetIfNeeded = (savedDate) => {
    try {
      // If there is any meaningful data for savedDate, push to history
      if (punchIn || punchOut || (breaks && breaks.length > 0)) {
        const record = {
          date: savedDate,
          punchIn: iso(punchIn),
          punchOut: iso(punchOut),
          breaks: breaks.map((b) => ({ start: iso(b.start), end: iso(b.end), minutes: b.minutes })),
          summary: computeSummaryObject(punchIn, punchOut, breaks),
        };
        const newHist = [...history, record];
        setHistory(newHist);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHist));
      }

      // Clear current day state
      setPunchIn(null);
      setPunchOut(null);
      setBreaks([]);
      setOnBreak(false);
      setBreakStart(null);
      setSummary(null);

      // Update stored date to today
      const today = todayDateString();
      localStorage.setItem(DATE_KEY, today);
      // Clear storage key for the day
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Error archiving/resetting', err);
    }
  };

  /* -------------------------
     SUMMARY helpers
     ------------------------- */
  const computeSummaryObject = (pIn, pOut, brks) => {
    if (!pIn || !pOut) return null;

    const totalOfficeMinutes = minutesBetween(pIn, pOut);
    const breakMinutes = (brks || []).reduce((s, b) => s + (b.minutes || 0), 0);
    const totalWork = Math.max(0, totalOfficeMinutes - breakMinutes);
    const required = REQUIRED_WORK_HOURS * 60;

    return {
      totalOfficeMinutes,
      breakMinutes,
      totalWork,
      requiredMinutes: required,
    };
  };

  const recalcSummary = () => {
    const obj = computeSummaryObject(punchIn, punchOut, breaks);
    setSummary(obj);
  };

  /* -------------------------
     EARLY ARRIVAL & ALLOWED BREAK calculation
     ------------------------- */
  const earlyArrivalMinutes = punchIn
    ? Math.max(0, minutesBetween(punchIn, (() => {
        const ref = new Date(punchIn);
        ref.setHours(OFFICE_START.hours, OFFICE_START.minutes, 0, 0);
        return ref;
      })()))
    : 0;

  const totalAllowedBreak = BASE_BREAK_MINUTES + earlyArrivalMinutes;

  const getTotalBreakUsed = () => {
    const committed = breaks.reduce((s, b) => s + (b.minutes || 0), 0);
    if (onBreak && breakStart) {
      return committed + minutesBetween(breakStart, now);
    }
    return committed;
  };

  const totalBreakUsed = getTotalBreakUsed();
  const breakRemainingMinutes = Math.max(0, totalAllowedBreak - totalBreakUsed);

  /* -------------------------
     ACTION handlers (Punch/Break)
     ------------------------- */
  const handlePunchIn = () => {
    const nowDate = new Date();
    setPunchIn(nowDate);
    setPunchOut(null);
    setBreaks([]);
    setOnBreak(false);
    setBreakStart(null);
    setSummary(null);
  };

  const handlePunchOut = () => {
    if (!punchIn) {
      alert('Punch in first');
      return;
    }
    if (onBreak) {
      alert('End break before punching out');
      return;
    }

    const nowDate = new Date();
    setPunchOut(nowDate);

    // compute break minutes again in case there's ongoing break (shouldn't be because we check)
    const finalBreaks = breaks.slice();
    const obj = computeSummaryObject(punchIn, nowDate, finalBreaks);
    setSummary(obj);
  };

  const handleBreakIn = () => {
    if (!punchIn) {
      alert('Punch in first');
      return;
    }
    if (punchOut) {
      alert('Already punched out for the day');
      return;
    }
    if (onBreak) {
      alert('Already on break');
      return;
    }
    if (totalBreakUsed >= totalAllowedBreak) {
      alert(`No break remaining. Total allowed: ${formatDuration(totalAllowedBreak)}`);
      return;
    }
    setOnBreak(true);
    setBreakStart(new Date());
  };

  const handleBreakOut = () => {
    if (!onBreak || !breakStart) {
      alert('Not currently on a break');
      return;
    }
    const end = new Date();
    const minutes = minutesBetween(breakStart, end);

    // ensure minutes don't push over allowed
    if (getTotalBreakUsed() > totalAllowedBreak) {
      alert('Break limit exceeded');
      setOnBreak(false);
      setBreakStart(null);
      return;
    }

    setBreaks((prev) => [...prev, { start: breakStart, end, minutes }]);
    setOnBreak(false);
    setBreakStart(null);
  };

  /* -------------------------
     EDITING (punch & break)
     ------------------------- */
  const beginEdit = (payload) => {
    // payload examples:
    // { type: 'punchIn' }
    // { type: 'break', index: 0, field: 'start' }
    setEditMode(payload);
    if (payload.type === 'punchIn' && punchIn) setEditValue(formatTimeForInput(punchIn));
    else if (payload.type === 'punchOut' && punchOut) setEditValue(formatTimeForInput(punchOut));
    else if (payload.type === 'break' && typeof payload.index === 'number') {
      const br = breaks[payload.index];
      setEditValue(formatTimeForInput(payload.field === 'start' ? br.start : br.end));
    } else setEditValue('');
  };

  const cancelEdit = () => {
    setEditMode(null);
    setEditValue('');
  };

  const formatTimeForInput = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const parseInputToDate = (timeString, baseDate = new Date()) => {
    const [hh, mm] = (timeString || '').split(':').map((n) => parseInt(n, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    const d = new Date(baseDate);
    d.setHours(hh, mm, 0, 0);
    return d;
  };

  const saveEdit = () => {
    if (!editMode) return;
    if (!editValue) return cancelEdit();

    if (editMode.type === 'punchIn') {
      const newDate = parseInputToDate(editValue, punchIn || new Date());
      setPunchIn(newDate);
      // recompute summary if punchOut exists
      if (punchOut) setSummary(computeSummaryObject(newDate, punchOut, breaks));
    } else if (editMode.type === 'punchOut') {
      const newDate = parseInputToDate(editValue, punchOut || new Date());
      setPunchOut(newDate);
      if (punchIn) setSummary(computeSummaryObject(punchIn, newDate, breaks));
    } else if (editMode.type === 'break') {
      const idx = editMode.index;
      const field = editMode.field;
      const newDate = parseInputToDate(editValue, new Date());
      setBreaks((prev) => {
        const copy = prev.map((b) => ({ ...b }));
        if (!copy[idx]) return prev;
        if (field === 'start') copy[idx].start = newDate;
        else copy[idx].end = newDate;
        // recalc minutes if both present
        if (copy[idx].start && copy[idx].end) {
          copy[idx].minutes = minutesBetween(copy[idx].start, copy[idx].end);
        } else {
          copy[idx].minutes = 0;
        }
        return copy;
      });
      if (punchIn && punchOut) setSummary(computeSummaryObject(punchIn, punchOut, breaks));
    }

    cancelEdit();
  };

  /* -------------------------
     Delete break session
     ------------------------- */
  const deleteBreak = (index) => {
    if (!window.confirm('Delete this break session?')) return;
    setBreaks((prev) => prev.filter((_, i) => i !== index));
  };

  /* -------------------------
     Export CSV / History
     ------------------------- */
  const exportCSV = (fullHistory = false) => {
    const rows = [];
    if (fullHistory) {
      rows.push(['Date', 'Punch In', 'Punch Out', 'Total Office', 'Break Minutes', 'Work Minutes']);
      history.forEach((rec) => {
        const s = rec.summary || computeSummaryObject(fromIso(rec.punchIn), fromIso(rec.punchOut), (rec.breaks || []).map((b) => ({ minutes: b.minutes })));
        rows.push([
          rec.date,
          rec.punchIn ? new Date(rec.punchIn).toISOString() : '',
          rec.punchOut ? new Date(rec.punchOut).toISOString() : '',
          s ? formatDuration(s.totalOfficeMinutes) : '',
          s ? s.breakMinutes : '',
          s ? formatDuration(s.totalWork) : '',
        ]);
      });
    } else {
      // current day
      const s = computeSummaryObject(punchIn, punchOut, breaks);
      rows.push(['Date', 'Punch In', 'Punch Out', 'Total Office', 'Break Minutes', 'Work Minutes']);
      rows.push([
        todayDateString(),
        punchIn ? iso(punchIn) : '',
        punchOut ? iso(punchOut) : '',
        s ? formatDuration(s.totalOfficeMinutes) : '',
        s ? s.breakMinutes : '',
        s ? formatDuration(s.totalWork) : '',
      ]);
      // also add break sessions
      if (breaks.length > 0) {
        rows.push([]);
        rows.push(['Break #', 'Start', 'End', 'Minutes']);
        breaks.forEach((b, i) => {
          rows.push([i + 1, b.start ? iso(b.start) : '', b.end ? iso(b.end) : '', b.minutes || 0]);
        });
      }
    }

    // Build CSV
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fullHistory ? 'office_history.csv' : `office_${todayDateString().replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* -------------------------
     Clear / Reset functions
     ------------------------- */
  const clearToday = () => {
    if (!window.confirm('Clear today data? This will not remove history.')) return;
    setPunchIn(null);
    setPunchOut(null);
    setBreaks([]);
    setOnBreak(false);
    setBreakStart(null);
    setSummary(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const clearAll = () => {
    if (!window.confirm('Clear ALL data and history?')) return;
    setPunchIn(null);
    setPunchOut(null);
    setBreaks([]);
    setOnBreak(false);
    setBreakStart(null);
    setSummary(null);
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(DATE_KEY);
  };

  /* -------------------------
     Optional Cloud Sync Hooks (stubs)
     ------------------------- */
  // const syncToCloud = async (payload) => {
  //   // Example: push to Firebase / Supabase
  //   // await firebase.collection('attendance').add(payload)
  // };

  /* -------------------------
     RENDER
     ------------------------- */
  const requiredMinutes = REQUIRED_WORK_HOURS * 60;

  // Remaining calculation when user is still working
  const remainingCalc = (() => {
    if (!punchIn || punchOut) return null;
    const officeMinutesSoFar = minutesBetween(punchIn, now);
    const breakSoFar = getTotalBreakUsed();
    const workSoFar = Math.max(0, officeMinutesSoFar - breakSoFar);
    const remaining = Math.max(0, requiredMinutes - workSoFar);
    const estimatedEnd = new Date(now.getTime() + remaining * 60000);
    return { officeMinutesSoFar, breakSoFar, workSoFar, remaining, estimatedEnd };
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-indigo-600" />
              <div>
                <div className="text-xl md:text-2xl font-semibold">{formatFull(now)}</div>
                <div className="text-sm text-gray-500"></div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={clearToday} className="px-3 py-2 bg-yellow-50 rounded hover:bg-yellow-100">
                Clear Today
              </button>
              <button onClick={clearAll} className="px-3 py-2 bg-red-50 rounded hover:bg-red-100">
                Clear All
              </button>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <button
              onClick={handlePunchIn}
              disabled={!!punchIn && !punchOut}
              className="flex flex-col items-center p-3 bg-green-500 text-white rounded-lg hover:scale-[1.02] disabled:bg-gray-200"
            >
              <LogIn className="w-6 h-6" />
              <span className="mt-1 font-semibold">Punch In</span>
            </button>

            <button
              onClick={handlePunchOut}
              disabled={!punchIn || !!punchOut}
              className="flex flex-col items-center p-3 bg-red-500 text-white rounded-lg hover:scale-[1.02] disabled:bg-gray-200"
            >
              <LogOut className="w-6 h-6" />
              <span className="mt-1 font-semibold">Punch Out</span>
            </button>

            <button
              onClick={handleBreakIn}
              disabled={!punchIn || !!punchOut || onBreak}
              className="flex flex-col items-center p-3 bg-amber-400 text-white rounded-lg hover:scale-[1.02] disabled:bg-gray-200"
            >
              <Coffee className="w-6 h-6" />
              <span className="mt-1 font-semibold">Break In</span>
            </button>

            <button
              onClick={handleBreakOut}
              disabled={!onBreak}
              className="flex flex-col items-center p-3 bg-blue-500 text-white rounded-lg hover:scale-[1.02] disabled:bg-gray-200"
            >
              <Coffee className="w-6 h-6" />
              <span className="mt-1 font-semibold">Break Out</span>
            </button>
          </div>

          {/* STATUS CARDS */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Punch card */}
            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
              <div className="flex justify-between items-center mb-3">
                <div className="font-semibold text-green-700">Punch</div>
                <div className="text-sm text-gray-500">Entry / Exit</div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>In:</div>
                  <div className="flex items-center gap-2">
                    <div className="font-mono">{formatShort(punchIn)}</div>
                    {punchIn && (
                      <button onClick={() => beginEdit({ type: 'punchIn' })} className="p-1 text-gray-500">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>Out:</div>
                  <div className="flex items-center gap-2">
                    <div className="font-mono">{formatShort(punchOut)}</div>
                    {punchOut && (
                      <button onClick={() => beginEdit({ type: 'punchOut' })} className="p-1 text-gray-500">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {earlyArrivalMinutes > 0 && (
                  <div className="text-sm text-green-700">
                    ⭐ Early by {formatDuration(earlyArrivalMinutes)} (added to break allowance)
                  </div>
                )}
              </div>
            </div>

            {/* Break card */}
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
              <div className="flex justify-between items-center mb-3">
                <div className="font-semibold text-amber-700">Break</div>
                <div className="text-sm text-gray-500">Allowed / Used / Remaining</div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <div>Allowed</div>
                  <div className="font-mono">{formatDuration(totalAllowedBreak)}</div>
                </div>
                <div className="flex justify-between">
                  <div>Used</div>
                  <div className="font-mono">{formatDuration(totalBreakUsed)}</div>
                </div>
                <div className="flex justify-between">
                  <div>Remaining</div>
                  <div className={`font-mono ${breakRemainingMinutes <= 10 ? 'text-red-600' : 'text-green-700'}`}>
                    {formatDuration(breakRemainingMinutes)}
                  </div>
                </div>

                {onBreak && (
                  <div className="mt-2 text-sm text-amber-700">⏱️ On break since {formatShort(breakStart)}</div>
                )}
              </div>
            </div>
          </div>

          {/* Remaining / Progress */}
          {remainingCalc && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 mb-6">
              <div className="flex justify-between items-center mb-3">
                <div className="font-semibold text-blue-700">Work Progress</div>
                <div className="text-sm text-gray-500">Required: {REQUIRED_WORK_HOURS}h</div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <div>Completed</div>
                <div className="font-mono">{formatDuration(remainingCalc.workSoFar)}</div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <div>Remaining</div>
                <div className="font-bold text-lg">{formatDuration(remainingCalc.remaining)}</div>
              </div>

              <div className="flex justify-between items-center">
                <div>Estimated Punch Out</div>
                <div className="font-mono">{formatShort(remainingCalc.estimatedEnd)}</div>
              </div>

              <div className="mt-3">
                <div className="w-full bg-blue-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min((remainingCalc.workSoFar / (REQUIRED_WORK_HOURS * 60)) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-right text-xs mt-1 text-gray-600">
                  {Math.round((remainingCalc.workSoFar / (REQUIRED_WORK_HOURS * 60)) * 100)}% of {REQUIRED_WORK_HOURS}h
                </div>
              </div>
            </div>
          )}

          {/* Break history + edit */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <div className="font-semibold text-gray-700">Break Sessions</div>
              <div className="text-sm text-gray-500">{breaks.length} recorded</div>
            </div>

            {breaks.length === 0 ? (
              <div className="text-gray-500">No breaks yet</div>
            ) : (
              <div className="space-y-2">
                {breaks.map((b, i) => (
                  <div key={i} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="font-mono">{formatShort(b.start)}</div>
                      <div className="text-gray-300">—</div>
                      <div className="font-mono">{formatShort(b.end)}</div>
                      <div className="text-sm text-gray-500">({formatDuration(b.minutes)})</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => beginEdit({ type: 'break', index: i, field: 'start' })} className="p-1 text-gray-500">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => beginEdit({ type: 'break', index: i, field: 'end' })} className="p-1 text-gray-500">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteBreak(i)} className="p-1 text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edit modal / inline */}
          {editMode && (
            <div className="mb-6 p-3 bg-white rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">Edit time</div>
                <div>
                  <button onClick={cancelEdit} className="p-1 text-gray-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="time" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="px-2 py-1 border rounded" />
                <button onClick={saveEdit} className="px-3 py-1 bg-green-500 text-white rounded">
                  <Check className="w-4 h-4 inline" /> Save
                </button>
                <button onClick={cancelEdit} className="px-3 py-1 bg-gray-200 rounded">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Summary */}
          {summary ? (
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-lg">
                  <div className="text-sm text-gray-500">Office Time</div>
                  <div className="font-semibold">{formatDuration(summary.totalOfficeMinutes)}</div>
                </div>

                <div className="p-3 bg-white rounded-lg">
                  <div className="text-sm text-gray-500">Break Time</div>
                  <div className="font-semibold text-amber-600">{formatDuration(summary.breakMinutes)}</div>
                </div>

                <div className="p-3 bg-white rounded-lg">
                  <div className="text-sm text-gray-500">Work</div>
                  <div className={`font-semibold ${summary.totalWork >= summary.requiredMinutes ? 'text-green-600' : 'text-red-600'}`}>
                    {formatDuration(summary.totalWork)}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-center">
                {summary.totalWork >= summary.requiredMinutes ? (
                  <div className="text-green-600 font-semibold">✅ Required 7 hours completed</div>
                ) : (
                  <div className="text-red-600 font-semibold">⚠️ Short by {formatDuration(summary.requiredMinutes - summary.totalWork)}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Punch in and punch out to see the summary here.</div>
          )}

          {/* HISTORY PREVIEW */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">History</div>
              <div className="text-sm text-gray-500">{history.length} days</div>
            </div>

            {history.length === 0 ? (
              <div className="text-gray-500">No archived days yet</div>
            ) : (
              <div className="space-y-2">
                {history.slice(-10).reverse().map((h, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg border">
                    <div>
                      <div className="font-medium">{h.date}</div>
                      <div className="text-sm text-gray-500">{h.punchIn ? formatShort(h.punchIn) : '--'} — {h.punchOut ? formatShort(h.punchOut) : '--'}</div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {h.summary ? formatDuration(h.summary.totalWork) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
