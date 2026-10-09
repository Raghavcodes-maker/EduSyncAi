import { useState, useEffect } from 'react';
import { Wand2, X, Check, AlertTriangle, Calendar, Clock, ArrowRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface FixMyWeekProps {
  open: boolean;
  onClose: () => void;
}

interface FixAction {
  id: string;
  icon: typeof Check;
  title: string;
  detail: string;
  impact: string;
  color: string;
}

export default function FixMyWeek({ open, onClose }: FixMyWeekProps) {
  const { subjects, sessions } = useApp();
  const [step, setStep] = useState<'analyzing' | 'result'>('analyzing');
  const [applied, setApplied] = useState(false);

  const criticalSubjects = subjects.filter((s) => s.status === 'Critical' || s.status === 'At Risk');
  const sortedByExam = [...subjects].sort((a, b) => {
    return new Date(a.examDate).getTime() - new Date(b.examDate).getTime();
  });

  const actions: FixAction[] = [
    {
      id: 'a1',
      icon: AlertTriangle,
      title: `Prioritized ${sortedByExam[0]?.name ?? 'critical subject'} — exam is closest`,
      detail: `Moved 2 hours from lower-priority sessions to ${sortedByExam[0]?.name ?? 'your most urgent subject'}. The next exam is only a few days away.`,
      impact: '+12% projected readiness',
      color: '#f87171',
    },
    {
      id: 'a2',
      icon: Calendar,
      title: `Filled Wednesday's gap with ${criticalSubjects[0]?.name ?? 'Physics'}`,
      detail: `Your Wednesday session was missed. EduSync rescheduled the pending topic into a free 2-hour slot on Wednesday afternoon.`,
      impact: '+1 session recovered',
      color: '#fbbf24',
    },
    {
      id: 'a3',
      icon: Clock,
      title: 'Rebalanced weekend load',
      detail: 'Saturday was over-loaded with 5 hours. Redistributed 1.5 hours to Sunday morning for better retention.',
      impact: 'Improved balance',
      color: '#34d399',
    },
    {
      id: 'a4',
      icon: Check,
      title: 'Added a 30-min review session before each exam',
      detail: 'A short recap session is now scheduled the morning of each exam to reinforce key concepts.',
      impact: 'Better recall',
      color: '#38bdf8',
    },
  ];

  useEffect(() => {
    if (open) {
      setStep('analyzing');
      setApplied(false);
      const timer = setTimeout(() => setStep('result'), 1800);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
          style={{ background: 'rgba(5, 7, 14, 0.75)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <div
            className="glass-strong rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto scrollbar-thin animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                  <Wand2 size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-white">Fix My Week</h3>
                  <p className="text-xs text-slate-400">AI-powered study optimization</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {step === 'analyzing' && (
              <div className="px-6 py-16 flex flex-col items-center">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full border-2 border-sky-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-400 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Wand2 size={24} className="text-sky-400" />
                  </div>
                </div>
                <p className="font-display text-white font-medium">Analyzing your week...</p>
                <p className="text-sm text-slate-400 mt-1">
                  Reviewing priorities, deadlines, and available time
                </p>
              </div>
            )}

            {step === 'result' && (
              <div className="px-6 py-5">
                <div className="card-surface rounded-xl p-4 mb-5 border border-sky-500/15">
                  <p className="text-sm text-slate-200">
                    EduSync has reorganized your upcoming study sessions based on{' '}
                    <span className="text-sky-400 font-medium">exam urgency</span>,{' '}
                    <span className="text-sky-400 font-medium">preparation gaps</span>, and{' '}
                    <span className="text-sky-400 font-medium">available time</span>. Here's what
                    changed:
                  </p>
                </div>

                <div className="space-y-3">
                  {actions.map((a, i) => {
                    const Icon = a.icon;
                    return (
                      <div
                        key={a.id}
                        className="card-surface rounded-xl p-4 flex gap-3 animate-fadeInUp"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${a.color}15` }}
                        >
                          <Icon size={18} style={{ color: a.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium text-white">{a.title}</h4>
                            <span
                              className="text-[11px] font-medium px-2 py-0.5 rounded-md flex-shrink-0"
                              style={{ backgroundColor: `${a.color}15`, color: a.color }}
                            >
                              {a.impact}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{a.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 p-4 rounded-xl bg-sky-500/8 border border-sky-500/15">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300">Projected readiness improvement</span>
                    <span className="font-display text-lg font-bold text-sky-400">+18%</span>
                  </div>
                  <div className="w-full h-2 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-1000"
                      style={{ width: '72%' }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Based on {sessions.length} sessions across {subjects.length} subjects.
                    Projections are estimates, not guaranteed outcomes.
                  </p>
                </div>

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => {
                      setApplied(true);
                      setTimeout(onClose, 800);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-sky-500 hover:bg-sky-400 transition-all active:scale-95"
                  >
                    {applied ? <Check size={16} /> : <ArrowRight size={16} />}
                    {applied ? 'Applied!' : 'Apply Changes'}
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 glass hover:bg-white/5 transition-all"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
