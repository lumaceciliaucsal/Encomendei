import type { CorDestaque, PlanoId, StatusPedido } from './regras';

export interface ArtesaoDoc {
  uid: string;
  nomeAtelie: string;
  nomeResponsavel: string;
  email: string;
  telefone?: string;
  cidadeUf?: string;
  especialidade?: string;
  bio?: string;
  slug?: string;
  valorHoraPadrao?: number;
  margemPadrao?: number;
  taxaPlataformaPadrao?: number;
  percentualIndiretoPadrao?: number;
  plano: PlanoId;
  aceitandoPedidos: boolean;
  uso: number;
  mesReferencia: string;
  criadoEm: unknown;
  atualizadoEm: unknown;
}

export interface PerfilPublicoDoc {
  uid: string;
  slug: string;
  nomeAtelie: string;
  especialidade: string;
  cidadeUf?: string;
  bio?: string;
  prazoMedioDias: number;
  aceitandoPedidos: boolean;
  ativo: boolean;
  corDestaque: CorDestaque;
  categorias: string[];
  criadoEm: unknown;
  atualizadoEm: unknown;
}

export interface ItemPortfolioDoc {
  id: string;
  uid: string;
  titulo: string;
  categoria: string;
  descricao?: string;
  tempoProducaoDias: number;
  precoReferencia: number;
  imagemBase64: string;
  ordem: number;
  criadoEm: unknown;
  atualizadoEm: unknown;
}

export interface OrcamentoAtualResumo {
  versao: number;
  valorTotal: number;
  sinalEntrada: number;
  validadeDias: number;
  observacoes?: string;
  criadoEm: unknown;
}

export interface PedidoDoc {
  id: string;
  uidArtesao: string;
  codigo: string;
  clienteNome: string;
  clienteEmail: string;
  clienteWhatsApp?: string;
  categoria: string;
  titulo: string;
  descricao: string;
  medidas?: string;
  orcamentoClienteDesejado?: number | null;
  prazoDesejadoTexto?: string;
  status: StatusPedido;
  consentimentoLgpd: boolean;
  consentimentoEm: unknown;
  consentimentoVersao: string;
  prazoEstimadoDias?: number | null;
  dataEntregaPrevista?: string | null;
  notasInternas?: string;
  orcamentoAtual?: OrcamentoAtualResumo | null;
  totalImagens: number;
  criadoEm: unknown;
  atualizadoEm: unknown;
  encerradoEm?: unknown;
}

export interface ImagemPedidoDoc {
  id: string;
  nome: string;
  mimeType: string;
  tamanhoBytes: number;
  dataBase64: string;
  criadoEm: unknown;
}

export interface OrcamentoVersaoDoc {
  id: string;
  versao: number;
  custoMateriais: number;
  horasTrabalho: number;
  valorHora: number;
  percentualIndireto?: number;
  percentualMargem?: number;
  percentualTaxa?: number;
  descontoValor?: number;
  valorTotal: number;
  sinalEntrada: number;
  lucroLiquidoEstimado?: number;
  prazoEstimadoDias: number;
  validadeDias: number;
  observacoes?: string;
  itensMateriais: {
    id: string;
    nome: string;
    quantidade: number;
    custoUnitario: number;
  }[];
  criadoEm: unknown;
}

export interface HistoricoEventoDoc {
  id: string;
  tipo: 'criacao' | 'status' | 'orcamento' | 'nota';
  descricao: string;
  autor: 'cliente' | 'artesao' | 'sistema';
  criadoEm: unknown;
}

export interface UsoMensalDoc {
  mes: string;
  quantidade: number;
  limite: number | null;
  atualizadoEm: unknown;
}
