import { useState, useEffect } from 'react';

const STORAGE_PREFIX = 'assignmentbot.apikey.';

/**
 * 프로바이더별 API 키를 localStorage에 영속.
 * - 사용자 본인 기기에서만 사용된다는 전제(GH Pages도 동일).
 */
export function useLocalKey(provider) {
  const key = STORAGE_PREFIX + provider;
  const [value, setValue] = useState(() => {
    try { return localStorage.getItem(key) || ''; } catch { return ''; }
  });

  useEffect(() => {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch {}
  }, [key, value]);

  useEffect(() => {
    try { setValue(localStorage.getItem(key) || ''); } catch { setValue(''); }
  }, [key]);

  return [value, setValue];
}
