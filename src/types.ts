export type ViewKey =
  | 'dashboard'
  | 'subjects'
  | 'planner'
  | 'research'
  | 'simulator'
  | 'assistant'
  | 'profile';

export type Difficulty = 'Easy' | 'Moderate' | 'Hard';

export type SubjectStatus = 'On Track' | 'At Risk' | 'Critical' | 'Completed';

export interface Subject {
  id: string;
  name: string;
  code: string;
  preparation: number;
  difficulty: Difficulty;
  pendingTopics: string[];
  examDate: string;
  status: SubjectStatus;
  color: string;
  credits: number;
}

export interface StudySession {
  id: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  day: string;
  startTime: string;
  duration: number;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  color: string;
}

export interface StudyTask {
  id: string;
  title: string;
  subjectName: string;
  duration: string;
  priority: 'High' | 'Medium' | 'Low';
  done: boolean;
  color: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

export interface ExamItem {
  id: string;
  subjectName: string;
  subjectCode: string;
  date: string;
  daysUntil: number;
  color: string;
  preparation: number;
}

// --- Student profile & onboarding ---

export type EducationLevel = 'school' | 'college';

export type SchoolBoard = 'CBSE' | 'ICSE' | 'State Board' | 'Other';

export type CollegeProgram =
  | 'B.Tech'
  | 'BCA'
  | 'B.Sc'
  | 'B.Com'
  | 'BA'
  | 'MBBS'
  | 'Other';

export interface SubjectSeed {
  name: string;
  examDate?: string;
  preparation: number;
}

export interface StudentProfile {
  name: string;
  educationLevel: EducationLevel;
  // School-specific
  grade?: string;
  board?: SchoolBoard;
  // College-specific
  university?: string;
  program?: string;
  yearOrSemester?: string;
  // Shared
  subjects: SubjectSeed[];
  onboarded: boolean;
}

export const SCHOOL_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'Computer Science',
  'Hindi',
  'Social Science',
  'Economics',
  'Accountancy',
  'Business Studies',
];

export const COLLEGE_SUBJECTS = [
  'Engineering Mathematics',
  'Applied Physics',
  'Applied Chemistry',
  'Programming in C',
  'Data Structures',
  'Digital Electronics',
  'Engineering Graphics',
  'Communication Skills',
  'Environmental Science',
];

export const SCHOOL_BOARDS: SchoolBoard[] = ['CBSE', 'ICSE', 'State Board', 'Other'];

export const COLLEGE_PROGRAMS: CollegeProgram[] = [
  'B.Tech',
  'BCA',
  'B.Sc',
  'B.Com',
  'BA',
  'MBBS',
  'Other',
];

// --- Research Agent ---

export interface ResearchResource {
  position: number;
  title: string;
  url: string;
  snippet: string;
  siteName: string;
  topic: string;
  relevance: string;
}

export interface StudyPlanItem {
  topic: string;
  priority: 'High' | 'Medium' | 'Low';
  estimatedTime: number; // minutes
  resources: ResearchResource[];
  completed: boolean;
}

export interface ResearchSession {
  subjectName: string;
  syllabusTopics: string[];
  examDate: string;
  availableHoursPerDay: number;
  resources: ResearchResource[];
  studyPlan: StudyPlanItem[];
  createdAt: string;
  isLive: boolean; // true = live TinyFish results, false = demo/fallback
}
