import { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Clock,
  CalendarClock,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Info,
  FileText,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Sparkles,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import { useApp } from '@/context/AppContext';
import { searchTopic } from '@/lib/tinyfish';
import type { ResearchResource, StudyPlanItem } from '@/types';

type ResearchState = 'idle' | 'searching' | 'planning' | 'done' | 'error';

export default function ResearchAgent() {
  const { subjects, profile } = useApp();

  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id ?? '');
  const [syllabusInput, setSyllabusInput] = useState('');
  const [examDate, setExamDate] = useState('');
  const [availableHours, setAvailableHours] = useState(4);
  const [domainType, setDomainType] = useState<'web' | 'research_paper'>('web');

  const [state, setState] = useState<ResearchState>('idle');
  const [searchProgress, setSearchProgress] = useState(0);
  const [currentTopic, setCurrentTopic] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [resources, setResources] = useState<ResearchResource[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyPlanItem[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const syllabusTopics = useMemo(() => {
    return syllabusInput
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }, [syllabusInput]);

  const completedCount = studyPlan.filter((p) => p.completed).length;
  const progressPct = studyPlan.length > 0 ? Math.round((completedCount / studyPlan.length) * 100) : 0;

  const toggleTopic = (topic: string) => {
    setStudyPlan((prev) =>
      prev.map((p) => (p.topic === topic ? { ...p, completed: !p.completed } : p)),
    );
  };

  const handleResearch = async () => {
    if (!selectedSubject || syllabusTopics.length === 0) return;

    setState('searching');
    setSearchProgress(0);
    setErrorMsg('');
    setResources([]);
    setStudyPlan([]);
    setExpandedTopic(null);

    const examDays = examDate
      ? Math.max(1, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000))
      : 14;

    const allResources: ResearchResource[] = [];
    const topicResources: Record<string, ResearchResource[]> = {};
    let anyLive = false;
    let firstError = '';

    for (let i = 0; i < syllabusTopics.length; i++) {
      const topic = syllabusTopics[i];
      setCurrentTopic(topic);
      setSearchProgress(Math.round(((i + 1) / syllabusTopics.length) * 100));

      const result = await searchTopic(topic, selectedSubject.name, domainType);

      if (result.error && !firstError) {
        firstError = result.error;
      }

      if (result.isLive) {
        anyLive = true;
      }

      topicResources[topic] = result.resources;
      allResources.push(...result.resources);

      await new Promise((r) => setTimeout(r, 300));
    }

    setResources(allResources);
    setIsLive(anyLive);

    if (allResources.length === 0) {
      setState('error');
      setErrorMsg(firstError || 'No resources were returned. Check your API key and network connection.');
      return;
    }

    setState('planning');
    setCurrentTopic('');

    await new Promise((r) => setTimeout(r, 600));

    const totalAvailableMinutes = availableHours * 60 * examDays;
    const perTopicMinutes = Math.max(30, Math.floor(totalAvailableMinutes / syllabusTopics.length));

    const plan: StudyPlanItem[] = syllabusTopics.map((topic, i) => {
      const urgency = i / syllabusTopics.length;
      const priority: StudyPlanItem['priority'] =
        urgency < 0.33 ? 'High' : urgency < 0.66 ? 'Medium' : 'Low';

      return {
        topic,
        priority,
        estimatedTime: perTopicMinutes,
        resources: topicResources[topic] ?? [],
        completed: false,
      };
    });

    setStudyPlan(plan);
    setState('done');
  };

  const handleReset = () => {
    setState('idle');
    setResources([]);
    setStudyPlan([]);
    setErrorMsg('');
    setSearchProgress(0);
    setExpandedTopic(null);
  };

  if (subjects.length === 0) {
    return (
      <Card className="p-8 text-center">
        <BookOpen size={32} className="mx-auto text-slate-500 mb-3" />
        <p className="text-slate-400">Add subjects first to use the Research Agent.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-sky-500/8 border border-sky-500/15 animate-fadeIn">
        <Info size={18} className="text-sky-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-300 leading-relaxed">
          Enter your syllabus topics, exam date, and available study time. The Research Agent uses{' '}
          <span className="text-sky-400 font-medium">TinyFish</span> to find real educational
          resources — each with clickable source links — and builds a prioritized study plan.
        </p>
      </div>

      {/* Input form */}
      {state === 'idle' && (
        <Card className="p-6" delay={0}>
          <div className="space-y-5">
            {/* Subject selection */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  const s = subjects.find((sub) => sub.id === e.target.value);
                  if (s) setExamDate(s.examDate);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-800">
                    {s.name} — {s.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Syllabus topics */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">
                Syllabus Topics <span className="text-slate-500">(comma or newline separated)</span>
              </label>
              <textarea
                value={syllabusInput}
                onChange={(e) => setSyllabusInput(e.target.value)}
                placeholder="e.g.&#10;Sorting Algorithms, Binary Search Trees, Graph Traversals&#10;Dynamic Programming, Greedy Algorithms"
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors resize-none scrollbar-thin"
              />
              {syllabusTopics.length > 0 && (
                <p className="text-[11px] text-sky-400 mt-1.5">
                  {syllabusTopics.length} topic{syllabusTopics.length !== 1 ? 's' : ''} detected
                </p>
              )}
            </div>

            {/* Exam date + hours */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <CalendarClock size={12} /> Exam Date
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Clock size={12} /> Available Study Hours / Day
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={availableHours}
                    onChange={(e) => setAvailableHours(parseInt(e.target.value))}
                    className="flex-1"
                    style={{
                      background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${((availableHours - 1) / 11) * 100}%, rgba(255,255,255,0.08) ${((availableHours - 1) / 11) * 100}%, rgba(255,255,255,0.08) 100%)`,
                      borderRadius: '3px',
                      height: '6px',
                    }}
                  />
                  <span className="font-display text-sm font-bold text-sky-400 w-8 text-right">
                    {availableHours}h
                  </span>
                </div>
              </div>
            </div>

            {/* Domain type */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Resource Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDomainType('web')}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 ${
                    domainType === 'web'
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/8'
                  }`}
                >
                  <Search size={14} /> Web Resources
                </button>
                <button
                  onClick={() => setDomainType('research_paper')}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 ${
                    domainType === 'research_paper'
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/8'
                  }`}
                >
                  <FileText size={14} /> Research Papers
                </button>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              icon={<Search size={16} />}
              onClick={handleResearch}
              disabled={syllabusTopics.length === 0}
              className="w-full"
            >
              Research &amp; Generate Study Plan
            </Button>
          </div>
        </Card>
      )}

      {/* Searching state */}
      {state === 'searching' && (
        <Card className="p-8" delay={0}>
          <div className="flex flex-col items-center text-center">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-sky-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Search size={24} className="text-sky-400" />
              </div>
            </div>
            <p className="font-display text-white font-medium mb-1">
              Researching educational resources...
            </p>
            <p className="text-sm text-slate-400 mb-5">
              {currentTopic ? `Searching for: "${currentTopic}"` : 'Connecting to TinyFish...'}
            </p>
            <div className="w-full max-w-xs">
              <ProgressBar value={searchProgress} color="#38bdf8" height="h-2" />
              <p className="text-xs text-slate-500 mt-2 text-center">{searchProgress}% complete</p>
            </div>
          </div>
        </Card>
      )}

      {/* Planning state */}
      {state === 'planning' && (
        <Card className="p-8" delay={0}>
          <div className="flex flex-col items-center text-center">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={24} className="text-violet-400" />
              </div>
            </div>
            <p className="font-display text-white font-medium mb-1">
              Building your study plan...
            </p>
            <p className="text-sm text-slate-400">
              Prioritizing topics by exam urgency and available time
            </p>
          </div>
        </Card>
      )}

      {/* Error state */}
      {state === 'error' && (
        <Card className="p-6" delay={0}>
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-xl bg-red-500/15 flex items-center justify-center mb-4">
              <AlertTriangle size={28} className="text-red-400" />
            </div>
            <h3 className="font-display font-semibold text-white text-lg mb-2">
              Research Failed
            </h3>
            <p className="text-sm text-slate-400 max-w-md mb-5">
              {errorMsg}
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" size="md" onClick={handleReset}>
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Results state */}
      {state === 'done' && (
        <>
          {/* Live/Demo banner */}
          <div
            className={`flex items-center gap-3 p-3.5 rounded-xl border animate-fadeIn ${
              isLive
                ? 'bg-emerald-500/8 border-emerald-500/15'
                : 'bg-amber-500/8 border-amber-500/15'
            }`}
          >
            {isLive ? (
              <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
            )}
            <p className={`text-xs leading-relaxed ${isLive ? 'text-emerald-200/80' : 'text-amber-200/80'}`}>
              {isLive
                ? 'Live research complete — these are real results retrieved from the web via TinyFish.'
                : 'Showing fallback results — the TinyFish API key may not be configured.'}
            </p>
          </div>

          {/* Progress overview */}
          <Card className="p-5" delay={0}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListChecks size={18} className="text-sky-400" />
                <h3 className="font-display font-semibold text-white text-sm">
                  Study Plan Progress
                </h3>
              </div>
              <span className="text-sm text-slate-400">
                {completedCount}/{studyPlan.length} topics completed
              </span>
            </div>
            <ProgressBar value={progressPct} color="#38bdf8" height="h-2" showLabel />
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Search size={12} className="text-sky-400" />
                {resources.length} resources found
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen size={12} className="text-emerald-400" />
                {selectedSubject?.name}
              </span>
              {examDate && (
                <span className="flex items-center gap-1.5">
                  <CalendarClock size={12} className="text-amber-400" />
                  Exam: {new Date(examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </Card>

          {/* Study plan items */}
          <div className="space-y-3">
            {studyPlan.map((item, i) => {
              const isExpanded = expandedTopic === item.topic;
              return (
                <Card key={i} className="overflow-hidden" delay={i * 50}>
                  {/* Topic header */}
                  <button
                    onClick={() => setExpandedTopic(isExpanded ? null : item.topic)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/3 transition-colors"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTopic(item.topic);
                      }}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                        item.completed
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'border-white/20 hover:border-sky-400'
                      }`}
                    >
                      {item.completed && <CheckCircle2 size={14} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          item.completed ? 'text-slate-500 line-through' : 'text-white'
                        }`}
                      >
                        {item.topic}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                            item.priority === 'High'
                              ? 'bg-red-500/15 text-red-400'
                              : item.priority === 'Medium'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-sky-500/15 text-sky-400'
                          }`}
                        >
                          {item.priority}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock size={10} />
                          {Math.floor(item.estimatedTime / 60)}h {item.estimatedTime % 60}m
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {item.resources.length} resources
                        </span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown size={18} className="text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
                    )}
                  </button>

                  {/* Expanded resources */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2.5 border-t border-white/6 pt-3">
                      {item.resources.length === 0 && (
                        <p className="text-xs text-slate-500 py-2">No resources found for this topic.</p>
                      )}
                      {item.resources.map((res, ri) => (
                        <a
                          key={ri}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block card-surface rounded-xl p-3.5 hover:bg-white/5 transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                              <FileText size={15} className="text-sky-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white group-hover:text-sky-400 transition-colors leading-snug flex items-start gap-1.5">
                                <span className="flex-1">{res.title}</span>
                                <ExternalLink size={13} className="text-slate-500 group-hover:text-sky-400 flex-shrink-0 mt-0.5 transition-colors" />
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {res.siteName}
                              </p>
                              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed line-clamp-2">
                                {res.snippet}
                              </p>
                              <p className="text-[10px] text-sky-400/70 mt-1.5">
                                {res.relevance}
                              </p>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* All resources summary */}
          {resources.length > 0 && (
            <Card className="p-5" delay={200}>
              <div className="flex items-center gap-2 mb-4">
                <Search size={16} className="text-sky-400" />
                <h3 className="font-display font-semibold text-white text-sm">
                  All Retrieved Resources ({resources.length})
                </h3>
              </div>
              <div className="space-y-2">
                {resources.map((res, i) => (
                  <a
                    key={i}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 rounded-lg card-surface hover:bg-white/5 transition-all group"
                  >
                    <span className="text-[10px] text-slate-500 w-5 flex-shrink-0">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white group-hover:text-sky-400 transition-colors truncate">
                        {res.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {res.siteName} · {res.topic}
                      </p>
                    </div>
                    <ExternalLink size={12} className="text-slate-500 group-hover:text-sky-400 flex-shrink-0 transition-colors" />
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* Reset button */}
          <div className="flex justify-center pt-2">
            <Button variant="secondary" size="md" onClick={handleReset}>
              Start New Research
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
