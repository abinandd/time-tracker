import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { formatShort, formatDuration } from '../utils';

export default function StatusCard({
  punchIn,
  punchOut,
  totalAllowedBreak,
  totalBreakUsed,
  isBreakExceeded,
  breakRemainingMinutes,
  exceededMinutes,
  beginEdit,
}) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.2 }
    );

    const items = cardRef.current.querySelectorAll('.stat-item');
    gsap.fromTo(
      items,
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out', delay: 0.4 }
    );
  }, []);

  return (
    <div className="status-card mb-6" ref={cardRef}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Left Column: Attendance */}
        <div className="md:col-span-2 md:border-r md:border-[var(--border)] md:pr-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col stat-item">
              <span className="text-[var(--text-secondary)] text-xs mb-1">Punch In</span>
              <div className="flex items-center min-h-[28px]">
                {punchIn ? (
                  <button
                    onClick={() => beginEdit({ type: 'punchIn' })}
                    className="font-mono text-lg font-semibold hover:text-[var(--accent-primary)] hover:underline cursor-pointer bg-transparent border-none p-0 focus:outline-none transition-colors"
                    title="Click to edit Punch In time"
                  >
                    {formatShort(punchIn)}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col stat-item">
              <span className="text-[var(--text-secondary)] text-xs mb-1">Punch Out</span>
              <div className="flex items-center min-h-[28px]">
                {punchOut ? (
                  <button
                    onClick={() => beginEdit({ type: 'punchOut' })}
                    className="font-mono text-lg font-semibold hover:text-[var(--accent-primary)] hover:underline cursor-pointer bg-transparent border-none p-0 focus:outline-none transition-colors"
                    title="Click to edit Punch Out time"
                  >
                    {formatShort(punchOut)}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Break Time */}
        <div className="md:col-span-3">
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div className="flex flex-col stat-item">
              <span className="text-[var(--text-secondary)] text-xs mb-1">Allowed</span>
              <div className="flex items-center min-h-[28px]">
                <span className="font-mono text-lg font-semibold">{formatDuration(totalAllowedBreak)}</span>
              </div>
            </div>

            <div className="flex flex-col stat-item">
              <span className="text-[var(--text-secondary)] text-xs mb-1">Used</span>
              <div className="flex items-center min-h-[28px]">
                <span className={`font-mono text-lg font-semibold ${isBreakExceeded ? 'text-[var(--danger)]' : ''}`}>
                  {formatDuration(totalBreakUsed)}
                </span>
              </div>
            </div>

            <div className="flex flex-col stat-item">
              <span className="text-[var(--text-secondary)] text-xs mb-1 whitespace-nowrap">
                {isBreakExceeded ? 'Over by' : 'Remaining'}
              </span>
              <div className="flex items-center min-h-[28px]">
                <span className={`font-mono text-lg font-semibold ${
                  isBreakExceeded 
                    ? 'text-[var(--danger)]' 
                    : breakRemainingMinutes <= 10 
                      ? 'text-[var(--warning)]' 
                      : 'text-[var(--success)]'
                }`}>
                  {isBreakExceeded ? formatDuration(exceededMinutes) : formatDuration(breakRemainingMinutes)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
