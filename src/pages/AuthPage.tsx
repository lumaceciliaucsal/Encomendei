import { useState, type FormEvent } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { MailCheck, RefreshCw } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';

type ModoAuth = 'login' | 'cadastro' | 'recuperar';

export function AuthPage() {
  const {
    user,
    authPronto,
    entrarComEmail,
    cadastrarComEmail,
    entrarComGoogle,
    enviarRecuperacaoSenha,
    reenviarVerificacao,
    recarregarUsuario,
    sair,
  } = useAuth();

  const [modo, setModo] = useState<ModoAuth>('login');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  if (authPronto && user && user.emailVerified) {
    return <Navigate to="/painel" replace />;
  }

  const traduzirErroAuth = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
      return 'E-mail ou senha incorretos.';
    }
    if (msg.includes('auth/email-already-in-use')) {
      return 'Já existe uma conta cadastrada com este e-mail.';
    }
    if (msg.includes('auth/weak-password')) {
      return 'A senha precisa ter pelo menos 6 caracteres.';
    }
    if (msg.includes('auth/operation-not-allowed')) {
      return 'Login por e-mail e senha ainda não está ativado no Firebase Console (Authentication → Sign-in method). Você também pode entrar com Google.';
    }
    if (msg.includes('auth/popup-closed-by-user')) {
      return 'A janela de login com Google foi fechada antes da conclusão.';
    }
    return 'Não foi possível autenticar. Verifique os dados e tente novamente.';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setCarregando(true);
    try {
      if (modo === 'login') {
        await entrarComEmail(email, senha);
      } else if (modo === 'cadastro') {
        await cadastrarComEmail(nome, email, senha);
        setSucesso('Conta criada! Enviamos um link de confirmação para o seu e-mail.');
      } else {
        await enviarRecuperacaoSenha(email);
        setSucesso('Se o e-mail estiver cadastrado, enviamos instruções de recuperação.');
      }
    } catch (err) {
      setErro(traduzirErroAuth(err));
    } finally {
      setCarregando(false);
    }
  };

  const handleGoogle = async () => {
    setErro(null);
    setSucesso(null);
    setCarregando(true);
    try {
      await entrarComGoogle();
    } catch (err) {
      setErro(traduzirErroAuth(err));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9FC] flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6">
        {authPronto && user && !user.emailVerified ? (
          <div className="max-w-md w-full bg-white border border-[#E4DFEC] rounded-2xl p-8 space-y-5">
            <div className="flex items-center gap-3 text-[#2D254E]">
              <MailCheck className="w-6 h-6 text-[#D065D6]" />
              <h1 className="font-display text-2xl font-semibold">Confirme seu e-mail</h1>
            </div>
            <p className="text-sm text-[#728168] leading-relaxed">
              Por segurança, as regras do banco exigem e-mail verificado para gravar dados do ateliê.
              Verifique a caixa de entrada de <strong className="text-[#2D254E]">{user.email}</strong>.
            </p>
            {sucesso && (
              <p className="text-xs bg-[#94D665]/25 border border-[#94D665] text-[#2D254E] px-3 py-2 rounded-lg">
                {sucesso}
              </p>
            )}
            {erro && (
              <p className="text-xs bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg">
                {erro}
              </p>
            )}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={async () => {
                  const ok = await recarregarUsuario();
                  if (!ok) {
                    setErro('E-mail ainda não confirmado. Clique no link enviado para sua caixa de entrada.');
                  }
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-[#2D254E] text-white text-sm font-semibold hover:bg-[#2D254E]/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Já confirmei meu e-mail
              </button>
              <button
                type="button"
                onClick={async () => {
                  await reenviarVerificacao();
                  setSucesso('Novo e-mail de verificação enviado.');
                }}
                className="w-full py-2.5 px-4 rounded-lg border border-[#E4DFEC] text-sm font-medium text-[#2D254E] hover:bg-[#F4F2F7] transition-colors cursor-pointer"
              >
                Reenviar e-mail de verificação
              </button>
              <button
                type="button"
                onClick={sair}
                className="w-full py-2 text-xs text-[#728168] hover:text-[#2D254E] cursor-pointer"
              >
                Sair e entrar com outra conta
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-md w-full bg-white border border-[#E4DFEC] rounded-2xl p-8">
            <div className="mb-6">
              <h1 className="font-display text-2xl font-semibold text-[#2D254E]">
                {modo === 'login' && 'Entrar no ateliê'}
                {modo === 'cadastro' && 'Criar conta de artesão'}
                {modo === 'recuperar' && 'Recuperar senha'}
              </h1>
              <p className="text-sm text-[#728168] mt-1">
                {modo === 'login' && 'Acesse seu painel Kanban, calculadora e vitrine.'}
                {modo === 'cadastro' && 'Comece gratuitamente com até 10 pedidos por mês.'}
                {modo === 'recuperar' && 'Enviaremos um link de redefinição para o seu e-mail.'}
              </p>
            </div>

            {/* Alternador de modo */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#F4F2F7] rounded-lg mb-6">
              <button
                type="button"
                onClick={() => {
                  setModo('login');
                  setErro(null);
                  setSucesso(null);
                }}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  modo === 'login' ? 'bg-white text-[#2D254E] shadow-xs' : 'text-[#728168]'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setModo('cadastro');
                  setErro(null);
                  setSucesso(null);
                }}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  modo === 'cadastro' ? 'bg-white text-[#2D254E] shadow-xs' : 'text-[#728168]'
                }`}
              >
                Cadastrar
              </button>
            </div>

            {erro && (
              <div className="mb-4 text-xs bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg">
                {erro}
              </div>
            )}
            {sucesso && (
              <div className="mb-4 text-xs bg-[#94D665]/25 border border-[#94D665] text-[#2D254E] px-3.5 py-2.5 rounded-lg">
                {sucesso}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {modo === 'cadastro' && (
                <label className="block">
                  <span className="block text-xs font-medium text-[#728168] mb-1">
                    Seu nome
                  </span>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex.: Clara Mendes"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] focus:outline-none focus:border-[#D065D6]"
                  />
                </label>
              )}

              <label className="block">
                <span className="block text-xs font-medium text-[#728168] mb-1">
                  E-mail
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@atelie.com.br"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] focus:outline-none focus:border-[#D065D6]"
                />
              </label>

              {modo !== 'recuperar' && (
                <label className="block">
                  <span className="block text-xs font-medium text-[#728168] mb-1">
                    Senha
                  </span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] focus:outline-none focus:border-[#D065D6]"
                  />
                </label>
              )}

              {modo === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setModo('recuperar');
                      setErro(null);
                      setSucesso(null);
                    }}
                    className="text-xs font-medium text-[#728168] hover:text-[#2D254E] underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Recuperar senha
                  </button>
                </div>
              )}

              {modo === 'recuperar' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setModo('login');
                      setErro(null);
                      setSucesso(null);
                    }}
                    className="text-xs font-medium text-[#728168] hover:text-[#2D254E] underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Voltar para o login
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={carregando}
                className="w-full py-2.5 px-4 rounded-lg bg-[#2D254E] text-white text-sm font-semibold hover:bg-[#2D254E]/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {carregando
                  ? 'Processando...'
                  : modo === 'login'
                    ? 'Entrar com e-mail'
                    : modo === 'cadastro'
                      ? 'Criar conta'
                      : 'Enviar link de recuperação'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E4DFEC]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-[#728168]">ou</span>
              </div>
            </div>

            <button
              type="button"
              disabled={carregando}
              onClick={handleGoogle}
              className="w-full py-2.5 px-4 rounded-lg border border-[#E4DFEC] bg-white text-sm font-medium text-[#2D254E] hover:bg-[#F4F2F7] transition-colors disabled:opacity-50 cursor-pointer"
            >
              Continuar com Google
            </button>

            <p className="text-xs text-[#728168] text-center mt-6">
              Ao usar a plataforma, você concorda com nossa{' '}
              <Link to="/privacidade" className="text-[#2D254E] underline">
                política de privacidade LGPD
              </Link>
              .
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
