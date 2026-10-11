import { defineConfig, Plugin, Connect } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { GoogleGenAI } from '@google/genai';

function getEffectiveKey(keyName: string): string {
  const direct = (process.env[keyName] || '').trim();
  if (direct && !direct.includes('MY_GEMINI_API_KEY') && !direct.includes('your_tinyfish_api_key')) {
    return direct;
  }
  try {
    const devPath = path.resolve(process.cwd(), '../.dev.env.json');
    if (fs.existsSync(devPath)) {
      const data = JSON.parse(fs.readFileSync(devPath, 'utf-8'));
      if (data[keyName]) return String(data[keyName]).trim();
    }
  } catch {
    // ignore
  }
  return direct;
}

function registerBackendRoutes(middlewares: Connect.Server) {
  middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const rawUrl = req.url || '/';
    const parsedUrl = new URL(rawUrl, 'http://localhost');
    const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';

    // 1. TinyFish Search API route
    if (pathname === '/api/tinyfish-search') {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }

      let bodyStr = '';
      req.on('data', (chunk: Buffer) => {
        bodyStr += chunk;
      });

      req.on('end', async () => {
        try {
          const apiKey = getEffectiveKey('TINYFISH_API_KEY');
          if (!apiKey || apiKey === 'your_tinyfish_api_key_here') {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                configured: false,
                error: 'TINYFISH_API_KEY is not configured in the server environment.',
                results: [],
              })
            );
            return;
          }

          const parsed = bodyStr ? JSON.parse(bodyStr) : {};
          const query = parsed.query?.trim();
          if (!query) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: "Missing or invalid 'query' field." }));
            return;
          }

          const params = new URLSearchParams({ query });
          if (parsed.domain_type && ['web', 'news', 'research_paper'].includes(parsed.domain_type)) {
            params.set('domain_type', parsed.domain_type);
          }
          if (parsed.purpose) {
            params.set('purpose', String(parsed.purpose).trim().slice(0, 2000));
          }

          const apiUrl = `https://api.search.tinyfish.ai?${params.toString()}`;
          const apiRes = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'X-API-Key': apiKey },
          });

          if (!apiRes.ok) {
            const errText = await apiRes.text().catch(() => 'Unknown error');
            res.statusCode = apiRes.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: `TinyFish API returned status ${apiRes.status}`,
                details: errText,
                configured: true,
              })
            );
            return;
          }

          const data = await apiRes.json();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ...data, configured: true }));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Internal server error';
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: message }));
        }
      });
      return;
    }

    // 2. Topic-Based Practice Quiz Generation API route
    if (pathname === '/api/quiz/generate') {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }

      let bodyStr = '';
      req.on('data', (chunk: Buffer) => {
        bodyStr += chunk;
      });

      req.on('end', async () => {
        try {
          const geminiKey = getEffectiveKey('GEMINI_API_KEY');
          if (!geminiKey || geminiKey === 'MY_GEMINI_API_KEY') {
            res.statusCode = 503;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: 'GEMINI_API_KEY is not configured on the server.',
                configured: false,
              })
            );
            return;
          }

          let parsed: Record<string, unknown> = {};
          try {
            parsed = bodyStr ? (JSON.parse(bodyStr) as Record<string, unknown>) : {};
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON request body.' }));
            return;
          }

          const subject = String(parsed.subject || '').trim();
          const topic = String(parsed.topic || '').trim();
          const difficulty = ['Easy', 'Medium', 'Hard'].includes(String(parsed.difficulty))
            ? (parsed.difficulty as 'Easy' | 'Medium' | 'Hard')
            : 'Medium';
          const count = [5, 10, 15].includes(Number(parsed.count))
            ? Number(parsed.count)
            : 5;
          const courseContext = parsed.courseContext ? String(parsed.courseContext).trim() : '';
          const searchSnippets = Array.isArray(parsed.learningMaterials)
            ? (parsed.learningMaterials as Array<{ title?: string; snippet?: string }>)
                .slice(0, 3)
                .map((m) => `${m.title || ''}: ${m.snippet || ''}`)
                .join('\n')
            : '';

          if (!subject || !topic) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Subject and topic are required.' }));
            return;
          }

          const ai = new GoogleGenAI({
            apiKey: geminiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          const prompt = `You are an expert university & exam preparation professor creating a high-quality practice quiz for a student.

Subject: ${subject}
Topic: ${topic}
Target Difficulty: ${difficulty}
Number of Questions: ${count}
${courseContext ? `Student academic level/context: ${courseContext}` : ''}
${searchSnippets ? `Reference context from verified study snippets:\n${searchSnippets}` : ''}

CRITICAL RULES:
1. Generate exactly ${count} multiple-choice questions.
2. For each question, provide:
   - A clear, unambiguous question stem (include numerical, application-based, or conceptual problem solving where appropriate).
   - An array named "options" with EXACTLY 4 plausible answer options.
   - An integer "correctAnswerIndex" (0, 1, 2, or 3) indicating the exact correct option in "options".
   - A concise, educational "explanation" that clearly teaches WHY that answer is correct and explains the underlying principle or derivation.
   - "topicTag": "${topic}"
   - "difficulty": "${difficulty}"
3. Validate all calculations independently so that the correct answer is unambiguous and mathematically/logically sound.
4. Output MUST BE a valid JSON array of objects conforming to the schema:
[
  {
    "id": "q1",
    "question": "string",
    "options": ["option A", "option B", "option C", "option D"],
    "correctAnswerIndex": 0,
    "explanation": "string",
    "topicTag": "string",
    "difficulty": "string"
  }
]`;

          // Try primary models: gemini-3.1-flash-lite, fallback to gemini-3.8-flash
          const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
          let responseText = '';
          let modelUsed = '';
          let lastModelError = '';

          for (const modelName of candidateModels) {
            try {
              const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                  temperature: 0.2,
                },
              });
              if (response.text) {
                responseText = response.text.trim();
                modelUsed = modelName;
                break;
              }
            } catch (err: unknown) {
              lastModelError = err instanceof Error ? err.message : String(err);
              console.error(`[quiz-generator] Model ${modelName} error:`, lastModelError);
              continue;
            }
          }

          if (!responseText) {
            res.statusCode = 503;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: `AI quiz generation error: ${lastModelError || 'Models currently experiencing high demand. Please retry.'}`,
              })
            );
            return;
          }

          // Strip any markdown code fences if model returned them
          let cleanJson = responseText.trim();
          if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
          }

          // Parse and strictly validate the questions
          let questionsRaw: unknown;
          try {
            questionsRaw = JSON.parse(cleanJson);
          } catch {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'AI returned malformed JSON.' }));
            return;
          }

          const rawList = Array.isArray(questionsRaw)
            ? questionsRaw
            : typeof questionsRaw === 'object' && questionsRaw !== null && Array.isArray((questionsRaw as Record<string, unknown>).questions)
            ? (questionsRaw as { questions: unknown[] }).questions
            : [];

          if (!Array.isArray(rawList) || rawList.length === 0) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'AI did not return a valid list of questions.' }));
            return;
          }

          // Strict question schema validation
          const validatedQuestions: Array<{
            id: string;
            question: string;
            options: [string, string, string, string];
            correctAnswerIndex: number;
            explanation: string;
            topicTag: string;
            difficulty: string;
          }> = [];

          for (let i = 0; i < rawList.length; i++) {
            const item = rawList[i];
            if (!item || typeof item !== 'object') continue;
            const q = item as Record<string, unknown>;
            const question = typeof q.question === 'string' ? q.question.trim() : '';
            const options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()) : [];
            const correctIdx = Number(q.correctAnswerIndex);
            const explanation = typeof q.explanation === 'string' ? q.explanation.trim() : '';

            if (!question || options.length !== 4) continue;
            if (isNaN(correctIdx) || correctIdx < 0 || correctIdx > 3) continue;

            validatedQuestions.push({
              id: `q_${Date.now()}_${i + 1}`,
              question,
              options: [options[0], options[1], options[2], options[3]],
              correctAnswerIndex: Math.floor(correctIdx),
              explanation: explanation || `The correct answer is Option ${String.fromCharCode(65 + Math.floor(correctIdx))}.`,
              topicTag: topic,
              difficulty,
            });

            if (validatedQuestions.length >= count) break;
          }

          if (validatedQuestions.length === 0) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Generated questions did not pass validation checks. Please retry.' }));
            return;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              questions: validatedQuestions,
              topic,
              subject,
              difficulty,
              modelUsed,
              count: validatedQuestions.length,
            })
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Internal server error';
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: message }));
        }
      });
      return;
    }

    next();
  });
}

function backendApiPlugin(): Plugin {
  return {
    name: 'backend-api-server',
    configureServer(server) {
      registerBackendRoutes(server.middlewares);
    },
    configurePreviewServer(server) {
      registerBackendRoutes(server.middlewares);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), backendApiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
