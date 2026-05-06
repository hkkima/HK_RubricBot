import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 20, label, className = '' }) {
  return (
    <div className={`flex items-center gap-2 text-text-muted ${className}`}>
      <Loader2 size={size} className="animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
