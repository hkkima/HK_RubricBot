import { useEffect, useState, useCallback, useMemo } from 'react';
import { listProviders, validateKey } from '../lib/llm.js';
import { useLocalKey } from './useLocalKey.js';

/**
 * 모델 선택 상태 관리. (백엔드 호출 없음)
 * config/models.json의 정적 import 결과를 동기적으로 사용.
 */
export function useModelSelector() {
  // 정적이라 첫 렌더에 즉시 채움
  const [providers] = useState(() => listProviders());
  const [modelsLoading] = useState(false);

  const firstEnabledId = useMemo(() => {
    const entry = Object.entries(providers).find(([, p]) => p.enabled);
    return entry ? entry[0] : 'gemini';
  }, [providers]);

  const [selectedProvider, setSelectedProvider] = useState(firstEnabledId);
  const [selectedModelId, setSelectedModelId] = useState(() => {
    const p = providers[firstEnabledId];
    const def = p?.models.find((m) => m.default) || p?.models?.[0];
    return def?.id || '';
  });
  const [apiKey, setApiKey] = useLocalKey(selectedProvider);
  const [keyStatus, setKeyStatus] = useState('none'); // 'none' | 'valid' | 'invalid'
  const [keyError, setKeyError] = useState('');
  const [isKeyValidating, setIsKeyValidating] = useState(false);

  // provider 변경 시 기본 모델 선택 + 키 상태 초기화
  useEffect(() => {
    const p = providers[selectedProvider];
    if (!p) return;
    const def = p.models.find((m) => m.default) || p.models[0];
    setSelectedModelId(def?.id || '');
    setKeyStatus('none');
    setKeyError('');
  }, [selectedProvider, providers]);

  const verifyKey = useCallback(async () => {
    if (!apiKey) return;
    setIsKeyValidating(true);
    setKeyError('');
    try {
      const result = await validateKey({
        provider: selectedProvider,
        apiKey,
        modelId: selectedModelId,
      });
      if (result.valid) {
        setKeyStatus('valid');
      } else {
        setKeyStatus('invalid');
        setKeyError(result.error || '키 검증 실패');
      }
    } catch (err) {
      setKeyStatus('invalid');
      setKeyError(err.message);
    } finally {
      setIsKeyValidating(false);
    }
  }, [apiKey, selectedProvider, selectedModelId]);

  const enabledProviders = useMemo(
    () => Object.entries(providers).filter(([, p]) => p.enabled).map(([id, p]) => ({ id, ...p })),
    [providers],
  );
  const disabledProviders = useMemo(
    () => Object.entries(providers).filter(([, p]) => !p.enabled).map(([id, p]) => ({ id, ...p })),
    [providers],
  );

  return {
    providers,
    enabledProviders,
    disabledProviders,
    modelsLoading,
    selectedProvider,
    setSelectedProvider,
    selectedModelId,
    setSelectedModelId,
    apiKey,
    setApiKey,
    keyStatus,
    keyError,
    isKeyValidating,
    verifyKey,
    payload: { provider: selectedProvider, apiKey, modelId: selectedModelId },
  };
}
