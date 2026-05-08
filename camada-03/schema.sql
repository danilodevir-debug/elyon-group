-- ============================================================
-- ELYON Group · Camada 03 · Gestão Operacional Completa
-- Execute APÓS o schema da Camada 02 já estar aplicado.
-- Pré-requisito: função update_updated_at() deve existir.
-- ============================================================


-- ============================================================
-- SEÇÃO 1 · ENUMS
-- ============================================================

-- Status do ciclo de vida de um projeto
CREATE TYPE projeto_status AS ENUM (
  'planejamento',
  'em_andamento',
  'pausado',
  'concluido',
  'cancelado'
);

-- Status de uma ordem de serviço
CREATE TYPE os_status AS ENUM (
  'pendente',
  'em_andamento',
  'concluida',
  'cancelada'
);

-- Tipos de item financeiro dentro de um projeto
CREATE TYPE item_financeiro_tipo AS ENUM (
  'material',
  'mao_de_obra',
  'equipamento',
  'outro'
);


-- ============================================================
-- SEÇÃO 2 · TABELA: projetos
-- ============================================================

/*
  Representa um projeto contratado (instalação de câmeras, alarme, automação, etc.).
  Pode ou não estar associado a um lead — a FK é nullable para suportar
  projetos originados por outros canais (indicação direta, cliente antigo, etc.).

  Por que desnormalizar cliente_nome / cliente_telefone?
  → O lead pode ser editado ou ter dados corrigidos depois do fechamento.
    Manter uma cópia snapshot no projeto garante que o contrato reflita
    exatamente o cliente conforme acordado, sem depender do dado atual do lead.
*/
CREATE TABLE IF NOT EXISTS projetos (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Vínculo opcional com o lead que originou o projeto
  lead_id                   UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Identificação
  titulo                    TEXT NOT NULL,
  descricao                 TEXT,
  status                    projeto_status NOT NULL DEFAULT 'planejamento',

  -- Linha do tempo
  data_inicio               DATE,
  data_previsao_conclusao   DATE,
  data_conclusao            DATE,

  -- Responsável interno (texto livre por ora — sem FK para auth.users
  -- para não acoplar o schema a um modelo de usuários ainda indefinido)
  responsavel_nome          TEXT,

  -- Financeiro de alto nível (detalhe fica em itens_financeiros)
  valor_proposta            NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Dados desnormalizados do cliente (snapshot no momento do projeto)
  cliente_nome              TEXT,
  cliente_telefone          TEXT,

  -- Localização do serviço
  endereco                  TEXT,

  -- Campo livre para anotações internas
  notas                     TEXT
);

-- Índices para os filtros mais comuns no painel operacional
CREATE INDEX idx_projetos_status     ON projetos(status);
CREATE INDEX idx_projetos_lead_id    ON projetos(lead_id);
CREATE INDEX idx_projetos_created_at ON projetos(created_at DESC);

-- Trigger de updated_at (reutiliza a função criada na Camada 02)
CREATE TRIGGER projetos_updated_at
  BEFORE UPDATE ON projetos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- SEÇÃO 3 · TABELA: ordens_servico
-- ============================================================

/*
  Representa uma visita técnica ou tarefa de campo vinculada a um projeto.
  Um projeto pode ter múltiplas OS (ex: pré-instalação, instalação, vistoria, retorno).

  Por que token_acesso?
  → O técnico de campo frequentemente não tem conta Supabase.
    Em vez de criar usuários temporários, geramos um token UUID único por OS.
    O técnico recebe um link com o token (ex: elyon.app/os?token=<uuid>)
    e consegue consultar a OS e marcar checklist sem precisar de login.
    A policy RLS de SELECT para anon valida esse token via header/claim.
*/
CREATE TABLE IF NOT EXISTS ordens_servico (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Vínculo com o projeto pai (CASCADE: OS some quando projeto é deletado)
  projeto_id              UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Identificação
  titulo                  TEXT NOT NULL,
  descricao               TEXT,
  status                  os_status NOT NULL DEFAULT 'pendente',

  -- Técnico responsável pela execução (texto livre — mesma razão do responsavel_nome)
  tecnico_nome            TEXT,

  -- Linha do tempo
  data_agendada           TIMESTAMPTZ,
  data_inicio_real        TIMESTAMPTZ,
  data_conclusao          TIMESTAMPTZ,   -- preenchido pelo trigger ao concluir

  -- Campo exclusivo do técnico em campo (app mobile ou link de acesso)
  observacoes_tecnico     TEXT,

  -- Token para acesso sem login (ver explicação acima)
  token_acesso            TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT
);

-- Índices para consultas do painel e busca por token
CREATE INDEX idx_os_projeto_id    ON ordens_servico(projeto_id);
CREATE INDEX idx_os_status        ON ordens_servico(status);
CREATE INDEX idx_os_data_agendada ON ordens_servico(data_agendada);
CREATE INDEX idx_os_token         ON ordens_servico(token_acesso);

-- Trigger de updated_at
CREATE TRIGGER ordens_servico_updated_at
  BEFORE UPDATE ON ordens_servico
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------
-- Trigger: preenche data_conclusao automaticamente quando
-- a OS muda para 'concluida' e o campo ainda está nulo.
-- Evita que o frontend precise lembrar de enviar a data.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION os_preenche_conclusao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'concluida'
     AND OLD.status <> 'concluida'
     AND NEW.data_conclusao IS NULL
  THEN
    NEW.data_conclusao = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER os_auto_conclusao
  BEFORE UPDATE ON ordens_servico
  FOR EACH ROW
  EXECUTE FUNCTION os_preenche_conclusao();


-- ============================================================
-- SEÇÃO 4 · TABELA: checklist_items
-- ============================================================

/*
  Itens de checklist vinculados a uma OS.
  O técnico em campo pode marcar itens como concluídos via token (sem login).
  'ordem' permite arrastar e reordenar itens no painel admin.
*/
CREATE TABLE IF NOT EXISTS checklist_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id         UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  descricao     TEXT NOT NULL,
  concluido     BOOLEAN NOT NULL DEFAULT FALSE,
  concluido_em  TIMESTAMPTZ,                -- NULL enquanto pendente
  ordem         INT NOT NULL DEFAULT 0
);

-- Índice para listar itens de uma OS ordenados
CREATE INDEX idx_checklist_os_id ON checklist_items(os_id, ordem);


-- ============================================================
-- SEÇÃO 5 · TABELA: itens_financeiros
-- ============================================================

/*
  Detalhamento de custos de um projeto: materiais comprados,
  equipamentos instalados, horas de mão de obra, etc.

  valor_total é GENERATED ALWAYS AS para garantir consistência:
  nunca haverá divergência entre quantidade * valor_unitario e o total armazenado.
  O frontend deve exibir valor_total, nunca calcular por conta própria.
*/
CREATE TABLE IF NOT EXISTS itens_financeiros (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Vínculo com o projeto (CASCADE: itens somem com o projeto)
  projeto_id      UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,

  -- Classificação do custo
  tipo            item_financeiro_tipo NOT NULL DEFAULT 'outro',

  -- Descrição do item (ex: "Câmera Intelbras VHD 3230 B", "Hora técnico")
  descricao       TEXT NOT NULL,

  -- Quantidade pode ser decimal (ex: 0.5 horas, 1.5 metros de cabo)
  quantidade      NUMERIC(10,3) NOT NULL DEFAULT 1,
  valor_unitario  NUMERIC(12,2) NOT NULL,

  -- Coluna calculada: nunca desincroniza com quantidade/valor_unitario
  valor_total     NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,

  -- Fornecedor opcional para rastreamento de compras
  fornecedor      TEXT
);

-- Índice para somar custos por projeto rapidamente
CREATE INDEX idx_itens_fin_projeto_id ON itens_financeiros(projeto_id);


-- ============================================================
-- SEÇÃO 6 · VIEWS
-- ============================================================

-- ----------------------------------------------------------
-- View: projeto_financeiro_resumo
-- Consolida proposta vs. custo real e calcula margem por projeto.
-- Útil para dashboards financeiros e relatórios de rentabilidade.
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW projeto_financeiro_resumo AS
SELECT
  p.id                                            AS projeto_id,
  p.titulo,
  p.status,
  p.valor_proposta,
  COALESCE(SUM(f.valor_total), 0)                 AS custo_real,
  p.valor_proposta - COALESCE(SUM(f.valor_total), 0) AS margem,
  CASE
    WHEN p.valor_proposta = 0 THEN NULL
    ELSE ROUND(
      (p.valor_proposta - COALESCE(SUM(f.valor_total), 0))
      / p.valor_proposta * 100,
      2
    )
  END                                             AS margem_pct
FROM projetos p
LEFT JOIN itens_financeiros f ON f.projeto_id = p.id
GROUP BY p.id, p.titulo, p.status, p.valor_proposta;

-- Concede leitura apenas para autenticados
GRANT SELECT ON projeto_financeiro_resumo TO authenticated;


-- ----------------------------------------------------------
-- View: projetos_com_os
-- Junta dados do projeto com contagem de OS total e concluídas.
-- Permite o painel listar projetos com indicador de progresso das OS.
-- ----------------------------------------------------------
CREATE OR REPLACE VIEW projetos_com_os AS
SELECT
  p.*,
  COUNT(os.id)                                          AS total_os,
  COUNT(os.id) FILTER (WHERE os.status = 'concluida')   AS os_concluidas
FROM projetos p
LEFT JOIN ordens_servico os ON os.projeto_id = p.id
GROUP BY p.id;

-- Concede leitura apenas para autenticados
GRANT SELECT ON projetos_com_os TO authenticated;


-- ============================================================
-- SEÇÃO 7 · ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilita RLS em todas as novas tabelas
ALTER TABLE projetos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico    ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_financeiros ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------
-- Políticas: projetos
-- Acesso total apenas para usuários autenticados (admin/equipe interna)
-- ----------------------------------------------------------
CREATE POLICY "Authenticated pode ler projetos"
  ON projetos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated pode inserir projetos"
  ON projetos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated pode atualizar projetos"
  ON projetos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated pode deletar projetos"
  ON projetos FOR DELETE
  TO authenticated
  USING (true);


-- ----------------------------------------------------------
-- Políticas: ordens_servico
--
-- Autenticados têm acesso total.
-- Anônimos (técnicos via link) podem LER apenas a OS cujo
-- token_acesso bate com o claim 'token' do JWT/request.
--
-- Como passar o token no Supabase:
--   supabase.rpc('set_config', { key: 'request.jwt.claims', value: JSON.stringify({ token: '<uuid>' }) })
--   OU via query param com Supabase Realtime / custom header no client.
-- Na prática mais simples: a Edge Function valida o token e retorna
-- os dados sem passar pelo RLS de anon. Esta policy é uma segunda
-- camada de segurança caso o client faça queries diretas.
-- ----------------------------------------------------------
CREATE POLICY "Authenticated pode ler OS"
  ON ordens_servico FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated pode inserir OS"
  ON ordens_servico FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated pode atualizar OS"
  ON ordens_servico FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated pode deletar OS"
  ON ordens_servico FOR DELETE
  TO authenticated
  USING (true);

-- Técnico sem login acessa a OS pelo token enviado no header x-os-token
-- O frontend cria um Supabase client com: global.headers['x-os-token'] = token
CREATE POLICY "Anon pode ler OS pelo token"
  ON ordens_servico FOR SELECT
  TO anon
  USING (
    token_acesso = current_setting('request.headers', true)::json->>'x-os-token'
  );


-- ----------------------------------------------------------
-- Políticas: checklist_items
--
-- Autenticados: acesso total.
-- Anônimos (técnico em campo): podem ler e marcar itens como
-- concluídos na OS que possuem o token correto.
-- O JOIN via os_id → ordens_servico valida o token indiretamente.
-- ----------------------------------------------------------
CREATE POLICY "Authenticated pode ler checklist"
  ON checklist_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated pode inserir checklist"
  ON checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated pode atualizar checklist"
  ON checklist_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated pode deletar checklist"
  ON checklist_items FOR DELETE
  TO authenticated
  USING (true);

-- Técnico sem login pode marcar itens da OS que tem o token correto (header x-os-token)
CREATE POLICY "Anon pode atualizar checklist via token"
  ON checklist_items FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM ordens_servico os
      WHERE os.id = checklist_items.os_id
        AND os.token_acesso = current_setting('request.headers', true)::json->>'x-os-token'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ordens_servico os
      WHERE os.id = checklist_items.os_id
        AND os.token_acesso = current_setting('request.headers', true)::json->>'x-os-token'
    )
  );

-- Técnico também precisa ler o checklist para exibir os itens
CREATE POLICY "Anon pode ler checklist via token"
  ON checklist_items FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM ordens_servico os
      WHERE os.id = checklist_items.os_id
        AND os.token_acesso = current_setting('request.headers', true)::json->>'x-os-token'
    )
  );


-- ----------------------------------------------------------
-- Políticas: itens_financeiros
-- Apenas usuários autenticados (dados financeiros são sensíveis)
-- ----------------------------------------------------------
CREATE POLICY "Authenticated pode ler itens financeiros"
  ON itens_financeiros FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated pode inserir itens financeiros"
  ON itens_financeiros FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated pode atualizar itens financeiros"
  ON itens_financeiros FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated pode deletar itens financeiros"
  ON itens_financeiros FOR DELETE
  TO authenticated
  USING (true);


-- ============================================================
-- FIM · ELYON Group · Camada 03
-- ============================================================
