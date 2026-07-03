import React, { useState, useCallback, useRef, useEffect } from 'react';
import { gsap } from 'gsap';

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = 'error') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return { toasts, show };
}

export function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { y: 20, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: 'power3.out' }
    );

    // Animate out before removal
    const timer = setTimeout(() => {
      if (ref.current) {
        gsap.to(ref.current, { y: -10, opacity: 0, duration: 0.25, ease: 'power2.in' });
      }
    }, 2700);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={ref} className={`toast-item toast-${toast.type}`}>
      {toast.message}
    </div>
  );
}
