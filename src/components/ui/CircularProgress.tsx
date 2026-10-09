interface StatBadgeProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  color?: string;
}

const sizes = {
  sm: { box: 'w-16 h-16', stroke: 6, text: 'text-sm' },
  md: { box: 'w-24 h-24', stroke: 7, text: 'text-lg' },
  lg: { box: 'w-32 h-32', stroke: 8, text: 'text-2xl' },
};

export default function CircularProgress({
  value,
  size = 'md',
  label,
  color = '#38bdf8',
}: StatBadgeProps) {
  const s = sizes[size];
  // SVG viewBox is 100x100, so radius must be relative to 50px center with padding for strokeWidth
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className={`relative ${s.box} flex items-center justify-center`}>
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={s.stroke}
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={s.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1s ease-out',
            filter: `drop-shadow(0 0 4px ${color}60)`,
          }}
        />
      </svg>
      <div className="flex flex-col items-center">
        <span className={`font-display font-bold text-white ${s.text}`}>
          {Math.round(value)}%
        </span>
        {label && <span className="text-[10px] text-slate-400 mt-0.5">{label}</span>}
      </div>
    </div>
  );
}
