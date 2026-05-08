-- =============================================================================
-- ELYON GROUP — Camada 04: Portal do Cliente, Documentos, Chamados e Propostas
-- =============================================================================
-- Depende de:
--   Camada 02: tabela `leads`, enum `lead_status`
--   Camada 03: tabelas `projetos`, `ordens_servico`, `checklist_items`,
--              `itens_financeiros`, função `update_updated_at()`
-- =============================================================================


-- =============================================================================
-- SEÇÃO 1: CLIENTE TOKEN — link único de acesso ao portal sem login
-- =============================================================================

-- Cada projeto ganha um token UUID único que o cliente usa para acessar
-- o portal sem precisar de conta. Esse token vai na URL do frontend.
ALTER TABLE projetos
  ADD COLUMN IF NOT EXISTS cliente_token TEXT UNIQUE NOT NULL
    DEFAULT gen_random_uuid()::text;

COMMENT ON COLUMN projetos.cliente_token IS
  'Token UUID único por projeto. Usado como chave de acesso ao portal do cliente sem login. Enviar no header x-cliente-token.';


-- =============================================================================
-- SEÇÃO 2: ENUM — tipo de documento
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE documento_tipo AS ENUM (
    'manual',
    'planta',
    'certificado',
    'garantia',
    'relatorio',
    'foto',
    'outro'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE documento_tipo IS
  'Classifica o tipo de documento vinculado a um projeto ELYON.';


-- =============================================================================
-- SEÇÃO 3: TABELA — documentos
-- =============================================================================

-- Armazena metadados dos arquivos enviados para o Supabase Storage.
-- O arquivo físico fica no bucket `elyon-documentos`; aqui ficam os metadados.
CREATE TABLE IF NOT EXISTS documentos (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Referência ao projeto
  projeto_id      UUID          NOT NULL
                    REFERENCES projetos(id) ON DELETE CASCADE,

  -- Informações do documento
  titulo          TEXT          NOT NULL,
  descricao       TEXT,
  tipo            documento_tipo NOT NULL DEFAULT 'outro',

  -- Localização no Storage
  -- Padrão de path: "projetos/<projeto_id>/<nome_arquivo>"
  storage_path    TEXT          NOT NULL,
  url_publica     TEXT,           -- URL pública ou signed URL cacheada pelo backend

  -- Metadados do arquivo
  tamanho_bytes   BIGINT,
  mime_type       TEXT,

  -- Controle de visibilidade
  visivel_cliente BOOLEAN       NOT NULL DEFAULT true,

  -- Auditoria
  criado_por_nome TEXT            -- Nome do admin que fez o upload
);

COMMENT ON TABLE documentos IS
  'Metadados dos documentos vinculados a projetos. O arquivo físico reside no bucket elyon-documentos do Supabase Storage.';
COMMENT ON COLUMN documentos.storage_path IS
  'Caminho relativo no bucket elyon-documentos. Ex: projetos/uuid/manual.pdf';
COMMENT ON COLUMN documentos.url_publica IS
  'URL pública ou signed URL cacheada. Renovar periodicamente via backend se o bucket for privado.';
COMMENT ON COLUMN documentos.visivel_cliente IS
  'Se false, o documento é interno (visível só para autenticados). Se true, aparece no portal do cliente.';

-- Índice composto para busca por projeto filtrando visibilidade
CREATE INDEX IF NOT EXISTS idx_documentos_projeto_visivel
  ON documentos (projeto_id, visivel_cliente);


-- =============================================================================
-- SEÇÃO 4: ENUMS — chamados de suporte
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE chamado_status AS ENUM (
    'aberto',
    'em_analise',
    'aguardando_cliente',
    'resolvido',
    'fechado'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE chamado_prioridade AS ENUM (
    'baixa',
    'media',
    'alta',
    'urgente'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE chamado_categoria AS ENUM (
    'manutencao',
    'camera_cftv',
    'rede_conectividade',
    'automacao',
    'audio',
    'outro'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE chamado_status     IS 'Ciclo de vida de um chamado de suporte ELYON.';
COMMENT ON TYPE chamado_prioridade IS 'Nível de urgência do chamado.';
COMMENT ON TYPE chamado_categoria  IS 'Área técnica do chamado de suporte.';


-- =============================================================================
-- SEÇÃO 5: TABELA — chamados_suporte
-- =============================================================================

CREATE TABLE IF NOT EXISTS chamados_suporte (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ       NOT NULL DEFAULT now(),

  -- Referência ao projeto
  projeto_id            UUID              NOT NULL
                          REFERENCES projetos(id) ON DELETE CASCADE,

  -- Dados do chamado
  titulo                TEXT              NOT NULL,
  descricao             TEXT              NOT NULL,
  status                chamado_status    NOT NULL DEFAULT 'aberto',
  prioridade            chamado_prioridade NOT NULL DEFAULT 'media',
  categoria             chamado_categoria NOT NULL DEFAULT 'outro',

  -- Rastreamento de origem
  aberto_por_nome       TEXT,             -- Nome de quem abriu (cliente ou admin)

  -- Resposta do suporte
  resposta_admin        TEXT,
  respondido_por_nome   TEXT,
  respondido_em         TIMESTAMPTZ,

  -- Resolução
  resolvido_em          TIMESTAMPTZ,      -- Preenchido automaticamente pelo trigger ao status → resolvido

  -- Coluna calculada: horas até primeira resposta (null se ainda não respondido)
  tempo_resposta_horas  NUMERIC(6,2)
    GENERATED ALWAYS AS (
      EXTRACT(EPOCH FROM (respondido_em - created_at)) / 3600
    ) STORED
);

COMMENT ON TABLE chamados_suporte IS
  'Chamados de suporte técnico vinculados a projetos. Podem ser abertos pelo cliente (via portal) ou pelo admin.';
COMMENT ON COLUMN chamados_suporte.tempo_resposta_horas IS
  'Calculado automaticamente: horas entre abertura e primeira resposta. NULL se ainda sem resposta.';
COMMENT ON COLUMN chamados_suporte.resolvido_em IS
  'Preenchido automaticamente pelo trigger trg_chamado_resolvido_em quando status muda para resolvido.';

-- Índices para filtros e listagens frequentes
CREATE INDEX IF NOT EXISTS idx_chamados_projeto_id
  ON chamados_suporte (projeto_id);

CREATE INDEX IF NOT EXISTS idx_chamados_status
  ON chamados_suporte (status);

CREATE INDEX IF NOT EXISTS idx_chamados_prioridade
  ON chamados_suporte (prioridade);

CREATE INDEX IF NOT EXISTS idx_chamados_created_at
  ON chamados_suporte (created_at DESC);

-- Trigger: atualiza updated_at automaticamente
CREATE TRIGGER trg_chamados_suporte_updated_at
  BEFORE UPDATE ON chamados_suporte
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Função: preenche resolvido_em quando status muda para 'resolvido'
CREATE OR REPLACE FUNCTION set_chamado_resolvido_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Só preenche na primeira vez que o status chega em 'resolvido'
  IF NEW.status = 'resolvido' AND OLD.status <> 'resolvido' THEN
    IF NEW.resolvido_em IS NULL THEN
      NEW.resolvido_em := NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_chamado_resolvido_em() IS
  'Preenche resolvido_em com o timestamp atual na primeira vez que o chamado entra no status resolvido.';

CREATE TRIGGER trg_chamado_resolvido_em
  BEFORE UPDATE ON chamados_suporte
  FOR EACH ROW EXECUTE FUNCTION set_chamado_resolvido_em();


-- =============================================================================
-- SEÇÃO 6: ENUM — status de proposta
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE proposta_status AS ENUM (
    'rascunho',
    'enviada',
    'visualizada',
    'aprovada',
    'recusada',
    'expirada'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE proposta_status IS
  'Ciclo de vida de uma proposta comercial online ELYON.';


-- =============================================================================
-- SEÇÃO 7: TABELA — propostas_online
-- =============================================================================

CREATE TABLE IF NOT EXISTS propostas_online (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),

  -- Referência ao projeto
  projeto_id            UUID            NOT NULL
                          REFERENCES projetos(id) ON DELETE CASCADE,

  -- Conteúdo da proposta
  titulo                TEXT            NOT NULL,
  introducao            TEXT,           -- Texto de apresentação personalizado para o cliente
  validade              DATE            NOT NULL,
  valor_total           NUMERIC(12,2)   NOT NULL,

  -- Status e rastreamento de eventos
  status                proposta_status NOT NULL DEFAULT 'rascunho',
  enviada_em            TIMESTAMPTZ,
  visualizada_em        TIMESTAMPTZ,
  respondida_em         TIMESTAMPTZ,

  -- Resposta do cliente ao aprovar ou recusar
  observacao_cliente    TEXT,

  -- Auditoria
  criado_por_nome       TEXT
);

COMMENT ON TABLE propostas_online IS
  'Propostas comerciais online enviadas ao cliente via portal. O cliente pode aprovar ou recusar diretamente pelo link.';
COMMENT ON COLUMN propostas_online.introducao IS
  'Texto de apresentação personalizado exibido ao cliente antes dos itens da proposta.';
COMMENT ON COLUMN propostas_online.observacao_cliente IS
  'Comentário enviado pelo cliente ao aprovar ou recusar a proposta.';

-- Índices para listagens e filtros
CREATE INDEX IF NOT EXISTS idx_propostas_projeto_id
  ON propostas_online (projeto_id);

CREATE INDEX IF NOT EXISTS idx_propostas_status
  ON propostas_online (status);

-- Trigger: atualiza updated_at automaticamente
CREATE TRIGGER trg_propostas_online_updated_at
  BEFORE UPDATE ON propostas_online
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================================
-- SEÇÃO 8: TABELA — itens_proposta
-- =============================================================================

CREATE TABLE IF NOT EXISTS itens_proposta (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referência à proposta pai
  proposta_id     UUID          NOT NULL
                    REFERENCES propostas_online(id) ON DELETE CASCADE,

  -- Dados do item
  descricao       TEXT          NOT NULL,
  quantidade      NUMERIC(10,2) NOT NULL DEFAULT 1,
  valor_unitario  NUMERIC(12,2) NOT NULL,

  -- Valor total calculado automaticamente
  valor_total     NUMERIC(12,2)
    GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,

  -- Ordem de exibição na proposta
  ordem           INT           NOT NULL DEFAULT 0
);

COMMENT ON TABLE itens_proposta IS
  'Itens de linha de uma proposta online. O valor_total por item é calculado automaticamente.';
COMMENT ON COLUMN itens_proposta.valor_total IS
  'Calculado automaticamente: quantidade × valor_unitario.';
COMMENT ON COLUMN itens_proposta.ordem IS
  'Ordem de exibição do item dentro da proposta (ascendente).';

CREATE INDEX IF NOT EXISTS idx_itens_proposta_proposta_id
  ON itens_proposta (proposta_id);


-- =============================================================================
-- SEÇÃO 9: ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Estratégia de autenticação do portal:
--   - Usuários autenticados (admin/staff): acesso total a todas as tabelas.
--   - Usuários anônimos (clientes via portal): acesso restrito ao próprio projeto
--     identificado pelo header HTTP `x-cliente-token`, validado contra
--     projetos.cliente_token.
--
-- O frontend deve enviar o header em TODA requisição ao Supabase:
--   x-cliente-token: <token do projeto>
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Expressão reutilizável (como comentário — use em cada policy abaixo):
-- EXISTS (
--   SELECT 1 FROM projetos
--   WHERE projetos.id = <tabela>.projeto_id
--     AND projetos.cliente_token =
--           current_setting('request.headers', true)::json->>'x-cliente-token'
-- )
-- -----------------------------------------------------------------------------


-- ── DOCUMENTOS ──────────────────────────────────────────────────────────────

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Admins e staff: acesso total
CREATE POLICY doc_auth_all ON documentos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Clientes anônimos: somente documentos visíveis do próprio projeto
CREATE POLICY doc_anon_select ON documentos
  FOR SELECT
  TO anon
  USING (
    visivel_cliente = true
    AND EXISTS (
      SELECT 1 FROM projetos
      WHERE projetos.id = documentos.projeto_id
        AND projetos.cliente_token =
              current_setting('request.headers', true)::json->>'x-cliente-token'
    )
  );


-- ── CHAMADOS DE SUPORTE ──────────────────────────────────────────────────────

ALTER TABLE chamados_suporte ENABLE ROW LEVEL SECURITY;

-- Admins e staff: acesso total
CREATE POLICY chamado_auth_all ON chamados_suporte
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Clientes anônimos: podem ver os chamados do próprio projeto
CREATE POLICY chamado_anon_select ON chamados_suporte
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM projetos
      WHERE projetos.id = chamados_suporte.projeto_id
        AND projetos.cliente_token =
              current_setting('request.headers', true)::json->>'x-cliente-token'
    )
  );

-- Clientes anônimos: podem abrir novos chamados no próprio projeto
CREATE POLICY chamado_anon_insert ON chamados_suporte
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projetos
      WHERE projetos.id = chamados_suporte.projeto_id
        AND projetos.cliente_token =
              current_setting('request.headers', true)::json->>'x-cliente-token'
    )
  );


-- ── PROPOSTAS ONLINE ─────────────────────────────────────────────────────────

ALTER TABLE propostas_online ENABLE ROW LEVEL SECURITY;

-- Admins e staff: acesso total
CREATE POLICY proposta_auth_all ON propostas_online
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Clientes anônimos: podem visualizar propostas do próprio projeto
CREATE POLICY proposta_anon_select ON propostas_online
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM projetos
      WHERE projetos.id = propostas_online.projeto_id
        AND projetos.cliente_token =
              current_setting('request.headers', true)::json->>'x-cliente-token'
    )
  );

-- Clientes anônimos: podem atualizar APENAS os campos de resposta (aprovar/recusar)
-- O backend deve garantir que outros campos não sejam alterados; aqui a RLS
-- libera o UPDATE mas a aplicação deve enviar só esses campos.
-- Campos permitidos: status, observacao_cliente, respondida_em
CREATE POLICY proposta_anon_update ON propostas_online
  FOR UPDATE
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM projetos
      WHERE projetos.id = propostas_online.projeto_id
        AND projetos.cliente_token =
              current_setting('request.headers', true)::json->>'x-cliente-token'
    )
  )
  WITH CHECK (
    -- Garante que só status válidos de resposta do cliente sejam aceitos
    status IN ('aprovada', 'recusada', 'visualizada')
    AND EXISTS (
      SELECT 1 FROM projetos
      WHERE projetos.id = propostas_online.projeto_id
        AND projetos.cliente_token =
              current_setting('request.headers', true)::json->>'x-cliente-token'
    )
  );


-- ── ITENS DE PROPOSTA ────────────────────────────────────────────────────────

ALTER TABLE itens_proposta ENABLE ROW LEVEL SECURITY;

-- Admins e staff: acesso total
CREATE POLICY item_proposta_auth_all ON itens_proposta
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Clientes anônimos: podem ver itens de propostas do próprio projeto
CREATE POLICY item_proposta_anon_select ON itens_proposta
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
        FROM propostas_online po
        JOIN projetos p ON p.id = po.projeto_id
       WHERE po.id = itens_proposta.proposta_id
         AND p.cliente_token =
               current_setting('request.headers', true)::json->>'x-cliente-token'
    )
  );


-- =============================================================================
-- SEÇÃO 10: VIEW — portal_resumo
-- =============================================================================
-- Visão consolidada por projeto: útil para a tela inicial do portal do cliente
-- e para o painel administrativo. Calcula contadores e progresso em tempo real.
-- =============================================================================

CREATE OR REPLACE VIEW portal_resumo AS
SELECT
  p.id                                                      AS projeto_id,
  p.titulo                                                  AS projeto_nome,
  p.status                                                  AS projeto_status,
  p.cliente_token,

  -- Contagem de documentos visíveis ao cliente
  COUNT(DISTINCT d.id) FILTER (
    WHERE d.visivel_cliente = true
  )                                                         AS total_documentos,

  -- Chamados abertos (status não terminal)
  COUNT(DISTINCT cs.id) FILTER (
    WHERE cs.status NOT IN ('resolvido', 'fechado')
  )                                                         AS chamados_abertos,

  -- Proposta ativa (enviada aguardando resposta ou já visualizada pelo cliente)
  (
    SELECT po.id
      FROM propostas_online po
     WHERE po.projeto_id = p.id
       AND po.status IN ('enviada', 'visualizada')
     ORDER BY po.created_at DESC
     LIMIT 1
  )                                                         AS proposta_ativa_id,

  (
    SELECT po.titulo
      FROM propostas_online po
     WHERE po.projeto_id = p.id
       AND po.status IN ('enviada', 'visualizada')
     ORDER BY po.created_at DESC
     LIMIT 1
  )                                                         AS proposta_ativa_titulo,

  (
    SELECT po.valor_total
      FROM propostas_online po
     WHERE po.projeto_id = p.id
       AND po.status IN ('enviada', 'visualizada')
     ORDER BY po.created_at DESC
     LIMIT 1
  )                                                         AS proposta_ativa_valor,

  -- Progresso: ordens de serviço concluídas / total de OS do projeto
  COUNT(DISTINCT os_total.id)                               AS total_ordens_servico,
  COUNT(DISTINCT os_conc.id)                                AS ordens_servico_concluidas,

  CASE
    WHEN COUNT(DISTINCT os_total.id) = 0 THEN 0
    ELSE ROUND(
      COUNT(DISTINCT os_conc.id)::NUMERIC
        / COUNT(DISTINCT os_total.id)::NUMERIC * 100,
      1
    )
  END                                                       AS progresso_percentual

FROM projetos p

-- Documentos vinculados
LEFT JOIN documentos d
  ON d.projeto_id = p.id

-- Chamados de suporte
LEFT JOIN chamados_suporte cs
  ON cs.projeto_id = p.id

-- Todas as OS do projeto
LEFT JOIN ordens_servico os_total
  ON os_total.projeto_id = p.id

-- Somente OS concluídas (ajuste o valor do enum se necessário)
LEFT JOIN ordens_servico os_conc
  ON os_conc.projeto_id = p.id
 AND os_conc.status = 'concluida'

GROUP BY p.id, p.titulo, p.status, p.cliente_token;

COMMENT ON VIEW portal_resumo IS
  'Visão consolidada por projeto: contagem de documentos, chamados abertos, proposta ativa e progresso de OS. Usada no portal do cliente e no painel admin.';


-- =============================================================================
-- SEÇÃO 11: GRANTS
-- =============================================================================

-- Portal (anon) e staff (authenticated) podem consultar o resumo do portal
GRANT SELECT ON portal_resumo TO authenticated;
GRANT SELECT ON portal_resumo TO anon;


-- =============================================================================
-- SEÇÃO 12: NOTAS SOBRE O BUCKET DE STORAGE — configuração manual obrigatória
-- =============================================================================
--
-- O Supabase Storage NÃO é configurado via SQL migration. As etapas abaixo
-- devem ser executadas MANUALMENTE no painel do Supabase ou via API REST.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │  BUCKET: elyon-documentos                                               │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │  Nome:        elyon-documentos                                          │
-- │  Público:     NÃO (public: false)                                       │
-- │  Acesso:      somente via service_role ou signed URLs                   │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- PASSO 1 — Criar o bucket (via painel ou API):
--   POST /storage/v1/bucket
--   {
--     "id": "elyon-documentos",
--     "name": "elyon-documentos",
--     "public": false
--   }
--
-- PASSO 2 — Políticas de acesso (Storage Policies):
--
--   a) Admins (authenticated) podem fazer upload, download, delete:
--      Política: allow authenticated to SELECT, INSERT, UPDATE, DELETE
--      Filtro:   bucket_id = 'elyon-documentos'
--
--   b) Clientes anônimos NÃO acessam o bucket diretamente.
--      O backend (Edge Function ou API Route) deve:
--        1. Validar o x-cliente-token contra projetos.cliente_token
--        2. Gerar uma signed URL com tempo de expiração
--           (ex: 1 hora) usando service_role
--        3. Retornar a signed URL para o frontend
--
-- PASSO 3 — Convenção de path no bucket:
--   projetos/<projeto_id>/<nome_arquivo_original_ou_uuid>
--   Exemplo: projetos/a1b2c3.../manual-instalacao.pdf
--   Salvar esse path na coluna documentos.storage_path
--
-- PASSO 4 — Tipos MIME recomendados para permitir no bucket:
--   application/pdf, image/jpeg, image/png, image/webp,
--   application/zip, application/vnd.ms-excel,
--   application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
--   application/msword,
--   application/vnd.openxmlformats-officedocument.wordprocessingml.document
--
-- PASSO 5 — Limite de tamanho (recomendado): 50 MB por arquivo
--   Configurável em: Storage → Bucket → Edit → File size limit
--
-- =============================================================================
-- FIM DA MIGRATION — Camada 04
-- =============================================================================
