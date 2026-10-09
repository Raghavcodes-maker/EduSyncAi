import type {
  Subject,
  StudySession,
  StudyTask,
  ExamItem,
} from './types';

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

export const subjects: Subject[] = [
  {
    id: 's1',
    name: 'Physics',
    code: 'PHY 301',
    preparation: 62,
    difficulty: 'Hard',
    pendingTopics: ['Quantum Mechanics', 'Wave Optics', 'Thermodynamics', 'Nuclear Physics'],
    examDate: formatISO(addDays(today, 5)),
    status: 'At Risk',
    color: '#38bdf8',
    credits: 4,
  },
  {
    id: 's2',
    name: 'Mathematics',
    code: 'MATH 210',
    preparation: 78,
    difficulty: 'Moderate',
    pendingTopics: ['Linear Algebra', 'Differential Equations', 'Probability'],
    examDate: formatISO(addDays(today, 12)),
    status: 'On Track',
    color: '#34d399',
    credits: 3,
  },
  {
    id: 's3',
    name: 'Programming',
    code: 'CS 250',
    preparation: 85,
    difficulty: 'Moderate',
    pendingTopics: ['Graph Algorithms', 'Dynamic Programming'],
    examDate: formatISO(addDays(today, 18)),
    status: 'On Track',
    color: '#fbbf24',
    credits: 3,
  },
  {
    id: 's4',
    name: 'Data Structures',
    code: 'CS 201',
    preparation: 45,
    difficulty: 'Hard',
    pendingTopics: ['AVL Trees', 'Hash Tables', 'Graph Traversals', 'Red-Black Trees'],
    examDate: formatISO(addDays(today, 3)),
    status: 'Critical',
    color: '#f87171',
    credits: 4,
  },
  {
    id: 's5',
    name: 'English',
    code: 'ENG 101',
    preparation: 90,
    difficulty: 'Easy',
    pendingTopics: ['Final Essay'],
    examDate: formatISO(addDays(today, 22)),
    status: 'On Track',
    color: '#a78bfa',
    credits: 2,
  },
];

export const studySessions: StudySession[] = [
  {
    id: 'sess1',
    subjectId: 's4',
    subjectName: 'Data Structures',
    topic: 'AVL Trees — Rotations & Balancing',
    day: dayLabel(today),
    startTime: '09:00',
    duration: 90,
    priority: 'High',
    completed: false,
    color: '#f87171',
  },
  {
    id: 'sess2',
    subjectId: 's1',
    subjectName: 'Physics',
    topic: 'Quantum Mechanics — Schrödinger Equation',
    day: dayLabel(today),
    startTime: '14:00',
    duration: 120,
    priority: 'High',
    completed: false,
    color: '#38bdf8',
  },
  {
    id: 'sess3',
    subjectId: 's2',
    subjectName: 'Mathematics',
    topic: 'Differential Equations — First Order ODEs',
    day: dayLabel(addDays(today, 1)),
    startTime: '10:00',
    duration: 60,
    priority: 'Medium',
    completed: false,
    color: '#34d399',
  },
  {
    id: 'sess4',
    subjectId: 's1',
    subjectName: 'Physics',
    topic: 'Wave Optics — Interference & Diffraction',
    day: dayLabel(addDays(today, 1)),
    startTime: '16:00',
    duration: 90,
    priority: 'High',
    completed: false,
    color: '#38bdf8',
  },
  {
    id: 'sess5',
    subjectId: 's3',
    subjectName: 'Programming',
    topic: 'Dynamic Programming — Knapsack Problem',
    day: dayLabel(addDays(today, 2)),
    startTime: '11:00',
    duration: 75,
    priority: 'Medium',
    completed: false,
    color: '#fbbf24',
  },
  {
    id: 'sess6',
    subjectId: 's4',
    subjectName: 'Data Structures',
    topic: 'Hash Tables — Collision Resolution',
    day: dayLabel(addDays(today, 2)),
    startTime: '15:00',
    duration: 60,
    priority: 'High',
    completed: false,
    color: '#f87171',
  },
  {
    id: 'sess7',
    subjectId: 's2',
    subjectName: 'Mathematics',
    topic: 'Probability — Bayes Theorem',
    day: dayLabel(addDays(today, 3)),
    startTime: '09:30',
    duration: 60,
    priority: 'Low',
    completed: false,
    color: '#34d399',
  },
];

export const todayTasks: StudyTask[] = [
  {
    id: 't1',
    title: 'Review AVL Tree Rotations',
    subjectName: 'Data Structures',
    duration: '45 min',
    priority: 'High',
    done: false,
    color: '#f87171',
  },
  {
    id: 't2',
    title: 'Solve Quantum Mechanics Problems Set 3',
    subjectName: 'Physics',
    duration: '60 min',
    priority: 'High',
    done: false,
    color: '#38bdf8',
  },
  {
    id: 't3',
    title: 'Read: First Order Differential Equations',
    subjectName: 'Mathematics',
    duration: '30 min',
    priority: 'Medium',
    done: true,
    color: '#34d399',
  },
  {
    id: 't4',
    title: 'Practice: Knapsack DP Variants',
    subjectName: 'Programming',
    duration: '40 min',
    priority: 'Medium',
    done: false,
    color: '#fbbf24',
  },
];

export const upcomingExams: ExamItem[] = [
  {
    id: 'e1',
    subjectName: 'Data Structures',
    subjectCode: 'CS 201',
    date: formatISO(addDays(today, 3)),
    daysUntil: 3,
    color: '#f87171',
    preparation: 45,
  },
  {
    id: 'e2',
    subjectName: 'Physics',
    subjectCode: 'PHY 301',
    date: formatISO(addDays(today, 5)),
    daysUntil: 5,
    color: '#38bdf8',
    preparation: 62,
  },
  {
    id: 'e3',
    subjectName: 'Mathematics',
    subjectCode: 'MATH 210',
    date: formatISO(addDays(today, 12)),
    daysUntil: 12,
    color: '#34d399',
    preparation: 78,
  },
];

export const weeklyStudyData = [
  { day: 'Mon', hours: 3.5, target: 4 },
  { day: 'Tue', hours: 4, target: 4 },
  { day: 'Wed', hours: 2, target: 4 },
  { day: 'Thu', hours: 4.5, target: 4 },
  { day: 'Fri', hours: 3, target: 4 },
  { day: 'Sat', hours: 5, target: 4 },
  { day: 'Sun', hours: 1.5, target: 4 },
];

export const academicPriorities = [
  {
    id: 'p1',
    label: 'Data Structures exam in 3 days — only 45% prepared',
    level: 'Critical',
    subjectColor: '#f87171',
  },
  {
    id: 'p2',
    label: 'Physics exam in 5 days — 4 pending topics remaining',
    level: 'High',
    subjectColor: '#38bdf8',
  },
  {
    id: 'p3',
    label: 'Wednesday study session missed — reschedule needed',
    level: 'Medium',
    subjectColor: '#fbbf24',
  },
];

export const studentProfile = {
  name: 'Alex Rivera',
  semester: '5th Semester',
  program: 'B.S. Computer Science',
  gpa: '3.6',
  avatarInitials: 'AR',
};
