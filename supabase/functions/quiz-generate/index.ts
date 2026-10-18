const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface QuizRequestBody {
  subject?: string;
  topic?: string;
  difficulty?: string;
  count?: number;
  courseContext?: string;
  learningMaterials?: Array<{ title?: string; snippet?: string }>;
}

interface GeneratedQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
  explanation: string;
  topicTag: string;
  difficulty: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "GEMINI_API_KEY is not configured. Set it as an edge function secret named GEMINI_API_KEY in your Supabase project.",
          configured: false,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json() as QuizRequestBody;
    const subject = (body.subject || "").trim();
    const topic = (body.topic || "").trim();
    const difficulty = ["Easy", "Medium", "Hard"].includes(body.difficulty || "")
      ? (body.difficulty as string)
      : "Medium";
    const count = [5, 10, 15].includes(Number(body.count)) ? Number(body.count) : 5;
    const courseContext = body.courseContext ? String(body.courseContext).trim() : "";
    const searchSnippets = Array.isArray(body.learningMaterials)
      ? body.learningMaterials
          .slice(0, 3)
          .map((m) => `${m.title || ""}: ${m.snippet || ""}`)
          .join("\n")
      : "";

    if (!subject || !topic) {
      return new Response(
        JSON.stringify({ error: "Subject and topic are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = `You are an expert university & exam preparation professor creating a high-quality practice quiz for a student.

Subject: ${subject}
Topic: ${topic}
Target Difficulty: ${difficulty}
Number of Questions: ${count}
${courseContext ? `Student academic level/context: ${courseContext}` : ""}
${searchSnippets ? `Reference context from verified study snippets:\n${searchSnippets}` : ""}

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

    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let responseText = "";
    let modelUsed = "";
    let lastModelError = "";

    for (const modelName of candidateModels) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "edusync-ai-quiz",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json",
              },
            }),
          },
        );

        if (!resp.ok) {
          const errText = await resp.text().catch(() => "Unknown error");
          lastModelError = `Model ${modelName} HTTP ${resp.status}: ${errText.slice(0, 200)}`;
          continue;
        }

        const data = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          responseText = text.trim();
          modelUsed = modelName;
          break;
        }
        lastModelError = `Model ${modelName} returned empty content.`;
      } catch (err: unknown) {
        lastModelError = err instanceof Error ? err.message : String(err);
        continue;
      }
    }

    if (!responseText) {
      return new Response(
        JSON.stringify({
          error: `AI quiz generation error: ${lastModelError || "Models currently experiencing high demand. Please retry."}`,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }

    let questionsRaw: unknown;
    try {
      questionsRaw = JSON.parse(cleanJson);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI returned malformed JSON." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawList = Array.isArray(questionsRaw)
      ? questionsRaw
      : typeof questionsRaw === "object" && questionsRaw !== null && Array.isArray((questionsRaw as Record<string, unknown>).questions)
      ? (questionsRaw as { questions: unknown[] }).questions
      : [];

    if (!Array.isArray(rawList) || rawList.length === 0) {
      return new Response(
        JSON.stringify({ error: "AI did not return a valid list of questions." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const validatedQuestions: GeneratedQuestion[] = [];
    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      if (!item || typeof item !== "object") continue;
      const q = item as Record<string, unknown>;
      const question = typeof q.question === "string" ? q.question.trim() : "";
      const options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()) : [];
      const correctIdx = Number(q.correctAnswerIndex);
      const explanation = typeof q.explanation === "string" ? q.explanation.trim() : "";

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
      return new Response(
        JSON.stringify({ error: "Generated questions did not pass validation checks. Please retry." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        questions: validatedQuestions,
        topic,
        subject,
        difficulty,
        modelUsed,
        count: validatedQuestions.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
