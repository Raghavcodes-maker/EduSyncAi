import { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Search,
  ArrowRight,
  ArrowLeft,
  Trophy,
  ListOrdered,
  History,
  Trash2,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import { useApp } from '@/context/AppContext';
import type {
  QuizQuestion,
  QuizAttemptRecord,
  QuizDifficulty,
  ViewKey,
} from '@/types';

interface PracticeQuizViewProps {
  onNavigate: (view: ViewKey) => void;
}

type QuizStage = 'setup' | 'loading' | 'taking' | 'submitted' | 'history';

export default function PracticeQuizView({ onNavigate }: PracticeQuizViewProps) {
  const {
    syllabusTrackers,
    quizHistory,
    addQuizAttempt,
    clearQuizHistory,
    activeQuizTopic,
    setActiveResearchTarget,
  } = useApp();

  // Setup options
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>(() => {
    return activeQuizTopic?.subjectName || syllabusTrackers[0]?.subjectName || '';
  });

  const [selectedTopicTitle, setSelectedTopicTitle] = useState<string>(() => {
    return activeQuizTopic?.topicTitle || syllabusTrackers[0]?.topics[0]?.title || '';
  });

  const [difficulty, setDifficulty] = useState<QuizDifficulty>(() => {
    return activeQuizTopic?.difficulty || 'Medium';
  });

  const [questionCount, setQuestionCount] = useState<5 | 10 | 15>(5);

  // Quiz active state
  const [stage, setStage] = useState<QuizStage>('setup');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [loadingStepText, setLoadingStepText] = useState('Generating practice questions...');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastAttempt, setLastAttempt] = useState<QuizAttemptRecord | null>(null);

  // Sync when activeQuizTopic is set from external navigations (e.g. from Syllabus Tracker)
  useEffect(() => {
    if (activeQuizTopic) {
      setSelectedSubjectName(activeQuizTopic.subjectName);
      setSelectedTopicTitle(activeQuizTopic.topicTitle);
      if (activeQuizTopic.difficulty) {
        setDifficulty(activeQuizTopic.difficulty);
      }
    }
  }, [activeQuizTopic]);

  // Derived available topics for currently selected subject
  const currentSubjectObj = useMemo(() => {
    return syllabusTrackers.find((s) => s.subjectName === selectedSubjectName);
  }, [syllabusTrackers, selectedSubjectName]);

  const availableTopics = useMemo(() => {
    if (!currentSubjectObj) return [];
    return currentSubjectObj.topics.map((t) => t.title);
  }, [currentSubjectObj]);

  // Handle subject change to update topic default
  const handleSubjectSelect = (subjName: string) => {
    setSelectedSubjectName(subjName);
    const found = syllabusTrackers.find((s) => s.subjectName === subjName);
    if (found && found.topics.length > 0) {
      setSelectedTopicTitle(found.topics[0].title);
    } else {
      setSelectedTopicTitle('');
    }
  };

  // Generate Quiz
  const handleGenerateQuiz = async () => {
    if (!selectedSubjectName || !selectedTopicTitle) {
      setErrorMsg('Please select a subject and syllabus topic first.');
      return;
    }

    setStage('loading');
    setErrorMsg('');
    setLoadingStepText(`Formulating ${difficulty} practice questions for "${selectedTopicTitle}"...`);

    try {
      const quizPayload = {
        subject: selectedSubjectName,
        topic: selectedTopicTitle,
        difficulty,
        count: questionCount,
      };

      let response: Response | null = null;

      // 1. Prefer Supabase Edge Function (available on the published static site)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (
        supabaseUrl &&
        supabaseKey &&
        supabaseUrl !== 'your_supabase_project_url' &&
        supabaseKey !== 'your_supabase_anon_key'
      ) {
        try {
          response = await fetch(`${supabaseUrl}/functions/v1/quiz-generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify(quizPayload),
          });
        } catch {
          response = null;
        }
      }

      // 2. Fall back to Vite dev/preview server middleware (local dev only)
      if (!response || !response.ok) {
        response = await fetch('/api/quiz/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(quizPayload),
        });
      }

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        let errMessage = `Quiz server returned status ${response.status}`;
        if (contentType.includes('application/json')) {
          try {
            const errData = await response.json();
            if (errData.error) errMessage = errData.error;
          } catch {
            // Keep status message if JSON parsing fails
          }
        } else {
          const rawText = await response.text();
          if (rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
            errMessage = `Quiz service endpoint received an HTML page (status ${response.status}). The server may be reloading or the endpoint is unavailable.`;
          } else if (rawText) {
            errMessage = rawText.slice(0, 180);
          }
        }
        throw new Error(errMessage);
      }

      if (!contentType.includes('application/json')) {
        const rawSnippet = (await response.text()).slice(0, 120);
        throw new Error(
          `Expected JSON quiz response from server but received ${contentType || 'non-JSON'} (${rawSnippet || 'empty'}). Please retry.`
        );
      }

      const data = await response.json();
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('AI generated malformed or empty questions. Please retry.');
      }

      // Filter and strictly validate each question
      const validQuestions: QuizQuestion[] = data.questions.filter((q: unknown) => {
        if (!q || typeof q !== 'object') return false;
        const item = q as Record<string, unknown>;
        return (
          typeof item.question === 'string' &&
          item.question.trim().length > 0 &&
          Array.isArray(item.options) &&
          item.options.length === 4 &&
          typeof item.correctAnswerIndex === 'number' &&
          item.correctAnswerIndex >= 0 &&
          item.correctAnswerIndex <= 3 &&
          typeof item.explanation === 'string'
        );
      }) as QuizQuestion[];

      if (validQuestions.length === 0) {
        throw new Error(
          'Generated questions did not pass multiple-choice validation (requires 4 options, valid answer index). Please retry.'
        );
      }

      setQuestions(validQuestions);
      setUserAnswers({});
      setCurrentQuestionIndex(0);
      setStage('taking');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate quiz';
      setErrorMsg(message);
      setStage('setup');
    }
  };

  // Select Option
  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (stage !== 'taking') return;
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  // Submit Quiz
  const handleSubmitQuiz = () => {
    if (stage !== 'taking') return;

    // Calculate score accurately from validated answer key
    let correctCount = 0;
    questions.forEach((q) => {
      const chosen = userAnswers[q.id];
      if (chosen === q.correctAnswerIndex) {
        correctCount += 1;
      }
    });

    const scorePct = Math.round((correctCount / questions.length) * 100);

    const attempt: QuizAttemptRecord = {
      id: `attempt_${Date.now()}`,
      date: new Date().toISOString(),
      subjectName: selectedSubjectName,
      topicTitle: selectedTopicTitle,
      difficulty,
      totalQuestions: questions.length,
      score: correctCount,
      scorePct,
      questions,
      userAnswers,
    };

    setLastAttempt(attempt);
    addQuizAttempt(attempt);
    setStage('submitted');
  };

  // Research Weak Topic with TinyFish
  const handleResearchTopic = () => {
    setActiveResearchTarget({
      subjectName: selectedSubjectName,
      topicTitle: selectedTopicTitle,
    });
    onNavigate('research');
  };

  // Restart / New Quiz
  const handleResetForNewQuiz = () => {
    setStage('setup');
    setQuestions([]);
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setErrorMsg('');
  };

  const answeredCount = Object.keys(userAnswers).length;
  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/8">
        <div>
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <Sparkles size={20} className="text-purple-400" />
            Topic-Based Practice Quiz
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Original AI-generated multiple choice questions tailored to your syllabus topics with verified answer keys.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {stage !== 'setup' && stage !== 'loading' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetForNewQuiz}
              className="text-xs"
            >
              <RotateCcw size={14} className="mr-1.5" />
              New Quiz
            </Button>
          )}

          <Button
            variant={stage === 'history' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStage(stage === 'history' ? 'setup' : 'history')}
            className="text-xs"
          >
            <History size={14} className="mr-1.5" />
            Quiz History ({quizHistory.length})
          </Button>
        </div>
      </div>

      {/* 1. SETUP STAGE */}
      {stage === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-8 p-6 space-y-6">
            <div className="border-b border-white/6 pb-4">
              <h3 className="font-display font-semibold text-white text-base">Create Practice Quiz</h3>
              <p className="text-xs text-slate-400 mt-1">
                Select your subject and target syllabus topic. Questions include conceptual, numerical, and application problems.
              </p>
            </div>

            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <div>
                  <p className="font-semibold text-red-200">Quiz Generation Notice</p>
                  <p className="mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Subject Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  1. Choose Subject <span className="text-sky-400">*</span>
                </label>
                <select
                  value={selectedSubjectName}
                  onChange={(e) => handleSubjectSelect(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  {syllabusTrackers.map((s) => (
                    <option key={s.id} value={s.subjectName}>
                      {s.subjectName}
                    </option>
                  ))}
                  {syllabusTrackers.length === 0 && (
                    <option value="Engineering Mathematics">Engineering Mathematics</option>
                  )}
                </select>
              </div>

              {/* Syllabus Topic Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  2. Choose Syllabus Topic <span className="text-sky-400">*</span>
                </label>
                {availableTopics.length > 0 ? (
                  <select
                    value={selectedTopicTitle}
                    onChange={(e) => setSelectedTopicTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    {availableTopics.map((top, idx) => (
                      <option key={idx} value={top}>
                        {top}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. First-Order Differential Equations"
                    value={selectedTopicTitle}
                    onChange={(e) => setSelectedTopicTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                )}
              </div>
            </div>

            {/* Difficulty Selection */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                3. Select Difficulty
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['Easy', 'Medium', 'Hard'] as QuizDifficulty[]).map((d) => {
                  const active = difficulty === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`py-3 px-4 rounded-xl text-xs font-medium border transition-all text-center ${
                        active
                          ? d === 'Easy'
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm'
                            : d === 'Medium'
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                            : 'bg-red-500/15 border-red-500/40 text-red-300 shadow-sm'
                          : 'card-surface text-slate-400 hover:text-white border-transparent'
                      }`}
                    >
                      <span className="block font-semibold text-sm">{d}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {d === 'Easy'
                          ? 'Fundamental concepts'
                          : d === 'Medium'
                          ? 'Exam-standard analysis'
                          : 'Advanced derivations & numericals'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quiz Length */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                4. Quiz Length
              </label>
              <div className="grid grid-cols-3 gap-3">
                {([5, 10, 15] as const).map((count) => {
                  const active = questionCount === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setQuestionCount(count)}
                      className={`py-2.5 px-4 rounded-xl text-xs font-medium border transition-all text-center ${
                        active
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-sm'
                          : 'card-surface text-slate-400 hover:text-white border-transparent'
                      }`}
                    >
                      <span className="font-semibold text-sm">{count} Questions</span>
                      <span className="block text-[10px] text-slate-400">
                        ~{count * 2} minutes
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleGenerateQuiz}
                disabled={!selectedSubjectName || !selectedTopicTitle}
                className="w-full py-3 text-sm font-semibold shadow-lg shadow-purple-500/20 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
              >
                <Sparkles size={16} className="mr-2" />
                Generate Practice Quiz
              </Button>
              <p className="text-[11px] text-slate-500 text-center mt-2">
                Questions are generated directly in EduSync AI using Google Gemini. You will answer them here without leaving the app.
              </p>
            </div>
          </Card>

          {/* Right column: Quick recommendations & Syllabus Tracker integration */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={16} className="text-sky-400" />
                <h4 className="font-semibold text-white text-sm">Syllabus Tracker Quick Select</h4>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Jump straight into practice questions for topics marked in your tracker.
              </p>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {syllabusTrackers.flatMap((subj) =>
                  subj.topics.slice(0, 3).map((top) => (
                    <div
                      key={top.id}
                      onClick={() => {
                        setSelectedSubjectName(subj.subjectName);
                        setSelectedTopicTitle(top.title);
                      }}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        selectedTopicTitle === top.title && selectedSubjectName === subj.subjectName
                          ? 'bg-sky-500/15 border-sky-500/40 text-white'
                          : 'card-surface hover:border-white/15 text-slate-300'
                      }`}
                    >
                      <p className="font-medium text-white truncate">{top.title}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>{subj.subjectName}</span>
                        <span
                          className={`capitalize px-1.5 py-0.5 rounded ${
                            top.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : top.status === 'in_progress'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {top.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-5 border-purple-500/20 bg-purple-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={16} className="text-purple-400" />
                <h4 className="font-semibold text-white text-sm">How Quiz Practice Works</h4>
              </div>
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <span>Interactive multiple-choice exam interface with instant grading.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <span>Detailed educational explanations for every correct derivation.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <span>Automatically updates topic mastery status in your Syllabus Tracker.</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {/* 2. LOADING STAGE */}
      {stage === 'loading' && (
        <Card className="p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles size={32} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-white">Generating Quiz Questions</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{loadingStepText}</p>
          </div>
          <div className="w-48 mx-auto mt-4">
            <ProgressBar value={75} color="#a855f7" height="h-1.5" />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Verifying question uniqueness, answer keys, and pedagogical explanations...
          </p>
        </Card>
      )}

      {/* 3. TAKING QUIZ STAGE */}
      {stage === 'taking' && currentQ && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Progress bar & navigation header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-semibold text-purple-400">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <p className="text-xs text-slate-400">
                {selectedSubjectName} · {currentQ.topicTag} · <span className="font-medium text-slate-300">{currentQ.difficulty}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">
                {answeredCount}/{questions.length} Answered
              </span>
            </div>
          </div>

          <ProgressBar
            value={Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}
            color="#a855f7"
            height="h-2"
          />

          {/* Question Card */}
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/20">
                Practice Question #{currentQuestionIndex + 1}
              </span>
              <h3 className="text-base sm:text-lg font-medium text-white leading-relaxed pt-1">
                {currentQ.question}
              </h3>
            </div>

            {/* Answer Options */}
            <div className="space-y-3 pt-2">
              {currentQ.options.map((optionText, optIdx) => {
                const selected = userAnswers[currentQ.id] === optIdx;
                const letter = String.fromCharCode(65 + optIdx);

                return (
                  <div
                    key={optIdx}
                    onClick={() => handleSelectOption(currentQ.id, optIdx)}
                    className={`p-4 rounded-xl border text-sm cursor-pointer transition-all flex items-start gap-3 ${
                      selected
                        ? 'bg-purple-500/20 border-purple-500/60 text-white shadow-sm shadow-purple-500/10'
                        : 'card-surface hover:border-white/20 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        selected
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-800 text-slate-400 border border-white/5'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="flex-1 leading-relaxed text-sm">{optionText}</span>
                  </div>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-white/8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
              >
                <ArrowLeft size={14} className="mr-1.5" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    size="sm"
                    onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  >
                    Next
                    <ArrowRight size={14} className="ml-1.5" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSubmitQuiz}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/20"
                  >
                    <CheckCircle2 size={16} className="mr-1.5" />
                    Submit Quiz
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Quick jump question numbers */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {questions.map((q, idx) => {
              const isAnswered = userAnswers[q.id] !== undefined;
              const isCurrent = idx === currentQuestionIndex;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    isCurrent
                      ? 'bg-purple-500 text-white ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900'
                      : isAnswered
                      ? 'bg-purple-500/30 text-purple-200 border border-purple-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. RESULTS & LEARNING FEEDBACK STAGE */}
      {stage === 'submitted' && lastAttempt && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Score Header Card */}
          <Card className="p-6 sm:p-8 text-center space-y-4 bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/20 border-purple-500/20">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center mx-auto">
              <Trophy size={32} />
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                Quiz Results Completed
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-white mt-1">
                {lastAttempt.score} of {lastAttempt.totalQuestions} Correct
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span
                  className={`text-2xl font-bold font-display ${
                    lastAttempt.scorePct >= 80
                      ? 'text-emerald-400'
                      : lastAttempt.scorePct >= 50
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {lastAttempt.scorePct}% Score
                </span>
                <span className="text-xs text-slate-400">
                  · {lastAttempt.subjectName} ({lastAttempt.difficulty})
                </span>
              </div>
            </div>

            <div className="max-w-md mx-auto">
              <ProgressBar
                value={lastAttempt.scorePct}
                color={
                  lastAttempt.scorePct >= 80
                    ? '#34d399'
                    : lastAttempt.scorePct >= 50
                    ? '#fbbf24'
                    : '#f87171'
                }
                height="h-2.5"
              />
            </div>

            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              {lastAttempt.scorePct >= 80
                ? 'Outstanding performance! Topic marked as completed in your syllabus tracker.'
                : lastAttempt.scorePct >= 60
                ? 'Good foundation, with a few gaps in specific derivations or edge cases.'
                : 'This topic needs dedicated revision. Review the step-by-step explanations below.'}
            </p>

            <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
              <Button onClick={handleResetForNewQuiz} variant="outline" size="sm">
                <RotateCcw size={14} className="mr-1.5" />
                Retry with New Quiz
              </Button>
              <Button
                onClick={handleResearchTopic}
                size="sm"
                className="bg-sky-600 hover:bg-sky-500 text-white"
              >
                <Search size={14} className="mr-1.5" />
                Research Topic with TinyFish
              </Button>
              <Button
                onClick={() => onNavigate('syllabus')}
                size="sm"
                variant="ghost"
                className="text-slate-300"
              >
                View in Syllabus Tracker
                <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </div>
          </Card>

          {/* Question Review & Explanations List */}
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-white text-base flex items-center gap-2">
              <ListOrdered size={18} className="text-purple-400" />
              Detailed Explanations & Review Key
            </h3>

            {lastAttempt.questions.map((q, idx) => {
              const userSelected = lastAttempt.userAnswers[q.id];
              const isCorrect = userSelected === q.correctAnswerIndex;

              return (
                <Card
                  key={q.id}
                  className={`p-6 border transition-all ${
                    isCorrect
                      ? 'border-emerald-500/25 bg-emerald-500/[0.02]'
                      : 'border-red-500/25 bg-red-500/[0.02]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-400">
                        Q{idx + 1}.
                      </span>
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                          <CheckCircle2 size={13} /> Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                          <XCircle size={13} /> Needs Revision
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm font-medium text-white mb-4 leading-relaxed">
                    {q.question}
                  </p>

                  <div className="space-y-2 mb-4">
                    {q.options.map((opt, optIndex) => {
                      const isOptionCorrect = optIndex === q.correctAnswerIndex;
                      const isUserChoice = optIndex === userSelected;

                      return (
                        <div
                          key={optIndex}
                          className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                            isOptionCorrect
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold'
                              : isUserChoice && !isCorrect
                              ? 'bg-red-500/15 border-red-500/40 text-red-200'
                              : 'bg-slate-900/40 border-white/5 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold font-mono">
                              {String.fromCharCode(65 + optIndex)}.
                            </span>
                            <span>{opt}</span>
                          </div>
                          {isOptionCorrect && (
                            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                              Correct Answer
                            </span>
                          )}
                          {isUserChoice && !isCorrect && (
                            <span className="text-[10px] uppercase font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded">
                              Your Selection
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Step-by-step Explanation */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/8 text-xs space-y-1">
                    <p className="font-semibold text-purple-300 flex items-center gap-1.5">
                      <HelpCircle size={13} /> Explanation & Solution Derivation:
                    </p>
                    <p className="text-slate-300 leading-relaxed pl-5">{q.explanation}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. QUIZ HISTORY STAGE */}
      {stage === 'history' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/8">
            <div>
              <h3 className="font-display font-semibold text-white text-base">
                Saved Quiz Attempts & Performance History
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Review your previous practice sessions, score trajectories, and topics tested.
              </p>
            </div>
            {quizHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearQuizHistory}
                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 size={13} className="mr-1.5" />
                Clear History
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {quizHistory.map((item) => {
              const attemptDate = new Date(item.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl card-surface border border-white/6 hover:border-white/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white text-sm">{item.topicTitle}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {item.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {item.subjectName} · {item.totalQuestions} Questions · {attemptDate}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold font-display ${
                          item.scorePct >= 80
                            ? 'text-emerald-400'
                            : item.scorePct >= 50
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {item.scorePct}%
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {item.score}/{item.totalQuestions} correct
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setLastAttempt(item);
                        setStage('submitted');
                      }}
                      className="text-xs"
                    >
                      Review
                    </Button>
                  </div>
                </div>
              );
            })}

            {quizHistory.length === 0 && (
              <div className="py-12 text-center">
                <History size={36} className="mx-auto text-slate-500 mb-2" />
                <p className="text-sm text-slate-300 font-medium">No quiz attempts recorded yet</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Complete your first practice quiz to track questions and scores here.
                </p>
                <Button size="sm" onClick={() => setStage('setup')}>
                  Start Practice Quiz
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
