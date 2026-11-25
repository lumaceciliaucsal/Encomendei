import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  mensagem: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, mensagem: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let mensagem = error.message || 'Ocorreu um erro inesperado na interface.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string; path?: string };
      if (parsed && parsed.error) {
        mensagem = `Erro ao acessar dados (${parsed.operationType || 'leitura'} em ${parsed.path || 'coleção'}): ${parsed.error}`;
      }
    } catch {
      // Erro padrão não-JSON
    }
    return { hasError: true, mensagem };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF9FC] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#E4DFEC] rounded-2xl p-8">
            <div className="flex items-center gap-3 text-[#2D254E] mb-3">
              <AlertTriangle className="w-6 h-6 text-[#D065D6]" />
              <h1 className="font-display text-2xl font-semibold">
                Não foi possível concluir a operação
              </h1>
            </div>
            <p className="text-sm text-[#728168] leading-relaxed mb-6">
              {this.state.mensagem}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, mensagem: '' });
                window.location.href = '/';
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2D254E] text-white text-sm font-medium hover:bg-[#2D254E]/90 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Voltar ao início
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
