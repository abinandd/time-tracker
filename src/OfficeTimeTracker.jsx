import React, { useState, useEffect } from 'react';
import { Clock, Coffee, LogIn, LogOut, Edit2, X, Check } from 'lucide-react';

export default function OfficeTimeTracker() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punchInTime, setPunchInTime] = useState(null);
  const [punchOutTime, setPunchOutTime] = useState(null);
  const [breakSessions, setBreakSessions] = useState([]);
  const [onBreak, setOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState(null);
  const [summary, setSummary] = useState(null);
  const [editMode, setEditMode] = useState(null); // null, 'punchIn', 'punchOut', or 'break-{index}'
  const [editTime, setEditTime] = useState('');

  const OFFICE_START = { hours: 9, minutes: 30 };
  const BASE_BREAK_MINUTES = 60;
  const REQUIRED_WORK_HOURS = 7;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  const formatTimeShort = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatTimeForInput = (date) => {
    if (!date) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const parseTimeInput = (timeString, baseDate = new Date()) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const newDate = new Date(baseDate);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };

  const startEdit = (type, currentValue) => {
    setEditMode(type);
    setEditTime(formatTimeForInput(currentValue));
  };

  const cancelEdit = () => {
    setEditMode(null);
    setEditTime('');
  };

  const saveEdit = () => {
    if (!editTime) {
      cancelEdit();
      return;
    }

    const newTime = parseTimeInput(editTime, currentTime);

    if (editMode === 'punchIn') {
      setPunchInTime(newTime);
      // Recalculate summary if punch out exists
      if (punchOutTime) {
        calculateSummary(newTime, punchOutTime);
      }
    } else if (editMode === 'punchOut') {
      setPunchOutTime(newTime);
      // Recalculate summary
      if (punchInTime) {
        calculateSummary(punchInTime, newTime);
      }
    } else if (editMode.startsWith('break-')) {
      const index = parseInt(editMode.split('-')[1]);
      const sessionType = editMode.split('-')[2]; // 'start' or 'end'
      
      const updatedSessions = [...breakSessions];
      if (sessionType === 'start') {
        updatedSessions[index].start = newTime;
      } else {
        updatedSessions[index].end = newTime;
      }
      // Recalculate duration
      updatedSessions[index].duration = getMinutesDifference(
        updatedSessions[index].start,
        updatedSessions[index].end
      );
      setBreakSessions(updatedSessions);
      
      // Recalculate summary if exists
      if (punchInTime && punchOutTime) {
        calculateSummaryWithBreaks(punchInTime, punchOutTime, updatedSessions);
      }
    }

    cancelEdit();
  };

  const calculateSummary = (punchIn, punchOut) => {
    const totalOfficeMinutes = getMinutesDifference(punchIn, punchOut);
    const totalBreakMinutes = breakSessions.reduce((sum, session) => sum + session.duration, 0);
    const totalWorkMinutes = totalOfficeMinutes - totalBreakMinutes;

    setSummary({
      totalOfficeTime: formatDuration(totalOfficeMinutes),
      totalBreakTime: formatDuration(totalBreakMinutes),
      totalWorkTime: formatDuration(totalWorkMinutes),
      requiredWork: REQUIRED_WORK_HOURS * 60,
      actualWork: totalWorkMinutes
    });
  };

  const calculateSummaryWithBreaks = (punchIn, punchOut, breaks) => {
    const totalOfficeMinutes = getMinutesDifference(punchIn, punchOut);
    const totalBreakMinutes = breaks.reduce((sum, session) => sum + session.duration, 0);
    const totalWorkMinutes = totalOfficeMinutes - totalBreakMinutes;

    setSummary({
      totalOfficeTime: formatDuration(totalOfficeMinutes),
      totalBreakTime: formatDuration(totalBreakMinutes),
      totalWorkTime: formatDuration(totalWorkMinutes),
      requiredWork: REQUIRED_WORK_HOURS * 60,
      actualWork: totalWorkMinutes
    });
  };

  const getMinutesDifference = (start, end) => {
    return Math.floor((end - start) / (1000 * 60));
  };

  const calculateEarlyArrival = (punchIn) => {
    const officeStartTime = new Date(punchIn);
    officeStartTime.setHours(OFFICE_START.hours, OFFICE_START.minutes, 0, 0);
    
    if (punchIn < officeStartTime) {
      return getMinutesDifference(punchIn, officeStartTime);
    }
    return 0;
  };

  const getTotalAllowedBreak = () => {
    if (!punchInTime) return BASE_BREAK_MINUTES;
    const earlyMinutes = calculateEarlyArrival(punchInTime);
    return BASE_BREAK_MINUTES + earlyMinutes;
  };

  const getTotalBreakUsed = () => {
    let total = breakSessions.reduce((sum, session) => sum + session.duration, 0);
    
    if (onBreak && breakStartTime) {
      total += getMinutesDifference(breakStartTime, currentTime);
    }
    
    return total;
  };

  const formatDuration = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handlePunchIn = () => {
    const now = new Date();
    setPunchInTime(now);
    setPunchOutTime(null);
    setBreakSessions([]);
    setOnBreak(false);
    setBreakStartTime(null);
    setSummary(null);
  };

  const handlePunchOut = () => {
    if (!punchInTime) {
      alert('Please punch in first!');
      return;
    }

    if (onBreak) {
      alert('Please end your break before punching out!');
      return;
    }

    const now = new Date();
    setPunchOutTime(now);
    calculateSummary(punchInTime, now);
  };

  const handleBreakIn = () => {
    if (!punchInTime) {
      alert('Please punch in first!');
      return;
    }

    if (punchOutTime) {
      alert('You have already punched out!');
      return;
    }

    if (onBreak) {
      alert('You are already on break!');
      return;
    }

    const totalUsed = getTotalBreakUsed();
    const allowed = getTotalAllowedBreak();

    if (totalUsed >= allowed) {
      alert(`Break time exceeded! You have used all ${formatDuration(allowed)} of break time.`);
      return;
    }

    setOnBreak(true);
    setBreakStartTime(new Date());
  };

  const handleBreakOut = () => {
    if (!onBreak) {
      alert('You are not on break!');
      return;
    }

    const now = new Date();
    const duration = getMinutesDifference(breakStartTime, now);
    
    setBreakSessions([...breakSessions, {
      start: breakStartTime,
      end: now,
      duration: duration
    }]);

    setOnBreak(false);
    setBreakStartTime(null);
  };

  const earlyArrivalMinutes = punchInTime ? calculateEarlyArrival(punchInTime) : 0;
  const totalAllowedBreak = getTotalAllowedBreak();
  const totalBreakUsed = getTotalBreakUsed();
  const breakRemaining = Math.max(0, totalAllowedBreak - totalBreakUsed);

  // Calculate remaining time until work completion
  const getRemainingTime = () => {
    if (!punchInTime || punchOutTime) return null;
    
    const now = currentTime;
    const totalOfficeMinutes = getMinutesDifference(punchInTime, now);
    const totalBreakMinutes = getTotalBreakUsed();
    const totalWorkMinutes = totalOfficeMinutes - totalBreakMinutes;
    const requiredMinutes = REQUIRED_WORK_HOURS * 60;
    const remainingMinutes = Math.max(0, requiredMinutes - totalWorkMinutes);
    
    // Calculate estimated punch out time
    const estimatedPunchOut = new Date(now.getTime() + remainingMinutes * 60000);
    
    return {
      remainingMinutes,
      workCompleted: totalWorkMinutes,
      estimatedPunchOut
    };
  };

  const remainingInfo = getRemainingTime();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 mb-6">
          <div className="text-center mb-8">

            <div className="flex items-center justify-center gap-2 text-2xl md:text-3xl font-mono text-black font-bold">
              <Clock className="w-8 h-8" />
              {formatTime(currentTime)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <button
              onClick={handlePunchIn}
              disabled={punchInTime && !punchOutTime}
              className="flex flex-col items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95"
            >
              <LogIn className="w-6 h-6" />
              Punch In
            </button>

            <button
              onClick={handlePunchOut}
              disabled={!punchInTime || punchOutTime}
              className="flex flex-col items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95"
            >
              <LogOut className="w-6 h-6" />
              Punch Out
            </button>

            <button
              onClick={handleBreakIn}
              disabled={!punchInTime || punchOutTime || onBreak}
              className="flex flex-col items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95"
            >
              <Coffee className="w-6 h-6" />
              Break In
            </button>

            <button
              onClick={handleBreakOut}
              disabled={!onBreak}
              className="flex flex-col items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95"
            >
              <Coffee className="w-6 h-6" />
              Break Out
            </button>
          </div>

          {/* Status Cards */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Punch Status */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border-2 border-green-200">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <LogIn className="w-5 h-5 text-green-600" />
                Punch Status
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Punch In:</span>
                  <div className="flex items-center gap-2">
                    {editMode === 'punchIn' ? (
                      <>
                        <input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="px-2 py-1 border-2 border-green-400 rounded font-mono text-sm"
                        />
                        <button onClick={saveEdit} className="p-1 bg-green-500 text-white rounded hover:bg-green-600">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEdit} className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-mono font-semibold text-green-700">
                          {punchInTime ? formatTimeShort(punchInTime) : '--:--'}
                        </span>
                        {punchInTime && (
                          <button 
                            onClick={() => startEdit('punchIn', punchInTime)}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Punch Out:</span>
                  <div className="flex items-center gap-2">
                    {editMode === 'punchOut' ? (
                      <>
                        <input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="px-2 py-1 border-2 border-red-400 rounded font-mono text-sm"
                        />
                        <button onClick={saveEdit} className="p-1 bg-green-500 text-white rounded hover:bg-green-600">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEdit} className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-mono font-semibold text-red-700">
                          {punchOutTime ? formatTimeShort(punchOutTime) : '--:--'}
                        </span>
                        {punchOutTime && (
                          <button 
                            onClick={() => startEdit('punchOut', punchOutTime)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {earlyArrivalMinutes > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-300">
                    <div className="text-sm text-green-700 font-medium">
                      ⭐ Early by {formatDuration(earlyArrivalMinutes)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Break Status */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border-2 border-amber-200">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-600" />
                Break Status
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Allowed:</span>
                  <span className="font-semibold text-gray-800">
                    {formatDuration(totalAllowedBreak)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Used:</span>
                  <span className="font-semibold text-amber-700">
                    {formatDuration(totalBreakUsed)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Remaining:</span>
                  <span className={`font-semibold ${breakRemaining <= 10 ? 'text-red-600' : 'text-green-700'}`}>
                    {formatDuration(breakRemaining)}
                  </span>
                </div>
                {onBreak && (
                  <div className="mt-3 pt-3 border-t border-amber-300">
                    <div className="text-sm text-amber-700 font-medium animate-pulse">
                      ☕ Currently on break
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Remaining Time Card */}
          {remainingInfo && remainingInfo.remainingMinutes > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border-2 border-blue-200 mb-6">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Work Progress
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Work Completed:</span>
                  <span className="font-semibold text-blue-700">
                    {formatDuration(remainingInfo.workCompleted)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Time Remaining:</span>
                  <span className="font-bold text-lg text-blue-800">
                    {formatDuration(remainingInfo.remainingMinutes)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Estimated Punch Out:</span>
                  <span className="font-semibold text-blue-700">
                    {formatTimeShort(remainingInfo.estimatedPunchOut)}
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>0h</span>
                    <span>7h</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((remainingInfo.workCompleted / 420) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-center mt-2 font-semibold text-blue-700">
                    {Math.round((remainingInfo.workCompleted / 420) * 100)}% Complete
                  </div>
                </div>
              </div>
            </div>
          )}

          {remainingInfo && remainingInfo.remainingMinutes === 0 && !punchOutTime && (
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border-2 border-green-200 mb-6 text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                🎉 7 Hours Completed!
              </div>
              <div className="text-gray-600">
                You can punch out now or continue working.
              </div>
            </div>
          )}

          {/* Break Sessions */}
          {breakSessions.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-5 mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">Break History</h3>
              <div className="space-y-2">
                {breakSessions.map((session, index) => (
                  <div key={index} className="flex justify-between items-center text-sm bg-white p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Break {index + 1}:</span>
                      
                      {editMode === `break-${index}-start` ? (
                        <>
                          <input
                            type="time"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="px-2 py-1 border-2 border-amber-400 rounded font-mono text-xs"
                          />
                          <button onClick={saveEdit} className="p-1 bg-green-500 text-white rounded hover:bg-green-600">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={cancelEdit} className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600">
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="font-mono">{formatTimeShort(session.start)}</span>
                          <button 
                            onClick={() => startEdit(`break-${index}-start`, session.start)}
                            className="p-1 text-gray-400 hover:text-amber-600 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      
                      <span className="text-gray-400">-</span>
                      
                      {editMode === `break-${index}-end` ? (
                        <>
                          <input
                            type="time"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="px-2 py-1 border-2 border-amber-400 rounded font-mono text-xs"
                          />
                          <button onClick={saveEdit} className="p-1 bg-green-500 text-white rounded hover:bg-green-600">
                            <Check className="w-3 h-3" />
                          </button>
                          <button onClick={cancelEdit} className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600">
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="font-mono">{formatTimeShort(session.end)}</span>
                          <button 
                            onClick={() => startEdit(`break-${index}-end`, session.end)}
                            className="p-1 text-gray-400 hover:text-amber-600 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                    <span className="font-semibold text-amber-600">
                      {formatDuration(session.duration)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-100 rounded-xl p-6 border-2 border-indigo-200">
              <h3 className="font-bold text-xl text-gray-800 mb-4 text-center">
                📊 Day Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="text-gray-700 font-medium">Total Office Time:</span>
                  <span className="font-bold text-lg text-indigo-700">{summary.totalOfficeTime}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="text-gray-700 font-medium">Total Break Time:</span>
                  <span className="font-bold text-lg text-amber-700">{summary.totalBreakTime}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="text-gray-700 font-medium">Total Working Hours:</span>
                  <span className={`font-bold text-lg ${summary.actualWork >= summary.requiredWork ? 'text-green-600' : 'text-red-600'}`}>
                    {summary.totalWorkTime}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t-2 border-indigo-200 text-center">
                  {summary.actualWork >= summary.requiredWork ? (
                    <div className="text-green-600 font-semibold text-lg">
                      ✅ Required 7 hours completed!
                    </div>
                  ) : (
                    <div className="text-red-600 font-semibold text-lg">
                      ⚠️ Short by {formatDuration(summary.requiredWork - summary.actualWork)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}