interface BarChartProps {
  data: { day: string; hours: number; target: number }[];
  color?: string;
}

export default function BarChart({ data, color = '#38bdf8' }: BarChartProps) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.hours, d.target)), 1);

  return (
    <div className="flex items-end justify-between gap-2 h-40 px-2">
      {data.map((d, i) => {
        const barH = (d.hours / maxVal) * 100;
        const targetH = (d.target / maxVal) * 100;
        const isOver = d.hours >= d.target;
        return (
          <div key={d.day} className="flex flex-col items-center gap-2 flex-1 h-full justify-end">
            <div className="relative w-full flex-1 flex items-end justify-center">
              <div
                className="absolute left-1/2 -translate-x-1/2 w-[70%] border-t border-dashed border-white/15 z-0"
                style={{ bottom: `${targetH}%` }}
              />
              <div
                className="relative w-[55%] rounded-t-md transition-all duration-700 ease-out group hover:opacity-80"
                style={{
                  height: `${barH}%`,
                  backgroundColor: isOver ? color : `${color}99`,
                  boxShadow: `0 0 12px ${color}30`,
                  animation: `fadeInUp 0.6s ease-out ${i * 80}ms both`,
                }}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {d.hours}h
                </span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}
