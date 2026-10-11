export type ViewKey =
  | 'dashboard'
  | 'syllabus'
  | 'quiz'
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

export type ResourceCategory = 'youtube' | 'website' | 'course' | 'notes' | 'paper';

export interface ResearchResource {
  position: number;
  title: string;
  url: string;
  snippet: string;
  siteName: string;
  topic: string;
  relevance: string;
  category?: ResourceCategory;
  isVerifiedResult?: boolean; // true if live result from API, false if direct platform search link
  isStartHere?: boolean;
}

export interface RevisionPlanBlock {
  id: string;
  title: string;
  description: string;
  dayTarget: string;
  durationMinutes: number;
  type: 'revision' | 'practice' | 'mock_exam';
  completed: boolean;
}

export interface StudyPlanItem {
  topic: string;
  priority: 'High' | 'Medium' | 'Low';
  phase?: string;
  dayTarget?: string;
  estimatedTime: number; // minutes
  conceptMinutes?: number;
  practiceMinutes?: number;
  revisionMinutes?: number;
  startHereResource?: ResearchResource;
  resources: ResearchResource[];
  completed: boolean;
}

export type YouTubeResourceType = 'channel' | 'playlist' | 'video';

export interface YouTubeChannelDiscovery {
  id: string;
  channelName: string;
  channelHandle?: string;
  channelUrl: string;
  focusArea: string;
  relevantTopics: string[];
  whyRelevant: string;
  resourceType: YouTubeResourceType;
  recommendedPlaylistTitle?: string;
  recommendedPlaylistUrl?: string;
  startLearningUrl: string;
  startLearningLabel: string;
  isVerified: boolean;
  subscriberHint?: string;
}

export interface ResearchSession {
  subjectName: string;
  syllabusTopics: string[];
  examDate: string;
  availableHoursPerDay: number;
  resources: ResearchResource[];
  studyPlan: StudyPlanItem[];
  revisionBlocks?: RevisionPlanBlock[];
  youtubeChannels?: YouTubeChannelDiscovery[];
  createdAt: string;
  isLive: boolean; // true = live TinyFish results, false = demo/fallback
}

export interface BookmarkedYouTubeItem {
  id: string;
  bookmarkedAt: string;
  subjectName: string;
  channelName: string;
  channelHandle?: string;
  channelUrl: string;
  focusArea?: string;
  title: string;
  url: string;
  resourceType: YouTubeResourceType;
  whyRelevant?: string;
  subscriberHint?: string;
  relevantTopics?: string[];
  userNotes?: string;
}

export interface ResearchHistoryItem {
  id: string;
  createdAt: string;
  subjectId: string;
  subjectName: string;
  courseContext?: string;
  syllabusTopics: string[];
  examDate: string;
  availableHours: number;
  domainType: 'web' | 'research_paper';
  isLive: boolean;
  resources: ResearchResource[];
  studyPlan: StudyPlanItem[];
  revisionBlocks: RevisionPlanBlock[];
  youtubeChannels?: YouTubeChannelDiscovery[];
}

// --- Smart Syllabus Tracker ---

export type TopicProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface SyllabusTopicItem {
  id: string;
  title: string;
  status: TopicProgressStatus;
  updatedAt: string;
  lastScorePct?: number;
  lastQuizDate?: string;
  notes?: string;
}

export interface SyllabusSubjectTracker {
  id: string;
  subjectName: string;
  subjectCode?: string;
  topics: SyllabusTopicItem[];
  createdAt: string;
  updatedAt: string;
}

// --- Topic-Based Practice Quiz ---

export type QuizDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string]; // exactly 4 plausible choices
  correctAnswerIndex: number; // 0, 1, 2, or 3
  explanation: string;
  topicTag: string;
  difficulty: QuizDifficulty;
}

export interface QuizAttemptRecord {
  id: string;
  date: string;
  subjectName: string;
  topicTitle: string;
  difficulty: QuizDifficulty;
  totalQuestions: number;
  score: number;
  scorePct: number;
  questions: QuizQuestion[];
  userAnswers: Record<string, number>; // questionId -> selectedOptionIndex
}

// --- Deep Work / Pomodoro Focus Timer ---

export type FocusMode = 'pomodoro' | 'shortBreak' | 'longBreak';

export interface DeepWorkSession {
  id: string;
  completedAt: string;
  durationMinutes: number;
  mode: FocusMode;
  subjectId?: string;
  subjectName?: string;
  topic?: string;
  color?: string;
}

