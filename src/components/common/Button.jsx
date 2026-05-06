import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary:   'bg-brand hover:bg-brand-hover text-brand-fg disabled:bg-surface-muted disabled:text-text-subtle',
  secondary: 'bg-surface-muted hover:bg-edge-strong text-text disabled:bg-surface-sunken disabled:text-text-subtle',
  outline:   'border border-edge-strong text-text-muted hover:bg-surface-sunken disabled:text-text-subtle disabled:border-edge',
  danger:    'bg-critical hover:opacity-90 text-white disabled:bg-surface-muted',
  success:   'bg-positive hover:opacity-90 text-white disabled:bg-surface-muted',
  ghost:     'text-text-muted hover:bg-surface-sunken hover:text-text disabled:text-text-subtle',
};

export default function Button({
  children, onClick, loading, disabled, variant = 'primary', icon: Icon, className = '', type = 'button', size = 'md',
}) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:cursor-not-allowed ${VARIANTS[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : (Icon && <Icon size={14} />)}
      {children}
    </button>
  );
}
