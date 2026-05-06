/**
 * LLM 통합 라우터 — 브라우저 전용.
 * Phase 1의 lib/llm-router.js를 포팅. 차이점:
 *  - node-fetch 미사용, globalThis.fetch
 *  - config는 정적 import
 *  - Claude 호출 시 anthropic-dangerous-direct-browser-access 헤더 추가
 *    (사용자 키가 브라우저에 노출됨 — 단일 사용자 자기 키 입력 모델이라 허용)
 */
import modelsConfig from '../../config/models.json';

const RETRY = {
  maxRetries: 4,
  // 일반 오류: 2s / 5s / 10s
  delays: [2000, 5000, 10000],
  // 429 / 503 과부하: 5s / 15s / 30s
  overloadDelays: [5000, 15000, 30000],
};
const GEN = { temperature: 0.5, maxTokens: 8192 };

export function getProviderConfig(providerId) {
  return modelsConfig.providers?.[providerId] || null;
}

export function findModel(providerId, modelId) {
  const p = getProviderConfig(providerId);
  if (!p) return null;
  return p.models.find((m) => m.id === modelId) || p.models.find((m) => m.default) || p.models[0];
}

export function listProviders() {
  const out = {};
  for (const [id, p] of Object.entries(modelsConfig.providers || {})) {
    out[id] = {
      label: p.label,
      enabled: p.enabled,
      color: p.color,
      supportsFiles: p.supportsFiles,
      models: p.models.map((m) => ({
        id: m.id, label: m.label, description: m.description, default: !!m.default,
      })),
    };
  }
  return out;
}

async function fetchWithRetry(url, options) {
  let lastErr;
  for (let i = 0; i < RETRY.maxRetries; i++) {
    let status = 0;
    try {
      const res = await fetch(url, options);
      status = res.status;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error?.message || data?.message || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        throw err;
      }
      return data;
    } catch (err) {
      lastErr = err;
      const s = err.status || status;
      // 인증 오류는 즉시 포기
      if (s === 401 || s === 403) break;
      if (i === RETRY.maxRetries - 1) break;
      // 429(레이트리밋) / 503(과부하) 는 더 긴 딜레이
      const isOverload = s === 429 || s === 503 || s === 529;
      const delay = isOverload
        ? (RETRY.overloadDelays[i] || 30000)
        : (RETRY.delays[i] || 10000);
      console.warn(`[LLM] retry ${i + 1}/${RETRY.maxRetries - 1} in ${delay / 1000}s (status=${s})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function extractJson(text) {
  if (!text) return null;
  const trimmed = String(text).trim();
  try { return JSON.parse(trimmed); } catch {}
  // 코드펜스 또는 앞뒤 텍스트 안의 JSON 객체 추출
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return null;
}

/**
 * 3개 프로바이더 통합 호출.
 * @param {object} opts
 * @param {'gemini'|'claude'|'openai'} opts.provider
 * @param {string} opts.apiKey
 * @param {string} opts.modelId
 * @param {string} opts.systemPrompt
 * @param {string} opts.userPrompt
 * @param {object} [opts.responseSchema] - Gemini OpenAPI 스키마 (있을 때 구조화 출력 강제)
 * @returns {Promise<{ data: object, rawText: string }>}
 */
export async function callLLM({ provider, apiKey, modelId, systemPrompt, userPrompt, responseSchema, files = [] }) {
  if (!provider || !apiKey) throw new Error('provider와 apiKey가 필요합니다.');
  const pc = getProviderConfig(provider);
  if (!pc || !pc.enabled) throw new Error(`${provider}는 지원되지 않거나 비활성화된 프로바이더입니다.`);
  const model = findModel(provider, modelId);
  if (!model) throw new Error('모델을 찾을 수 없습니다.');

  let rawText = '';

  if (provider === 'gemini') {
    const fileParts = files
      .filter((file) => file?.base64 && file?.mimeType)
      .map((file) => ({ inlineData: { mimeType: file.mimeType, data: file.base64 } }));
    const payload = {
      contents: [{ parts: [{ text: userPrompt }, ...fileParts] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: GEN.temperature,
        ...(responseSchema ? {
          responseMimeType: 'application/json',
          responseSchema,
        } : {}),
      },
    };
    const url = `${pc.apiBase}/${model.id}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const data = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  else if (provider === 'claude') {
    const schemaNote = responseSchema
      ? `\n\n반드시 다음 JSON 스키마에 맞는 JSON 객체만 반환하세요. 다른 텍스트·마크다운·코드펜스 금지.\n${JSON.stringify(responseSchema)}`
      : '';
    const content = [{ type: 'text', text: `${userPrompt}${schemaNote}` }];
    for (const file of files) {
      if (file?.base64 && file?.mimeType?.startsWith('image/')) {
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: file.mimeType, data: file.base64 },
        });
      }
    }
    const data = await fetchWithRetry(`${pc.apiBase}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': pc.apiVersion,
        // 브라우저 직호출 허용 (Phase 2: 사용자 자기 키 입력 모델)
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: model.id,
        max_tokens: GEN.maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content }],
      }),
    });
    rawText = data.content?.[0]?.text || '';
  }
  else if (provider === 'openai') {
    const userContent = [{ type: 'text', text: responseSchema ? `${userPrompt}\n\n반드시 JSON 객체만 반환하세요.` : userPrompt }];
    for (const file of files) {
      if (file?.base64 && file?.mimeType?.startsWith('image/')) {
        userContent.push({
          type: 'image_url',
          image_url: { url: `data:${file.mimeType};base64,${file.base64}` },
        });
      }
    }
    const data = await fetchWithRetry(`${pc.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.id,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        ...(responseSchema ? { response_format: { type: 'json_object' } } : {}),
        temperature: GEN.temperature,
      }),
    });
    rawText = data.choices?.[0]?.message?.content || '';
  }
  else {
    throw new Error(`지원하지 않는 프로바이더: ${provider}`);
  }

  const parsed = extractJson(rawText);
  if (!parsed) {
    const err = new Error('LLM 응답에서 JSON을 파싱할 수 없습니다.');
    err.rawText = rawText;
    throw err;
  }
  return { data: parsed, rawText };
}

export async function validateKey({ provider, apiKey, modelId }) {
  const pc = getProviderConfig(provider);
  if (!pc || !pc.enabled) return { valid: false, error: `${provider}는 지원하지 않는 제공자입니다.` };
  if (!apiKey) return { valid: false, error: 'API 키가 비어 있습니다.' };

  try {
    if (provider === 'gemini') {
      const validationModelId = 'gemini-2.5-flash';
      const url = `${pc.apiBase}/${validationModelId}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] }),
      });
      if (r.ok) return { valid: true };
      if (r.status === 401 || r.status === 403) return { valid: false, error: 'API 키가 유효하지 않습니다.' };
      const body = await r.json().catch(() => ({}));
      return { valid: false, error: body?.error?.message || `오류 코드: ${r.status}` };
    }
    if (provider === 'claude') {
      const model = findModel('claude', modelId);
      const r = await fetch(`${pc.apiBase}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': pc.apiVersion,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: model.id,
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });
      return { valid: r.ok, error: r.ok ? undefined : 'API 키가 유효하지 않습니다.' };
    }
    if (provider === 'openai') {
      const model = findModel('openai', modelId);
      const r = await fetch(`${pc.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model.id,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      });
      return { valid: r.ok, error: r.ok ? undefined : 'API 키가 유효하지 않습니다.' };
    }
    return { valid: false, error: '알 수 없는 제공자' };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}
