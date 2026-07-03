import React, { useRef } from 'react';
import { LogIn, LogOut, Coffee } from 'lucide-react';
import { gsap } from 'gsap';

export default function ActionButtons({
  punchIn,
  punchOut,
  onBreak,
  onPunchIn,
  onPunchOut,
  onBreakIn,
  onBreakOut,
}) {

  const handleMouseEnter = (e) => {
    if (!e.currentTarget.disabled) {
      gsap.to(e.currentTarget, { scale: 1.03, duration: 0.2, ease: 'power2.out' });
    }
  };

  const handleMouseLeave = (e) => {
    if (!e.currentTarget.disabled) {
      gsap.to(e.currentTarget, { scale: 1, duration: 0.4, ease: 'power2.out' });
    }
  };

  const handleMouseDown = (e) => {
    if (!e.currentTarget.disabled) {
      gsap.to(e.currentTarget, { scale: 0.95, duration: 0.1, ease: 'power1.out' });
    }
  };

  const handleMouseUp = (e) => {
    if (!e.currentTarget.disabled) {
      gsap.to(e.currentTarget, { scale: 1.03, duration: 0.2, ease: 'power2.out' });
    }
  };

  return (
    <div className="glass-card mb-6 gsap-section">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <button
          onClick={onPunchIn}
          disabled={!!punchIn && !punchOut}
          className="btn btn-success"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseLeave}
        >
          <LogIn className="w-6 h-6 mb-1" />
          <span>Punch In</span>
        </button>

        <button
          onClick={onPunchOut}
          disabled={!punchIn || !!punchOut}
          className="btn btn-danger"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseLeave}
        >
          <LogOut className="w-6 h-6 mb-1" />
          <span>Punch Out</span>
        </button>

        <button
          onClick={onBreakIn}
          disabled={!punchIn || !!punchOut || onBreak}
          className="btn btn-warning"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseLeave}
        >
          <Coffee className="w-6 h-6 mb-1" />
          <span>Start Break</span>
        </button>

        <button
          onClick={onBreakOut}
          disabled={!onBreak}
          className="btn btn-primary"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseLeave}
        >
          <Coffee className="w-6 h-6 mb-1" />
          <span>End Break</span>
        </button>
      </div>
    </div>
  );
}
