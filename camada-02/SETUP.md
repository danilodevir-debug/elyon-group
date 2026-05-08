# ELYON Group · Camada 02 — Guia de Setup

Pipeline de leads com Supabase + WhatsApp automático (Z-API) + Painel Admin.

---

## Passo 1 — Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Clique em **New project** → escolha um nome (ex: `elyon-group`)
3. Anote a **URL do projeto** e a **anon key** (Settings → API)

---

## Passo 2 — Criar o banco de dados

1. No Supabase, vá em **SQL Editor**
2. Cole todo o conteúdo de `schema.sql`
3. Clique em **Run** — a tabela `leads`, as policies e a view serão criadas

---

## Passo 3 — Criar usuário admin

1. No Supabase, vá em **Authentication → Users**
2. Clique em **Add user** → **Create new user**
3. Coloque o e-mail e senha que você vai usar para fazer login no painel admin
4. ⚠️ Guarde bem a senha — não tem recuperação automática configurada ainda

---

## Passo 4 — Instalar o Supabase CLI e fazer deploy da Edge Function

```bash
# Instalar o CLI (se ainda não tiver)
npm install -g supabase

# Fazer login
supabase login

# Linkar ao seu projeto (use o Project ID do Supabase Dashboard)
supabase link --project-ref SEU_PROJECT_ID

# Configurar os secrets da Edge Function (chaves que ficam no servidor)
supabase secrets set ZAPI_INSTANCE_ID=sua_instance_id
supabase secrets set ZAPI_TOKEN=seu_token
supabase secrets set ZAPI_CLIENT_TOKEN=seu_client_token
supabase secrets set ZAPI_RECIPIENT_NUMBER=5511999999999

# Deploy da Edge Function
supabase functions deploy novo-lead --no-verify-jwt
```

> **Por que `--no-verify-jwt`?** O formulário público não tem usuário logado,
> então não manda JWT. A função valida os dados internamente.

---

## Passo 5 — Configurar o Z-API (WhatsApp)

1. Acesse [z-api.io](https://z-api.io) e crie uma conta
2. Crie uma nova instância e conecte seu WhatsApp Business escaneando o QR Code
3. Copie o **Instance ID**, **Token** e **Client Token**
4. Use esses valores nos `supabase secrets set` do Passo 4
5. Configure `ZAPI_RECIPIENT_NUMBER` com o número do WhatsApp da ELYON que vai RECEBER as notificações (ex: `5511999999999` — DDI + DDD + número, sem espaços)

---

## Passo 6 — Configurar variáveis no projeto React

1. Copie `.env.example` para `.env` na raiz do projeto:
   ```bash
   cp camada-02/.env.example .env
   ```
2. Preencha:
   ```
   VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
   ```

---

## Passo 7 — Instalar dependências e configurar rotas

```bash
# Instalar o cliente Supabase no projeto
npm install @supabase/supabase-js
```

No seu `App.tsx` (ou equivalente de roteamento), adicione a rota `/admin`:

```tsx
// Se estiver usando React Router v6:
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Admin } from "@/pages/Admin";

// Dentro do App:
<BrowserRouter>
  <Routes>
    <Route path="/" element={<MainLayout />} />
    <Route path="/admin" element={<Admin />} />
  </Routes>
</BrowserRouter>
```

Se não usa React Router, instale:
```bash
npm install react-router-dom
```

---

## Passo 8 — Mover os arquivos para o projeto

| Arquivo gerado                          | Destino no projeto                        |
|-----------------------------------------|-------------------------------------------|
| `camada-02/schema.sql`                  | Executar no Supabase SQL Editor           |
| `camada-02/edge-function/index.ts`      | `supabase/functions/novo-lead/index.ts`   |
| `camada-02/src/lib/supabase.ts`         | `src/lib/supabase.ts`                     |
| `camada-02/src/components/sections/Contato.tsx` | `src/components/sections/Contato.tsx` |
| `camada-02/src/pages/Admin.tsx`         | `src/pages/Admin.tsx`                     |

---

## Passo 9 — Testar

1. `npm run dev`
2. Acesse o site e submeta o formulário de contato
3. Verifique no Supabase → Table Editor → `leads` se o lead foi salvo
4. Verifique se chegou a mensagem no WhatsApp da ELYON
5. Acesse `/admin` → faça login com o usuário criado no Passo 3
6. Veja o lead no pipeline e teste mover de status

---

## Arquitetura do fluxo

```
[Formulário] → POST → [Edge Function: novo-lead]
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
             [Supabase DB]          [Z-API → WhatsApp]
             (salva lead)        (notifica equipe ELYON)
                    │
                    ▼
             [Admin Panel /admin]
             (visualiza e gerencia pipeline)
```

---

## Custos estimados

| Serviço      | Plano gratuito                      | Quando pagar       |
|--------------|-------------------------------------|--------------------|
| Supabase     | 500 MB DB, 500k Edge Function calls | Volume alto        |
| Z-API        | R$ 65/mês (sem tier gratuito)       | Desde o início     |
| Vercel/Netlify | Gratuito para frontend estático   | Nunca (plano hobby)|

> **Alternativa gratuita ao Z-API:** configure o formulário para enviar e-mail
> via [Resend](https://resend.com) (10.000 e-mails/mês grátis) e use o link
> `wa.me` do formulário como notificação manual.
