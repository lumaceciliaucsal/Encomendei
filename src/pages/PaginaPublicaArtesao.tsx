import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, ImagePlus, Lock, Trash2, X } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { comprimirImagemNoNavegador, formatarTamanhoBytes } from '../lib/imagens';
import {
  MAX_IMAGENS_POR_PEDIDO,
  formatarMoedaBrl,
  type ImagemAnexadaPayload,
} from '../lib/regras';
import type { ItemPortfolioDoc, PerfilPublicoDoc } from '../lib/tipos';

type PerfilPublicoView = Omit<PerfilPublicoDoc, 'criadoEm' | 'atualizadoEm'>;
type ItemPortfolioView = Omit<ItemPortfolioDoc, 'criadoEm' | 'atualizadoEm'>;

const PERFIL_EXEMPLO: PerfilPublicoView = {
  uid: 'exemplo-atelie',
  slug: 'exemplo-atelie',
  nomeAtelie: 'Ateliê Barro & Linha',
  especialidade: 'Cerâmica autoral, couro e bordado botânico',
  cidadeUf: 'Salvador, BA',
  bio: 'Produzimos peças únicas em pequenas fornadas e costura manual sob medida. Cada encomenda começa com conversa sobre medidas, paleta de esmaltes e prazo de secagem natural.',
  prazoMedioDias: 15,
  aceitandoPedidos: true,
  ativo: true,
  corDestaque: '#2D254E',
  categorias: ['Cerâmica autoral', 'Couro & selaria', 'Bordado livre', 'Presentes sob medida'],
};

const PORTFOLIO_EXEMPLO: ItemPortfolioView[] = [
  {
    id: 'ex-1',
    uid: 'exemplo-atelie',
    titulo: 'Vaso em grés esmaltado',
    categoria: 'Cerâmica autoral',
    descricao: 'Queima de alta temperatura com esmalte mineral em tons de ameixa e sálvia.',
    tempoProducaoDias: 14,
    precoReferencia: 340,
    imagemBase64: '/src/assets/images/portfolio_ceramic_vase_1795566420798.jpg',
    ordem: 0,
  },
  {
    id: 'ex-2',
    uid: 'exemplo-atelie',
    titulo: 'Bolsa tiracolo em couro legítimo',
    categoria: 'Couro & selaria',
    descricao: 'Costura manual encerada e fivelas em latão maciço.',
    tempoProducaoDias: 18,
    precoReferencia: 680,
    imagemBase64: '/src/assets/images/portfolio_leather_bag_1795566421523.jpg',
    ordem: 1,
  },
  {
    id: 'ex-3',
    uid: 'exemplo-atelie',
    titulo: 'Bastidor botânico em linho',
    categoria: 'Bordado livre',
    descricao: 'Composição floral bordada à mão com fios de algodão e linho.',
    tempoProducaoDias: 10,
    precoReferencia: 260,
    imagemBase64: '/src/assets/images/portfolio_botanical_embroidery_1795566422452.jpg',
    ordem: 2,
  },
];

export function PaginaPublicaArtesao() {
  const { slug = '' } = useParams<{ slug: string }>();

  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [ehExemplo, setEhExemplo] = useState(false);
  const [perfil, setPerfil] = useState<PerfilPublicoView | null>(null);
  const [portfolio, setPortfolio] = useState<ItemPortfolioView[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [itemLightbox, setItemLightbox] = useState<ItemPortfolioView | null>(null);

  // Formulário de pedido sem conta
  const [clienteNome, setClienteNome] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteWhatsApp, setClienteWhatsApp] = useState('');
  const [categoria, setCategoria] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [medidas, setMedidas] = useState('');
  const [orcamentoClienteDesejado, setOrcamentoClienteDesejado] = useState('');
  const [prazoDesejadoTexto, setPrazoDesejadoTexto] = useState('');
  const [consentimentoLgpd, setConsentimentoLgpd] = useState(false);
  const [imagens, setImagens] = useState<ImagemAnexadaPayload[]>([]);
  const [comprimindo, setComprimindo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errosCampos, setErrosCampos] = useState<Record<string, string>>({});
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [pedidoCriadoCodigo, setPedidoCriadoCodigo] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      setCarregando(true);
      setErroCarga(null);
      setEhExemplo(false);
      setPedidoCriadoCodigo(null);

      try {
        const resp = await fetch(`/api/pagina/${encodeURIComponent(slug)}`);
        if (resp.ok) {
          const data = (await resp.json()) as {
            ok: boolean;
            perfil: PerfilPublicoView;
            portfolio: ItemPortfolioView[];
          };
          if (ativo && data.ok) {
            setPerfil(data.perfil);
            setPortfolio(data.portfolio || []);
            setCategoria(data.perfil.categorias?.[0] || data.perfil.especialidade || 'Sob medida');
            setCarregando(false);
            return;
          }
        }

        if (slug === 'exemplo-atelie' && ativo) {
          setPerfil(PERFIL_EXEMPLO);
          setPortfolio(PORTFOLIO_EXEMPLO);
          setCategoria(PERFIL_EXEMPLO.categorias[0]);
          setEhExemplo(true);
          setCarregando(false);
          return;
        }

        const errData = (await resp.json().catch(() => ({}))) as { erro?: string };
        if (ativo) {
          setErroCarga(errData.erro || 'Página do ateliê não encontrada.');
          setPerfil(null);
        }
      } catch {
        if (slug === 'exemplo-atelie' && ativo) {
          setPerfil(PERFIL_EXEMPLO);
          setPortfolio(PORTFOLIO_EXEMPLO);
          setCategoria(PERFIL_EXEMPLO.categorias[0]);
          setEhExemplo(true);
        } else if (ativo) {
          setErroCarga('Não foi possível carregar os dados deste ateliê.');
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    void carregar();
    return () => {
      ativo = false;
    };
  }, [slug]);

  const handleSelecionarImagens = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const espacoRestante = MAX_IMAGENS_POR_PEDIDO - imagens.length;
    if (espacoRestante <= 0) {
      setErroEnvio(`Limite máximo de ${MAX_IMAGENS_POR_PEDIDO} imagens por pedido.`);
      return;
    }

    setComprimindo(true);
    setErroEnvio(null);
    try {
      const selecionados = files.slice(0, espacoRestante);
      const comprimidos: ImagemAnexadaPayload[] = [];
      for (const file of selecionados) {
        const comprimida = await comprimirImagemNoNavegador(file, 1280, 0.7);
        comprimidos.push(comprimida);
      }
      setImagens((prev) => [...prev, ...comprimidos]);
    } catch (err) {
      setErroEnvio(err instanceof Error ? err.message : 'Erro ao processar imagem.');
    } finally {
      setComprimindo(false);
    }
  };

  const removerImagem = (index: number) => {
    setImagens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEnviarPedido = async (e: FormEvent) => {
    e.preventDefault();
    if (!perfil) return;
    setErrosCampos({});
    setErroEnvio(null);

    if (ehExemplo) {
      setErroEnvio(
        'Esta é uma vitrine demonstrativa. Crie sua conta para gerar sua página pública real e receber pedidos no Firestore.'
      );
      return;
    }

    setEnviando(true);
    try {
      const resp = await fetch('/api/criar-pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: perfil.slug,
          clienteNome,
          clienteEmail,
          clienteWhatsApp,
          categoria,
          titulo,
          descricao,
          medidas,
          orcamentoClienteDesejado: orcamentoClienteDesejado ? Number(orcamentoClienteDesejado) : null,
          prazoDesejadoTexto,
          consentimentoLgpd,
          imagens,
        }),
      });

      const data = (await resp.json()) as {
        ok: boolean;
        codigo?: string;
        codigoErro?: string;
        erro?: string;
        campos?: Record<string, string>;
        aceitandoPedidos?: boolean;
      };

      if (!resp.ok || !data.ok) {
        if (data.campos) setErrosCampos(data.campos);
        if (data.codigoErro === 'LIMITE_PLANO_ATINGIDO') {
          setPerfil((prev) => (prev ? { ...prev, aceitandoPedidos: false } : prev));
        }
        setErroEnvio(data.erro || 'Não foi possível enviar o pedido.');
        return;
      }

      setPedidoCriadoCodigo(data.codigo || 'PEDIDO-REGISTRADO');
      if (data.aceitandoPedidos === false) {
        setPerfil((prev) => (prev ? { ...prev, aceitandoPedidos: false } : prev));
      }
      setClienteNome('');
      setClienteEmail('');
      setClienteWhatsApp('');
      setTitulo('');
      setDescricao('');
      setMedidas('');
      setOrcamentoClienteDesejado('');
      setPrazoDesejadoTexto('');
      setConsentimentoLgpd(false);
      setImagens([]);
    } catch {
      setErroEnvio('Falha de comunicação ao enviar o pedido.');
    } finally {
      setEnviando(false);
    }
  };

  const categoriasDisponiveis = Array.from(
    new Set(portfolio.map((item) => item.categoria).filter(Boolean))
  );
  const portfolioFiltrado =
    categoriaFiltro === 'todas'
      ? portfolio
      : portfolio.filter((item) => item.categoria === categoriaFiltro);

  return (
    <div className="min-h-screen bg-[#FAF9FC] text-[#2D254E]">
      <Navbar />

      {carregando ? (
        <main className="max-w-6xl mx-auto px-6 py-16">
          <div className="h-48 bg-white border border-[#E4DFEC] rounded-2xl animate-pulse" />
        </main>
      ) : erroCarga || !perfil ? (
        <main className="max-w-2xl mx-auto px-6 py-20 text-center space-y-4">
          <h1 className="font-display text-3xl font-semibold text-[#2D254E]">
            Ateliê não encontrado
          </h1>
          <p className="text-sm text-[#728168]">
            {erroCarga || 'Verifique o endereço digitado e tente novamente.'}
          </p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 rounded-lg bg-[#2D254E] text-white text-sm font-medium"
          >
            Voltar ao início
          </Link>
        </main>
      ) : (
        <main className="max-w-6xl mx-auto px-6 py-10 space-y-12">
          {ehExemplo && (
            <div className="bg-[#2D254E] text-white rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-sm">
              <span>
                Vitrine demonstrativa: explore como seus clientes visualizam seu portfólio e o formulário LGPD.
              </span>
              <Link
                to="/entrar"
                className="px-3.5 py-1.5 rounded-lg bg-[#94D665] text-[#2D254E] font-semibold text-xs whitespace-nowrap"
              >
                Criar minha vitrine real
              </Link>
            </div>
          )}

          {/* Cabeçalho público do artesão (sem PII) */}
          <section className="bg-white border border-[#E4DFEC] rounded-2xl p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#728168]">
                <span>{perfil.especialidade}</span>
                {perfil.cidadeUf && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{perfil.cidadeUf}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Prazo médio de {perfil.prazoMedioDias} dias
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#2D254E]">
                {perfil.nomeAtelie}
              </h1>
              {perfil.bio && (
                <p className="text-sm sm:text-base text-[#728168] leading-relaxed">
                  {perfil.bio}
                </p>
              )}
            </div>

            <div className="shrink-0 flex flex-col items-start lg:items-end gap-3">
              <div
                className={`px-4 py-2 rounded-lg text-xs font-semibold border ${
                  perfil.aceitandoPedidos
                    ? 'bg-[#94D665]/25 border-[#94D665] text-[#2D254E]'
                    : 'bg-[#F4F2F7] border-[#E4DFEC] text-[#728168]'
                }`}
              >
                {perfil.aceitandoPedidos
                  ? 'Agenda aberta para novas encomendas'
                  : 'Agenda fechada no momento (cota mensal atingida)'}
              </div>
              {perfil.aceitandoPedidos && (
                <a
                  href="#solicitar-pedido"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: perfil.corDestaque || '#2D254E' }}
                >
                  Solicitar orçamento sob medida
                </a>
              )}
            </div>
          </section>

          {/* Portfólio */}
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-2xl font-semibold text-[#2D254E]">
                Portfólio de peças
              </h2>
              {categoriasDisponiveis.length > 1 && (
                <div className="flex items-center gap-1 p-1 bg-[#F4F2F7] rounded-lg overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setCategoriaFiltro('todas')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
                      categoriaFiltro === 'todas'
                        ? 'bg-white text-[#2D254E] shadow-xs'
                        : 'text-[#728168]'
                    }`}
                  >
                    Todas
                  </button>
                  {categoriasDisponiveis.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoriaFiltro(cat)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
                        categoriaFiltro === cat
                          ? 'bg-white text-[#2D254E] shadow-xs'
                          : 'text-[#728168]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {portfolioFiltrado.length === 0 ? (
              <div className="bg-white border border-[#E4DFEC] rounded-2xl p-10 text-center text-sm text-[#728168]">
                Este ateliê ainda não publicou fotos no portfólio, mas você pode descrever sua ideia no formulário abaixo.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {portfolioFiltrado.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setItemLightbox(item)}
                    className="group bg-white border border-[#E4DFEC] rounded-2xl overflow-hidden text-left hover:border-[#D065D6] transition-colors cursor-pointer"
                  >
                    <div className="aspect-4/3 bg-[#F4F2F7] overflow-hidden">
                      <img
                        src={item.imagemBase64}
                        alt={item.titulo}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                      />
                    </div>
                    <div className="p-5 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-[#728168]">
                        <span>{item.categoria}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.tempoProducaoDias} dias</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-[#2D254E] font-medium">
                          {formatarMoedaBrl(item.precoReferencia)}
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-semibold text-[#2D254E]">
                        {item.titulo}
                      </h3>
                      {item.descricao && (
                        <p className="text-xs text-[#728168] line-clamp-2">{item.descricao}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Formulário público de pedido sem conta */}
          <section id="solicitar-pedido" className="bg-white border border-[#E4DFEC] rounded-2xl p-6 sm:p-8">
            <div className="max-w-2xl mb-6">
              <h2 className="font-display text-2xl font-semibold text-[#2D254E] mb-1">
                Solicitar encomenda sob medida
              </h2>
              <p className="text-sm text-[#728168]">
                Não é necessário criar conta. Descreva sua peça e envie até 5 imagens de referência.
              </p>
            </div>

            {!perfil.aceitandoPedidos ? (
              <div className="bg-[#F4F2F7] border border-[#E4DFEC] rounded-xl p-6 flex items-start gap-3">
                <Lock className="w-5 h-5 text-[#728168] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-[#2D254E]">
                    Pedidos temporariamente pausados
                  </p>
                  <p className="text-xs text-[#728168] mt-1">
                    Este ateliê atingiu o limite mensal de encomendas no momento (RN06). Tente novamente na virada do mês.
                  </p>
                </div>
              </div>
            ) : pedidoCriadoCodigo ? (
              <div className="bg-[#94D665]/20 border border-[#94D665] rounded-xl p-6 space-y-3">
                <div className="flex items-center gap-2.5 text-[#2D254E]">
                  <CheckCircle2 className="w-5 h-5" />
                  <h3 className="font-display text-lg font-semibold">
                    Pedido enviado com sucesso
                  </h3>
                </div>
                <p className="text-sm text-[#2D254E]/85">
                  Código de acompanhamento:{' '}
                  <strong className="font-mono">{pedidoCriadoCodigo}</strong>. O ateliê recebeu sua
                  solicitação e entrará em contato pelo e-mail informado com o orçamento.
                </p>
                <button
                  type="button"
                  onClick={() => setPedidoCriadoCodigo(null)}
                  className="px-4 py-2 rounded-lg bg-[#2D254E] text-white text-xs font-medium cursor-pointer"
                >
                  Enviar outra solicitação
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnviarPedido} className="space-y-5">
                {erroEnvio && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                    {erroEnvio}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      Seu nome completo *
                    </span>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={100}
                      value={clienteNome}
                      onChange={(e) => setClienteNome(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg focus:outline-none focus:border-[#D065D6]"
                    />
                    {errosCampos.clienteNome && (
                      <span className="text-xs text-red-600 mt-1 block">{errosCampos.clienteNome}</span>
                    )}
                  </label>

                  <label className="block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      Seu e-mail *
                    </span>
                    <input
                      type="email"
                      required
                      maxLength={120}
                      value={clienteEmail}
                      onChange={(e) => setClienteEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg focus:outline-none focus:border-[#D065D6]"
                    />
                    {errosCampos.clienteEmail && (
                      <span className="text-xs text-red-600 mt-1 block">{errosCampos.clienteEmail}</span>
                    )}
                  </label>

                  <label className="block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      WhatsApp (opcional)
                    </span>
                    <input
                      type="tel"
                      maxLength={30}
                      value={clienteWhatsApp}
                      onChange={(e) => setClienteWhatsApp(e.target.value)}
                      placeholder="(71) 99999-0000"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg focus:outline-none focus:border-[#D065D6]"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      Título da peça *
                    </span>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={120}
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ex.: Jogo de 4 xícaras esmaltadas em tom sálvia"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg focus:outline-none focus:border-[#D065D6]"
                    />
                    {errosCampos.titulo && (
                      <span className="text-xs text-red-600 mt-1 block">{errosCampos.titulo}</span>
                    )}
                  </label>

                  <label className="block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      Categoria *
                    </span>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={60}
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      list="categorias-perfil"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg focus:outline-none focus:border-[#D065D6]"
                    />
                    <datalist id="categorias-perfil">
                      {(perfil.categorias || []).map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </label>
                </div>

                <label className="block">
                  <span className="block text-xs font-medium text-[#728168] mb-1">
                    Descrição detalhada do pedido *
                  </span>
                  <textarea
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={4}
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Conte sobre cores, materiais, uso pretendido e detalhes importantes..."
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg focus:outline-none focus:border-[#D065D6]"
                  />
                  {errosCampos.descricao && (
                    <span className="text-xs text-red-600 mt-1 block">{errosCampos.descricao}</span>
                  )}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="relative block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      Medidas aproximadas (cm)
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      maxLength={200}
                      value={medidas}
                      onChange={(e) => setMedidas(e.target.value)}
                      placeholder="22 x 14"
                      className="w-full pl-3.5 pr-11 py-2.5 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] focus:outline-none focus:border-[#D065D6]"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3.5 bottom-0 h-[42px] flex items-center text-xs font-mono font-medium text-[#728168]"
                    >
                      cm
                    </span>
                  </label>

                  <label className="relative block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      Expectativa de valor (R$)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={orcamentoClienteDesejado}
                      onChange={(e) => setOrcamentoClienteDesejado(e.target.value)}
                      placeholder="0,00"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] focus:outline-none focus:border-[#D065D6]"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 bottom-0 h-[42px] flex items-center text-xs font-mono font-medium text-[#728168]"
                    >
                      R$
                    </span>
                  </label>

                  <label className="block">
                    <span className="block text-xs font-medium text-[#728168] mb-1">
                      Prazo desejado (data)
                    </span>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      maxLength={80}
                      value={prazoDesejadoTexto}
                      onChange={(e) => setPrazoDesejadoTexto(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] focus:outline-none focus:border-[#D065D6]"
                    />
                  </label>
                </div>

                {/* Upload e pré-visualização de imagens comprimidas */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="block text-xs font-medium text-[#2D254E]">
                        Imagens de referência ({imagens.length}/{MAX_IMAGENS_POR_PEDIDO})
                      </span>
                      <span className="text-xs text-[#728168]">
                        JPG, PNG ou WEBP — comprimidas automaticamente no navegador (máx. 1280px).
                      </span>
                    </div>
                    {imagens.length < MAX_IMAGENS_POR_PEDIDO && (
                      <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#E4DFEC] bg-[#FAF9FC] text-xs font-medium text-[#2D254E] hover:bg-[#F4F2F7] cursor-pointer">
                        <ImagePlus className="w-4 h-4" />
                        {comprimindo ? 'Comprimindo...' : 'Adicionar fotos'}
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          disabled={comprimindo}
                          onChange={handleSelecionarImagens}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>

                  {imagens.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {imagens.map((img, idx) => (
                        <div
                          key={`${img.nome}-${idx}`}
                          className="relative border border-[#E4DFEC] rounded-xl overflow-hidden bg-[#FAF9FC]"
                        >
                          <img
                            src={img.dataBase64}
                            alt={img.nome}
                            referrerPolicy="no-referrer"
                            className="w-full aspect-square object-cover"
                          />
                          <div className="px-2 py-1 text-[11px] text-[#728168] flex items-center justify-between gap-1 bg-white border-t border-[#E4DFEC]">
                            <span className="truncate font-mono">{formatarTamanhoBytes(img.tamanhoBytes)}</span>
                            <button
                              type="button"
                              onClick={() => removerImagem(idx)}
                              aria-label={`Remover ${img.nome}`}
                              className="text-[#2D254E] hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Consentimento LGPD obrigatório (RN03) */}
                <label className="flex items-start gap-3 p-4 rounded-xl bg-[#FAF9FC] border border-[#E4DFEC] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentimentoLgpd}
                    onChange={(e) => setConsentimentoLgpd(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#2D254E]"
                  />
                  <span className="text-xs text-[#2D254E]/85 leading-relaxed">
                    Concordo que meus dados de contato e referências enviadas sejam usados
                    exclusivamente para orçamento e produção deste pedido, com retenção máxima de 12
                    meses após o encerramento (LGPD).{' '}
                    <Link to="/privacidade" className="underline font-medium text-[#2D254E]">
                      Ler política completa
                    </Link>
                    .
                  </span>
                </label>
                {errosCampos.consentimentoLgpd && (
                  <p className="text-xs text-red-600">{errosCampos.consentimentoLgpd}</p>
                )}

                <button
                  type="submit"
                  disabled={enviando || comprimindo}
                  className="px-6 py-3 rounded-lg bg-[#2D254E] text-white text-sm font-semibold hover:bg-[#2D254E]/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {enviando ? 'Enviando solicitação...' : 'Enviar pedido ao ateliê'}
                </button>
              </form>
            )}
          </section>
        </main>
      )}

      {/* Lightbox do portfólio */}
      {itemLightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setItemLightbox(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-[#F4F2F7]">
              <img
                src={itemLightbox.imagemBase64}
                alt={itemLightbox.titulo}
                referrerPolicy="no-referrer"
                className="w-full max-h-[60vh] object-contain"
              />
              <button
                type="button"
                onClick={() => setItemLightbox(null)}
                aria-label="Fechar visualização"
                className="absolute top-3 right-3 p-2 rounded-full bg-white/90 text-[#2D254E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#728168]">
                <span>{itemLightbox.categoria}</span>
                <span aria-hidden="true">·</span>
                <span>{itemLightbox.tempoProducaoDias} dias</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-[#2D254E] font-semibold">
                  {formatarMoedaBrl(itemLightbox.precoReferencia)}
                </span>
              </div>
              <h3 className="font-display text-xl font-semibold text-[#2D254E]">
                {itemLightbox.titulo}
              </h3>
              {itemLightbox.descricao && (
                <p className="text-sm text-[#728168]">{itemLightbox.descricao}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
