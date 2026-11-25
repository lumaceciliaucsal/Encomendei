import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { X, Calendar, Lock, FileText, Image as ImageIcon } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  TRANSICOES_RN04,
  calcularDataEntregaEstimada,
  ehStatusTerminal,
  formatarDataBr,
  formatarMoedaBrl,
  podeTransicionarStatus,
  proximaVersaoOrcamento,
  type StatusPedido,
} from '../lib/regras';
import type {
  ArtesaoDoc,
  HistoricoEventoDoc,
  ImagemPedidoDoc,
  OrcamentoVersaoDoc,
  PedidoDoc,
} from '../lib/tipos';
import { CalculadoraOrcamento, type DadosOrcamentoGerado } from './CalculadoraOrcamento';

interface ModalDetalhePedidoProps {
  uid: string;
  artesao: ArtesaoDoc;
  pedido: PedidoDoc;
  onFechar: () => void;
}

export function ModalDetalhePedido({
  uid,
  artesao,
  pedido,
  onFechar,
}: ModalDetalhePedidoProps) {
  const [aba, setAba] = useState<'resumo' | 'orcamento' | 'historico'>('resumo');
  const [imagens, setImagens] = useState<ImagemPedidoDoc[]>([]);
  const [orcamentos, setOrcamentos] = useState<OrcamentoVersaoDoc[]>([]);
  const [historico, setHistorico] = useState<HistoricoEventoDoc[]>([]);
  const [notasInternas, setNotasInternas] = useState<string>(pedido.notasInternas || '');
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [imagemAmpliada, setImagemAmpliada] = useState<ImagemPedidoDoc | null>(null);

  useEffect(() => {
    setNotasInternas(pedido.notasInternas || '');
  }, [pedido.id, pedido.notasInternas]);

  useEffect(() => {
    const basePedido = `artesaos/${uid}/pedidos/${pedido.id}`;

    const unsubImgs = onSnapshot(
      collection(db, 'artesaos', uid, 'pedidos', pedido.id, 'imagens'),
      (snap) => {
        setImagens(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ImagemPedidoDoc, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `${basePedido}/imagens`)
    );

    const unsubOrcs = onSnapshot(
      query(
        collection(db, 'artesaos', uid, 'pedidos', pedido.id, 'orcamentos'),
        orderBy('versao', 'desc')
      ),
      (snap) => {
        setOrcamentos(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OrcamentoVersaoDoc, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `${basePedido}/orcamentos`)
    );

    const unsubHist = onSnapshot(
      query(
        collection(db, 'artesaos', uid, 'pedidos', pedido.id, 'historico'),
        orderBy('criadoEm', 'desc')
      ),
      (snap) => {
        setHistorico(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<HistoricoEventoDoc, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `${basePedido}/historico`)
    );

    return () => {
      unsubImgs();
      unsubOrcs();
      unsubHist();
    };
  }, [uid, pedido.id]);

  const ehTerminal = ehStatusTerminal(pedido.status);
  const proximosStatus = TRANSICOES_RN04[pedido.status] ?? [];

  const alterarStatus = async (novoStatus: StatusPedido) => {
    if (!podeTransicionarStatus(pedido.status, novoStatus)) return;
    setSalvandoStatus(true);
    setAviso(null);
    const pathPedido = `artesaos/${uid}/pedidos/${pedido.id}`;
    try {
      const batch = writeBatch(db);
      const pedidoRef = doc(db, 'artesaos', uid, 'pedidos', pedido.id);
      const payloadUpdate: Record<string, unknown> = {
        status: novoStatus,
        atualizadoEm: serverTimestamp(),
      };
      if (ehStatusTerminal(novoStatus)) {
        payloadUpdate.encerradoEm = serverTimestamp();
      }
      batch.update(pedidoRef, payloadUpdate);

      const histRef = doc(collection(db, 'artesaos', uid, 'pedidos', pedido.id, 'historico'));
      batch.set(histRef, {
        tipo: 'status',
        descricao: `Status alterado de "${pedido.status}" para "${novoStatus}".`,
        autor: 'artesao',
        criadoEm: serverTimestamp(),
      });

      await batch.commit();
      setAviso(`Status atualizado para ${novoStatus}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, pathPedido);
    } finally {
      setSalvandoStatus(false);
    }
  };

  const salvarNotas = async () => {
    if (ehTerminal) return;
    setSalvandoNota(true);
    setAviso(null);
    const pathPedido = `artesaos/${uid}/pedidos/${pedido.id}`;
    try {
      await updateDoc(doc(db, 'artesaos', uid, 'pedidos', pedido.id), {
        notasInternas: notasInternas.trim().slice(0, 1000),
        atualizadoEm: serverTimestamp(),
      });
      await addDoc(collection(db, 'artesaos', uid, 'pedidos', pedido.id, 'historico'), {
        tipo: 'nota',
        descricao: 'Notas internas do ateliê atualizadas.',
        autor: 'artesao',
        criadoEm: serverTimestamp(),
      });
      setAviso('Notas salvas no pedido.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, pathPedido);
    } finally {
      setSalvandoNota(false);
    }
  };

  const salvarNovaVersaoOrcamento = async (dados: DadosOrcamentoGerado) => {
    if (ehTerminal) return;
    setSalvandoOrcamento(true);
    setAviso(null);
    const pathPedido = `artesaos/${uid}/pedidos/${pedido.id}`;

    try {
      const novaVersao = proximaVersaoOrcamento(orcamentos.map((o) => o.versao));
      const dataEntrega = calcularDataEntregaEstimada(dados.prazoEstimadoDias);

      const batch = writeBatch(db);
      const orcRef = doc(collection(db, 'artesaos', uid, 'pedidos', pedido.id, 'orcamentos'));
      batch.set(orcRef, {
        versao: novaVersao,
        custoMateriais: dados.resultado.custoMateriais,
        horasTrabalho: dados.horasTrabalho,
        valorHora: dados.valorHora,
        percentualIndireto: dados.percentualIndireto,
        percentualMargem: dados.percentualMargem,
        percentualTaxa: dados.percentualTaxa,
        descontoValor: dados.descontoValor,
        valorTotal: dados.resultado.valorTotal,
        sinalEntrada: dados.resultado.sinalEntrada,
        lucroLiquidoEstimado: dados.resultado.lucroLiquidoEstimado,
        prazoEstimadoDias: dados.prazoEstimadoDias,
        validadeDias: dados.validadeDias,
        observacoes: dados.observacoes.trim().slice(0, 1000),
        itensMateriais: dados.itensMateriais.slice(0, 30),
        criadoEm: serverTimestamp(),
      });

      const pedidoRef = doc(db, 'artesaos', uid, 'pedidos', pedido.id);
      const podeIrAguardando = podeTransicionarStatus(pedido.status, 'Aguardando Aprovação');
      const updatePedido: Record<string, unknown> = {
        orcamentoAtual: {
          versao: novaVersao,
          valorTotal: dados.resultado.valorTotal,
          sinalEntrada: dados.resultado.sinalEntrada,
          validadeDias: dados.validadeDias,
          observacoes: dados.observacoes.trim().slice(0, 1000),
          criadoEm: serverTimestamp(),
        },
        prazoEstimadoDias: dados.prazoEstimadoDias,
        dataEntregaPrevista: dataEntrega,
        atualizadoEm: serverTimestamp(),
      };
      if (podeIrAguardando) {
        updatePedido.status = 'Aguardando Aprovação';
      }
      batch.update(pedidoRef, updatePedido);

      const histRef = doc(collection(db, 'artesaos', uid, 'pedidos', pedido.id, 'historico'));
      batch.set(histRef, {
        tipo: 'orcamento',
        descricao: `Orçamento v${novaVersao} emitido no valor de ${formatarMoedaBrl(dados.resultado.valorTotal)} (prazo ${dados.prazoEstimadoDias} dias).`,
        autor: 'artesao',
        criadoEm: serverTimestamp(),
      });

      await batch.commit();
      setAviso(`Orçamento v${novaVersao} salvo com sucesso.`);
      setAba('resumo');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, pathPedido);
    } finally {
      setSalvandoOrcamento(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#2D254E]/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-pedido"
    >
      <div className="bg-[#FAF9FC] border border-[#E4DFEC] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-white border-b border-[#E4DFEC] px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#728168] mb-1">
              <span className="font-mono font-semibold text-[#2D254E]">{pedido.codigo}</span>
              <span aria-hidden="true">·</span>
              <span>{pedido.categoria}</span>
              <span aria-hidden="true">·</span>
              <span>Status: {pedido.status}</span>
            </div>
            <h2
              id="titulo-modal-pedido"
              className="font-display text-xl font-semibold text-[#2D254E] truncate"
            >
              {pedido.titulo}
            </h2>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar detalhes do pedido"
            className="p-2 rounded-lg text-[#728168] hover:text-[#2D254E] hover:bg-[#F4F2F7] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navegação de abas */}
        <div className="bg-white border-b border-[#E4DFEC] px-6 flex items-center gap-1 py-2">
          <button
            type="button"
            onClick={() => setAba('resumo')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              aba === 'resumo'
                ? 'bg-[#2D254E] text-white'
                : 'text-[#728168] hover:text-[#2D254E] hover:bg-[#F4F2F7]'
            }`}
          >
            Resumo e anexos
          </button>
          <button
            type="button"
            onClick={() => setAba('orcamento')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              aba === 'orcamento'
                ? 'bg-[#2D254E] text-white'
                : 'text-[#728168] hover:text-[#2D254E] hover:bg-[#F4F2F7]'
            }`}
          >
            Calculadora e versões ({orcamentos.length})
          </button>
          <button
            type="button"
            onClick={() => setAba('historico')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              aba === 'historico'
                ? 'bg-[#2D254E] text-white'
                : 'text-[#728168] hover:text-[#2D254E] hover:bg-[#F4F2F7]'
            }`}
          >
            Histórico ({historico.length})
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {aviso && (
            <div className="bg-[#94D665]/20 border border-[#94D665] text-[#2D254E] text-sm px-4 py-3 rounded-xl">
              {aviso}
            </div>
          )}

          {ehTerminal && (
            <div className="bg-[#F4F2F7] border border-[#E4DFEC] text-[#2D254E] text-sm px-4 py-3 rounded-xl flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-[#728168] shrink-0" />
              <span>
                Este pedido está em estado terminal ({pedido.status}). Alterações de status e
                orçamento estão bloqueadas pela regra de integridade (RN04).
              </span>
            </div>
          )}

          {aba === 'resumo' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-5">
                <div className="bg-white border border-[#E4DFEC] rounded-xl p-5 space-y-4">
                  <h3 className="font-display text-base font-semibold text-[#2D254E]">
                    Solicitação do cliente
                  </h3>
                  <p className="text-sm text-[#2D254E]/90 whitespace-pre-line leading-relaxed">
                    {pedido.descricao}
                  </p>
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#E4DFEC] text-xs">
                    <div>
                      <span className="block text-[#728168]">Medidas / especificações</span>
                      <span className="font-medium text-[#2D254E]">
                        {pedido.medidas || 'Não informado'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[#728168]">Prazo desejado</span>
                      <span className="font-medium text-[#2D254E]">
                        {pedido.prazoDesejadoTexto || 'Flexível'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[#728168]">Referência de valor</span>
                      <span className="font-mono tabular-nums font-medium text-[#2D254E]">
                        {pedido.orcamentoClienteDesejado != null
                          ? formatarMoedaBrl(pedido.orcamentoClienteDesejado)
                          : 'A combinar'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[#728168]">Consentimento LGPD</span>
                      <span className="font-medium text-[#2D254E]">
                        Confirmado (v{pedido.consentimentoVersao})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Imagens anexadas */}
                <div className="bg-white border border-[#E4DFEC] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-base font-semibold text-[#2D254E] flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#728168]" />
                      Referências visuais ({imagens.length})
                    </h3>
                  </div>
                  {imagens.length === 0 ? (
                    <p className="text-xs text-[#728168]">
                      Nenhuma imagem enviada com este pedido.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {imagens.map((img) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setImagemAmpliada(img)}
                          className="group relative aspect-4/3 rounded-lg overflow-hidden border border-[#E4DFEC] bg-[#F4F2F7] text-left cursor-pointer"
                        >
                          <img
                            src={img.dataBase64}
                            alt={img.nome}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notas internas */}
                <div className="bg-white border border-[#E4DFEC] rounded-xl p-5 space-y-3">
                  <h3 className="font-display text-base font-semibold text-[#2D254E]">
                    Notas internas do ateliê
                  </h3>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    disabled={ehTerminal}
                    value={notasInternas}
                    onChange={(e) => setNotasInternas(e.target.value)}
                    placeholder="Anotações de fornecedores, lotes de material ou combinados..."
                    className="w-full px-3 py-2 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] disabled:opacity-60 focus:outline-none focus:border-[#D065D6]"
                  />
                  {!ehTerminal && (
                    <button
                      type="button"
                      disabled={salvandoNota}
                      onClick={salvarNotas}
                      className="px-4 py-2 rounded-lg bg-[#2D254E] text-white text-xs font-medium hover:bg-[#2D254E]/90 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {salvandoNota ? 'Salvando...' : 'Salvar notas'}
                    </button>
                  )}
                </div>
              </div>

              {/* Coluna direita: contato + status + resumo orçamento */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-white border border-[#E4DFEC] rounded-xl p-5 space-y-3">
                  <h3 className="font-display text-base font-semibold text-[#2D254E]">
                    Dados de contato
                  </h3>
                  <div className="space-y-1.5 text-sm">
                    <p className="font-medium text-[#2D254E]">{pedido.clienteNome}</p>
                    <p className="text-[#728168]">{pedido.clienteEmail}</p>
                    {pedido.clienteWhatsApp && (
                      <p className="font-mono text-xs text-[#2D254E]">{pedido.clienteWhatsApp}</p>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-[#E4DFEC] rounded-xl p-5 space-y-3">
                  <h3 className="font-display text-base font-semibold text-[#2D254E]">
                    Transição de status (RN04)
                  </h3>
                  <p className="text-xs text-[#728168]">
                    Status atual: <strong className="text-[#2D254E]">{pedido.status}</strong>
                  </p>
                  {proximosStatus.length === 0 ? (
                    <p className="text-xs text-[#728168]">
                      Não há novas transições disponíveis a partir deste estado.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {proximosStatus.map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={salvandoStatus}
                          onClick={() => alterarStatus(st)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                            st === 'Cancelado' || st === 'Recusado'
                              ? 'border border-[#E4DFEC] text-[#728168] hover:text-[#2D254E] hover:bg-[#F4F2F7]'
                              : 'bg-[#2D254E] text-white hover:bg-[#2D254E]/90'
                          }`}
                        >
                          Mover para {st}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-[#E4DFEC] rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-semibold text-[#2D254E]">
                      Orçamento vigente
                    </h3>
                    {!ehTerminal && (
                      <button
                        type="button"
                        onClick={() => setAba('orcamento')}
                        className="text-xs font-medium text-[#D065D6] hover:underline cursor-pointer"
                      >
                        {pedido.orcamentoAtual ? 'Nova versão' : 'Criar orçamento'}
                      </button>
                    )}
                  </div>
                  {pedido.orcamentoAtual ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#728168]">Versão</span>
                        <span className="font-mono font-medium">v{pedido.orcamentoAtual.versao}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#728168]">Valor total</span>
                        <span className="font-mono tabular-nums font-semibold text-[#2D254E]">
                          {formatarMoedaBrl(pedido.orcamentoAtual.valorTotal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#728168]">Sinal de entrada</span>
                        <span className="font-mono tabular-nums">
                          {formatarMoedaBrl(pedido.orcamentoAtual.sinalEntrada)}
                        </span>
                      </div>
                      {pedido.dataEntregaPrevista && (
                        <div className="flex justify-between items-center pt-2 border-t border-[#E4DFEC] text-xs">
                          <span className="text-[#728168] flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Entrega estimada
                          </span>
                          <span className="font-mono tabular-nums font-medium">
                            {formatarDataBr(pedido.dataEntregaPrevista)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[#728168]">
                      Nenhum orçamento emitido ainda para esta solicitação.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {aba === 'orcamento' && (
            <div className="space-y-6">
              {!ehTerminal && (
                <CalculadoraOrcamento
                  valorHoraInicial={artesao.valorHoraPadrao ?? 55}
                  margemInicial={artesao.margemPadrao ?? 35}
                  taxaInicial={artesao.taxaPlataformaPadrao ?? 4.99}
                  indiretoInicial={artesao.percentualIndiretoPadrao ?? 12}
                  prazoInicialDias={pedido.prazoEstimadoDias ?? 14}
                  salvando={salvandoOrcamento}
                  textoBotaoSalvar={`Emitir orçamento v${proximaVersaoOrcamento(orcamentos.map((o) => o.versao))}`}
                  onSalvarOrcamento={salvarNovaVersaoOrcamento}
                />
              )}

              <div className="bg-white border border-[#E4DFEC] rounded-xl p-5">
                <h3 className="font-display text-base font-semibold text-[#2D254E] mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#728168]" />
                  Versões emitidas (RN07 — histórico imutável)
                </h3>
                {orcamentos.length === 0 ? (
                  <p className="text-sm text-[#728168]">
                    Nenhuma versão registrada ainda.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E4DFEC]">
                    {orcamentos.map((orc) => (
                      <div key={orc.id} className="py-3.5 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-[#2D254E]">
                            <span className="font-mono">Versão {orc.versao}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {formatarMoedaBrl(orc.valorTotal)}
                            </span>
                          </div>
                          <p className="text-xs text-[#728168] mt-0.5">
                            Materiais {formatarMoedaBrl(orc.custoMateriais)} · {orc.horasTrabalho}h ·
                            Prazo {orc.prazoEstimadoDias} dias · Validade {orc.validadeDias} dias
                          </p>
                          {orc.observacoes && (
                            <p className="text-xs text-[#2D254E]/80 mt-1">{orc.observacoes}</p>
                          )}
                        </div>
                        <div className="text-right text-xs text-[#728168]">
                          <span className="block">Sinal</span>
                          <span className="font-mono tabular-nums font-medium text-[#2D254E]">
                            {formatarMoedaBrl(orc.sinalEntrada)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {aba === 'historico' && (
            <div className="bg-white border border-[#E4DFEC] rounded-xl p-5">
              <h3 className="font-display text-base font-semibold text-[#2D254E] mb-4">
                Trilha de auditoria do pedido
              </h3>
              {historico.length === 0 ? (
                <p className="text-sm text-[#728168]">Nenhum evento registrado.</p>
              ) : (
                <div className="divide-y divide-[#E4DFEC]">
                  {historico.map((ev) => (
                    <div key={ev.id} className="py-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-[#2D254E]">{ev.descricao}</p>
                        <p className="text-xs text-[#728168] mt-0.5">
                          Origem: {ev.autor} · Tipo: {ev.tipo}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox simples de imagem */}
      {imagemAmpliada && (
        <div
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setImagemAmpliada(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setImagemAmpliada(null)}
              aria-label="Fechar imagem"
              className="absolute -top-10 right-0 text-white hover:text-[#94D665] cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={imagemAmpliada.dataBase64}
              alt={imagemAmpliada.nome}
              referrerPolicy="no-referrer"
              className="max-h-[80vh] rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
