import React, { useEffect, useState, useRef } from 'react';
import {
  Clock,
  Coffee,
  LogIn,
  LogOut,
  Edit2,
  X,
  Check,
  Trash2,
  Timer,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
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
const STORAGE_KEY = 'office-tracker-v2';
const HISTORY_KEY = 'office-tracker-history-v2';
const DATE_KEY = 'office-tracker-date-v2';

const OFFICE_START = { hours: 9, minutes: 30 };
const BASE_BREAK_MINUTES = 60;
const REQUIRED_WORK_HOURS = 7;

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

const formatDateNice = () => {
  return new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  });
};

/* =========================
   COMPONENT
   ========================= */
export default function OfficeTimeTracker() {
  const [now, setNow] = useState(new Date());

  const [punchIn, setPunchIn] = useState(null);
  const [punchOut, setPunchOut] = useState(null);
  const [breaks, setBreaks] = useState([]);
  const [onBreak, setOnBreak] = useState(false);
  const [breakStart, setBreakStart] = useState(null);

  const [editMode, setEditMode] = useState(null);
  const [editValue, setEditValue] = useState('');

  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);

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
     Auto-reset at midnight
     ------------------------- */
  useEffect(() => {
    const check = () => {
      const savedDate = localStorage.getItem(DATE_KEY);
      const today = todayDateString();
      if (savedDate && savedDate !== today) {
        archiveAndResetIfNeeded(savedDate);
      }
    };
    const id = setInterval(check, 60 * 1000);
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

      setPunchIn(null);
      setPunchOut(null);
      setBreaks([]);
      setOnBreak(false);
      setBreakStart(null);
      setSummary(null);

      const today = todayDateString();
      localStorage.setItem(DATE_KEY, today);
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
  const isBreakExceeded = totalBreakUsed > totalAllowedBreak;
  const exceededMinutes = Math.max(0, totalBreakUsed - totalAllowedBreak);

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

    // Calculate if this break exceeds the limit
    const currentUsed = breaks.reduce((s, b) => s + (b.minutes || 0), 0);
    const totalAfterBreak = currentUsed + minutes;
    const willExceed = totalAfterBreak > totalAllowedBreak;
    const exceededBy = totalAfterBreak - totalAllowedBreak;

    // Allow the break to be submitted even if exceeded, but show warning
    if (willExceed) {
      const confirmSubmit = window.confirm(
        `⚠️ Break limit exceeded by ${formatDuration(exceededBy)}!\n\n` +
        `This break: ${formatDuration(minutes)}\n` +
        `Total used: ${formatDuration(totalAfterBreak)}\n` +
        `Allowed: ${formatDuration(totalAllowedBreak)}\n\n` +
        `The extra ${formatDuration(exceededBy)} will be deducted from your work hours.\n\n` +
        `Submit this break anyway?`
      );
      
      if (!confirmSubmit) {
        return; // User cancelled, stay on break
      }
    }

    setBreaks((prev) => [...prev, { start: breakStart, end, minutes }]);
    setOnBreak(false);
    setBreakStart(null);
  };

  /* -------------------------
     EDITING (punch & break)
     ------------------------- */
  const beginEdit = (payload) => {
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
     RENDER
     ------------------------- */
  const requiredMinutes = REQUIRED_WORK_HOURS * 60;

  const remainingCalc = (() => {
    if (!punchIn || punchOut) return null;
    const officeMinutesSoFar = minutesBetween(punchIn, now);
    const breakSoFar = getTotalBreakUsed();
    const workSoFar = Math.max(0, officeMinutesSoFar - breakSoFar);
    const remaining = Math.max(0, requiredMinutes - workSoFar);
    const estimatedEnd = new Date(now.getTime() + remaining * 60000);
    return { officeMinutesSoFar, breakSoFar, workSoFar, remaining, estimatedEnd };
  })();

  const getStatusBadge = () => {
    if (punchOut) return { text: 'Day Complete', class: 'badge-success', icon: CheckCircle2 };
    if (onBreak) return { text: 'On Break', class: 'badge-warning', icon: Coffee };
    if (punchIn) return { text: 'Working', class: 'badge-primary', icon: Timer };
    return { text: 'Not Started', class: 'badge-danger', icon: XCircle };
  };

  const status = getStatusBadge();
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-pattern p-4 md:p-8">
      <div className="max-w-4xl mx-auto stagger-children">
        {/* Header */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gradient">Time Tracker</h1>
                <p className="text-sm text-[var(--text-secondary)]">{formatDateNice()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`badge ${status.class}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.text}
              </span>
            </div>
          </div>

          {/* Live Clock */}
          <div className="text-center mb-8">
            <div className="time-display">{formatFull(now)}</div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <button
              onClick={handlePunchIn}
              disabled={!!punchIn && !punchOut}
              className="btn btn-success"
            >
              <LogIn className="w-6 h-6 mb-1" />
              <span>Punch In</span>
            </button>

            <button
              onClick={handlePunchOut}
              disabled={!punchIn || !!punchOut}
              className="btn btn-danger"
            >
              <LogOut className="w-6 h-6 mb-1" />
              <span>Punch Out</span>
            </button>

            <button
              onClick={handleBreakIn}
              disabled={!punchIn || !!punchOut || onBreak}
              className="btn btn-warning"
            >
              <Coffee className="w-6 h-6 mb-1" />
              <span>Break In</span>
            </button>

            <button
              onClick={handleBreakOut}
              disabled={!onBreak}
              className="btn btn-primary"
            >
              <Coffee className="w-6 h-6 mb-1" />
              <span>Break Out</span>
            </button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Punch Status */}
          <div className="status-card status-card-success">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title flex items-center gap-2 mb-0">
                <LogIn className="w-4 h-4" />
                Attendance
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Punch In</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg">{formatShort(punchIn)}</span>
                  {punchIn && (
                    <button onClick={() => beginEdit({ type: 'punchIn' })} className="icon-btn">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Punch Out</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg">{formatShort(punchOut)}</span>
                  {punchOut && (
                    <button onClick={() => beginEdit({ type: 'punchOut' })} className="icon-btn">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Break Status */}
          <div className={`status-card ${isBreakExceeded ? 'status-card-danger' : 'status-card-warning'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title flex items-center gap-2 mb-0">
                <Coffee className="w-4 h-4" />
                Break Time
              </h3>
              {isBreakExceeded && (
                <span className="badge badge-danger">
                  <AlertTriangle className="w-3 h-3" />
                  Exceeded
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Allowed</span>
                <span className="font-mono text-lg">{formatDuration(totalAllowedBreak)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">Used</span>
                <span className={`font-mono text-lg ${isBreakExceeded ? 'text-[var(--danger)]' : ''}`}>
                  {formatDuration(totalBreakUsed)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)]">
                  {isBreakExceeded ? 'Over by' : 'Remaining'}
                </span>
                <span className={`font-mono text-lg font-bold ${
                  isBreakExceeded 
                    ? 'text-[var(--danger)]' 
                    : breakRemainingMinutes <= 10 
                      ? 'text-[var(--warning)]' 
                      : 'text-[var(--success)]'
                }`}>
                  {isBreakExceeded ? formatDuration(exceededMinutes) : formatDuration(breakRemainingMinutes)}
                </span>
              </div>

              {onBreak && (
                <div className="mt-3 p-3 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/20">
                  <div className="flex items-center gap-2 text-[var(--warning)]">
                    <Timer className="w-4 h-4 animate-pulse" />
                    <span className="text-sm font-medium">On break since {formatShort(breakStart)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Work Progress */}
        {remainingCalc && (
          <div className="status-card status-card-primary mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title flex items-center gap-2 mb-0">
                <Sparkles className="w-4 h-4" />
                Work Progress
              </h3>
              <span className="text-sm text-[var(--text-muted)]">Required: {REQUIRED_WORK_HOURS}h</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="summary-card">
                <div className="text-xs text-[var(--text-muted)] mb-1">Completed</div>
                <div className="font-mono text-xl font-bold text-[var(--accent-secondary)]">
                  {formatDuration(remainingCalc.workSoFar)}
                </div>
              </div>

              <div className="summary-card">
                <div className="text-xs text-[var(--text-muted)] mb-1">Remaining</div>
                <div className="font-mono text-xl font-bold text-[var(--text-primary)]">
                  {formatDuration(remainingCalc.remaining)}
                </div>
              </div>

              <div className="summary-card">
                <div className="text-xs text-[var(--text-muted)] mb-1">Est. End</div>
                <div className="font-mono text-xl font-bold text-[var(--success)]">
                  {formatShort(remainingCalc.estimatedEnd)}
                </div>
              </div>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${Math.min((remainingCalc.workSoFar / requiredMinutes) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)]">
              <span>0h</span>
              <span className="font-medium text-[var(--accent-secondary)]">
                {Math.round((remainingCalc.workSoFar / requiredMinutes) * 100)}%
              </span>
              <span>{REQUIRED_WORK_HOURS}h</span>
            </div>
          </div>
        )}

        {/* Break Sessions */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title flex items-center gap-2 mb-0">
              <Coffee className="w-4 h-4" />
              Break Sessions
            </h3>
            <span className="text-sm text-[var(--text-muted)]">{breaks.length} recorded</span>
          </div>

          {breaks.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <Coffee className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No breaks recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {breaks.map((b, i) => (
                <div key={i} className="break-item">
                  <div className="flex items-center gap-4">
                    <span className="w-6 h-6 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-secondary)] text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span>{formatShort(b.start)}</span>
                      <span className="text-[var(--text-muted)]">→</span>
                      <span>{formatShort(b.end)}</span>
                    </div>
                    <span className="badge badge-warning">{formatDuration(b.minutes)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={() => beginEdit({ type: 'break', index: i, field: 'start' })} className="icon-btn">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => beginEdit({ type: 'break', index: i, field: 'end' })} className="icon-btn">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteBreak(i)} className="icon-btn icon-btn-danger">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editMode && (
          <div className="glass-card p-6 mb-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Edit Time</h3>
              <button onClick={cancelEdit} className="icon-btn">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="time"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg font-mono text-lg focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-glow)]"
              />
              <button onClick={saveEdit} className="btn btn-success py-2 px-4 flex-row gap-2">
                <Check className="w-5 h-5" />
                <span>Save</span>
              </button>
              <button onClick={cancelEdit} className="clear-btn">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Day Summary */}
        {summary && (
          <div className="glass-card p-6 mb-6">
            <h3 className="section-title flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Day Summary
            </h3>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="summary-card">
                <div className="text-xs text-[var(--text-muted)] mb-1">Office Time</div>
                <div className="font-mono text-xl font-bold">{formatDuration(summary.totalOfficeMinutes)}</div>
              </div>

              <div className="summary-card">
                <div className="text-xs text-[var(--text-muted)] mb-1">Break Time</div>
                <div className={`font-mono text-xl font-bold ${summary.breakMinutes > totalAllowedBreak ? 'text-[var(--danger)]' : 'text-[var(--warning)]'}`}>
                  {formatDuration(summary.breakMinutes)}
                </div>
              </div>

              <div className="summary-card">
                <div className="text-xs text-[var(--text-muted)] mb-1">Work Time</div>
                <div className={`font-mono text-xl font-bold ${summary.totalWork >= summary.requiredMinutes ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {formatDuration(summary.totalWork)}
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl text-center ${
              summary.totalWork >= summary.requiredMinutes 
                ? 'bg-[var(--success)]/10 border border-[var(--success)]/20' 
                : 'bg-[var(--danger)]/10 border border-[var(--danger)]/20'
            }`}>
              {summary.totalWork >= summary.requiredMinutes ? (
                <div className="flex items-center justify-center gap-2 text-[var(--success)] font-semibold">
                  <CheckCircle2 className="w-5 h-5" />
                  Required {REQUIRED_WORK_HOURS} hours completed!
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-[var(--danger)] font-semibold">
                  <AlertTriangle className="w-5 h-5" />
                  Short by {formatDuration(summary.requiredMinutes - summary.totalWork)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* History */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title flex items-center gap-2 mb-0">
              <CalendarDays className="w-4 h-4" />
              History
            </h3>
            <span className="text-sm text-[var(--text-muted)]">{history.length} days</span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No archived days yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.slice(-7).reverse().map((h, i) => (
                <div key={i} className="history-item">
                  <div>
                    <div className="font-medium">{h.date}</div>
                    <div className="text-sm text-[var(--text-muted)] font-mono">
                      {h.punchIn ? formatShort(h.punchIn) : '--:--'} → {h.punchOut ? formatShort(h.punchOut) : '--:--'}
                    </div>
                  </div>
                  <div className={`font-mono font-bold ${
                    h.summary && h.summary.totalWork >= REQUIRED_WORK_HOURS * 60 
                      ? 'text-[var(--success)]' 
                      : 'text-[var(--danger)]'
                  }`}>
                    {h.summary ? formatDuration(h.summary.totalWork) : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-center gap-3">
          <button onClick={clearToday} className="clear-btn">
            Clear Today
          </button>
          <button onClick={clearAll} className="clear-btn clear-btn-danger">
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}
