import type { ResearchResource } from '@/types';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tinyfish-search`;

interface TinyFishResult {
  position: number;
  site_name: string;
  title: string;
  snippet: string;
  url: string;
}

interface TinyFishResponse {
  query: string;
  results: TinyFishResult[];
  total_results: number;
  page: number;
  configured?: boolean;
  error?: string;
}

export async function searchTopic(
  topic: string,
  subjectName: string,
  domainType?: string,
): Promise<{ resources: ResearchResource[]; isLive: boolean; error?: string }> {
  const query = `${subjectName} ${topic} study notes tutorial explanation`;

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query,
        domain_type: domainType ?? 'web',
        purpose: `Find educational resources for a student studying ${topic} in ${subjectName}`,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return {
        resources: [],
        isLive: false,
        error: errorBody.error ?? `Request failed (${response.status})`,
      };
    }

    const data: TinyFishResponse = await response.json();

    if (data.error) {
      return { resources: [], isLive: false, error: data.error };
    }

    if (!data.configured) {
      return {
        resources: [],
        isLive: false,
        error: 'TINYFISH_API_KEY is not configured.',
      };
    }

    const resources: ResearchResource[] = (data.results ?? []).slice(0, 5).map((r) => ({
      position: r.position,
      title: r.title,
      url: r.url,
      snippet: r.snippet,
      siteName: r.site_name,
      topic,
      relevance: `Retrieved from ${r.site_name} — relevant to "${topic}" in ${subjectName}`,
    }));

    return { resources, isLive: true };
  } catch (err) {
    return {
      resources: [],
      isLive: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}
