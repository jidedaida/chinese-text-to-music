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
