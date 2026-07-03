import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatDuration } from '../utils';

export default function DaySummary({ summary, totalAllowedBreak, requiredWorkHours }) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (!cardRef.current || !summary) return;
    gsap.fromTo(
      cardRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.65 }
    );

    const items = cardRef.current.querySelectorAll('.stat-item');
    gsap.fromTo(
      items,
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out', delay: 0.85 }
    );
  }, [!!summary]);

  if (!summary) return null;

  return (
    <div className="glass-card mb-6" ref={cardRef}>
      <h3 className="section-title flex items-center gap-2">
        Day Summary
      </h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="flex flex-col items-center stat-item">
          <span className="text-[var(--text-secondary)] text-xs mb-1">Office Time</span>
          <div className="flex items-center min-h-[28px]">
            <span className="font-mono text-lg font-semibold text-[var(--text-primary)]">
              {formatDuration(summary.totalOfficeMinutes)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center stat-item">
          <span className="text-[var(--text-secondary)] text-xs mb-1">Break Time</span>
          <div className="flex items-center min-h-[28px]">
            <span className={`font-mono text-lg font-semibold ${summary.breakMinutes > totalAllowedBreak ? 'text-[var(--danger)]' : 'text-[var(--warning)]'}`}>
              {formatDuration(summary.breakMinutes)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center stat-item">
          <span className="text-[var(--text-secondary)] text-xs mb-1">Work Time</span>
          <div className="flex items-center min-h-[28px]">
            <span className={`font-mono text-lg font-semibold ${summary.totalWork >= summary.requiredMinutes ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
              {formatDuration(summary.totalWork)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center mt-2 pt-4 border-t border-[var(--border)]">
        {summary.totalWork >= summary.requiredMinutes ? (
          <div className="flex items-center justify-center gap-2 text-[var(--success)] font-medium text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Required {requiredWorkHours} hours completed!
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-[var(--danger)] font-medium text-sm">
            <AlertTriangle className="w-4 h-4" />
            Short by {formatDuration(summary.requiredMinutes - summary.totalWork)}
          </div>
        )}
      </div>
    </div>
  );
}
