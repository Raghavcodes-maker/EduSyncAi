import { useState } from 'react';
import {
  Activity,
  BookOpen,
  CalendarClock,
  TrendingUp,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Wand2,
  Target,
  Flame,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';
import BarChart from '@/components/ui/BarChart';
import { StatusBadge } from '@/components/ui/Badges';
import { useApp, getProfileSubtitle } from '@/context/AppContext';
import { weeklyStudyData } from '@/demoData';
import type { ViewKey, ExamItem } from '@/types';
import PomodoroFocusTimer from '@/components/PomodoroFocusTimer';

interface DashboardProps {
  onNavigate: (v: ViewKey) => void;
  onFixMyWeek: () => void;
}

export default function Dashboard({ onNavigate, onFixMyWeek }: DashboardProps) {
  const { profile, subjects, tasks, toggleTask, deepWorkSessions, setActiveFocusTask } = useApp();
  const [fixHover, setFixHover] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayDeepWorkMinutes = deepWorkSessions
    .filter((s) => s.completedAt.startsWith(todayStr))
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  const avgPrep = subjects.length > 0
    ? Math.round(subjects.reduce((sum, s) => sum + s.preparation, 0) / subjects.length)
    : 0;
  const academicHealth = subjects.length > 0 ? Math.min(100, Math.round(avgPrep * 0.6 + 30)) : 0;
  const totalStudyHours = weeklyStudyData.reduce((sum, d) => sum + d.hours, 0);
  const targetHours = weeklyStudyData.reduce((sum, d) => sum + d.target, 0);
  const tasksDone = tasks.filter((t) => t.done).length;

  // Derive upcoming exams from subjects
  const upcomingExams: ExamItem[] = subjects
    .map((s) => {
      const daysUntil = Math.max(0, Math.ceil(
        (new Date(s.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ));
      return {
        id: `exam_${s.id}`,
        subjectName: s.name,
        subjectCode: s.code,
        date: s.examDate,
        daysUntil,
        color: s.color,
        preparation: s.preparation,
      };
    })
    .filter((e) => e.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 3);

  // Derive priorities from subjects
  const academicPriorities = subjects
    .map((s) => {
      const daysUntil = Math.max(0, Math.ceil(
        (new Date(s.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ));
      const level = s.status === 'Critical' ? 'Critical' : s.status === 'At Risk' ? 'High' : daysUntil <= 7 ? 'Medium' : null;
      if (!level) return null;
      return {
        id: `prio_${s.id}`,
        label: `${s.name} ${s.status === 'Critical' ? 'needs urgent attention' : `exam in ${daysUntil} days`} — ${s.preparation}% prepared, ${s.pendingTopics.length} topics pending`,
        level,
        subjectColor: s.color,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => {
      const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2 };
      return order[a.level] - order[b.level];
    })
    .slice(0, 3);

  if (!profile) return null;

  return (
    <div className="space-y-6">
      {/* Hero row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Academic Health */}
        <Card className="p-6 lg:col-span-1 flex flex-col justify-between" delay={0}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-sky-400" />
                <h3 className="font-display font-semibold text-white text-sm tracking-wide uppercase">
                  Academic Health
                </h3>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  academicHealth >= 70
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : academicHealth >= 50
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}
              >
                {academicHealth >= 70 ? 'Strong' : academicHealth >= 50 ? 'Moderate' : 'Needs Attention'}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-4">
              <div className="flex items-baseline gap-1 my-1">
                <span className="font-display text-5xl font-extrabold text-white tracking-tight">
                  {Math.round(academicHealth)}
                </span>
                <span className="text-3xl font-bold text-sky-400">%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Overall Academic Score</p>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-2.5 mt-5 overflow-hidden border border-slate-700/60">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    academicHealth >= 70
                      ? 'bg-emerald-400'
                      : academicHealth >= 50
                      ? 'bg-amber-400'
                      : 'bg-red-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, academicHealth))}%` }}
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-2 text-center leading-relaxed">
            Based on preparation, deadlines, and study consistency across {subjects.length} subjects
          </p>
        </Card>

        {/* Fix My Week CTA + Quick Stats */}
        <Card className="p-6 lg:col-span-2 flex flex-col" delay={80}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-slate-400 text-sm">Welcome back,</p>
              <h2 className="font-display text-2xl font-bold text-white">{profile.name}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {getProfileSubtitle(profile)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Avg Preparation</p>
              <p className="font-display text-2xl font-bold text-emerald-400">{avgPrep}%</p>
            </div>
          </div>

          <button
            onClick={onFixMyWeek}
            onMouseEnter={() => setFixHover(true)}
            onMouseLeave={() => setFixHover(false)}
            className="group relative w-full overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(56,189,248,0.12) 0%, rgba(34,211,238,0.06) 100%)',
              border: '1px solid rgba(56,189,248,0.2)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/25 transition-transform group-hover:scale-110">
                  <Wand2 size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-lg">Fix My Week</h3>
                  <p className="text-sm text-slate-300">
                    Let EduSync reorganize your study sessions automatically
                  </p>
                </div>
              </div>
              <ChevronRight
                size={22}
                className={`text-sky-400 transition-transform duration-300 ${fixHover ? 'translate-x-1' : ''}`}
              />
            </div>
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
            <button
              onClick={() => onNavigate('syllabus')}
              className="card-surface hover:bg-sky-500/10 hover:border-sky-500/30 border border-white/6 rounded-xl p-3 text-center transition-all cursor-pointer group"
            >
              <p className="font-display text-sm font-semibold text-white group-hover:text-sky-300">Syllabus</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Track &amp; Progress</p>
            </button>
            <button
              onClick={() => onNavigate('quiz')}
              className="card-surface hover:bg-purple-500/10 hover:border-purple-500/30 border border-white/6 rounded-xl p-3 text-center transition-all cursor-pointer group"
            >
              <p className="font-display text-sm font-semibold text-white group-hover:text-purple-300">Practice Quiz</p>
              <p className="text-[10px] text-slate-400 mt-0.5">AI Questions</p>
            </button>
            <button
              onClick={() => {
                document.getElementById('pomodoro-timer-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="card-surface hover:bg-amber-500/10 hover:border-amber-500/30 border border-white/6 rounded-xl p-3 text-center transition-all cursor-pointer group"
            >
              <p className="font-display text-sm font-semibold text-white group-hover:text-amber-300 flex items-center justify-center gap-1">
                <Flame size={14} className="text-amber-400" />
                {todayDeepWorkMinutes}m
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Deep Work Today</p>
            </button>
            <div className="card-surface rounded-xl p-3 text-center">
              <p className="font-display text-sm font-bold text-white">
                {tasksDone}/{tasks.length}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Tasks Done</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Subject Status Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-white text-base">Subject Status</h3>
          <button
            onClick={() => onNavigate('subjects')}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
          >
            View all <ChevronRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.slice(0, 6).map((s, i) => {
            const daysLeft = Math.ceil(
              (new Date(s.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return (
              <Card
                key={s.id}
                hover
                delay={i * 60}
                className="p-5 cursor-pointer"
                onClick={() => onNavigate('subjects')}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${s.color}15` }}
                    >
                      <BookOpen size={18} style={{ color: s.color }} />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{s.name}</p>
                      <p className="text-[11px] text-slate-400">{s.code}</p>
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Preparation</span>
                    <span className="font-medium text-white">{s.preparation}%</span>
                  </div>
                  <ProgressBar value={s.preparation} color={s.color} height="h-1.5" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <CalendarClock size={12} /> {daysLeft}d left
                  </span>
                  <span className="text-slate-400">{s.pendingTopics.length} topics pending</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Pomodoro Focus & Deep Work Timer */}
      <div id="pomodoro-timer-section">
        <PomodoroFocusTimer onNavigateToSubjects={() => onNavigate('subjects')} />
      </div>

      {/* Today's Tasks + Weekly Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's Tasks */}
        <Card className="p-6" delay={120}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-sky-400" />
              <h3 className="font-display font-semibold text-white text-base">Today's Study Tasks</h3>
            </div>
            <span className="text-xs text-slate-400">
              {tasksDone} of {tasks.length} done
            </span>
          </div>
          <div className="space-y-2">
            {tasks.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6">No tasks yet. Add subjects to generate tasks.</p>
            )}
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-xl card-surface group transition-all hover:bg-white/5"
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                    task.done
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : 'border-white/20 hover:border-sky-400'
                  }`}
                >
                  {task.done && <CheckCircle2 size={14} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      task.done ? 'text-slate-500 line-through' : 'text-slate-200'
                    }`}
                  >
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] flex items-center gap-1" style={{ color: task.color }}>
                      {task.subjectName}
                    </span>
                    <span className="text-[11px] text-slate-500">· {task.duration}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveFocusTask({
                      subjectName: task.subjectName,
                      topic: task.title,
                    });
                    document.getElementById('pomodoro-timer-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-2 py-1 rounded-lg text-[10px] font-semibold text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  title="Focus on this task in the Pomodoro Timer"
                >
                  <Flame size={11} className="text-amber-400" />
                  <span>Focus</span>
                </button>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                    task.priority === 'High'
                      ? 'bg-red-500/15 text-red-400'
                      : task.priority === 'Medium'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-sky-500/15 text-sky-400'
                  }`}
                >
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Weekly Progress */}
        <Card className="p-6" delay={180}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" />
              <h3 className="font-display font-semibold text-white text-base">Weekly Study Progress</h3>
            </div>
            <span className="text-xs text-slate-400">
              {totalStudyHours}h / {targetHours}h target
            </span>
          </div>
          <BarChart data={weeklyStudyData} color="#38bdf8" />
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-sky-400" />
              <span className="text-xs text-slate-400">Hours studied</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 border-t border-dashed border-white/30" />
              <span className="text-xs text-slate-400">Daily target</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">
                {Math.round((totalStudyHours / targetHours) * 100)}% of target
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Exams + Priorities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upcoming Exams */}
        <Card className="p-6" delay={220}>
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock size={18} className="text-amber-400" />
            <h3 className="font-display font-semibold text-white text-base">Upcoming Exams</h3>
          </div>
          <div className="space-y-3">
            {upcomingExams.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6">No exams in the next 30 days.</p>
            )}
            {upcomingExams.map((exam) => (
              <div key={exam.id} className="flex items-center gap-4 p-3 rounded-xl card-surface">
                <div
                  className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${exam.color}12` }}
                >
                  <span className="font-display text-lg font-bold" style={{ color: exam.color }}>
                    {exam.daysUntil}
                  </span>
                  <span className="text-[9px] text-slate-400">days</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{exam.subjectName}</p>
                  <p className="text-[11px] text-slate-400">{exam.subjectCode}</p>
                  <div className="mt-1.5">
                    <ProgressBar value={exam.preparation} color={exam.color} height="h-1" />
                  </div>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{exam.preparation}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Academic Priorities */}
        <Card className="p-6" delay={280}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-red-400" />
            <h3 className="font-display font-semibold text-white text-base">Academic Priorities</h3>
          </div>
          <div className="space-y-3">
            {academicPriorities.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6">All subjects are on track. Great work!</p>
            )}
            {academicPriorities.map((p) => (
              <div key={p.id} className="flex items-start gap-3 p-3 rounded-xl card-surface">
                <span
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 animate-pulse-soft"
                  style={{ backgroundColor: p.subjectColor }}
                />
                <p className="text-sm text-slate-200 leading-relaxed flex-1">{p.label}</p>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium flex-shrink-0 ${
                    p.level === 'Critical'
                      ? 'bg-red-500/15 text-red-400'
                      : p.level === 'High'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-sky-500/15 text-sky-400'
                  }`}
                >
                  {p.level}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={onFixMyWeek}
            className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-sky-400 bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/20 transition-all active:scale-95"
          >
            <Wand2 size={16} />
            Auto-resolve with Fix My Week
          </button>
        </Card>
      </div>

      {/* Founder Credit */}
      <footer className="pt-10 pb-6 mt-12 border-t border-white/6 text-center">
        <p className="text-xs sm:text-sm text-slate-400 font-medium tracking-wide">
          Created &amp; Founded by{' '}
          <span className="text-slate-200 font-semibold hover:text-sky-400 transition-colors">
            Raghav Sharma
          </span>
        </p>
        <p className="text-[11px] text-slate-500 mt-1.5 tracking-normal">
          EduSync AI &bull; Intelligent Academic Workspace
        </p>
      </footer>
    </div>
  );
}
