import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  Calculator,
  Copy,
  ExternalLink,
  FolderKanban,
  ImagePlus,
  LayoutGrid,
  LogOut,
  Search,
  Settings,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { comprimirImagemNoNavegador } from '../lib/imagens';
import {
  PLANOS,
  STATUS_KANBAN_ATIVOS,
  STATUS_TERMINAIS,
  ehStatusTerminal,
  formatarDataBr,
  formatarMoedaBrl,
  normalizarSlug,
  obterMesReferenciaBahia,
  validarSlug,
  verificarLimitePlano,
  type CorDestaque,
} from '../lib/regras';
import type { ItemPortfolioDoc, PedidoDoc, UsoMensalDoc } from '../lib/tipos';
import { CalculadoraOrcamento } from '../components/CalculadoraOrcamento';
import { ModalDetalhePedido } from '../components/ModalDetalhePedido';

type AbaPainel = 'pedidos' | 'portfolio' | 'calculadora' | 'configuracoes';

const CORES_PALETA: { hex: CorDestaque; nome: string }[] = [
  { hex: '#2D254E', nome: 'Ameixa Profunda' },
  { hex: '#D065D6', nome: 'Orquídea' },
  { hex: '#728168', nome: 'Sálvia Oliva' },
  { hex: '#94D665', nome: 'Folha Clara' },
];

export function PainelArtesao() {
  const { user, authPronto, carregandoDados, artesao, perfilPublico, sair } = useAuth();

  const [aba, setAba] = useState<AbaPainel>('pedidos');
  const [pedidos, setPedidos] = useState<PedidoDoc[]>([]);
  const [portfolio, setPortfolio] = useState<ItemPortfolioDoc[]>([]);
  const [historicoUso, setHistoricoUso] = useState<UsoMensalDoc[]>([]);
  const [buscaPedido, setBuscaPedido] = useState('');
  const [mostrarEncerrados, setMostrarEncerrados] = useState(false);
  const [pedidoSelecionadoId, setPedidoSelecionadoId] = useState<string | null>(null);
  const [avisoCopiaSlug, setAvisoCopiaSlug] = useState(false);

  // Onboarding
  const [onbNomeAtelie, setOnbNomeAtelie] = useState('');
  const [onbEspecialidade, setOnbEspecialidade] = useState('Cerâmica & objetos autorais');
  const [onbSlug, setOnbSlug] = useState('');
  const [onbCidade, setOnbCidade] = useState('');
  const [onbValorHora, setOnbValorHora] = useState(55);
  const [onbErro, setOnbErro] = useState<string | null>(null);
  const [onbSalvando, setOnbSalvando] = useState(false);

  // Edição de Perfil Público & Portfólio
  const [pubNome, setPubNome] = useState('');
  const [pubEspecialidade, setPubEspecialidade] = useState('');
  const [pubCidade, setPubCidade] = useState('');
  const [pubBio, setPubBio] = useState('');
  const [pubPrazo, setPubPrazo] = useState(14);
  const [pubAtivo, setPubAtivo] = useState(true);
  const [pubCor, setPubCor] = useState<CorDestaque>('#2D254E');
  const [pubCategoriasTexto, setPubCategoriasTexto] = useState('');
  const [pubSlug, setPubSlug] = useState('');
  const [pubSalvando, setPubSalvando] = useState(false);
  const [pubMensagem, setPubMensagem] = useState<string | null>(null);

  // Novo item de portfólio
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoPrazo, setNovoPrazo] = useState(14);
  const [novoPreco, setNovoPreco] = useState(250);
  const [novaImagemBase64, setNovaImagemBase64] = useState('');
  const [salvandoItem, setSalvandoItem] = useState(false);

  // Configurações privadas & LGPD
  const [cfgTelefone, setCfgTelefone] = useState('');
  const [cfgValorHora, setCfgValorHora] = useState(55);
  const [cfgMargem, setCfgMargem] = useState(35);
  const [cfgTaxa, setCfgTaxa] = useState(4.99);
  const [cfgIndireto, setCfgIndireto] = useState(12);
  const [cfgSalvando, setCfgSalvando] = useState(false);
  const [cfgMsg, setCfgMsg] = useState<string | null>(null);
  const [expurgoMsg, setExpurgoMsg] = useState<string | null>(null);
  const [executandoExpurgo, setExecutandoExpurgo] = useState(false);
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState('');
  const [excluindoConta, setExcluindoConta] = useState(false);

  // Sincronizar formulários com documentos carregados
  useEffect(() => {
    if (perfilPublico) {
      setPubNome(perfilPublico.nomeAtelie);
      setPubEspecialidade(perfilPublico.especialidade);
      setPubCidade(perfilPublico.cidadeUf || '');
      setPubBio(perfilPublico.bio || '');
      setPubPrazo(perfilPublico.prazoMedioDias);
      setPubAtivo(perfilPublico.ativo);
      setPubCor(perfilPublico.corDestaque);
      setPubCategoriasTexto((perfilPublico.categorias || []).join(', '));
      setPubSlug(perfilPublico.slug);
    }
  }, [perfilPublico]);

  useEffect(() => {
    if (artesao) {
      setCfgTelefone(artesao.telefone || '');
      setCfgValorHora(artesao.valorHoraPadrao ?? 55);
      setCfgMargem(artesao.margemPadrao ?? 35);
      setCfgTaxa(artesao.taxaPlataformaPadrao ?? 4.99);
      setCfgIndireto(artesao.percentualIndiretoPadrao ?? 12);
    }
  }, [artesao]);

  // Listeners de pedidos, portfólio e uso mensal
  useEffect(() => {
    if (!authPronto || !user || !user.emailVerified || !artesao) return;

    const pathPedidos = `artesaos/${user.uid}/pedidos`;
    const unsubPedidos = onSnapshot(
      query(collection(db, 'artesaos', user.uid, 'pedidos'), orderBy('criadoEm', 'desc')),
      (snap) => {
        setPedidos(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PedidoDoc, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, pathPedidos)
    );

    const pathPortfolio = `perfisPublicos/${user.uid}/portfolio`;
    const unsubPortfolio = onSnapshot(
      query(collection(db, 'perfisPublicos', user.uid, 'portfolio'), orderBy('ordem', 'asc')),
      (snap) => {
        setPortfolio(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ItemPortfolioDoc, 'id'>) }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, pathPortfolio)
    );

    const pathUso = `artesaos/${user.uid}/uso`;
    const unsubUso = onSnapshot(
      collection(db, 'artesaos', user.uid, 'uso'),
      (snap) => {
        setHistoricoUso(
          snap.docs
            .map((d) => d.data() as UsoMensalDoc)
            .sort((a, b) => b.mes.localeCompare(a.mes))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, pathUso)
    );

    return () => {
      unsubPedidos();
      unsubPortfolio();
      unsubUso();
    };
  }, [authPronto, user, artesao]);

  const pedidoSelecionado = useMemo(
    () => pedidos.find((p) => p.id === pedidoSelecionadoId) || null,
    [pedidos, pedidoSelecionadoId]
  );

  const pedidosFiltrados = useMemo(() => {
    const termo = buscaPedido.trim().toLowerCase();
    return pedidos.filter((p) => {
      if (!termo) return true;
      return (
        p.codigo.toLowerCase().includes(termo) ||
        p.titulo.toLowerCase().includes(termo) ||
        p.clienteNome.toLowerCase().includes(termo) ||
        p.categoria.toLowerCase().includes(termo)
      );
    });
  }, [pedidos, buscaPedido]);

  if (!authPronto) {
    return (
      <div className="min-h-screen bg-[#FAF9FC] flex items-center justify-center text-sm text-[#728168]">
        Carregando sessão...
      </div>
    );
  }

  if (!user || !user.emailVerified) {
    return <Navigate to="/entrar" replace />;
  }

  if (carregandoDados) {
    return (
      <div className="min-h-screen bg-[#FAF9FC] flex items-center justify-center text-sm text-[#728168]">
        Carregando dados do ateliê...
      </div>
    );
  }

  // Fluxo de onboarding inicial caso ainda não exista perfil do artesão
  const handleConcluirOnboarding = async (e: FormEvent) => {
    e.preventDefault();
    setOnbErro(null);

    const slugLimpo = normalizarSlug(onbSlug);
    const checkSlug = validarSlug(slugLimpo);
    if (!checkSlug.valido) {
      setOnbErro(checkSlug.erro || 'Endereço inválido.');
      return;
    }

    setOnbSalvando(true);
    try {
      const slugRef = doc(db, 'slugs', slugLimpo);
      const slugExistente = await getDoc(slugRef);
      if (slugExistente.exists()) {
        setOnbErro('Este endereço (/a/...) já está em uso por outro ateliê. Escolha outro.');
        setOnbSalvando(false);
        return;
      }

      const mesAtual = obterMesReferenciaBahia();
      const batch = writeBatch(db);

      batch.set(slugRef, {
        uid: user.uid,
        criadoEm: serverTimestamp(),
      });

      batch.set(doc(db, 'artesaos', user.uid), {
        uid: user.uid,
        nomeAtelie: onbNomeAtelie.trim(),
        nomeResponsavel: (user.displayName || onbNomeAtelie).trim(),
        email: user.email || '',
        telefone: '',
        cidadeUf: onbCidade.trim(),
        especialidade: onbEspecialidade.trim(),
        bio: '',
        slug: slugLimpo,
        valorHoraPadrao: Number(onbValorHora) || 55,
        margemPadrao: 35,
        taxaPlataformaPadrao: 4.99,
        percentualIndiretoPadrao: 12,
        plano: 'gratuito',
        aceitandoPedidos: true,
        uso: 0,
        mesReferencia: mesAtual,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });

      batch.set(doc(db, 'perfisPublicos', user.uid), {
        uid: user.uid,
        slug: slugLimpo,
        nomeAtelie: onbNomeAtelie.trim(),
        especialidade: onbEspecialidade.trim(),
        cidadeUf: onbCidade.trim(),
        bio: '',
        prazoMedioDias: 15,
        aceitandoPedidos: true,
        ativo: true,
        corDestaque: '#2D254E',
        categorias: [onbEspecialidade.trim()],
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `artesaos/${user.uid}`);
    } finally {
      setOnbSalvando(false);
    }
  };

  if (!artesao || !perfilPublico) {
    return (
      <div className="min-h-screen bg-[#FAF9FC] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-[#E4DFEC] rounded-2xl p-8">
          <p className="text-xs font-medium text-[#728168] mb-1">Configuração inicial</p>
          <h1 className="font-display text-2xl font-semibold text-[#2D254E] mb-2">
            Configure a página do seu ateliê
          </h1>
          <p className="text-sm text-[#728168] mb-6">
            Escolha o nome e o endereço público onde seus clientes farão encomendas.
          </p>

          {onbErro && (
            <div className="mb-4 text-xs bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg">
              {onbErro}
            </div>
          )}

          <form onSubmit={handleConcluirOnboarding} className="space-y-4">
            <label className="block">
              <span className="block text-xs font-medium text-[#728168] mb-1">
                Nome do ateliê *
              </span>
              <input
                type="text"
                required
                minLength={2}
                maxLength={80}
                value={onbNomeAtelie}
                onChange={(e) => {
                  setOnbNomeAtelie(e.target.value);
                  if (!onbSlug) setOnbSlug(normalizarSlug(e.target.value));
                }}
                placeholder="Ex.: Cerâmica da Vila"
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg focus:outline-none focus:border-[#D065D6]"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-[#728168] mb-1">
                Endereço público (/a/slug) *
              </span>
              <div className="flex items-center border border-[#E4DFEC] rounded-lg bg-[#FAF9FC] overflow-hidden focus-within:border-[#D065D6]">
                <span className="px-3 text-xs font-mono text-[#728168] border-r border-[#E4DFEC]">
                  /a/
                </span>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={40}
                  value={onbSlug}
                  onChange={(e) => setOnbSlug(normalizarSlug(e.target.value))}
                  placeholder="ceramica-da-vila"
                  className="flex-1 px-3 py-2.5 text-sm font-mono bg-transparent focus:outline-none"
                />
              </div>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-xs font-medium text-[#728168] mb-1">
                  Especialidade *
                </span>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={60}
                  value={onbEspecialidade}
                  onChange={(e) => setOnbEspecialidade(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg focus:outline-none focus:border-[#D065D6]"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-[#728168] mb-1">
                  Cidade / UF
                </span>
                <input
                  type="text"
                  maxLength={60}
                  value={onbCidade}
                  onChange={(e) => setOnbCidade(e.target.value)}
                  placeholder="Salvador, BA"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg focus:outline-none focus:border-[#D065D6]"
                />
              </label>
            </div>

            <label className="block">
              <span className="block text-xs font-medium text-[#728168] mb-1">
                Valor padrão da sua hora (R$)
              </span>
              <input
                type="number"
                min={0}
                value={onbValorHora}
                onChange={(e) => setOnbValorHora(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg focus:outline-none focus:border-[#D065D6]"
              />
            </label>

            <button
              type="submit"
              disabled={onbSalvando}
              className="w-full py-3 rounded-lg bg-[#2D254E] text-white text-sm font-semibold hover:bg-[#2D254E]/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {onbSalvando ? 'Criando espaço...' : 'Criar página pública e entrar no painel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const mesAtualBahia = obterMesReferenciaBahia();
  const usoExibido = artesao.mesReferencia === mesAtualBahia ? artesao.uso : 0;
  const checagemPlano = verificarLimitePlano(artesao.plano, usoExibido);
  const planoInfo = PLANOS[artesao.plano];

  const handleSalvarPerfilPublico = async (e: FormEvent) => {
    e.preventDefault();
    setPubMensagem(null);
    const slugLimpo = normalizarSlug(pubSlug);
    const check = validarSlug(slugLimpo);
    if (!check.valido) {
      setPubMensagem(check.erro || 'Slug inválido.');
      return;
    }

    setPubSalvando(true);
    try {
      const slugAntigo = perfilPublico.slug;
      if (slugLimpo !== slugAntigo) {
        const novoSlugSnap = await getDoc(doc(db, 'slugs', slugLimpo));
        if (novoSlugSnap.exists() && novoSlugSnap.data()?.uid !== user.uid) {
          setPubMensagem('Este endereço já pertence a outro ateliê.');
          setPubSalvando(false);
          return;
        }
      }

      const categoriasLista = pubCategoriasTexto
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
        .slice(0, 10);

      const batch = writeBatch(db);
      if (slugLimpo !== slugAntigo) {
        batch.set(doc(db, 'slugs', slugLimpo), {
          uid: user.uid,
          criadoEm: serverTimestamp(),
        });
      }

      batch.update(doc(db, 'perfisPublicos', user.uid), {
        slug: slugLimpo,
        nomeAtelie: pubNome.trim(),
        especialidade: pubEspecialidade.trim(),
        cidadeUf: pubCidade.trim(),
        bio: pubBio.trim(),
        prazoMedioDias: Math.max(1, Math.min(365, Number(pubPrazo) || 14)),
        ativo: pubAtivo,
        corDestaque: pubCor,
        categorias: categoriasLista,
        atualizadoEm: serverTimestamp(),
      });

      if (slugLimpo !== slugAntigo) {
        batch.update(doc(db, 'artesaos', user.uid), {
          slug: slugLimpo,
          atualizadoEm: serverTimestamp(),
        });
      }

      await batch.commit();

      if (slugLimpo !== slugAntigo && slugAntigo) {
        await deleteDoc(doc(db, 'slugs', slugAntigo));
      }

      setPubMensagem('Página pública atualizada com sucesso.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `perfisPublicos/${user.uid}`);
    } finally {
      setPubSalvando(false);
    }
  };

  const handleImagemPortfolio = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const comp = await comprimirImagemNoNavegador(file, 1280, 0.7);
      setNovaImagemBase64(comp.dataBase64);
    } catch (err) {
      setPubMensagem(err instanceof Error ? err.message : 'Erro ao comprimir imagem.');
    }
  };

  const handleAdicionarItemPortfolio = async (e: FormEvent) => {
    e.preventDefault();
    if (!novaImagemBase64) {
      setPubMensagem('Selecione uma imagem para o item do portfólio.');
      return;
    }
    setSalvandoItem(true);
    setPubMensagem(null);
    const pathPort = `perfisPublicos/${user.uid}/portfolio`;
    try {
      const novoDocRef = doc(collection(db, 'perfisPublicos', user.uid, 'portfolio'));
      const batch = writeBatch(db);
      batch.set(novoDocRef, {
        uid: user.uid,
        titulo: novoTitulo.trim(),
        categoria: novaCategoria.trim() || pubEspecialidade || 'Autoral',
        descricao: novaDescricao.trim(),
        tempoProducaoDias: Math.max(1, Number(novoPrazo) || 14),
        precoReferencia: Math.max(0, Number(novoPreco) || 0),
        imagemBase64: novaImagemBase64,
        ordem: portfolio.length,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
      await batch.commit();
      setNovoTitulo('');
      setNovaCategoria('');
      setNovaDescricao('');
      setNovaImagemBase64('');
      setPubMensagem('Peça adicionada ao portfólio público.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, pathPort);
    } finally {
      setSalvandoItem(false);
    }
  };

  const handleRemoverItemPortfolio = async (itemId: string) => {
    const pathItem = `perfisPublicos/${user.uid}/portfolio/${itemId}`;
    try {
      await deleteDoc(doc(db, 'perfisPublicos', user.uid, 'portfolio', itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, pathItem);
    }
  };

  const handleSalvarConfiguracoes = async (e: FormEvent) => {
    e.preventDefault();
    setCfgSalvando(true);
    setCfgMsg(null);
    const pathArtesao = `artesaos/${user.uid}`;
    try {
      await updateDoc(doc(db, 'artesaos', user.uid), {
        telefone: cfgTelefone.trim(),
        valorHoraPadrao: Math.max(0, Number(cfgValorHora) || 0),
        margemPadrao: Math.max(0, Number(cfgMargem) || 0),
        taxaPlataformaPadrao: Math.max(0, Number(cfgTaxa) || 0),
        percentualIndiretoPadrao: Math.max(0, Number(cfgIndireto) || 0),
        atualizadoEm: serverTimestamp(),
      });
      setCfgMsg('Parâmetros padrão atualizados.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, pathArtesao);
    } finally {
      setCfgSalvando(false);
    }
  };

  const handleExecutarExpurgo = async () => {
    setExecutandoExpurgo(true);
    setExpurgoMsg(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const resp = await fetch('/api/cron/expurgo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await resp.json()) as {
        ok: boolean;
        anonimizados?: number;
        imagensRemovidas?: number;
        erro?: string;
      };
      if (!resp.ok || !data.ok) {
        setExpurgoMsg(data.erro || 'Não foi possível verificar expurgo agora.');
      } else {
        setExpurgoMsg(
          `Rotina executada: ${data.anonimizados ?? 0} pedido(s) encerrado(s) há mais de 12 meses anonimizados e ${data.imagensRemovidas ?? 0} imagem(ns) removida(s).`
        );
      }
    } catch {
      setExpurgoMsg('Falha ao conectar com a rotina de expurgo.');
    } finally {
      setExecutandoExpurgo(false);
    }
  };

  const handleExcluirConta = async () => {
    if (confirmacaoExclusao !== 'EXCLUIR') return;
    setExcluindoConta(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const resp = await fetch('/api/excluir-conta', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = (await resp.json()) as { ok: boolean; erro?: string };
      if (!resp.ok || !data.ok) {
        setCfgMsg(data.erro || 'Não foi possível excluir a conta.');
        setExcluindoConta(false);
        return;
      }
      await sair();
    } catch {
      setCfgMsg('Erro ao solicitar exclusão definitiva.');
      setExcluindoConta(false);
    }
  };

  const urlPublicaRelativa = `/a/${perfilPublico.slug}`;

  return (
    <div className="min-h-screen bg-[#FAF9FC] text-[#2D254E] flex flex-col lg:flex-row">
      {/* Sidebar fixa no desktop */}
      <aside className="lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-[#E4DFEC] flex flex-col justify-between shrink-0">
        <div className="p-5 space-y-6">
          <div>
            <Link to="/" className="font-display text-xl font-semibold text-[#2D254E]">
              Ofício &amp; Medida
            </Link>
            <p className="text-xs text-[#728168] mt-1 truncate">{artesao.nomeAtelie}</p>
          </div>

          {/* Cota mensal America/Bahia */}
          <div className="bg-[#FAF9FC] border border-[#E4DFEC] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#728168]">Cota {mesAtualBahia}</span>
              <span className="font-mono tabular-nums font-semibold text-[#2D254E]">
                {usoExibido}/{checagemPlano.limite ?? '∞'}
              </span>
            </div>
            <div className="h-1.5 bg-[#E4DFEC] rounded-full overflow-hidden">
              <div
                className="h-full transition-all"
                style={{
                  width: checagemPlano.limite
                    ? `${Math.min(100, (usoExibido / checagemPlano.limite) * 100)}%`
                    : '25%',
                  backgroundColor: artesao.aceitandoPedidos ? '#94D665' : '#D065D6',
                }}
              />
            </div>
            <p className="text-[11px] text-[#728168]">
              Plano {planoInfo.nome} ·{' '}
              {artesao.aceitandoPedidos ? 'Aceitando pedidos' : 'Limite mensal atingido'}
            </p>
          </div>

          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setAba('pedidos')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                aba === 'pedidos'
                  ? 'bg-[#2D254E] text-white'
                  : 'text-[#728168] hover:text-[#2D254E] hover:bg-[#F4F2F7]'
              }`}
            >
              <FolderKanban className="w-4 h-4 shrink-0" />
              Pedidos ({pedidos.filter((p) => !ehStatusTerminal(p.status)).length})
            </button>
            <button
              type="button"
              onClick={() => setAba('portfolio')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                aba === 'portfolio'
                  ? 'bg-[#2D254E] text-white'
                  : 'text-[#728168] hover:text-[#2D254E] hover:bg-[#F4F2F7]'
              }`}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              Vitrine e portfólio
            </button>
            <button
              type="button"
              onClick={() => setAba('calculadora')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                aba === 'calculadora'
                  ? 'bg-[#2D254E] text-white'
                  : 'text-[#728168] hover:text-[#2D254E] hover:bg-[#F4F2F7]'
              }`}
            >
              <Calculator className="w-4 h-4 shrink-0" />
              Calculadora
            </button>
            <button
              type="button"
              onClick={() => setAba('configuracoes')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                aba === 'configuracoes'
                  ? 'bg-[#2D254E] text-white'
                  : 'text-[#728168] hover:text-[#2D254E] hover:bg-[#F4F2F7]'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              Ajustes e LGPD
            </button>
          </nav>
        </div>

        <div className="p-5 border-t border-[#E4DFEC] space-y-2">
          <Link
            to={urlPublicaRelativa}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-[#E4DFEC] text-xs font-medium text-[#2D254E] hover:bg-[#F4F2F7] transition-colors"
          >
            <span className="truncate font-mono">{urlPublicaRelativa}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-2" />
          </Link>
          <button
            type="button"
            onClick={sair}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#728168] hover:text-[#2D254E] hover:bg-[#F4F2F7] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-[#E4DFEC] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-[#728168]">
            <span>Ateliê</span>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="font-medium text-[#2D254E]">
              {aba === 'pedidos' && 'Painel de pedidos (Kanban)'}
              {aba === 'portfolio' && 'Página pública e portfólio'}
              {aba === 'calculadora' && 'Calculadora de precificação'}
              {aba === 'configuracoes' && 'Configurações e LGPD'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(`${window.location.origin}${urlPublicaRelativa}`);
                setAvisoCopiaSlug(true);
                setTimeout(() => setAvisoCopiaSlug(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4DFEC] text-xs font-medium text-[#2D254E] hover:bg-[#F4F2F7] cursor-pointer whitespace-nowrap"
            >
              <Copy className="w-3.5 h-3.5" />
              {avisoCopiaSlug ? 'Link copiado' : 'Copiar link público'}
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6">
          {aba === 'pedidos' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="w-4 h-4 text-[#728168] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={buscaPedido}
                    onChange={(e) => setBuscaPedido(e.target.value)}
                    placeholder="Buscar por código, cliente ou título..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#E4DFEC] rounded-lg focus:outline-none focus:border-[#D065D6]"
                  />
                </div>
                <div className="flex items-center gap-1 p-1 bg-[#F4F2F7] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setMostrarEncerrados(false)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                      !mostrarEncerrados ? 'bg-white text-[#2D254E] shadow-xs' : 'text-[#728168]'
                    }`}
                  >
                    Kanban ativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarEncerrados(true)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                      mostrarEncerrados ? 'bg-white text-[#2D254E] shadow-xs' : 'text-[#728168]'
                    }`}
                  >
                    Encerrados ({pedidosFiltrados.filter((p) => ehStatusTerminal(p.status)).length})
                  </button>
                </div>
              </div>

              {pedidos.length === 0 ? (
                <div className="bg-white border border-[#E4DFEC] rounded-2xl p-10 text-center space-y-3">
                  <h2 className="font-display text-xl font-semibold text-[#2D254E]">
                    Nenhum pedido recebido ainda
                  </h2>
                  <p className="text-sm text-[#728168] max-w-md mx-auto">
                    Compartilhe seu link público{' '}
                    <span className="font-mono text-[#2D254E]">{urlPublicaRelativa}</span> com
                    clientes para receber encomendas com fotos e aceite LGPD diretamente aqui.
                  </p>
                  <Link
                    to={urlPublicaRelativa}
                    className="inline-block px-4 py-2 rounded-lg bg-[#2D254E] text-white text-xs font-semibold"
                  >
                    Abrir minha página pública
                  </Link>
                </div>
              ) : !mostrarEncerrados ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 items-start">
                  {STATUS_KANBAN_ATIVOS.map((colunaStatus) => {
                    const cards = pedidosFiltrados.filter((p) => p.status === colunaStatus);
                    return (
                      <section
                        key={colunaStatus}
                        className="bg-[#F4F2F7] border border-[#E4DFEC] rounded-xl p-3 space-y-3"
                      >
                        <div className="flex items-center justify-between px-1">
                          <h2 className="text-xs font-semibold text-[#2D254E] truncate">
                            {colunaStatus}
                          </h2>
                          <span className="font-mono tabular-nums text-xs text-[#728168]">
                            {cards.length}
                          </span>
                        </div>

                        {cards.length === 0 ? (
                          <p className="text-xs text-[#728168] px-1 py-4 text-center">
                            Sem pedidos
                          </p>
                        ) : (
                          <div className="space-y-2.5">
                            {cards.map((ped) => (
                              <button
                                key={ped.id}
                                type="button"
                                onClick={() => setPedidoSelecionadoId(ped.id)}
                                className="w-full text-left bg-white border border-[#E4DFEC] rounded-xl p-3.5 hover:border-[#D065D6] transition-colors space-y-2 cursor-pointer"
                              >
                                <div className="flex items-center justify-between gap-2 text-[11px] text-[#728168]">
                                  <span className="font-mono font-medium text-[#2D254E]">
                                    {ped.codigo}
                                  </span>
                                  <span>{ped.totalImagens} foto(s)</span>
                                </div>
                                <p className="text-sm font-semibold text-[#2D254E] line-clamp-2">
                                  {ped.titulo}
                                </p>
                                <p className="text-xs text-[#728168] truncate">
                                  {ped.clienteNome} · {ped.categoria}
                                </p>
                                {ped.orcamentoAtual && (
                                  <div className="pt-2 border-t border-[#E4DFEC] flex items-center justify-between text-xs">
                                    <span className="text-[#728168]">
                                      v{ped.orcamentoAtual.versao}
                                    </span>
                                    <span className="font-mono tabular-nums font-semibold text-[#2D254E]">
                                      {formatarMoedaBrl(ped.orcamentoAtual.valorTotal)}
                                    </span>
                                  </div>
                                )}
                                {ped.dataEntregaPrevista && (
                                  <p className="text-[11px] font-mono tabular-nums text-[#728168]">
                                    Entrega: {formatarDataBr(ped.dataEntregaPrevista)}
                                  </p>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border border-[#E4DFEC] rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#FAF9FC] border-b border-[#E4DFEC] text-xs text-[#728168]">
                      <tr>
                        <th className="px-4 py-3 font-medium">Código</th>
                        <th className="px-4 py-3 font-medium">Peça</th>
                        <th className="px-4 py-3 font-medium">Cliente</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Orçamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4DFEC]">
                      {pedidosFiltrados
                        .filter((p) => STATUS_TERMINAIS.includes(p.status))
                        .map((ped) => (
                          <tr
                            key={ped.id}
                            onClick={() => setPedidoSelecionadoId(ped.id)}
                            className="hover:bg-[#FAF9FC] cursor-pointer"
                          >
                            <td className="px-4 py-3 font-mono text-xs">{ped.codigo}</td>
                            <td className="px-4 py-3 font-medium">{ped.titulo}</td>
                            <td className="px-4 py-3 text-[#728168]">{ped.clienteNome}</td>
                            <td className="px-4 py-3 text-xs">{ped.status}</td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums">
                              {ped.orcamentoAtual
                                ? formatarMoedaBrl(ped.orcamentoAtual.valorTotal)
                                : '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {aba === 'portfolio' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleSalvarPerfilPublico}
                className="lg:col-span-6 bg-white border border-[#E4DFEC] rounded-2xl p-6 space-y-4"
              >
                <h2 className="font-display text-xl font-semibold text-[#2D254E]">
                  Dados da vitrine pública
                </h2>
                {pubMensagem && (
                  <p className="text-xs bg-[#94D665]/25 border border-[#94D665] text-[#2D254E] px-3.5 py-2.5 rounded-lg">
                    {pubMensagem}
                  </p>
                )}

                <label className="block">
                  <span className="block text-xs font-medium text-[#728168] mb-1">
                    Nome do ateliê
                  </span>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    value={pubNome}
                    onChange={(e) => setPubNome(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-[#728168] mb-1">
                    Endereço público (/a/slug)
                  </span>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={40}
                    value={pubSlug}
                    onChange={(e) => setPubSlug(normalizarSlug(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm font-mono bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      Especialidade
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={60}
                      value={pubEspecialidade}
                      onChange={(e) => setPubEspecialidade(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      Cidade / UF
                    </span>
                    <input
                      type="text"
                      maxLength={60}
                      value={pubCidade}
                      onChange={(e) => setPubCidade(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="block text-xs font-medium text-[#728168] mb-1">
                    Apresentação pública (sem telefone ou e-mail)
                  </span>
                  <textarea
                    rows={3}
                    maxLength={600}
                    value={pubBio}
                    onChange={(e) => setPubBio(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      Prazo médio (dias)
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={pubPrazo}
                      onChange={(e) => setPubPrazo(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      Categorias (separadas por vírgula)
                    </span>
                    <input
                      type="text"
                      value={pubCategoriasTexto}
                      onChange={(e) => setPubCategoriasTexto(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                    />
                  </label>
                </div>

                <div>
                  <span className="block text-xs font-medium text-[#728168] mb-2">
                    Cor de destaque da página
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {CORES_PALETA.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setPubCor(c.hex)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                          pubCor === c.hex
                            ? 'border-[#2D254E] bg-[#F4F2F7] font-semibold'
                            : 'border-[#E4DFEC]'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: c.hex }}
                        />
                        {c.nome}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pubAtivo}
                    onChange={(e) => setPubAtivo(e.target.checked)}
                    className="w-4 h-4 accent-[#2D254E]"
                  />
                  Página pública visível para visitantes
                </label>

                <button
                  type="submit"
                  disabled={pubSalvando}
                  className="px-5 py-2.5 rounded-lg bg-[#2D254E] text-white text-sm font-semibold hover:bg-[#2D254E]/90 disabled:opacity-50 cursor-pointer"
                >
                  {pubSalvando ? 'Salvando...' : 'Salvar vitrine pública'}
                </button>
              </form>

              <div className="lg:col-span-6 space-y-6">
                <form
                  onSubmit={handleAdicionarItemPortfolio}
                  className="bg-white border border-[#E4DFEC] rounded-2xl p-6 space-y-4"
                >
                  <h2 className="font-display text-xl font-semibold text-[#2D254E]">
                    Adicionar peça ao portfólio
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={80}
                      value={novoTitulo}
                      onChange={(e) => setNovoTitulo(e.target.value)}
                      placeholder="Título da peça *"
                      className="px-3.5 py-2 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                    />
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={40}
                      value={novaCategoria}
                      onChange={(e) => setNovaCategoria(e.target.value)}
                      placeholder="Categoria *"
                      className="px-3.5 py-2 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                    />
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={novoPrazo}
                      onChange={(e) => setNovoPrazo(Number(e.target.value))}
                      placeholder="Prazo (dias)"
                      className="px-3.5 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                    />
                    <input
                      type="number"
                      min={0}
                      step="10"
                      value={novoPreco}
                      onChange={(e) => setNovoPreco(Number(e.target.value))}
                      placeholder="Preço ref. (R$)"
                      className="px-3.5 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                    />
                  </div>
                  <textarea
                    rows={2}
                    maxLength={400}
                    value={novaDescricao}
                    onChange={(e) => setNovaDescricao(e.target.value)}
                    placeholder="Breve descrição de materiais e acabamento..."
                    className="w-full px-3.5 py-2 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                  />

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E4DFEC] bg-[#FAF9FC] text-xs font-medium cursor-pointer">
                      <ImagePlus className="w-4 h-4" />
                      {novaImagemBase64 ? 'Trocar foto' : 'Escolher foto (comprime auto)'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImagemPortfolio}
                        className="sr-only"
                      />
                    </label>
                    {novaImagemBase64 && (
                      <img
                        src={novaImagemBase64}
                        alt="Pré-visualização"
                        className="w-14 h-14 rounded-lg object-cover border border-[#E4DFEC]"
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={salvandoItem}
                    className="px-5 py-2.5 rounded-lg bg-[#2D254E] text-white text-sm font-semibold hover:bg-[#2D254E]/90 disabled:opacity-50 cursor-pointer"
                  >
                    {salvandoItem ? 'Publicando...' : 'Publicar no portfólio'}
                  </button>
                </form>

                <div className="bg-white border border-[#E4DFEC] rounded-2xl p-6 space-y-4">
                  <h3 className="font-display text-lg font-semibold text-[#2D254E]">
                    Peças publicadas ({portfolio.length})
                  </h3>
                  {portfolio.length === 0 ? (
                    <p className="text-sm text-[#728168]">
                      Nenhuma peça cadastrada ainda.
                    </p>
                  ) : (
                    <div className="divide-y divide-[#E4DFEC]">
                      {portfolio.map((item) => (
                        <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={item.imagemBase64}
                              alt={item.titulo}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-lg object-cover border border-[#E4DFEC] shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#2D254E] truncate">
                                {item.titulo}
                              </p>
                              <p className="text-xs text-[#728168]">
                                {item.categoria} · {item.tempoProducaoDias}d ·{' '}
                                <span className="font-mono tabular-nums">
                                  {formatarMoedaBrl(item.precoReferencia)}
                                </span>
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoverItemPortfolio(item.id)}
                            aria-label={`Remover ${item.titulo}`}
                            className="p-2 text-[#728168] hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {aba === 'calculadora' && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-2xl font-semibold text-[#2D254E]">
                  Simulador de precificação
                </h2>
                <p className="text-sm text-[#728168]">
                  Iniciado com seus valores padrão de hora, margem, custos indiretos e taxa.
                </p>
              </div>
              <CalculadoraOrcamento
                valorHoraInicial={artesao.valorHoraPadrao ?? 55}
                margemInicial={artesao.margemPadrao ?? 35}
                taxaInicial={artesao.taxaPlataformaPadrao ?? 4.99}
                indiretoInicial={artesao.percentualIndiretoPadrao ?? 12}
              />
            </div>
          )}

          {aba === 'configuracoes' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleSalvarConfiguracoes}
                className="lg:col-span-6 bg-white border border-[#E4DFEC] rounded-2xl p-6 space-y-4"
              >
                <h2 className="font-display text-xl font-semibold text-[#2D254E]">
                  Parâmetros padrão da oficina
                </h2>
                {cfgMsg && (
                  <p className="text-xs bg-[#94D665]/25 border border-[#94D665] text-[#2D254E] px-3.5 py-2.5 rounded-lg">
                    {cfgMsg}
                  </p>
                )}

                <label className="block">
                  <span className="block text-xs font-medium text-[#728168] mb-1">
                    Telefone privado de contato
                  </span>
                  <input
                    type="tel"
                    maxLength={30}
                    value={cfgTelefone}
                    onChange={(e) => setCfgTelefone(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      Valor hora padrão (R$)
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={cfgValorHora}
                      onChange={(e) => setCfgValorHora(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      Margem padrão (%)
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={300}
                      value={cfgMargem}
                      onChange={(e) => setCfgMargem(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      Custos indiretos (%)
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={cfgIndireto}
                      onChange={(e) => setCfgIndireto(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      Taxa pagamento (%)
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={45}
                      step="0.1"
                      value={cfgTaxa}
                      onChange={(e) => setCfgTaxa(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={cfgSalvando}
                  className="px-5 py-2.5 rounded-lg bg-[#2D254E] text-white text-sm font-semibold hover:bg-[#2D254E]/90 disabled:opacity-50 cursor-pointer"
                >
                  {cfgSalvando ? 'Salvando...' : 'Salvar parâmetros'}
                </button>

                <div className="pt-4 border-t border-[#E4DFEC]">
                  <h3 className="text-xs font-semibold text-[#2D254E] mb-2">
                    Histórico de consumo mensal (America/Bahia)
                  </h3>
                  {historicoUso.length === 0 ? (
                    <p className="text-xs text-[#728168]">Nenhum pedido contabilizado ainda.</p>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      {historicoUso.map((u) => (
                        <div key={u.mes} className="flex justify-between font-mono tabular-nums">
                          <span>{u.mes}</span>
                          <span>
                            {u.quantidade}/{u.limite ?? '∞'} pedidos
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>

              <div className="lg:col-span-6 space-y-6">
                {/* Expurgo LGPD */}
                <div className="bg-white border border-[#E4DFEC] rounded-2xl p-6 space-y-3">
                  <h2 className="font-display text-xl font-semibold text-[#2D254E]">
                    Conformidade e expurgo LGPD (RN10)
                  </h2>
                  <p className="text-xs text-[#728168] leading-relaxed">
                    Pedidos encerrados há mais de 12 meses são anonimizados diariamente às 03:00
                    pelo cron automatizado. Você também pode executar uma verificação sob demanda
                    nos seus próprios pedidos encerrados.
                  </p>
                  {expurgoMsg && (
                    <p className="text-xs bg-[#F4F2F7] border border-[#E4DFEC] text-[#2D254E] px-3 py-2 rounded-lg">
                      {expurgoMsg}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={executandoExpurgo}
                    onClick={handleExecutarExpurgo}
                    className="px-4 py-2 rounded-lg border border-[#E4DFEC] text-xs font-semibold text-[#2D254E] hover:bg-[#F4F2F7] disabled:opacity-50 cursor-pointer"
                  >
                    {executandoExpurgo ? 'Verificando...' : 'Verificar expurgo dos meus pedidos'}
                  </button>
                </div>

                {/* Exclusão definitiva da conta */}
                <div className="bg-white border border-red-200 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <ShieldAlert className="w-5 h-5" />
                    <h2 className="font-display text-lg font-semibold">
                      Excluir conta e todos os dados
                    </h2>
                  </div>
                  <p className="text-xs text-[#728168] leading-relaxed">
                    Esta ação apaga permanentemente seu perfil, slug público, portfólio, pedidos,
                    orçamentos, imagens anexadas e sua conta no Firebase Authentication.
                  </p>
                  <label className="block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      Digite <strong className="font-mono text-[#2D254E]">EXCLUIR</strong> para confirmar
                    </span>
                    <input
                      type="text"
                      value={confirmacaoExclusao}
                      onChange={(e) => setConfirmacaoExclusao(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={confirmacaoExclusao !== 'EXCLUIR' || excluindoConta}
                    onClick={handleExcluirConta}
                    className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-40 cursor-pointer"
                  >
                    {excluindoConta ? 'Excluindo tudo...' : 'Excluir minha conta permanentemente'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {pedidoSelecionado && (
        <ModalDetalhePedido
          uid={user.uid}
          artesao={artesao}
          pedido={pedidoSelecionado}
          onFechar={() => setPedidoSelecionadoId(null)}
        />
      )}
    </div>
  );
}
