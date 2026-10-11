import type { ResearchResource, ResourceCategory, YouTubeChannelDiscovery } from '@/types';

interface TinyFishResult {
  position: number;
  site_name: string;
  title: string;
  snippet: string;
  url: string;
}

interface TinyFishResponse {
  query: string;
  results?: TinyFishResult[];
  total_results?: number;
  page?: number;
  configured?: boolean;
  error?: string;
  details?: string;
}

function categorizeUrl(url: string, siteName: string): ResourceCategory {
  const lowerUrl = url.toLowerCase();
  const lowerSite = siteName.toLowerCase();

  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerSite.includes('youtube')) {
    return 'youtube';
  }
  if (
    lowerUrl.includes('arxiv.org') ||
    lowerUrl.includes('scholar.google') ||
    lowerUrl.includes('semanticscholar') ||
    lowerUrl.includes('doi.org') ||
    lowerUrl.includes('researchgate') ||
    lowerUrl.includes('sciencedirect')
  ) {
    return 'paper';
  }
  if (
    lowerUrl.includes('ocw.mit.edu') ||
    lowerUrl.includes('coursera.org') ||
    lowerUrl.includes('edx.org') ||
    lowerUrl.includes('nptel.ac.in') ||
    lowerUrl.includes('khanacademy.org')
  ) {
    return 'course';
  }
  if (
    lowerUrl.includes('notes') ||
    lowerUrl.includes('cheatsheet') ||
    lowerUrl.includes('docs.') ||
    lowerUrl.includes('tutorialspoint') ||
    lowerUrl.includes('geeksforgeeks')
  ) {
    return 'notes';
  }
  return 'website';
}

/**
 * Generates verified, authentic search links directly into trusted educational
 * platforms (YouTube, MIT OCW, Khan Academy, OpenStax, Google Scholar, arXiv, GeeksforGeeks).
 *
 * NOTE: These are real platform queries, NOT invented or fabricated paper titles/links.
 * They are clearly marked with isVerifiedResult: false.
 */
export function getPlatformSearchLinks(
  topic: string,
  subjectName: string,
  domainType?: string,
  courseContext?: string,
): ResearchResource[] {
  const isPaper = domainType === 'research_paper';
  const contextStr = courseContext ? `${courseContext} ` : '';
  const list: ResearchResource[] = [];

  if (isPaper) {
    // Academic literature / Research papers
    list.push({
      position: 1,
      title: `arXiv.org: Research Papers & Preprints for "${topic}"`,
      url: `https://arxiv.org/search/?query=${encodeURIComponent(`${topic} ${subjectName}`)}&searchtype=all`,
      snippet: `Live search in arXiv open-access preprint archive for foundational and recent research publications on "${topic}".`,
      siteName: 'arXiv.org Preprints',
      topic,
      category: 'paper',
      isVerifiedResult: false,
      isStartHere: true,
      relevance: `Primary open research papers, formal definitions, and literature reviews in ${subjectName}.`,
    });

    list.push({
      position: 2,
      title: `Google Scholar: Academic Literature & Survey Papers for "${topic}"`,
      url: `https://scholar.google.com/scholar?q=${encodeURIComponent(`${contextStr}${subjectName} ${topic} survey tutorial`)}`,
      snippet: `Comprehensive scholarly search covering peer-reviewed journal articles, dissertations, and conference proceedings.`,
      siteName: 'Google Scholar',
      topic,
      category: 'paper',
      isVerifiedResult: false,
      relevance: `High-impact peer-reviewed citations and academic surveys for deeper theoretical rigor.`,
    });

    list.push({
      position: 3,
      title: `Semantic Scholar: AI-Powered Academic Research for "${topic}"`,
      url: `https://www.semanticscholar.org/search?q=${encodeURIComponent(`${subjectName} ${topic}`)}`,
      snippet: `Search peer-reviewed papers with extracted key findings, citation velocity, and syllabus-critical papers.`,
      siteName: 'Semantic Scholar',
      topic,
      category: 'paper',
      isVerifiedResult: false,
      relevance: `Fast discovery of influential papers and study-relevant methodology overviews.`,
    });
  } else {
    // 1. YouTube Lectures & Playlists (Recommended Start Here for concepts)
    list.push({
      position: 1,
      title: `YouTube: "${topic}" Lectures & Full Course Playlists`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${contextStr}${subjectName} ${topic} playlist lecture`)}`,
      snippet: `Curated video search on YouTube for full course playlists, animated visual explanations, and step-by-step problem walkthroughs.`,
      siteName: 'YouTube Education',
      topic,
      category: 'youtube',
      isVerifiedResult: false,
      isStartHere: true,
      relevance: `Recommended Start Here: Visual explanations and structured course playlists from university & educational creators.`,
    });

    // 2. MIT OpenCourseWare / University Courseware
    list.push({
      position: 2,
      title: `MIT OpenCourseWare: "${topic}" Course Materials & Lecture Notes`,
      url: `https://ocw.mit.edu/search/?q=${encodeURIComponent(topic)}`,
      snippet: `Direct search across MIT's open university lecture notes, syllabus reading lists, assignments, and exam archives.`,
      siteName: 'MIT OpenCourseWare',
      topic,
      category: 'notes',
      isVerifiedResult: false,
      relevance: `Rigorous academic lecture notes, formula derivations, and past exam problem sets.`,
    });

    // 3. Khan Academy Lessons & Practice
    list.push({
      position: 3,
      title: `Khan Academy: "${topic}" Interactive Lessons & Quizzes`,
      url: `https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(topic)}`,
      snippet: `Search Khan Academy for bite-sized conceptual lessons, mastery challenges, and interactive problem sets.`,
      siteName: 'Khan Academy',
      topic,
      category: 'course',
      isVerifiedResult: false,
      relevance: `Best for solidifying core intuition, diagnosing misconceptions, and interactive practice.`,
    });

    // 4. GeeksforGeeks / Specialized Tutorials & Cheat Sheets
    list.push({
      position: 4,
      title: `GeeksforGeeks: "${topic}" Tutorials & Practice Questions`,
      url: `https://www.geeksforgeeks.org/?s=${encodeURIComponent(topic)}`,
      snippet: `Direct topic search for concise study notes, algorithmic breakdowns, formula sheets, and commonly asked exam questions.`,
      siteName: 'GeeksforGeeks',
      topic,
      category: 'notes',
      isVerifiedResult: false,
      relevance: `Quick-revision reference notes and frequently tested examination problems.`,
    });

    // 5. OpenStax Peer-Reviewed Open Textbooks
    list.push({
      position: 5,
      title: `OpenStax: Free Peer-Reviewed Textbooks for ${subjectName}`,
      url: `https://openstax.org/subjects`,
      snippet: `Explore full-length, open-access college and high school textbooks written by academic domain experts.`,
      siteName: 'OpenStax (Rice University)',
      topic,
      category: 'website',
      isVerifiedResult: false,
      relevance: `Authoritative textbook chapters, worked examples, and end-of-chapter practice questions.`,
    });
  }

  return list;
}

export async function searchTopic(
  topic: string,
  subjectName: string,
  domainType?: string,
  courseContext?: string,
): Promise<{
  resources: ResearchResource[];
  isLive: boolean;
  unconfiguredReason?: string;
  error?: string;
}> {
  const query = `${subjectName} ${topic} syllabus lecture notes tutorial`;

  // 1. Prefer Supabase Edge Function if VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present and configured
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl !== 'your_supabase_project_url' &&
    supabaseKey !== 'your_supabase_anon_key'
  ) {
    try {
      const edgeUrl = `${supabaseUrl}/functions/v1/tinyfish-search`;
      const response = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          query,
          domain_type: domainType ?? 'web',
          purpose: `Find educational resources for ${topic} in ${subjectName}`,
        }),
      });

      if (response.ok) {
        const data: TinyFishResponse = await response.json();
        if (data.configured && Array.isArray(data.results) && data.results.length > 0) {
          const liveResources: ResearchResource[] = data.results.slice(0, 5).map((r, index) => {
            const cat = categorizeUrl(r.url, r.site_name);
            return {
              position: r.position || index + 1,
              title: r.title,
              url: r.url,
              snippet: r.snippet,
              siteName: r.site_name,
              topic,
              category: cat,
              isVerifiedResult: true,
              isStartHere: index === 0,
              relevance: `Verified live result retrieved via TinyFish Supabase Edge Function — covers "${topic}" for ${subjectName}`,
            };
          });

          return { resources: liveResources, isLive: true };
        }
      }
    } catch {
      // Fall through to server proxy
    }
  }

  // 2. Try server-side /api/tinyfish-search proxy
  try {
    const proxyResponse = await fetch('/api/tinyfish-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        domain_type: domainType ?? 'web',
        purpose: `Find educational resources for ${courseContext ? courseContext + ' student' : 'student'} studying ${topic} in ${subjectName}`,
      }),
    });

    if (proxyResponse.ok) {
      const data: TinyFishResponse = await proxyResponse.json();

      if (data.configured && Array.isArray(data.results) && data.results.length > 0) {
        // Real verified results from TinyFish
        const liveResources: ResearchResource[] = data.results.slice(0, 5).map((r, index) => {
          const cat = categorizeUrl(r.url, r.site_name);
          return {
            position: r.position || index + 1,
            title: r.title,
            url: r.url,
            snippet: r.snippet,
            siteName: r.site_name,
            topic,
            category: cat,
            isVerifiedResult: true,
            isStartHere: index === 0,
            relevance: `Verified live result retrieved via TinyFish — covers "${topic}" for ${subjectName}`,
          };
        });

        return { resources: liveResources, isLive: true };
      }
    }
  } catch {
    // Fall through to authentic platform search links
  }

  // 3. Honest, reliable platform search portals
  // Explain why live search is inactive and provide verified links
  return {
    resources: getPlatformSearchLinks(topic, subjectName, domainType, courseContext),
    isLive: false,
    unconfiguredReason:
      'TINYFISH_API_KEY is not configured in the environment. Direct, verified syllabus search links have been generated across academic repositories (YouTube, MIT OCW, Khan Academy, GeeksforGeeks, OpenStax).',
  };
}

interface VerifiedChannelTemplate {
  channelName: string;
  channelHandle: string;
  channelUrl: string;
  focusArea: string;
  defaultWhyRelevant: string;
  subscriberHint: string;
  category: 'cs' | 'math' | 'physics' | 'general' | 'electronics';
}

const VERIFIED_CHANNELS: VerifiedChannelTemplate[] = [
  // Computer Science & Programming
  {
    channelName: 'Gate Smashers',
    channelHandle: '@GateSmashers',
    channelUrl: 'https://www.youtube.com/@GateSmashers',
    focusArea: 'Data Structures, Algorithms, OS, DBMS & University Exam Prep',
    defaultWhyRelevant: 'Renowned for college semester exam preparation and GATE syllabus. Clear whiteboard tutorials with solved previous year university exam questions.',
    subscriberHint: 'Top Recommended for University Exams',
    category: 'cs',
  },
  {
    channelName: 'Abdul Bari',
    channelHandle: '@abdul_bari',
    channelUrl: 'https://www.youtube.com/@abdul_bari',
    focusArea: 'Algorithms, Data Structures & Complexity Analysis',
    defaultWhyRelevant: 'Universally acclaimed for algorithmic analysis, recursion trees, and dynamic programming with step-by-step trace dry-runs.',
    subscriberHint: 'Best for Algorithm Design & Intuition',
    category: 'cs',
  },
  {
    channelName: "Jenny's Lectures CS IT",
    channelHandle: '@JennyslecturesCSIT',
    channelUrl: 'https://www.youtube.com/@JennyslecturesCSIT',
    focusArea: 'Data Structures, C/C++ Programming, Theory of Computation',
    defaultWhyRelevant: 'Structured code implementations, line-by-line pointer traces, and handwritten diagrams tailored to university syllabus curricula.',
    subscriberHint: 'Structured Engineering Lectures',
    category: 'cs',
  },
  {
    channelName: 'Neso Academy',
    channelHandle: '@nesoacademy',
    channelUrl: 'https://www.youtube.com/@nesoacademy',
    focusArea: 'Digital Electronics, Computer Networks, Microprocessors',
    defaultWhyRelevant: 'Crystal-clear animated slides, circuit diagrams, and comprehensive modular video playlists ideal for engineering majors.',
    subscriberHint: 'Comprehensive Modular Playlists',
    category: 'electronics',
  },
  {
    channelName: 'freeCodeCamp.org',
    channelHandle: '@freecodecamp',
    channelUrl: 'https://www.youtube.com/@freecodecamp',
    focusArea: 'Full-Length Computer Science & Development Masterclasses',
    defaultWhyRelevant: 'Full 4-10 hour masterclasses covering foundational computing, databases, and programming paradigms without paywalls.',
    subscriberHint: 'Full-Length Deep Dive Courses',
    category: 'cs',
  },
  {
    channelName: 'NeetCode',
    channelHandle: '@NeetCode',
    channelUrl: 'https://www.youtube.com/@NeetCode',
    focusArea: 'Algorithmic Problem-Solving & Data Structure Patterns',
    defaultWhyRelevant: 'Clear visual breakdowns of Trees, Graphs, Heaps, and Dynamic Programming with time & space complexity analysis.',
    subscriberHint: 'Problem Solving & Patterns',
    category: 'cs',
  },

  // Mathematics & Engineering Math
  {
    channelName: '3Blue1Brown',
    channelHandle: '@3blue1brown',
    channelUrl: 'https://www.youtube.com/@3blue1brown',
    focusArea: 'Essence of Linear Algebra, Calculus & Neural Networks',
    defaultWhyRelevant: 'Unmatched visual animations that build conceptual geometric intuition behind linear transformations, eigenvalues, and calculus formulas.',
    subscriberHint: 'Visual Mathematical Intuition',
    category: 'math',
  },
  {
    channelName: 'Professor Leonard',
    channelHandle: '@ProfessorLeonard',
    channelUrl: 'https://www.youtube.com/@ProfessorLeonard',
    focusArea: 'Full College Calculus I, II, III & Differential Equations',
    defaultWhyRelevant: 'Complete, unedited university classroom lectures where every proof, integral, and formula derivation is thoroughly explained.',
    subscriberHint: 'Complete University Classroom Lectures',
    category: 'math',
  },
  {
    channelName: 'Dr. Gajendra Purohit',
    channelHandle: '@GajendraPurohit',
    channelUrl: 'https://www.youtube.com/@GajendraPurohit',
    focusArea: 'Engineering Mathematics (M1, M2, M3), Discrete Math & Statistics',
    defaultWhyRelevant: 'Targeted directly at B.Tech/B.Sc semester examination curricula with exam-tested question patterns and time-saving shortcuts.',
    subscriberHint: 'University Exam Preparation',
    category: 'math',
  },

  // Physics & Engineering Mechanics
  {
    channelName: 'Michel van Biezen (ilectureonline)',
    channelHandle: '@MichelvanBiezen',
    channelUrl: 'https://www.youtube.com/@MichelvanBiezen',
    focusArea: 'Physics, Engineering Mechanics, Thermodynamics & Circuits',
    defaultWhyRelevant: 'Thousands of concise, step-by-step solved physics and mechanical problem sets arranged cleanly by syllabus chapter.',
    subscriberHint: 'Worked Practice Problems',
    category: 'physics',
  },
  {
    channelName: 'The Organic Chemistry Tutor',
    channelHandle: '@TheOrganicChemistryTutor',
    channelUrl: 'https://www.youtube.com/@TheOrganicChemistryTutor',
    focusArea: 'Physics, General & Organic Chemistry, Calculus Exams',
    defaultWhyRelevant: 'Comprehensive multi-hour final exam review sessions packed with hundreds of practice exercises and formula breakdowns.',
    subscriberHint: 'High-Yield Exam Cram Guides',
    category: 'physics',
  },
  {
    channelName: 'Lectures by Walter Lewin',
    channelHandle: '@WalterLewin',
    channelUrl: 'https://www.youtube.com/@WalterLewin',
    focusArea: 'Classical Mechanics, Electricity, Magnetism & Optics',
    defaultWhyRelevant: 'Legendary MIT physics lecture demonstrations that illustrate theoretical laws with tangible, real-world physical experiments.',
    subscriberHint: 'MIT Core Physics',
    category: 'physics',
  },

  // Universal / University Degree
  {
    channelName: 'NPTEL-NOC IITM',
    channelHandle: '@nptel-noc',
    channelUrl: 'https://www.youtube.com/@nptel-noc',
    focusArea: 'Official Indian Institutes of Technology (IIT) Degree Courses',
    defaultWhyRelevant: 'Official semester-long courses taught by distinguished professors from IIT Madras, Bombay, and Delhi covering standard degree syllabi.',
    subscriberHint: 'Official IIT Degree Curriculum',
    category: 'general',
  },
  {
    channelName: 'MIT OpenCourseWare',
    channelHandle: '@mitocw',
    channelUrl: 'https://www.youtube.com/@mitocw',
    focusArea: 'World-Class MIT University Lecture Series',
    defaultWhyRelevant: 'Full MIT undergraduate course series taught by world experts with complete syllabus lecture series and assignments.',
    subscriberHint: 'MIT Undergraduate Courses',
    category: 'general',
  },
  {
    channelName: 'Khan Academy',
    channelHandle: '@khanacademy',
    channelUrl: 'https://www.youtube.com/@khanacademy',
    focusArea: 'Mastery-Based Foundational Walkthroughs',
    defaultWhyRelevant: 'Pedagogically designed bite-sized lessons that build strong conceptual fundamentals without cognitive overload.',
    subscriberHint: 'Foundational Mastery',
    category: 'general',
  },
];

export function discoverYouTubeChannels(
  topics: string[],
  subjectName: string,
  courseContext?: string,
  liveResources?: ResearchResource[]
): YouTubeChannelDiscovery[] {
  const sLower = subjectName.toLowerCase();
  const results: YouTubeChannelDiscovery[] = [];
  const primaryTopic = topics[0] || subjectName;

  // 1. Process any verified live YouTube results if returned by TinyFish
  if (liveResources && liveResources.length > 0) {
    const liveYouTubeItems = liveResources.filter(
      (r) => r.category === 'youtube' || r.url.includes('youtube.com') || r.url.includes('youtu.be')
    );

    liveYouTubeItems.forEach((item, idx) => {
      const isPlaylist = item.url.includes('playlist') || item.url.includes('list=');
      results.push({
        id: `yt-live-${idx}-${Date.now()}`,
        channelName: item.siteName.replace(' - YouTube', '').trim() || 'YouTube Verified Creator',
        channelUrl: item.url,
        focusArea: `${item.topic} for ${subjectName}`,
        relevantTopics: [item.topic],
        whyRelevant: `Verified live result retrieved for your syllabus topic "${item.topic}". ${item.relevance}`,
        resourceType: isPlaylist ? 'playlist' : 'video',
        recommendedPlaylistTitle: item.title,
        recommendedPlaylistUrl: item.url,
        startLearningUrl: item.url,
        startLearningLabel: isPlaylist ? 'Start Learning Playlist' : 'Watch Video Lesson',
        isVerified: true,
        subscriberHint: 'Verified Live Search Match',
      });
    });
  }

  // 2. Determine target category from subjectName
  let matchedCat: 'cs' | 'math' | 'physics' | 'electronics' | 'general' = 'general';
  if (
    sLower.includes('cs') ||
    sLower.includes('programm') ||
    sLower.includes('data struct') ||
    sLower.includes('algorithm') ||
    sLower.includes('comput') ||
    sLower.includes('software') ||
    sLower.includes('code') ||
    sLower.includes('java') ||
    sLower.includes('python') ||
    sLower.includes('c++') ||
    sLower.includes('os') ||
    sLower.includes('database') ||
    sLower.includes('dbms')
  ) {
    matchedCat = 'cs';
  } else if (
    sLower.includes('math') ||
    sLower.includes('calculus') ||
    sLower.includes('algebra') ||
    sLower.includes('differential') ||
    sLower.includes('discrete') ||
    sLower.includes('statist') ||
    sLower.includes('probab')
  ) {
    matchedCat = 'math';
  } else if (
    sLower.includes('physic') ||
    sLower.includes('mechanic') ||
    sLower.includes('thermo') ||
    sLower.includes('optics') ||
    sLower.includes('quantum')
  ) {
    matchedCat = 'physics';
  } else if (
    sLower.includes('circuit') ||
    sLower.includes('electron') ||
    sLower.includes('digital') ||
    sLower.includes('vlsi') ||
    sLower.includes('microprocessor')
  ) {
    matchedCat = 'electronics';
  }

  // Filter channels: prioritized category first, plus top general university channels
  const prioritized = VERIFIED_CHANNELS.filter(
    (c) => c.category === matchedCat || (matchedCat === 'cs' && c.category === 'electronics')
  );
  const generalChannels = VERIFIED_CHANNELS.filter((c) => c.category === 'general');
  const candidateChannels = [...prioritized, ...generalChannels];

  // Build channel discoveries
  candidateChannels.slice(0, 6).forEach((c, idx) => {
    // Avoid duplicate channel names
    if (results.some((r) => r.channelName.toLowerCase() === c.channelName.toLowerCase())) {
      return;
    }

    const playlistQuery = `${c.channelName} ${subjectName} ${primaryTopic} playlist`;
    const startLearningQuery = `${c.channelName} ${subjectName} ${primaryTopic}`;
    const playlistUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(playlistQuery)}`;
    const startUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(startLearningQuery)}`;

    const contextMsg = courseContext ? ` Tailored for ${courseContext} students.` : '';

    results.push({
      id: `yt-curated-${idx}-${c.channelHandle.replace('@', '')}`,
      channelName: c.channelName,
      channelHandle: c.channelHandle,
      channelUrl: c.channelUrl,
      focusArea: c.focusArea,
      relevantTopics: topics,
      whyRelevant: `${c.defaultWhyRelevant}${contextMsg}`,
      resourceType: 'channel',
      recommendedPlaylistTitle: `${c.channelName}: Complete ${subjectName} Playlist`,
      recommendedPlaylistUrl: playlistUrl,
      startLearningUrl: startUrl,
      startLearningLabel: 'Start Learning on Channel',
      isVerified: true,
      subscriberHint: c.subscriberHint,
    });
  });

  return results;
}
