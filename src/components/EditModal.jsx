import React from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimeClock } from '@mui/x-date-pickers/TimeClock';
import { ThemeProvider } from '@mui/material/styles';
import dayjs from 'dayjs';

export default function EditModal({
  editMode,
  editValue,
  pickerTab,
  pickerHour,
  pickerMinute,
  setEditValue,
  saveEdit,
  cancelEdit,
  setPickerTab,
  togglePeriod,
  formatSelectedTime,
  muiDarkTheme,
}) {
  if (!editMode) return null;

  return (
    <div className="modal-overlay" onClick={cancelEdit}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Selected Time Display */}
        <div className="text-3xl font-bold font-mono text-[var(--success)] text-center tracking-tight select-none">
          {formatSelectedTime(editValue)}
        </div>

        {/* AM/PM Toggle Pill */}
        <div className="flex border border-[var(--border)] rounded-full overflow-hidden bg-[var(--bg-secondary)]/50 text-[10px] font-bold mt-2 mb-2 select-none">
          <button
            type="button"
            onClick={() => togglePeriod('AM')}
            className={`px-3 py-1 cursor-pointer transition-colors ${
              (parseInt((editValue || '00:00').split(':')[0], 10) < 12)
                ? 'bg-[rgba(16,185,129,0.12)] text-[#10b981]'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => togglePeriod('PM')}
            className={`px-3 py-1 cursor-pointer transition-colors ${
              (parseInt((editValue || '00:00').split(':')[0], 10) >= 12)
                ? 'bg-[rgba(16,185,129,0.12)] text-[#10b981]'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            PM
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 w-full max-w-[200px] mb-2 select-none">
          <button
            type="button"
            onClick={() => setPickerTab('hour')}
            className={`flex-1 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer text-center ${
              pickerTab === 'hour' ? 'bg-[var(--bg-secondary)] text-white' : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            Hour
          </button>
          <button
            type="button"
            onClick={() => setPickerTab('minute')}
            className={`flex-1 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer text-center ${
              pickerTab === 'minute' ? 'bg-[var(--bg-secondary)] text-white' : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            Min
          </button>
        </div>

        {/* Clock Picker */}
        <ThemeProvider theme={muiDarkTheme}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <TimeClock
              ampm={false}
              views={['hours', 'minutes']}
              view={pickerTab === 'hour' ? 'hours' : 'minutes'}
              onViewChange={(newView) => setPickerTab(newView === 'hours' ? 'hour' : 'minute')}
              value={dayjs().hour(pickerHour).minute(pickerMinute)}
              onChange={(newVal) => {
                const h = newVal.hour();
                const m = newVal.minute();
                setEditValue(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
              }}
              sx={{
                '& .MuiPickersLayout-root': {
                  backgroundColor: 'transparent !important',
                },
                '& .MuiClock-clock': {
                  backgroundColor: 'transparent !important',
                }
              }}
            />
          </LocalizationProvider>
        </ThemeProvider>

        {/* Action buttons */}
        <div className="flex gap-2 justify-center mt-4 w-full max-w-[200px]">
          <button
            type="button"
            onClick={cancelEdit}
            className="flex-1 py-1 text-[11px] rounded-full border border-[var(--border)] text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-card)] transition-all cursor-pointer text-center bg-transparent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveEdit}
            className="flex-1 py-1 text-[11px] rounded-full bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] text-[#10b981] font-medium hover:bg-[rgba(16,185,129,0.15)] hover:border-[rgba(16,185,129,0.4)] hover:text-[#34d399] transition-all cursor-pointer text-center"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
