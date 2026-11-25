import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import criarPedidoHandler from './api/criar-pedido.ts';
import paginaSlugHandler from './api/pagina/[slug].ts';
import excluirContaHandler from './api/excluir-conta.ts';
import cronExpurgoHandler from './api/cron/expurgo.ts';
import notificarPedidoHandler from './api/notificar-pedido.ts';

function adaptarVercelHandler(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<unknown> | unknown
) {
  return async (req: Request, res: Response) => {
    const reqAdaptado = req as unknown as VercelRequest;
    reqAdaptado.query = { ...req.query, ...req.params } as VercelRequest['query'];
    const resAdaptado = res as unknown as VercelResponse;
    await handler(reqAdaptado, resAdaptado);
  };
}

async function iniciarServidor() {
  const app = express();
  app.use(express.json({ limit: '6mb' }));

  // Rotas /api idênticas às Vercel Serverless Functions
  app.post('/api/criar-pedido', adaptarVercelHandler(criarPedidoHandler));
  app.get('/api/pagina/:slug', adaptarVercelHandler(paginaSlugHandler));
  app.post('/api/excluir-conta', adaptarVercelHandler(excluirContaHandler));
  app.get('/api/cron/expurgo', adaptarVercelHandler(cronExpurgoHandler));
  app.post('/api/notificar-pedido', adaptarVercelHandler(notificarPedidoHandler));

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build não encontrado.');
      }
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor ativo em http://localhost:${port}`);
  });
}

void iniciarServidor();
