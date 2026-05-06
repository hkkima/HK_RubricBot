import React, { useRef, useState } from 'react';
import { Upload, FileText, Loader2, X } from 'lucide-react';
import { parseFile } from '../lib/pdf.js';

const ACCEPTED = '.pdf,.md,.markdown,.txt,.csv,.xlsx,.xls,.pptx,.png,.jpg,.jpeg';

/**
 * PDF/MD/TXT 파일을 드롭/선택하면 브라우저에서 직접 파싱(pdfjs-dist)하여
 * 텍스트를 콜백으로 전달.
 */
export default function FileDropZone({ onParsed, onError, compact = false, maxFiles = 10 }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [lastFile, setLastFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []).slice(0, maxFiles);
    if (!files.length) return;
    setLoading(true);
    try {
      const results = [];
      for (const file of files) {
        results.push(await parseFile(file));
      }
      const text = results.map((r) => `[${r.filename}]\n${r.text}`).join('\n\n---\n\n').trim();
      const attachments = results.map((r) => r.attachment).filter(Boolean);
      const pages = results.reduce((sum, r) => sum + (r.pages || 0), 0);
      const charCount = text.length;
      const filename = results.length === 1 ? results[0].filename : `${results.length}개 파일`;
      setLastFile({ filename, pages, charCount, count: results.length });
      onParsed?.({
        filename,
        mimeType: results.length === 1 ? results[0].mimeType : 'mixed/files',
        text,
        pages,
        charCount,
        files: results,
        attachments,
      });
    } catch (err) {
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function onFileChange(e) {
    handleFiles(e.target.files);
    e.target.value = '';
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-muted hover:bg-edge-strong text-text text-xs rounded-lg disabled:opacity-60"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          파일 업로드
        </button>
        {lastFile && (
          <span className="text-xs text-text-muted flex items-center gap-1">
            <FileText size={12} /> {lastFile.filename}
            <button onClick={() => setLastFile(null)} className="text-text-subtle hover:text-text">
              <X size={10} />
            </button>
          </span>
        )}
        <input ref={inputRef} type="file" accept={ACCEPTED} multiple onChange={onFileChange} className="hidden" />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
        ${dragOver
          ? 'border-brand bg-brand-muted/30'
          : 'border-edge-strong hover:border-brand-hover hover:bg-surface-sunken/50'}`}
    >
      {loading ? (
        <div className="flex flex-col items-center gap-2 text-text-muted">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">파일 파싱 중...</p>
          <p className="text-xs text-text-subtle">최대 {maxFiles}개 파일을 한 번에 처리합니다.</p>
        </div>
      ) : lastFile ? (
        <div className="text-text">
          <FileText size={28} className="mx-auto mb-2 text-positive" />
          <p className="text-sm font-medium">{lastFile.filename}</p>
          <p className="text-xs text-text-subtle mt-1">
            {lastFile.pages ? `${lastFile.pages}p · ` : ''}{lastFile.charCount.toLocaleString()}자
          </p>
          <p className="text-xs text-brand-hover mt-2">다른 파일 선택하려면 클릭</p>
        </div>
      ) : (
        <div className="text-text-muted">
          <Upload size={28} className="mx-auto mb-2" />
          <p className="text-sm font-medium">파일 드롭 또는 클릭</p>
          <p className="text-xs text-text-subtle mt-1">PDF, TXT, CSV, XLSX, PPTX, PNG, JPG · 최대 {maxFiles}개</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept={ACCEPTED} multiple onChange={onFileChange} className="hidden" />
    </div>
  );
}
