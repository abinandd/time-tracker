import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Timer, Clock, Coffee, Trash2 } from 'lucide-react';
import { formatShort, formatDuration, minutesBetween } from '../utils';

export default function BreakSessions({
  breaks,
  onBreak,
  breakStart,
  now,
  expectedBreakEndTime,
  beginEdit,
  deleteBreak,
  totalAllowedBreak,
  totalBreakUsed,
  breakRemainingMinutes,
}) {
  const listRef = useRef(null);
  const activeBreakRef = useRef(null);
  const prevCount = useRef(breaks.length);

  useEffect(() => {
    if (!listRef.current) return;
    // Only animate newly added items
    if (breaks.length > prevCount.current) {
      const items = listRef.current.querySelectorAll('.break-item');
      const lastItem = items[items.length - 1];
      if (lastItem) {
        gsap.fromTo(lastItem, { x: -10, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
      }
    }
    prevCount.current = breaks.length;
  }, [breaks.length]);

  useEffect(() => {
    if (onBreak && activeBreakRef.current) {
      gsap.fromTo(
        activeBreakRef.current,
        { opacity: 0, y: -10, height: 0, overflow: 'hidden' },
        { opacity: 1, y: 0, height: 'auto', duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [onBreak]);

  const currentBreakMinutes = onBreak ? minutesBetween(breakStart, now) : 0;
  const currentTotalUsed = totalBreakUsed;

  return (
    <div className="glass-card mb-6 gsap-section">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0 flex items-center gap-2">
          Break Sessions
        </h3>
      </div>

      {onBreak && (
        <div className="mb-4 p-4 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/20" ref={activeBreakRef}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[var(--warning)] tracking-wide">Active Break</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--warning)]/20 text-[var(--warning)] shadow-sm">
                In Progress
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs border-t border-[var(--warning)]/15 pt-3 mt-1">
              <div className="flex flex-col">
                <span className="text-[var(--text-muted)] text-[10.5px] font-medium mb-0.5">Session Used</span>
                <span className="font-medium text-[var(--warning)]">{formatDuration(currentBreakMinutes)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[var(--text-muted)] text-[10.5px] font-medium mb-0.5">Overall Used</span>
                <span className={`font-medium ${currentTotalUsed > totalAllowedBreak ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>
                  {formatDuration(currentTotalUsed)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[var(--text-muted)] text-[10.5px] font-medium mb-0.5">Overall Remaining</span>
                <span className={`font-medium ${breakRemainingMinutes <= 0 ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>
                  {formatDuration(breakRemainingMinutes)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[var(--text-muted)] text-[10.5px] font-medium mb-0.5">Started At</span>
                <span className="font-medium text-[var(--text-primary)]">{formatShort(breakStart)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {breaks.length === 0 ? (
        onBreak ? null : (
          <div className="text-center py-6 text-[var(--text-muted)]">
            <Coffee className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No breaks recorded yet</p>
          </div>
        )
      ) : (
        <div className="space-y-2" ref={listRef}>
          {breaks.map((b, i) => (
            <div key={i} className="break-item">
              <div className="flex items-center gap-4 whitespace-nowrap">
                <div className="flex items-center gap-2 font-mono whitespace-nowrap">
                  <button
                    onClick={() => beginEdit({ type: 'break', index: i, field: 'start' })}
                    className="hover:text-[var(--accent-primary)] hover:underline cursor-pointer bg-transparent border-none p-0 focus:outline-none transition-colors whitespace-nowrap"
                    title="Click to edit Break Start time"
                  >
                    {formatShort(b.start)}
                  </button>
                  <span className="text-[var(--text-secondary)] select-none">-</span>
                  <button
                    onClick={() => beginEdit({ type: 'break', index: i, field: 'end' })}
                    className="hover:text-[var(--accent-primary)] hover:underline cursor-pointer bg-transparent border-none p-0 focus:outline-none transition-colors whitespace-nowrap"
                    title="Click to edit Break End time"
                  >
                    {formatShort(b.end)}
                  </button>
                </div>
                <span className="text-[var(--warning)] font-mono font-semibold text-xs whitespace-nowrap select-none">
                  {formatDuration(b.minutes)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => deleteBreak(i)} className="icon-btn icon-btn-danger" title="Delete break session">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
