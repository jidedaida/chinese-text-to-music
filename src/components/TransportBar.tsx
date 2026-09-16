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
