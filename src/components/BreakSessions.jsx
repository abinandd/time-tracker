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
}) {
  const listRef = useRef(null);
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

  return (
    <div className="glass-card mb-6 gsap-section">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0 flex items-center gap-2">
          Break Sessions
        </h3>
      </div>

      {onBreak && (
        <div className="mb-4 p-3 rounded-md bg-[var(--warning)]/10 border border-[var(--warning)]/20">
          <div className="flex items-center gap-3 text-[var(--warning)]">
            <Timer className="w-5 h-5 animate-pulse shrink-0" />
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">On break since {formatShort(breakStart)}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--warning)]/20 text-[var(--warning)] font-bold">
                  {formatDuration(minutesBetween(breakStart, now))}
                </span>
              </div>
              {expectedBreakEndTime && (
                <div className="flex items-center gap-1.5 text-xs font-medium opacity-90">
                  <Clock className="w-3 h-3" />
                  <span>Expected end: {formatShort(expectedBreakEndTime)}</span>
                </div>
              )}
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
