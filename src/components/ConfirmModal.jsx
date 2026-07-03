import React from 'react';

export default function ConfirmModal({ confirmAction, setConfirmAction }) {
  if (!confirmAction) return null;

  return (
    <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
      <div className="modal-content text-center max-w-[280px] p-5" onClick={(e) => e.stopPropagation()}>
        <h4 className="text-md font-bold text-[var(--text-primary)] mb-2 select-none">
          {confirmAction.title}
        </h4>
        <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed select-none">
          {confirmAction.message}
        </p>
        <div className="flex gap-2 justify-center w-full">
          <button
            type="button"
            onClick={() => setConfirmAction(null)}
            className="flex-1 py-1.5 text-[11px] rounded-full border border-[var(--border)] text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-card)] transition-all cursor-pointer bg-transparent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmAction.onConfirm}
            className={`flex-1 py-1.5 text-[11px] rounded-full font-medium transition-all cursor-pointer text-center ${
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
