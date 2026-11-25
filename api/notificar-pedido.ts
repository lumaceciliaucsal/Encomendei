import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminAuth } from './_lib/firebaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, erro: 'Método não permitido.' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ ok: false, erro: 'Autenticação obrigatória.' });
  }

  try {
    await getAdminAuth().verifyIdToken(token);
  } catch {
    return res.status(401).json({ ok: false, erro: 'Token inválido.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      ok: true,
      enviado: false,
      mensagem: 'Chave Resend não configurada; notificação exibida apenas no painel.',
    });
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const destinatario = typeof body.email === 'string' ? body.email.trim() : '';
  const assunto = typeof body.assunto === 'string' ? body.assunto.trim().slice(0, 120) : 'Novo pedido no ateliê';
  const mensagem = typeof body.mensagem === 'string' ? body.mensagem.trim().slice(0, 2000) : '';

  if (!destinatario || !mensagem) {
    return res.status(400).json({ ok: false, erro: 'Destinatário e mensagem são obrigatórios.' });
  }

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Ofício & Medida <onboarding@resend.dev>';
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [destinatario],
        subject: assunto,
        text: mensagem,
      }),
    });

    return res.status(200).json({
      ok: true,
      enviado: resp.ok,
    });
  } catch (err) {
    console.error('Erro em /api/notificar-pedido:', err);
    return res.status(200).json({
      ok: true,
      enviado: false,
      mensagem: 'Falha ao enviar e-mail externo; aviso mantido no painel.',
    });
  }
}
