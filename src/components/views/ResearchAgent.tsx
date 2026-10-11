import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  BookOpen,
  Clock,
  CalendarClock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Sparkles,
  Video,
  GraduationCap,
  BookmarkCheck,
  Calendar,
  Layers,
  ArrowRight,
  RotateCcw,
  Compass,
  CheckCircle,
  History,
  Trash2,
  X,
  Youtube,
  PlaySquare,
  Filter,
  Bookmark,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ProgressBar from '@/components/ui/ProgressBar';
import MyLibraryView from './MyLibraryView';
import { useApp, getProfileSubtitle } from '@/context/AppContext';
import { searchTopic, discoverYouTubeChannels } from '@/lib/tinyfish';
import type {
  ResearchResource,
  StudyPlanItem,
  RevisionPlanBlock,
  ResearchHistoryItem,
  YouTubeChannelDiscovery,
  BookmarkedYouTubeItem,
  ViewKey,
} from '@/types';

type ResearchState = 'idle' | 'searching' | 'planning' | 'done' | 'error';
type ResultsTab = 'plan' | 'youtube' | 'library' | 'resources';

interface ResearchAgentProps {
  onNavigate?: (view: ViewKey) => void;
}

const HISTORY_STORAGE_KEY = 'edusync_research_history_v1';
const BOOKMARKS_STORAGE_KEY = 'edusync_youtube_library_v1';

function loadResearchHistory(): ResearchHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ResearchHistoryItem[];
  } catch {
    return [];
  }
}

function saveResearchHistory(items: ResearchHistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function loadBookmarkedYouTube(): BookmarkedYouTubeItem[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BookmarkedYouTubeItem[];
  } catch {
    return [];
  }
}

function saveBookmarkedYouTube(items: BookmarkedYouTubeItem[]) {
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function formatHistoryTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 2) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export default function ResearchAgent({ onNavigate }: ResearchAgentProps) {
  const {
    subjects,
    profile,
    applyStudyPlanToPlanner,
    activeResearchTarget,
    setActiveQuizTopic,
  } = useApp();

  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id ?? '');
  const [courseContext, setCourseContext] = useState('');
  const [syllabusInput, setSyllabusInput] = useState('');
  const [examDate, setExamDate] = useState('');
  const [availableHours, setAvailableHours] = useState(3);
  const [domainType, setDomainType] = useState<'web' | 'research_paper'>('web');

  const [state, setState] = useState<ResearchState>('idle');
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchStepText, setSearchStepText] = useState('');
  const [currentTopic, setCurrentTopic] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [unconfiguredNotice, setUnconfiguredNotice] = useState('');

  const [resources, setResources] = useState<ResearchResource[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyPlanItem[]>([]);
  const [revisionBlocks, setRevisionBlocks] = useState<RevisionPlanBlock[]>([]);
  const [youtubeChannels, setYouTubeChannels] = useState<YouTubeChannelDiscovery[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>('plan');
  const [planSynced, setPlanSynced] = useState(false);

  // Sync if activeResearchTarget is set (e.g. from Syllabus Tracker)
  useEffect(() => {
    if (activeResearchTarget) {
      const matchSubject = subjects.find(
        (s) => s.name.toLowerCase() === activeResearchTarget.subjectName.toLowerCase()
      );
      if (matchSubject) {
        setSelectedSubjectId(matchSubject.id);
      }
      setSyllabusInput(activeResearchTarget.topicTitle);
    }
  }, [activeResearchTarget, subjects]);

  // YouTube Channel filters
  const [ytTopicFilter, setYtTopicFilter] = useState<string>('all');
  const [ytTypeFilter, setYtTypeFilter] = useState<string>('all');

  // Persistent Search History State
  const [history, setHistory] = useState<ResearchHistoryItem[]>(() => loadResearchHistory());
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Persistent 'My Library' Bookmarks State
  const [bookmarks, setBookmarks] = useState<BookmarkedYouTubeItem[]>(() => loadBookmarkedYouTube());
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [librarySubjectFilter, setLibrarySubjectFilter] = useState('all');
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<'all' | 'channel' | 'playlist' | 'video'>('all');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [activeMainMode, setActiveMainMode] = useState<'research' | 'library' | 'history'>('research');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Initialize course context and initial dates from profile/subject
  useEffect(() => {
    if (profile && !courseContext) {
      const subtitle = getProfileSubtitle(profile);
      if (subtitle) setCourseContext(subtitle);
    }
  }, [profile, courseContext]);

  useEffect(() => {
    if (selectedSubject) {
      if (selectedSubject.examDate && !examDate) {
        setExamDate(selectedSubject.examDate);
      }
      if (!syllabusInput && selectedSubject.pendingTopics.length > 0) {
        setSyllabusInput(selectedSubject.pendingTopics.join('\n'));
      }
    }
  }, [selectedSubject, examDate, syllabusInput]);

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
      prev.map((p) => (p.topic === topic ? { ...p, completed: !p.completed } : p))
    );
  };

  const toggleRevisionBlock = (id: string) => {
    setRevisionBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, completed: !b.completed } : b))
    );
  };

  const loadPendingTopics = () => {
    if (selectedSubject && selectedSubject.pendingTopics.length > 0) {
      setSyllabusInput(selectedSubject.pendingTopics.join('\n'));
    }
  };

  // Bookmark toggling handlers
  const isChannelBookmarked = (channelId: string) => {
    return bookmarks.some((b) => b.id === channelId);
  };

  const isResourceBookmarked = (url: string) => {
    return bookmarks.some((b) => b.url === url || b.id === url);
  };

  const toggleBookmarkChannel = (channel: YouTubeChannelDiscovery) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.id === channel.id);
      let updated: BookmarkedYouTubeItem[];
      if (exists) {
        updated = prev.filter((b) => b.id !== channel.id);
        showToast(`Removed "${channel.channelName}" from My Library`);
      } else {
        const newItem: BookmarkedYouTubeItem = {
          id: channel.id,
          bookmarkedAt: new Date().toISOString(),
          subjectName: selectedSubject?.name || 'General',
          channelName: channel.channelName,
          channelHandle: channel.channelHandle,
          channelUrl: channel.channelUrl,
          focusArea: channel.focusArea,
          title: channel.recommendedPlaylistTitle || `${channel.channelName} Course Playlist`,
          url: channel.startLearningUrl,
          resourceType: channel.resourceType,
          whyRelevant: channel.whyRelevant,
          subscriberHint: channel.subscriberHint,
          relevantTopics: channel.relevantTopics,
        };
        updated = [newItem, ...prev];
        showToast(`Saved "${channel.channelName}" to My Library! 📚`);
      }
      saveBookmarkedYouTube(updated);
      return updated;
    });
  };

  const toggleBookmarkResource = (resource: ResearchResource) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.url === resource.url || b.id === resource.url);
      let updated: BookmarkedYouTubeItem[];
      if (exists) {
        updated = prev.filter((b) => b.url !== resource.url && b.id !== resource.url);
        showToast(`Removed video from My Library`);
      } else {
        const isPlaylist = resource.url.includes('playlist') || resource.title.toLowerCase().includes('playlist');
        const newItem: BookmarkedYouTubeItem = {
          id: resource.url,
          bookmarkedAt: new Date().toISOString(),
          subjectName: selectedSubject?.name || 'General',
          channelName: resource.siteName.replace(' - YouTube', '').trim() || 'YouTube',
          channelUrl: resource.url,
          title: resource.title,
          url: resource.url,
          resourceType: isPlaylist ? 'playlist' : 'video',
          whyRelevant: resource.relevance,
          relevantTopics: [resource.topic],
        };
        updated = [newItem, ...prev];
        showToast(`Saved "${resource.title.slice(0, 32)}..." to My Library! 📚`);
      }
      saveBookmarkedYouTube(updated);
      return updated;
    });
  };

  const removeBookmark = (id: string) => {
    setBookmarks((prev) => {
      const item = prev.find((b) => b.id === id);
      const updated = prev.filter((b) => b.id !== id);
      saveBookmarkedYouTube(updated);
      showToast(item ? `Removed "${item.channelName}" from My Library` : 'Removed from Library');
      return updated;
    });
  };

  const clearAllBookmarks = () => {
    setBookmarks([]);
    saveBookmarkedYouTube([]);
    showToast('Cleared all items from My Library');
  };

  const handleSaveNote = (id: string) => {
    setBookmarks((prev) => {
      const updated = prev.map((b) =>
        b.id === id ? { ...b, userNotes: noteDraft.trim() || undefined } : b
      );
      saveBookmarkedYouTube(updated);
      return updated;
    });
    setEditingNoteId(null);
    setNoteDraft('');
    showToast('Personal study note saved! ✍️');
  };

  const handleCopyLink = (item: BookmarkedYouTubeItem) => {
    const url = item.url || item.channelUrl;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
    }
    setCopiedId(item.id);
    showToast(`Link for "${item.channelName}" copied! 📋`);
    setTimeout(() => {
      setCopiedId((cur) => (cur === item.id ? null : cur));
    }, 2000);
  };

  const handleExportLibrary = () => {
    if (bookmarks.length === 0) return;
    const text = bookmarks
      .map(
        (b, i) =>
          `${i + 1}. [${b.resourceType.toUpperCase()}] ${b.channelName} — ${b.title}\n` +
          `   Subject: ${b.subjectName}\n` +
          `   URL: ${b.url}\n` +
          (b.whyRelevant ? `   Relevance: ${b.whyRelevant}\n` : '') +
          (b.userNotes ? `   Study Note: ${b.userNotes}\n` : '')
      )
      .join('\n');
    const header = `EduSync AI — My Saved YouTube Study Library (${bookmarks.length} resources)\n\n`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(header + text);
    }
    showToast(`All ${bookmarks.length} saved YouTube study resources copied! 📋`);
  };

  const handleResearch = async () => {
    if (!selectedSubject || syllabusTopics.length === 0) return;

    setState('searching');
    setSearchProgress(0);
    setErrorMsg('');
    setUnconfiguredNotice('');
    setResources([]);
    setStudyPlan([]);
    setRevisionBlocks([]);
    setYouTubeChannels([]);
    setExpandedTopic(null);
    setPlanSynced(false);
    setActiveResultsTab('plan');
    setYtTopicFilter('all');
    setYtTypeFilter('all');

    const examDays = examDate
      ? Math.max(1, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000))
      : 14;

    const allResources: ResearchResource[] = [];
    const topicResources: Record<string, ResearchResource[]> = {};
    let anyLive = false;
    let fallbackNoticeMsg = '';

    // Step 1: Query educational resources for each syllabus topic
    for (let i = 0; i < syllabusTopics.length; i++) {
      const topic = syllabusTopics[i];
      setCurrentTopic(topic);
      setSearchStepText(`Researching resources for: "${topic}"`);
      setSearchProgress(Math.round(((i + 1) / (syllabusTopics.length + 1)) * 80));

      const result = await searchTopic(topic, selectedSubject.name, domainType, courseContext);

      if (result.unconfiguredReason && !fallbackNoticeMsg) {
        fallbackNoticeMsg = result.unconfiguredReason;
      }

      if (result.isLive) {
        anyLive = true;
      }

      topicResources[topic] = result.resources;
      allResources.push(...result.resources);

      await new Promise((r) => setTimeout(r, 200));
    }

    setResources(allResources);
    setIsLive(anyLive);
    setUnconfiguredNotice(fallbackNoticeMsg);

    // Step 2: Discover verified educational YouTube channels & playlists
    setSearchStepText('Matching authoritative YouTube channels & full syllabus playlists...');
    const channels = discoverYouTubeChannels(
      syllabusTopics,
      selectedSubject.name,
      courseContext,
      allResources
    );
    setYouTubeChannels(channels);

    // Step 3: Planning & schedule construction
    setState('planning');
    setCurrentTopic('');
    setSearchStepText('Synthesizing study schedule, revision blocks & "Start Here" pathways...');
    setSearchProgress(95);

    await new Promise((r) => setTimeout(r, 450));

    // Time calculations
    const totalAvailableMinutes = availableHours * 60 * examDays;
    const coreStudyMinutesTotal = Math.floor(totalAvailableMinutes * 0.7);
    const perTopicMinutes = Math.max(
      45,
      Math.floor(coreStudyMinutesTotal / Math.max(1, syllabusTopics.length))
    );

    // Build study plan items
    const plan: StudyPlanItem[] = syllabusTopics.map((topic, i) => {
      const urgency = i / syllabusTopics.length;
      const priority: StudyPlanItem['priority'] =
        urgency < 0.35 ? 'High' : urgency < 0.7 ? 'Medium' : 'Low';

      const resList = topicResources[topic] ?? [];
      const startHere = resList.find((r) => r.isStartHere) || resList[0];

      const startDay = Math.floor((i / syllabusTopics.length) * (examDays * 0.7)) + 1;
      const endDay = Math.min(
        examDays,
        startDay + Math.max(1, Math.ceil(examDays / syllabusTopics.length)) - 1
      );

      const conceptMins = Math.round(perTopicMinutes * 0.55);
      const practiceMins = perTopicMinutes - conceptMins;

      let phase = 'Phase 1: Foundation';
      if (urgency > 0.6) phase = 'Phase 3: Advanced Mastery';
      else if (urgency > 0.3) phase = 'Phase 2: Core Application';

      return {
        topic,
        priority,
        phase,
        dayTarget: startDay === endDay ? `Day ${startDay}` : `Days ${startDay}–${endDay}`,
        estimatedTime: perTopicMinutes,
        conceptMinutes: conceptMins,
        practiceMinutes: practiceMins,
        revisionMinutes: Math.round(perTopicMinutes * 0.2),
        startHereResource: startHere,
        resources: resList,
        completed: false,
      };
    });

    // Build dedicated Revision & Exam blocks
    const revisionDaysStart = Math.max(1, Math.floor(examDays * 0.75));
    const generatedRevisionBlocks: RevisionPlanBlock[] = [
      {
        id: 'rev-1',
        title: `Comprehensive Formula & Key Concept Sheet Review`,
        description: `Active recall and quick cheat-sheet consolidation for all ${syllabusTopics.length} syllabus topics in ${selectedSubject.name}.`,
        dayTarget: `Day ${revisionDaysStart}`,
        durationMinutes: 90,
        type: 'revision',
        completed: false,
      },
      {
        id: 'rev-2',
        title: `Timed Past-Exam Paper Simulation & Problem Solving`,
        description: `Simulate actual exam conditions with timed question sets covering high-priority areas.`,
        dayTarget: `Day ${Math.min(examDays, revisionDaysStart + 1)}`,
        durationMinutes: 120,
        type: 'mock_exam',
        completed: false,
      },
      {
        id: 'rev-3',
        title: `Weak-Spot Drill & Final Rapid Recap`,
        description: `Target remaining challenging questions, revisit Start Here lecture summaries, and calm exam prep.`,
        dayTarget: `Day ${examDays}`,
        durationMinutes: 60,
        type: 'practice',
        completed: false,
      },
    ];

    setStudyPlan(plan);
    setRevisionBlocks(generatedRevisionBlocks);
    if (plan.length > 0) {
      setExpandedTopic(plan[0].topic);
    }
    setState('done');

    // Automatically persist to Research History
    const historyEntry: ResearchHistoryItem = {
      id: `hist_${Date.now()}`,
      createdAt: new Date().toISOString(),
      subjectId: selectedSubject.id,
      subjectName: selectedSubject.name,
      courseContext: courseContext || undefined,
      syllabusTopics: [...syllabusTopics],
      examDate,
      availableHours,
      domainType,
      isLive: anyLive,
      resources: allResources,
      studyPlan: plan,
      revisionBlocks: generatedRevisionBlocks,
      youtubeChannels: channels,
    };

    setHistory((prev) => {
      const filtered = prev.filter(
        (h) =>
          !(
            h.subjectId === historyEntry.subjectId &&
            h.syllabusTopics.join('|') === historyEntry.syllabusTopics.join('|')
          )
      );
      const updated = [historyEntry, ...filtered].slice(0, 30);
      saveResearchHistory(updated);
      return updated;
    });
  };

  const handleReset = () => {
    setState('idle');
    setResources([]);
    setStudyPlan([]);
    setRevisionBlocks([]);
    setYouTubeChannels([]);
    setErrorMsg('');
    setUnconfiguredNotice('');
    setSearchProgress(0);
    setExpandedTopic(null);
    setPlanSynced(false);
  };

  const handleSyncToPlanner = () => {
    if (!selectedSubject || studyPlan.length === 0) return;
    applyStudyPlanToPlanner(selectedSubject.id, studyPlan, revisionBlocks);
    setPlanSynced(true);
  };

  // Revisit past research from history
  const handleLoadHistory = (item: ResearchHistoryItem) => {
    setSelectedSubjectId(item.subjectId);
    setCourseContext(item.courseContext || '');
    setSyllabusInput(item.syllabusTopics.join('\n'));
    setExamDate(item.examDate);
    setAvailableHours(item.availableHours);
    setDomainType(item.domainType);
    setResources(item.resources);
    setStudyPlan(item.studyPlan);
    setRevisionBlocks(item.revisionBlocks || []);
    setIsLive(item.isLive);
    if (item.youtubeChannels && item.youtubeChannels.length > 0) {
      setYouTubeChannels(item.youtubeChannels);
    } else {
      setYouTubeChannels(
        discoverYouTubeChannels(item.syllabusTopics, item.subjectName, item.courseContext, item.resources)
      );
    }
    setExpandedTopic(item.studyPlan[0]?.topic || null);
    setState('done');
    setPlanSynced(false);
    setShowHistoryModal(false);
    setActiveResultsTab('plan');
  };

  // Populate form from history to edit / re-run
  const handleEditFromHistory = (item: ResearchHistoryItem) => {
    setSelectedSubjectId(item.subjectId);
    setCourseContext(item.courseContext || '');
    setSyllabusInput(item.syllabusTopics.join('\n'));
    setExamDate(item.examDate);
    setAvailableHours(item.availableHours);
    setDomainType(item.domainType);
    setState('idle');
    setShowHistoryModal(false);
  };

  // Delete an individual history item
  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      saveResearchHistory(updated);
      return updated;
    });
  };

  // Clear entire history
  const handleClearAllHistory = () => {
    setHistory([]);
    saveResearchHistory([]);
  };

  // Filtered history list based on search query
  const filteredHistory = useMemo(() => {
    if (!historySearchQuery.trim()) return history;
    const q = historySearchQuery.toLowerCase();
    return history.filter(
      (h) =>
        h.subjectName.toLowerCase().includes(q) ||
        (h.courseContext && h.courseContext.toLowerCase().includes(q)) ||
        h.syllabusTopics.some((t) => t.toLowerCase().includes(q))
    );
  }, [history, historySearchQuery]);

  // Type counts for bookmarks
  const bookmarkTypeCounts = useMemo(() => {
    return {
      all: bookmarks.length,
      channel: bookmarks.filter((b) => b.resourceType === 'channel').length,
      playlist: bookmarks.filter((b) => b.resourceType === 'playlist').length,
      video: bookmarks.filter((b) => b.resourceType === 'video').length,
    };
  }, [bookmarks]);

  // Filtered bookmarks list
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((b) => {
      const q = librarySearchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        b.channelName.toLowerCase().includes(q) ||
        b.title.toLowerCase().includes(q) ||
        (b.userNotes && b.userNotes.toLowerCase().includes(q)) ||
        (b.focusArea && b.focusArea.toLowerCase().includes(q)) ||
        (b.relevantTopics &&
          b.relevantTopics.some((t) => t.toLowerCase().includes(q)));

      const matchesSubject =
        librarySubjectFilter === 'all' ||
        b.subjectName.toLowerCase() === librarySubjectFilter.toLowerCase();

      const matchesType =
        libraryTypeFilter === 'all' ||
        b.resourceType === libraryTypeFilter;

      return matchesSearch && matchesSubject && matchesType;
    });
  }, [bookmarks, librarySearchQuery, librarySubjectFilter, libraryTypeFilter]);

  // List of distinct subject names in bookmarks
  const bookmarkSubjects = useMemo(() => {
    const list = Array.from(new Set(bookmarks.map((b) => b.subjectName).filter(Boolean)));
    return list;
  }, [bookmarks]);

  // Filtered resources in done state
  const filteredResources = useMemo(() => {
    if (selectedCategoryFilter === 'all') return resources;
    return resources.filter((r) => r.category === selectedCategoryFilter);
  }, [resources, selectedCategoryFilter]);

  // Filtered YouTube channels
  const filteredYouTubeChannels = useMemo(() => {
    return youtubeChannels.filter((c) => {
      const matchesTopic =
        ytTopicFilter === 'all' ||
        c.relevantTopics.some((t) => t.toLowerCase() === ytTopicFilter.toLowerCase()) ||
        c.focusArea.toLowerCase().includes(ytTopicFilter.toLowerCase());

      const matchesType =
        ytTypeFilter === 'all' ||
        c.resourceType === ytTypeFilter ||
        (ytTypeFilter === 'channel' && c.resourceType === 'channel');

      return matchesTopic && matchesType;
    });
  }, [youtubeChannels, ytTopicFilter, ytTypeFilter]);

  // Total times
  const totalPlanHours = useMemo(() => {
    const studyMins = studyPlan.reduce((acc, curr) => acc + curr.estimatedTime, 0);
    const revMins = revisionBlocks.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    return ((studyMins + revMins) / 60).toFixed(1);
  }, [studyPlan, revisionBlocks]);

  if (subjects.length === 0) {
    return (
      <Card className="p-8 text-center">
        <BookOpen size={36} className="mx-auto text-slate-500 mb-3" />
        <h3 className="font-display font-semibold text-white text-base mb-1">No Subjects Found</h3>
        <p className="text-slate-400 text-sm mb-4">
          Add subjects in the Subjects tab or onboarding to use the Research Agent.
        </p>
        {onNavigate && (
          <Button variant="primary" size="sm" onClick={() => onNavigate('subjects')}>
            Go to Subjects
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header title & Navigation action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Compass className="text-sky-400" size={26} />
            Syllabus Research &amp; Study Planner
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Evidence-based academic research agent: discovers real learning resources, YouTube channel playlists,
            course notes, and builds an actionable study plan tailored to your exam schedule.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* My Library Button */}
          <button
            type="button"
            onClick={() => {
              if (state === 'idle') {
                setActiveMainMode('library');
              } else if (state === 'done') {
                setActiveResultsTab('library');
              } else {
                setShowLibraryModal(true);
              }
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all flex-shrink-0 cursor-pointer ${
              (state === 'idle' && activeMainMode === 'library') || (state === 'done' && activeResultsTab === 'library')
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-lg shadow-amber-500/20'
                : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/25 text-amber-300 hover:text-amber-200'
            }`}
          >
            <Bookmark size={15} className={bookmarks.length > 0 ? 'fill-current' : ''} />
            <span>My Library</span>
            {bookmarks.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                (state === 'idle' && activeMainMode === 'library') || (state === 'done' && activeResultsTab === 'library')
                  ? 'bg-slate-950 text-amber-300'
                  : 'bg-amber-500/30 text-amber-200'
              }`}>
                {bookmarks.length}
              </span>
            )}
          </button>

          {/* Research History Button */}
          <button
            type="button"
            onClick={() => {
              if (state === 'idle') {
                setActiveMainMode('history');
              } else {
                setShowHistoryModal(true);
              }
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all flex-shrink-0 cursor-pointer ${
              state === 'idle' && activeMainMode === 'history'
                ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow-lg shadow-sky-500/20'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 hover:text-white'
            }`}
          >
            <History size={15} className={state === 'idle' && activeMainMode === 'history' ? 'text-slate-950' : 'text-sky-400'} />
            <span>Research History</span>
            {history.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                state === 'idle' && activeMainMode === 'history'
                  ? 'bg-slate-950 text-sky-300'
                  : 'bg-sky-500/20 text-sky-300'
              }`}>
                {history.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Input Form State with Mode Navigation */}
      {state === 'idle' && (
        <div className="space-y-6">
          {/* Main Mode Navigation Bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
            <button
              type="button"
              onClick={() => setActiveMainMode('research')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeMainMode === 'research'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Compass size={15} />
              Syllabus Research &amp; Study Planner
            </button>

            <button
              type="button"
              onClick={() => setActiveMainMode('library')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeMainMode === 'library'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bookmark size={15} className={bookmarks.length > 0 ? 'fill-current' : ''} />
              My Library
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeMainMode === 'library' ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {bookmarks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainMode('history')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeMainMode === 'history'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <History size={15} />
              Search History
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeMainMode === 'history' ? 'bg-slate-950 text-sky-300' : 'bg-sky-500/20 text-sky-300'
              }`}>
                {history.length}
              </span>
            </button>
          </div>

          {/* Subview: Full My Library Workspace */}
          {activeMainMode === 'library' && (
            <MyLibraryView
              bookmarks={bookmarks}
              filteredBookmarks={filteredBookmarks}
              bookmarkTypeCounts={bookmarkTypeCounts}
              bookmarkSubjects={bookmarkSubjects}
              searchQuery={librarySearchQuery}
              onSearchChange={setLibrarySearchQuery}
              subjectFilter={librarySubjectFilter}
              onSubjectFilterChange={setLibrarySubjectFilter}
              typeFilter={libraryTypeFilter}
              onTypeFilterChange={setLibraryTypeFilter}
              editingNoteId={editingNoteId}
              noteDraft={noteDraft}
              onStartEditNote={(id, note) => {
                setEditingNoteId(id);
                setNoteDraft(note || '');
              }}
              onCancelEditNote={() => {
                setEditingNoteId(null);
                setNoteDraft('');
              }}
              onSaveNote={handleSaveNote}
              onNoteDraftChange={setNoteDraft}
              copiedId={copiedId}
              onCopyLink={handleCopyLink}
              onRemoveBookmark={removeBookmark}
              onClearAllBookmarks={clearAllBookmarks}
              onExportLibrary={handleExportLibrary}
              onBrowseYouTube={() => setActiveMainMode('research')}
              isModal={false}
            />
          )}

          {/* Subview: Search History in page */}
          {activeMainMode === 'history' && (
            <Card className="p-6 space-y-4" delay={0}>
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/8">
                <div>
                  <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                    <History size={18} className="text-sky-400" />
                    Syllabus Search &amp; Research History
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Revisit past syllabus queries, matched YouTube channels, and generated study schedules.
                  </p>
                </div>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} /> Clear History
                  </button>
                )}
              </div>

              {filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No search history found.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-white/4 hover:bg-white/7 border border-white/8 hover:border-sky-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-sm font-bold text-white">
                            {item.subjectName}
                          </span>
                          {item.courseContext && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-slate-300">
                              {item.courseContext}
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                            {item.youtubeChannels?.length || 0} channels
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          {item.syllabusTopics.length} topics: {item.syllabusTopics.slice(0, 3).join(', ')}
                          {item.syllabusTopics.length > 3 ? '...' : ''}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatHistoryTime(item.createdAt)} · {item.resources.length} resources discovered
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            handleLoadHistory(item);
                            setActiveMainMode('research');
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          Revisit Plan <ArrowRight size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHistoryItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Subview: Research Form */}
          {activeMainMode === 'research' && (
            <Card className="p-6 space-y-6" delay={0}>
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-200/90 leading-relaxed">
            <Info size={18} className="text-sky-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-sky-300">Authentic Resource &amp; YouTube Channel Discovery:</span>{' '}
              We match your exact syllabus topics to verified university channels (e.g. Gate Smashers, Abdul Bari, MIT OCW, 3Blue1Brown, NPTEL)
              and discover authentic video playlists, notes, and textbooks with clickable “Start Learning” links. You can bookmark any channel or video to your <strong className="text-amber-300">My Library</strong>.
            </div>
          </div>

          {/* Quick-Access Recent Searches Strip if history exists */}
          {history.length > 0 && (
            <div className="p-3.5 rounded-xl bg-white/3 border border-white/8 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <History size={13} className="text-sky-400" />
                  Recent Research Sessions
                </span>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-medium transition-colors"
                >
                  View All History ({history.length})
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {history.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadHistory(item)}
                    className="p-3 rounded-lg bg-white/5 hover:bg-white/8 border border-white/6 hover:border-sky-500/40 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white group-hover:text-sky-300 truncate">
                        {item.subjectName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatHistoryTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      {item.syllabusTopics.length} topics · {item.syllabusTopics.slice(0, 2).join(', ')}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5 text-[10px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Youtube size={11} className="text-red-400" />
                        {item.youtubeChannels?.length || 0} channels
                      </span>
                      <span className="text-sky-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Revisit <ArrowRight size={10} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick-Access Library Teaser if bookmarks exist */}
          {bookmarks.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Bookmark size={15} className="fill-amber-400 text-amber-400 flex-shrink-0" />
                <span className="text-xs text-amber-200">
                  You have <strong className="text-white">{bookmarks.length}</strong> saved YouTube {bookmarks.length === 1 ? 'channel/video' : 'channels/videos'} in your Library.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowLibraryModal(true)}
                className="text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 transition-colors flex-shrink-0"
              >
                Open Library <ArrowRight size={12} />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Subject selection */}
            <div>
              <label className="text-xs text-slate-300 font-medium mb-1.5 block">Target Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  const s = subjects.find((sub) => sub.id === e.target.value);
                  if (s) {
                    if (s.examDate) setExamDate(s.examDate);
                    if (s.pendingTopics.length > 0) {
                      setSyllabusInput(s.pendingTopics.join('\n'));
                    }
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-800">
                    {s.name} ({s.code}) — {s.preparation}% readiness
                  </option>
                ))}
              </select>
            </div>

            {/* Course / Academic level */}
            <div>
              <label className="text-xs text-slate-300 font-medium mb-1.5 block">
                Course / Academic Context{' '}
                <span className="text-slate-500 font-normal">(e.g. B.Tech CS, Class 12 CBSE, B.Sc)</span>
              </label>
              <input
                type="text"
                value={courseContext}
                onChange={(e) => setCourseContext(e.target.value)}
                placeholder="e.g. B.Tech Computer Science, Semester 4"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Syllabus Topics */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-slate-300 font-medium">
                Syllabus Topics <span className="text-slate-500 font-normal">(one per line or comma-separated)</span>
              </label>
              {selectedSubject && selectedSubject.pendingTopics.length > 0 && (
                <button
                  type="button"
                  onClick={loadPendingTopics}
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw size={11} /> Load {selectedSubject.name} Pending Topics
                </button>
              )}
            </div>
            <textarea
              value={syllabusInput}
              onChange={(e) => setSyllabusInput(e.target.value)}
              placeholder="e.g.&#10;Binary Search Trees &amp; AVL Balancing&#10;Graph Traversals (BFS &amp; DFS)&#10;Dynamic Programming &amp; Memoization&#10;Dijkstra's Shortest Path"
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors resize-none scrollbar-thin"
            />
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-slate-500">
                Be specific with chapter and topic names for optimal YouTube channel and playlist matching.
              </span>
              {syllabusTopics.length > 0 && (
                <span className="text-sky-400 font-medium">
                  {syllabusTopics.length} topic{syllabusTopics.length !== 1 ? 's' : ''} detected
                </span>
              )}
            </div>
          </div>

          {/* Exam Date & Daily Study Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
                <CalendarClock size={13} className="text-amber-400" /> Exam Date / Target Deadline
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                  <Clock size={13} className="text-sky-400" /> Available Study Hours Per Day
                </label>
                <span className="text-xs font-semibold text-sky-400">{availableHours} hrs / day</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                value={availableHours}
                onChange={(e) => setAvailableHours(parseInt(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>1h (Light)</span>
                <span>4h (Balanced)</span>
                <span>8h+ (Intensive)</span>
              </div>
            </div>
          </div>

          {/* Search Focus Domain */}
          <div>
            <label className="text-xs text-slate-300 font-medium mb-2 block">
              Academic Resource Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDomainType('web')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  domainType === 'web'
                    ? 'bg-sky-500/15 border-sky-500/40 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/8'
                }`}
              >
                <Video size={18} className={domainType === 'web' ? 'text-sky-400' : 'text-slate-500'} />
                <div>
                  <p className="text-sm font-semibold">YouTube Channels, Courses &amp; Textbooks</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    YouTube channel playlists, MIT OCW notes, Khan Academy &amp; OpenStax textbooks.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDomainType('research_paper')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  domainType === 'research_paper'
                    ? 'bg-sky-500/15 border-sky-500/40 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/8'
                }`}
              >
                <GraduationCap
                  size={18}
                  className={domainType === 'research_paper' ? 'text-sky-400' : 'text-slate-500'}
                />
                <div>
                  <p className="text-sm font-semibold">Research Papers &amp; Academic Surveys</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    arXiv preprints, Google Scholar surveys, Semantic Scholar citations.
                  </p>
                </div>
              </button>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            icon={<Search size={18} />}
            onClick={handleResearch}
            disabled={syllabusTopics.length === 0}
            className="w-full justify-center text-sm font-semibold py-3"
          >
            Discover YouTube Channels, Resources &amp; Generate Plan
          </Button>
        </Card>
      )}
    </div>
  )}

      {/* Searching State */}
      {(state === 'searching' || state === 'planning') && (
        <Card className="p-8 text-center" delay={0}>
          <div className="flex flex-col items-center max-w-md mx-auto">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-sky-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Search size={26} className="text-sky-400 animate-pulse" />
              </div>
            </div>

            <h3 className="font-display text-lg font-semibold text-white mb-1.5">
              {state === 'searching' ? 'Searching Syllabus Repositories & Channels' : 'Structuring Study Plan'}
            </h3>
            <p className="text-xs text-slate-400 mb-6 min-h-[32px]">
              {currentTopic ? `Searching: "${currentTopic}"` : searchStepText}
            </p>

            <div className="w-full">
              <ProgressBar value={searchProgress} color="#38bdf8" height="h-2" />
              <p className="text-[11px] text-slate-500 mt-2">{searchProgress}% complete</p>
            </div>
          </div>
        </Card>
      )}

      {/* Error State */}
      {state === 'error' && (
        <Card className="p-8 text-center" delay={0}>
          <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <h3 className="font-display font-semibold text-white text-lg mb-2">Research Search Paused</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">{errorMsg}</p>
          <Button variant="secondary" size="md" onClick={handleReset}>
            Adjust Search Settings
          </Button>
        </Card>
      )}

      {/* Done State: Study Plan & Discovered Resources */}
      {state === 'done' && (
        <div className="space-y-6">
          {/* Status Verification Banner & History saved indicator */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div
              className={`p-4 rounded-xl border flex items-start gap-3.5 flex-1 ${
                isLive
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
                  : 'bg-amber-500/10 border-amber-500/25 text-amber-200'
              }`}
            >
              {isLive ? (
                <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Info size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-xs leading-relaxed flex-1">
                {isLive ? (
                  <>
                    <strong className="font-semibold text-emerald-300 block mb-0.5">
                      Live Verified Results &amp; YouTube Channels Retrieved
                    </strong>
                    Resources were directly retrieved and validated from live academic search queries via TinyFish.
                  </>
                ) : (
                  <>
                    <strong className="font-semibold text-amber-300 block mb-0.5">
                      Verified Academic Channels &amp; Playlists Discovered
                    </strong>
                    {unconfiguredNotice ||
                      'Live TinyFish API key is not configured in environment variables.'}{' '}
                    To ensure complete accuracy, we matched your syllabus to verified university YouTube channels (Gate Smashers, Abdul Bari, MIT OCW, NPTEL)
                    with direct “Start Learning” links and syllabus queries.
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions summary card */}
            <div className="p-4 rounded-xl border border-white/10 bg-white/4 flex items-center justify-between gap-3 sm:w-64 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Bookmark size={16} className="text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">My Library</p>
                  <p className="text-[10px] text-slate-400">{bookmarks.length} saved resources</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLibraryModal(true)}
                className="text-xs text-amber-300 hover:text-amber-200 font-medium px-2 py-1 rounded-md hover:bg-white/5 transition-colors"
              >
                Open Library
              </button>
            </div>
          </div>

          {/* Sync Success Banner */}
          {planSynced && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-3">
                <CheckCircle size={22} className="text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    Study Plan Successfully Added to Your Schedule!
                  </p>
                  <p className="text-xs text-emerald-200/80">
                    Your sessions, practice hours, and revision blocks have been loaded into your Study Planner.
                  </p>
                </div>
              </div>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('planner')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 transition-colors flex items-center gap-1.5 flex-shrink-0"
                >
                  View Planner <ArrowRight size={13} />
                </button>
              )}
            </div>
          )}

          {/* Metrics summary card */}
          <Card className="p-5" delay={0}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
              <div className="pt-2 sm:pt-0">
                <p className="text-[11px] text-slate-400">Total Study Time</p>
                <p className="font-display text-xl font-bold text-white mt-1">{totalPlanHours} hrs</p>
                <p className="text-[10px] text-sky-400 mt-0.5">Concept + Practice + Revision</p>
              </div>

              <div className="pt-2 sm:pt-0 sm:pl-4">
                <p className="text-[11px] text-slate-400">Syllabus Topics</p>
                <p className="font-display text-xl font-bold text-white mt-1">{studyPlan.length}</p>
                <p className="text-[10px] text-emerald-400 mt-0.5">
                  {completedCount} completed ({progressPct}%)
                </p>
              </div>

              <div className="pt-2 sm:pt-0 sm:pl-4">
                <p className="text-[11px] text-slate-400">YouTube Channels Found</p>
                <p className="font-display text-xl font-bold text-red-400 mt-1 flex items-center gap-1.5">
                  <Youtube size={20} className="text-red-500" />
                  {youtubeChannels.length}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">University &amp; Exam Focused</p>
              </div>

              <div className="pt-2 sm:pt-0 sm:pl-4">
                <p className="text-[11px] text-slate-400">Target Exam</p>
                <p className="font-display text-xl font-bold text-white mt-1">
                  {examDate
                    ? new Date(examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '14 Days'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{selectedSubject?.name}</p>
              </div>
            </div>

            {/* Overall progress bar */}
            <div className="mt-4 pt-4 border-t border-white/8 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>Topic Completion Progress</span>
                  <span className="font-semibold text-white">{progressPct}%</span>
                </div>
                <ProgressBar value={progressPct} color="#38bdf8" height="h-2" />
              </div>
              <Button
                variant={planSynced ? 'secondary' : 'primary'}
                size="sm"
                icon={<BookmarkCheck size={15} />}
                onClick={handleSyncToPlanner}
                className="flex-shrink-0 text-xs"
              >
                {planSynced ? 'Re-Sync with Planner' : 'Add Plan to Study Planner'}
              </Button>
            </div>
          </Card>

          {/* Navigation View Tabs */}
          <div className="flex flex-wrap border-b border-white/10 gap-2">
            <button
              onClick={() => setActiveResultsTab('plan')}
              className={`pb-3 px-3.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeResultsTab === 'plan'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListChecks size={16} />
              Personalized Study Schedule
            </button>

            <button
              onClick={() => setActiveResultsTab('youtube')}
              className={`pb-3 px-3.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeResultsTab === 'youtube'
                  ? 'border-red-500 text-red-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Youtube size={16} className={activeResultsTab === 'youtube' ? 'text-red-500' : 'text-slate-400'} />
              YouTube Channel Discovery
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/20 text-red-300 font-bold">
                {youtubeChannels.length}
              </span>
            </button>

            <button
              onClick={() => setActiveResultsTab('library')}
              className={`pb-3 px-3.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeResultsTab === 'library'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bookmark size={16} className={activeResultsTab === 'library' ? 'text-amber-400 fill-amber-400' : 'text-slate-400'} />
              My Library
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                {bookmarks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveResultsTab('resources')}
              className={`pb-3 px-3.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeResultsTab === 'resources'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={16} />
              Master Resource Explorer ({resources.length})
            </button>
          </div>

          {/* TAB 1: Personalized Study Plan */}
          {activeResultsTab === 'plan' && (
            <div className="space-y-6">
              {/* YouTube Teaser Banner inside Study Plan */}
              {youtubeChannels.length > 0 && (
                <div
                  onClick={() => setActiveResultsTab('youtube')}
                  className="p-3.5 rounded-xl bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border border-red-500/20 flex items-center justify-between gap-3 cursor-pointer hover:border-red-500/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <Youtube size={18} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white group-hover:text-red-300 transition-colors">
                        {youtubeChannels.length} Verified Educational YouTube Channels Available
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {youtubeChannels.map((c) => c.channelName).slice(0, 3).join(', ')} &amp; more with full course playlists.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-red-400 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform flex-shrink-0">
                    Explore Channels <ArrowRight size={13} />
                  </span>
                </div>
              )}

              {/* Study plan items */}
              <div className="space-y-3">
                {studyPlan.map((item, idx) => {
                  const isExpanded = expandedTopic === item.topic;
                  const matchingChannel = youtubeChannels.find((c) =>
                    c.relevantTopics.some((t) => t.toLowerCase() === item.topic.toLowerCase())
                  );

                  return (
                    <Card
                      key={idx}
                      className={`overflow-hidden border transition-all ${
                        item.completed
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : isExpanded
                          ? 'border-sky-500/40 bg-sky-500/5'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                      delay={idx * 40}
                    >
                      {/* Header */}
                      <div className="p-4 flex items-start gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTopic(item.topic);
                          }}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                            item.completed
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold'
                              : 'border-white/30 hover:border-sky-400'
                          }`}
                        >
                          {item.completed && <CheckCircle2 size={14} className="stroke-[3]" />}
                        </button>

                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setExpandedTopic(isExpanded ? null : item.topic)}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              className={`text-sm font-semibold ${
                                item.completed ? 'text-slate-400 line-through' : 'text-white'
                              }`}
                            >
                              {item.topic}
                            </h3>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                item.priority === 'High'
                                  ? 'bg-red-500/15 text-red-300 border border-red-500/25'
                                  : item.priority === 'Medium'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                                  : 'bg-sky-500/15 text-sky-300 border border-sky-500/25'
                              }`}
                            >
                              {item.priority} Priority
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                              {item.dayTarget}
                            </span>
                            <span className="text-[10px] text-slate-400">({item.phase})</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1 font-medium text-slate-300">
                              <Clock size={12} className="text-sky-400" />
                              Total: {Math.floor(item.estimatedTime / 60)}h {item.estimatedTime % 60}m
                            </span>
                            <span className="text-slate-500">|</span>
                            <span>Concept Study: {item.conceptMinutes}m</span>
                            <span className="text-slate-500">|</span>
                            <span>Practice Drills: {item.practiceMinutes}m</span>
                          </div>

                          {!isExpanded && (
                            <div className="flex flex-wrap items-center gap-2 mt-2.5">
                              {item.startHereResource && (
                                <div className="flex items-center gap-2 text-xs text-sky-300 bg-sky-500/10 px-2.5 py-1.5 rounded-lg border border-sky-500/20 max-w-fit">
                                  <Sparkles size={13} className="text-sky-400" />
                                  <span>Start Here:</span>
                                  <span className="font-medium truncate max-w-[240px]">
                                    {item.startHereResource.title}
                                  </span>
                                </div>
                              )}
                              {matchingChannel && (
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={matchingChannel.startLearningUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1.5 text-xs text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1.5 rounded-lg border border-red-500/20 transition-colors"
                                  >
                                    <Youtube size={13} className="text-red-400" />
                                    <span>Watch on {matchingChannel.channelName}</span>
                                    <ExternalLink size={10} />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleBookmarkChannel(matchingChannel);
                                    }}
                                    className={`p-1.5 rounded-lg border transition-colors ${
                                      isChannelBookmarked(matchingChannel.id)
                                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-amber-300'
                                    }`}
                                    title={isChannelBookmarked(matchingChannel.id) ? 'Remove from Library' : 'Save to Library'}
                                  >
                                    <Bookmark size={13} className={isChannelBookmarked(matchingChannel.id) ? 'fill-amber-400 text-amber-400' : ''} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {onNavigate && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveQuizTopic({
                                  subjectName: selectedSubject?.name || 'General',
                                  topicTitle: item.topic,
                                  difficulty: 'Medium',
                                });
                                onNavigate('quiz');
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/25 transition-all flex items-center gap-1 cursor-pointer"
                              title="Start Practice Quiz for this topic"
                            >
                              <Sparkles size={12} />
                              <span>Quiz</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedTopic(isExpanded ? null : item.topic)}
                            className="text-slate-400 hover:text-white p-1"
                          >
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-white/8 space-y-3.5">
                          {item.startHereResource && (
                            <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-500/15 to-indigo-500/10 border border-sky-500/30">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300 mb-1.5">
                                <Sparkles size={14} className="text-sky-400" />
                                <span>RECOMMENDED START HERE</span>
                              </div>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <a
                                    href={item.startHereResource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-semibold text-white hover:text-sky-300 transition-colors flex items-center gap-1.5 group"
                                  >
                                    <span>{item.startHereResource.title}</span>
                                    <ExternalLink size={13} className="group-hover:translate-x-0.5 transition-transform" />
                                  </a>
                                  <p className="text-xs text-slate-300 mt-1">
                                    {item.startHereResource.snippet}
                                  </p>
                                  <p className="text-[11px] text-sky-400/80 mt-1 font-medium">
                                    Source: {item.startHereResource.siteName} · {item.startHereResource.relevance}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {item.startHereResource.category === 'youtube' && (
                                    <button
                                      type="button"
                                      onClick={() => toggleBookmarkResource(item.startHereResource!)}
                                      className={`p-2 rounded-lg border transition-colors ${
                                        isResourceBookmarked(item.startHereResource.url)
                                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-amber-300'
                                      }`}
                                      title={isResourceBookmarked(item.startHereResource.url) ? 'Remove from Library' : 'Save to Library'}
                                    >
                                      <Bookmark size={14} className={isResourceBookmarked(item.startHereResource.url) ? 'fill-amber-400 text-amber-400' : ''} />
                                    </button>
                                  )}
                                  <a
                                    href={item.startHereResource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-1"
                                  >
                                    Open <ExternalLink size={11} />
                                  </a>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Matching YouTube Channel Callout inside Topic */}
                          {matchingChannel && (
                            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <Youtube size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <a
                                      href={matchingChannel.channelUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs font-bold text-white hover:text-red-300 transition-colors flex items-center gap-1"
                                    >
                                      {matchingChannel.channelName}
                                      <ExternalLink size={11} />
                                    </a>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-medium">
                                      Verified Channel
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-300 mt-0.5">
                                    {matchingChannel.whyRelevant}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => toggleBookmarkChannel(matchingChannel)}
                                  className={`p-1.5 rounded-lg border transition-colors ${
                                    isChannelBookmarked(matchingChannel.id)
                                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-amber-300'
                                  }`}
                                  title={isChannelBookmarked(matchingChannel.id) ? 'Remove from Library' : 'Save to Library'}
                                >
                                  <Bookmark size={14} className={isChannelBookmarked(matchingChannel.id) ? 'fill-amber-400 text-amber-400' : ''} />
                                </button>
                                <a
                                  href={matchingChannel.startLearningUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold text-xs transition-colors flex items-center gap-1"
                                >
                                  Start Learning <ExternalLink size={11} />
                                </a>
                              </div>
                            </div>
                          )}

                          <div>
                            <p className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                              <BookOpen size={13} className="text-sky-400" />
                              All Discovered Learning Resources ({item.resources.length})
                            </p>

                            <div className="space-y-2">
                              {item.resources.map((res, rIdx) => {
                                const isStart = res === item.startHereResource;
                                const isYt = res.category === 'youtube' || res.url.includes('youtube.com') || res.url.includes('youtu.be');
                                const bookmarked = isResourceBookmarked(res.url);

                                return (
                                  <div
                                    key={rIdx}
                                    className="p-3 rounded-xl bg-white/4 hover:bg-white/8 border border-white/6 hover:border-white/15 transition-all group flex items-start justify-between gap-3"
                                  >
                                    <a
                                      href={res.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="min-w-0 flex-1 block"
                                    >
                                      <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-800 text-slate-300">
                                          {res.category?.toUpperCase() || 'RESOURCE'}
                                        </span>
                                        {res.isVerifiedResult ? (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                                            Verified Result
                                          </span>
                                        ) : (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-sky-500/15 text-sky-300 border border-sky-500/25">
                                            Direct Search Link
                                          </span>
                                        )}
                                        {isStart && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-indigo-500/20 text-indigo-300">
                                            Start Here
                                          </span>
                                        )}
                                      </div>

                                      <p className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors">
                                        {res.title}
                                      </p>
                                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                        {res.snippet}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                                        <span>{res.siteName}</span>
                                        <span>•</span>
                                        <span className="text-sky-400/70">{res.relevance}</span>
                                      </div>
                                    </a>

                                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                                      {isYt && (
                                        <button
                                          type="button"
                                          onClick={() => toggleBookmarkResource(res)}
                                          className={`p-1.5 rounded-lg border transition-colors ${
                                            bookmarked
                                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                              : 'bg-white/5 border-white/10 text-slate-500 hover:text-amber-300'
                                          }`}
                                          title={bookmarked ? 'Remove from My Library' : 'Save video to My Library'}
                                        >
                                          <Bookmark size={13} className={bookmarked ? 'fill-amber-400 text-amber-400' : ''} />
                                        </button>
                                      )}
                                      <a
                                        href={res.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 text-slate-500 hover:text-sky-400 transition-colors"
                                      >
                                        <ExternalLink size={14} />
                                      </a>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>

              {/* Revision & Practice Blocks Section */}
              {revisionBlocks.length > 0 && (
                <Card className="p-5" delay={150}>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="text-amber-400" size={20} />
                    <h3 className="font-display font-semibold text-white text-base">
                      Pre-Exam Revision &amp; Mock Practice Timeline
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    Structured active recall and mock testing checkpoints scheduled right before your exam date.
                  </p>

                  <div className="space-y-2.5">
                    {revisionBlocks.map((block) => (
                      <div
                        key={block.id}
                        className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                          block.completed
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-white/4 border-white/8 hover:border-white/15'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleRevisionBlock(block.id)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                            block.completed
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold'
                              : 'border-white/30 hover:border-amber-400'
                          }`}
                        >
                          {block.completed && <CheckCircle2 size={14} className="stroke-[3]" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-sm font-semibold ${
                                block.completed ? 'text-slate-400 line-through' : 'text-white'
                              }`}
                            >
                              {block.title}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                              {block.dayTarget}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock size={11} /> {block.durationMinutes} min
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{block.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* TAB 2: Dedicated YouTube Channel Discovery */}
          {activeResultsTab === 'youtube' && (
            <div className="space-y-6">
              {/* YouTube Header & Info Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-red-500/15 via-red-950/20 to-transparent border border-red-500/25 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/30">
                    <Youtube size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                      Verified YouTube Educational Channels
                    </h3>
                    <p className="text-xs text-slate-300">
                      Discovered and prioritized for {selectedSubject?.name}{' '}
                      {courseContext ? `(${courseContext})` : ''} university syllabus and exam preparation.
                    </p>
                  </div>
                </div>
              </div>

              {/* YouTube Filters Bar */}
              <Card className="p-4" delay={0}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Filter by Syllabus Topic */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Filter size={15} className="text-slate-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-300 flex-shrink-0">Topic:</span>
                    <select
                      value={ytTopicFilter}
                      onChange={(e) => setYtTopicFilter(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50 transition-colors w-full max-w-xs"
                    >
                      <option value="all" className="bg-slate-800">
                        All Syllabus Topics ({syllabusTopics.length})
                      </option>
                      {syllabusTopics.map((topic, i) => (
                        <option key={i} value={topic} className="bg-slate-800">
                          {topic}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Resource Type */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-400 mr-1">Type:</span>
                    {[
                      { key: 'all', label: 'All Formats' },
                      { key: 'channel', label: 'Full Channels' },
                      { key: 'playlist', label: 'Playlists' },
                      { key: 'video', label: 'Videos' },
                    ].map((type) => (
                      <button
                        key={type.key}
                        onClick={() => setYtTypeFilter(type.key)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          ytTypeFilter === type.key
                            ? 'bg-red-500 text-white font-semibold'
                            : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Channels Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredYouTubeChannels.length === 0 ? (
                  <div className="col-span-2 p-8 text-center rounded-xl bg-white/3 border border-white/6">
                    <Youtube size={32} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-300">No channels match this filter</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try selecting "All Syllabus Topics" or resetting the resource type filter.
                    </p>
                  </div>
                ) : (
                  filteredYouTubeChannels.map((channel) => {
                    const bookmarked = isChannelBookmarked(channel.id);
                    return (
                      <Card
                        key={channel.id}
                        className="p-5 border border-white/10 hover:border-red-500/40 hover:bg-white/4 transition-all flex flex-col justify-between"
                        delay={0}
                      >
                        <div className="space-y-3.5">
                          {/* Channel Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center flex-shrink-0 text-red-400">
                                <Youtube size={22} />
                              </div>
                              <div className="min-w-0">
                                <a
                                  href={channel.channelUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-base font-bold text-white hover:text-red-400 transition-colors flex items-center gap-1.5 group truncate"
                                >
                                  <span className="truncate">{channel.channelName}</span>
                                  <ExternalLink size={13} className="text-slate-500 group-hover:text-red-400 flex-shrink-0 transition-colors" />
                                </a>
                                {channel.channelHandle && (
                                  <p className="text-xs text-slate-400">{channel.channelHandle}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {/* Bookmark Toggle Button */}
                              <button
                                type="button"
                                onClick={() => toggleBookmarkChannel(channel)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                  bookmarked
                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-amber-300 hover:bg-white/10'
                                }`}
                                title={bookmarked ? 'Remove from My Library' : 'Save to My Library'}
                              >
                                <Bookmark size={13} className={bookmarked ? 'fill-amber-400 text-amber-400' : ''} />
                                <span>{bookmarked ? 'Saved' : 'Save'}</span>
                              </button>

                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/25 font-semibold">
                                {channel.isVerified ? 'Verified Channel' : 'Educational Link'}
                              </span>
                            </div>
                          </div>

                          {/* Focus area pill */}
                          <div className="p-2.5 rounded-lg bg-white/4 border border-white/6 text-xs text-slate-300">
                            <span className="text-[11px] text-slate-400 block font-medium">Curriculum Focus:</span>
                            <span className="font-semibold text-white">{channel.focusArea}</span>
                          </div>

                          {/* Syllabus topics covered */}
                          <div>
                            <p className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                              <PlaySquare size={12} className="text-red-400" />
                              Syllabus Topics Covered:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {channel.relevantTopics.map((topic, ti) => (
                                <span
                                  key={ti}
                                  className="text-[11px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-200 border border-red-500/20 font-medium"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Why this channel is relevant */}
                          <div>
                            <p className="text-[11px] font-semibold text-slate-400 mb-1">
                              Why This Channel Fits Your Level:
                            </p>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {channel.whyRelevant}
                            </p>
                          </div>

                          {/* Recommended Playlist if available */}
                          {channel.recommendedPlaylistTitle && (
                            <div className="p-2.5 rounded-lg bg-white/4 border border-white/6">
                              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-0.5">
                                Recommended Course Playlist
                              </span>
                              <a
                                href={channel.recommendedPlaylistUrl || channel.startLearningUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-red-300 hover:text-red-200 flex items-center gap-1 transition-colors"
                              >
                                <span>{channel.recommendedPlaylistTitle}</span>
                                <ExternalLink size={11} className="flex-shrink-0" />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Bottom Action: "Start Learning" Button */}
                        <div className="pt-4 mt-4 border-t border-white/8 flex items-center justify-between gap-3">
                          {channel.subscriberHint && (
                            <span className="text-[10px] text-slate-400">
                              ★ {channel.subscriberHint}
                            </span>
                          )}

                          <a
                            href={channel.startLearningUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-600/25 transition-all ml-auto hover:translate-x-0.5"
                          >
                            <span>▶ {channel.startLearningLabel}</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: My Library Section */}
          {activeResultsTab === 'library' && (
            <MyLibraryView
              bookmarks={bookmarks}
              filteredBookmarks={filteredBookmarks}
              bookmarkTypeCounts={bookmarkTypeCounts}
              bookmarkSubjects={bookmarkSubjects}
              searchQuery={librarySearchQuery}
              onSearchChange={setLibrarySearchQuery}
              subjectFilter={librarySubjectFilter}
              onSubjectFilterChange={setLibrarySubjectFilter}
              typeFilter={libraryTypeFilter}
              onTypeFilterChange={setLibraryTypeFilter}
              editingNoteId={editingNoteId}
              noteDraft={noteDraft}
              onStartEditNote={(id, note) => {
                setEditingNoteId(id);
                setNoteDraft(note || '');
              }}
              onCancelEditNote={() => {
                setEditingNoteId(null);
                setNoteDraft('');
              }}
              onSaveNote={handleSaveNote}
              onNoteDraftChange={setNoteDraft}
              copiedId={copiedId}
              onCopyLink={handleCopyLink}
              onRemoveBookmark={removeBookmark}
              onClearAllBookmarks={clearAllBookmarks}
              onExportLibrary={handleExportLibrary}
              onBrowseYouTube={() => setActiveResultsTab('youtube')}
              isModal={false}
            />
          )}

          {/* TAB 4: Master Resource Explorer */}
          {activeResultsTab === 'resources' && (
            <Card className="p-5" delay={0}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-display font-semibold text-white text-base flex items-center gap-2">
                    <Layers size={18} className="text-sky-400" />
                    Master Resource Repository ({resources.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Browse discovered learning materials by resource medium.
                  </p>
                </div>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'youtube', label: 'YouTube Videos' },
                    { key: 'notes', label: 'Lecture Notes' },
                    { key: 'course', label: 'Courses' },
                    { key: 'website', label: 'Textbooks' },
                    { key: 'paper', label: 'Papers' },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategoryFilter(cat.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        selectedCategoryFilter === cat.key
                          ? 'bg-sky-500 text-slate-950 font-semibold'
                          : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {filteredResources.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    No resources in this category.
                  </p>
                ) : (
                  filteredResources.map((res, i) => {
                    const isYt = res.category === 'youtube' || res.url.includes('youtube.com') || res.url.includes('youtu.be');
                    const bookmarked = isResourceBookmarked(res.url);

                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/4 hover:bg-white/8 border border-white/6 hover:border-white/15 transition-all group"
                      >
                        <span className="text-xs font-mono text-slate-500 w-6 flex-shrink-0 text-center">
                          #{i + 1}
                        </span>
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-0"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                              {res.title}
                            </span>
                            {res.isVerifiedResult ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 flex-shrink-0">
                                Verified
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 flex-shrink-0">
                                Direct Link
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {res.siteName} · {res.topic} — {res.relevance}
                          </p>
                        </a>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isYt && (
                            <button
                              type="button"
                              onClick={() => toggleBookmarkResource(res)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                bookmarked
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                  : 'bg-white/5 border-white/10 text-slate-500 hover:text-amber-300'
                              }`}
                              title={bookmarked ? 'Remove from My Library' : 'Save video to My Library'}
                            >
                              <Bookmark size={13} className={bookmarked ? 'fill-amber-400 text-amber-400' : ''} />
                            </button>
                          )}
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-500 group-hover:text-sky-400 transition-colors"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button variant="secondary" size="md" icon={<RotateCcw size={15} />} onClick={handleReset}>
              Configure Different Subject / Syllabus
            </Button>

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="md"
                icon={<BookmarkCheck size={16} />}
                onClick={handleSyncToPlanner}
              >
                {planSynced ? 'Plan Synced to Study Planner' : 'Add to My Study Planner'}
              </Button>
              {onNavigate && (
                <Button
                  variant="secondary"
                  size="md"
                  icon={<ArrowRight size={15} />}
                  onClick={() => onNavigate('planner')}
                >
                  Open Study Planner
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Research History Modal */}
      <Modal
        open={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Research History"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              Past syllabus research queries, YouTube channels, and discovered resources are automatically saved on this device.
            </p>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllHistory}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium transition-colors flex-shrink-0"
              >
                <Trash2 size={13} /> Clear History
              </button>
            )}
          </div>

          {/* Search filter for history */}
          {history.length > 3 && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Search history by subject or topic name..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
              />
              {historySearchQuery && (
                <button
                  onClick={() => setHistorySearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* History List */}
          {filteredHistory.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-white/3 border border-white/6 my-2">
              <History size={32} className="mx-auto text-slate-600 mb-2.5" />
              <p className="text-sm font-semibold text-slate-300">
                {history.length === 0 ? 'No Research History Yet' : 'No Matching Research Entries'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {history.length === 0
                  ? 'Whenever you run a syllabus search, your findings, resources, YouTube channels, and study plan will be saved here so you can revisit them anytime.'
                  : 'Try searching with a different subject keyword.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[58vh] overflow-y-auto pr-1 scrollbar-thin">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-white/4 hover:bg-white/7 border border-white/8 hover:border-white/15 transition-all space-y-3"
                >
                  {/* Item top header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-bold text-white">
                          {item.subjectName}
                        </span>
                        {item.courseContext && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-slate-300">
                            {item.courseContext}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/25">
                          {item.domainType === 'research_paper' ? 'Research Papers' : 'Web & Courseware'}
                        </span>
                        {item.isLive && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                            Verified Live
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-slate-500" />
                          {formatHistoryTime(item.createdAt)}
                        </span>
                        <span>•</span>
                        <span>{item.syllabusTopics.length} topics</span>
                        <span>•</span>
                        <span className="text-red-400 flex items-center gap-1">
                          <Youtube size={12} />
                          {item.youtubeChannels?.length || 0} channels
                        </span>
                        <span>•</span>
                        <span>{item.resources.length} resources</span>
                        {item.examDate && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400">
                              Exam: {new Date(item.examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteHistoryItem(item.id)}
                      title="Delete this history entry"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Topics tag preview */}
                  <div className="flex flex-wrap gap-1.5">
                    {item.syllabusTopics.slice(0, 5).map((topic, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/6"
                      >
                        {topic}
                      </span>
                    ))}
                    {item.syllabusTopics.length > 5 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md text-slate-500">
                        +{item.syllabusTopics.length - 5} more
                      </span>
                    )}
                  </div>

                  {/* Actions bar */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => handleEditFromHistory(item)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      Edit Query in Form
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadHistory(item)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 transition-colors flex items-center gap-1.5"
                    >
                      Revisit Plan &amp; Channels <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-white/8">
            <Button variant="secondary" size="sm" onClick={() => setShowHistoryModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Standalone 'My Library' Modal (accessible from header at any time) */}
      <Modal
        open={showLibraryModal}
        onClose={() => setShowLibraryModal(false)}
        title="My YouTube Learning Library"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Your saved educational YouTube channels, playlists, and video lessons for quick study access.
          </p>
          <MyLibraryView
            bookmarks={bookmarks}
            filteredBookmarks={filteredBookmarks}
            bookmarkTypeCounts={bookmarkTypeCounts}
            bookmarkSubjects={bookmarkSubjects}
            searchQuery={librarySearchQuery}
            onSearchChange={setLibrarySearchQuery}
            subjectFilter={librarySubjectFilter}
            onSubjectFilterChange={setLibrarySubjectFilter}
            typeFilter={libraryTypeFilter}
            onTypeFilterChange={setLibraryTypeFilter}
            editingNoteId={editingNoteId}
            noteDraft={noteDraft}
            onStartEditNote={(id, note) => {
              setEditingNoteId(id);
              setNoteDraft(note || '');
            }}
            onCancelEditNote={() => {
              setEditingNoteId(null);
              setNoteDraft('');
            }}
            onSaveNote={handleSaveNote}
            onNoteDraftChange={setNoteDraft}
            copiedId={copiedId}
            onCopyLink={handleCopyLink}
            onRemoveBookmark={removeBookmark}
            onClearAllBookmarks={clearAllBookmarks}
            onExportLibrary={handleExportLibrary}
            onBrowseYouTube={() => {
              setShowLibraryModal(false);
              if (state === 'done') {
                setActiveResultsTab('youtube');
              } else {
                setActiveMainMode('research');
              }
            }}
            isModal={true}
          />
          <div className="flex justify-end pt-2 border-t border-white/8">
            <Button variant="secondary" size="sm" onClick={() => setShowLibraryModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/95 border border-amber-500/40 text-amber-200 text-xs shadow-2xl backdrop-blur-md animate-slideUp">
          <Bookmark size={15} className="text-amber-400 fill-amber-400 flex-shrink-0" />
          <span className="font-medium text-white">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-1 p-0.5 cursor-pointer"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
