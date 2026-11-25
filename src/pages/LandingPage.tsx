import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { CalculadoraOrcamento } from '../components/CalculadoraOrcamento';
import { PLANOS, formatarMoedaBrl } from '../lib/regras';

const VITRINE_EXEMPLO = [
  {
    titulo: 'Vaso em grés esmaltado à mão',
    categoria: 'Cerâmica autoral',
    prazo: '14 dias',
    preco: 340,
    imagem: '/src/assets/images/portfolio_ceramic_vase_1795566420798.jpg',
  },
  {
    titulo: 'Bolsa tiracolo em couro curtido',
    categoria: 'Couro & selaria',
    prazo: '18 dias',
    preco: 680,
    imagem: '/src/assets/images/portfolio_leather_bag_1795566421523.jpg',
  },
  {
    titulo: 'Bastidor botânico em linho cru',
    categoria: 'Bordado livre',
    prazo: '10 dias',
    preco: 260,
    imagem: '/src/assets/images/portfolio_botanical_embroidery_1795566422452.jpg',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAF9FC] text-[#2D254E]">
      <Navbar />

      {/* Hero Split */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-16 lg:pt-20 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-[#728168] mb-4">
              Para ceramistas, marceneiros, bordadeiras e oficinas autorais
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold leading-[1.08] tracking-tight text-[#2D254E] text-balance mb-6">
              Organize encomendas sob medida com preço justo e agenda protegida.
            </h1>
            <p className="text-base sm:text-lg text-[#728168] leading-relaxed max-w-xl mb-8">
              Publique sua vitrine em <span className="font-mono text-sm text-[#2D254E]">/a/seu-atelie</span>,
              receba pedidos com fotos e consentimento LGPD sem o cliente precisar criar conta,
              calcule orçamentos versionados e acompanhe cada peça no Kanban.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/entrar"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#2D254E] text-white text-sm font-semibold hover:bg-[#2D254E]/90 transition-colors"
              >
                Criar página do ateliê
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/a/exemplo-atelie"
                className="px-5 py-3.5 rounded-lg border border-[#E4DFEC] bg-white text-sm font-medium text-[#2D254E] hover:bg-[#F4F2F7] transition-colors"
              >
                Ver vitrine de exemplo
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[340px] lg:min-h-[480px] rounded-2xl overflow-hidden border border-[#E4DFEC] bg-[#F4F2F7]">
              <img
                src="/src/assets/images/atelier_hero_ceramics_1795566421068.jpg"
                alt="Bancada de ateliê artesanal com peças em cerâmica e ferramentas manuais"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#2D254E]/85 via-[#2D254E]/40 to-transparent p-6 text-white">
                <p className="text-xs text-white/80">Ofício &amp; Medida</p>
                <p className="font-display text-lg font-medium">
                  Da solicitação inicial à entrega final com histórico auditável.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Faixa de capacidades 4 colunas */}
        <div
          id="fluxo"
          className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#E4DFEC] border border-[#E4DFEC] rounded-2xl overflow-hidden"
        >
          <div className="bg-white p-6">
            <p className="text-xs font-medium text-[#728168] mb-1">01. Captação pública</p>
            <p className="font-display text-lg font-semibold text-[#2D254E] mb-2">
              Cliente sem cadastro
            </p>
            <p className="text-sm text-[#728168] leading-relaxed">
              Briefing com medidas, até 5 fotos comprimidas no navegador e aceite LGPD validado no servidor.
            </p>
          </div>
          <div className="bg-white p-6">
            <p className="text-xs font-medium text-[#728168] mb-1">02. Precificação real</p>
            <p className="font-display text-lg font-semibold text-[#2D254E] mb-2">
              Orçamentos em versões
            </p>
            <p className="text-sm text-[#728168] leading-relaxed">
              Calcule insumos, horas de bancada, custos indiretos, taxas e margem preservando cada revisão.
            </p>
          </div>
          <div className="bg-white p-6">
            <p className="text-xs font-medium text-[#728168] mb-1">03. Produção clara</p>
            <p className="font-display text-lg font-semibold text-[#2D254E] mb-2">
              Kanban com regras
            </p>
            <p className="text-sm text-[#728168] leading-relaxed">
              Transições validadas entre Novo, Orçamento, Aprovado, Produção, Pronto e Entregue.
            </p>
          </div>
          <div className="bg-white p-6">
            <p className="text-xs font-medium text-[#728168] mb-1">04. Agenda protegida</p>
            <p className="font-display text-lg font-semibold text-[#2D254E] mb-2">
              Limite mensal automático
            </p>
            <p className="text-sm text-[#728168] leading-relaxed">
              Contagem no fuso America/Bahia pausa novos pedidos quando a cota do mês é atingida.
            </p>
          </div>
        </div>
      </section>

      {/* Vitrine de portfólio */}
      <section id="vitrine" className="border-t border-[#E4DFEC] bg-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-sm font-medium text-[#728168] mb-2">Vitrine do ateliê</p>
              <h2 className="font-display text-3xl font-semibold text-[#2D254E] text-balance">
                Mostre peças autorais com prazo e referência de valor
              </h2>
            </div>
            <Link
              to="/a/exemplo-atelie"
              className="text-sm font-semibold text-[#2D254E] hover:text-[#D065D6] transition-colors whitespace-nowrap"
            >
              Explorar página pública completa →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VITRINE_EXEMPLO.map((peca) => (
              <article
                key={peca.titulo}
                className="bg-[#FAF9FC] border border-[#E4DFEC] rounded-2xl overflow-hidden"
              >
                <div className="aspect-4/3 bg-[#F4F2F7] overflow-hidden">
                  <img
                    src={peca.imagem}
                    alt={peca.titulo}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-[#728168] mb-1.5">
                    <span>{peca.categoria}</span>
                    <span aria-hidden="true">·</span>
                    <span>{peca.prazo}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-[#2D254E] font-medium">
                      {formatarMoedaBrl(peca.preco)}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-[#2D254E]">
                    {peca.titulo}
                  </h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Calculadora interativa */}
      <section id="calculadora" className="border-t border-[#E4DFEC] py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-medium text-[#728168] mb-2">Calculadora de precificação</p>
            <h2 className="font-display text-3xl font-semibold text-[#2D254E] text-balance mb-3">
              Teste o cálculo de margem e sinal antes de enviar uma proposta
            </h2>
            <p className="text-sm text-[#728168] leading-relaxed">
              Simule materiais, horas trabalhadas, custos indiretos e taxa de pagamento em tempo real.
            </p>
          </div>
          <CalculadoraOrcamento />
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="border-t border-[#E4DFEC] bg-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-sm font-medium text-[#728168] mb-2">Planos mensais</p>
            <h2 className="font-display text-3xl font-semibold text-[#2D254E] text-balance">
              Limites transparentes para cada ritmo de produção
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.values(PLANOS).map((plano) => {
              const destaque = plano.id === 'atelie';
              return (
                <div
                  key={plano.id}
                  className={`rounded-2xl p-7 flex flex-col justify-between border ${
                    destaque
                      ? 'bg-[#2D254E] text-white border-[#2D254E]'
                      : 'bg-[#FAF9FC] text-[#2D254E] border-[#E4DFEC]'
                  }`}
                >
                  <div>
                    <p className={`text-xs font-medium mb-1 ${destaque ? 'text-[#94D665]' : 'text-[#728168]'}`}>
                      {plano.limitePedidosMes === null
                        ? 'Volume ilimitado'
                        : `Até ${plano.limitePedidosMes} pedidos/mês`}
                    </p>
                    <h3 className="font-display text-2xl font-semibold mb-1">{plano.nome}</h3>
                    <p className={`text-sm mb-5 ${destaque ? 'text-white/75' : 'text-[#728168]'}`}>
                      {plano.subtitulo}
                    </p>
                    <p className="font-display text-3xl font-semibold font-mono tabular-nums mb-6">
                      {plano.precoMensal === 0 ? 'Gratuito' : `${formatarMoedaBrl(plano.precoMensal)}/mês`}
                    </p>
                    <ul className="space-y-2.5 text-sm mb-8">
                      {plano.recursos.map((rec) => (
                        <li key={rec} className="flex items-start gap-2.5">
                          <Check
                            className={`w-4 h-4 mt-0.5 shrink-0 ${
                              destaque ? 'text-[#94D665]' : 'text-[#728168]'
                            }`}
                          />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    to="/entrar"
                    className={`block text-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${
                      destaque
                        ? 'bg-[#94D665] text-[#2D254E] hover:bg-[#94D665]/90'
                        : 'bg-[#2D254E] text-white hover:bg-[#2D254E]/90'
                    }`}
                  >
                    Começar com {plano.nome}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Rodapé limpo */}
      <footer className="border-t border-[#E4DFEC] bg-[#FAF9FC] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#728168]">
          <p>Ofício &amp; Medida · Gestão artesanal com privacidade e retenção LGPD de 12 meses.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacidade" className="hover:text-[#2D254E] transition-colors">
              Privacidade &amp; LGPD
            </Link>
            <Link to="/a/exemplo-atelie" className="hover:text-[#2D254E] transition-colors">
              Vitrine Exemplo
            </Link>
            <Link to="/entrar" className="hover:text-[#2D254E] transition-colors">
              Entrar no painel
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
