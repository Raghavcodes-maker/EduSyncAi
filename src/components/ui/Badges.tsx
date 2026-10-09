import type { Difficulty, SubjectStatus } from '@/types';

export function StatusBadge({ status }: { status: SubjectStatus }) {
  const config: Record<SubjectStatus, string> = {
    'On Track': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'At Risk': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Critical: 'bg-red-500/15 text-red-400 border-red-500/30',
    Completed: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${config[status]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse-soft" />
      {status}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const config: Record<Difficulty, string> = {
    Easy: 'bg-emerald-500/10 text-emerald-400',
    Moderate: 'bg-amber-500/10 text-amber-400',
    Hard: 'bg-red-500/10 text-red-400',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${config[difficulty]}`}
    >
      {difficulty}
    </span>
  );
}

export function PriorityBadge({
  priority,
}: {
  priority: 'High' | 'Medium' | 'Low';
}) {
  const config = {
    High: 'bg-red-500/15 text-red-400 border-red-500/25',
    Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    Low: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${config[priority]}`}
    >
      {priority}
    </span>
  );
}
