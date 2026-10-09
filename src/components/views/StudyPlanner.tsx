import { useState } from 'react';
import {
  CalendarDays,
  Clock,
  Wand2,
  CheckCircle2,
  Circle,
  Plus,
  ChevronRight,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { PriorityBadge } from '@/components/ui/Badges';
import { useApp } from '@/context/AppContext';
import type { StudySession } from '@/types';

function getWeekDays(): { label: string; date: string; isToday: boolean }[] {
  const today = new Date();
  const days: { label: string; date: string; isToday: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push({
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isToday: i === 0,
    });
  }
  return days;
}

function dayKeyFromSession(day: string): string {
  return day;
}

export default function StudyPlanner() {
  const { sessions, subjects, setSessions, toggleTask } = useApp();
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [availableHours, setAvailableHours] = useState(4);
  const weekDays = getWeekDays();

  const totalPlannedMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
  const totalPlannedHours = (totalPlannedMinutes / 60).toFixed(1);
  const availableWeeklyHours = availableHours * 7;

  const handleGenerate = () => {
    setGenerating(true);
    setGenerated(false);
    setTimeout(() => {
      // Demo logic: redistribute sessions by priority and available hours
      const sorted = [...sessions].sort((a, b) => {
        const priOrder: Record<'High' | 'Medium' | 'Low', number> = { High: 0, Medium: 1, Low: 2 };
        return priOrder[a.priority] - priOrder[b.priority];
      });

      let remainingMinutes = availableHours * 60 * 7;
      const adjusted: StudySession[] = sorted.map((s) => {
        if (remainingMinutes <= 0) return s;
        const boost = s.priority === 'High' ? 30 : s.priority === 'Medium' ? 15 : 0;
        const newDuration = Math.min(s.duration + boost, remainingMinutes);
        remainingMinutes -= newDuration;
        return { ...s, duration: newDuration };
      });

      setSessions(adjusted);
      setGenerating(false);
      setGenerated(true);
      setTimeout(() => setGenerated(false), 3000);
    }, 1800);
  };

  const sessionsByDay = weekDays.map((day) => {
    const daySessions = sessions.filter((s) => {
      const sessDate = new Date(s.day);
      const today = new Date();
      const dayDate = new Date(today);
      const dayIdx = weekDays.indexOf(day);
      dayDate.setDate(dayDate.getDate() + dayIdx);
      return (
        sessDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) ===
        dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      );
    });
    return { ...day, sessions: daySessions };
  });

  return (
    <div className="space-y-5">
      {/* Planner controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5" delay={0}>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={18} className="text-sky-400" />
            <h3 className="font-display font-semibold text-white text-sm">Available Study Hours</h3>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-display text-3xl font-bold text-white">{availableHours}</span>
            <span className="text-sm text-slate-400">hours / day</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={availableHours}
            onChange={(e) => setAvailableHours(parseInt(e.target.value))}
            className="w-full"
            style={{
              background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${((availableHours - 1) / 9) * 100}%, rgba(255,255,255,0.08) ${((availableHours - 1) / 9) * 100}%, rgba(255,255,255,0.08) 100%)`,
              borderRadius: '3px',
              height: '6px',
            }}
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>1h</span>
            <span>10h</span>
          </div>
        </Card>

        <Card className="p-5" delay={60}>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={18} className="text-emerald-400" />
            <h3 className="font-display font-semibold text-white text-sm">Planned Sessions</h3>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-display text-3xl font-bold text-white">{sessions.length}</span>
            <span className="text-sm text-slate-400">sessions this week</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Total planned</span>
              <span className="text-white font-medium">{totalPlannedHours}h</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Available capacity</span>
              <span className="text-white font-medium">{availableWeeklyHours}h</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Utilization</span>
              <span className="text-emerald-400 font-medium">
                {Math.round((parseFloat(totalPlannedHours) / availableWeeklyHours) * 100)}%
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between" delay={120}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wand2 size={18} className="text-violet-400" />
              <h3 className="font-display font-semibold text-white text-sm">AI Plan Generator</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Generate an optimized study plan based on your priorities, deadlines, and available
              time.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<Wand2 size={16} />}
            onClick={handleGenerate}
            disabled={generating}
            className="w-full"
          >
            {generating ? 'Generating...' : generated ? 'Plan Generated!' : 'Generate My Plan'}
          </Button>
        </Card>
      </div>

      {/* Weekly schedule */}
      <Card className="p-6" delay={180}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold text-white text-base">This Week's Schedule</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> High Priority
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Medium
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Low
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {sessionsByDay.slice(0, 7).map((day, di) => (
            <div key={di} className="min-w-0">
              <div
                className={`flex items-center gap-2 mb-3 pb-2 border-b ${
                  day.isToday ? 'border-sky-500/30' : 'border-white/6'
                }`}
              >
                <div>
                  <p
                    className={`text-sm font-medium ${
                      day.isToday ? 'text-sky-400' : 'text-white'
                    }`}
                  >
                    {day.label}
                  </p>
                  <p className="text-[10px] text-slate-400">{day.date}</p>
                </div>
                {day.isToday && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 font-medium">
                    Today
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {day.sessions.length === 0 && (
                  <div className="text-center py-6">
                    <Circle size={20} className="mx-auto text-slate-600 mb-1" />
                    <p className="text-[11px] text-slate-500">No sessions</p>
                  </div>
                )}
                {day.sessions.map((sess) => {
                  const dotColor =
                    sess.priority === 'High'
                      ? '#f87171'
                      : sess.priority === 'Medium'
                      ? '#fbbf24'
                      : '#94a3b8';
                  return (
                    <div
                      key={sess.id}
                      className="card-surface rounded-xl p-3 group transition-all hover:bg-white/5 cursor-pointer animate-fadeInUp"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: dotColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span
                              className="text-[11px] font-medium"
                              style={{ color: sess.color }}
                            >
                              {sess.subjectName}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-snug">{sess.topic}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock size={10} /> {sess.startTime}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              · {Math.floor(sess.duration / 60)}h {sess.duration % 60}m
                            </span>
                            <PriorityBadge priority={sess.priority} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
