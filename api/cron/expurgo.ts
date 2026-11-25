import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminFirestore } from '../_lib/firebaseAdmin.js';
import { estaElegivelParaExpurgo, type StatusPedido } from '../../src/lib/regras.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, erro: 'Método não permitido.' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  let escopoUidArtesao: string | null = null;
  let autorizadoComoCron = false;

  if (cronSecret && bearerToken === cronSecret) {
    autorizadoComoCron = true;
  } else if (bearerToken) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(bearerToken);
      escopoUidArtesao = decoded.uid;
    } catch {
      return res.status(401).json({ ok: false, erro: 'Token de autorização inválido.' });
    }
  } else {
    return res.status(401).json({ ok: false, erro: 'Autorização obrigatória para rotina de expurgo.' });
  }

  try {
    const db = getAdminFirestore();
    const agoraMs = Date.now();
    const corteMs = agoraMs - 365 * 24 * 60 * 60 * 1000;
    const corteTimestamp = Timestamp.fromMillis(corteMs);

    const statusTerminais: StatusPedido[] = ['Entregue', 'Recusado', 'Cancelado'];
    let pedidosSnapshot;

    if (autorizadoComoCron) {
      pedidosSnapshot = await db
        .collectionGroup('pedidos')
        .where('status', 'in', statusTerminais)
        .where('encerradoEm', '<=', corteTimestamp)
        .limit(200)
        .get();
    } else {
      pedidosSnapshot = await db
        .collection('artesaos')
        .doc(escopoUidArtesao!)
        .collection('pedidos')
        .where('status', 'in', statusTerminais)
        .where('encerradoEm', '<=', corteTimestamp)
        .limit(200)
        .get();
    }

    let anonimizados = 0;
    let imagensRemovidas = 0;

    for (const pedidoDoc of pedidosSnapshot.docs) {
      const dados = pedidoDoc.data();
      if (dados.clienteEmail === 'expurgado@lgpd.local') {
        continue;
      }

      const encerradoEm = dados.encerradoEm as Timestamp | undefined;
      const encerradoMs = encerradoEm ? encerradoEm.toMillis() : null;
      if (!estaElegivelParaExpurgo(dados.status as StatusPedido, encerradoMs, agoraMs)) {
        continue;
      }

      // Remover imagens privadas do pedido
      const imgsSnap = await pedidoDoc.ref.collection('imagens').get();
      if (!imgsSnap.empty) {
        const imgBatch = db.batch();
        imgsSnap.docs.forEach((imgDoc) => imgBatch.delete(imgDoc.ref));
        await imgBatch.commit();
        imagensRemovidas += imgsSnap.size;
      }

      // Anonimizar dados pessoais (LGPD) preservando métricas contábeis/históricas
      await pedidoDoc.ref.update({
        clienteNome: 'Dados expurgados (LGPD)',
        clienteEmail: 'expurgado@lgpd.local',
        clienteWhatsApp: '',
        notasInternas: '',
        totalImagens: 0,
        atualizadoEm: FieldValue.serverTimestamp(),
      });

      await pedidoDoc.ref.collection('historico').add({
        tipo: 'nota',
        descricao: 'Expurgo automático LGPD após 12 meses de encerramento: dados pessoais e anexos removidos.',
        autor: 'sistema',
        criadoEm: FieldValue.serverTimestamp(),
      });

      anonimizados += 1;
    }

    return res.status(200).json({
      ok: true,
      anonimizados,
      imagensRemovidas,
      escopo: autorizadoComoCron ? 'global' : 'artesao',
    });
  } catch (err) {
    console.error('Erro em /api/cron/expurgo:', err);
    return res.status(500).json({
      ok: false,
      erro: 'Falha ao executar rotina de expurgo LGPD.',
    });
  }
}
