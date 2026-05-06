import React from 'react';
import { Key, Loader2, CheckCircle, XCircle, ChevronDown } from 'lucide-react';

/**
 * AI 모델 선택 사이드바 위젯. useModelSelector 훅이 반환하는 값을 props로 받음.
 * 디자인 토큰을 이용해 brand 색은 tokens.css에서 일괄 변경 가능.
 */
export default function ModelSelector({
  enabledProviders,
  disabledProviders,
  selectedProvider,
  selectedModelId,
  apiKey,
  keyStatus,
  keyError,
  isKeyValidating,
  modelsLoading,
  onProviderChange,
  onModelChange,
  onApiKeyChange,
  onVerifyKey,
}) {
  const currentProvider = enabledProviders.find((p) => p.id === selectedProvider);
  const currentModels = currentProvider?.models || [];
  const currentModel = currentModels.find((m) => m.id === selectedModelId) || currentModels[0];

  if (modelsLoading) {
    return (
      <div className="p-4 border-t border-edge text-center">
        <Loader2 size={16} className="animate-spin text-text-muted mx-auto" />
        <p className="text-[10px] text-text-subtle mt-1">모델 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-edge space-y-3">
      <div className="flex items-center gap-2 text-text text-sm font-semibold">
        <Key size={15} /> AI 모델 선택
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {enabledProviders.map((p) => (
          <button
            key={p.id}
            onClick={() => onProviderChange(p.id)}
            className={`flex-1 min-w-[60px] py-1.5 text-xs font-bold rounded-lg transition-colors border
              ${selectedProvider === p.id
                ? `${p.color} text-white border-transparent`
                : 'bg-surface-sunken text-text-muted border-edge-strong hover:border-text-subtle'}`}
          >
            {p.label}
          </button>
        ))}
        {disabledProviders.map((p) => (
          <button
            key={p.id}
            disabled
            className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-surface-sunken/50 text-text-subtle border border-edge/50 cursor-not-allowed"
            title="준비 중"
          >
            {p.label}
          </button>
        ))}
      </div>

      {currentModels.length > 1 && (
        <div className="relative">
          <select
            value={selectedModelId || ''}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full bg-surface-sunken border border-edge-strong text-text text-xs rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-brand appearance-none cursor-pointer"
          >
            {currentModels.map((m) => (
              <option key={m.id} value={m.id}>{m.label} — {m.description}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none" />
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onVerifyKey()}
          placeholder={`${currentProvider?.label || ''} API Key`}
          className="w-full bg-surface-sunken border border-edge-strong text-text text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-brand placeholder:text-text-subtle"
        />
        <button
          onClick={onVerifyKey}
          disabled={isKeyValidating || !apiKey}
          className="bg-brand hover:bg-brand-hover disabled:bg-surface-muted disabled:text-text-subtle text-brand-fg text-xs px-3 py-2 rounded-lg flex items-center justify-center shrink-0"
        >
          {isKeyValidating ? <Loader2 size={14} className="animate-spin" /> : '확인'}
        </button>
      </div>

      {keyStatus === 'valid' && (
        <p className="text-positive-fg text-[10px] flex items-center gap-1">
          <CheckCircle size={10} /> 키 검증 완료
        </p>
      )}
      {keyStatus === 'invalid' && (
        <p className="text-critical-fg text-[10px] flex items-start gap-1">
          <XCircle size={10} className="mt-0.5 shrink-0" /> {keyError || '유효하지 않은 키'}
        </p>
      )}

      <p className="text-[10px] text-text-subtle text-center">
        {currentProvider?.label} · {currentModel?.id || ''}
      </p>
    </div>
  );
}
