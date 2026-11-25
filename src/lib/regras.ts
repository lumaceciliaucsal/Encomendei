export type PlanoId = 'gratuito' | 'atelie' | 'mestre';

export type StatusPedido =
  | 'Novo'
  | 'Em Orçamento'
  | 'Aguardando Aprovação'
  | 'Aprovado'
  | 'Em Produção'
  | 'Pronto'
  | 'Entregue'
  | 'Recusado'
  | 'Cancelado';

export type CorDestaque = '#D065D6' | '#94D665' | '#728168' | '#2D254E';

export interface PlanoConfigItem {
  id: PlanoId;
  nome: string;
  subtitulo: string;
  limitePedidosMes: number | null;
  precoMensal: number;
  recursos: string[];
}

export const PLANOS: Record<PlanoId, PlanoConfigItem> = {
  gratuito: {
    id: 'gratuito',
    nome: 'Semente',
    subtitulo: 'Para ateliês iniciando pedidos sob medida',
    limitePedidosMes: 10,
    precoMensal: 0,
    recursos: [
      'Até 10 novos pedidos por mês',
      'Página pública personalizada (/a/seu-atelie)',
      'Portfólio com até 12 peças destacadas',
      'Calculadora de precificação e histórico de orçamentos',
    ],
  },
  atelie: {
    id: 'atelie',
    nome: 'Ateliê',
    subtitulo: 'Para produção contínua e agenda recorrente',
    limitePedidosMes: 50,
    precoMensal: 49,
    recursos: [
      'Até 50 novos pedidos por mês',
      'Versionamento completo de orçamentos (RN07)',
      'Painel Kanban com prazos de entrega',
      'Notificações automáticas por e-mail',
    ],
  },
  mestre: {
    id: 'mestre',
    nome: 'Mestre',
    subtitulo: 'Para oficinas com alto volume de encomendas',
    limitePedidosMes: null,
    precoMensal: 119,
    recursos: [
      'Pedidos mensais ilimitados',
      'Prioridade de processamento e relatórios',
      'Expurgo automatizado LGPD (12 meses)',
      'Todos os recursos de portfólio e precificação',
    ],
  },
};

export const STATUS_KANBAN_ATIVOS: StatusPedido[] = [
  'Novo',
  'Em Orçamento',
  'Aguardando Aprovação',
  'Aprovado',
  'Em Produção',
  'Pronto',
];

export const STATUS_TERMINAIS: StatusPedido[] = [
  'Entregue',
  'Recusado',
  'Cancelado',
];

export const TODOS_STATUS: StatusPedido[] = [
  ...STATUS_KANBAN_ATIVOS,
  ...STATUS_TERMINAIS,
];

/**
 * RN04 — Tabela oficial de transições permitidas entre estados.
 * Deve permanecer sincronizada com firestore.rules.
 */
export const TRANSICOES_RN04: Record<StatusPedido, StatusPedido[]> = {
  'Novo': ['Em Orçamento', 'Cancelado'],
  'Em Orçamento': ['Aguardando Aprovação', 'Recusado', 'Cancelado'],
  'Aguardando Aprovação': ['Aprovado', 'Em Orçamento', 'Recusado', 'Cancelado'],
  'Aprovado': ['Em Produção', 'Cancelado'],
  'Em Produção': ['Pronto', 'Cancelado'],
  'Pronto': ['Entregue', 'Cancelado'],
  'Entregue': [],
  'Recusado': [],
  'Cancelado': [],
};

export function podeTransicionarStatus(atual: StatusPedido, proximo: StatusPedido): boolean {
  const permitidos = TRANSICOES_RN04[atual] ?? [];
  return permitidos.includes(proximo);
}

export function ehStatusTerminal(status: StatusPedido): boolean {
  return STATUS_TERMINAIS.includes(status);
}

/**
 * RN01 / Fuso America/Bahia: retorna 'AAAA-MM' sempre no fuso de Salvador/Bahia.
 */
export function obterMesReferenciaBahia(data: Date = new Date()): string {
  const formatador = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bahia',
    year: 'numeric',
    month: '2-digit',
  });
  const partes = formatador.formatToParts(data);
  const ano = partes.find((p) => p.type === 'year')?.value ?? String(data.getUTCFullYear());
  const mes = partes.find((p) => p.type === 'month')?.value ?? String(data.getUTCMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}`;
}

/**
 * RN01 & RN06 — Verifica se o artesão ainda possui cota mensal disponível.
 */
export function verificarLimitePlano(
  plano: PlanoId,
  usoAtual: number
): {
  permitido: boolean;
  limite: number | null;
  restante: number | null;
  atingiuLimite: boolean;
} {
  const config = PLANOS[plano] ?? PLANOS.gratuito;
  if (config.limitePedidosMes === null) {
    return {
      permitido: true,
      limite: null,
      restante: null,
      atingiuLimite: false,
    };
  }
  const restante = Math.max(0, config.limitePedidosMes - usoAtual);
  return {
    permitido: usoAtual < config.limitePedidosMes,
    limite: config.limitePedidosMes,
    restante,
    atingiuLimite: usoAtual >= config.limitePedidosMes,
  };
}

/**
 * RN02 — Validação e normalização de slug público.
 */
export const SLUGS_RESERVADOS = [
  'login',
  'cadastro',
  'painel',
  'api',
  'admin',
  'recuperar-senha',
  'privacidade',
  'termos',
  'config',
  'a',
] as const;

export function normalizarSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function validarSlug(slug: string): { valido: boolean; erro?: string } {
  if (!slug || slug.length < 3) {
    return { valido: false, erro: 'O endereço precisa ter ao menos 3 caracteres.' };
  }
  if (slug.length > 40) {
    return { valido: false, erro: 'O endereço pode ter no máximo 40 caracteres.' };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return {
      valido: false,
      erro: 'Use apenas letras minúsculas, números e hífens sem espaços.',
    };
  }
  if ((SLUGS_RESERVADOS as readonly string[]).includes(slug)) {
    return { valido: false, erro: 'Este endereço é reservado pelo sistema.' };
  }
  return { valido: true };
}

/**
 * RN03 — Consentimento LGPD explícito.
 */
export function validarConsentimentoLgpd(consentimento: unknown): boolean {
  return consentimento === true;
}

/**
 * RN05 — Cálculo de data estimada de entrega (AAAA-MM-DD no fuso America/Bahia).
 */
export function calcularDataEntregaEstimada(prazoDias: number, dataBase: Date = new Date()): string {
  const diasSeguros = Math.max(1, Math.min(365, Math.round(prazoDias)));
  const alvo = new Date(dataBase.getTime() + diasSeguros * 24 * 60 * 60 * 1000);
  const formatador = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bahia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatador.format(alvo);
}

/**
 * RN07 — Próxima versão sequencial de orçamento.
 */
export function proximaVersaoOrcamento(versoesExistentes: number[]): number {
  if (versoesExistentes.length === 0) return 1;
  return Math.max(...versoesExistentes) + 1;
}

/**
 * RN08 — Calculadora pura de precificação artesanal.
 */
export interface ItemMaterialCalculadora {
  id: string;
  nome: string;
  quantidade: number;
  custoUnitario: number;
}

export interface CalculadoraInput {
  itensMateriais: ItemMaterialCalculadora[];
  horasTrabalho: number;
  valorHora: number;
  percentualIndireto: number;
  percentualMargem: number;
  percentualTaxa: number;
  descontoValor: number;
  percentualSinal?: number;
}

export interface CalculadoraResultado {
  custoMateriais: number;
  custoMaoDeObra: number;
  custoIndireto: number;
  custoProducaoTotal: number;
  valorComMargem: number;
  taxaPagamento: number;
  valorTotal: number;
  lucroLiquidoEstimado: number;
  margemRealPercentual: number;
  sinalEntrada: number;
  saldoEntrega: number;
}

function arredondarBrl(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function calcularOrcamentoArtesanal(input: CalculadoraInput): CalculadoraResultado {
  const custoMateriais = arredondarBrl(
    input.itensMateriais.reduce((acc, item) => {
      const qtd = Math.max(0, Number(item.quantidade) || 0);
      const unit = Math.max(0, Number(item.custoUnitario) || 0);
      return acc + qtd * unit;
    }, 0)
  );

  const horas = Math.max(0, Number(input.horasTrabalho) || 0);
  const valorHora = Math.max(0, Number(input.valorHora) || 0);
  const custoMaoDeObra = arredondarBrl(horas * valorHora);

  const percIndireto = Math.max(0, Math.min(100, Number(input.percentualIndireto) || 0));
  const baseCustoDireto = custoMateriais + custoMaoDeObra;
  const custoIndireto = arredondarBrl(baseCustoDireto * (percIndireto / 100));
  const custoProducaoTotal = arredondarBrl(baseCustoDireto + custoIndireto);

  const percMargem = Math.max(0, Math.min(300, Number(input.percentualMargem) || 0));
  const valorComMargem = arredondarBrl(custoProducaoTotal * (1 + percMargem / 100));

  const desconto = Math.max(0, Number(input.descontoValor) || 0);
  const valorAposDesconto = Math.max(0, arredondarBrl(valorComMargem - desconto));

  const percTaxa = Math.max(0, Math.min(49, Number(input.percentualTaxa) || 0));
  // Gross-up para que após a taxa de pagamento o artesão receba o valor desejado
  const valorTotal =
    percTaxa > 0
      ? arredondarBrl(valorAposDesconto / (1 - percTaxa / 100))
      : valorAposDesconto;
  const taxaPagamento = arredondarBrl(valorTotal - valorAposDesconto);

  const lucroLiquidoEstimado = arredondarBrl(valorAposDesconto - custoProducaoTotal);
  const margemRealPercentual =
    valorTotal > 0 ? arredondarBrl((lucroLiquidoEstimado / valorTotal) * 100) : 0;

  const percSinal = Math.max(0, Math.min(100, Number(input.percentualSinal ?? 50)));
  const sinalEntrada = arredondarBrl(valorTotal * (percSinal / 100));
  const saldoEntrega = arredondarBrl(valorTotal - sinalEntrada);

  return {
    custoMateriais,
    custoMaoDeObra,
    custoIndireto,
    custoProducaoTotal,
    valorComMargem,
    taxaPagamento,
    valorTotal,
    lucroLiquidoEstimado,
    margemRealPercentual,
    sinalEntrada,
    saldoEntrega,
  };
}

/**
 * RN09 — Validação de imagens (Opção B sem Storage: base64 comprimido <= 500KB).
 */
export const TIPOS_IMAGEM_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGENS_POR_PEDIDO = 5;
export const MAX_TAMANHO_IMAGEM_BYTES = 500 * 1024; // 500 KB após compressão no navegador
export const MAX_TAMANHO_ARQUIVO_ORIGINAL_BYTES = 8 * 1024 * 1024; // 8 MB antes da compressão

export interface ImagemAnexadaPayload {
  nome: string;
  mimeType: string;
  tamanhoBytes: number;
  dataBase64: string;
}

export function estimarBytesBase64(dataUrlOrBase64: string): number {
  const base64 = dataUrlOrBase64.includes(',')
    ? dataUrlOrBase64.split(',')[1] ?? ''
    : dataUrlOrBase64;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function validarListaImagensPedido(imagens: unknown): {
  valido: boolean;
  erro?: string;
  itens: ImagemAnexadaPayload[];
} {
  if (imagens === undefined || imagens === null) {
    return { valido: true, itens: [] };
  }
  if (!Array.isArray(imagens)) {
    return { valido: false, erro: 'Formato inválido de lista de imagens.', itens: [] };
  }
  if (imagens.length > MAX_IMAGENS_POR_PEDIDO) {
    return {
      valido: false,
      erro: `Máximo de ${MAX_IMAGENS_POR_PEDIDO} imagens por pedido.`,
      itens: [],
    };
  }

  const validados: ImagemAnexadaPayload[] = [];
  for (let i = 0; i < imagens.length; i++) {
    const item = imagens[i] as Partial<ImagemAnexadaPayload> | null;
    if (!item || typeof item !== 'object') {
      return { valido: false, erro: `Imagem ${i + 1} inválida.`, itens: [] };
    }
    const mimeType = typeof item.mimeType === 'string' ? item.mimeType : '';
    if (!(TIPOS_IMAGEM_PERMITIDOS as readonly string[]).includes(mimeType)) {
      return {
        valido: false,
        erro: `Imagem ${i + 1}: formato não permitido (use JPG, PNG ou WEBP).`,
        itens: [],
      };
    }
    const dataBase64 = typeof item.dataBase64 === 'string' ? item.dataBase64 : '';
    if (!dataBase64.startsWith(`data:${mimeType};base64,`)) {
      return {
        valido: false,
        erro: `Imagem ${i + 1}: codificação incompatível com o tipo declarado.`,
        itens: [],
      };
    }
    const bytesReais = estimarBytesBase64(dataBase64);
    if (bytesReais <= 0 || bytesReais > MAX_TAMANHO_IMAGEM_BYTES || dataBase64.length > 750000) {
      return {
        valido: false,
        erro: `Imagem ${i + 1} excede o limite de 500 KB após compressão.`,
        itens: [],
      };
    }
    const nome = typeof item.nome === 'string' && item.nome.trim().length > 0
      ? item.nome.trim().slice(0, 120)
      : `referencia-${i + 1}.jpg`;
    validados.push({
      nome,
      mimeType,
      tamanhoBytes: bytesReais,
      dataBase64,
    });
  }

  return { valido: true, itens: validados };
}

/**
 * RN10 — Elegibilidade para expurgo LGPD (12 meses após encerramento).
 */
export function estaElegivelParaExpurgo(
  status: StatusPedido,
  encerradoEmMs: number | null | undefined,
  agoraMs: number = Date.now()
): boolean {
  if (!ehStatusTerminal(status) || !encerradoEmMs) return false;
  const dozeMesesMs = 365 * 24 * 60 * 60 * 1000;
  return agoraMs - encerradoEmMs >= dozeMesesMs;
}

export function formatarMoedaBrl(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

export function formatarDataBr(isoOuDate: string | Date | number | null | undefined): string {
  if (!isoOuDate) return '—';
  const d =
    typeof isoOuDate === 'number'
      ? new Date(isoOuDate)
      : typeof isoOuDate === 'string'
        ? new Date(isoOuDate.length === 10 ? `${isoOuDate}T12:00:00-03:00` : isoOuDate)
        : isoOuDate;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Bahia',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}
