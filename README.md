# FAC SPP — Fichas Digitais
## Acampamento São Padre Pio · Arquidiocese de Florianópolis

---

## Estrutura do projeto

```
fac-spp/
├── worker/          ← Cloudflare Worker (API/backend)
│   ├── src/
│   │   ├── index.ts              (roteador principal)
│   │   ├── types.ts              (tipos TypeScript)
│   │   ├── supabase.ts           (cliente Supabase)
│   │   ├── helpers.ts            (utilitários)
│   │   └── routes/
│   │       ├── public.ts         (rotas públicas)
│   │       ├── admin.ts          (rotas protegidas)
│   │       └── waha.ts           (webhook WhatsApp)
│   ├── wrangler.toml
│   └── package.json
│
└── frontend/        ← Astro + React (Cloudflare Pages)
    ├── src/
    │   ├── pages/
    │   │   ├── index.astro       (hero/home)
    │   │   ├── preencher.astro   (formulário)
    │   │   ├── consultar.astro   (consulta ficha)
    │   │   └── admin/
    │   │       ├── index.astro   (login)
    │   │       ├── editor.astro  (editor formulário)
    │   │       ├── fichas.astro  (tabela fichas)
    │   │       └── gerar.astro   (gerar lotes)
    │   ├── components/
    │   │   └── AcessoFicha.tsx   (+ outros a construir)
    │   └── lib/
    │       ├── api.ts            (cliente da API)
    │       └── types.ts          (tipos compartilhados)
    ├── astro.config.mjs
    └── package.json
```

---

## Setup do Worker (backend)

### 1. Instalar dependências
```bash
cd worker
npm install
```

### 2. Login no Cloudflare
```bash
npx wrangler login
```

### 3. Configurar segredos
```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put WAHA_URL          # ex: https://waha-xxx.up.railway.app
npx wrangler secret put WAHA_WEBHOOK_SECRET
```

### 4. Desenvolvimento local
```bash
npm run dev
# Worker disponível em http://localhost:8787
```

### 5. Deploy
```bash
npm run deploy
# URL: https://fac-spp-api.SEU-USUARIO.workers.dev
```

---

## Setup do Frontend (Astro)

### 1. Instalar dependências
```bash
cd frontend
npm install
```

### 2. Variável de ambiente
Crie o arquivo `.env`:
```env
PUBLIC_API_URL=https://fac-spp-api.SEU-USUARIO.workers.dev
```

Para desenvolvimento local com o Worker rodando:
```env
PUBLIC_API_URL=http://localhost:8787
```

### 3. Desenvolvimento local
```bash
npm run dev
# Frontend em http://localhost:4321
```

### 4. Deploy no Cloudflare Pages
1. Suba o projeto no GitHub
2. Acesse [pages.cloudflare.com](https://pages.cloudflare.com)
3. Conecte o repositório → selecione a pasta `frontend`
4. Build command: `npm run build`
5. Build output: `dist`
6. Variável de ambiente: `PUBLIC_API_URL=https://fac-spp-api.SEU-USUARIO.workers.dev`

---

## Rotas da API

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/form-config` | — | Config do formulário |
| POST | `/api/validar-ficha` | — | Valida número + contra-senha |
| POST | `/api/enviar-ficha` | — | Envia ficha preenchida |
| GET | `/api/consultar` | — | Consulta ficha |
| POST | `/api/admin/login` | — | Login admin |
| GET | `/api/admin/fichas` | ✅ | Lista fichas |
| POST | `/api/admin/gerar-lote` | ✅ | Gera lote |
| GET | `/api/admin/ficha/:id` | ✅ | Detalhes ficha |
| DELETE | `/api/admin/ficha/:id` | ✅ | Exclui ficha |
| GET | `/api/admin/form-config` | ✅ | Config (admin) |
| POST | `/api/admin/form-config` | ✅ | Salva config |
| POST | `/api/waha/webhook` | secret | Webhook WhatsApp |

---

## Segurança

- ✅ Credenciais do Supabase **nunca** chegam ao frontend
- ✅ Service Role Key apenas no Worker (variáveis secretas do Cloudflare)
- ✅ Rotas admin protegidas por Bearer token
- ✅ Webhook do Waha protegido por secret header
- ✅ CORS configurado para aceitar apenas o domínio do frontend

---

## Banco de dados (Supabase)

Projeto: `acampamento-fac-spp` (epwetlpudffpwqvxxfiu)

Tabelas principais:
- `fichas` — fichas dos participantes
- `respostas` — respostas dinâmicas do formulário
- `documentos_responsavel` — foto do doc + assinatura
- `form_config` — configuração do formulário (editável pelo admin)
