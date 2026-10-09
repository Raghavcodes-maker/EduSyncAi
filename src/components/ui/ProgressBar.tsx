interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: string;
  showLabel?: boolean;
  animated?: boolean;
}

export default function ProgressBar({
  value,
  max = 100,
  color = '#38bdf8',
  height = 'h-2',
  showLabel = false,
  animated = true,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full">
      <div className={`w-full ${height} bg-white/8 rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full ${animated ? 'transition-all duration-700 ease-out' : ''}`}
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-xs text-slate-400 text-right">{Math.round(pct)}%</div>
      )}
    </div>
  );
}
