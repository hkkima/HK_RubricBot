# AssignmentBot — 과제 평가 봇 (웹 단독 버전)

루브릭 생성과 1차 채점을 하나의 웹앱으로 통합한 AI 기반 과제 평가 도구입니다.

1. **루브릭 생성** — 기존 과제 또는 직접 입력한 과제를 바탕으로 분석적 루브릭(기준·가중치·척도) 자동 설계
2. **1차 채점** — 루브릭에 따라 학생 답안 자동 채점 (기준별 점수·근거 인용·개선 제안·총평)
3. **보관함** — 과제·루브릭·채점 결과를 브라우저에 저장하고 재사용

## 특징

- **백엔드 없음**: 모든 동작이 브라우저에서 실행됩니다. 서버를 띄울 필요가 없어 GitHub Pages에 그대로 호스팅 가능합니다.
- **다중 LLM 지원**: Claude / Gemini / OpenAI 중 골라서 사용. 사용자가 자기 API 키를 입력합니다.
- **로컬 영속**: 과제·루브릭·채점 결과는 모두 브라우저의 IndexedDB에 저장됩니다.
- **PDF·MD·TXT 입력**: `pdfjs-dist`로 브라우저에서 직접 PDF를 파싱합니다.
- **디자인 토큰 시스템**: `src/styles/tokens.css` 한 파일만 수정하면 색·간격·radius가 전체 앱에서 일괄 변경됩니다.

## 빠르게 실행

```bash
npm install
npm run dev
```

→ `http://localhost:5173` 접속 후, 사이드바에서 API 키 입력 · 검증 → 루브릭 생성부터 시작.

## GitHub Pages 배포

1. 이 저장소를 GitHub에 푸시합니다.
2. **Settings → Pages → Source**: "GitHub Actions" 선택.
3. `main` 브랜치에 푸시하면 `.github/workflows/deploy.yml`이 자동으로 빌드·배포합니다.
4. 첫 배포 후 `https://<USER>.github.io/<REPO>/`에서 접속 가능.

> 워크플로는 `BASE_PATH=/${{ repository.name }}/` 환경변수를 자동으로 주입합니다. 저장소 이름과 무관하게 동작합니다.

## 사용자 데이터 안내

- **API 키**: 브라우저의 `localStorage`에 보관됩니다. 다른 기기로 자동 동기화되지 않습니다.
- **과제·루브릭·채점 결과**: 브라우저의 IndexedDB에 보관됩니다. 다른 브라우저·기기와 공유되지 않으므로 보관함의 **JSON 내보내기**로 백업하세요.
- **Claude API**: 직접 브라우저에서 호출하므로 `anthropic-dangerous-direct-browser-access: true` 헤더를 사용합니다. 자기 키를 자기 기기에 입력하는 단일 사용자 시나리오 전용입니다.

## 디자인 갈아끼우기

```css
/* src/styles/tokens.css */
:root, [data-theme='dark'] {
  --brand:       15 62 23;      /* Forest Green */
  --surface:     255 254 252;   /* Cream Canvas */
  --surface-raised: 225 244 223;/* Keylime Wash */
  /* ... */
}
```

컴포넌트는 `bg-surface`, `text-text-muted`, `border-edge`, `bg-brand` 같은 시맨틱 토큰만 사용하므로 위 변수만 교체하면 됩니다.

라이트 테마로 전환하려면 HTML 루트의 `data-theme` 속성을 변경하세요:
```html
<html data-theme="light">  <!-- 또는 "dark" -->
```

## 디렉토리 구조

```
AssignmentBotWeb/
├── prompts/                    # LLM 시스템·유저 프롬프트 + JSON 스키마
├── config/models.json          # 프로바이더·모델 메타데이터
├── public/
└── src/
    ├── lib/                    # 브라우저 전용 (백엔드 대체)
    │   ├── prompts.js          # 프롬프트 정적 import
    │   ├── llm.js              # 3사 LLM 통합 호출
    │   ├── storage.js          # IndexedDB CRUD
    │   ├── pdf.js              # pdfjs-dist 파일 파서
    │   └── grade.js            # 비즈니스 로직 (생성·채점)
    ├── styles/tokens.css       # 디자인 토큰 단일 진실 소스
    ├── components/             # 모든 UI (시맨틱 토큰 사용)
    ├── pages/                  # 루브릭 생성, 채점, 보관함 중심 화면
    ├── hooks/                  # useModelSelector, useApi, useLocalKey
    └── context/                # WorkflowContext
```

## 라이선스

MIT
