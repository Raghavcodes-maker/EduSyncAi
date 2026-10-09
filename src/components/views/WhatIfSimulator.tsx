import { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  Clock,
  TrendingUp,
  TrendingDown,
  CalendarClock,
  Info,
  ArrowRight,
  Gauge,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import CircularProgress from '@/components/ui/CircularProgress';
import { useApp } from '@/context/AppContext';

interface SimParams {
  dailyHours: number;
  preparation: number;
  examDays: number;
}

export default function WhatIfSimulator() {
  const { subjects } = useApp();
  const primarySubject = subjects[0] ?? null;

  const [params, setParams] = useState<SimParams>({
    dailyHours: 4,
    preparation: primarySubject?.preparation ?? 60,
    examDays: primarySubject
      ? Math.ceil(
          (new Date(primarySubject.examDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      : 7,
  });

  const [selectedSubjectId, setSelectedSubjectId] = useState(
    primarySubject?.id ?? subjects[0]?.id ?? ''
  );

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? subjects[0];

  // Baseline (current state)
  const baseline = useMemo(() => {
    if (!selectedSubject) return { readiness: 0, totalHours: 0, topicsCoverable: 0 };
    const daysLeft = Math.ceil(
      (new Date(selectedSubject.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const totalHours = daysLeft * 3; // assume current 3h/day
    const topicsCoverable = Math.floor(totalHours / 3);
    const readiness = Math.min(95, selectedSubject.preparation + topicsCoverable * 5);
    return { readiness, totalHours, topicsCoverable };
  }, [selectedSubject]);

  // Simulated projection
  const projection = useMemo(() => {
    if (!selectedSubject) return { readiness: 0, totalHours: 0, topicsCoverable: 0, change: 0 };
    const totalHours = params.examDays * params.dailyHours;
    const topicsCoverable = Math.floor(totalHours / 2.5);
    const readiness = Math.min(98, params.preparation + topicsCoverable * 6);
    const change = readiness - baseline.readiness;
    return { readiness, totalHours, topicsCoverable, change };
  }, [params, selectedSubject, baseline]);

  // Simulated schedule preview
  const simulatedSchedule = useMemo(() => {
    const sessions: { day: string; subject: string; hours: number; topic: string; color: string }[] = [];
    const today = new Date();
    for (let i = 0; i < Math.min(params.examDays, 7); i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const hoursPerDay = params.dailyHours;
      const subject = selectedSubject;
      if (!subject) continue;
      const topicIdx = i % subject.pendingTopics.length;
      sessions.push({
        day: dayLabel,
        subject: subject.name,
        hours: hoursPerDay,
        topic: subject.pendingTopics[topicIdx] ?? 'Review session',
        color: subject.color,
      });
    }
    return sessions;
  }, [params, selectedSubject]);

  if (!selectedSubject) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-400">Add subjects to use the simulator.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/15 animate-fadeIn">
        <Info size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/80 leading-relaxed">
          This is a simulation tool. Projections are estimates based on your inputs and current
          preparation levels — they are not guaranteed predictions of exam outcomes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Controls */}
        <Card className="p-6 lg:col-span-1" delay={0}>
          <div className="flex items-center gap-2 mb-5">
            <SlidersHorizontal size={18} className="text-sky-400" />
            <h3 className="font-display font-semibold text-white text-base">Simulation Variables</h3>
          </div>

          {/* Subject selector */}
          <div className="mb-5">
            <label className="text-xs text-slate-400 mb-1.5 block">Subject</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                const s = subjects.find((sub) => sub.id === e.target.value);
                setSelectedSubjectId(e.target.value);
                if (s) {
                  const days = Math.ceil(
                    (new Date(s.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  setParams((p) => ({ ...p, preparation: s.preparation, examDays: Math.max(1, days) }));
                }
              }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-800">
                  {s.name} — {s.code}
                </option>
              ))}
            </select>
          </div>

          {/* Daily study hours */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock size={13} /> Daily Study Hours
              </label>
              <span className="font-display text-sm font-bold text-sky-400">
                {params.dailyHours}h
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              value={params.dailyHours}
              onChange={(e) => setParams({ ...params, dailyHours: parseInt(e.target.value) })}
              className="w-full"
              style={{
                background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${((params.dailyHours - 1) / 11) * 100}%, rgba(255,255,255,0.08) ${((params.dailyHours - 1) / 11) * 100}%, rgba(255,255,255,0.08) 100%)`,
                borderRadius: '3px',
                height: '6px',
              }}
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>1h</span>
              <span>12h</span>
            </div>
          </div>

          {/* Preparation percentage */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400 flex items-center gap-1.5">
                <Gauge size={13} /> Current Preparation
              </label>
              <span className="font-display text-sm font-bold text-emerald-400">
                {params.preparation}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={params.preparation}
              onChange={(e) => setParams({ ...params, preparation: parseInt(e.target.value) })}
              className="w-full"
              style={{
                background: `linear-gradient(to right, #34d399 0%, #34d399 ${params.preparation}%, rgba(255,255,255,0.08) ${params.preparation}%, rgba(255,255,255,0.08) 100%)`,
                borderRadius: '3px',
                height: '6px',
              }}
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Exam days */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400 flex items-center gap-1.5">
                <CalendarClock size={13} /> Days Until Exam
              </label>
              <span className="font-display text-sm font-bold text-amber-400">
                {params.examDays}d
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={60}
              value={params.examDays}
              onChange={(e) => setParams({ ...params, examDays: parseInt(e.target.value) })}
              className="w-full"
              style={{
                background: `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${((params.examDays - 1) / 59) * 100}%, rgba(255,255,255,0.08) ${((params.examDays - 1) / 59) * 100}%, rgba(255,255,255,0.08) 100%)`,
                borderRadius: '3px',
                height: '6px',
              }}
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>1d</span>
              <span>60d</span>
            </div>
          </div>

          {/* Quick presets */}
          <div className="pt-4 border-t border-white/6">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Quick Scenarios</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setParams({ dailyHours: 6, preparation: 40, examDays: 7 })}
                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-sky-500/15 hover:text-sky-400 transition-all border border-white/5"
              >
                Cram Mode
              </button>
              <button
                onClick={() => setParams({ dailyHours: 3, preparation: 70, examDays: 14 })}
                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-emerald-500/15 hover:text-emerald-400 transition-all border border-white/5"
              >
                Steady Pace
              </button>
              <button
                onClick={() => setParams({ dailyHours: 2, preparation: 85, examDays: 30 })}
                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-violet-500/15 hover:text-violet-400 transition-all border border-white/5"
              >
                Relaxed
              </button>
            </div>
          </div>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-5">
          {/* Before / After comparison */}
          <Card className="p-6" delay={80}>
            <h3 className="font-display font-semibold text-white text-base mb-5">
              Readiness Comparison
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-center">
              {/* Current */}
              <div className="flex flex-col items-center">
                <p className="text-xs text-slate-400 mb-3">Current State</p>
                <CircularProgress
                  value={baseline.readiness}
                  size="lg"
                  color="#64748b"
                  label="Now"
                />
                <div className="mt-3 space-y-1 text-center">
                  <p className="text-xs text-slate-400">
                    {baseline.totalHours}h total · {baseline.topicsCoverable} topics
                  </p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <div className="w-10 h-10 rounded-full glass flex items-center justify-center">
                  <ArrowRight size={18} className="text-sky-400" />
                </div>
              </div>

              {/* Simulated */}
              <div className="flex flex-col items-center">
                <p className="text-xs text-slate-400 mb-3">Simulated Outcome</p>
                <CircularProgress
                  value={projection.readiness}
                  size="lg"
                  color={projection.change >= 0 ? '#34d399' : '#f87171'}
                  label="Projected"
                />
                <div className="mt-3 space-y-1 text-center">
                  <p className="text-xs text-slate-400">
                    {projection.totalHours}h total · {projection.topicsCoverable} topics
                  </p>
                  <p
                    className={`text-sm font-bold flex items-center justify-center gap-1 ${
                      projection.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {projection.change >= 0 ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    )}
                    {projection.change >= 0 ? '+' : ''}
                    {projection.change}%
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Detailed metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4" delay={140}>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-sky-400" />
                <span className="text-xs text-slate-400">Total Study Time</span>
              </div>
              <p className="font-display text-2xl font-bold text-white">
                {projection.totalHours}h
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {params.dailyHours}h × {params.examDays} days
              </p>
            </Card>
            <Card className="p-4" delay={180}>
              <div className="flex items-center gap-2 mb-2">
                <Gauge size={16} className="text-emerald-400" />
                <span className="text-xs text-slate-400">Topics Coverable</span>
              </div>
              <p className="font-display text-2xl font-bold text-white">
                {projection.topicsCoverable}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                of {selectedSubject.pendingTopics.length} pending
              </p>
            </Card>
            <Card className="p-4" delay={220}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-amber-400" />
                <span className="text-xs text-slate-400">Projected Readiness</span>
              </div>
              <p className="font-display text-2xl font-bold text-white">
                {projection.readiness}%
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {projection.readiness >= 80
                  ? 'Exam ready'
                  : projection.readiness >= 60
                  ? 'Adequate'
                  : projection.readiness >= 40
                  ? 'At risk'
                  : 'Insufficient'}
              </p>
            </Card>
          </div>

          {/* Simulated schedule preview */}
          <Card className="p-6" delay={260}>
            <h3 className="font-display font-semibold text-white text-base mb-4">
              Adjusted Study Schedule
              <span className="text-xs font-normal text-slate-400 ml-2">
                (Simulated — first 7 days)
              </span>
            </h3>
            <div className="space-y-2">
              {simulatedSchedule.map((sess, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl card-surface animate-fadeInUp"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ backgroundColor: `${sess.color}15`, color: sess.color }}
                  >
                    {sess.day}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{sess.topic}</p>
                    <p className="text-[11px] text-slate-400">{sess.subject}</p>
                  </div>
                  <span className="text-xs text-slate-300 flex items-center gap-1 flex-shrink-0">
                    <Clock size={12} /> {sess.hours}h
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
