import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-[#FAF9FC] text-[#2D254E]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <p className="text-sm font-medium text-[#728168] mb-2">Transparência e LGPD</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#2D254E] text-balance">
            Privacidade, retenção e proteção de dados
          </h1>
        </div>

        <section className="bg-white border border-[#E4DFEC] rounded-2xl p-6 space-y-4 text-sm text-[#2D254E]/85 leading-relaxed">
          <h2 className="font-display text-xl font-semibold text-[#2D254E]">
            1. Dados coletados nos pedidos públicos (RN03)
          </h2>
          <p>
            Quando um cliente solicita uma encomenda pela página pública de um artesão, coletamos
            apenas nome, e-mail, WhatsApp opcional, descrição da peça e imagens de referência
            comprimidas, mediante consentimento explícito registrado com data e versão da política.
          </p>

          <h2 className="font-display text-xl font-semibold text-[#2D254E] pt-2">
            2. Isolamento e acesso restrito
          </h2>
          <p>
            Páginas públicas exibem apenas dados comerciais do ateliê e o portfólio aprovado.
            Contatos de clientes e anexos privados de pedidos nunca são expostos publicamente e só
            podem ser acessados pelo artesão responsável autenticado.
          </p>

          <h2 className="font-display text-xl font-semibold text-[#2D254E] pt-2">
            3. Retenção por 12 meses e expurgo automático (RN10)
          </h2>
          <p>
            Pedidos encerrados (Entregue, Recusado ou Cancelado) há mais de 12 meses passam por uma
            rotina diária automatizada que remove imagens anexadas e anonimiza nome, e-mail e
            telefone do cliente, mantendo apenas os registros estatísticos do ateliê.
          </p>

          <h2 className="font-display text-xl font-semibold text-[#2D254E] pt-2">
            4. Exclusão definitiva da conta do artesão
          </h2>
          <p>
            A qualquer momento, o artesão pode excluir sua conta nas configurações do painel,
            removendo permanentemente seu perfil público, slug, portfólio, pedidos, orçamentos,
            imagens e acesso no Firebase Authentication.
          </p>
        </section>

        <div>
          <Link
            to="/"
            className="text-sm font-medium text-[#2D254E] hover:text-[#D065D6] transition-colors"
          >
            ← Voltar para a página inicial
          </Link>
        </div>
      </main>
    </div>
  );
}
