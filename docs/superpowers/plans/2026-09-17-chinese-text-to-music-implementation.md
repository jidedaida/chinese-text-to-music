# Chinese Text-to-Music MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved desktop-browser MVP that deterministically turns 10–300 effective Chinese-text characters into a four-track composition, visualizes it in a synchronized piano roll, plays it locally, and exports a WAV file.

**Architecture:** Keep text analysis and composition as deterministic, side-effect-free TypeScript modules that produce one canonical `Score`. React renders a three-column workstation, Canvas visualizes that score, and a Tone.js adapter uses the same score for real-time playback and offline export. No text, tokens, score, or audio leave the browser.

**Tech Stack:** Node 24, npm 11, TypeScript 7.0.2, tsx 4.23.13, React 19.3.0, Vite 8.3.0, Vitest 5.0.1, Testing Library 16.3.3, Playwright 1.63.0, Tone.js 15.1.22, opencc-js 1.4.2, pinyin-pro 3.29.4, @pinyin-pro/data 1.3.1.

---

## File map

```text
index.html                         Browser entry document
package.json                       Locked scripts and dependency versions
vite.config.ts                     Vite and Vitest configuration
playwright.config.ts               Chrome/Edge-compatible end-to-end configuration
src/main.tsx                       React mount point
src/App.tsx                        Application orchestration and state transitions
src/styles.css                     Three-column workstation and responsive warning styles
src/domain/types.ts                Shared token, motif, score, settings, and state types
src/domain/settings.ts             Defaults and settings normalization
src/domain/input.ts                Effective-character validation
src/text/normalize.ts              NFC, punctuation, and Traditional-to-Simplified identity
src/text/analyze.ts                Versioned segmentation, pinyin, tone, and source spans
src/music/hash.ts                  SHA-256 helpers and stable serialization
src/music/scales.ts                Scale degrees, MIDI ranges, and pitch snapping
src/music/motif.ts                 Word-seed to stable motif mapping
src/music/compose.ts               Melody, form, duration compression, and four-track arrangement
src/music/score.ts                 Canonical score serialization and music hash
src/state/reducer.ts               Explicit UI state machine
src/audio/instruments.ts           Sample manifests, synth fallbacks, and instrument bank
src/audio/engine.ts                Tone.js transport scheduling and playhead callbacks
src/audio/wav.ts                   PCM-to-WAV encoder
src/audio/exporter.ts              Offline rendering from the canonical score
src/components/TextPanel.tsx       Input, count, token highlighting, and seek requests
src/components/ControlPanel.tsx    Key, scale, BPM, mood, timbre, and generate action
src/components/SequencerCanvas.tsx Canvas piano roll and hit testing
src/components/TransportBar.tsx    Playback, progress, volume, and WAV export controls
src/components/Compatibility.tsx   Unsupported-browser and narrow-screen notice
src/test/setup.ts                  DOM matcher and browser API test setup
src/**/*.test.ts(x)                Unit and component tests next to their owners
tests/e2e/workstation.spec.ts       Browser-level happy path and error states
tests/fixtures/*.json              Versioned golden-score fixtures
scripts/fetch-samples.mjs          Reproducible sample downloader with SHA-256 manifest
public/audio/**                    Pinned piano, violin, and cello sample subset
NOTICE.md                          Sample attribution and license record
```

Implementation rule: every task begins with a failing test, implements only the behavior required by that test, runs the narrow test, then runs the full relevant suite before committing.

Scope decision: the text pipeline, composer, workstation, audio engine, and exporter remain in one plan because each later subsystem consumes the same versioned `Score` and the final privacy and browser checks require the complete vertical path. Tasks 1–7 produce a headless deterministic core before Tasks 8–15 add presentation and audio.

### Task 1: Bootstrap the tested React application

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/vite-env.d.ts`
- Create: `src/test/setup.ts`
- Create: `src/App.test.tsx`
- Create: `src/App.tsx`
- Create: `src/main.tsx`
- Create: `src/styles.css`
- Modify: `.gitignore`

- [ ] **Step 1: Create the package and TypeScript configuration**

Create `package.json`:

```json
{
  "name": "chinese-text-to-music",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "npm run test && npm run build"
  },
  "dependencies": {
    "@pinyin-pro/data": "1.3.1",
    "opencc-js": "1.4.2",
    "pinyin-pro": "3.29.4",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "tone": "15.1.22"
  },
  "devDependencies": {
    "@playwright/test": "1.63.0",
    "@testing-library/jest-dom": "7.0.1",
    "@testing-library/react": "16.3.3",
    "@types/node": "22.20.3",
    "@types/opencc-js": "1.0.3",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.1.1",
    "jsdom": "30.0.1",
    "typescript": "7.0.2",
    "vite": "8.3.0",
    "vitest": "5.0.1"
  }
}
```

Replace `.gitignore` with:

```gitignore
.superpowers/
node_modules/
dist/
coverage/
playwright-report/
test-results/
.vite/
.env
.env.*
*.log
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "useDefineForClassFields": true,
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["node", "vite/client", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "vite.config.ts", "playwright.config.ts", "tests"]
}
```

Create `vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 2: Install exactly the locked dependencies**

Run: `npm install`

Expected: exit code 0 and a new `package-lock.json` containing the versions declared above.

- [ ] **Step 3: Write the failing application smoke test**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Create `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the product name', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '字谱' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the smoke test and verify the missing module failure**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because `src/App.tsx` does not exist.

- [ ] **Step 5: Add the smallest renderable application**

Create `src/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <h1>字谱</h1>
      <p>让每一段中文拥有稳定的音乐指纹。</p>
    </main>
  );
}
```

Create `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

Create `src/styles.css`:

```css
:root {
  color: #26241f;
  background: #f4f1e9;
  font-family: Inter, "Noto Sans SC", system-ui, sans-serif;
}

* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; min-height: 100vh; }
button, input, select, textarea { font: inherit; }
.app-shell { min-height: 100vh; padding: 24px; }
```

Create `index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#f4f1e9" />
    <title>字谱</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 6: Verify tests and production build**

Run: `npm run check`

Expected: one passing test and a successful Vite production build.

- [ ] **Step 7: Commit the scaffold**

```bash
git add .gitignore package.json package-lock.json tsconfig.json vite.config.ts index.html src
git commit -m "chore: scaffold tested browser app"
```

### Task 2: Define domain types, settings, and input validation

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/settings.ts`
- Create: `src/domain/settings.test.ts`
- Create: `src/domain/input.ts`
- Create: `src/domain/input.test.ts`

- [ ] **Step 1: Write failing settings and input tests**

Create `src/domain/settings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, resolveSettings } from './settings';

describe('resolveSettings', () => {
  it('uses the approved defaults', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      tonic: 0,
      scale: 'major-pentatonic',
      bpm: 84,
      mood: 'auto',
      timbre: 'chamber-piano',
    });
  });

  it('clamps BPM and preserves explicit user values', () => {
    expect(resolveSettings({ ...DEFAULT_SETTINGS, bpm: 999 }, 'calm').bpm).toBe(140);
    expect(resolveSettings({ ...DEFAULT_SETTINGS, bpm: 60, mood: 'bright' }, 'calm')).toMatchObject({
      bpm: 60,
      mood: 'bright',
      requestedMood: 'bright',
    });
  });
});
```

Create `src/domain/input.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { countEffectiveCharacters, validateInput } from './input';

describe('input validation', () => {
  it('counts letters, numbers, and Han characters but not punctuation or space', () => {
    expect(countEffectiveCharacters('春风，A1！ ')).toBe(4);
  });

  it('enforces the inclusive 10 to 300 range', () => {
    expect(validateInput('春'.repeat(9)).code).toBe('too-short');
    expect(validateInput('春'.repeat(10)).code).toBe('valid');
    expect(validateInput('春'.repeat(300)).code).toBe('valid');
    expect(validateInput('春'.repeat(301)).code).toBe('too-long');
  });

  it('rejects punctuation-only text', () => {
    expect(validateInput('，。！？').code).toBe('empty');
  });
});
```

- [ ] **Step 2: Run the tests and verify missing-module failures**

Run: `npm test -- src/domain/settings.test.ts src/domain/input.test.ts`

Expected: FAIL because the domain modules do not exist.

- [ ] **Step 3: Add shared domain types**

Create `src/domain/types.ts`:

```ts
export type ToneNumber = 0 | 1 | 2 | 3 | 4 | 5;
export type Mood = 'auto' | 'bright' | 'calm' | 'melancholic';
export type ResolvedMood = Exclude<Mood, 'auto'>;
export type ScaleMode = 'major' | 'natural-minor' | 'major-pentatonic' | 'minor-pentatonic';
export type TimbrePreset = 'chamber-piano' | 'soft-electronic' | 'minimal-piano';
export type TrackKind = 'melody' | 'harmony' | 'bass' | 'percussion';
export type Articulation = 'legato' | 'normal' | 'staccato' | 'accent';

export interface GenerationSettings {
  tonic: number;
  scale: ScaleMode;
  bpm: number;
  mood: Mood;
  timbre: TimbrePreset;
}

export interface ResolvedSettings extends Omit<GenerationSettings, 'mood'> {
  mood: ResolvedMood;
  requestedMood: Mood;
}

export interface Token {
  id: string;
  raw: string;
  normalized: string;
  sourceStart: number;
  sourceEnd: number;
  pinyin: string[];
  tones: ToneNumber[];
  kind: 'word' | 'punctuation' | 'other';
}

export interface MotifNote {
  degreeOffset: number;
  startBeat: number;
  durationBeats: number;
  velocity: number;
}

export interface MotifSpec {
  tokenId: string;
  rhythmId: number;
  baseDegree: number;
  octave: number;
  articulation: Articulation;
  notes: MotifNote[];
}

export interface Track {
  id: string;
  kind: TrackKind;
  label: string;
}

export interface NoteEvent {
  id: string;
  tokenId: string | null;
  trackId: string;
  startBeat: number;
  durationBeats: number;
  midi: number;
  velocity: number;
}

export interface Score {
  schemaVersion: 'score-v1';
  mappingVersion: 'mapping-v1';
  composerVersion: 'composer-v1';
  seed: string;
  musicHash: string;
  settings: ResolvedSettings;
  durationSeconds: number;
  tokens: Token[];
  tracks: Track[];
  noteEvents: NoteEvent[];
}
```

- [ ] **Step 4: Implement settings normalization and input validation**

Create `src/domain/settings.ts`:

```ts
import type { GenerationSettings, ResolvedMood, ResolvedSettings } from './types';

export const DEFAULT_SETTINGS: GenerationSettings = {
  tonic: 0,
  scale: 'major-pentatonic',
  bpm: 84,
  mood: 'auto',
  timbre: 'chamber-piano',
};

export function resolveSettings(
  settings: GenerationSettings,
  inferredMood: ResolvedMood,
): ResolvedSettings {
  return {
    ...settings,
    tonic: ((Math.round(settings.tonic) % 12) + 12) % 12,
    bpm: Math.min(140, Math.max(60, Math.round(settings.bpm))),
    mood: settings.mood === 'auto' ? inferredMood : settings.mood,
    requestedMood: settings.mood,
  };
}
```

Create `src/domain/input.ts`:

```ts
export type InputValidation = {
  code: 'empty' | 'too-short' | 'too-long' | 'valid';
  count: number;
};

const EFFECTIVE_CHARACTER = /[\p{Script=Han}\p{Letter}\p{Number}]/u;

export function countEffectiveCharacters(text: string): number {
  return Array.from(text.normalize('NFC')).filter((character) =>
    EFFECTIVE_CHARACTER.test(character),
  ).length;
}

export function validateInput(text: string): InputValidation {
  const count = countEffectiveCharacters(text);
  if (count === 0) return { code: 'empty', count };
  if (count < 10) return { code: 'too-short', count };
  if (count > 300) return { code: 'too-long', count };
  return { code: 'valid', count };
}
```

- [ ] **Step 5: Run the domain tests and type check**

Run: `npm test -- src/domain/settings.test.ts src/domain/input.test.ts`

Expected: 5 passing tests.

Run: `npm run build`

Expected: TypeScript and Vite build succeed.

- [ ] **Step 6: Commit the domain contract**

```bash
git add src/domain
git commit -m "feat: define score settings and input rules"
```

### Task 3: Add deterministic normalization, segmentation, and tones

**Files:**
- Create: `src/text/normalize.ts`
- Create: `src/text/normalize.test.ts`
- Create: `src/text/analyze.ts`
- Create: `src/text/analyze.test.ts`

- [ ] **Step 1: Write failing normalization and analysis tests**

Create `src/text/normalize.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeIdentityText } from './normalize';

describe('normalizeIdentityText', () => {
  it('normalizes Unicode, punctuation, whitespace, and Traditional Chinese', () => {
    expect(normalizeIdentityText('  春風，\r\n落在河面！ ')).toBe('春风,\n落在河面!');
  });
});
```

Create `src/text/analyze.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { analyzeText, initializeTextAnalyzer } from './analyze';

beforeAll(async () => initializeTextAnalyzer());

describe('analyzeText', () => {
  it('uses fixed reverse maximum matching and keeps punctuation', () => {
    const result = analyzeText('春风吹过山谷，星光落在河面。');
    expect(result.map((token) => token.normalized)).toContain('春风');
    expect(result.some((token) => token.kind === 'punctuation')).toBe(true);
  });

  it('makes Simplified and Traditional identity tokens equal', () => {
    const simplified = analyzeText('春风吹过山谷。').filter((token) => token.kind === 'word');
    const traditional = analyzeText('春風吹過山谷。').filter((token) => token.kind === 'word');
    expect(traditional.map((token) => token.normalized)).toEqual(
      simplified.map((token) => token.normalized),
    );
    expect(traditional.map((token) => token.raw).join('')).toContain('春風');
  });

  it('extracts numbered tones and leaves Latin text neutral', () => {
    const tokens = analyzeText('春风A1。');
    const spring = tokens.find((token) => token.normalized === '春风')!;
    const latin = tokens.find((token) => token.raw.includes('A1'))!;
    expect(spring.tones).toEqual([1, 1]);
    expect(latin.tones.every((tone) => tone === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests and verify missing-module failures**

Run: `npm test -- src/text/normalize.test.ts src/text/analyze.test.ts`

Expected: FAIL because the text modules do not exist.

- [ ] **Step 3: Implement versioned identity normalization**

Create `src/text/normalize.ts`:

```ts
import OpenCC from 'opencc-js';

const toSimplified = OpenCC.Converter({ from: 't', to: 'cn' });
const punctuation = new Map([
  ['，', ','],
  ['。', '.'],
  ['！', '!'],
  ['？', '?'],
  ['；', ';'],
  ['：', ':'],
]);

export function normalizeIdentityText(input: string): string {
  const nfc = input.normalize('NFC').replace(/\r\n?/g, '\n');
  const mapped = Array.from(nfc, (character) => punctuation.get(character) ?? character).join('');
  return toSimplified(mapped)
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}
```

- [ ] **Step 4: Implement fixed reverse-maximum-match analysis**

Create `src/text/analyze.ts`:

```ts
import CompleteDict from '@pinyin-pro/data/complete';
import {
  addDict,
  OutputFormat,
  pinyin,
  segment,
  TokenizationAlgorithm,
} from 'pinyin-pro';
import type { Token, ToneNumber } from '../domain/types';
import { normalizeIdentityText } from './normalize';

let initialized = false;

export async function initializeTextAnalyzer(): Promise<void> {
  if (initialized) return;
  addDict(CompleteDict);
  initialized = true;
}

function toneNumbers(value: string): ToneNumber[] {
  if (!/[\p{Script=Han}]/u.test(value)) return Array.from(value, () => 0);
  return (pinyin(value, {
    pattern: 'num',
    type: 'array',
    segmentit: TokenizationAlgorithm.ReverseMaxMatch,
    toneSandhi: false,
  }) as string[]).map((tone) => Number(tone) as ToneNumber);
}

function pinyinNumbers(value: string): string[] {
  if (!/[\p{Script=Han}]/u.test(value)) return [];
  return pinyin(value, {
    toneType: 'num',
    type: 'array',
    segmentit: TokenizationAlgorithm.ReverseMaxMatch,
    toneSandhi: false,
  }) as string[];
}

export function analyzeText(source: string): Token[] {
  if (!initialized) throw new Error('Text analyzer is not initialized');
  const normalized = normalizeIdentityText(source);
  const words = segment(normalized, {
    format: OutputFormat.ZhSegment,
    segmentit: TokenizationAlgorithm.ReverseMaxMatch,
    toneSandhi: false,
  }) as string[];
  let cursor = 0;
  return words.map((word, index) => {
    const start = normalized.indexOf(word, cursor);
    const sourceStart = start < 0 ? cursor : start;
    const sourceEnd = sourceStart + word.length;
    cursor = sourceEnd;
    const kind = /^[,.!?;:\n]$/u.test(word)
      ? 'punctuation'
      : /[\p{Script=Han}\p{Letter}\p{Number}]/u.test(word)
        ? 'word'
        : 'other';
    return {
      id: `token-${index}`,
      raw: source.slice(sourceStart, sourceEnd),
      normalized: word,
      sourceStart,
      sourceEnd,
      pinyin: pinyinNumbers(word),
      tones: toneNumbers(word),
      kind,
    } satisfies Token;
  });
}
```

- [ ] **Step 5: Run analysis tests twice to prove initialization is idempotent**

Run: `npm test -- src/text/normalize.test.ts src/text/analyze.test.ts`

Run: `npm test -- src/text/analyze.test.ts`

Expected: both commands pass with 4 tests total in the first run and 3 tests in the second.

- [ ] **Step 6: Commit the text pipeline**

```bash
git add src/text
git commit -m "feat: add deterministic Chinese text analysis"
```

### Task 4: Map word hashes to stable motifs

**Files:**
- Create: `src/music/hash.ts`
- Create: `src/music/hash.test.ts`
- Create: `src/music/scales.ts`
- Create: `src/music/scales.test.ts`
- Create: `src/music/motif.ts`
- Create: `src/music/motif.test.ts`

- [ ] **Step 1: Write failing hash, scale, and motif tests**

Create `src/music/hash.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sha256Hex, stableStringify } from './hash';

describe('hash helpers', () => {
  it('matches the SHA-256 reference vector', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('sorts object keys recursively', () => {
    expect(stableStringify({ z: 1, a: { y: 2, b: 3 } })).toBe(
      '{"a":{"b":3,"y":2},"z":1}',
    );
  });
});
```

Create `src/music/scales.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { degreeToMidi, fitMidiRange, isPitchInScale } from './scales';

describe('scale helpers', () => {
  it('maps pentatonic degrees into the selected tonic', () => {
    expect(degreeToMidi(0, 0, 'major-pentatonic', 4)).toBe(60);
    expect(degreeToMidi(1, 0, 'major-pentatonic', 4)).toBe(62);
    expect(isPitchInScale(67, 0, 'major-pentatonic')).toBe(true);
    expect(isPitchInScale(66, 0, 'major-pentatonic')).toBe(false);
    expect(fitMidiRange(40, 48, 96)).toBe(52);
    expect(fitMidiRange(100, 48, 96)).toBe(88);
  });
});
```

Create `src/music/motif.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Token } from '../domain/types';
import { mapTokenToMotif } from './motif';

const token: Token = {
  id: 'token-0',
  raw: '春风',
  normalized: '春风',
  sourceStart: 0,
  sourceEnd: 2,
  pinyin: ['chun1', 'feng1'],
  tones: [1, 1],
  kind: 'word',
};

describe('mapTokenToMotif', () => {
  it('is deterministic and traceable to the token', async () => {
    const first = await mapTokenToMotif(token);
    const second = await mapTokenToMotif(token);
    expect(first).toEqual(second);
    expect(first.tokenId).toBe('token-0');
    expect(first.notes.length).toBeGreaterThan(0);
  });

  it('uses a downward contour for a fourth tone', async () => {
    const falling = await mapTokenToMotif({ ...token, normalized: '落', tones: [4] });
    expect(falling.notes.at(-1)!.degreeOffset).toBeLessThanOrEqual(
      falling.notes[0].degreeOffset,
    );
  });
});
```

- [ ] **Step 2: Run the focused tests and verify failures**

Run: `npm test -- src/music/hash.test.ts src/music/scales.test.ts src/music/motif.test.ts`

Expected: FAIL because the music modules do not exist.

- [ ] **Step 3: Implement stable hashing and serialization**

Create `src/music/hash.ts`:

```ts
export async function sha256Bytes(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = await sha256Bytes(input);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
```

- [ ] **Step 4: Implement scale helpers**

Create `src/music/scales.ts`:

```ts
import type { ScaleMode } from '../domain/types';

const INTERVALS: Record<ScaleMode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  'natural-minor': [0, 2, 3, 5, 7, 8, 10],
  'major-pentatonic': [0, 2, 4, 7, 9],
  'minor-pentatonic': [0, 3, 5, 7, 10],
};

export function degreeToMidi(
  degree: number,
  tonic: number,
  scale: ScaleMode,
  octave: number,
): number {
  const intervals = INTERVALS[scale];
  const wrapped = ((degree % intervals.length) + intervals.length) % intervals.length;
  const octaveShift = Math.floor(degree / intervals.length);
  return 12 * (octave + 1 + octaveShift) + tonic + intervals[wrapped];
}

export function isPitchInScale(midi: number, tonic: number, scale: ScaleMode): boolean {
  const pitchClass = ((midi - tonic) % 12 + 12) % 12;
  return INTERVALS[scale].includes(pitchClass);
}

export function fitMidiRange(midi: number, minimum: number, maximum: number): number {
  let fitted = midi;
  while (fitted < minimum) fitted += 12;
  while (fitted > maximum) fitted -= 12;
  return fitted;
}
```

- [ ] **Step 5: Implement the versioned motif mapper**

Create `src/music/motif.ts`:

```ts
import type { Articulation, MotifNote, MotifSpec, Token } from '../domain/types';
import { sha256Bytes } from './hash';

const RHYTHMS = [
  [1, 1],
  [0.5, 0.5, 1],
  [1.5, 0.5],
  [0.5, 1, 0.5],
] as const;
const ARTICULATIONS: Articulation[] = ['legato', 'normal', 'staccato', 'accent'];

function contourForTone(tone: number, index: number): number {
  if (tone === 2) return index;
  if (tone === 3) return index === 0 ? 0 : index === 1 ? -1 : 1;
  if (tone === 4) return -index;
  if (tone === 5) return index === 0 ? 0 : -1;
  return index % 2;
}

export async function mapTokenToMotif(token: Token): Promise<MotifSpec> {
  const digest = await sha256Bytes(`mapping-v1|${token.normalized}`);
  const rhythmId = digest[1] % RHYTHMS.length;
  const rhythm = RHYTHMS[rhythmId];
  const noteCount = Math.max(1, Math.min(4, token.tones.length || 1));
  let cursor = 0;
  const notes: MotifNote[] = Array.from({ length: noteCount }, (_, index) => {
    const durationBeats = rhythm[index % rhythm.length];
    const note = {
      degreeOffset: contourForTone(token.tones[index] ?? 0, index),
      startBeat: cursor,
      durationBeats,
      velocity: 0.55 + (digest[4] / 255) * 0.3,
    };
    cursor += durationBeats;
    return note;
  });
  return {
    tokenId: token.id,
    rhythmId,
    baseDegree: digest[0] % 5,
    octave: 3 + (digest[3] % 3),
    articulation: ARTICULATIONS[digest[5] % ARTICULATIONS.length],
    notes,
  };
}
```

- [ ] **Step 6: Run the focused tests and full unit suite**

Run: `npm test -- src/music/hash.test.ts src/music/scales.test.ts src/music/motif.test.ts`

Expected: 6 passing tests.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 7: Commit deterministic motif mapping**

```bash
git add src/music
git commit -m "feat: map word identities to stable motifs"
```

### Task 5: Compose a deterministic four-track score

**Files:**
- Create: `src/music/mood.ts`
- Create: `src/music/mood.test.ts`
- Create: `src/music/compose.ts`
- Create: `src/music/compose.test.ts`
- Create: `src/music/score.ts`
- Create: `src/music/score.test.ts`

- [ ] **Step 1: Write failing duration, arrangement, and determinism tests**

Create `src/music/mood.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Token } from '../domain/types';
import { inferMood } from './mood';

function tokens(text: string): Token[] {
  return Array.from(text, (normalized, index) => ({
    id: `token-${index}`, raw: normalized, normalized,
    sourceStart: index, sourceEnd: index + 1,
    pinyin: [], tones: [], kind: 'word' as const,
  }));
}

describe('inferMood', () => {
  it('classifies approved local moods and defaults neutral text to calm', () => {
    expect(inferMood(tokens('阳光希望快乐'))).toBe('bright');
    expect(inferMood(tokens('孤独离别雨夜'))).toBe('melancholic');
    expect(inferMood(tokens('山川道路房屋'))).toBe('calm');
  });
});
```

Create `src/music/compose.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../domain/settings';
import { analyzeText, initializeTextAnalyzer } from '../text/analyze';
import { composeScore, targetDurationSeconds } from './compose';
import { isPitchInScale } from './scales';

beforeAll(async () => initializeTextAnalyzer());

describe('targetDurationSeconds', () => {
  it('maps 10 to 300 effective characters onto 30 to 300 seconds', () => {
    expect(targetDurationSeconds(10)).toBe(30);
    expect(targetDurationSeconds(300)).toBe(300);
    expect(targetDurationSeconds(155)).toBe(165);
  });
});

describe('composeScore', () => {
  it('creates four tracks and keeps every word traceable', async () => {
    const tokens = analyzeText('春风吹过山谷，星光落在河面。');
    const score = await composeScore(tokens, DEFAULT_SETTINGS);
    expect(score.tracks.map((track) => track.kind)).toEqual([
      'melody',
      'harmony',
      'bass',
      'percussion',
    ]);
    for (const token of tokens.filter((item) => item.kind === 'word')) {
      expect(score.noteEvents.some((event) => event.tokenId === token.id)).toBe(true);
    }
  });

  it('keeps melody notes inside the selected scale', async () => {
    const score = await composeScore(
      analyzeText('春风吹过山谷，星光落在河面。'),
      DEFAULT_SETTINGS,
    );
    const melody = score.noteEvents.filter((event) => event.trackId === 'melody');
    expect(melody.every((event) =>
      isPitchInScale(event.midi, score.settings.tonic, score.settings.scale),
    )).toBe(true);
  });

  it('returns identical music for equivalent Simplified and Traditional input', async () => {
    const first = await composeScore(analyzeText('春风吹过山谷。'), DEFAULT_SETTINGS);
    const second = await composeScore(analyzeText('春風吹過山谷。'), DEFAULT_SETTINGS);
    expect(first.musicHash).toBe(second.musicHash);
    expect(first.noteEvents).toEqual(second.noteEvents);
  });

  it('resolves automatic mood locally before writing the score', async () => {
    const score = await composeScore(analyzeText('阳光希望快乐，春风吹过山谷。'), DEFAULT_SETTINGS);
    expect(score.settings.mood).toBe('bright');
    expect(score.settings.requestedMood).toBe('auto');
  });
});
```

Create `src/music/score.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Score } from '../domain/types';
import { canonicalMusicProjection } from './score';

describe('canonicalMusicProjection', () => {
  it('excludes raw display text and source positions', () => {
    const score = {
      schemaVersion: 'score-v1',
      mappingVersion: 'mapping-v1',
      composerVersion: 'composer-v1',
      seed: 'seed',
      musicHash: '',
      settings: {
        tonic: 0, scale: 'major-pentatonic', bpm: 84,
        mood: 'calm', requestedMood: 'auto', timbre: 'chamber-piano',
      },
      durationSeconds: 30,
      tokens: [{
        id: 'token-0', raw: '風', normalized: '风', sourceStart: 10, sourceEnd: 11,
        pinyin: ['feng1'], tones: [1], kind: 'word',
      }],
      tracks: [{ id: 'melody', kind: 'melody', label: '旋律' }],
      noteEvents: [{
        id: 'melody-0', tokenId: 'token-0', trackId: 'melody',
        startBeat: 0, durationBeats: 1, midi: 60, velocity: 0.7,
      }],
    } satisfies Score;
    const projection = canonicalMusicProjection(score);
    expect(JSON.stringify(projection)).not.toContain('風');
    expect(JSON.stringify(projection)).not.toContain('sourceStart');
    expect(JSON.stringify(projection)).toContain('风');
  });
});
```

- [ ] **Step 2: Run the focused tests and verify missing-module failures**

Run: `npm test -- src/music/mood.test.ts src/music/compose.test.ts src/music/score.test.ts`

Expected: FAIL because the mood, composer, and score modules do not exist.

- [ ] **Step 3: Implement local rule-based mood inference**

Create `src/music/mood.ts`:

```ts
import type { ResolvedMood, Token } from '../domain/types';

const BRIGHT = new Set(['阳光', '希望', '快乐', '欢喜', '春风', '星光', '明亮', '温暖']);
const MELANCHOLIC = new Set(['孤独', '离别', '雨夜', '失去', '悲伤', '寂寞', '远去', '泪']);

export function inferMood(tokens: Token[]): ResolvedMood {
  let bright = 0;
  let melancholic = 0;
  for (const token of tokens) {
    for (const word of BRIGHT) if (token.normalized.includes(word)) bright += 2;
    for (const word of MELANCHOLIC) if (token.normalized.includes(word)) melancholic += 2;
    if (token.normalized === '!') bright += 1;
  }
  if (bright > melancholic) return 'bright';
  if (melancholic > bright) return 'melancholic';
  return 'calm';
}
```

- [ ] **Step 4: Implement canonical score projection and hashing**

Create `src/music/score.ts`:

```ts
import type { Score } from '../domain/types';
import { sha256Hex, stableStringify } from './hash';

export function canonicalMusicProjection(score: Score) {
  const { tonic, scale, bpm, mood, timbre } = score.settings;
  return {
    schemaVersion: score.schemaVersion,
    mappingVersion: score.mappingVersion,
    composerVersion: score.composerVersion,
    seed: score.seed,
    settings: { tonic, scale, bpm, mood, timbre },
    durationSeconds: score.durationSeconds,
    tokens: score.tokens.map((token) => ({
      id: token.id,
      normalized: token.normalized,
      pinyin: token.pinyin,
      tones: token.tones,
      kind: token.kind,
    })),
    tracks: score.tracks,
    noteEvents: [...score.noteEvents].sort((left, right) =>
      left.startBeat - right.startBeat || left.id.localeCompare(right.id),
    ),
  };
}

export async function calculateMusicHash(score: Score): Promise<string> {
  return sha256Hex(stableStringify(canonicalMusicProjection(score)));
}
```

- [ ] **Step 5: Implement melody, form, and accompaniment generation**

Create `src/music/compose.ts`:

```ts
import { countEffectiveCharacters } from '../domain/input';
import { resolveSettings } from '../domain/settings';
import type {
  GenerationSettings, NoteEvent, ResolvedSettings, Score, Token, Track,
} from '../domain/types';
import { sha256Hex, stableStringify } from './hash';
import { mapTokenToMotif } from './motif';
import { inferMood } from './mood';
import { calculateMusicHash } from './score';
import { degreeToMidi, fitMidiRange } from './scales';

const TRACKS: Track[] = [
  { id: 'melody', kind: 'melody', label: '主旋律' },
  { id: 'harmony', kind: 'harmony', label: '和弦' },
  { id: 'bass', kind: 'bass', label: '贝斯' },
  { id: 'percussion', kind: 'percussion', label: '轻打击乐' },
];

export function targetDurationSeconds(count: number): number {
  const clamped = Math.min(300, Math.max(10, count));
  return Math.round(30 + (270 * (clamped - 10)) / 290);
}

function punctuationPause(token: Token | undefined): number {
  if (!token || token.kind !== 'punctuation') return 0;
  if (/[.!?]/u.test(token.normalized)) return 1;
  if (/[,;:]/u.test(token.normalized)) return 0.5;
  return token.normalized === '\n' ? 2 : 0;
}

function accompaniment(totalBeats: number, settings: ResolvedSettings): NoteEvent[] {
  const events: NoteEvent[] = [];
  let eventIndex = 0;
  for (let beat = 0; beat < totalBeats; beat += 4) {
    const phrase = Math.floor(beat / 4);
    const rootDegree = [0, 3, 4, 0][phrase % 4];
    for (const chordDegree of [rootDegree, rootDegree + 2, rootDegree + 4]) {
      events.push({
        id: `harmony-${eventIndex++}`,
        tokenId: null,
        trackId: 'harmony',
        startBeat: beat,
        durationBeats: Math.min(4, totalBeats - beat),
        midi: degreeToMidi(chordDegree, settings.tonic, settings.scale, 3),
        velocity: settings.mood === 'melancholic' ? 0.42 : settings.mood === 'bright' ? 0.56 : 0.5,
      });
    }
    events.push({
      id: `bass-${phrase}`,
      tokenId: null,
      trackId: 'bass',
      startBeat: beat,
      durationBeats: Math.min(2, totalBeats - beat),
      midi: degreeToMidi(rootDegree, settings.tonic, settings.scale, 2),
      velocity: 0.58,
    });
  }
  const percussionStep = settings.mood === 'bright' ? 0.5 : 1;
  for (let beat = 0; beat < totalBeats; beat += percussionStep) {
    const strongBeat = Number.isInteger(beat);
    events.push({
      id: `percussion-${Math.round(beat * 2)}`,
      tokenId: null,
      trackId: 'percussion',
      startBeat: beat,
      durationBeats: 0.1,
      midi: strongBeat && beat % 4 === 0 ? 36 : 42,
      velocity: settings.mood === 'melancholic' ? 0.2 : strongBeat ? 0.4 : 0.24,
    });
  }
  return events;
}

export async function composeScore(
  tokens: Token[],
  requestedSettings: GenerationSettings,
): Promise<Score> {
  const settings = resolveSettings(requestedSettings, inferMood(tokens));
  const words = tokens.filter((token) => token.kind === 'word');
  const effectiveCount = countEffectiveCharacters(words.map((token) => token.normalized).join(''));
  const durationSeconds = targetDurationSeconds(effectiveCount);
  const targetBeats = (durationSeconds * settings.bpm) / 60;
  const motifs = await Promise.all(words.map(mapTokenToMotif));
  const rawBeats = motifs.reduce((sum, motif, index) => {
    const motifBeats = Math.max(...motif.notes.map((note) => note.startBeat + note.durationBeats));
    const sourceIndex = tokens.findIndex((token) => token.id === words[index].id);
    return sum + motifBeats + punctuationPause(tokens[sourceIndex + 1]);
  }, 0);
  const timeScale = targetBeats / Math.max(1, rawBeats);
  const melody: NoteEvent[] = [];
  let cursor = 0;
  let previousWord = '';
  for (let index = 0; index < words.length; index += 1) {
    const token = words[index];
    const motif = motifs[index];
    const repeatScale = token.normalized === previousWord ? 0.75 : 1;
    const articulationScale = motif.articulation === 'staccato'
      ? 0.62
      : motif.articulation === 'legato'
        ? 1.08
        : 0.92;
    for (let noteIndex = 0; noteIndex < motif.notes.length; noteIndex += 1) {
      const note = motif.notes[noteIndex];
      melody.push({
        id: `melody-${index}-${noteIndex}`,
        tokenId: token.id,
        trackId: 'melody',
        startBeat: cursor + note.startBeat * timeScale * repeatScale,
        durationBeats: Math.max(
          0.125,
          note.durationBeats * timeScale * repeatScale * articulationScale,
        ),
        midi: fitMidiRange(
          degreeToMidi(
            motif.baseDegree + note.degreeOffset,
            settings.tonic,
            settings.scale,
            motif.octave,
          ),
          48,
          96,
        ),
        velocity: motif.articulation === 'accent'
          ? Math.min(1, note.velocity * 1.12)
          : note.velocity,
      });
    }
    const motifEnd = Math.max(...motif.notes.map((note) => note.startBeat + note.durationBeats));
    const sourceIndex = tokens.findIndex((item) => item.id === token.id);
    cursor += (motifEnd * repeatScale + punctuationPause(tokens[sourceIndex + 1])) * timeScale;
    previousWord = token.normalized;
  }
  const noteEvents = [...melody, ...accompaniment(targetBeats, settings)]
    .sort((left, right) => left.startBeat - right.startBeat || left.id.localeCompare(right.id));
  const soundSettings = {
    tonic: settings.tonic,
    scale: settings.scale,
    bpm: settings.bpm,
    mood: settings.mood,
    timbre: settings.timbre,
  };
  const seed = await sha256Hex(
    `composer-v1|${tokens.map((token) => token.normalized).join('')}|${stableStringify(soundSettings)}`,
  );
  const score: Score = {
    schemaVersion: 'score-v1',
    mappingVersion: 'mapping-v1',
    composerVersion: 'composer-v1',
    seed,
    musicHash: '',
    settings,
    durationSeconds,
    tokens,
    tracks: TRACKS,
    noteEvents,
  };
  score.musicHash = await calculateMusicHash(score);
  return score;
}
```

- [ ] **Step 6: Run mood and composer tests**

Run: `npm test -- src/music/mood.test.ts src/music/compose.test.ts src/music/score.test.ts`

Expected: 7 passing tests.

Run: `npm run build`

Expected: TypeScript and Vite build succeed.

- [ ] **Step 7: Commit the canonical composer**

```bash
git add src/music/mood.ts src/music/mood.test.ts src/music/compose.ts src/music/compose.test.ts src/music/score.ts src/music/score.test.ts
git commit -m "feat: compose deterministic four-track scores"
```

### Task 6: Add golden scores and broad invariant coverage

**Files:**
- Create: `src/music/invariants.test.ts`
- Create: `tests/fixtures/README.md`
- Create: `scripts/write-golden-fixtures.mjs`
- Create: `tests/fixtures/short-poem.score.json`
- Create: `tests/fixtures/traditional.score.json`
- Create: `tests/fixtures/mixed.score.json`
- Create: `tests/fixtures/long.score.json`
- Modify: `package.json`

- [ ] **Step 1: Write failing invariant tests**

Create `src/music/invariants.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../domain/settings';
import { analyzeText, initializeTextAnalyzer } from '../text/analyze';
import { composeScore } from './compose';

beforeAll(async () => initializeTextAnalyzer());

function generatedText(length: number): string {
  const alphabet = Array.from('春风山谷星光河面清晨远方归来');
  return Array.from({ length }, (_, index) => alphabet[(index * 7) % alphabet.length]).join('');
}

describe('score invariants', () => {
  it('keeps all generated values finite and within track ranges', async () => {
    for (const length of [10, 37, 120, 300]) {
      const score = await composeScore(analyzeText(generatedText(length)), DEFAULT_SETTINGS);
      expect(score.durationSeconds).toBeGreaterThanOrEqual(30);
      expect(score.durationSeconds).toBeLessThanOrEqual(300);
      for (const event of score.noteEvents) {
        expect(Number.isFinite(event.startBeat)).toBe(true);
        expect(Number.isFinite(event.durationBeats)).toBe(true);
        expect(event.startBeat).toBeGreaterThanOrEqual(0);
        expect(event.durationBeats).toBeGreaterThan(0);
        expect(event.velocity).toBeGreaterThanOrEqual(0);
        expect(event.velocity).toBeLessThanOrEqual(1);
        const [minimum, maximum] = event.trackId === 'bass'
          ? [28, 55]
          : event.trackId === 'percussion'
            ? [35, 81]
            : [48, 96];
        expect(event.midi).toBeGreaterThanOrEqual(minimum);
        expect(event.midi).toBeLessThanOrEqual(maximum);
      }
    }
  });

  it('returns the same music hash in repeated runs', async () => {
    const text = generatedText(80);
    const hashes = await Promise.all(
      Array.from({ length: 5 }, async () =>
        (await composeScore(analyzeText(text), DEFAULT_SETTINGS)).musicHash,
      ),
    );
    expect(new Set(hashes).size).toBe(1);
  });
});
```

- [ ] **Step 2: Run invariant tests and verify any range failure is visible**

Run: `npm test -- src/music/invariants.test.ts`

Expected: both invariant tests pass for 10, 37, 120, and 300 effective characters.

- [ ] **Step 3: Add the exact golden-fixture generator**

Add this script to `package.json`:

```json
"golden:write": "tsx scripts/write-golden-fixtures.mjs"
```

Add `"tsx": "4.23.13"` to `devDependencies`, then run `npm install`.

Create `scripts/write-golden-fixtures.mjs`:

```js
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DEFAULT_SETTINGS } from '../src/domain/settings.ts';
import { analyzeText, initializeTextAnalyzer } from '../src/text/analyze.ts';
import { composeScore } from '../src/music/compose.ts';

const cases = {
  'short-poem': '春风吹过山谷，星光落在河面。',
  traditional: '春風吹過山谷，星光落在河面。',
  mixed: '春风AI2026，落在河面。',
  long: '春风山谷星光河面清晨远方归来'.repeat(24).slice(0, 300),
};

await initializeTextAnalyzer();
const directory = resolve('tests/fixtures');
await mkdir(directory, { recursive: true });
for (const [name, text] of Object.entries(cases)) {
  const score = await composeScore(analyzeText(text), DEFAULT_SETTINGS);
  await writeFile(
    resolve(directory, `${name}.score.json`),
    `${JSON.stringify(score, null, 2)}\n`,
    'utf8',
  );
}
```

Create `tests/fixtures/README.md`:

````md
# Golden score fixtures

These files freeze the output of `mapping-v1` and `composer-v1`. Regenerate them only when intentionally introducing a new version. A changed fixture without a version change is a regression.
```

- [ ] **Step 4: Generate fixtures and add a hash regression assertion**

Run: `npm run golden:write`

Expected: four JSON files appear in `tests/fixtures`.

Append to `src/music/invariants.test.ts`:

```ts
import shortPoem from '../../tests/fixtures/short-poem.score.json';

it('matches the checked-in mapping-v1 golden score', async () => {
  const score = await composeScore(
    analyzeText('春风吹过山谷，星光落在河面。'),
    DEFAULT_SETTINGS,
  );
  expect(score.musicHash).toBe(shortPoem.musicHash);
});
```

- [ ] **Step 5: Run all deterministic-core tests**

Run: `npm test -- src/domain src/text src/music`

Expected: all domain, text, and music tests pass, including the golden hash assertion.

- [ ] **Step 6: Commit invariants and fixtures**

```bash
git add package.json package-lock.json scripts tests/fixtures src/music/invariants.test.ts
git commit -m "test: freeze deterministic score fixtures"
```

### Task 7: Add the explicit application state machine

**Files:**
- Create: `src/state/reducer.ts`
- Create: `src/state/reducer.test.ts`

- [ ] **Step 1: Write failing state transition tests**

Create `src/state/reducer.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { initialAppState, reducer } from './reducer';

describe('application reducer', () => {
  it('marks a ready score dirty without deleting it', () => {
    const ready = { ...initialAppState, phase: 'ready' as const, score: { musicHash: 'abc' } as never };
    const next = reducer(ready, { type: 'EDIT_TEXT', text: '新的文字内容足够十个字符' });
    expect(next.phase).toBe('dirty');
    expect(next.score).toBe(ready.score);
  });

  it('keeps the previous score when generation fails', () => {
    const generating = {
      ...initialAppState,
      phase: 'generating' as const,
      score: { musicHash: 'previous' } as never,
    };
    const next = reducer(generating, { type: 'GENERATION_FAILED', message: '生成失败' });
    expect(next.phase).toBe('error');
    expect(next.score).toBe(generating.score);
    expect(next.error).toBe('生成失败');
  });

  it('moves through play, pause, and stop without changing the score', () => {
    const ready = { ...initialAppState, phase: 'ready' as const, score: { musicHash: 'abc' } as never };
    const playing = reducer(ready, { type: 'PLAY' });
    const paused = reducer(playing, { type: 'PAUSE', playheadSeconds: 3 });
    const stopped = reducer(paused, { type: 'STOP' });
    expect([playing.phase, paused.phase, stopped.phase]).toEqual(['playing', 'paused', 'ready']);
    expect(stopped.playheadSeconds).toBe(0);
    expect(stopped.score).toBe(ready.score);
  });
});
```

- [ ] **Step 2: Run the reducer test and verify the missing-module failure**

Run: `npm test -- src/state/reducer.test.ts`

Expected: FAIL because `src/state/reducer.ts` does not exist.

- [ ] **Step 3: Implement the state machine as a pure reducer**

Create `src/state/reducer.ts`:

```ts
import { DEFAULT_SETTINGS } from '../domain/settings';
import type { GenerationSettings, Score } from '../domain/types';

export type AppPhase =
  | 'idle'
  | 'dirty'
  | 'generating'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'exporting'
  | 'error';

export interface AppState {
  phase: AppPhase;
  text: string;
  settings: GenerationSettings;
  score: Score | null;
  dirty: boolean;
  playheadSeconds: number;
  activeTokenId: string | null;
  volume: number;
  error: string | null;
  notice: string | null;
}

export const initialAppState: AppState = {
  phase: 'idle',
  text: '',
  settings: DEFAULT_SETTINGS,
  score: null,
  dirty: false,
  playheadSeconds: 0,
  activeTokenId: null,
  volume: 0.8,
  error: null,
  notice: null,
};

export type AppAction =
  | { type: 'EDIT_TEXT'; text: string }
  | { type: 'EDIT_SETTINGS'; settings: GenerationSettings }
  | { type: 'GENERATE' }
  | { type: 'GENERATION_SUCCEEDED'; score: Score }
  | { type: 'GENERATION_FAILED'; message: string }
  | { type: 'PLAY' }
  | { type: 'PLAY_FAILED'; message: string }
  | { type: 'PAUSE'; playheadSeconds: number }
  | { type: 'STOP' }
  | { type: 'SEEK'; playheadSeconds: number; tokenId: string | null }
  | { type: 'EXPORT' }
  | { type: 'EXPORT_FINISHED' }
  | { type: 'EXPORT_FAILED'; message: string }
  | { type: 'VOLUME'; volume: number }
  | { type: 'NOTICE'; message: string | null };

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'EDIT_TEXT':
      return {
        ...state, text: action.text,
        dirty: Boolean(state.score), phase: state.score ? 'dirty' : 'idle', error: null,
      };
    case 'EDIT_SETTINGS':
      return {
        ...state, settings: action.settings,
        dirty: Boolean(state.score), phase: state.score ? 'dirty' : 'idle', error: null,
      };
    case 'GENERATE':
      return { ...state, phase: 'generating', error: null };
    case 'GENERATION_SUCCEEDED':
      return {
        ...state, phase: 'ready', score: action.score,
        dirty: false, playheadSeconds: 0, error: null,
      };
    case 'GENERATION_FAILED':
      return { ...state, phase: 'error', error: action.message };
    case 'PLAY':
      return state.score ? { ...state, phase: 'playing', error: null } : state;
    case 'PLAY_FAILED':
      return { ...state, phase: 'error', error: action.message };
    case 'PAUSE':
      return { ...state, phase: 'paused', playheadSeconds: action.playheadSeconds };
    case 'STOP':
      return {
        ...state,
        phase: state.score ? (state.dirty ? 'dirty' : 'ready') : 'idle',
        playheadSeconds: 0,
        activeTokenId: null,
      };
    case 'SEEK':
      return { ...state, playheadSeconds: action.playheadSeconds, activeTokenId: action.tokenId };
    case 'EXPORT':
      return state.score ? { ...state, phase: 'exporting', error: null } : state;
    case 'EXPORT_FINISHED':
      return {
        ...state,
        phase: state.score ? (state.dirty ? 'dirty' : 'ready') : 'idle',
      };
    case 'EXPORT_FAILED':
      return { ...state, phase: 'error', error: action.message };
    case 'VOLUME':
      return { ...state, volume: Math.min(1, Math.max(0, action.volume)) };
    case 'NOTICE':
      return { ...state, notice: action.message };
  }
}
```

- [ ] **Step 4: Run reducer and full unit tests**

Run: `npm test -- src/state/reducer.test.ts`

Run: `npm test`

Expected: reducer tests and the complete suite pass.

- [ ] **Step 5: Commit the state machine**

```bash
git add src/state
git commit -m "feat: add explicit workstation state machine"
```

### Task 8: Build the three-column generation workstation

**Files:**
- Create: `src/components/TextPanel.tsx`
- Create: `src/components/ControlPanel.tsx`
- Create: `src/components/TransportBar.tsx`
- Create: `src/components/Compatibility.tsx`
- Create: `src/components/workstation.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write a failing generation-flow component test**

Create `src/components/workstation.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';

describe('workstation', () => {
  it('validates input, generates once, and marks later edits dirty', async () => {
    render(<App />);
    const input = screen.getByLabelText('中文原文');
    const generate = screen.getByRole('button', { name: '生成音乐' });
    expect(generate).toBeDisabled();
    fireEvent.change(input, { target: { value: '春风吹过山谷星光落在河面' } });
    expect(generate).toBeEnabled();
    fireEvent.click(generate);
    await waitFor(() => expect(screen.getByText('曲目已生成')).toBeInTheDocument());
    fireEvent.change(input, { target: { value: '春风吹过山谷星光落在河面清晨' } });
    expect(screen.getByText('文字或参数已变化，请重新生成')).toBeInTheDocument();
  });

  it('exposes the approved mood choices without tension', () => {
    render(<App />);
    const mood = screen.getByLabelText('情绪');
    expect(mood).toHaveTextContent('自动');
    expect(mood).toHaveTextContent('明亮');
    expect(mood).toHaveTextContent('平静');
    expect(mood).toHaveTextContent('忧郁');
    expect(mood).not.toHaveTextContent('紧张');
  });
});
```

- [ ] **Step 2: Run the component test and verify it fails**

Run: `npm test -- src/components/workstation.test.tsx`

Expected: FAIL because the workstation components do not exist and `App` has no controls.

- [ ] **Step 3: Implement the text, settings, compatibility, and transport components**

Create `src/components/TextPanel.tsx`:

```tsx
import type { Score } from '../domain/types';
import { countEffectiveCharacters } from '../domain/input';

interface Props {
  text: string;
  score: Score | null;
  activeTokenId: string | null;
  onChange: (value: string) => void;
  onSeekToken: (tokenId: string) => void;
}

export function TextPanel({ text, score, activeTokenId, onChange, onSeekToken }: Props) {
  const count = countEffectiveCharacters(text);
  return (
    <section className="panel text-panel" aria-labelledby="text-heading">
      <div className="panel-heading">
        <h2 id="text-heading">原文</h2>
        <span className={count > 300 ? 'count count-error' : 'count'}>{count}/300</span>
      </div>
      <textarea
        aria-label="中文原文"
        value={text}
        onChange={(event) => onChange(event.target.value)}
        placeholder="输入 10～300 个有效字符"
      />
      {score && (
        <div className="token-reader" aria-label="分词与播放位置">
          {score.tokens.map((token) => (
            <button
              key={token.id}
              type="button"
              className={token.id === activeTokenId ? 'token active' : 'token'}
              onClick={() => onSeekToken(token.id)}
              disabled={token.kind !== 'word'}
            >
              {token.raw}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
```

Create `src/components/ControlPanel.tsx`:

```tsx
import type { GenerationSettings, Mood, ScaleMode, TimbrePreset } from '../domain/types';

interface Props {
  settings: GenerationSettings;
  disabled: boolean;
  canGenerate: boolean;
  onChange: (settings: GenerationSettings) => void;
  onGenerate: () => void;
}

const TONICS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export function ControlPanel({ settings, disabled, canGenerate, onChange, onGenerate }: Props) {
  const patch = (change: Partial<GenerationSettings>) => onChange({ ...settings, ...change });
  return (
    <aside className="panel control-panel" aria-labelledby="control-heading">
      <h2 id="control-heading">音乐参数</h2>
      <label>调性
        <select value={settings.tonic} onChange={(event) => patch({ tonic: Number(event.target.value) })}>
          {TONICS.map((name, index) => <option key={name} value={index}>{name}</option>)}
        </select>
      </label>
      <label>音阶
        <select value={settings.scale} onChange={(event) => patch({ scale: event.target.value as ScaleMode })}>
          <option value="major">大调</option>
          <option value="natural-minor">自然小调</option>
          <option value="major-pentatonic">大调五声</option>
          <option value="minor-pentatonic">小调五声</option>
        </select>
      </label>
      <label>速度 <output>{settings.bpm} BPM</output>
        <input type="range" min="60" max="140" value={settings.bpm}
          onChange={(event) => patch({ bpm: Number(event.target.value) })} />
      </label>
      <label>情绪
        <select aria-label="情绪" value={settings.mood}
          onChange={(event) => patch({ mood: event.target.value as Mood })}>
          <option value="auto">自动</option>
          <option value="bright">明亮</option>
          <option value="calm">平静</option>
          <option value="melancholic">忧郁</option>
        </select>
      </label>
      <label>整体音色
        <select value={settings.timbre}
          onChange={(event) => patch({ timbre: event.target.value as TimbrePreset })}>
          <option value="chamber-piano">钢琴室内乐</option>
          <option value="soft-electronic">柔和电子</option>
          <option value="minimal-piano">极简钢琴</option>
        </select>
      </label>
      <button type="button" className="primary" disabled={disabled || !canGenerate} onClick={onGenerate}>
        {disabled ? '生成中…' : '生成音乐'}
      </button>
    </aside>
  );
}
```

Create `src/components/TransportBar.tsx`:

```tsx
interface Props {
  ready: boolean;
  playing: boolean;
  exporting: boolean;
  volume: number;
  currentSeconds: number;
  durationSeconds: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onVolumeChange: (volume: number) => void;
  onExport: () => void;
}

function clock(value: number): string {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function TransportBar(props: Props) {
  return (
    <footer className="transport" aria-label="播放与导出">
      <button type="button" disabled={!props.ready || props.playing} onClick={props.onPlay}>播放</button>
      <button type="button" disabled={!props.playing} onClick={props.onPause}>暂停</button>
      <button type="button" disabled={!props.ready} onClick={props.onStop}>停止</button>
      <output aria-label="播放时间">{clock(props.currentSeconds)} / {clock(props.durationSeconds)}</output>
      <label>音量
        <input aria-label="音量" type="range" min="0" max="1" step="0.01"
          value={props.volume}
          onChange={(event) => props.onVolumeChange(Number(event.target.value))} />
      </label>
      <button type="button" disabled={!props.ready || props.exporting || props.playing} onClick={props.onExport}>
        {props.exporting
          ? `正在渲染 WAV，预计约 ${Math.max(5, Math.ceil(props.durationSeconds / 4))} 秒…`
          : '下载 WAV'}
      </button>
    </footer>
  );
}
```

Create `src/components/Compatibility.tsx`:

```tsx
export function Compatibility() {
  const supported = typeof AudioContext !== 'undefined' && typeof OfflineAudioContext !== 'undefined';
  return (
    <div className="compatibility" hidden={supported} role="status">
      当前浏览器缺少完整 Web Audio 支持。请使用桌面版 Chrome 或 Edge。
    </div>
  );
}
```

- [ ] **Step 4: Replace the shell with the generation workflow**

Replace `src/App.tsx` with:

```tsx
import { useReducer } from 'react';
import { Compatibility } from './components/Compatibility';
import { ControlPanel } from './components/ControlPanel';
import { TextPanel } from './components/TextPanel';
import { TransportBar } from './components/TransportBar';
import { validateInput } from './domain/input';
import { composeScore } from './music/compose';
import { initialAppState, reducer } from './state/reducer';
import { analyzeText, initializeTextAnalyzer } from './text/analyze';

export function App() {
  const [state, dispatch] = useReducer(reducer, initialAppState);
  const validation = validateInput(state.text);

  async function generate() {
    dispatch({ type: 'GENERATE' });
    try {
      await initializeTextAnalyzer();
      const score = await composeScore(analyzeText(state.text), state.settings);
      dispatch({ type: 'GENERATION_SUCCEEDED', score });
    } catch (error) {
      dispatch({
        type: 'GENERATION_FAILED',
        message: error instanceof Error ? error.message : '生成失败，请重试',
      });
    }
  }

  function seekToken(tokenId: string) {
    const event = state.score?.noteEvents.find(
      (item) => item.trackId === 'melody' && item.tokenId === tokenId,
    );
    if (!event || !state.score) return;
    dispatch({
      type: 'SEEK',
      playheadSeconds: event.startBeat * 60 / state.score.settings.bpm,
      tokenId,
    });
  }

  const status = state.phase === 'generating'
    ? '正在生成曲目…'
    : state.error
      ? state.error
      : state.dirty
        ? '文字或参数已变化，请重新生成'
        : state.phase === 'ready'
          ? '曲目已生成'
          : null;

  return (
    <main className="app-shell">
      <header className="masthead">
        <div><h1>字谱</h1><p>让每一段中文拥有稳定的音乐指纹。</p></div>
        <span className="privacy-mark">本地生成 · 不上传原文</span>
      </header>
      <Compatibility />
      {status && <div className="status" role="status">{status}</div>}
      {state.notice && <div className="status" role="status">{state.notice}</div>}
      <div className="workstation">
        <TextPanel
          text={state.text}
          score={state.score}
          activeTokenId={state.activeTokenId}
          onChange={(text) => dispatch({ type: 'EDIT_TEXT', text })}
          onSeekToken={seekToken}
        />
        <section className="panel sequencer-placeholder" aria-label="二维音序器">
          {state.score ? `${state.score.noteEvents.length} 个音符事件` : '生成后在这里显示曲谱'}
        </section>
        <ControlPanel
          settings={state.settings}
          disabled={['generating', 'exporting', 'playing'].includes(state.phase)}
          canGenerate={validation.code === 'valid'}
          onChange={(settings) => dispatch({ type: 'EDIT_SETTINGS', settings })}
          onGenerate={generate}
        />
      </div>
      <TransportBar
        ready={Boolean(state.score) && !['generating', 'exporting'].includes(state.phase)}
        playing={state.phase === 'playing'}
        exporting={state.phase === 'exporting'}
        currentSeconds={state.playheadSeconds}
        durationSeconds={state.score?.durationSeconds ?? 0}
        volume={state.volume}
        onPlay={() => dispatch({ type: 'PLAY' })}
        onPause={() => dispatch({ type: 'PAUSE', playheadSeconds: state.playheadSeconds })}
        onStop={() => dispatch({ type: 'STOP' })}
        onVolumeChange={(volume) => dispatch({ type: 'VOLUME', volume })}
        onExport={() => dispatch({ type: 'EXPORT' })}
      />
    </main>
  );
}
```

- [ ] **Step 5: Implement the approved desktop layout**

Replace `src/styles.css` with:

```css
:root {
  color: #26241f;
  background: #eeeae0;
  font-family: Inter, "Noto Sans SC", system-ui, sans-serif;
  font-synthesis: none;
}
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; min-height: 100vh; }
button, input, select, textarea { font: inherit; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: .5; }
.app-shell { min-height: 100vh; padding: 22px 24px 88px; }
.masthead { display: flex; align-items: end; justify-content: space-between; margin-bottom: 18px; }
.masthead h1 { margin: 0; font: 700 34px/1.1 Georgia, "Noto Serif SC", serif; letter-spacing: .18em; }
.masthead p { margin: 5px 0 0; color: #6f6a60; }
.privacy-mark { color: #27735f; font-size: 13px; }
.workstation { display: grid; grid-template-columns: minmax(250px, 30%) minmax(480px, 1fr) minmax(220px, 20%); gap: 14px; min-height: calc(100vh - 170px); }
.panel { min-width: 0; border: 1px solid #d3cdbf; border-radius: 16px; background: #fffefa; box-shadow: 0 10px 34px rgb(63 55 40 / 6%); }
.text-panel, .control-panel { padding: 16px; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; }
.panel h2 { margin: 0 0 14px; font-size: 15px; letter-spacing: .08em; }
.count { color: #767066; font-variant-numeric: tabular-nums; }
.count-error { color: #b33b2e; }
.text-panel textarea { width: 100%; min-height: 240px; resize: vertical; border: 0; border-radius: 10px; padding: 13px; background: #f7f4ec; color: inherit; font: 16px/1.9 Georgia, "Noto Serif SC", serif; }
.token-reader { margin-top: 14px; line-height: 2; }
.token { border: 0; padding: 2px 3px; background: transparent; color: inherit; border-radius: 4px; }
.token.active { color: #9c3e28; background: #f5dfd2; }
.control-panel { display: flex; flex-direction: column; gap: 14px; }
.control-panel label { display: grid; gap: 6px; color: #5e594f; font-size: 13px; }
.control-panel select, .control-panel input { width: 100%; }
.primary { margin-top: auto; border: 0; border-radius: 999px; padding: 12px 16px; color: #fff; background: #26241f; }
.sequencer-placeholder { display: grid; place-items: center; color: #817a6e; background-image: linear-gradient(#ece7dc 1px, transparent 1px), linear-gradient(90deg, #ece7dc 1px, transparent 1px); background-size: 100% 40px, 64px 100%; }
.transport { position: fixed; z-index: 10; left: 24px; right: 24px; bottom: 18px; display: flex; align-items: center; gap: 10px; min-height: 54px; padding: 9px 14px; border: 1px solid #d3cdbf; border-radius: 16px; background: rgb(255 254 250 / 94%); backdrop-filter: blur(12px); }
.transport output { margin-right: auto; font-variant-numeric: tabular-nums; }
.status, .compatibility { margin-bottom: 12px; padding: 9px 12px; border-radius: 9px; background: #fff4ce; }
@media (max-width: 1023px) {
  .workstation, .transport { display: none; }
  .compatibility { display: block; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; }
}
```

- [ ] **Step 6: Run component, unit, and build checks**

Run: `npm test -- src/components/workstation.test.tsx`

Expected: 2 passing component tests.

Run: `npm run check`

Expected: the full unit suite and production build pass.

- [ ] **Step 7: Commit the workstation shell**

```bash
git add src/App.tsx src/components src/styles.css
git commit -m "feat: build three-column generation workstation"
```

### Task 9: Render the piano roll and synchronize token selection

**Files:**
- Create: `src/components/sequencer-geometry.ts`
- Create: `src/components/sequencer-geometry.test.ts`
- Create: `src/components/SequencerCanvas.tsx`
- Create: `src/components/SequencerCanvas.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing geometry and Canvas tests**

Create `src/components/sequencer-geometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { NoteEvent } from '../domain/types';
import { eventRectangle, eventUnderPoint } from './sequencer-geometry';

const event: NoteEvent = {
  id: 'melody-0', tokenId: 'token-0', trackId: 'melody',
  startBeat: 4, durationBeats: 2, midi: 60, velocity: 0.7,
};

describe('sequencer geometry', () => {
  it('maps beat and MIDI values into a rectangle', () => {
    expect(eventRectangle(event, { pixelsPerBeat: 20, rowHeight: 8, maxMidi: 84 })).toEqual({
      x: 80, y: 192, width: 40, height: 6,
    });
  });

  it('hit tests visible note rectangles', () => {
    expect(eventUnderPoint([event], 90, 194, {
      pixelsPerBeat: 20, rowHeight: 8, maxMidi: 84,
    })?.id).toBe('melody-0');
  });
});
```

Create `src/components/SequencerCanvas.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Score } from '../domain/types';
import { SequencerCanvas } from './SequencerCanvas';

describe('SequencerCanvas', () => {
  it('requests token seek when a melody note is clicked', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      scale: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn(),
      fillStyle: '', strokeStyle: '', globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: 640, bottom: 520,
      width: 640, height: 520, toJSON: () => ({}),
    });
    const onSeekToken = vi.fn();
    const score = {
      settings: { bpm: 84 }, durationSeconds: 30,
      noteEvents: [{
        id: 'melody-0', tokenId: 'token-0', trackId: 'melody',
        startBeat: 0, durationBeats: 1, midi: 60, velocity: 0.7,
      }],
    } as Score;
    const { getByLabelText } = render(
      <SequencerCanvas score={score} playheadSeconds={0} activeTokenId={null} onSeekToken={onSeekToken} />,
    );
    fireEvent.click(getByLabelText('二维音序器'), { clientX: 5, clientY: 194 });
    expect(onSeekToken).toHaveBeenCalledWith('token-0');
  });
});
```

- [ ] **Step 2: Run focused tests and verify missing-module failures**

Run: `npm test -- src/components/sequencer-geometry.test.ts src/components/SequencerCanvas.test.tsx`

Expected: FAIL because the geometry and Canvas components do not exist.

- [ ] **Step 3: Implement deterministic layout and hit testing**

Create `src/components/sequencer-geometry.ts`:

```ts
import type { NoteEvent } from '../domain/types';

export interface ViewMetrics {
  pixelsPerBeat: number;
  rowHeight: number;
  maxMidi: number;
}

export function eventRectangle(event: NoteEvent, metrics: ViewMetrics) {
  return {
    x: event.startBeat * metrics.pixelsPerBeat,
    y: (metrics.maxMidi - event.midi) * metrics.rowHeight,
    width: Math.max(2, event.durationBeats * metrics.pixelsPerBeat),
    height: Math.max(4, metrics.rowHeight - 2),
  };
}

export function eventUnderPoint(
  events: NoteEvent[],
  x: number,
  y: number,
  metrics: ViewMetrics,
): NoteEvent | undefined {
  return events.find((event) => {
    const rectangle = eventRectangle(event, metrics);
    return x >= rectangle.x && x <= rectangle.x + rectangle.width
      && y >= rectangle.y && y <= rectangle.y + rectangle.height;
  });
}
```

- [ ] **Step 4: Implement viewport-only Canvas drawing**

Create `src/components/SequencerCanvas.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { Score } from '../domain/types';
import { eventRectangle, eventUnderPoint } from './sequencer-geometry';

interface Props {
  score: Score;
  playheadSeconds: number;
  activeTokenId: string | null;
  onSeekToken: (tokenId: string) => void;
}

const METRICS = { pixelsPerBeat: 20, rowHeight: 8, maxMidi: 84 };
const COLORS: Record<string, string> = {
  melody: '#cf5736', harmony: '#665fc2', bass: '#27866d', percussion: '#d69a25',
};

export function SequencerCanvas({ score, playheadSeconds, activeTokenId, onSeekToken }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 640, scrollLeft: 0 });
  const totalBeats = score.durationSeconds * score.settings.bpm / 60;
  const contentWidth = Math.max(640, totalBeats * METRICS.pixelsPerBeat + 32);
  useEffect(() => {
    setViewport((current) => ({
      ...current,
      width: scrollRef.current?.clientWidth || current.width,
    }));
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const scale = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || viewport.width;
    const height = canvas.clientHeight;
    canvas.width = width * scale;
    canvas.height = height * scale;
    context.scale(scale, scale);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#fffefa';
    context.fillRect(0, 0, width, height);
    const visible = score.noteEvents.filter((event) => {
      const rectangle = eventRectangle(event, METRICS);
      return rectangle.x + rectangle.width >= viewport.scrollLeft
        && rectangle.x <= viewport.scrollLeft + width;
    });
    for (const event of visible) {
      const rectangle = eventRectangle(event, METRICS);
      context.fillStyle = COLORS[event.trackId] ?? '#777';
      context.globalAlpha = event.tokenId === activeTokenId ? 1 : 0.74;
      const x = rectangle.x - viewport.scrollLeft;
      context.fillRect(x, rectangle.y, rectangle.width, rectangle.height);
      if (event.tokenId === activeTokenId) {
        context.strokeStyle = '#211f1b';
        context.strokeRect(x - 1, rectangle.y - 1, rectangle.width + 2, rectangle.height + 2);
      }
    }
    context.globalAlpha = 1;
    const playheadBeat = playheadSeconds * score.settings.bpm / 60;
    context.fillStyle = '#211f1b';
    context.fillRect(playheadBeat * METRICS.pixelsPerBeat - viewport.scrollLeft, 0, 2, height);
  }, [score, playheadSeconds, activeTokenId, viewport]);

  return (
    <div
      ref={scrollRef}
      className="sequencer-scroll"
      onScroll={(event) => setViewport({
        width: event.currentTarget.clientWidth || 640,
        scrollLeft: event.currentTarget.scrollLeft,
      })}
    >
      <div className="score-surface" style={{ width: contentWidth }}>
        <canvas
          ref={canvasRef}
          className="sequencer-canvas"
          style={{ width: viewport.width }}
          aria-label="二维音序器"
          tabIndex={0}
          onClick={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const hit = eventUnderPoint(
              score.noteEvents,
              event.clientX - bounds.left + viewport.scrollLeft,
              event.clientY - bounds.top,
              METRICS,
            );
            if (hit?.tokenId) onSeekToken(hit.tokenId);
          }}
        />
      </div>
      <span className="sr-only" aria-live="polite">
        当前词语 {activeTokenId ?? '无'}，时间 {playheadSeconds.toFixed(1)} 秒
      </span>
    </div>
  );
}
```

- [ ] **Step 5: Replace the placeholder and add Canvas styles**

In `src/App.tsx`, import `SequencerCanvas` and replace the `sequencer-placeholder` section with:

```tsx
<section className="panel sequencer-panel" aria-label="曲谱画布">
  {state.score ? (
    <SequencerCanvas
      score={state.score}
      playheadSeconds={state.playheadSeconds}
      activeTokenId={state.activeTokenId}
      onSeekToken={seekToken}
    />
  ) : (
    <div className="empty-score">生成后在这里显示曲谱</div>
  )}
</section>
```

Append to `src/styles.css`:

```css
.sequencer-panel { position: relative; overflow: hidden; min-height: 520px; }
.sequencer-scroll { width: 100%; height: 100%; overflow: auto; }
.score-surface { min-width: 100%; min-height: 520px; }
.sequencer-canvas { position: sticky; left: 0; display: block; height: 520px; }
.empty-score { display: grid; place-items: center; height: 100%; color: #817a6e; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
```

- [ ] **Step 6: Run Canvas, component, and build checks**

Run: `npm test -- src/components/sequencer-geometry.test.ts src/components/SequencerCanvas.test.tsx src/components/workstation.test.tsx`

Expected: all geometry and workstation tests pass.

Run: `npm run build`

Expected: production build succeeds.

- [ ] **Step 7: Commit score visualization**

```bash
git add src/App.tsx src/components src/styles.css
git commit -m "feat: render synchronized piano roll"
```

### Task 10: Vendor licensed acoustic samples with a reproducible manifest

**Files:**
- Create: `scripts/fetch-samples.mjs`
- Create: `public/audio/manifest.json`
- Create: `public/audio/piano/*.mp3`
- Create: `public/audio/violin/*.mp3`
- Create: `public/audio/cello/*.mp3`
- Create: `public/audio/upstream/LICENSE.md`
- Create: `public/audio/upstream/sample-source-info.txt`
- Create: `NOTICE.md`
- Create: `src/audio/instruments.ts`
- Create: `src/audio/instruments.test.ts`

- [ ] **Step 1: Add the pinned sample downloader**

Create `scripts/fetch-samples.mjs`:

```js
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const revision = '622c2f1c32c8cfce4158ddc3eb26e518ddef37e5';
const root = `https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/${revision}`;
const selections = {
  piano: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
  violin: ['A3', 'A4', 'A5', 'A6', 'C4', 'C5', 'C6', 'G3', 'G4', 'G5', 'G6'],
  cello: ['C2', 'C3', 'C4', 'C5'],
};

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  return {
    path: destination.replaceAll('\\', '/').replace(`${resolve('.').replaceAll('\\', '/')}/`, ''),
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

const files = [];
for (const [instrument, notes] of Object.entries(selections)) {
  for (const note of notes) {
    files.push(await download(
      `${root}/samples/${instrument}/${note}.mp3`,
      resolve(`public/audio/${instrument}/${note}.mp3`),
    ));
  }
}
files.push(await download(`${root}/LICENSE.md`, resolve('public/audio/upstream/LICENSE.md')));
files.push(await download(
  `${root}/sample-source-info.txt`,
  resolve('public/audio/upstream/sample-source-info.txt'),
));
await writeFile(
  resolve('public/audio/manifest.json'),
  `${JSON.stringify({ revision, license: 'CC-BY-3.0', files }, null, 2)}\n`,
  'utf8',
);
console.log(`Downloaded ${files.length} licensed files from ${revision}.`);
```

- [ ] **Step 2: Download the pinned files and inspect the manifest**

Run: `node scripts/fetch-samples.mjs`

Expected: `Downloaded 23 licensed files from 622c2f1c32c8cfce4158ddc3eb26e518ddef37e5.` and a manifest entry with a non-empty SHA-256 for every file.

Create `NOTICE.md`:

```md
# Third-party notices

## tonejs-instruments acoustic samples

The piano, violin, and cello samples under `public/audio/` are selected from [nbrosowsky/tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments), pinned at commit `622c2f1c32c8cfce4158ddc3eb26e518ddef37e5`.

The upstream project identifies these samples as Creative Commons Attribution 3.0. Copyright and source details are preserved in `public/audio/upstream/LICENSE.md` and `public/audio/upstream/sample-source-info.txt`.

Changes made here: only a reduced set of MP3 files is redistributed; the audio content is not modified.
```

- [ ] **Step 3: Write a failing retry-and-fallback test**

Create `src/audio/instruments.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { InstrumentBank } from './instruments';
import { createInstrumentBank } from './instruments';

const fakeBank = { fallback: false, dispose: vi.fn() } as unknown as InstrumentBank;
const fallbackBank = { fallback: true, dispose: vi.fn() } as unknown as InstrumentBank;

describe('createInstrumentBank', () => {
  it('retries sample loading once before using the synth fallback', async () => {
    const load = vi.fn().mockRejectedValue(new Error('network'));
    const fallback = vi.fn().mockReturnValue(fallbackBank);
    await expect(createInstrumentBank('chamber-piano', load, fallback)).resolves.toBe(fallbackBank);
    expect(load).toHaveBeenCalledTimes(2);
    expect(fallback).toHaveBeenCalledOnce();
  });

  it('returns sampled instruments without creating fallback voices', async () => {
    const load = vi.fn().mockResolvedValue(fakeBank);
    const fallback = vi.fn();
    await expect(createInstrumentBank('chamber-piano', load, fallback)).resolves.toBe(fakeBank);
    expect(fallback).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run the instrument test and verify the missing-module failure**

Run: `npm test -- src/audio/instruments.test.ts`

Expected: FAIL because `src/audio/instruments.ts` does not exist.

- [ ] **Step 5: Implement sampled instruments and synth fallback**

Create `src/audio/instruments.ts`:

```ts
import * as Tone from 'tone';
import type { TimbrePreset } from '../domain/types';

export interface Voice {
  triggerAttackRelease(note: number, duration: number, time: number, velocity: number): unknown;
  dispose(): unknown;
}

export interface InstrumentBank {
  melody: Voice;
  harmony: Voice;
  bass: Voice;
  percussion: Voice;
  fallback: boolean;
  dispose(): void;
}

const maps = {
  piano: Object.fromEntries(['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].map((note) => [note, `${note}.mp3`])),
  violin: Object.fromEntries(['A3', 'A4', 'A5', 'A6', 'C4', 'C5', 'C6', 'G3', 'G4', 'G5', 'G6'].map((note) => [note, `${note}.mp3`])),
  cello: Object.fromEntries(['C2', 'C3', 'C4', 'C5'].map((note) => [note, `${note}.mp3`])),
};

class LayeredVoice implements Voice {
  constructor(private readonly voices: Voice[]) {}
  triggerAttackRelease(note: number, duration: number, time: number, velocity: number) {
    for (const voice of this.voices) voice.triggerAttackRelease(note, duration, time, velocity * 0.72);
  }
  dispose() { for (const voice of this.voices) voice.dispose(); }
}

function createElectronicBank(fallback: boolean): InstrumentBank {
  const limiter = new Tone.Limiter(-1).toDestination();
  const output = new Tone.Gain(0.68).connect(limiter);
  const melody = new Tone.PolySynth(Tone.Synth).connect(output);
  const harmony = new Tone.PolySynth(Tone.AMSynth).connect(output);
  const bass = new Tone.PolySynth(Tone.MonoSynth).connect(output);
  const percussion = new Tone.PolySynth(Tone.MembraneSynth).connect(output);
  return {
    melody, harmony, bass, percussion, fallback,
    dispose() {
      melody.dispose(); harmony.dispose(); bass.dispose(); percussion.dispose();
      output.dispose(); limiter.dispose();
    },
  };
}

export async function loadPresetBank(preset: TimbrePreset): Promise<InstrumentBank> {
  if (preset === 'soft-electronic') return createElectronicBank(false);
  const limiter = new Tone.Limiter(-1).toDestination();
  const output = new Tone.Gain(0.68).connect(limiter);
  const piano = new Tone.Sampler({ urls: maps.piano, baseUrl: '/audio/piano/', release: 1 }).connect(output);
  const violin = new Tone.Sampler({ urls: maps.violin, baseUrl: '/audio/violin/', release: 1.4 }).connect(output);
  const cello = new Tone.Sampler({ urls: maps.cello, baseUrl: '/audio/cello/', release: 1.6 }).connect(output);
  const bass = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.5 },
  }).connect(output);
  const percussion = new Tone.PolySynth(Tone.MembraneSynth).connect(output);
  if (preset === 'minimal-piano') {
    violin.volume.value = -18;
    cello.volume.value = -20;
    percussion.volume.value = -24;
  }
  await Tone.loaded();
  const harmony = new LayeredVoice([violin, cello]);
  return {
    melody: piano, harmony, bass, percussion, fallback: false,
    dispose() {
      piano.dispose(); harmony.dispose(); bass.dispose(); percussion.dispose();
      output.dispose(); limiter.dispose();
    },
  };
}

export function createFallbackBank(): InstrumentBank {
  return createElectronicBank(true);
}

export async function createInstrumentBank(
  preset: TimbrePreset,
  load: () => Promise<InstrumentBank> = () => loadPresetBank(preset),
  fallback: () => InstrumentBank = createFallbackBank,
): Promise<InstrumentBank> {
  try {
    return await load();
  } catch {
    try {
      return await load();
    } catch {
      return fallback();
    }
  }
}
```

- [ ] **Step 6: Verify license files, fallback tests, and build**

Run: `npm test -- src/audio/instruments.test.ts`

Expected: 2 passing tests.

Run: `npm run build`

Expected: production build succeeds and Vite includes Tone.js without remote runtime imports.

- [ ] **Step 7: Commit the licensed sample layer**

```bash
git add scripts/fetch-samples.mjs public/audio NOTICE.md src/audio/instruments.ts src/audio/instruments.test.ts
git commit -m "feat: add licensed acoustic instrument bank"
```

### Task 11: Schedule real-time playback and synchronized highlighting

**Files:**
- Create: `src/audio/schedule.ts`
- Create: `src/audio/schedule.test.ts`
- Create: `src/audio/engine.ts`
- Create: `src/audio/engine.test.ts`
- Modify: `src/state/reducer.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing score scheduling and engine tests**

Create `src/audio/schedule.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { InstrumentBank } from './instruments';
import { scheduleScoreEvents } from './schedule';

describe('scheduleScoreEvents', () => {
  it('converts beats to seconds and routes tracks to their voices', () => {
    const triggerAttackRelease = vi.fn();
    const bank = {
      melody: { triggerAttackRelease }, harmony: { triggerAttackRelease },
      bass: { triggerAttackRelease }, percussion: { triggerAttackRelease },
    } as unknown as InstrumentBank;
    const events = [{
      id: 'melody-0', tokenId: 'token-0', trackId: 'melody',
      startBeat: 2, durationBeats: 1, midi: 60, velocity: 0.7,
    }];
    scheduleScoreEvents(events, 120, bank, (seconds, callback) => callback(seconds));
    expect(triggerAttackRelease).toHaveBeenCalledWith(60, 0.5, 1, 0.7);
  });
});
```

Create `src/audio/engine.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { Score } from '../domain/types';
import { AudioEngine } from './engine';

describe('AudioEngine', () => {
  it('unlocks audio, schedules a score, and starts at the requested second', async () => {
    const port = {
      unlock: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(), schedule: vi.fn(), start: vi.fn(), pause: vi.fn(), stop: vi.fn(),
      seconds: 0,
    };
    const bank = {
      melody: {}, harmony: {}, bass: {}, percussion: {}, fallback: false, dispose: vi.fn(),
    };
    const engine = new AudioEngine(async () => bank as never, port);
    const score = { settings: { bpm: 84 }, noteEvents: [] } as Score;
    await engine.play(score, 3, vi.fn());
    expect(port.unlock).toHaveBeenCalledOnce();
    expect(port.start).toHaveBeenCalledWith(3);
  });
});
```

- [ ] **Step 2: Run focused tests and verify missing-module failures**

Run: `npm test -- src/audio/schedule.test.ts src/audio/engine.test.ts`

Expected: FAIL because the scheduler and engine do not exist.

- [ ] **Step 3: Implement shared event scheduling**

Create `src/audio/schedule.ts`:

```ts
import type { NoteEvent } from '../domain/types';
import type { InstrumentBank, Voice } from './instruments';

export type ScheduleCallback = (seconds: number, callback: (audioTime: number) => void) => void;

function voiceFor(event: NoteEvent, bank: InstrumentBank): Voice {
  if (event.trackId === 'harmony') return bank.harmony;
  if (event.trackId === 'bass') return bank.bass;
  if (event.trackId === 'percussion') return bank.percussion;
  return bank.melody;
}

export function scheduleScoreEvents(
  events: NoteEvent[],
  bpm: number,
  bank: InstrumentBank,
  schedule: ScheduleCallback,
  onToken?: (tokenId: string, seconds: number, audioTime: number) => void,
): void {
  for (const event of events) {
    const startSeconds = event.startBeat * 60 / bpm;
    const durationSeconds = event.durationBeats * 60 / bpm;
    schedule(startSeconds, (audioTime) => {
      voiceFor(event, bank).triggerAttackRelease(
        event.midi,
        durationSeconds,
        audioTime,
        event.velocity,
      );
      if (event.trackId === 'melody' && event.tokenId) {
        onToken?.(event.tokenId, startSeconds, audioTime);
      }
    });
  }
}
```

- [ ] **Step 4: Implement a testable Tone transport adapter**

Create `src/audio/engine.ts`:

```ts
import * as Tone from 'tone';
import type { Score } from '../domain/types';
import { createInstrumentBank, type InstrumentBank } from './instruments';
import { scheduleScoreEvents } from './schedule';

export interface TransportPort {
  unlock(): Promise<void>;
  cancel(): void;
  schedule(callback: (time: number) => void, seconds: number): void;
  start(seconds: number): void;
  pause(): void;
  stop(): void;
  seconds: number;
}

const tonePort: TransportPort = {
  unlock: () => Tone.start(),
  cancel: () => Tone.getTransport().cancel(),
  schedule: (callback, seconds) => { Tone.getTransport().schedule(callback, seconds); },
  start: (seconds) => {
    Tone.getTransport().seconds = seconds;
    Tone.getTransport().start();
  },
  pause: () => Tone.getTransport().pause(),
  stop: () => { Tone.getTransport().stop(); Tone.getTransport().seconds = 0; },
  get seconds() { return Tone.getTransport().seconds; },
  set seconds(value: number) { Tone.getTransport().seconds = value; },
};

export class AudioEngine {
  private bank: InstrumentBank | null = null;
  private bankPreset: Score['settings']['timbre'] | null = null;
  private timer: number | null = null;

  constructor(
    private readonly loadBank: (preset: Score['settings']['timbre']) => Promise<InstrumentBank>
      = (preset) => createInstrumentBank(preset),
    private readonly transport: TransportPort = tonePort,
  ) {}

  async play(
    score: Score,
    fromSeconds: number,
    onUpdate: (seconds: number, tokenId: string | null) => void,
    onEnded: () => void = () => undefined,
  ): Promise<boolean> {
    await this.transport.unlock();
    if (!this.bank || this.bankPreset !== score.settings.timbre) {
      this.bank?.dispose();
      this.bank = await this.loadBank(score.settings.timbre);
      this.bankPreset = score.settings.timbre;
    }
    this.transport.cancel();
    scheduleScoreEvents(
      score.noteEvents,
      score.settings.bpm,
      this.bank,
      (seconds, callback) => this.transport.schedule(callback, seconds),
      (tokenId, seconds, audioTime) => {
        Tone.getDraw().schedule(() => onUpdate(seconds, tokenId), audioTime);
      },
    );
    this.transport.start(fromSeconds);
    this.stopTimer();
    this.timer = window.setInterval(() => {
      const seconds = this.transport.seconds;
      onUpdate(seconds, null);
      if (seconds >= score.durationSeconds) {
        this.stop();
        onEnded();
      }
    }, 25);
    return this.bank.fallback;
  }

  pause(): number {
    this.transport.pause();
    this.stopTimer();
    return this.transport.seconds;
  }

  stop(): void {
    this.transport.stop();
    this.transport.cancel();
    this.stopTimer();
  }

  seek(seconds: number): void {
    this.transport.seconds = Math.max(0, seconds);
  }

  setVolume(volume: number): void {
    const linear = Math.min(1, Math.max(0.0001, volume));
    Tone.getDestination().volume.rampTo(Tone.gainToDb(linear), 0.05);
  }

  dispose(): void {
    this.stop();
    this.bank?.dispose();
    this.bank = null;
    this.bankPreset = null;
  }

  private stopTimer(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }
}
```

- [ ] **Step 5: Connect playback and playhead updates to React state**

Add this action to `AppAction` in `src/state/reducer.ts`:

```ts
| { type: 'PLAYHEAD'; playheadSeconds: number; tokenId: string | null }
```

Add this reducer case:

```ts
case 'PLAYHEAD':
  return {
    ...state,
    playheadSeconds: action.playheadSeconds,
    activeTokenId: action.tokenId ?? state.activeTokenId,
  };
```

In `src/App.tsx`, create and dispose one engine:

```tsx
import { useEffect, useReducer, useRef } from 'react';
import { AudioEngine } from './audio/engine';

const engineRef = useRef<AudioEngine | null>(null);
engineRef.current ??= new AudioEngine();
useEffect(() => () => engineRef.current?.dispose(), []);
```

At the start of the existing `generate` function, stop any paused transport before dispatching `GENERATE`:

```tsx
engineRef.current?.stop();
dispatch({ type: 'GENERATE' });
```

Remove the earlier duplicate `dispatch({ type: 'GENERATE' })` from that function so generation is dispatched exactly once.

Replace the text and settings change handlers so editing cannot leave an old transport playing:

```tsx
onChange={(text) => {
  engineRef.current?.stop();
  dispatch({ type: 'EDIT_TEXT', text });
}}
```

```tsx
onChange={(settings) => {
  engineRef.current?.stop();
  dispatch({ type: 'EDIT_SETTINGS', settings });
}}
```

Replace the token seek dispatch with:

```tsx
engineRef.current?.seek(event.startBeat * 60 / state.score.settings.bpm);
dispatch({
  type: 'SEEK',
  playheadSeconds: event.startBeat * 60 / state.score.settings.bpm,
  tokenId,
});
```

Replace the transport callbacks with:

```tsx
onPlay={async () => {
  if (!state.score) return;
  dispatch({ type: 'PLAY' });
  try {
    const fallback = await engineRef.current!.play(
      state.score,
      state.playheadSeconds,
      (playheadSeconds, tokenId) => dispatch({ type: 'PLAYHEAD', playheadSeconds, tokenId }),
      () => dispatch({ type: 'STOP' }),
    );
    dispatch({
      type: 'NOTICE',
      message: fallback ? '钢琴或弦乐采样加载失败，正在使用兼容合成音色。' : null,
    });
  } catch (error) {
    dispatch({
      type: 'PLAY_FAILED',
      message: error instanceof Error ? error.message : '音频启动失败，请再次点击播放',
    });
  }
}}
onPause={() => dispatch({ type: 'PAUSE', playheadSeconds: engineRef.current!.pause() })}
onStop={() => { engineRef.current!.stop(); dispatch({ type: 'STOP' }); }}
onVolumeChange={(volume) => {
  engineRef.current!.setVolume(volume);
  dispatch({ type: 'VOLUME', volume });
}}
```

- [ ] **Step 6: Run audio, reducer, component, and build checks**

Run: `npm test -- src/audio src/state/reducer.test.ts src/components`

Expected: all audio, state, and component tests pass.

Run: `npm run build`

Expected: production build succeeds.

- [ ] **Step 7: Commit real-time audio integration**

```bash
git add src/audio src/state src/App.tsx
git commit -m "feat: play scores with synchronized highlighting"
```

### Task 12: Render and download WAV from the same score

**Files:**
- Create: `src/audio/wav.ts`
- Create: `src/audio/wav.test.ts`
- Create: `src/audio/exporter.ts`
- Create: `src/audio/exporter.test.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing WAV header and exporter tests**

Create `src/audio/wav.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { encodeWav } from './wav';

describe('encodeWav', () => {
  it('writes a stereo 44.1 kHz 16-bit RIFF/WAVE file', () => {
    const bytes = encodeWav([new Float32Array(441), new Float32Array(441)], 44_100);
    const view = new DataView(bytes);
    const text = (offset: number, length: number) =>
      String.fromCharCode(...new Uint8Array(bytes, offset, length));
    expect(text(0, 4)).toBe('RIFF');
    expect(text(8, 4)).toBe('WAVE');
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(44_100);
    expect(view.getUint16(34, true)).toBe(16);
  });
});
```

Create `src/audio/exporter.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { Score } from '../domain/types';
import { exportScoreWav } from './exporter';

describe('exportScoreWav', () => {
  it('passes the canonical score to the renderer and returns an audio Blob', async () => {
    const score = { musicHash: 'abc' } as Score;
    const renderer = vi.fn().mockResolvedValue({
      sampleRate: 44_100,
      channels: [new Float32Array(100), new Float32Array(100)],
    });
    const blob = await exportScoreWav(score, renderer);
    expect(renderer).toHaveBeenCalledWith(score);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBeGreaterThan(44);
  });
});
```

- [ ] **Step 2: Run focused tests and verify missing-module failures**

Run: `npm test -- src/audio/wav.test.ts src/audio/exporter.test.ts`

Expected: FAIL because WAV encoding and export modules do not exist.

- [ ] **Step 3: Implement a clipping-safe PCM WAV encoder**

Create `src/audio/wav.ts`:

```ts
function writeText(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

export function encodeWav(channels: Float32Array[], sampleRate: number): ArrayBuffer {
  if (channels.length !== 2) throw new Error('WAV export requires two channels');
  const frameCount = Math.min(channels[0].length, channels[1].length);
  const dataBytes = frameCount * channels.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  writeText(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeText(view, 8, 'WAVE');
  writeText(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeText(view, 36, 'data');
  view.setUint32(40, dataBytes, true);
  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (const channel of channels) {
      const sample = Math.max(-1, Math.min(1, channel[frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return buffer;
}
```

- [ ] **Step 4: Implement Tone.js offline rendering and Blob creation**

Create `src/audio/exporter.ts`:

```ts
import * as Tone from 'tone';
import type { Score } from '../domain/types';
import { createInstrumentBank } from './instruments';
import { scheduleScoreEvents } from './schedule';
import { encodeWav } from './wav';

export interface RenderedPcm {
  sampleRate: number;
  channels: Float32Array[];
}

export type OfflineRenderer = (score: Score) => Promise<RenderedPcm>;

export const renderScoreOffline: OfflineRenderer = async (score) => {
  const rendered = await Tone.Offline(async ({ transport }) => {
    const bank = await createInstrumentBank(score.settings.timbre);
    scheduleScoreEvents(
      score.noteEvents,
      score.settings.bpm,
      bank,
      (seconds, callback) => { transport.schedule(callback, seconds); },
    );
    transport.start(0);
  }, score.durationSeconds + 2, 2, 44_100);
  return {
    sampleRate: 44_100,
    channels: [rendered.getChannelData(0), rendered.getChannelData(1)],
  };
};

export async function exportScoreWav(
  score: Score,
  render: OfflineRenderer = renderScoreOffline,
): Promise<Blob> {
  const rendered = await render(score);
  return new Blob([encodeWav(rendered.channels, rendered.sampleRate)], { type: 'audio/wav' });
}
```

- [ ] **Step 5: Connect WAV download to the transport button**

Import `exportScoreWav` in `src/App.tsx`, then replace the export callback with:

```tsx
onExport={async () => {
  if (!state.score) return;
  dispatch({ type: 'EXPORT' });
  try {
    const blob = await exportScoreWav(state.score);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `zipu-${state.score.musicHash.slice(0, 10)}.wav`;
    anchor.click();
    URL.revokeObjectURL(url);
    dispatch({ type: 'EXPORT_FINISHED' });
  } catch (error) {
    dispatch({
      type: 'EXPORT_FAILED',
      message: error instanceof Error ? error.message : 'WAV 导出失败，请关闭其他标签页后重试',
    });
  }
}}
```

- [ ] **Step 6: Run WAV, audio, component, and build checks**

Run: `npm test -- src/audio src/components`

Expected: WAV, exporter, instrument, scheduling, engine, Canvas, and workstation tests pass.

Run: `npm run build`

Expected: production build succeeds.

- [ ] **Step 7: Commit WAV export**

```bash
git add src/audio src/App.tsx
git commit -m "feat: export canonical scores as WAV"
```

### Task 13: Add Chrome/Edge end-to-end, privacy, and accessibility checks

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/workstation.spec.ts`
- Modify: `src/components/Compatibility.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add Playwright configuration and install its Chromium runtime**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
  ],
});
```

Run: `npx playwright install chromium`

Expected: the Playwright-managed Chromium runtime installs successfully. Edge uses the desktop Edge installation on Windows.

- [ ] **Step 2: Write the end-to-end happy path and privacy assertions**

Create `tests/e2e/workstation.spec.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const text = '春风吹过山谷，星光落在河面。';

test('generates a score, synchronizes UI state, and never transmits text', async ({ page }) => {
  const outbound: string[] = [];
  page.on('request', (request) => {
    outbound.push(`${request.method()} ${request.url()} ${request.postData() ?? ''}`);
  });
  await page.goto('/');
  await page.getByLabel('中文原文').fill(text);
  await page.getByRole('button', { name: '生成音乐' }).click();
  await expect(page.getByText('曲目已生成')).toBeVisible();
  await expect(page.getByLabel('二维音序器')).toBeVisible();
  await page.getByLabel('中文原文').fill(`${text}清晨`);
  await expect(page.getByText('文字或参数已变化，请重新生成')).toBeVisible();
  expect(outbound.join('\n')).not.toContain(text);
});

test('exports a playable-looking WAV download', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('中文原文').fill(text);
  await page.getByRole('button', { name: '生成音乐' }).click();
  await expect(page.getByText('曲目已生成')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 WAV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^zipu-[a-f0-9]{10}\.wav$/);
  expect(await download.failure()).toBeNull();
  const path = await download.path();
  expect(path).not.toBeNull();
  const bytes = await readFile(path!);
  expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
  expect(bytes.readUInt32LE(24)).toBe(44_100);
  let peak = 0;
  let nonZero = false;
  for (let offset = 44; offset + 1 < bytes.length; offset += 2) {
    const sample = Math.abs(bytes.readInt16LE(offset));
    peak = Math.max(peak, sample);
    nonZero ||= sample > 0;
  }
  expect(nonZero).toBe(true);
  expect(peak).toBeLessThan(32_767);
});

test('supports keyboard focus and shows a narrow-screen notice', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  await page.setViewportSize({ width: 800, height: 900 });
  await expect(page.getByText('第一版需要桌面宽屏')).toBeVisible();
});
```

- [ ] **Step 3: Make audio and narrow-screen compatibility messages independent**

Replace `src/components/Compatibility.tsx` with:

```tsx
export function Compatibility() {
  const audioSupported = typeof AudioContext !== 'undefined'
    && typeof OfflineAudioContext !== 'undefined';
  const targetBrowser = /Chrome|Edg/u.test(navigator.userAgent);
  return (
    <>
      {!audioSupported && (
        <div className="compatibility" role="status">
          当前浏览器缺少完整 Web Audio 支持。请使用桌面版 Chrome 或 Edge。
        </div>
      )}
      {audioSupported && !targetBrowser && (
        <div className="compatibility" role="status">
          当前浏览器可以尝试运行，但第一版只验证桌面版 Chrome 与 Edge。
        </div>
      )}
      <div className="compatibility narrow-warning" role="status">
        第一版需要桌面宽屏；请将窗口扩大到至少 1024 像素。
      </div>
    </>
  );
}
```

Add these rules to `src/styles.css` and replace the existing narrow-screen block:

```css
.narrow-warning { display: none; }
@media (max-width: 1023px) {
  .workstation, .transport { display: none; }
  .narrow-warning { display: block; }
}
```

- [ ] **Step 4: Run Chromium end-to-end tests first**

Run: `npm run test:e2e -- --project=chromium`

Expected: 3 passing tests, including one WAV download.

- [ ] **Step 5: Run Edge end-to-end tests**

Run: `npm run test:e2e -- --project=edge`

Expected: 3 passing tests. If Edge is absent on a non-Windows CI host, record that environment limitation and require the Windows verification run before release.

- [ ] **Step 6: Commit browser acceptance coverage**

```bash
git add playwright.config.ts tests/e2e src/components/Compatibility.tsx src/styles.css
git commit -m "test: cover browser workflow privacy and accessibility"
```

### Task 14: Verify sample integrity and record the performance baseline

**Files:**
- Create: `scripts/verify-samples.mjs`
- Create: `scripts/benchmark-compose.mts`
- Create: `docs/performance-baseline.md`
- Modify: `package.json`

- [ ] **Step 1: Add deterministic sample verification**

Create `scripts/verify-samples.mjs`:

```js
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const manifest = JSON.parse(await readFile(resolve('public/audio/manifest.json'), 'utf8'));
for (const entry of manifest.files) {
  const bytes = await readFile(resolve(entry.path));
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== entry.sha256) {
    throw new Error(`Sample checksum mismatch: ${entry.path}`);
  }
}
console.log(`Verified ${manifest.files.length} licensed files.`);
```

Add this script to `package.json`:

```json
"samples:verify": "node scripts/verify-samples.mjs"
```

Run: `npm run samples:verify`

Expected: `Verified 23 licensed files.`

- [ ] **Step 2: Add an executable 300-character benchmark**

Create `scripts/benchmark-compose.mts`:

```ts
import { writeFile } from 'node:fs/promises';
import { DEFAULT_SETTINGS } from '../src/domain/settings.ts';
import { composeScore } from '../src/music/compose.ts';
import { analyzeText, initializeTextAnalyzer } from '../src/text/analyze.ts';

const text = '春风山谷星光河面清晨远方归来'.repeat(24).slice(0, 300);
await initializeTextAnalyzer();
const samples: number[] = [];
for (let index = 0; index < 10; index += 1) {
  const started = performance.now();
  await composeScore(analyzeText(text), DEFAULT_SETTINGS);
  samples.push(performance.now() - started);
}
samples.sort((left, right) => left - right);
const median = samples[Math.floor(samples.length / 2)];
const report = `# Composition performance baseline\n\n`
  + `- Date: ${new Date().toISOString()}\n`
  + `- Node: ${process.version}\n`
  + `- Platform: ${process.platform} ${process.arch}\n`
  + `- Input: 300 effective characters\n`
  + `- Runs: 10\n`
  + `- Median: ${median.toFixed(2)} ms\n`
  + `- Samples: ${samples.map((value) => value.toFixed(2)).join(', ')} ms\n`;
await writeFile('docs/performance-baseline.md', report, 'utf8');
console.log(`Median composition time: ${median.toFixed(2)} ms`);
if (median > 1000) process.exitCode = 1;
```

Add this script to `package.json`:

```json
"benchmark": "tsx scripts/benchmark-compose.mts"
```

- [ ] **Step 3: Run and record the baseline**

Run: `npm run benchmark`

Expected: exit code 0, a reported median at or below 1000 ms, and a populated `docs/performance-baseline.md` containing the machine and all 10 timings.

- [ ] **Step 4: Commit integrity and performance evidence**

```bash
git add package.json package-lock.json scripts/verify-samples.mjs scripts/benchmark-compose.mts docs/performance-baseline.md
git commit -m "test: verify assets and composition performance"
```

### Task 15: Complete release documentation and full verification

**Files:**
- Modify: `README.md`
- Modify: `package.json`

- [ ] **Step 1: Add one release-verification command**

Add this script to `package.json`:

```json
"verify": "npm run samples:verify && npm run check && npm run test:e2e -- --project=chromium && npm run benchmark"
```

- [ ] **Step 2: Replace the README status with working-product instructions**

Keep the confirmed product decisions and replace the design-stage status with:

```md
## 本地运行

```bash
npm install
npm run dev
```

使用桌面版 Chrome 或 Edge 打开 Vite 显示的本地地址。所有文字分析、作曲、播放和 WAV 渲染都在浏览器中完成。

## 验证

```bash
npm run verify
```

该命令检查采样文件哈希、单元与组件测试、生产构建、Chromium 端到端流程和 300 字作曲性能。Windows 发布前另运行：

```bash
npm run test:e2e -- --project=edge
```

## 音源许可

钢琴、提琴采样的来源和 CC BY 3.0 署名见 `NOTICE.md`。贝斯与轻打击乐由 Web Audio 实时合成。

## 状态

第一版实现包含确定性中文文字分析、四声部作曲、二维音序器、实时播放、文字同步高亮和 WAV 下载。
````

- [ ] **Step 3: Run the full automated verification from a clean dev server state**

Run: `npm run verify`

Expected: sample verification passes; all Vitest tests pass; the production build succeeds; 3 Chromium end-to-end tests pass; benchmark median is at or below 1000 ms.

- [ ] **Step 4: Run the Windows Edge release gate**

Run: `npm run test:e2e -- --project=edge`

Expected: 3 Edge end-to-end tests pass.

- [ ] **Step 5: Perform the short auditory acceptance check**

Run: `npm run dev -- --host 127.0.0.1 --port 4173`

In Chrome or Edge, generate “春风吹过山谷，星光落在河面。” and verify all of the following:

```text
- piano melody, string harmony, bass, and light percussion are audible
- the highlighted word changes with the melody
- clicking a word moves playback to its first melody event
- changing text leaves the old score visible and shows the dirty-state message
- the downloaded WAV opens and matches the page arrangement
- DevTools Network contains no request body with the source text
```

- [ ] **Step 6: Inspect repository state and commit the release-ready MVP**

Run: `git status --short`

Expected: only `README.md`, `package.json`, and `package-lock.json` are modified for this task; no logs, traces, downloaded archives, or environment files are untracked.

```bash
git add README.md package.json package-lock.json
git commit -m "docs: document verified browser MVP"
```

- [ ] **Step 7: Re-run the final verification after the documentation commit**

Run: `npm run verify`

Run: `git status --short --branch`

Expected: every automated check passes and Git reports a clean branch.
