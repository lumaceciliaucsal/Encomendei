import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const naLanding = location.pathname === '/';

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9FC]/90 backdrop-blur-md border-b border-[#E4DFEC]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zona 1: Wordmark em linha única */}
        <Link
          to="/"
          className="font-display text-xl font-semibold tracking-tight text-[#2D254E] whitespace-nowrap shrink-0"
        >
          Ofício &amp; Medida
        </Link>

        {/* Zona 2: 4 links concisos */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#728168]">
          {naLanding ? (
            <>
              <a
                href="#fluxo"
                className="hover:text-[#2D254E] transition-colors whitespace-nowrap shrink-0"
              >
                Fluxo
              </a>
              <a
                href="#vitrine"
                className="hover:text-[#2D254E] transition-colors whitespace-nowrap shrink-0"
              >
                Portfólio
              </a>
              <a
                href="#calculadora"
                className="hover:text-[#2D254E] transition-colors whitespace-nowrap shrink-0"
              >
                Calculadora
              </a>
              <a
                href="#planos"
                className="hover:text-[#2D254E] transition-colors whitespace-nowrap shrink-0"
              >
                Planos
              </a>
            </>
          ) : (
            <>
              <Link
                to="/"
                className="hover:text-[#2D254E] transition-colors whitespace-nowrap shrink-0"
              >
                Início
              </Link>
              <Link
                to="/a/exemplo-atelie"
                className="hover:text-[#2D254E] transition-colors whitespace-nowrap shrink-0"
              >
                Vitrine Exemplo
              </Link>
              <Link
                to="/privacidade"
                className="hover:text-[#2D254E] transition-colors whitespace-nowrap shrink-0"
              >
                LGPD
              </Link>
              <Link
                to="/painel"
                className="hover:text-[#2D254E] transition-colors whitespace-nowrap shrink-0"
              >
                Painel
              </Link>
            </>
          )}
        </nav>

        {/* Zona 3: 1 ação primária */}
        <div className="flex items-center shrink-0">
          <Link
            to={user ? '/painel' : '/entrar'}
            className="px-4 py-2 rounded-lg bg-[#2D254E] text-white text-sm font-medium hover:bg-[#2D254E]/90 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D065D6]"
          >
            {user ? 'Abrir painel' : 'Acessar ateliê'}
          </Link>
        </div>
      </div>
    </header>
  );
}
