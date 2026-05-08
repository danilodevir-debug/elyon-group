# ELYON Group · Camada 03 — Guia de Setup

Gestão de projetos, ordens de serviço para técnicos (mobile, sem login) e módulo financeiro por projeto.

---

## Pré-requisito

Camada 02 já configurada (Supabase, CLI, React Router, variáveis .env).

---

## Passo 1 — Executar o schema no Supabase

1. No Supabase, vá em **SQL Editor**
2. Cole todo o conteúdo de `camada-03/schema.sql`
3. Clique em **Run**

O script cria:
- Enums: `projeto_status`, `os_status`, `item_financeiro_tipo`
- Tabelas: `projetos`, `ordens_servico`, `checklist_items`, `itens_financeiros`
- Views: `projeto_financeiro_resumo`, `projetos_com_os`
- RLS: admin (autenticado) gerencia tudo; técnico acessa OS pelo `token_acesso`
- Trigger: `data_conclusao` auto-preenchida quando OS → `concluida`

---

## Passo 2 — Mover os arquivos para o projeto

| Arquivo gerado                                          | Destino no projeto                                          |
|---------------------------------------------------------|-------------------------------------------------------------|
| `camada-03/schema.sql`                                  | Executar no Supabase SQL Editor                             |
| `camada-03/src/pages/Projetos.tsx`                      | `src/pages/Projetos.tsx`                                    |
| `camada-03/src/pages/OrdemServico.tsx`                  | `src/pages/OrdemServico.tsx`                                |
| `camada-03/src/components/admin/FinanceiroProjeto.tsx`  | `src/components/admin/FinanceiroProjeto.tsx`                |

---

## Passo 3 — Adicionar as rotas no App.tsx

```tsx
import { Projetos }      from "@/pages/Projetos";
import { OrdemServico }  from "@/pages/OrdemServico";

// Dentro do <Routes>:
<Route path="/admin/projetos" element={<Projetos />} />
<Route path="/os/:token"      element={<OrdemServico />} />
```

> A rota `/os/:token` é pública — sem autenticação.
> O técnico acessa pelo link gerado no painel de projetos.

---

## Passo 4 — Adicionar link de navegação no Admin

No `Admin.tsx` (Camada 02), adicione o botão de navegação para Projetos:

```tsx
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();

// No header do painel:
<button onClick={() => navigate("/admin/projetos")}
  className="px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:border-primary-glow/40 transition-colors">
  Projetos
</button>
```

---

## Passo 5 — Testar

1. `npm run dev`
2. Acesse `/admin/projetos` → faça login se necessário
3. Crie um novo projeto pelo modal **"+ Novo Projeto"**
4. Dentro do projeto, crie uma Ordem de Serviço
5. Copie o link de OS gerado (ex: `/os/TOKEN`)
6. Abra o link em um celular — verifique o checklist touch-friendly
7. Marque todos os itens e clique em **Concluir OS**
8. Verifique no Supabase → `ordens_servico` que `data_conclusao` foi preenchida automaticamente

---

## Arquitetura do fluxo

```
[Admin /admin/projetos]
        │
   Cria Projeto
        │
   Cria OS → gera token_acesso único
        │
   Compartilha link /os/:token com técnico
        │
[Técnico /os/:token — sem login]
        │
   Marca checklist (auto-save 2s)
        │
   Conclui OS → trigger atualiza data_conclusao
        │
[Admin — módulo financeiro]
        │
   Adiciona itens de custo
        │
   View calcula margem em tempo real
```

---

## Como funciona o acesso sem login do técnico

O Supabase RLS usa o `token_acesso` da URL para liberar acesso à OS específica:

```sql
-- Policy na tabela ordens_servico:
CREATE POLICY "Técnico acessa OS pelo token" ON ordens_servico
  FOR SELECT USING (
    token_acesso = current_setting('request.headers', true)::json->>'x-os-token'
    -- OU via query param na URL (configurado no supabase.ts)
  );
```

O frontend cria um client Supabase temporário que injeta o token no header de cada request.

---

## Custos estimados (além da Camada 02)

| Recurso          | Impacto                                      |
|------------------|----------------------------------------------|
| Supabase DB      | ~3-5 tabelas extras, dentro do plano gratuito |
| Edge Functions   | Nenhuma nova nesta camada                    |
| Storage          | Não usado nesta camada (vem na Camada 04)    |
