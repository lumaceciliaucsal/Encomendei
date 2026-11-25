import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminFirestore } from '../_lib/firebaseAdmin.js';
import { validarSlug } from '../../src/lib/regras.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, erro: 'Método não permitido.' });
  }

  const slugBruto = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  const slug = typeof slugBruto === 'string' ? slugBruto.trim().toLowerCase() : '';

  const check = validarSlug(slug);
  if (!check.valido) {
    return res.status(400).json({ ok: false, erro: check.erro || 'Slug inválido.' });
  }

  try {
    const db = getAdminFirestore();
    const slugSnap = await db.collection('slugs').doc(slug).get();
    if (!slugSnap.exists) {
      return res.status(404).json({ ok: false, erro: 'Ateliê não encontrado.' });
    }

    const uid = String(slugSnap.data()?.uid || '');
    if (!uid) {
      return res.status(404).json({ ok: false, erro: 'Ateliê não encontrado.' });
    }

    const perfilRef = db.collection('perfisPublicos').doc(uid);
    const [perfilSnap, portfolioSnap] = await Promise.all([
      perfilRef.get(),
      perfilRef.collection('portfolio').orderBy('ordem', 'asc').get(),
    ]);

    if (!perfilSnap.exists) {
      return res.status(404).json({ ok: false, erro: 'Perfil público não encontrado.' });
    }

    const p = perfilSnap.data()!;
    if (p.ativo === false) {
      return res.status(404).json({ ok: false, erro: 'Página pública inativa.' });
    }

    const perfilPublico = {
      uid: p.uid,
      slug: p.slug,
      nomeAtelie: p.nomeAtelie,
      especialidade: p.especialidade,
      cidadeUf: p.cidadeUf || '',
      bio: p.bio || '',
      prazoMedioDias: p.prazoMedioDias,
      aceitandoPedidos: Boolean(p.aceitandoPedidos),
      ativo: Boolean(p.ativo),
      corDestaque: p.corDestaque || '#2D254E',
      categorias: Array.isArray(p.categorias) ? p.categorias : [],
    };

    const portfolio = portfolioSnap.docs.map((docSnap) => {
      const item = docSnap.data();
      return {
        id: docSnap.id,
        uid: item.uid,
        titulo: item.titulo,
        categoria: item.categoria,
        descricao: item.descricao || '',
        tempoProducaoDias: item.tempoProducaoDias,
        precoReferencia: item.precoReferencia,
        imagemBase64: item.imagemBase64,
        ordem: item.ordem ?? 0,
      };
    });

    return res.status(200).json({
      ok: true,
      perfil: perfilPublico,
      portfolio,
    });
  } catch (err) {
    console.error('Erro em /api/pagina/[slug]:', err);
    return res.status(500).json({ ok: false, erro: 'Erro ao carregar página pública.' });
  }
}
