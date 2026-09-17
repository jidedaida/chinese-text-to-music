# Preview Release Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the existing browser MVP as an automatically updated GitHub Pages preview while completing overflow feedback, semantic sequencer shapes, accessible playback status, and lazy-loading boundaries.

**Architecture:** Keep `main` unchanged and deploy only `codex/implement-mvp`. Vite receives a preview mode with the repository base path, all audio assets resolve through `BASE_URL`, and GitHub Actions deploys only after the complete Chromium gate passes. UI-only release metadata and Canvas drawing stay outside the deterministic `Score`; large dictionary and audio dependencies move behind retryable dynamic loaders.

**Tech Stack:** Node 24, npm 11, TypeScript 7, React 19, Vite 8, Vitest 5, Testing Library, Playwright 1.63, Tone.js 15, GitHub Actions, GitHub Pages.

---

## File structure

```text
.env.preview                              Committed Vite preview-mode variables
.github/workflows/pages-preview.yml       Validation and Pages deployment workflow
.gitignore                                Allows the committed preview env file
vite.config.ts                            Reads base path and emits the build manifest
playwright.config.ts                      Accepts a local or deployed base URL
package.json                              Preview build, verification, and chunk scripts

src/runtime/base-path.ts                  Repository-subpath-safe asset URL construction
src/runtime/base-path.test.ts             Base path regression tests
src/runtime/retryable-loader.ts            Single-flight loader that retries after failure
src/runtime/retryable-loader.test.ts       Loader concurrency and retry tests
src/release/channel.ts                     Preview-label decision, isolated from Score data
src/release/channel.test.ts                Preview/production display tests
src/audio/lazy-engine.ts                   Lazy Tone engine facade with cancellation
src/audio/lazy-engine.test.ts              Lazy initialization and cancellation tests
src/components/sequencer-drawing.ts        Track-specific Canvas shapes
src/components/sequencer-drawing.test.ts   Exact drawing-path tests
src/components/TextPanel.test.tsx          Overflow message and selection tests

src/vite-env.d.ts                          Vite environment types
src/App.tsx                                Preview badge and lazy audio/export entry points
src/styles.css                             Preview badge and overflow error styles
src/domain/input.ts                        Original-source overflow locator
src/domain/input.test.ts                   Unicode-aware overflow location tests
src/text/analyze.ts                        Dynamic complete-dictionary import
src/audio/instruments.ts                   BASE_URL-aware sample directories
src/components/TextPanel.tsx               Accessible overflow feedback and focus action
src/components/SequencerCanvas.tsx         Semantic shapes and readable live status
src/components/SequencerCanvas.test.tsx    Readable status regression test

scripts/verify-build-chunks.mjs            Rejects eager dictionary or Tone imports
scripts/run-preview-e2e.mjs                Runs Playwright against built preview output
tests/e2e/workstation.spec.ts               Base-path, preview badge, audio and privacy flow
README.md                                  Preview workflow and release instructions
```

## Task 1: Make every published asset repository-subpath safe

**Files:**
- Create: `.env.preview`
- Create: `src/runtime/base-path.ts`
- Create: `src/runtime/base-path.test.ts`
- Modify: `.gitignore`
- Modify: `src/vite-env.d.ts`
- Modify: `vite.config.ts`
- Modify: `src/audio/instruments.ts`

- [ ] **Step 1: Write the failing base-path tests**

Create `src/runtime/base-path.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { withBasePath } from './base-path';

describe('withBasePath', () => {
  it('keeps local development assets at the site root', () => {
    expect(withBasePath('audio/piano/', '/')).toBe('/audio/piano/');
  });

  it('places preview assets below the repository path', () => {
    expect(withBasePath('/audio/violin/', '/chinese-text-to-music/'))
      .toBe('/chinese-text-to-music/audio/violin/');
  });
});
```

- [ ] **Step 2: Run the focused test and verify the missing-module failure**

Run:

```bash
npm test -- src/runtime/base-path.test.ts
```

Expected: FAIL because `src/runtime/base-path.ts` does not exist.

- [ ] **Step 3: Implement the path helper**

Create `src/runtime/base-path.ts`:

```ts
export function withBasePath(
  relativePath: string,
  basePath: string = import.meta.env.BASE_URL,
): string {
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBase}${relativePath.replace(/^\/+/, '')}`;
}
```

- [ ] **Step 4: Configure preview mode and Vite base output**

Append an exception to `.gitignore` after the `.env.*` rule:

```gitignore
!.env.preview
```

Create `.env.preview`:

```dotenv
VITE_BASE_PATH=/chinese-text-to-music/
VITE_RELEASE_CHANNEL=preview
```

Replace `vite.config.ts` with:

```ts
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    build: { manifest: true },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
```

Replace `src/vite-env.d.ts` with:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BASE_PATH?: string;
  readonly VITE_RELEASE_CHANNEL?: 'preview' | 'production';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 5: Route sampler directories through `BASE_URL`**

In `src/audio/instruments.ts`, import the helper:

```ts
import { withBasePath } from '../runtime/base-path';
```

Replace the three hard-coded sampler roots with:

```ts
const piano = new Tone.Sampler({
  urls: maps.piano,
  baseUrl: withBasePath('audio/piano/'),
  release: 1,
}).connect(output);
const violin = new Tone.Sampler({
  urls: maps.violin,
  baseUrl: withBasePath('audio/violin/'),
  release: 1.4,
}).connect(output);
const cello = new Tone.Sampler({
  urls: maps.cello,
  baseUrl: withBasePath('audio/cello/'),
  release: 1.6,
}).connect(output);
```

- [ ] **Step 6: Verify local and preview builds**

Run:

```bash
npm test -- src/runtime/base-path.test.ts src/audio/instruments.test.ts
npm run build
npx vite build --mode preview
```

Expected: the tests pass; both builds succeed; preview `dist/index.html` refers to `/chinese-text-to-music/assets/...`.

- [ ] **Step 7: Commit the base-path boundary**

```bash
git add .env.preview .gitignore vite.config.ts src/vite-env.d.ts src/runtime/base-path.ts src/runtime/base-path.test.ts src/audio/instruments.ts
git commit -m "fix: resolve preview assets below Pages base path"
```

## Task 2: Add a build-only preview badge

**Files:**
- Create: `src/release/channel.ts`
- Create: `src/release/channel.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write the failing release-channel tests**

Create `src/release/channel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { releaseLabel } from './channel';

describe('releaseLabel', () => {
  it('labels preview builds', () => {
    expect(releaseLabel('preview')).toBe('测试版 · PREVIEW');
  });

  it('does not label production or unspecified builds', () => {
    expect(releaseLabel('production')).toBeNull();
    expect(releaseLabel(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run:

```bash
npm test -- src/release/channel.test.ts
```

Expected: FAIL because `src/release/channel.ts` does not exist.

- [ ] **Step 3: Implement the UI-only channel helper**

Create `src/release/channel.ts`:

```ts
export type ReleaseChannel = 'preview' | 'production';

export function releaseLabel(
  channel: string | undefined = import.meta.env.VITE_RELEASE_CHANNEL,
): string | null {
  return channel === 'preview' ? '测试版 · PREVIEW' : null;
}
```

- [ ] **Step 4: Render and style the badge without touching `Score`**

In `src/App.tsx`, import `releaseLabel` and compute it inside `App`:

```ts
import { releaseLabel } from './release/channel';

export function App() {
  const previewLabel = releaseLabel();
```

Replace the masthead metadata span with:

```tsx
<div className="masthead-meta">
  {previewLabel && <span className="preview-badge">{previewLabel}</span>}
  <span className="privacy-mark">本地生成 · 不上传原文</span>
</div>
```

Append to `src/styles.css`:

```css
.masthead-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.preview-badge {
  border: 1px solid #b17818;
  border-radius: 999px;
  background: #ffe2a8;
  color: #674500;
  font-size: 0.78rem;
  font-weight: 750;
  letter-spacing: 0.04em;
  padding: 0.28rem 0.58rem;
}
```

- [ ] **Step 5: Add the component-level environment regression**

Append to `src/App.test.tsx` and add `vi` to its Vitest import:

```tsx
it('shows a badge only for preview builds', () => {
  vi.stubEnv('VITE_RELEASE_CHANNEL', 'preview');
  render(<App />);
  expect(screen.getByText('测试版 · PREVIEW')).toBeInTheDocument();
  vi.unstubAllEnvs();
});
```

- [ ] **Step 6: Run tests and prove music fixtures are unchanged**

Run:

```bash
npm test -- src/release/channel.test.ts src/App.test.tsx src/music/invariants.test.ts
```

Expected: all tests pass, including all four unchanged golden hashes.

- [ ] **Step 7: Commit the preview label**

```bash
git add src/release src/App.tsx src/App.test.tsx src/styles.css
git commit -m "feat: label preview builds without changing scores"
```

## Task 3: Locate and expose text beyond the 300-character limit

**Files:**
- Modify: `src/domain/input.ts`
- Modify: `src/domain/input.test.ts`
- Modify: `src/components/TextPanel.tsx`
- Create: `src/components/TextPanel.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing original-source index tests**

Append to `src/domain/input.test.ts` and import `sourceIndexOfEffectiveCharacter`:

```ts
it('locates an effective character in the unnormalized source', () => {
  const source = `${'春'.repeat(300)}，遠方`;
  expect(sourceIndexOfEffectiveCharacter(source, 301)).toBe(301);
});

it('keeps NFC combining sequences mapped to their original start', () => {
  const source = `e\u0301${'春'.repeat(300)}`;
  expect(sourceIndexOfEffectiveCharacter(source, 301)).toBe(301);
  expect(sourceIndexOfEffectiveCharacter(source, 302)).toBeNull();
});
```

- [ ] **Step 2: Run the domain test and verify the missing export**

Run:

```bash
npm test -- src/domain/input.test.ts
```

Expected: FAIL because `sourceIndexOfEffectiveCharacter` is not exported.

- [ ] **Step 3: Implement Unicode-aware original-source lookup**

Append to `src/domain/input.ts`:

```ts
const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function sourceIndexOfEffectiveCharacter(
  text: string,
  ordinal: number,
): number | null {
  if (!Number.isInteger(ordinal) || ordinal < 1) return null;
  let count = 0;
  for (const part of GRAPHEMES.segment(text)) {
    for (const character of Array.from(part.segment.normalize('NFC'))) {
      if (!EFFECTIVE_CHARACTER.test(character)) continue;
      count += 1;
      if (count === ordinal) return part.index;
    }
  }
  return null;
}
```

- [ ] **Step 4: Write the failing overflow UI test**

Create `src/components/TextPanel.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextPanel } from './TextPanel';

describe('TextPanel overflow feedback', () => {
  it('identifies and selects text from the 301st effective character', () => {
    const text = `${'春'.repeat(300)}，遠方`;
    render(
      <TextPanel
        text={text}
        score={null}
        activeTokenId={null}
        onChange={vi.fn()}
        onSeekToken={vi.fn()}
      />,
    );
    const input = screen.getByLabelText('中文原文') as HTMLTextAreaElement;
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('超过上限 2 个有效字符');
    expect(screen.getByRole('alert')).toHaveTextContent('第 301 个有效字符“遠”');
    fireEvent.click(screen.getByRole('button', { name: '定位超出部分' }));
    expect(input.selectionStart).toBe(301);
    expect(input.selectionEnd).toBe(text.length);
  });
});
```

- [ ] **Step 5: Implement the accessible alert and focus action**

In `src/components/TextPanel.tsx`, add `useRef`, `validateInput`, and `sourceIndexOfEffectiveCharacter` imports. Inside the component compute:

```tsx
const inputRef = useRef<HTMLTextAreaElement>(null);
const validation = validateInput(text);
const overflowStart = validation.code === 'too-long'
  ? sourceIndexOfEffectiveCharacter(text, 301)
  : null;
const overflowCharacter = overflowStart === null
  ? ''
  : Array.from(text.slice(overflowStart).normalize('NFC'))[0] ?? '';
```

Add these properties to the textarea:

```tsx
ref={inputRef}
aria-invalid={validation.code === 'too-long'}
aria-describedby={validation.code === 'too-long' ? 'text-overflow-error' : undefined}
```

Render below the textarea:

```tsx
{validation.code === 'too-long' && overflowStart !== null && (
  <div id="text-overflow-error" className="input-error" role="alert">
    <span>
      超过上限 {validation.count - 300} 个有效字符。第 301 个有效字符
      “{overflowCharacter}”及其后内容暂不能生成。
    </span>
    <button
      type="button"
      onClick={() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(overflowStart, text.length);
      }}
    >
      定位超出部分
    </button>
  </div>
)}
```

Append to `src/styles.css`:

```css
.input-error {
  display: grid;
  gap: 0.55rem;
  margin-top: 0.7rem;
  border-left: 4px solid #a83b2f;
  background: #fff0ed;
  color: #79271f;
  padding: 0.7rem 0.8rem;
}

.input-error button {
  justify-self: start;
  color: inherit;
}

textarea[aria-invalid="true"] {
  border-color: #a83b2f;
  outline-color: #a83b2f;
}
```

- [ ] **Step 6: Verify domain, component, and workstation behavior**

Run:

```bash
npm test -- src/domain/input.test.ts src/components/TextPanel.test.tsx src/components/workstation.test.tsx
```

Expected: all tests pass; deleting back to 300 characters removes the alert through normal React re-rendering.

- [ ] **Step 7: Commit overflow feedback**

```bash
git add src/domain/input.ts src/domain/input.test.ts src/components/TextPanel.tsx src/components/TextPanel.test.tsx src/styles.css
git commit -m "feat: locate text beyond the generation limit"
```

## Task 4: Draw semantic track shapes and readable live status

**Files:**
- Create: `src/components/sequencer-drawing.ts`
- Create: `src/components/sequencer-drawing.test.ts`
- Modify: `src/components/SequencerCanvas.tsx`
- Modify: `src/components/SequencerCanvas.test.tsx`
- Modify: `src/test/setup.ts`

- [ ] **Step 1: Write failing tests for the four approved shapes**

Create `src/components/sequencer-drawing.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { drawTrackShape } from './sequencer-drawing';

function context() {
  return {
    beginPath: vi.fn(), closePath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(), fillRect: vi.fn(),
    strokeRect: vi.fn(), save: vi.fn(), restore: vi.fn(),
    fillStyle: '', strokeStyle: '', lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
}

const rectangle = { x: 10, y: 20, width: 40, height: 8 };

describe('drawTrackShape', () => {
  it('uses a rounded solid melody shape', () => {
    const canvas = context();
    drawTrackShape(canvas, 'melody', rectangle, '#cf5736');
    expect(canvas.roundRect).toHaveBeenCalled();
    expect(canvas.fill).toHaveBeenCalled();
  });

  it('uses double outlines for harmony', () => {
    const canvas = context();
    drawTrackShape(canvas, 'harmony', rectangle, '#665fc2');
    expect(canvas.strokeRect).toHaveBeenCalledTimes(2);
  });

  it('adds a thick bass floor', () => {
    const canvas = context();
    drawTrackShape(canvas, 'bass', rectangle, '#27866d');
    expect(canvas.fillRect).toHaveBeenCalledTimes(2);
  });

  it('uses a diamond path for percussion', () => {
    const canvas = context();
    drawTrackShape(canvas, 'percussion', rectangle, '#d69a25');
    expect(canvas.moveTo).toHaveBeenCalledWith(30, 20);
    expect(canvas.lineTo).toHaveBeenCalledTimes(3);
    expect(canvas.closePath).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the drawing test and verify the missing-module failure**

Run:

```bash
npm test -- src/components/sequencer-drawing.test.ts
```

Expected: FAIL because `sequencer-drawing.ts` does not exist.

- [ ] **Step 3: Implement the semantic drawing functions**

Create `src/components/sequencer-drawing.ts`:

```ts
import type { TrackKind } from '../domain/types';

export interface EventRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function drawTrackShape(
  context: CanvasRenderingContext2D,
  track: TrackKind,
  rectangle: EventRectangle,
  color: string,
): void {
  const { x, y, width, height } = rectangle;
  context.save();
  context.fillStyle = color;
  context.strokeStyle = '#211f1b';
  if (track === 'melody') {
    context.beginPath();
    context.roundRect(x, y, width, height, Math.min(4, height / 2));
    context.fill();
    context.stroke();
  } else if (track === 'harmony') {
    context.fillStyle = `${color}55`;
    context.fillRect(x, y, width, height);
    context.strokeRect(x, y, width, height);
    context.strokeRect(x + 2, y + 2, Math.max(0, width - 4), Math.max(0, height - 4));
  } else if (track === 'bass') {
    context.fillRect(x, y, width, height);
    context.fillStyle = '#155844';
    context.fillRect(x, y + Math.max(0, height - 3), width, 3);
  } else {
    const half = Math.max(4, height / 2);
    const centerX = x + Math.max(half, width / 2);
    const centerY = y + height / 2;
    context.beginPath();
    context.moveTo(centerX, centerY - half);
    context.lineTo(centerX + half, centerY);
    context.lineTo(centerX, centerY + half);
    context.lineTo(centerX - half, centerY);
    context.closePath();
    context.fill();
    context.stroke();
  }
  context.restore();
}
```

- [ ] **Step 4: Use track metadata and readable token content in the Canvas component**

In `src/components/SequencerCanvas.tsx`, import `drawTrackShape`, derive the active values, and replace `fillRect`:

```tsx
import { drawTrackShape } from './sequencer-drawing';

const activeToken = score.tokens.find((token) => token.id === activeTokenId);
const activeEvent = score.noteEvents.find((event) => event.tokenId === activeTokenId);
const activeTrack = score.tracks.find((track) => track.id === activeEvent?.trackId);
```

Inside the drawing loop:

```ts
context.globalAlpha = event.tokenId === activeTokenId ? 1 : 0.74;
const x = rectangle.x - viewport.scrollLeft;
drawTrackShape(
  context,
  (score.tracks.find((track) => track.id === event.trackId)?.kind ?? 'melody'),
  { ...rectangle, x },
  COLORS[event.trackId] ?? '#777',
);
```

Replace the live-region text with:

```tsx
<span className="sr-only" aria-live="polite">
  当前词语“{activeToken?.raw ?? '无'}”，时间 {playheadSeconds.toFixed(1)} 秒，
  声部“{activeTrack?.label ?? '无'}”
</span>
```

- [ ] **Step 5: Expand the Canvas test environment and readable-status test**

Add `beginPath`, `closePath`, `moveTo`, `lineTo`, `roundRect`, `fill`, `stroke`, `save`, and `restore` mocks to the Canvas context in `src/test/setup.ts` and `src/components/SequencerCanvas.test.tsx`.

Give the test score a real token and track:

```ts
tokens: [{
  id: 'token-0', raw: '春风', normalized: '春风', sourceStart: 0, sourceEnd: 2,
  pinyin: ['chun1', 'feng1'], tones: [1, 1], kind: 'word',
}],
tracks: [{ id: 'melody', kind: 'melody', label: '主旋律' }],
```

Render with `activeTokenId="token-0"` and assert:

```ts
expect(getByText(/当前词语“春风”.*声部“主旋律”/u)).toBeInTheDocument();
expect(queryByText(/token-0/u)).not.toBeInTheDocument();
```

- [ ] **Step 6: Run drawing, Canvas, and geometry tests**

Run:

```bash
npm test -- src/components/sequencer-drawing.test.ts src/components/SequencerCanvas.test.tsx src/components/sequencer-geometry.test.ts
```

Expected: all tests pass and click hit-testing remains based on the unchanged event rectangles.

- [ ] **Step 7: Commit semantic Canvas rendering**

```bash
git add src/components/sequencer-drawing.ts src/components/sequencer-drawing.test.ts src/components/SequencerCanvas.tsx src/components/SequencerCanvas.test.tsx src/test/setup.ts
git commit -m "feat: distinguish sequencer tracks by shape"
```

## Task 5: Lazy-load the complete dictionary and Tone audio graph

**Files:**
- Create: `src/runtime/retryable-loader.ts`
- Create: `src/runtime/retryable-loader.test.ts`
- Create: `src/audio/lazy-engine.ts`
- Create: `src/audio/lazy-engine.test.ts`
- Create: `scripts/verify-build-chunks.mjs`
- Modify: `src/text/analyze.ts`
- Modify: `src/App.tsx`
- Modify: `package.json`

- [ ] **Step 1: Write failing retryable-loader tests**

Create `src/runtime/retryable-loader.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { createRetryableLoader } from './retryable-loader';

describe('createRetryableLoader', () => {
  it('shares a successful in-flight load', async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    const initialize = createRetryableLoader(load);
    await Promise.all([initialize(), initialize(), initialize()]);
    expect(load).toHaveBeenCalledOnce();
  });

  it('allows a retry after failure', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    const initialize = createRetryableLoader(load);
    await expect(initialize()).rejects.toThrow('offline');
    await expect(initialize()).resolves.toBeUndefined();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run the loader tests and verify the missing-module failure**

Run:

```bash
npm test -- src/runtime/retryable-loader.test.ts
```

Expected: FAIL because `retryable-loader.ts` does not exist.

- [ ] **Step 3: Implement a single-flight retryable loader**

Create `src/runtime/retryable-loader.ts`:

```ts
export function createRetryableLoader(load: () => Promise<void>): () => Promise<void> {
  let loaded = false;
  let pending: Promise<void> | null = null;
  return async () => {
    if (loaded) return;
    pending ??= load()
      .then(() => { loaded = true; })
      .catch((error) => {
        pending = null;
        throw error;
      });
    await pending;
  };
}
```

- [ ] **Step 4: Move the complete dictionary behind a dynamic import**

In `src/text/analyze.ts`, remove the static `CompleteDict` import, import `createRetryableLoader`, and replace initialization with:

```ts
import { createRetryableLoader } from '../runtime/retryable-loader';

let initialized = false;
const loadCompleteDictionary = createRetryableLoader(async () => {
  const { default: completeDictionary } = await import('@pinyin-pro/data/complete');
  addDict(completeDictionary);
  initialized = true;
});

export async function initializeTextAnalyzer(): Promise<void> {
  await loadCompleteDictionary();
}
```

Keep the existing `analyzeText` initialized guard unchanged.

- [ ] **Step 5: Write failing lazy-audio facade tests**

Create `src/audio/lazy-engine.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { Score } from '../domain/types';
import { LazyAudioEngine, type AudioEnginePort } from './lazy-engine';

const score = {
  settings: { timbre: 'chamber-piano' },
} as Score;

function engine(): AudioEnginePort {
  return {
    play: vi.fn().mockResolvedValue(false), pause: vi.fn(() => 2), stop: vi.fn(),
    setVolume: vi.fn(), dispose: vi.fn(),
  };
}

describe('LazyAudioEngine', () => {
  it('loads once and reuses the engine', async () => {
    const instance = engine();
    const factory = vi.fn().mockResolvedValue(instance);
    const lazy = new LazyAudioEngine(factory);
    await lazy.play(score, 0, vi.fn());
    await lazy.play(score, 3, vi.fn());
    expect(factory).toHaveBeenCalledOnce();
    expect(instance.play).toHaveBeenCalledTimes(2);
  });

  it('cancels a play request stopped during module loading', async () => {
    const instance = engine();
    let finish!: (engine: AudioEnginePort) => void;
    const factory = vi.fn(() => new Promise<AudioEnginePort>((resolve) => { finish = resolve; }));
    const lazy = new LazyAudioEngine(factory);
    const play = lazy.play(score, 0, vi.fn());
    lazy.stop();
    finish(instance);
    await expect(play).resolves.toBeUndefined();
    expect(instance.play).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Implement the lazy audio facade**

Create `src/audio/lazy-engine.ts`:

```ts
import type { Score } from '../domain/types';

export interface AudioEnginePort {
  play(
    score: Score,
    fromSeconds: number,
    onUpdate: (seconds: number, tokenId: string | null) => void,
    onEnded?: () => void,
  ): Promise<boolean | undefined>;
  pause(): number;
  stop(): void;
  setVolume(volume: number): void;
  dispose(): void;
}

type Factory = () => Promise<AudioEnginePort>;

const defaultFactory: Factory = async () => {
  const { AudioEngine } = await import('./engine');
  return new AudioEngine();
};

export class LazyAudioEngine {
  private instance: AudioEnginePort | null = null;
  private pending: Promise<AudioEnginePort> | null = null;
  private requestId = 0;
  private volume = 0.8;

  constructor(private readonly factory: Factory = defaultFactory) {}

  private async get(): Promise<AudioEnginePort> {
    if (this.instance) return this.instance;
    this.pending ??= this.factory()
      .then((instance) => {
        this.instance = instance;
        instance.setVolume(this.volume);
        return instance;
      })
      .catch((error) => {
        this.pending = null;
        throw error;
      });
    return this.pending;
  }

  async play(
    score: Score,
    fromSeconds: number,
    onUpdate: (seconds: number, tokenId: string | null) => void,
    onEnded: () => void = () => undefined,
  ): Promise<boolean | undefined> {
    const requestId = ++this.requestId;
    const instance = await this.get();
    if (requestId !== this.requestId) return undefined;
    return instance.play(score, fromSeconds, onUpdate, onEnded);
  }

  pause(): number {
    this.requestId += 1;
    return this.instance?.pause() ?? 0;
  }

  stop(): void {
    this.requestId += 1;
    this.instance?.stop();
  }

  setVolume(volume: number): void {
    this.volume = volume;
    this.instance?.setVolume(volume);
  }

  dispose(): void {
    this.requestId += 1;
    this.instance?.dispose();
    this.instance = null;
    this.pending = null;
  }
}
```

- [ ] **Step 7: Replace eager audio and exporter imports in `App`**

In `src/App.tsx`, replace the `AudioEngine` and `exportScoreWav` imports with:

```ts
import { LazyAudioEngine } from './audio/lazy-engine';
```

Initialize the ref with:

```ts
const engineRef = useRef<LazyAudioEngine | null>(null);
engineRef.current ??= new LazyAudioEngine();
```

Inside the export handler, before rendering, load the exporter:

```ts
const { exportScoreWav } = await import('./audio/exporter');
const blob = await exportScoreWav(state.score);
```

All existing `play`, `pause`, `stop`, `setVolume`, and `dispose` calls remain on the facade.

- [ ] **Step 8: Add the build-manifest verifier**

Create `scripts/verify-build-chunks.mjs`:

```js
import { readFile, stat } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'));
const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
if (!entryKey) throw new Error('Vite manifest has no entry chunk');

const eager = new Set();
function visit(key) {
  if (eager.has(key)) return;
  eager.add(key);
  for (const imported of manifest[key]?.imports ?? []) visit(imported);
}
visit(entryKey);

const forbidden = [...eager].filter((key) =>
  key.includes('@pinyin-pro/data/complete')
  || key === 'src/audio/engine.ts'
  || key === 'src/audio/exporter.ts'
  || key.includes('node_modules/tone'),
);
if (forbidden.length > 0) {
  throw new Error(`Eager build still contains lazy modules: ${forbidden.join(', ')}`);
}

for (const required of [
  'src/audio/engine.ts',
  'src/audio/exporter.ts',
]) {
  if (!manifest[required]) throw new Error(`Missing dynamic entry: ${required}`);
}

const completeDictionary = Object.keys(manifest)
  .find((key) => key.includes('@pinyin-pro/data/complete'));
if (!completeDictionary) throw new Error('Complete dictionary was not emitted as a separate chunk');

for (const key of eager) {
  const file = manifest[key]?.file;
  if (!file) continue;
  const size = (await stat(`dist/${file}`)).size;
  console.log(`${key}: ${(size / 1024).toFixed(1)} KiB`);
}
console.log('Verified lazy dictionary and audio chunk boundaries.');
```

Add to `package.json`:

```json
"build:chunks:verify": "node scripts/verify-build-chunks.mjs"
```

- [ ] **Step 9: Run focused tests, build, and chunk verification**

Run:

```bash
npm test -- src/runtime/retryable-loader.test.ts src/audio/lazy-engine.test.ts src/text/analyze.test.ts src/components/workstation.test.tsx
npm run build
npm run build:chunks:verify
```

Expected: tests pass; the build succeeds; the verifier reports eager chunk sizes and confirms separate dictionary/audio entries.

- [ ] **Step 10: Commit lazy loading**

```bash
git add src/runtime/retryable-loader.ts src/runtime/retryable-loader.test.ts src/audio/lazy-engine.ts src/audio/lazy-engine.test.ts src/text/analyze.ts src/App.tsx scripts/verify-build-chunks.mjs package.json
git commit -m "perf: lazy-load dictionary and audio runtime"
```

## Task 6: Test the built preview at its real Pages path

**Files:**
- Create: `scripts/run-preview-e2e.mjs`
- Modify: `package.json`
- Modify: `playwright.config.ts`
- Modify: `tests/e2e/workstation.spec.ts`

- [ ] **Step 1: Point Playwright at an overridable URL**

Replace the fixed `baseURL` in `playwright.config.ts` with:

```ts
baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173/',
```

Change every `page.goto('/')` in `tests/e2e/workstation.spec.ts` to:

```ts
await page.goto('./');
```

At the start of the first test, after navigation, add:

```ts
if (process.env.EXPECT_PREVIEW_BADGE === '1') {
  await expect(page.getByText('测试版 · PREVIEW')).toBeVisible();
}
```

- [ ] **Step 2: Create a runner for the built preview**

Create `scripts/run-preview-e2e.mjs`:

```js
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { preview } from 'vite';

const host = '127.0.0.1';
const port = 4174;
const basePath = '/chinese-text-to-music/';
const server = await preview({
  mode: 'preview',
  preview: { host, port, strictPort: true },
});
const cli = resolve('node_modules/@playwright/test/cli.js');
const child = spawn(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
  cwd: resolve('.'),
  env: {
    ...process.env,
    PLAYWRIGHT_BASE_URL: `http://${host}:${port}${basePath}`,
    EXPECT_PREVIEW_BADGE: '1',
  },
  stdio: 'inherit',
  windowsHide: true,
});

try {
  const exitCode = await new Promise((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal) reject(new Error(`Playwright exited after signal ${signal}`));
      else resolveExit(code ?? 1);
    });
  });
  process.exitCode = exitCode;
} finally {
  await new Promise((resolveClose, reject) => {
    server.httpServer.close((error) => error ? reject(error) : resolveClose());
  });
}
```

- [ ] **Step 3: Add cross-platform preview scripts**

Add these scripts to `package.json`:

```json
"build:preview": "tsc --noEmit && vite build --mode preview",
"test:e2e:preview": "npm run build:preview && node scripts/run-preview-e2e.mjs",
"verify:preview": "npm run samples:verify && npm run test && npm run benchmark && npm run test:e2e:preview -- --project=chromium && npm run build:chunks:verify"
```

- [ ] **Step 4: Add asset-failure detection to the browser flow**

At the beginning of the first E2E test, collect failed resource responses:

```ts
const failedAssets: string[] = [];
page.on('response', (response) => {
  if (response.status() >= 400) failedAssets.push(`${response.status()} ${response.url()}`);
});
```

After playback has started, assert:

```ts
expect(failedAssets).toEqual([]);
```

Keep the existing separate test that aborts MP3 requests and verifies synthesized fallback.

- [ ] **Step 5: Run local and built-preview browser gates**

Run:

```bash
npm run test:e2e -- --project=chromium
npm run test:e2e:preview -- --project=chromium
```

Expected: 4 local and 4 built-preview Chromium tests pass; the built run opens `/chinese-text-to-music/`, shows the preview badge, loads licensed samples without 404s, and still validates the fallback path.

- [ ] **Step 6: Commit preview integration testing**

```bash
git add scripts/run-preview-e2e.mjs package.json playwright.config.ts tests/e2e/workstation.spec.ts
git commit -m "test: verify the built Pages preview"
```

## Task 7: Add the Pages deployment workflow and operator documentation

**Files:**
- Create: `.github/workflows/pages-preview.yml`
- Modify: `README.md`

- [ ] **Step 1: Create the least-privilege deployment workflow**

Create `.github/workflows/pages-preview.yml`:

```yaml
name: Pages preview

on:
  push:
    branches:
      - codex/implement-mvp
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages-preview
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Chromium
        run: npx playwright install --with-deps chromium

      - name: Configure Pages
        uses: actions/configure-pages@v5

      - name: Verify preview build
        run: npm run verify:preview

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: dist

      - name: Deploy preview
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Document preview operations and privacy boundaries**

Append to `README.md`:

````md
## GitHub Pages 测试版

`codex/implement-mvp` 每次推送都会在完整验证通过后更新测试版：

https://jidedaida.github.io/chinese-text-to-music/

测试版页面会显示“测试版 · PREVIEW”。它没有账户、分析统计或后端；输入原文、曲谱和 WAV 只存在于当前浏览器。

本地复现 Pages 构建与浏览器流程：

```bash
npm run verify:preview
```

Windows 正式合并前仍需执行：

```bash
npm run test:e2e -- --project=edge
```
````

- [ ] **Step 3: Validate YAML structure and the full local preview command**

Run:

```bash
npm run verify:preview
git diff --check
```

Expected: all preview gates pass and Git reports no whitespace errors. Inspect `.github/workflows/pages-preview.yml` to confirm only `contents: read`, `pages: write`, and `id-token: write` are granted.

- [ ] **Step 4: Commit deployment automation**

```bash
git add .github/workflows/pages-preview.yml README.md
git commit -m "ci: publish the verified Pages preview"
```

## Task 8: Complete release verification, enable Pages, and smoke-test the public URL

**Files:**
- Modify only if verification exposes a defect in files already listed above.

- [ ] **Step 1: Run the complete local verification from a clean server state**

Run:

```bash
npm run verify
npm run verify:preview
npm run test:e2e -- --project=edge
git diff --check
git status --short --branch
```

Expected: 23 licensed files verify; all Vitest tests pass; production and preview builds succeed; local Chromium, preview Chromium, and Windows Edge E2E suites pass; benchmark median stays at or below 1000 ms; the worktree is clean.

- [ ] **Step 2: Request final code review and fix all Critical/Important findings**

Provide the reviewer:

```text
DESCRIPTION: GitHub Pages preview release, semantic Canvas tracks, overflow locator, accessible live status, and lazy dictionary/audio chunks.
PLAN_OR_REQUIREMENTS: docs/superpowers/specs/2026-09-17-preview-release-polish-design.md and this plan.
BASE_SHA: 5f3fa47
HEAD_SHA: current HEAD
```

Expected: no remaining Critical or Important findings. Re-run Step 1 after any fix and commit the fix separately.

- [ ] **Step 3: Enable workflow-based GitHub Pages before the first preview push**

First inspect the current state:

```bash
gh api repos/jidedaida/chinese-text-to-music/pages
```

If the response is HTTP 404, create the Pages site:

```bash
gh api --method POST repos/jidedaida/chinese-text-to-music/pages -f build_type=workflow
```

If Pages already exists, make its build type explicit:

```bash
gh api --method PUT repos/jidedaida/chinese-text-to-music/pages -f build_type=workflow
```

Expected: GitHub reports a workflow-based Pages configuration before the branch push starts the first deployment. Do not change repository visibility or create a custom domain.

If either API call returns HTTP 403, stop and report the account or repository restriction. Do not silently switch hosting providers; the approved design requires the user to approve the documented static-hosting fallback first.

- [ ] **Step 4: Push the verified branch and trigger the first deployment**

Run:

```bash
git push origin codex/implement-mvp
```

Expected: the remote branch advances to the local HEAD without force-pushing. Its `push` event starts the Pages workflow even though the workflow file is not yet on the default branch.

- [ ] **Step 5: Watch the deployment to completion**

In PowerShell, run:

```powershell
$pagesRunId = gh run list --workflow pages-preview.yml --branch codex/implement-mvp --event push --limit 1 --json databaseId --jq '.[0].databaseId'
if (-not $pagesRunId) { throw 'The push-triggered Pages workflow is not visible yet; rerun the read-only list command.' }
gh run watch $pagesRunId --exit-status
```

Expected: the push-triggered `Pages preview` workflow completes successfully and reports the Pages deployment URL. If the list is temporarily empty, repeat only the read-only `gh run list` command before watching; do not push again. Keep `workflow_dispatch` in the workflow so manual runs remain available after the workflow reaches the default branch.

- [ ] **Step 6: Smoke-test the deployed site with Playwright**

In PowerShell, run:

```powershell
$env:PLAYWRIGHT_BASE_URL='https://jidedaida.github.io/chinese-text-to-music/'
$env:EXPECT_PREVIEW_BADGE='1'
npx playwright test --project=chromium
Remove-Item Env:PLAYWRIGHT_BASE_URL
Remove-Item Env:EXPECT_PREVIEW_BADGE
```

Expected: all 4 E2E tests pass against the public URL, including real sample playback, WAV download, privacy assertion, refresh, accessibility, and synthesized fallback.

- [ ] **Step 7: Verify remote identity and preserve the branch**

Run:

```bash
git rev-parse HEAD
git ls-remote origin refs/heads/codex/implement-mvp
git status --short --branch
```

Expected: local and remote SHAs match and the named worktree remains clean. Keep `codex/implement-mvp` and its worktree; do not merge `main` until the user completes subjective listening.
