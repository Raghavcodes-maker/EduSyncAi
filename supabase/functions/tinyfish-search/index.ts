Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("TINYFISH_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "TINYFISH_API_KEY is not configured. Set it as an edge function secret.",
          configured: false,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    const { query, domain_type, purpose } = body as {
      query?: string;
      domain_type?: string;
      purpose?: string;
    };

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'query' field." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const params = new URLSearchParams({ query: query.trim() });
    if (domain_type && ["web", "news", "research_paper"].includes(domain_type)) {
      params.set("domain_type", domain_type);
    }
    if (purpose && typeof purpose === "string" && purpose.trim().length > 0) {
      params.set("purpose", purpose.trim().slice(0, 2000));
    }

    const apiUrl = `https://api.search.tinyfish.ai?${params.toString()}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: { "X-API-Key": apiKey },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return new Response(
        JSON.stringify({
          error: `TinyFish API returned status ${response.status}`,
          details: errorText,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ ...data, configured: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
