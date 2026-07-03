import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { gsap } from 'gsap';
import { formatDuration } from './utils';

const HISTORY_KEY = 'office-tracker-history-v2';

const fromIso = (s) => (s ? new Date(s) : null);

const formatShort = (d) =>
  d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--';

const formatDateLabel = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  } catch {
    return dateStr || 'Unknown';
  }
};

export default function RecentHistory({ onBack }) {
  const [history, setHistory] = useState([]);
  const containerRef = useRef(null);
  const backBtnRef = useRef(null);

  useEffect(() => {
    try {
      const hist = localStorage.getItem(HISTORY_KEY);
      if (hist) setHistory(JSON.parse(hist));
    } catch (err) {
      console.error('Error loading history', err);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Animate back button
    if (backBtnRef.current) {
      gsap.fromTo(
        backBtnRef.current,
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
      );
    }

    // Stagger history cards
    const cards = containerRef.current.querySelectorAll('.history-day');
    if (cards.length > 0) {
      gsap.fromTo(
        cards,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.12, ease: 'power3.out', delay: 0.15 }
      );
    }
  }, [history]);

  const reversedHistory = history.slice().reverse();

  return (
    <div className="min-h-screen bg-pattern p-4 md:p-6 flex flex-col">
      <div className="max-w-4xl mx-auto flex-1 flex flex-col w-full" ref={containerRef}>
        
        {/* Header */}
        <div className="flex items-center justify-start mb-6 -ml-2">
          <button
            ref={backBtnRef}
            onClick={onBack}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Empty State */}
        {history.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">No History</h3>
            <p className="text-sm">Your completed work days will appear here.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {reversedHistory.map((record, idx) => {
              const recPunchIn = fromIso(record.punchIn);
              const recPunchOut = fromIso(record.punchOut);
              const recBreaks = record.breaks || [];
              const s = record.summary;
              const isComplete = s && s.totalWork >= s.requiredMinutes;

              return (
                <div key={idx} className="glass-card history-day">
                  <div className="flex items-end justify-between border-b border-[var(--border)] pb-3 mb-5">
                    <h2 className="text-base font-bold text-[var(--text-primary)]">
                      {formatDateLabel(record.date)}
                    </h2>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
                    <div className="flex flex-col items-start whitespace-nowrap">
                      <span className="text-[var(--text-secondary)] text-xs mb-1 uppercase tracking-wider">Punch In</span>
                      <div className="flex items-center min-h-[28px]">
                        <span className="font-mono text-lg font-semibold text-[var(--text-primary)]">
                          {formatShort(recPunchIn)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-start whitespace-nowrap">
                      <span className="text-[var(--text-secondary)] text-xs mb-1 uppercase tracking-wider">Punch Out</span>
                      <div className="flex items-center min-h-[28px]">
                        <span className="font-mono text-lg font-semibold text-[var(--text-primary)]">
                          {formatShort(recPunchOut)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-start whitespace-nowrap">
                      <span className="text-[var(--text-secondary)] text-xs mb-1 uppercase tracking-wider">Break Time</span>
                      <div className="flex items-center min-h-[28px]">
                        <span className="font-mono text-lg font-semibold text-[var(--warning)]">
                          {s ? formatDuration(s.breakMinutes) : '--'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-start whitespace-nowrap">
                      <span className="text-[var(--text-secondary)] text-xs mb-1 uppercase tracking-wider">Work Time</span>
                      <div className="flex items-center min-h-[28px]">
                        <span className={`font-mono text-lg font-semibold ${isComplete ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                          {s ? formatDuration(s.totalWork) : '--'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Breaks */}
                  {recBreaks.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                        Break Sessions
                      </h3>
                      <div className="space-y-1">
                        {recBreaks.map((b, bi) => (
                          <div key={bi} className="flex items-center justify-between py-1">
                            <span className="font-mono text-sm text-[var(--text-primary)]">
                              {formatShort(fromIso(b.start))} <span className="text-[var(--text-secondary)] mx-2">-</span> {formatShort(fromIso(b.end))}
                            </span>
                            <span className="text-[var(--warning)] font-mono font-semibold text-xs">
                              {formatDuration(b.minutes)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
