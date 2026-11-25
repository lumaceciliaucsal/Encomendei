import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from './_lib/firebaseAdmin.js';
import {
  PLANOS,
  obterMesReferenciaBahia,
  validarConsentimentoLgpd,
  validarListaImagensPedido,
  validarSlug,
  verificarLimitePlano,
  type PlanoId,
} from '../src/lib/regras.js';

function limparTexto(valor: unknown, maxLen: number): string {
  if (typeof valor !== 'string') return '';
  return valor.trim().slice(0, maxLen);
}

function validarEmailBasico(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 120;
}

async function enviarNotificacaoEmail(params: {
  emailArtesao: string;
  nomeAtelie: string;
  codigoPedido: string;
  clienteNome: string;
  titulo: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !params.emailArtesao) {
    return false;
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Ofício & Medida <onboarding@resend.dev>';
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [params.emailArtesao],
        subject: `Novo pedido ${params.codigoPedido} — ${params.titulo}`,
        text: [
          `Olá, ${params.nomeAtelie}!`,
          '',
          `Você recebeu um novo pedido sob medida (${params.codigoPedido}).`,
          `Cliente: ${params.clienteNome}`,
          `Peça solicitada: ${params.titulo}`,
          '',
          'Acesse seu painel Kanban para preparar o orçamento.',
        ].join('\n'),
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, erro: 'Método não permitido.' });
  }

  const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
  if (!body) {
    return res.status(400).json({ ok: false, erro: 'Corpo da requisição inválido.' });
  }

  const slug = limparTexto(body.slug, 40).toLowerCase();
  const uidBody = limparTexto(body.uidArtesao, 128);
  const clienteNome = limparTexto(body.clienteNome, 100);
  const clienteEmail = limparTexto(body.clienteEmail, 120).toLowerCase();
  const clienteWhatsApp = limparTexto(body.clienteWhatsApp, 30);
  const categoria = limparTexto(body.categoria, 60);
  const titulo = limparTexto(body.titulo, 120);
  const descricao = limparTexto(body.descricao, 2000);
  const medidas = limparTexto(body.medidas, 200);
  const prazoDesejadoTexto = limparTexto(body.prazoDesejadoTexto, 80);
  const consentimentoLgpd = validarConsentimentoLgpd(body.consentimentoLgpd);

  const orcamentoBruto = body.orcamentoClienteDesejado;
  let orcamentoClienteDesejado: number | null = null;
  if (orcamentoBruto !== undefined && orcamentoBruto !== null && orcamentoBruto !== '') {
    const num = Number(orcamentoBruto);
    if (!Number.isFinite(num) || num < 0 || num > 1000000) {
      return res.status(400).json({
        ok: false,
        erro: 'Orçamento estimado informado é inválido.',
        campos: { orcamentoClienteDesejado: 'Informe um valor positivo válido.' },
      });
    }
    orcamentoClienteDesejado = Math.round(num * 100) / 100;
  }

  const campos: Record<string, string> = {};
  if (!slug && !uidBody) {
    campos.slug = 'Ateliê de destino não identificado.';
  } else if (slug && !validarSlug(slug).valido) {
    campos.slug = 'Endereço do ateliê inválido.';
  }
  if (clienteNome.length < 2) {
    campos.clienteNome = 'Informe seu nome completo (mínimo 2 caracteres).';
  }
  if (!validarEmailBasico(clienteEmail)) {
    campos.clienteEmail = 'Informe um e-mail válido para contato.';
  }
  if (categoria.length < 2) {
    campos.categoria = 'Selecione ou informe a categoria da peça.';
  }
  if (titulo.length < 3) {
    campos.titulo = 'Informe um título breve para a encomenda.';
  }
  if (descricao.length < 10) {
    campos.descricao = 'Descreva os detalhes da encomenda (mínimo 10 caracteres).';
  }
  if (!consentimentoLgpd) {
    campos.consentimentoLgpd = 'É obrigatório concordar com o uso dos dados (LGPD).';
  }

  const validacaoImagens = validarListaImagensPedido(body.imagens);
  if (!validacaoImagens.valido) {
    campos.imagens = validacaoImagens.erro || 'Imagens inválidas.';
  }

  if (Object.keys(campos).length > 0) {
    return res.status(400).json({
      ok: false,
      erro: 'Verifique os campos obrigatórios antes de enviar.',
      campos,
    });
  }

  try {
    const db = getAdminFirestore();

    // Resolver UID a partir do slug público
    let uidArtesao = uidBody;
    if (slug) {
      const slugSnap = await db.collection('slugs').doc(slug).get();
      if (!slugSnap.exists) {
        return res.status(404).json({ ok: false, erro: 'Ateliê não encontrado.' });
      }
      uidArtesao = String(slugSnap.data()?.uid || '');
    }

    if (!uidArtesao || !/^[a-zA-Z0-9_-]+$/.test(uidArtesao)) {
      return res.status(404).json({ ok: false, erro: 'Ateliê não encontrado.' });
    }

    const mesAtual = obterMesReferenciaBahia();
    const artesaoRef = db.collection('artesaos').doc(uidArtesao);
    const perfilPublicoRef = db.collection('perfisPublicos').doc(uidArtesao);
    const usoMesRef = artesaoRef.collection('uso').doc(mesAtual);
    const pedidoRef = artesaoRef.collection('pedidos').doc();

    const resultadoTransacao = await db.runTransaction(async (tx) => {
      const [artesaoSnap, perfilSnap, usoSnap] = await Promise.all([
        tx.get(artesaoRef),
        tx.get(perfilPublicoRef),
        tx.get(usoMesRef),
      ]);

      if (!artesaoSnap.exists || !perfilSnap.exists) {
        return { status: 404 as const, erro: 'Ateliê não disponível.' };
      }

      const artesao = artesaoSnap.data()!;
      const perfil = perfilSnap.data()!;
      if (perfil.ativo === false) {
        return { status: 403 as const, erro: 'Este ateliê está temporariamente pausado.' };
      }

      const plano = (artesao.plano as PlanoId) || 'gratuito';
      const usoNoMes = usoSnap.exists
        ? Number(usoSnap.data()?.quantidade || 0)
        : artesao.mesReferencia === mesAtual
          ? Number(artesao.uso || 0)
          : 0;

      const checagem = verificarLimitePlano(plano, usoNoMes);
      if (!checagem.permitido) {
        tx.update(artesaoRef, {
          aceitandoPedidos: false,
          uso: usoNoMes,
          mesReferencia: mesAtual,
          atualizadoEm: FieldValue.serverTimestamp(),
        });
        tx.update(perfilPublicoRef, {
          aceitandoPedidos: false,
          atualizadoEm: FieldValue.serverTimestamp(),
        });
        return {
          status: 429 as const,
          codigoErro: 'LIMITE_PLANO_ATINGIDO',
          erro: 'Este ateliê atingiu o limite mensal de pedidos do plano atual.',
        };
      }

      const novoUso = usoNoMes + 1;
      const aposIncremento = verificarLimitePlano(plano, novoUso);
      const aindaAceitando = aposIncremento.permitido;
      const codigoPedido = `PED-${mesAtual.replace('-', '')}-${String(novoUso).padStart(3, '0')}`;

      tx.set(
        usoMesRef,
        {
          mes: mesAtual,
          quantidade: novoUso,
          limite: PLANOS[plano]?.limitePedidosMes ?? null,
          atualizadoEm: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      tx.update(artesaoRef, {
        uso: novoUso,
        mesReferencia: mesAtual,
        aceitandoPedidos: aindaAceitando,
        atualizadoEm: FieldValue.serverTimestamp(),
      });

      tx.update(perfilPublicoRef, {
        aceitandoPedidos: aindaAceitando,
        atualizadoEm: FieldValue.serverTimestamp(),
      });

      tx.set(pedidoRef, {
        uidArtesao,
        codigo: codigoPedido,
        clienteNome,
        clienteEmail,
        clienteWhatsApp,
        categoria,
        titulo,
        descricao,
        medidas,
        orcamentoClienteDesejado,
        prazoDesejadoTexto,
        status: 'Novo',
        consentimentoLgpd: true,
        consentimentoEm: FieldValue.serverTimestamp(),
        consentimentoVersao: '1.0',
        prazoEstimadoDias: null,
        dataEntregaPrevista: null,
        notasInternas: '',
        orcamentoAtual: null,
        totalImagens: validacaoImagens.itens.length,
        criadoEm: FieldValue.serverTimestamp(),
        atualizadoEm: FieldValue.serverTimestamp(),
        encerradoEm: null,
      });

      const historicoRef = pedidoRef.collection('historico').doc();
      tx.set(historicoRef, {
        tipo: 'criacao',
        descricao: 'Pedido enviado pelo cliente com consentimento LGPD (versão 1.0).',
        autor: 'cliente',
        criadoEm: FieldValue.serverTimestamp(),
      });

      for (const img of validacaoImagens.itens) {
        const imgRef = pedidoRef.collection('imagens').doc();
        tx.set(imgRef, {
          nome: img.nome,
          mimeType: img.mimeType,
          tamanhoBytes: img.tamanhoBytes,
          dataBase64: img.dataBase64,
          criadoEm: FieldValue.serverTimestamp(),
        });
      }

      return {
        status: 201 as const,
        pedidoId: pedidoRef.id,
        codigo: codigoPedido,
        aceitandoPedidos: aindaAceitando,
        emailArtesao: String(artesao.email || ''),
        nomeAtelie: String(artesao.nomeAtelie || perfil.nomeAtelie || 'Ateliê'),
      };
    });

    if (resultadoTransacao.status !== 201) {
      return res.status(resultadoTransacao.status).json({
        ok: false,
        codigoErro: 'codigoErro' in resultadoTransacao ? resultadoTransacao.codigoErro : undefined,
        erro: resultadoTransacao.erro,
      });
    }

    const notificadoEmail = await enviarNotificacaoEmail({
      emailArtesao: resultadoTransacao.emailArtesao,
      nomeAtelie: resultadoTransacao.nomeAtelie,
      codigoPedido: resultadoTransacao.codigo,
      clienteNome,
      titulo,
    });

    return res.status(201).json({
      ok: true,
      pedidoId: resultadoTransacao.pedidoId,
      codigo: resultadoTransacao.codigo,
      aceitandoPedidos: resultadoTransacao.aceitandoPedidos,
      notificadoEmail,
    });
  } catch (err) {
    console.error('Erro em /api/criar-pedido:', err);
    return res.status(500).json({
      ok: false,
      erro: 'Não foi possível registrar o pedido agora. Tente novamente em instantes.',
    });
  }
}
