import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function ConfirmModal({ confirmAction, setConfirmAction }) {
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (confirmAction && overlayRef.current && contentRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' });
      gsap.fromTo(
        contentRef.current,
        { scale: 0.9, opacity: 0, y: 10 },
        { scale: 1, opacity: 1, y: 0, duration: 0.3, ease: 'back.out(1.5)', delay: 0.05 }
      );
    }
  }, [confirmAction]);

  if (!confirmAction) return null;

  return (
    <div className="modal-overlay" onClick={() => setConfirmAction(null)} ref={overlayRef}>
      <div className="modal-content text-center max-w-[280px] p-5" onClick={(e) => e.stopPropagation()} ref={contentRef}>
        <h4 className="text-md font-bold text-[var(--text-primary)] mb-2 select-none">
          {confirmAction.title}
        </h4>
        <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed select-none">
          {confirmAction.message}
        </p>
        <div className="flex gap-3 justify-center w-full mt-2">
          <button
            type="button"
            onClick={() => setConfirmAction(null)}
            className="flex-1 py-2 text-xs rounded-full border border-[var(--border)] text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-card)] transition-all cursor-pointer bg-transparent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmAction.onConfirm}
            className={`flex-1 py-2 text-xs rounded-full font-medium transition-all cursor-pointer text-center ${
              confirmAction.isDanger
                ? 'bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[var(--danger)] hover:bg-[rgba(239,68,68,0.15)] hover:border-[rgba(239,68,68,0.4)] hover:text-red-400'
                : 'bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)] text-[#10b981] hover:bg-[rgba(16,185,129,0.15)] hover:border-[rgba(16,185,129,0.4)] hover:text-[#34d399]'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
