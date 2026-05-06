import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button.jsx';

export default function ConfirmDialog({
  open, title, message, onConfirm, onCancel,
  confirmLabel = '확인', cancelLabel = '취소', danger = false,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className="bg-surface-raised border border-edge-strong rounded-xl p-6 max-w-md w-[92%] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={22} className={danger ? 'text-critical-fg' : 'text-caution-fg'} />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
