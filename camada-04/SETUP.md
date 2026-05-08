# ELYON Group · Camada 04 — Guia de Setup

Portal do cliente (token, sem login), propostas online, documentos e chamados de suporte.

---

## Pré-requisito

Camadas 02 e 03 já configuradas (Supabase, React Router, variáveis .env, tabela `projetos` existente).

---

## Passo 1 — Executar o schema no Supabase

1. No Supabase, vá em **SQL Editor**
2. Cole todo o conteúdo de `camada-04/schema.sql`
3. Clique em **Run**

O script cria/altera:
- `ALTER TABLE projetos ADD cliente_token` — token único para acesso do cliente
- Enums: `documento_tipo`, `chamado_status`, `chamado_prioridade`, `chamado_categoria`, `proposta_status`
- Tabelas: `documentos`, `chamados_suporte`, `propostas_online`, `itens_proposta`
- View: `portal_resumo` (dados consolidados para o portal)
- RLS via header `x-cliente-token`: cliente acessa apenas seus dados
- Coluna calculada: `tempo_resposta_horas` (GENERATED ALWAYS)
- Trigger: proposta marcada como `visualizada` no primeiro acesso

---

## Passo 2 — Criar o bucket de Storage

1. No Supabase, vá em **Storage**
2. Crie um bucket chamado `elyon-documentos`
3. Deixe como **privado** (Private)
4. As políticas de acesso são criadas automaticamente pelo `schema.sql`

> Documentos são acessados via URLs assinadas (1 ano de validade), nunca expostos diretamente.

---

## Passo 3 — Mover os arquivos para o projeto

| Arquivo gerado                                              | Destino no projeto                                          |
|-------------------------------------------------------------|-------------------------------------------------------------|
| `camada-04/schema.sql`                                      | Executar no Supabase SQL Editor                             |
| `camada-04/src/pages/PortalCliente.tsx`                     | `src/pages/PortalCliente.tsx`                               |
| `camada-04/src/pages/AdminChamados.tsx`                     | `src/pages/AdminChamados.tsx`                               |
| `camada-04/src/components/admin/PropostaBuilder.tsx`        | `src/components/admin/PropostaBuilder.tsx`                  |
| `camada-04/src/components/admin/DocumentosProjeto.tsx`      | `src/components/admin/DocumentosProjeto.tsx`                |

---

## Passo 4 — Adicionar as rotas no App.tsx

```tsx
import { PortalCliente }   from "@/pages/PortalCliente";
import { AdminChamados }   from "@/pages/AdminChamados";

// Dentro do <Routes>:
<Route path="/portal/:token"   element={<PortalCliente />} />
<Route path="/admin/chamados"  element={<AdminChamados />} />
```

> A rota `/portal/:token` é pública — sem autenticação.
> O cliente acessa pelo link gerado no painel de projetos (via `cliente_token`).

---

## Passo 5 — Integrar componentes no ProjetoDrawer (Camada 03)

Nos drawers de projeto em `Projetos.tsx`, importe e use os novos componentes:

```tsx
import { PropostaBuilder }    from "@/components/admin/PropostaBuilder";
import { DocumentosProjeto }  from "@/components/admin/DocumentosProjeto";
import { FinanceiroProjeto }  from "@/components/admin/FinanceiroProjeto";

// Dentro do ProjetoDrawer, adicione tabs:
// Tab "Financeiro"  → <FinanceiroProjeto projetoId={projeto.id} valorProposta={projeto.valor_proposta} />
// Tab "Proposta"    → <PropostaBuilder projetoId={projeto.id} projetoTitulo={projeto.titulo} clienteNome={projeto.cliente_nome} clienteToken={projeto.cliente_token} />
// Tab "Documentos"  → <DocumentosProjeto projetoId={projeto.id} />
```

---

## Passo 6 — Adicionar link de Chamados no Admin

No `Admin.tsx` (Camada 02) ou no header do sistema:

```tsx
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();

<button onClick={() => navigate("/admin/chamados")}
  className="px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:border-primary-glow/40 transition-colors">
  Chamados
</button>
```

---

## Passo 7 — Testar

### Portal do cliente:
1. No Supabase, abra um projeto e copie o `cliente_token`
2. Acesse `/portal/SEU_TOKEN`
3. Verifique as 4 abas: Projeto, Proposta, Documentos, Suporte

### Proposta online:
1. Em `/admin/projetos`, abra um projeto → aba Proposta
2. Crie uma proposta com o PropostaBuilder
3. Copie o link do portal e acesse pelo cliente
4. Cliente aprova ou rejeita — verifique status no admin

### Documentos:
1. Em `/admin/projetos`, abra um projeto → aba Documentos
2. Faça upload de um arquivo (arrastar ou clicar)
3. Verifique no Storage → `elyon-documentos`
4. Acesse o portal do cliente e veja o documento listado

### Chamados de suporte:
1. Acesse `/portal/TOKEN` → aba Suporte → abra um chamado
2. Acesse `/admin/chamados` → veja o chamado na fila
3. Responda e encerre pelo drawer

---

## Arquitetura do fluxo

```
[Admin /admin/projetos]
        │
   Cria proposta (PropostaBuilder)
   Faz upload de docs (DocumentosProjeto)
   Gera link do portal → /portal/:cliente_token
        │
   Compartilha link com cliente
        │
[Cliente /portal/:token — sem login]
   ┌────────────────────────────────────┐
   │  Aba Projeto   → timeline + OS     │
   │  Aba Proposta  → aprova/rejeita    │
   │  Aba Docs      → download          │
   │  Aba Suporte   → abre chamado      │
   └────────────────────────────────────┘
        │
[Admin /admin/chamados]
        │
   Filtra → responde → encerra
```

---

## Como funciona o acesso sem login do cliente

O `PortalCliente.tsx` cria um client Supabase com header customizado:

```ts
function makePortalClient(token: string) {
  return createClient(url, anonKey, {
    global: {
      headers: { "x-cliente-token": token },
    },
  });
}
```

O Supabase RLS valida o token em cada query:

```sql
CREATE POLICY "Cliente acessa pelo token" ON projetos
  FOR SELECT USING (
    cliente_token = current_setting('request.headers', true)::json->>'x-cliente-token'
  );
```

---

## Custos estimados (além das Camadas 02 e 03)

| Recurso          | Impacto                                        |
|------------------|------------------------------------------------|
| Supabase DB      | ~4 tabelas extras, dentro do plano gratuito    |
| Supabase Storage | 1 GB gratuito (plano free), ~$0.021/GB depois  |
| Edge Functions   | Nenhuma nova nesta camada                      |
| Z-API            | Já configurado na Camada 02                    |
