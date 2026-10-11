import { useState, useMemo } from 'react';
import {
  ListChecks,
  Plus,
  Search,
  BookOpen,
  CheckCircle2,
  Clock,
  Circle,
  Trash2,
  Sparkles,
  BarChart2,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ProgressBar from '@/components/ui/ProgressBar';
import { useApp } from '@/context/AppContext';
import type { TopicProgressStatus, SyllabusSubjectTracker, ViewKey } from '@/types';

interface SyllabusTrackerViewProps {
  onNavigate: (view: ViewKey) => void;
}

export default function SyllabusTrackerView({ onNavigate }: SyllabusTrackerViewProps) {
  const {
    syllabusTrackers,
    addSyllabusSubject,
    addSyllabusTopics,
    updateTopicStatus,
    deleteSyllabusTopic,
    deleteSyllabusSubject,
    setActiveQuizTopic,
    setActiveResearchTarget,
  } = useApp();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => syllabusTrackers[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState<'all' | TopicProgressStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTopicsInput, setNewSubjectTopicsInput] = useState('');

  const [showAddTopicsModal, setShowAddTopicsModal] = useState(false);
  const [pasteTopicsInput, setPasteTopicsInput] = useState('');

  // Active subject selection
  const currentSubject: SyllabusSubjectTracker | undefined = useMemo(() => {
    return syllabusTrackers.find((s) => s.id === selectedSubjectId) || syllabusTrackers[0];
  }, [syllabusTrackers, selectedSubjectId]);

  // Overall Global Calculations across all subjects
  const allGlobalTopics = useMemo(() => {
    return syllabusTrackers.flatMap((s) => s.topics);
  }, [syllabusTrackers]);

  const globalTotal = allGlobalTopics.length;
  const globalCompleted = allGlobalTopics.filter((t) => t.status === 'completed').length;
  const globalInProgress = allGlobalTopics.filter((t) => t.status === 'in_progress').length;
  const globalNotStarted = allGlobalTopics.filter((t) => t.status === 'not_started').length;
  const globalPct = globalTotal > 0 ? Math.round((globalCompleted / globalTotal) * 100) : 0;

  // Subject-specific calculations
  const subjectTotal = currentSubject ? currentSubject.topics.length : 0;
  const subjectCompleted = currentSubject
    ? currentSubject.topics.filter((t) => t.status === 'completed').length
    : 0;
  const subjectInProgress = currentSubject
    ? currentSubject.topics.filter((t) => t.status === 'in_progress').length
    : 0;
  const subjectNotStarted = currentSubject
    ? currentSubject.topics.filter((t) => t.status === 'not_started').length
    : 0;
  const subjectPct = subjectTotal > 0 ? Math.round((subjectCompleted / subjectTotal) * 100) : 0;

  // Filtered topics for active subject
  const displayedTopics = useMemo(() => {
    if (!currentSubject) return [];
    return currentSubject.topics.filter((t) => {
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesSearch =
        !searchQuery.trim() || t.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesStatus && matchesSearch;
    });
  }, [currentSubject, statusFilter, searchQuery]);

  // Handle Add Subject submit
  const handleCreateSubject = () => {
    if (!newSubjectName.trim()) return;
    const initialTopics = newSubjectTopicsInput
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    addSyllabusSubject(newSubjectName.trim(), initialTopics);
    setNewSubjectName('');
    setNewSubjectTopicsInput('');
    setShowAddSubjectModal(false);
  };

  // Handle Add Topics submit
  const handleAddBatchTopics = () => {
    if (!currentSubject || !pasteTopicsInput.trim()) return;
    const topics = pasteTopicsInput
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    addSyllabusTopics(currentSubject.id, topics);
    setPasteTopicsInput('');
    setShowAddTopicsModal(false);
  };

  // Actions connecting to TinyFish and Practice Quiz
  const handleStartResearch = (topicTitle: string) => {
    if (!currentSubject) return;
    setActiveResearchTarget({
      subjectName: currentSubject.subjectName,
      topicTitle,
    });
    onNavigate('research');
  };

  const handleStartQuiz = (topicTitle: string) => {
    if (!currentSubject) return;
    setActiveQuizTopic({
      subjectName: currentSubject.subjectName,
      topicTitle,
      difficulty: 'Medium',
    });
    onNavigate('quiz');
  };

  return (
    <div className="space-y-6">
      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-4 bg-gradient-to-br from-sky-500/10 to-blue-500/5 border-sky-500/20">
          <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <BarChart2 size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Overall Progress</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-display text-white">{globalPct}%</span>
              <span className="text-xs text-slate-400">({globalCompleted}/{globalTotal} topics)</span>
            </div>
            <ProgressBar value={globalPct} color="#38bdf8" height="h-1.5" className="mt-2 w-28" />
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Completed</p>
            <p className="text-2xl font-bold font-display text-emerald-400">{globalCompleted}</p>
            <p className="text-[11px] text-slate-500">Mastered syllabus topics</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">In Progress</p>
            <p className="text-2xl font-bold font-display text-amber-400">{globalInProgress}</p>
            <p className="text-[11px] text-slate-500">Currently studying</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
            <Circle size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Not Started</p>
            <p className="text-2xl font-bold font-display text-slate-300">{globalNotStarted}</p>
            <p className="text-[11px] text-slate-500">Upcoming syllabus items</p>
          </div>
        </Card>
      </div>

      {/* Main Layout: Subjects Drawer / Tabs + Active Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Subjects List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-white text-base flex items-center gap-2">
              <BookOpen size={18} className="text-sky-400" />
              Syllabus by Subject
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddSubjectModal(true)}
              className="text-xs py-1.5"
            >
              <Plus size={14} className="mr-1" />
              Add Subject
            </Button>
          </div>

          <div className="space-y-2.5">
            {syllabusTrackers.map((s) => {
              const active = currentSubject?.id === s.id;
              const completed = s.topics.filter((t) => t.status === 'completed').length;
              const total = s.topics.length;
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSubjectId(s.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${
                    active
                      ? 'bg-sky-500/10 border-sky-500/30 shadow-lg shadow-sky-500/5'
                      : 'card-surface hover:border-white/15'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-white text-sm leading-snug">{s.subjectName}</h4>
                      {s.subjectCode && <span className="text-[11px] text-slate-400">{s.subjectCode}</span>}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        pct === 100
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : pct >= 50
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>

                  <div className="mt-3">
                    <ProgressBar
                      value={pct}
                      color={pct === 100 ? '#34d399' : '#38bdf8'}
                      height="h-1.5"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                      <span>{completed} of {total} topics complete</span>
                      <span>{total - completed} left</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {syllabusTrackers.length === 0 && (
              <Card className="p-8 text-center">
                <BookOpen size={32} className="mx-auto text-slate-500 mb-3" />
                <p className="text-sm text-slate-300 font-medium">No subjects in tracker yet</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Add your first subject and paste syllabus topics to track mastery.
                </p>
                <Button size="sm" onClick={() => setShowAddSubjectModal(true)}>
                  <Plus size={14} className="mr-1.5" />
                  Add First Subject
                </Button>
              </Card>
            )}
          </div>
        </div>

        {/* Right Column: Topics List for Selected Subject */}
        <div className="lg:col-span-8 space-y-4">
          {currentSubject ? (
            <Card className="p-6">
              {/* Subject Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/8">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl font-bold text-white">
                      {currentSubject.subjectName}
                    </h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/20">
                      {subjectPct}% Done
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {subjectCompleted} completed · {subjectInProgress} in progress · {subjectNotStarted} not started ({subjectTotal} total topics)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddTopicsModal(true)}
                  >
                    <Plus size={14} className="mr-1.5" />
                    Enter / Paste Topics
                  </Button>
                  {syllabusTrackers.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteSyllabusSubject(currentSubject.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2"
                      title="Delete this subject tracker"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 pb-4">
                <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-white/5 w-full sm:w-auto">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      statusFilter === 'all'
                        ? 'bg-sky-500 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({subjectTotal})
                  </button>
                  <button
                    onClick={() => setStatusFilter('completed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      statusFilter === 'completed'
                        ? 'bg-emerald-500 text-white shadow'
                        : 'text-slate-400 hover:text-emerald-400'
                    }`}
                  >
                    Completed ({subjectCompleted})
                  </button>
                  <button
                    onClick={() => setStatusFilter('in_progress')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      statusFilter === 'in_progress'
                        ? 'bg-amber-500 text-white shadow'
                        : 'text-slate-400 hover:text-amber-400'
                    }`}
                  >
                    In Progress ({subjectInProgress})
                  </button>
                  <button
                    onClick={() => setStatusFilter('not_started')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      statusFilter === 'not_started'
                        ? 'bg-slate-700 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Not Started ({subjectNotStarted})
                  </button>
                </div>

                <div className="relative w-full sm:w-60">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  />
                </div>
              </div>

              {/* Topics List */}
              <div className="space-y-3 mt-1">
                {displayedTopics.map((topic, index) => {
                  return (
                    <div
                      key={topic.id}
                      className="p-4 rounded-xl card-surface border border-white/6 hover:border-white/12 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-xs font-mono text-slate-500 mt-1 shrink-0 w-6">
                          #{index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              className={`text-sm font-medium ${
                                topic.status === 'completed'
                                  ? 'text-slate-300 line-through opacity-85'
                                  : 'text-white'
                              }`}
                            >
                              {topic.title}
                            </h4>
                            {topic.lastScorePct !== undefined && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  topic.lastScorePct >= 80
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : topic.lastScorePct >= 60
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}
                              >
                                Last Quiz: {topic.lastScorePct}%
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span>Status:</span>
                            <div className="inline-flex rounded-lg bg-slate-900/90 p-0.5 border border-white/5">
                              <button
                                onClick={() =>
                                  updateTopicStatus(currentSubject.id, topic.id, 'not_started')
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  topic.status === 'not_started'
                                    ? 'bg-slate-700 text-white'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                Not Started
                              </button>
                              <button
                                onClick={() =>
                                  updateTopicStatus(currentSubject.id, topic.id, 'in_progress')
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  topic.status === 'in_progress'
                                    ? 'bg-amber-500/80 text-white font-semibold'
                                    : 'text-slate-400 hover:text-amber-400'
                                }`}
                              >
                                In Progress
                              </button>
                              <button
                                onClick={() =>
                                  updateTopicStatus(currentSubject.id, topic.id, 'completed')
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  topic.status === 'completed'
                                    ? 'bg-emerald-500 text-white font-semibold'
                                    : 'text-slate-400 hover:text-emerald-400'
                                }`}
                              >
                                Completed
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons connecting workflow */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <button
                          onClick={() => handleStartResearch(topic.title)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-all active:scale-95"
                          title="Research this topic using TinyFish and discover verified channels"
                        >
                          <Search size={13} />
                          Research
                        </button>
                        <button
                          onClick={() => handleStartQuiz(topic.title)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/25 transition-all active:scale-95 shadow-sm"
                          title="Start practice quiz for this topic"
                        >
                          <Sparkles size={13} />
                          Practice Quiz
                        </button>
                        <button
                          onClick={() => deleteSyllabusTopic(currentSubject.id, topic.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                          title="Remove topic"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {displayedTopics.length === 0 && (
                  <div className="py-12 text-center card-surface rounded-xl border border-dashed border-white/10">
                    <ListChecks size={36} className="mx-auto text-slate-500 mb-2" />
                    <p className="text-sm text-slate-300 font-medium">No topics found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchQuery
                        ? 'Try clearing your search query filter.'
                        : 'Click "Enter / Paste Topics" to populate your syllabus.'}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      onClick={() => setShowAddTopicsModal(true)}
                    >
                      <Plus size={14} className="mr-1.5" />
                      Add Topics
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-slate-400">Select or create a subject to view syllabus topics.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Modal: Add Subject */}
      <Modal
        open={showAddSubjectModal}
        onClose={() => setShowAddSubjectModal(false)}
        title="Add Subject to Syllabus Tracker"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Subject Name <span className="text-sky-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Engineering Mathematics, Operating Systems"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Initial Topics (one per line, optional)
            </label>
            <textarea
              rows={4}
              placeholder="First-Order Differential Equations&#10;Higher-Order Differential Equations&#10;Homogeneous Equations"
              value={newSubjectTopicsInput}
              onChange={(e) => setNewSubjectTopicsInput(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              You can also paste syllabus chapters or exam headings directly.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAddSubjectModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubject} disabled={!newSubjectName.trim()}>
              Add Subject
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Enter / Paste Topics */}
      <Modal
        open={showAddTopicsModal}
        onClose={() => setShowAddTopicsModal(false)}
        title={`Add Topics to ${currentSubject?.subjectName || 'Subject'}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Paste Syllabus Topics (one per line)
            </label>
            <textarea
              rows={6}
              placeholder="First-Order Differential Equations&#10;Higher-Order Differential Equations&#10;Homogeneous Differential Equations&#10;Exact Equations & Integrating Factors"
              value={pasteTopicsInput}
              onChange={(e) => setPasteTopicsInput(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Tip: Paste the table of contents or syllabus modules from your university or school syllabus document.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowAddTopicsModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBatchTopics} disabled={!pasteTopicsInput.trim()}>
              Add Topics
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
