import React from 'react';
import { ClipboardList, GraduationCap, Library } from 'lucide-react';
import ModelSelector from '../ModelSelector.jsx';

const NAV_ITEMS = [
  { id: 'rubric', label: '루브릭 만들기', desc: '과제 내용을 넣고 평가표 생성', icon: ClipboardList },
  { id: 'grading', label: '학생 답안 채점', desc: '답안을 업로드하고 1차 평가', icon: GraduationCap },
  { id: 'library', label: '보관함', desc: '저장한 평가표와 결과 확인', icon: Library },
];

export default function Sidebar({ modelSelector, activePage, onNavigate }) {
  return (
    <aside className="w-72 bg-surface border-r border-edge flex flex-col shrink-0">
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="mb-6 rounded-2xl bg-brand text-brand-fg p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] opacity-75">AssignmentBot</p>
          <h2 className="mt-3 text-xl font-semibold leading-tight">처음이라면 이 순서대로 진행하세요</h2>
        </div>

        <nav className="space-y-2 mb-6">
          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.id)}
                className={`w-full text-left rounded-2xl border p-4 transition-colors ${active
                  ? 'bg-surface-raised border-brand text-brand'
                  : 'bg-surface-sunken border-edge hover:border-edge-strong text-text'}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${active ? 'bg-brand text-brand-fg' : 'bg-brand-muted text-brand'}`}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Icon size={15} /> {item.label}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-text-muted">{item.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="mb-4 rounded-2xl border border-edge bg-surface-raised p-4 text-xs leading-relaxed text-text-muted">
          <p className="font-semibold text-brand mb-2">워크플로</p>
          <p>1. 기존 과제 또는 직접 입력으로 루브릭을 설계합니다.</p>
          <p className="mt-1">2. 학생 답안을 업로드하여 1차 채점을 실행합니다.</p>
          <p className="mt-1">3. 보관함에서 저장된 Markdown 결과를 관리합니다.</p>
        </div>

      </div>

      <ModelSelector
        enabledProviders={modelSelector.enabledProviders}
        disabledProviders={modelSelector.disabledProviders}
        selectedProvider={modelSelector.selectedProvider}
        selectedModelId={modelSelector.selectedModelId}
        apiKey={modelSelector.apiKey}
        keyStatus={modelSelector.keyStatus}
        keyError={modelSelector.keyError}
        isKeyValidating={modelSelector.isKeyValidating}
        modelsLoading={modelSelector.modelsLoading}
        onProviderChange={modelSelector.setSelectedProvider}
        onModelChange={modelSelector.setSelectedModelId}
        onApiKeyChange={modelSelector.setApiKey}
        onVerifyKey={modelSelector.verifyKey}
      />
    </aside>
  );
}
