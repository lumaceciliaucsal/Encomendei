# Especificação de Segurança — Ateliê Sob Medida

## 1. Invariantes de Dados
1. **Isolamento de PII**: Dados de contato do artesão (`email`, `telefone`) e dados do cliente nos pedidos (`clienteNome`, `clienteEmail`, `clienteWhatsApp`) residem exclusivamente em `/artesaos/{uid}` e `/artesaos/{uid}/pedidos/{pedidoId}` (leitura restrita a `request.auth.uid == uid`). `/perfisPublicos/{uid}` nunca contém PII.
2. **Criação exclusiva no servidor**: Nenhum cliente (anônimo ou autenticado) pode criar diretamente documentos em `/artesaos/{uid}/pedidos/{pedidoId}`, `/artesaos/{uid}/pedidos/{pedidoId}/imagens/{imagemId}` ou `/artesaos/{uid}/uso/{mesId}` via SDK web. Essas coleções são escritas apenas pelas rotas `/api` com `firebase-admin`.
3. **Campos protegidos de plano e cota**: O artesão autenticado não pode alterar `plano`, `aceitandoPedidos`, `uso` ou `mesReferencia` em `/artesaos/{uid}` nem `aceitandoPedidos` em `/perfisPublicos/{uid}`.
4. **Unicidade e imutabilidade de slug**: `/slugs/{slug}` não permite `update`, não aceita slugs reservados e exige `!exists(/slugs/$(slug))` na criação com `uid == request.auth.uid`.
5. **Máquina de estados e travamento terminal (RN04)**: Mudanças de status em pedidos só permitem transições válidas da RN04. Pedidos em estado terminal (`Entregue`, `Recusado`, `Cancelado`) não aceitam mais atualizações via cliente.
6. **Imutabilidade de auditoria e versões**: `/historico/{eventoId}` e `/orcamentos/{orcamentoId}` são estritamente append-only (somente criação pelo dono; `update` e `delete` sempre negados).

## 2. Payloads "Dirty Dozen" (Devem resultar em PERMISSION_DENIED)
1. **Auto-promoção de plano**: `update` em `/artesaos/{uid}` alterando `plano: "mestre"`.
2. **Manipulação de cota**: `update` em `/artesaos/{uid}` alterando `uso: 0` ou `aceitandoPedidos: true`.
3. **Reabertura de limite público**: `update` em `/perfisPublicos/{uid}` alterando `aceitandoPedidos: true` após bloqueio do servidor.
4. **Criação direta de pedido pelo cliente**: `create` em `/artesaos/{uid}/pedidos/ped-1` via SDK web sem passar por `/api/criar-pedido`.
5. **Salto de estado no Kanban (RN04)**: `update` em `/artesaos/{uid}/pedidos/{id}` mudando `status` de `"Novo"` diretamente para `"Entregue"`.
6. **Alteração após estado terminal**: `update` em `/artesaos/{uid}/pedidos/{id}` quando `resource.data.status == "Entregue"`.
7. **Edição ou exclusão de histórico**: `update` ou `delete` em `/artesaos/{uid}/pedidos/{id}/historico/{evId}`.
8. **Edição de versão de orçamento**: `update` em `/artesaos/{uid}/pedidos/{id}/orcamentos/{orcId}`.
9. **Sequestro ou sobrescrita de slug**: `create` ou `update` em `/slugs/ceramica-maria` pertencente a outro usuário.
10. **Leitura de pedidos de outro artesão**: `get` ou `list` em `/artesaos/{outroUid}/pedidos` autenticado como `uidA`.
11. **Shadow Field Injection**: `create` ou `update` em `/perfisPublicos/{uid}` injetando campo não autorizado `isVerified: true`.
12. **Timestamp falsificado e ID gigante**: `create` em `/artesaos/{uid}` com `criadoEm` no passado ou `uid` com mais de 128 caracteres.
