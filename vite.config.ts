import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

function tinyFishApiPlugin(): Plugin {
  return {
    name: 'tinyfish-api-server',
    configureServer(server) {
      server.middlewares.use('/api/tinyfish-search', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let bodyStr = '';
        req.on('data', (chunk) => {
          bodyStr += chunk;
        });

        req.on('end', async () => {
          try {
            const apiKey = process.env.TINYFISH_API_KEY;
            if (!apiKey) {
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
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tinyFishApiPlugin()],
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
