import React from 'react';
import { FileText, Clock, Trash2, Copy, Download, Eye } from 'lucide-react';

/**
 * 보관함 항목 리스트.
 */
export default function SavedList({
  items = [],
  getTitle,
  getSubtitle,
  getMeta,
  getBadge,
  onOpen,
  onClone,
  onExport,
  onDelete,
  emptyLabel = '저장된 항목이 없습니다.',
}) {
  if (!items.length) {
    return (
      <div className="text-center py-16 text-text-subtle">
        <FileText size={36} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const badge = getBadge?.(item);
        return (
          <div
            key={item.id}
            className="group flex items-center gap-3 p-3 bg-surface-raised border border-edge hover:border-edge-strong rounded-lg transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-text truncate">{getTitle(item)}</p>
                {badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.color}`}>{badge.label}</span>
                )}
              </div>
              {getSubtitle && <p className="text-xs text-text-muted truncate">{getSubtitle(item)}</p>}
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-text-subtle">
                <Clock size={10} />
                <span>{getMeta ? getMeta(item) : formatDate(item.createdAt || item.created_at)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onOpen && <IconBtn icon={Eye} label="열기" onClick={() => onOpen(item)} />}
              {onClone && <IconBtn icon={Copy} label="복제" onClick={() => onClone(item)} />}
              {onExport && <IconBtn icon={Download} label="내보내기" onClick={() => onExport(item)} />}
              {onDelete && <IconBtn icon={Trash2} label="삭제" onClick={() => onDelete(item)} danger />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IconBtn({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={`p-1.5 rounded hover:bg-surface-sunken transition-colors ${
        danger ? 'text-text-subtle hover:text-critical-fg' : 'text-text-muted hover:text-text'
      }`}
    >
      <Icon size={14} />
    </button>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function providerBadge(provider) {
  // 토큰 색을 매핑 — 프로바이더 색상 슬롯이 필요해지면 토큰 추가 가능
  const colors = {
    claude: 'bg-caution-muted/40 text-caution-fg',
    openai: 'bg-positive-muted/40 text-positive-fg',
    gemini: 'bg-info-muted/40 text-info-fg',
  };
  return provider ? { label: provider, color: colors[provider] || 'bg-surface-sunken text-text-muted' } : null;
}

export function exportJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[\\/:*?"<>|]/g, '_') + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportText(filename, text, type = 'text/plain', extension = 'txt') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[\/:*?"<>|]/g, '_') + `.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
