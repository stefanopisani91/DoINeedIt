import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Serves the Netlify Edge Functions under /api/* during development, so the app
 * can be developed and tested end to end without extra tooling.
 * In production Netlify serves them at the path declared in each function's config.
 */
function localFunctions(): Plugin {
  return {
    name: 'local-netlify-functions',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const match = /^\/api\/([a-z0-9-]+)\/?$/i.exec(url.pathname);
        if (!match) return next();
        const file = path.resolve(server.config.root, 'netlify/edge-functions', `${match[1]}.ts`);
        if (!existsSync(file)) return next();
        try {
          const mod = (await server.ssrLoadModule(file)) as {
            default: (request: Request) => Promise<Response>;
          };
          const body =
            req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req);
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body,
          });
          const response = await mod.default(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ ok: false, reason: 'error', message: String(error) }));
        }
      });
    },
  };
}

function readBody(req: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => (data += chunk.toString()));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/**
 * Installable app: precaches the app shell at build time and serves it offline.
 * The manifest is a static file (public/manifest.webmanifest) so it is served in
 * development too. The worker exists only in production builds: `npm run dev`
 * and the end-to-end suite never see a cached version.
 */
function pwa(): Plugin[] {
  return VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    manifest: false,
    devOptions: { enabled: false },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/api\//],
      cleanupOutdatedCaches: true,
    },
  });
}

/** The app version from package.json, shown in the footer and in the settings. */
const appVersion = (
  JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;

export default defineConfig({
  plugins: [react(), tailwindcss(), localFunctions(), pwa()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    sourcemap: false,
  },
});
