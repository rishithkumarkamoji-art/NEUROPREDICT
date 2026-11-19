import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createExpressApp } from './server/app';
import { bootstrapApplication } from './server/seed/bootstrap';

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  console.log('[NeuroPredict] Bootstrapping database, demo accounts, and TensorFlow.js ANN...');
  await bootstrapApplication();
  console.log('[NeuroPredict] Initialization complete.');

  const app = createExpressApp();

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NeuroPredict] Server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[NeuroPredict] Fatal startup error:', err);
  process.exit(1);
});
