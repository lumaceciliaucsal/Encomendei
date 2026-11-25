# Ofício & Medida — Plataforma para Artesãos Sob Medida

Aplicação full-stack para ateliês artesanais com página pública (`/a/:slug`), captação de pedidos com consentimento LGPD sem necessidade de conta para o cliente, compressão de imagens no navegador (Opção B sem Storage), calculadora de precificação versionada e painel Kanban protegido por Firestore Security Rules.

## Estrutura do Projeto

- `/src` — Front-end React + TypeScript + Vite + Tailwind CSS + React Router
  - `/src/lib/firebase.ts` — Inicialização do Firebase Web SDK (`Auth` + `Firestore` com `databaseId`) e tratamento estruturado de erros
  - `/src/lib/regras.ts` — Funções puras para regras de negócio (`RN01` a `RN10`) e calculadora de precificação
  - `/src/lib/imagens.ts` — Compressão de imagens no navegador (máx. 1280px, qualidade 0.7)
- `/api` — Funções Serverless da Vercel (`firebase-admin` apenas no servidor)
  - `POST /api/criar-pedido` — Valida campos, consentimento LGPD (`RN03`), imagens (`RN09`), verifica cota mensal (`America/Bahia`, `RN01`/`RN06`) em transação e grava pedido
  - `GET /api/pagina/[slug]` — Retorna perfil público (sem PII) e portfólio do ateliê
  - `POST /api/excluir-conta` — Verifica token Bearer e apaga dados, imagens, slug e usuário do Firebase Auth
  - `GET /api/cron/expurgo` — Rotina diária LGPD (`RN10`) para anonimizar pedidos encerrados há mais de 12 meses
  - `POST /api/notificar-pedido` — Envio opcional de aviso por e-mail via Resend
- `firestore.rules` e `firestore.indexes.json` — Regras de segurança e índices compostos do Cloud Firestore
- `vercel.json` — Rewrites de SPA e agendamento do cron diário (`/api/cron/expurgo`)

## Configuração no Firebase Console

1. **Região do Firestore**: Certifique-se de que o banco Firestore foi criado na região `southamerica-east1`.
2. **Authentication**: No Firebase Console, abra **Authentication → Sign-in method** e ative:
   - **E-mail/senha** (obrigatório para cadastro/login/recuperação de senha)
   - **Google** (opcional, já habilitado para login rápido)
3. **Regras e Índices**:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

## Deploy na Vercel via GitHub

1. Envie o repositório para o GitHub.
2. Importe o repositório na **Vercel** (Framework Preset: **Vite**).
3. Configure as variáveis de ambiente na Vercel (conforme `.env.example`):
   - **Servidor (`/api` — nunca prefixar com `VITE_`)**:
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_CLIENT_EMAIL`
     - `FIREBASE_PRIVATE_KEY` (mantenha as quebras `\n` da chave privada da conta de serviço)
     - `FIREBASE_DATABASE_ID` (se usar banco nomeado, caso contrário `(default)`)
     - `CRON_SECRET` (segredo aleatório para proteger o Vercel Cron `/api/cron/expurgo`)
     - `RESEND_API_KEY` e `RESEND_FROM_EMAIL` (opcionais para e-mails transacionais)
   - **Front-end público (`VITE_FIREBASE_*`)**:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
     - `VITE_FIREBASE_DATABASE_ID`
4. Faça o deploy. O arquivo `vercel.json` redireciona todas as rotas do SPA para `index.html` (preservando `/api/*`) e agenda o cron diário de expurgo LGPD às 03:00 UTC.
