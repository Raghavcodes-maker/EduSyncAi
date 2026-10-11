import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  Subject,
  StudySession,
  StudyTask,
  ChatMessage,
  StudentProfile,
  SubjectSeed,
  StudyPlanItem,
  RevisionPlanBlock,
  SyllabusSubjectTracker,
  QuizAttemptRecord,
  TopicProgressStatus,
  DeepWorkSession,
} from '@/types';

const STORAGE_KEY = 'edusync_profile_v1';
const SYLLABUS_STORAGE_KEY = 'edusync_syllabus_tracker_v1';
const QUIZ_HISTORY_STORAGE_KEY = 'edusync_quiz_history_v1';
const DEEP_WORK_STORAGE_KEY = 'edusync_deep_work_v1';

const subjectColors = [
  '#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa',
  '#fb923c', '#2dd4bf', '#f472b6', '#60a5fa', '#a3e635',
];

const today = new Date();
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
function formatISO(d: Date): string {
  return d.toISOString().split('T')[0];
}
function dayLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function generatePendingTopics(subjectName: string, prep: number): string[] {
  const generic: Record<string, string[]> = {
    default: ['Core Concepts', 'Problem Solving', 'Key Formulas', 'Past Papers'],
  };
  const topics = generic.default;
  const count = prep >= 80 ? 1 : prep >= 60 ? 2 : prep >= 40 ? 3 : 4;
  return topics.slice(0, count);
}

function computeStatus(prep: number): Subject['status'] {
  if (prep >= 80) return 'On Track';
  if (prep >= 55) return 'On Track';
  if (prep >= 35) return 'At Risk';
  return 'Critical';
}

function computeDifficulty(prep: number): Subject['difficulty'] {
  if (prep < 40) return 'Hard';
  if (prep < 70) return 'Moderate';
  return 'Easy';
}

function buildSubjects(seeds: SubjectSeed[]): Subject[] {
  return seeds.map((seed, i) => {
    const examDate = seed.examDate || formatISO(addDays(today, 7 + i * 5));
    const prep = seed.preparation;
    return {
      id: `s${i + 1}`,
      name: seed.name,
      code: seed.name.substring(0, 3).toUpperCase() + ' ' + (100 + i * 10),
      preparation: prep,
      difficulty: computeDifficulty(prep),
      pendingTopics: generatePendingTopics(seed.name, prep),
      examDate,
      status: computeStatus(prep),
      color: subjectColors[i % subjectColors.length],
      credits: 3,
    };
  });
}

function buildSessions(subjects: Subject[]): StudySession[] {
  if (subjects.length === 0) return [];
  const sessions: StudySession[] = [];
  const timeSlots = ['09:00', '14:00', '10:00', '16:00', '11:00', '15:00'];
  const priorities: StudySession['priority'][] = ['High', 'High', 'Medium', 'High', 'Medium', 'High', 'Low'];

  // Sort by urgency (closest exam + lowest prep)
  const sorted = [...subjects].sort((a, b) => {
    const aUrgency = (100 - a.preparation) + (10 / Math.max(1, Math.ceil((new Date(a.examDate).getTime() - today.getTime()) / 86400000)));
    const bUrgency = (100 - b.preparation) + (10 / Math.max(1, Math.ceil((new Date(b.examDate).getTime() - today.getTime()) / 86400000)));
    return bUrgency - aUrgency;
  });

  let idx = 0;
  for (let dayOffset = 0; dayOffset < 7 && idx < 10; dayOffset++) {
    const sessionsPerDay = dayOffset === 0 ? 2 : dayOffset <= 2 ? 2 : 1;
    for (let s = 0; s < sessionsPerDay && idx < 10; s++) {
      const subj = sorted[idx % sorted.length];
      sessions.push({
        id: `sess${idx + 1}`,
        subjectId: subj.id,
        subjectName: subj.name,
        topic: subj.pendingTopics[0] ?? 'Review session',
        day: dayLabel(addDays(today, dayOffset)),
        startTime: timeSlots[s % timeSlots.length],
        duration: subj.status === 'Critical' ? 120 : subj.status === 'At Risk' ? 90 : 60,
        priority: priorities[idx % priorities.length],
        completed: false,
        color: subj.color,
      });
      idx++;
    }
  }
  return sessions;
}

function buildTasks(subjects: Subject[]): StudyTask[] {
  if (subjects.length === 0) return [];
  const sorted = [...subjects].sort((a, b) => a.preparation - b.preparation);
  return sorted.slice(0, 4).map((s, i) => ({
    id: `t${i + 1}`,
    title: `${s.pendingTopics[0] ?? 'Review'} — ${s.name}`,
    subjectName: s.name,
    duration: `${30 + i * 15} min`,
    priority: s.status === 'Critical' ? 'High' : s.status === 'At Risk' ? 'High' : i < 2 ? 'Medium' : 'Low',
    done: i >= 2,
    color: s.color,
  }));
}

function loadProfile(): StudentProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StudentProfile;
  } catch {
    return null;
  }
}

function saveProfile(profile: StudentProfile | null) {
  try {
    if (profile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function loadSyllabusTrackers(): SyllabusSubjectTracker[] {
  try {
    const raw = localStorage.getItem(SYLLABUS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SyllabusSubjectTracker[];
  } catch {
    return [];
  }
}

function saveSyllabusTrackers(trackers: SyllabusSubjectTracker[]) {
  try {
    localStorage.setItem(SYLLABUS_STORAGE_KEY, JSON.stringify(trackers));
  } catch {
    // ignore
  }
}

function loadQuizHistory(): QuizAttemptRecord[] {
  try {
    const raw = localStorage.getItem(QUIZ_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QuizAttemptRecord[];
  } catch {
    return [];
  }
}

function saveQuizHistory(records: QuizAttemptRecord[]) {
  try {
    localStorage.setItem(QUIZ_HISTORY_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

function loadDeepWorkSessions(): DeepWorkSession[] {
  try {
    const raw = localStorage.getItem(DEEP_WORK_STORAGE_KEY);
    if (!raw) {
      const now = new Date();
      return [
        {
          id: 'dw_seed_1',
          completedAt: new Date(now.getTime() - 1000 * 60 * 160).toISOString(),
          durationMinutes: 25,
          mode: 'pomodoro',
          subjectName: 'Engineering Mathematics',
          topic: 'First-Order Differential Equations',
          color: '#38bdf8',
        },
        {
          id: 'dw_seed_2',
          completedAt: new Date(now.getTime() - 1000 * 60 * 80).toISOString(),
          durationMinutes: 25,
          mode: 'pomodoro',
          subjectName: 'Data Structures & Algorithms',
          topic: 'Dynamic Programming & Memoization',
          color: '#34d399',
        },
      ];
    }
    return JSON.parse(raw) as DeepWorkSession[];
  } catch {
    return [];
  }
}

function saveDeepWorkSessions(sessions: DeepWorkSession[]) {
  try {
    localStorage.setItem(DEEP_WORK_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // ignore
  }
}

interface AppState {
  profile: StudentProfile | null;
  subjects: Subject[];
  sessions: StudySession[];
  tasks: StudyTask[];
  messages: ChatMessage[];
  syllabusTrackers: SyllabusSubjectTracker[];
  quizHistory: QuizAttemptRecord[];
  activeQuizTopic: { subjectName: string; topicTitle: string; difficulty?: 'Easy' | 'Medium' | 'Hard' } | null;
  activeResearchTarget: { subjectName: string; topicTitle: string } | null;
  setActiveQuizTopic: (target: { subjectName: string; topicTitle: string; difficulty?: 'Easy' | 'Medium' | 'Hard' } | null) => void;
  setActiveResearchTarget: (target: { subjectName: string; topicTitle: string } | null) => void;
  completeOnboarding: (profile: StudentProfile) => void;
  updateProfile: (profile: StudentProfile) => void;
  resetProfile: () => void;
  addSubject: (s: Subject) => void;
  updateSubject: (s: Subject) => void;
  deleteSubject: (id: string) => void;
  setPreparation: (id: string, value: number) => void;
  toggleTask: (id: string) => void;
  addMessage: (m: ChatMessage) => void;
  setSessions: (s: StudySession[]) => void;
  applyStudyPlanToPlanner: (
    subjectId: string,
    planItems: StudyPlanItem[],
    revisionBlocks?: RevisionPlanBlock[],
  ) => void;
  // Syllabus Tracker methods
  addSyllabusSubject: (subjectName: string, initialTopics?: string[]) => void;
  addSyllabusTopics: (subjectId: string, newTopics: string[]) => void;
  updateTopicStatus: (subjectId: string, topicId: string, status: TopicProgressStatus) => void;
  deleteSyllabusTopic: (subjectId: string, topicId: string) => void;
  deleteSyllabusSubject: (subjectId: string) => void;
  recordTopicQuizResult: (subjectName: string, topicTitle: string, scorePct: number) => void;
  // Quiz History methods
  addQuizAttempt: (record: QuizAttemptRecord) => void;
  clearQuizHistory: () => void;
  // Deep Work / Focus Timer methods
  deepWorkSessions: DeepWorkSession[];
  activeFocusTask: { subjectName?: string; topic?: string } | null;
  setActiveFocusTask: (task: { subjectName?: string; topic?: string } | null) => void;
  logDeepWorkSession: (session: Omit<DeepWorkSession, 'id' | 'completedAt'>) => DeepWorkSession;
  clearDeepWorkHistory: () => void;
}

const AppContext = createContext<AppState | null>(null);

let idCounter = 100;
function nextId(): string {
  idCounter += 1;
  return `gen${idCounter}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [syllabusTrackers, setSyllabusTrackers] = useState<SyllabusSubjectTracker[]>(() => loadSyllabusTrackers());
  const [quizHistory, setQuizHistory] = useState<QuizAttemptRecord[]>(() => loadQuizHistory());
  const [deepWorkSessions, setDeepWorkSessions] = useState<DeepWorkSession[]>(() => loadDeepWorkSessions());
  const [activeQuizTopic, setActiveQuizTopic] = useState<{ subjectName: string; topicTitle: string; difficulty?: 'Easy' | 'Medium' | 'Hard' } | null>(null);
  const [activeResearchTarget, setActiveResearchTarget] = useState<{ subjectName: string; topicTitle: string } | null>(null);
  const [activeFocusTask, setActiveFocusTask] = useState<{ subjectName?: string; topic?: string } | null>(null);

  // Sync / seed initial syllabus trackers from onboarded subjects if empty
  useEffect(() => {
    if (syllabusTrackers.length === 0 && subjects.length > 0) {
      const initialTrackers: SyllabusSubjectTracker[] = subjects.map((subj) => ({
        id: `syl_${subj.id}`,
        subjectName: subj.name,
        subjectCode: subj.code,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        topics: (subj.pendingTopics.length > 0
          ? subj.pendingTopics
          : ['Core Principles', 'Problem Solving Methods', 'Theory & Derivations', 'Previous Year Questions']
        ).map((t, idx) => ({
          id: `top_${subj.id}_${idx}_${Date.now()}`,
          title: t,
          status: idx === 0 ? 'in_progress' : 'not_started',
          updatedAt: new Date().toISOString(),
        })),
      }));
      setSyllabusTrackers(initialTrackers);
      saveSyllabusTrackers(initialTrackers);
    }
  }, [subjects, syllabusTrackers.length]);

  // Load profile from localStorage on mount
  useEffect(() => {
    const loaded = loadProfile();
    if (loaded && loaded.onboarded) {
      setProfile(loaded);
      const builtSubjects = buildSubjects(loaded.subjects);
      setSubjects(builtSubjects);
      setSessions(buildSessions(builtSubjects));
      setTasks(buildTasks(builtSubjects));
    }
  }, []);

  const completeOnboarding = (newProfile: StudentProfile) => {
    const full: StudentProfile = { ...newProfile, onboarded: true };
    setProfile(full);
    saveProfile(full);
    const builtSubjects = buildSubjects(full.subjects);
    setSubjects(builtSubjects);
    setSessions(buildSessions(builtSubjects));
    setTasks(buildTasks(builtSubjects));
  };

  const updateProfile = (updated: StudentProfile) => {
    const full: StudentProfile = { ...updated, onboarded: true };
    setProfile(full);
    saveProfile(full);
    // Rebuild subjects if subject seeds changed
    const builtSubjects = buildSubjects(full.subjects);
    setSubjects(builtSubjects);
    setSessions(buildSessions(builtSubjects));
    setTasks(buildTasks(builtSubjects));
  };

  const resetProfile = () => {
    setProfile(null);
    saveProfile(null);
    setSubjects([]);
    setSessions([]);
    setTasks([]);
    setMessages([]);
  };

  const addSubject = (s: Subject) => {
    if (!s.id) s.id = nextId();
    setSubjects((prev) => [...prev, s]);
  };

  const updateSubject = (updated: Subject) => {
    setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  const setPreparation = (id: string, value: number) => {
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              preparation: value,
              status: computeStatus(value),
            }
          : s
      )
    );
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const addMessage = (m: ChatMessage) => {
    if (!m.id) m.id = nextId();
    setMessages((prev) => [...prev, m]);
  };

  const applyStudyPlanToPlanner = (
    subjectId: string,
    planItems: StudyPlanItem[],
    revisionBlocks?: RevisionPlanBlock[],
  ) => {
    const targetSubject = subjects.find((s) => s.id === subjectId);
    if (!targetSubject) return;

    const newSessions: StudySession[] = [];
    const timeSlots = ['09:00', '11:00', '14:00', '16:00', '19:00'];

    planItems.forEach((item, index) => {
      const dayOffset = Math.floor(index / 2);
      const slotIndex = index % 2;
      const targetDate = addDays(today, dayOffset);

      newSessions.push({
        id: `plan-sess-${Date.now()}-${index}`,
        subjectId: targetSubject.id,
        subjectName: targetSubject.name,
        topic: `${item.topic}${item.startHereResource ? ` (Start: ${item.startHereResource.siteName})` : ''}`,
        day: dayLabel(targetDate),
        startTime: timeSlots[(slotIndex * 2) % timeSlots.length],
        duration: Math.min(120, Math.max(45, item.estimatedTime)),
        priority: item.priority,
        completed: false,
        color: targetSubject.color,
      });
    });

    if (revisionBlocks && revisionBlocks.length > 0) {
      revisionBlocks.forEach((rev, revIdx) => {
        const revDayOffset = Math.max(1, planItems.length > 0 ? Math.ceil(planItems.length / 2) + revIdx : 2 + revIdx);
        newSessions.push({
          id: `plan-rev-${Date.now()}-${revIdx}`,
          subjectId: targetSubject.id,
          subjectName: targetSubject.name,
          topic: `[${rev.type === 'mock_exam' ? 'Mock Exam' : 'Revision'}] ${rev.title}`,
          day: dayLabel(addDays(today, revDayOffset)),
          startTime: '10:00',
          duration: rev.durationMinutes || 90,
          priority: 'High',
          completed: false,
          color: '#fbbf24',
        });
      });
    }

    setSessions((prev) => {
      const others = prev.filter((s) => s.subjectId !== subjectId);
      return [...newSessions, ...others];
    });

    const newTasks: StudyTask[] = planItems.slice(0, 3).map((item, idx) => ({
      id: `plan-task-${Date.now()}-${idx}`,
      title: `Master ${item.topic} — ${targetSubject.name}`,
      subjectName: targetSubject.name,
      duration: `${item.estimatedTime} min`,
      priority: item.priority,
      done: false,
      color: targetSubject.color,
    }));

    setTasks((prev) => {
      const others = prev.filter((t) => t.subjectName !== targetSubject.name);
      return [...newTasks, ...others];
    });

    const updatedTopics = planItems.map((p) => p.topic);
    setSubjects((prev) =>
      prev.map((s) => (s.id === subjectId ? { ...s, pendingTopics: updatedTopics } : s))
    );
  };

  // --- Syllabus Tracker Implementations ---

  const addSyllabusSubject = (subjectName: string, initialTopics: string[] = []) => {
    const cleanName = subjectName.trim();
    if (!cleanName) return;

    setSyllabusTrackers((prev) => {
      const existing = prev.find((s) => s.subjectName.toLowerCase() === cleanName.toLowerCase());
      if (existing) return prev;

      const newSubject: SyllabusSubjectTracker = {
        id: `syl_${Date.now()}`,
        subjectName: cleanName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        topics: initialTopics.map((t, idx) => ({
          id: `top_${Date.now()}_${idx}`,
          title: t.trim(),
          status: 'not_started',
          updatedAt: new Date().toISOString(),
        })),
      };
      const updated = [...prev, newSubject];
      saveSyllabusTrackers(updated);
      return updated;
    });
  };

  const addSyllabusTopics = (subjectId: string, newTopics: string[]) => {
    if (newTopics.length === 0) return;
    setSyllabusTrackers((prev) => {
      const updated = prev.map((subj) => {
        if (subj.id !== subjectId) return subj;
        const existingTitles = new Set(subj.topics.map((t) => t.title.toLowerCase()));
        const uniqueToAdd = newTopics
          .map((t) => t.trim())
          .filter((t) => t.length > 0 && !existingTitles.has(t.toLowerCase()))
          .map((t, i) => ({
            id: `top_${Date.now()}_${i}`,
            title: t,
            status: 'not_started' as TopicProgressStatus,
            updatedAt: new Date().toISOString(),
          }));
        return {
          ...subj,
          topics: [...subj.topics, ...uniqueToAdd],
          updatedAt: new Date().toISOString(),
        };
      });
      saveSyllabusTrackers(updated);
      return updated;
    });
  };

  const updateTopicStatus = (subjectId: string, topicId: string, status: TopicProgressStatus) => {
    setSyllabusTrackers((prev) => {
      const updated = prev.map((subj) => {
        if (subj.id !== subjectId) return subj;
        const nextTopics = subj.topics.map((t) =>
          t.id === topicId ? { ...t, status, updatedAt: new Date().toISOString() } : t
        );
        return {
          ...subj,
          topics: nextTopics,
          updatedAt: new Date().toISOString(),
        };
      });
      saveSyllabusTrackers(updated);
      return updated;
    });
  };

  const deleteSyllabusTopic = (subjectId: string, topicId: string) => {
    setSyllabusTrackers((prev) => {
      const updated = prev.map((subj) => {
        if (subj.id !== subjectId) return subj;
        return {
          ...subj,
          topics: subj.topics.filter((t) => t.id !== topicId),
          updatedAt: new Date().toISOString(),
        };
      });
      saveSyllabusTrackers(updated);
      return updated;
    });
  };

  const deleteSyllabusSubject = (subjectId: string) => {
    setSyllabusTrackers((prev) => {
      const updated = prev.filter((s) => s.id !== subjectId);
      saveSyllabusTrackers(updated);
      return updated;
    });
  };

  const recordTopicQuizResult = (subjectName: string, topicTitle: string, scorePct: number) => {
    setSyllabusTrackers((prev) => {
      const updated = prev.map((subj) => {
        if (subj.subjectName.toLowerCase() !== subjectName.toLowerCase()) return subj;
        const nextTopics = subj.topics.map((t) => {
          if (t.title.toLowerCase() !== topicTitle.toLowerCase()) return t;
          // Auto-mark completed if score >= 80%, or in_progress if attempted
          const newStatus: TopicProgressStatus =
            scorePct >= 80 ? 'completed' : t.status === 'completed' ? 'completed' : 'in_progress';
          return {
            ...t,
            status: newStatus,
            lastScorePct: scorePct,
            lastQuizDate: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
        return { ...subj, topics: nextTopics, updatedAt: new Date().toISOString() };
      });
      saveSyllabusTrackers(updated);
      return updated;
    });
  };

  // --- Quiz History Implementations ---

  const addQuizAttempt = (record: QuizAttemptRecord) => {
    setQuizHistory((prev) => {
      const updated = [record, ...prev];
      saveQuizHistory(updated);
      return updated;
    });
    // Also link back to tracker
    recordTopicQuizResult(record.subjectName, record.topicTitle, record.scorePct);
  };

  const clearQuizHistory = () => {
    setQuizHistory([]);
    saveQuizHistory([]);
  };

  // --- Deep Work Focus Timer Implementations ---

  const logDeepWorkSession = (session: Omit<DeepWorkSession, 'id' | 'completedAt'>): DeepWorkSession => {
    const newSession: DeepWorkSession = {
      ...session,
      id: `dw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      completedAt: new Date().toISOString(),
    };
    setDeepWorkSessions((prev) => {
      const updated = [newSession, ...prev];
      saveDeepWorkSessions(updated);
      return updated;
    });
    return newSession;
  };

  const clearDeepWorkHistory = () => {
    setDeepWorkSessions([]);
    saveDeepWorkSessions([]);
  };

  return (
    <AppContext.Provider
      value={{
        profile,
        subjects,
        sessions,
        tasks,
        messages,
        syllabusTrackers,
        quizHistory,
        activeQuizTopic,
        activeResearchTarget,
        setActiveQuizTopic,
        setActiveResearchTarget,
        completeOnboarding,
        updateProfile,
        resetProfile,
        addSubject,
        updateSubject,
        deleteSubject,
        setPreparation,
        toggleTask,
        addMessage,
        setSessions,
        applyStudyPlanToPlanner,
        addSyllabusSubject,
        addSyllabusTopics,
        updateTopicStatus,
        deleteSyllabusTopic,
        deleteSyllabusSubject,
        recordTopicQuizResult,
        addQuizAttempt,
        clearQuizHistory,
        deepWorkSessions,
        activeFocusTask,
        setActiveFocusTask,
        logDeepWorkSession,
        clearDeepWorkHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// Helper to get display subtitle from profile
export function getProfileSubtitle(profile: StudentProfile): string {
  if (profile.educationLevel === 'school') {
    const parts: string[] = [];
    if (profile.grade) parts.push(`Class ${profile.grade}`);
    if (profile.board) parts.push(profile.board);
    return parts.join(' · ');
  }
  const parts: string[] = [];
  if (profile.program) parts.push(profile.program);
  if (profile.yearOrSemester) parts.push(profile.yearOrSemester);
  if (profile.university) parts.push(profile.university);
  return parts.join(' · ');
}

export function getProfileInitials(profile: StudentProfile): string {
  const names = profile.name.trim().split(/\s+/);
  if (names.length >= 2) return (names[0][0] + names[1][0]).toUpperCase();
  return profile.name.substring(0, 2).toUpperCase();
}

export { computeStatus, computeDifficulty };
