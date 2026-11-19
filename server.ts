import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createExpressApp } from './server/app.ts';
import { bootstrapApplication } from './server/seed/bootstrap.ts';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  let isReady = false;
  let bootstrapError: Error | null = null;
  let resolveReady!: () => void;
  let rejectReady!: (err: Error) => void;

  const readyPromise = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  const app = createExpressApp({
    waitForReady: () => readyPromise,
    getReadyState: () => ({ ready: isReady, error: bootstrapError?.message ?? null }),
  });

  const httpServer = http.createServer(app);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[NeuroPredict] Server listening on http://0.0.0.0:${PORT}`);
    setImmediate(() => {
      console.log('[NeuroPredict] Bootstrapping database, demo accounts, and TensorFlow.js ANN...');
      bootstrapApplication()
        .then(() => {
          isReady = true;
          console.log('[NeuroPredict] Initialization complete.');
          resolveReady();
        })
        .catch((err) => {
          bootstrapError = err instanceof Error ? err : new Error(String(err));
          console.error('[NeuroPredict] Fatal initialization error:', bootstrapError);
          rejectReady(bootstrapError);
          process.exit(1);
        });
    });
  });
}

startServer().catch((err) => {
  console.error('[NeuroPredict] Fatal startup error:', err);
  process.exit(1);
});
