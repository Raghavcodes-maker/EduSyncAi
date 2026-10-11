import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Flame,
  BookOpen,
  Coffee,
  Plus,
  History,
  Timer,
  ChevronDown,
  Layers,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useApp } from '@/context/AppContext';
import type { FocusMode } from '@/types';

interface PomodoroFocusTimerProps {
  className?: string;
  onNavigateToSubjects?: () => void;
}

// Preset durations in minutes
const PRESETS: Record<FocusMode, number[]> = {
  pomodoro: [25, 45, 50, 60],
  shortBreak: [3, 5, 10],
  longBreak: [10, 15, 20, 30],
};

const MODE_LABELS: Record<FocusMode, { title: string; subtitle: string; icon: typeof Timer; color: string }> = {
  pomodoro: {
    title: 'Deep Work',
    subtitle: 'Zero distractions, pure focus',
    icon: Flame,
    color: '#38bdf8', // sky-400
  },
  shortBreak: {
    title: 'Short Break',
    subtitle: 'Stretch, breathe, hydrate',
    icon: Coffee,
    color: '#34d399', // emerald-400
  },
  longBreak: {
    title: 'Long Break',
    subtitle: 'Step away and recharge fully',
    icon: Layers,
    color: '#a78bfa', // purple-400
  },
};

function playChime(enabled: boolean) {
  if (!enabled) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 1.2);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.16); // A5
    gain2.gain.setValueAtTime(0.3, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.16);
    osc2.stop(now + 1.5);
  } catch {
    // Non-blocking fallback
  }
}

export default function PomodoroFocusTimer({ className = '', onNavigateToSubjects }: PomodoroFocusTimerProps) {
  const {
    subjects,
    deepWorkSessions,
    logDeepWorkSession,
    activeFocusTask,
  } = useApp();

  // Mode and durations
  const [mode, setMode] = useState<FocusMode>('pomodoro');
  const [targetDurationMinutes, setTargetDurationMinutes] = useState(25);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [completedCountInCycle, setCompletedCountInCycle] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);

  // Focus topic & subject tagging
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => subjects[0]?.id || '');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [sessionToast, setSessionToast] = useState<{ message: string; duration: number } | null>(null);

  // Sync when activeFocusTask is received from outside (e.g. clicking "Focus" on Today's Tasks)
  useEffect(() => {
    if (activeFocusTask) {
      if (activeFocusTask.subjectName) {
        const found = subjects.find((s) => s.name.toLowerCase() === activeFocusTask.subjectName?.toLowerCase());
        if (found) {
          setSelectedSubjectId(found.id);
        }
      }
      if (activeFocusTask.topic) {
        setCustomTopic(activeFocusTask.topic);
      }
      // If timer is not already running, switch to pomodoro
      if (!isRunning) {
        setMode('pomodoro');
        setTargetDurationMinutes(25);
        setSecondsRemaining(25 * 60);
      }
    }
  }, [activeFocusTask, subjects, isRunning]);

  // Keep selectedSubject in sync if subjects list changes
  const activeSubject = useMemo(() => {
    return subjects.find((s) => s.id === selectedSubjectId) || subjects[0] || null;
  }, [subjects, selectedSubjectId]);

  // When interval completes naturally
  const handleIntervalComplete = () => {
    setIsRunning(false);
    playChime(soundEnabled);

    if (mode === 'pomodoro') {
      const minutesLogged = targetDurationMinutes;
      const topicLogged = customTopic.trim() || activeSubject?.pendingTopics[0] || 'Deep Work Study Session';

      logDeepWorkSession({
        durationMinutes: minutesLogged,
        mode: 'pomodoro',
        subjectId: activeSubject?.id,
        subjectName: activeSubject?.name,
        topic: topicLogged,
        color: activeSubject?.color || '#38bdf8',
      });

      const nextCycle = completedCountInCycle + 1;
      setCompletedCountInCycle(nextCycle);

      setSessionToast({
        message: `Awesome focus! ${minutesLogged}m deep work logged for ${activeSubject?.name || 'Study'}.`,
        duration: minutesLogged,
      });

      // Transition to break
      if (nextCycle % 4 === 0) {
        // Long break after 4 pomodoros
        switchMode('longBreak', 15);
      } else {
        // Short break
        switchMode('shortBreak', 5);
      }
    } else {
      // Break completed -> back to Pomodoro
      setSessionToast({
        message: 'Break complete! Ready for your next deep work interval.',
        duration: 0,
      });
      switchMode('pomodoro', 25);
    }
  };

  const handleIntervalCompleteRef = useRef(handleIntervalComplete);
  useEffect(() => {
    handleIntervalCompleteRef.current = handleIntervalComplete;
  });

  // Handle timer countdown
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            // Interval finished!
            handleIntervalCompleteRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // Switch mode helper
  const switchMode = (newMode: FocusMode, defaultMinutes?: number) => {
    setIsRunning(false);
    setMode(newMode);
    const mins = defaultMinutes ?? (newMode === 'pomodoro' ? 25 : newMode === 'shortBreak' ? 5 : 15);
    setTargetDurationMinutes(mins);
    setSecondsRemaining(mins * 60);
  };

  // Set preset duration
  const handleSelectPreset = (mins: number) => {
    setIsRunning(false);
    setTargetDurationMinutes(mins);
    setSecondsRemaining(mins * 60);
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    setIsRunning((prev) => !prev);
  };

  // Reset current interval
  const handleReset = () => {
    setIsRunning(false);
    setSecondsRemaining(targetDurationMinutes * 60);
  };

  // Add 5 minutes to current interval
  const handleAddFiveMinutes = () => {
    setSecondsRemaining((prev) => prev + 5 * 60);
    setTargetDurationMinutes((prev) => prev + 5);
  };

  // Manually finish / log early
  const handleFinishEarly = () => {
    const elapsedSeconds = targetDurationMinutes * 60 - secondsRemaining;
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

    if (mode === 'pomodoro' && elapsedMinutes >= 1) {
      logDeepWorkSession({
        durationMinutes: elapsedMinutes,
        mode: 'pomodoro',
        subjectId: activeSubject?.id,
        subjectName: activeSubject?.name,
        topic: customTopic.trim() || activeSubject?.pendingTopics[0] || 'Deep Work Study Session',
        color: activeSubject?.color || '#38bdf8',
      });
      setSessionToast({
        message: `Great progress! ${elapsedMinutes}m logged early.`,
        duration: elapsedMinutes,
      });
      setCompletedCountInCycle((prev) => prev + 1);
    }

    handleReset();
  };

  // Compute daily metrics from sessions
  const todaySessions = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return deepWorkSessions.filter((s) => s.completedAt.startsWith(todayStr));
  }, [deepWorkSessions]);

  const todayMinutes = useMemo(() => {
    return todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  }, [todaySessions]);

  const todayPomodoros = useMemo(() => {
    return todaySessions.filter((s) => s.mode === 'pomodoro').length;
  }, [todaySessions]);

  // Format time display
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Percentage for circular ring
  const totalSeconds = targetDurationMinutes * 60;
  const progressPct = Math.min(100, Math.max(0, ((totalSeconds - secondsRemaining) / totalSeconds) * 100));

  // Circular SVG dimensions
  const radius = 64;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  const currentModeInfo = MODE_LABELS[mode];
  const themeColor = mode === 'pomodoro' ? (activeSubject?.color || currentModeInfo.color) : currentModeInfo.color;

  return (
    <>
      <Card className={`p-6 relative overflow-hidden ${className}`}>
        {/* Subtle Ambient Background Glow */}
        <div
          className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-15 pointer-events-none transition-all duration-700"
          style={{ backgroundColor: themeColor }}
        />

        {/* Top Header */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 shadow-lg"
              style={{
                backgroundColor: `${themeColor}20`,
                boxShadow: `0 0 16px ${themeColor}25`,
              }}
            >
              <currentModeInfo.icon size={18} style={{ color: themeColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-white text-base">Pomodoro Focus Timer</h3>
                <span
                  className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border tracking-wide"
                  style={{
                    backgroundColor: `${themeColor}15`,
                    borderColor: `${themeColor}35`,
                    color: themeColor,
                  }}
                >
                  {currentModeInfo.title}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{currentModeInfo.subtitle}</p>
            </div>
          </div>

          {/* Quick Action Icons */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-2 rounded-lg hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title={soundEnabled ? 'Chime sound enabled' : 'Muted'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-slate-500" />}
            </button>
            <button
              onClick={() => setIsZenMode(true)}
              className="p-2 rounded-lg hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Fullscreen Zen Focus Mode"
            >
              <Maximize2 size={16} />
            </button>
            <button
              onClick={() => setShowHistoryModal(true)}
              className="p-2 rounded-lg hover:text-white hover:bg-white/5 transition-colors cursor-pointer relative"
              title="View Deep Work Log"
            >
              <History size={16} />
              {todaySessions.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-sky-400" />
              )}
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900/80 border border-white/6 rounded-xl mb-5">
          {(['pomodoro', 'shortBreak', 'longBreak'] as FocusMode[]).map((m) => {
            const isSelected = mode === m;
            const info = MODE_LABELS[m];
            return (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'bg-white/10 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <info.icon size={13} style={{ color: isSelected ? info.color : 'inherit' }} />
                <span>{m === 'pomodoro' ? 'Deep Work' : m === 'shortBreak' ? 'Short Break' : 'Long Break'}</span>
              </button>
            );
          })}
        </div>

        {/* Center Timer Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Radial Countdown Circle */}
          <div className="md:col-span-6 flex flex-col items-center justify-center py-2">
            <div className="relative w-44 h-44 flex items-center justify-center">
              {/* Outer SVG ring */}
              <svg height={radius * 2 + 16} width={radius * 2 + 16} className="-rotate-90 transform">
                {/* Background track */}
                <circle
                  stroke="rgba(255, 255, 255, 0.07)"
                  fill="transparent"
                  strokeWidth={stroke}
                  r={normalizedRadius}
                  cx={radius + 8}
                  cy={radius + 8}
                />
                {/* Progress bar */}
                <circle
                  stroke={themeColor}
                  fill="transparent"
                  strokeWidth={stroke}
                  strokeDasharray={`${circumference} ${circumference}`}
                  style={{
                    strokeDashoffset,
                    transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.4s ease',
                  }}
                  strokeLinecap="round"
                  r={normalizedRadius}
                  cx={radius + 8}
                  cy={radius + 8}
                />
              </svg>

              {/* Time display in center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                <span className="font-mono text-4xl font-extrabold text-white tracking-tight">
                  {timeFormatted}
                </span>
                <span className="text-[11px] font-medium text-slate-400 mt-1 flex items-center gap-1">
                  {isRunning ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Session In Progress
                    </span>
                  ) : secondsRemaining === totalSeconds ? (
                    'Ready to Start'
                  ) : (
                    'Paused'
                  )}
                </span>
              </div>
            </div>

            {/* Quick Preset Duration Buttons */}
            <div className="flex items-center gap-1.5 mt-4">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-1">Time:</span>
              {PRESETS[mode].map((mins) => {
                const isActive = targetDurationMinutes === mins;
                return (
                  <button
                    key={mins}
                    onClick={() => handleSelectPreset(mins)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {mins}m
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls & Focus Context Settings */}
          <div className="md:col-span-6 space-y-4">
            {/* Subject & Topic Tagging */}
            {mode === 'pomodoro' && (
              <div className="space-y-2.5 p-3.5 rounded-xl card-surface border border-white/6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                      <BookOpen size={12} className="text-sky-400" /> Focus Subject
                    </label>
                    {onNavigateToSubjects && (
                      <button
                        onClick={onNavigateToSubjects}
                        className="text-[10px] text-sky-400 hover:text-sky-300"
                      >
                        Manage
                      </button>
                    )}
                  </div>
                  {subjects.length > 0 ? (
                    <div className="relative">
                      <select
                        value={selectedSubjectId}
                        onChange={(e) => {
                          setSelectedSubjectId(e.target.value);
                          const sub = subjects.find((s) => s.id === e.target.value);
                          if (sub && sub.pendingTopics.length > 0) {
                            setCustomTopic(sub.pendingTopics[0]);
                          }
                        }}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 pr-7 appearance-none cursor-pointer"
                      >
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code}) · {s.preparation}%
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No subjects added yet.</p>
                  )}
                </div>

                {/* Specific Topic / Goal */}
                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">
                    Target Topic / Task Goal
                  </label>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder={activeSubject?.pendingTopics[0] || 'e.g., Solving Differential Equations'}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  {activeSubject && activeSubject.pendingTopics.length > 0 && !customTopic && (
                    <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto pb-0.5">
                      <span className="text-[10px] text-slate-500 shrink-0">Quick topic:</span>
                      {activeSubject.pendingTopics.slice(0, 2).map((tp) => (
                        <button
                          key={tp}
                          type="button"
                          onClick={() => setCustomTopic(tp)}
                          className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 shrink-0 cursor-pointer"
                        >
                          {tp}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Break Mode Tips */}
            {mode !== 'pomodoro' && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5 text-emerald-200">
                  <Coffee size={14} /> Break Time Habit
                </p>
                <p className="text-[11px] leading-relaxed text-emerald-300/90">
                  Look away from your screen (20-20-20 rule), hydrate, and take deep breaths. Your brain consolidates short-term memory during physical breaks!
                </p>
              </div>
            )}

            {/* Main Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant={isRunning ? 'secondary' : 'primary'}
                onClick={togglePlayPause}
                className="flex-1 justify-center py-2.5 text-sm font-semibold cursor-pointer"
                icon={isRunning ? <Pause size={16} /> : <Play size={16} className="fill-current" />}
              >
                {isRunning ? 'Pause Timer' : 'Start Focus'}
              </Button>

              <button
                onClick={handleReset}
                className="p-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                title="Reset timer to beginning"
              >
                <RotateCcw size={16} />
              </button>

              <button
                onClick={handleAddFiveMinutes}
                className="px-2.5 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer flex items-center gap-1"
                title="Add 5 minutes to current session"
              >
                <Plus size={13} />
                <span>5m</span>
              </button>

              {isRunning && (
                <button
                  onClick={handleFinishEarly}
                  className="p-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all cursor-pointer"
                  title="Finish & log deep work session early"
                >
                  <SkipForward size={16} />
                </button>
              )}
            </div>

            {/* Cycle Tomatoes & Daily Stats */}
            <div className="flex items-center justify-between pt-2 border-t border-white/6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]">Cycle:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((step) => {
                    const completed = (completedCountInCycle % 4) >= step || (completedCountInCycle > 0 && completedCountInCycle % 4 === 0);
                    return (
                      <span
                        key={step}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          completed ? 'bg-sky-400 shadow-sm shadow-sky-400/50' : 'bg-white/10'
                        }`}
                        title={`Pomodoro ${step} of 4`}
                      />
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-500 ml-1">
                  ({(completedCountInCycle % 4 === 0 ? 4 : 4 - (completedCountInCycle % 4))} until long break)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-slate-300 font-medium">
                  <Flame size={13} className="text-amber-400" />
                  {todayMinutes}m today
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300 font-medium">
                  {todayPomodoros} sessions
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Toast Notification */}
        {sessionToast && (
          <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-sky-500/15 to-emerald-500/15 border border-sky-500/30 flex items-center justify-between animate-fadeIn text-xs text-white">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-sky-400 shrink-0" />
              <span>{sessionToast.message}</span>
            </div>
            <button
              onClick={() => setSessionToast(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </Card>

      {/* Zen Fullscreen Focus Overlay */}
      {isZenMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-between p-8 animate-fadeIn">
          {/* Zen Header */}
          <div className="w-full max-w-4xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: themeColor }}
              />
              <span className="font-display font-semibold text-white tracking-wide text-sm">
                EduSync Zen Focus · {currentModeInfo.title}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSoundEnabled((prev) => !prev)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button
                onClick={() => setIsZenMode(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Minimize2 size={14} />
                <span>Exit Zen</span>
              </button>
            </div>
          </div>

          {/* Zen Central Showcase */}
          <div className="flex flex-col items-center justify-center my-auto text-center space-y-6">
            {activeSubject && mode === 'pomodoro' && (
              <div className="space-y-1">
                <span
                  className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full border"
                  style={{
                    backgroundColor: `${activeSubject.color}15`,
                    borderColor: `${activeSubject.color}35`,
                    color: activeSubject.color,
                  }}
                >
                  {activeSubject.name}
                </span>
                <p className="text-sm text-slate-300 font-medium mt-1">
                  {customTopic.trim() || activeSubject.pendingTopics[0] || 'Deep Work Study Session'}
                </p>
              </div>
            )}

            {/* Giant Monospace Timer */}
            <div className="relative flex items-center justify-center">
              <div
                className="font-mono text-7xl sm:text-9xl font-extrabold text-white tracking-tight drop-shadow-2xl select-none"
                style={{
                  textShadow: `0 0 40px ${themeColor}40`,
                }}
              >
                {timeFormatted}
              </div>
            </div>

            {/* Zen Controls */}
            <div className="flex items-center gap-4">
              <Button
                variant={isRunning ? 'secondary' : 'primary'}
                onClick={togglePlayPause}
                className="px-8 py-3 text-base font-semibold rounded-2xl cursor-pointer"
                icon={isRunning ? <Pause size={20} /> : <Play size={20} className="fill-current" />}
              >
                {isRunning ? 'Pause' : 'Focus'}
              </Button>

              <button
                onClick={handleReset}
                className="p-3.5 rounded-2xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Reset timer"
              >
                <RotateCcw size={18} />
              </button>

              <button
                onClick={handleAddFiveMinutes}
                className="px-4 py-3 rounded-2xl border border-white/10 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={16} />
                <span>5m</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 max-w-md italic">
              "Deep work is the ability to focus without distraction on a cognitively demanding task." — Cal Newport
            </p>
          </div>

          {/* Zen Footer Progress */}
          <div className="w-full max-w-xl text-center text-xs text-slate-400 flex items-center justify-between border-t border-white/8 pt-4">
            <span>Today's Total: {todayMinutes} minutes</span>
            <span>Pomodoros: {todayPomodoros} completed</span>
          </div>
        </div>
      )}

      {/* Deep Work History Modal */}
      {showHistoryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <Flame size={18} className="text-sky-400" />
                <h3 className="font-display font-semibold text-white text-base">Deep Work History</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Summary Banner */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-800/60 border border-white/5">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Today's Focus Time</p>
                <p className="font-display text-xl font-bold text-white mt-0.5">{todayMinutes} min</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Completed Sessions</p>
                <p className="font-display text-xl font-bold text-sky-400 mt-0.5">{todayPomodoros} intervals</p>
              </div>
            </div>

            {/* List of recent sessions */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {deepWorkSessions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No sessions recorded yet. Start your first Pomodoro interval above!
                </div>
              ) : (
                deepWorkSessions.map((s) => {
                  const dateObj = new Date(s.completedAt);
                  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

                  return (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl card-surface border border-white/5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: s.color || '#38bdf8' }}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">
                            {s.topic || s.subjectName || 'Deep Work Session'}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {s.subjectName ? `${s.subjectName} · ` : ''}
                            {dateStr} at {timeStr}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-semibold text-sky-300">+{s.durationMinutes}m</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
