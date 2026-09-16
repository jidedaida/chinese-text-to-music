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
