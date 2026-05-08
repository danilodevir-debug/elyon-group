# ELYON Group · Guia de Deploy
**Ordem obrigatória:** Supabase → Z-API → Edge Function → .env → Vercel

---

## ETAPA 1 — Supabase (banco + auth + storage)

### 1.1 Criar o projeto
1. Acesse [supabase.com](https://supabase.com) → **New project**
2. Nome: `elyon-group` | Região: South America (São Paulo)
3. Anote a **senha do banco** — você vai precisar depois
4. Aguarde o projeto ficar ativo (~2 min)

### 1.2 Pegar as chaves
Vá em **Settings → API** e anote:
```
Project URL:  https://XXXXXXXX.supabase.co
anon key:     eyJhbGc...
service_role: eyJhbGc...  ← NUNCA expor no frontend
```

### 1.3 Rodar os schemas (na ordem certa)
Vá em **SQL Editor → New query** e execute cada arquivo abaixo, um por vez:

| Ordem | Arquivo | O que cria |
|-------|---------|------------|
| 1º | `camada-02/schema.sql` | tabela leads, pipeline_resumo |
| 2º | `camada-03/schema.sql` | projetos, ordens_servico, checklist, financeiro |
| 3º | `camada-04/schema.sql` | documentos, chamados, propostas, portal_resumo |

> ⚠️ Se aparecer erro "type already exists" pode ignorar — é o `DO $$ BEGIN` protegendo duplicatas.

### 1.4 Criar usuário admin
**Authentication → Users → Add user → Create new user**
- E-mail: seu e-mail real
- Senha: algo forte (anote bem)

### 1.5 Criar o bucket de Storage
**Storage → New bucket**
- Nome: `elyon-documentos`
- Public: **NÃO** (deixar privado)

Depois vá em **Storage → Policies** e adicione esta policy no bucket `elyon-documentos`:

```sql
-- Admins fazem upload e download
CREATE POLICY "Admins acessam storage"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'elyon-documentos')
WITH CHECK (bucket_id = 'elyon-documentos');
```

---

## ETAPA 2 — Z-API (WhatsApp automático)

1. Acesse [z-api.io](https://z-api.io) → crie conta → **Nova instância**
2. Escaneie o QR Code com o **WhatsApp Business** da ELYON
3. Copie as 3 credenciais da instância:
   ```
   Instance ID:    XXXXXXXX
   Token:          XXXXXXXXXXXXXXXX
   Client Token:   XXXXXXXXXXXXXXXX  (em Segurança)
   ```
4. Defina qual número vai **receber** as notificações de novo lead:
   ```
   Ex: 5511999999999  (DDI + DDD + número, só dígitos)
   ```

---

## ETAPA 3 — Deploy da Edge Function

### 3.1 Instalar o Supabase CLI
```bash
npm install -g supabase
```

### 3.2 Login e link ao projeto
```bash
supabase login
# Vai abrir o browser para autenticar

supabase link --project-ref SEU_PROJECT_ID
# Project ID está em: Supabase → Settings → General
```

### 3.3 Configurar os secrets (chaves seguras — ficam no servidor)
```bash
supabase secrets set ZAPI_INSTANCE_ID=sua_instance_id
supabase secrets set ZAPI_TOKEN=seu_token
supabase secrets set ZAPI_CLIENT_TOKEN=seu_client_token
supabase secrets set ZAPI_RECIPIENT_NUMBER=5511999999999
```

### 3.4 Copiar a Edge Function para o lugar certo
```bash
# Na raiz do seu projeto React:
mkdir -p supabase/functions/novo-lead
cp camada-02/edge-function/index.ts supabase/functions/novo-lead/index.ts
```

### 3.5 Fazer o deploy
```bash
supabase functions deploy novo-lead --no-verify-jwt
```

> ✅ Sucesso: `Function novo-lead deployed.`

---

## ETAPA 4 — Variáveis de ambiente (.env)

Na raiz do projeto React, crie o arquivo `.env`:

```bash
cp camada-02/.env.example .env
```

Preencha com as chaves do Supabase:
```env
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...sua_anon_key
```

> ⚠️ Nunca coloque `service_role` ou chaves Z-API no `.env` do frontend.
> ⚠️ Adicione `.env` no `.gitignore` antes do próximo commit.

---

## ETAPA 5 — Integrar os arquivos ao projeto React

Copie cada arquivo gerado para o seu projeto:

```
camada-02/schema.sql                      → (já executado no Supabase)
camada-02/edge-function/index.ts          → supabase/functions/novo-lead/index.ts
camada-02/src/lib/supabase.ts             → src/lib/supabase.ts
camada-02/src/components/sections/Contato.tsx → src/components/sections/Contato.tsx
camada-02/src/pages/Admin.tsx             → src/pages/Admin.tsx

camada-03/src/pages/Projetos.tsx          → src/pages/Projetos.tsx
camada-03/src/pages/OrdemServico.tsx      → src/pages/OrdemServico.tsx
camada-03/src/components/admin/FinanceiroProjeto.tsx → src/components/admin/FinanceiroProjeto.tsx

camada-04/src/pages/PortalCliente.tsx     → src/pages/PortalCliente.tsx
camada-04/src/pages/AdminChamados.tsx     → src/pages/AdminChamados.tsx
camada-04/src/components/admin/PropostaBuilder.tsx  → src/components/admin/PropostaBuilder.tsx
camada-04/src/components/admin/DocumentosProjeto.tsx → src/components/admin/DocumentosProjeto.tsx

App.tsx                                   → src/App.tsx  (ou raiz do projeto)
vercel.json                               → raiz do projeto
```

### Instalar dependências
```bash
npm install @supabase/supabase-js react-router-dom
```

---

## ETAPA 6 — Testar localmente

```bash
npm run dev
```

| Rota | O que testar |
|------|-------------|
| `/` | Formulário de contato → verificar no Supabase → `leads` se salvou |
| `/admin` | Login com e-mail do Passo 1.4 |
| `/admin/projetos` | Criar projeto → abrir drawer → 4 abas |
| `/admin/chamados` | Lista de chamados de suporte |
| `/os/TOKEN` | Abrir link de OS pelo celular |
| `/portal/TOKEN` | Abrir portal do cliente |

> ⚠️ Para pegar um TOKEN de OS: crie um projeto → crie uma OS → copie o link gerado no drawer.
> ⚠️ Para TOKEN do portal: abra um projeto no drawer → clique no badge amarelo **"Portal"**.

---

## ETAPA 7 — Deploy na Vercel

### 7.1 Subir o código no GitHub
```bash
git add .
git commit -m "feat: ELYON Group sistema completo (camadas 01-04)"
git push origin main
```

### 7.2 Conectar na Vercel
1. Acesse [vercel.com](https://vercel.com) → **Add New Project**
2. Importe o repositório do GitHub
3. Framework: **Vite**
4. Build command: `npm run build` (já é o padrão)
5. Output directory: `dist`

### 7.3 Adicionar variáveis de ambiente na Vercel
**Settings → Environment Variables** → adicione:

| Nome | Valor |
|------|-------|
| `VITE_SUPABASE_URL` | `https://SEU_PROJECT_ID.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` |

### 7.4 Deploy
Clique em **Deploy**. Aguarde ~2 min.

O `vercel.json` já está configurado para funcionar com React Router (rotas como `/portal/TOKEN` não darão 404 no refresh).

---

## ETAPA 8 — Pós-deploy: personalizar dados reais

Abra os arquivos e substitua os placeholders:

| Arquivo | O que alterar |
|---------|---------------|
| `camada-02/src/components/sections/Contato.tsx` | Telefone, e-mail, cidade real da ELYON |
| `Footer.tsx` | Links reais, endereço, redes sociais |
| Contato.tsx linha 299 | `wa.me/5500000000000` → número real do WhatsApp |

---

## Checklist final

- [ ] Schema C02 executado no Supabase
- [ ] Schema C03 executado no Supabase
- [ ] Schema C04 executado no Supabase
- [ ] Usuário admin criado no Supabase Auth
- [ ] Bucket `elyon-documentos` criado (privado)
- [ ] Z-API instância conectada e QR Code escaneado
- [ ] Secrets configurados via `supabase secrets set`
- [ ] Edge Function `novo-lead` deployed
- [ ] `.env` preenchido com URL + anon key
- [ ] `npm install @supabase/supabase-js react-router-dom` executado
- [ ] Testado localmente em todas as rotas
- [ ] Código no GitHub
- [ ] Variáveis de ambiente na Vercel
- [ ] Deploy na Vercel concluído
- [ ] Formulário de contato testado em produção (verificar WhatsApp + Supabase)

---

## Arquitetura completa do sistema

```
[Site /]              → formulário → Edge Function → Supabase + Z-API WhatsApp
[Admin /admin]        → pipeline de leads (Kanban)
[Admin /admin/projetos] → projetos com 4 abas: Operacional | Financeiro | Proposta | Docs
[Admin /admin/chamados] → fila de suporte com filtros e drawer
[Técnico /os/:token]  → OS mobile-first sem login (checklist + observações)
[Cliente /portal/:token] → portal sem login: Projeto | Proposta | Docs | Suporte
```
