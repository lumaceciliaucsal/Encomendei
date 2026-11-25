import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminAuth, getAdminFirestore } from './_lib/firebaseAdmin.js';

async function apagarSubcolecaoEmLotes(
  db: ReturnType<typeof getAdminFirestore>,
  colRef: FirebaseFirestore.CollectionReference
) {
  const snap = await colRef.get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();
}

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
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const db = getAdminFirestore();

    const artesaoRef = db.collection('artesaos').doc(uid);
    const artesaoSnap = await artesaoRef.get();
    const slugArtesao = artesaoSnap.exists ? String(artesaoSnap.data()?.slug || '') : '';

    // 1. Apagar pedidos e subcoleções (imagens, orcamentos, historico)
    const pedidosSnap = await artesaoRef.collection('pedidos').get();
    for (const pedidoDoc of pedidosSnap.docs) {
      await apagarSubcolecaoEmLotes(db, pedidoDoc.ref.collection('imagens'));
      await apagarSubcolecaoEmLotes(db, pedidoDoc.ref.collection('orcamentos'));
      await apagarSubcolecaoEmLotes(db, pedidoDoc.ref.collection('historico'));
      await pedidoDoc.ref.delete();
    }

    // 2. Apagar registro mensal de uso
    await apagarSubcolecaoEmLotes(db, artesaoRef.collection('uso'));

    // 3. Apagar perfil privado
    if (artesaoSnap.exists) {
      await artesaoRef.delete();
    }

    // 4. Apagar portfólio e perfil público
    const perfilRef = db.collection('perfisPublicos').doc(uid);
    await apagarSubcolecaoEmLotes(db, perfilRef.collection('portfolio'));
    const perfilSnap = await perfilRef.get();
    const slugPerfil = perfilSnap.exists ? String(perfilSnap.data()?.slug || '') : '';
    if (perfilSnap.exists) {
      await perfilRef.delete();
    }

    // 5. Liberar slugs reservados pelo usuário
    const slugsCandidatos = new Set<string>();
    if (slugArtesao) slugsCandidatos.add(slugArtesao);
    if (slugPerfil) slugsCandidatos.add(slugPerfil);
    for (const slug of slugsCandidatos) {
      const slugRef = db.collection('slugs').doc(slug);
      const slugSnap = await slugRef.get();
      if (slugSnap.exists && slugSnap.data()?.uid === uid) {
        await slugRef.delete();
      }
    }

    // Também garante remoção de qualquer slug órfão pertencente ao uid
    const slugsByUidSnap = await db.collection('slugs').where('uid', '==', uid).get();
    for (const sDoc of slugsByUidSnap.docs) {
      await sDoc.ref.delete();
    }

    // 6. Excluir conta no Firebase Auth
    await adminAuth.deleteUser(uid);

    return res.status(200).json({
      ok: true,
      mensagem: 'Conta, portfólio, pedidos e imagens excluídos permanentemente.',
    });
  } catch (err) {
    console.error('Erro em /api/excluir-conta:', err);
    return res.status(500).json({
      ok: false,
      erro: 'Não foi possível concluir a exclusão da conta.',
    });
  }
}
