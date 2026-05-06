import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const STYLES = {
  success: { bg: 'bg-positive-muted/80 border-positive', icon: CheckCircle, color: 'text-positive-fg' },
  error:   { bg: 'bg-critical-muted/80 border-critical', icon: XCircle, color: 'text-critical-fg' },
  info:    { bg: 'bg-surface-sunken/95 border-edge-strong', icon: Info, color: 'text-text' },
};

export default function Toast({ type = 'info', message, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!duration) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  if (!message) return null;
  const s = STYLES[type] || STYLES.info;
  const Icon = s.icon;

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-start gap-2 border rounded-lg px-4 py-3 shadow-xl min-w-[280px] max-w-[420px] ${s.bg}`}>
      <Icon size={18} className={s.color} />
      <p className={`text-sm flex-1 ${s.color}`}>{message}</p>
      <button onClick={onClose} className="text-text-muted hover:text-text">
        <X size={14} />
      </button>
    </div>
  );
}
