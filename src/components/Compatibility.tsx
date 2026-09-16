export function Compatibility() {
  const supported = typeof AudioContext !== 'undefined' && typeof OfflineAudioContext !== 'undefined';
  return (
    <div className="compatibility" hidden={supported} role="status">
      当前浏览器缺少完整 Web Audio 支持。请使用桌面版 Chrome 或 Edge。
    </div>
  );
}
