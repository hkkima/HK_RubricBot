import { useState, useCallback } from 'react';

/**
 * 비동기 호출 래퍼 훅. fn이 fetch이든 lib/* 함수이든 모두 동일하게 사용.
 */
export function useApi(fn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const run = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fn]);

  return { run, loading, error, data, setData, setError };
}
