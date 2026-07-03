import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { formatDuration, formatShort } from '../utils';

export default function WorkProgress({ remainingCalc, requiredMinutes }) {
  const barRef = useRef(null);

  useEffect(() => {
    if (!barRef.current || !remainingCalc) return;
    const pct = Math.min((remainingCalc.workSoFar / requiredMinutes) * 100, 100);
    gsap.to(barRef.current, {
      width: `${pct}%`,
      duration: 1,
      ease: 'power2.out',
    });
  }, [remainingCalc?.workSoFar, requiredMinutes]);

  if (!remainingCalc) return null;

  return (
    <div className="status-card status-card-primary mb-6 gsap-section">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0 flex items-center gap-2">
          Work Progress
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="flex flex-col items-center">
          <span className="text-[var(--text-secondary)] text-xs mb-1">Completed</span>
          <div className="flex items-center min-h-[28px]">
            <span className="font-mono text-lg font-semibold text-[var(--accent-secondary)]">
              {formatDuration(remainingCalc.workSoFar)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[var(--text-secondary)] text-xs mb-1">Remaining</span>
          <div className="flex items-center min-h-[28px]">
            <span className="font-mono text-lg font-semibold text-[var(--text-primary)]">
              {formatDuration(remainingCalc.remaining)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[var(--text-secondary)] text-xs mb-1">Est. End</span>
          <div className="flex items-center min-h-[28px]">
            <span className="font-mono text-lg font-semibold text-[var(--success)]">
              {formatShort(remainingCalc.estimatedEnd)}
            </span>
          </div>
        </div>
      </div>

      <div className="progress-track" style={{ height: '4px' }}>
        <div
          className="progress-fill"
          ref={barRef}
          style={{ width: '0%' }}
        />
      </div>
    </div>
  );
}
