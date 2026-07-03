import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
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
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  History,
} from 'lucide-react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimeClock } from '@mui/x-date-pickers/TimeClock';
import dayjs from 'dayjs';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ActionButtons from './components/ActionButtons';
import BreakSessions from './components/BreakSessions';
import WorkProgress from './components/WorkProgress';
import DaySummary from './components/DaySummary';
import StatusCard from './components/StatusCard';
import ConfirmModal from './components/ConfirmModal';
import EditModal from './components/EditModal';
import { useToast, ToastContainer } from './components/Toast';

const muiDarkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#10b981',
    },
    background: {
      paper: 'transparent',
      default: 'transparent',
    },
    text: {
      primary: '#f4f4f5',
      secondary: '#a1a1aa',
    },
  },
});

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
const MAX_HISTORY_DAYS = 2;

import { 
  iso, 
  fromIso, 
  minutesBetween, 
  formatShort, 
  formatFull, 
  formatDuration, 
  todayDateString, 
  formatDateNice 
} from './utils';

/* =========================
   COMPONENT
   ========================= */
export default function OfficeTimeTracker({ onNavigateHistory }) {
  const [now, setNow] = useState(new Date());
  const toast = useToast();

  const [punchIn, setPunchIn] = useState(null);
  const [punchOut, setPunchOut] = useState(null);
  const [breaks, setBreaks] = useState([]);
  const [onBreak, setOnBreak] = useState(false);
  const [breakStart, setBreakStart] = useState(null);

  const [editMode, setEditMode] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const [pickerHour, setPickerHour] = useState(12);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerPeriod, setPickerPeriod] = useState('AM');
  const [pickerTab, setPickerTab] = useState('hour');

  useEffect(() => {
    if (editValue && editValue.includes(':')) {
      const [hh, mm] = editValue.split(':').map(Number);
      if (!isNaN(hh) && !isNaN(mm)) {
        const h12 = hh % 12 === 0 ? 12 : hh % 12;
        const period = hh >= 12 ? 'PM' : 'AM';
        if (h12 !== pickerHour || mm !== pickerMinute || period !== pickerPeriod) {
          setPickerHour(h12);
          setPickerMinute(mm);
          setPickerPeriod(period);
        }
      }
    }
  }, [editValue, pickerHour, pickerMinute, pickerPeriod]);

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
      if (hist) {
        setHistory(JSON.parse(hist));
      }

      const savedDate = localStorage.getItem(DATE_KEY);
      const today = todayDateString();

      if (!savedDate) {
        localStorage.setItem(DATE_KEY, today);
      } else if (savedDate !== today) {
        // Defer archive to next tick so state from above has committed
        setTimeout(() => {
          archiveAndResetIfNeeded(savedDate);
        }, 0);
      }
    } catch (err) {
      console.error('Error loading storage', err);
    } finally {
      // Defer setting initedRef so auto-save doesn't fire on initial load with empty state
      setTimeout(() => {
        initedRef.current = true;
        recalcSummary();
      }, 0);
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
  }, []);

  /* -------------------------
     Disable page scroll when time editor modal is open
     ------------------------- */
  useEffect(() => {
    if (editMode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [editMode]);

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
        const newHist = [...history, record].slice(-MAX_HISTORY_DAYS);
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
      toast.show('Punch in first');
      return;
    }
    if (onBreak) {
      toast.show('End break before punching out', 'warning');
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
      toast.show('Punch in first');
      return;
    }
    if (punchOut) {
      toast.show('Already punched out for the day');
      return;
    }
    if (onBreak) {
      toast.show('Already on break', 'warning');
      return;
    }
    setOnBreak(true);
    const start = new Date();
    setBreakStart(start);
  };

  const handleBreakOut = () => {
    if (!onBreak || !breakStart) {
      toast.show('Not currently on a break');
      return;
    }
    const end = new Date();
    const minutes = minutesBetween(breakStart, end);

    // Calculate if this break exceeds the limit
    const currentUsed = breaks.reduce((s, b) => s + (b.minutes || 0), 0);
    const totalAfterBreak = currentUsed + minutes;
    const willExceed = totalAfterBreak > totalAllowedBreak;
    const exceededBy = totalAfterBreak - totalAllowedBreak;

    // Allow the break to be submitted even if exceeded, but show warning confirm
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
    setPickerTab('hour');
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

  const getDayjsValue = () => {
    if (!editValue) return dayjs();
    const [hh, mm] = editValue.split(':').map(Number);
    if (isNaN(hh) || isNaN(mm)) return dayjs();
    return dayjs().hour(hh).minute(mm).second(0).millisecond(0);
  };

  const togglePeriod = (targetPeriod) => {
    if (!editValue) return;
    const [hhStr, mmStr] = editValue.split(':');
    let hh = parseInt(hhStr, 10);
    const currentPeriod = hh >= 12 ? 'PM' : 'AM';
    if (currentPeriod === targetPeriod) return;

    if (targetPeriod === 'AM') {
      hh = hh - 12;
    } else {
      hh = hh + 12;
    }
    setEditValue(`${String(hh).padStart(2, '0')}:${mmStr}`);
  };

  const formatSelectedTime = (val) => {
    if (!val) return '';
    const [hhStr, mmStr] = val.split(':');
    const hh = parseInt(hhStr, 10);
    const mm = parseInt(mmStr, 10);
    if (isNaN(hh) || isNaN(mm)) return '';
    const period = hh >= 12 ? 'PM' : 'AM';
    const displayHour = hh % 12 === 0 ? 12 : hh % 12;
    return `${String(displayHour).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${period}`;
  };

  const requestConfirm = (title, message, onConfirm, isDanger = false) => {
    setConfirmAction({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmAction(null);
      },
      isDanger
    });
  };

  /* -------------------------
     Delete break session
     ------------------------- */
  const deleteBreak = (index) => {
    requestConfirm(
      'Delete Session',
      'Are you sure you want to delete this break session?',
      () => {
        setBreaks((prev) => prev.filter((_, i) => i !== index));
      },
      true
    );
  };

  /* -------------------------
     Clear / Reset functions
     ------------------------- */
  const clearToday = () => {
    requestConfirm(
      'Reset Today',
      'Clear all punch times and break sessions for today? (This will not delete history)',
      () => {
        setPunchIn(null);
        setPunchOut(null);
        setBreaks([]);
        setOnBreak(false);
        setBreakStart(null);
        setSummary(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    );
  };

  const clearAll = () => {
    requestConfirm(
      'Clear All Data',
      'This will permanently delete all records, including your entire work history. This action cannot be undone.',
      () => {
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
      },
      true
    );
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

  const expectedBreakEndTime = (() => {
    if (!onBreak || !breakStart) return null;
    const committed = breaks.reduce((s, b) => s + (b.minutes || 0), 0);
    const budgetAtStart = totalAllowedBreak - committed;
    return new Date(breakStart.getTime() + budgetAtStart * 60000);
  })();

  const getStatusBadge = () => {
    if (punchOut) return { text: 'Day Complete', class: 'badge-success', icon: CheckCircle2 };
    if (onBreak) return { text: 'On Break', class: 'badge-warning', icon: Coffee };
    if (punchIn) return { text: 'Working', class: 'badge-primary', icon: Timer };
    return { text: 'Not Started', class: 'badge-danger', icon: XCircle };
  };

  const status = getStatusBadge();
  const StatusIcon = status.icon;

  const pageRef = useRef(null);

  useEffect(() => {
    if (!pageRef.current) return;
    gsap.fromTo(
      pageRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.5, ease: 'power2.out' }
    );
  }, []);

  return (
    <div className="min-h-screen bg-pattern p-4 md:p-6 flex flex-col" ref={pageRef}>
      <div className="max-w-4xl mx-auto flex-1 flex flex-col justify-between w-full">
        <div className="w-full">
          {/* Header */}
          <ActionButtons
            punchIn={punchIn}
            punchOut={punchOut}
            onBreak={onBreak}
            onPunchIn={handlePunchIn}
            onPunchOut={handlePunchOut}
            onBreakIn={handleBreakIn}
            onBreakOut={handleBreakOut}
          />

        {/* Unified Status Card */}
        <StatusCard
          punchIn={punchIn}
          punchOut={punchOut}
          totalAllowedBreak={totalAllowedBreak}
          totalBreakUsed={totalBreakUsed}
          isBreakExceeded={isBreakExceeded}
          breakRemainingMinutes={breakRemainingMinutes}
          exceededMinutes={exceededMinutes}
          beginEdit={beginEdit}
        />

        {/* Break Sessions */}
        <BreakSessions
          breaks={breaks}
          onBreak={onBreak}
          breakStart={breakStart}
          now={now}
          expectedBreakEndTime={expectedBreakEndTime}
          beginEdit={beginEdit}
          deleteBreak={deleteBreak}
        />

        {/* Work Progress */}
        <WorkProgress remainingCalc={remainingCalc} requiredMinutes={REQUIRED_WORK_HOURS * 60} />

        {/* Day Summary */}
        <DaySummary
          summary={summary}
          totalAllowedBreak={totalAllowedBreak}
          requiredWorkHours={REQUIRED_WORK_HOURS}
        />




        </div>

        {/* Footer Actions */}
        <div className="flex justify-center gap-3 mt-6">
          {onNavigateHistory && (
            <button
              onClick={onNavigateHistory}
              className="clear-btn whitespace-nowrap"
            >
              History
            </button>
          )}
          <button
            onClick={clearToday}
            className="clear-btn whitespace-nowrap"
          >
            Reset
          </button>
        </div>

        <EditModal
          editMode={editMode}
          editValue={editValue}
          pickerTab={pickerTab}
          pickerHour={pickerHour}
          pickerMinute={pickerMinute}
          setEditValue={setEditValue}
          saveEdit={saveEdit}
          cancelEdit={cancelEdit}
          setPickerTab={setPickerTab}
          togglePeriod={togglePeriod}
          formatSelectedTime={formatSelectedTime}
          muiDarkTheme={muiDarkTheme}
        />

        <ConfirmModal confirmAction={confirmAction} setConfirmAction={setConfirmAction} />
        <ToastContainer toasts={toast.toasts} />
      </div>
    </div>
  );
}
