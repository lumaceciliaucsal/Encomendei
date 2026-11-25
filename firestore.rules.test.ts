/**
 * Matriz de validação adversária ("Dirty Dozen") para firestore.rules.
 * Execute contra o Firestore Emulator quando disponível localmente.
 */

export interface DirtyDozenCase {
  id: number;
  nome: string;
  operacao: 'get' | 'list' | 'create' | 'update' | 'delete';
  caminho: string;
  payload?: Record<string, unknown>;
  esperado: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenCase[] = [
  {
    id: 1,
    nome: 'Auto-promoção de plano pelo cliente',
    operacao: 'update',
    caminho: 'artesaos/uidA',
    payload: { plano: 'mestre' },
    esperado: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    nome: 'Manipulação manual do contador de uso mensal',
    operacao: 'update',
    caminho: 'artesaos/uidA',
    payload: { uso: 0, aceitandoPedidos: true },
    esperado: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    nome: 'Reabertura indevida de aceitandoPedidos em perfisPublicos',
    operacao: 'update',
    caminho: 'perfisPublicos/uidA',
    payload: { aceitandoPedidos: true },
    esperado: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    nome: 'Criação direta de pedido sem /api/criar-pedido',
    operacao: 'create',
    caminho: 'artesaos/uidA/pedidos/ped1',
    payload: { status: 'Novo', clienteNome: 'Teste' },
    esperado: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    nome: 'Salto de estado proibido pela RN04 (Novo -> Entregue)',
    operacao: 'update',
    caminho: 'artesaos/uidA/pedidos/ped1',
    payload: { status: 'Entregue' },
    esperado: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    nome: 'Alteração de pedido em estado terminal',
    operacao: 'update',
    caminho: 'artesaos/uidA/pedidos/pedEntregue',
    payload: { notasInternas: 'Tentativa pós-entrega' },
    esperado: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    nome: 'Alteração ou exclusão de evento de histórico',
    operacao: 'update',
    caminho: 'artesaos/uidA/pedidos/ped1/historico/ev1',
    payload: { descricao: 'Alterado' },
    esperado: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    nome: 'Alteração de versão imutável de orçamento',
    operacao: 'update',
    caminho: 'artesaos/uidA/pedidos/ped1/orcamentos/orc1',
    payload: { valorTotal: 1 },
    esperado: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    nome: 'Sobrescrita de slug já existente',
    operacao: 'update',
    caminho: 'slugs/atelie-maria',
    payload: { uid: 'uidB' },
    esperado: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    nome: 'Leitura de pedidos de outro artesão',
    operacao: 'list',
    caminho: 'artesaos/uidB/pedidos',
    esperado: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    nome: 'Shadow field injection em perfisPublicos',
    operacao: 'update',
    caminho: 'perfisPublicos/uidA',
    payload: { isVerified: true },
    esperado: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    nome: 'ID de documento excedendo limite de 128 caracteres',
    operacao: 'create',
    caminho: `artesaos/${'a'.repeat(150)}`,
    payload: { uid: 'a'.repeat(150) },
    esperado: 'PERMISSION_DENIED',
  },
];
