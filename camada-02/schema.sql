-- ============================================================
-- ELYON Group · Camada 02 · Schema Supabase
-- Execute este arquivo no SQL Editor do seu projeto Supabase
-- ============================================================

-- 1. Enum de status do pipeline
CREATE TYPE lead_status AS ENUM (
  'novo',
  'em_contato',
  'proposta',
  'fechado',
  'perdido'
);

-- 2. Tabela principal de leads
CREATE TABLE IF NOT EXISTS leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Dados do formulário
  nome          TEXT NOT NULL,
  telefone      TEXT NOT NULL,
  email         TEXT NOT NULL,
  servico       TEXT,
  mensagem      TEXT,

  -- Pipeline
  status        lead_status NOT NULL DEFAULT 'novo',
  notas         TEXT,                        -- notas internas do time

  -- Rastreamento de origem (útil para escalar com campanhas)
  origem        TEXT DEFAULT 'site',         -- 'site', 'instagram', 'indicacao', etc.
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT
);

-- 3. Índices para performance nas queries do admin
CREATE INDEX idx_leads_status     ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_email      ON leads(email);

-- 4. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Somente usuários autenticados (admin logado) podem LER leads
CREATE POLICY "Admin pode ler leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

-- Somente usuários autenticados podem ATUALIZAR (mudar status, notas)
CREATE POLICY "Admin pode atualizar leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- INSERT é permitido pelo service_role (usado na Edge Function)
-- O anon key NÃO tem permissão de inserir diretamente — só via Edge Function
CREATE POLICY "Service role insere leads"
  ON leads FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- VIEW ÚTIL: resumo do pipeline para o dashboard do admin
-- ============================================================
CREATE OR REPLACE VIEW pipeline_resumo AS
SELECT
  status,
  COUNT(*)                                          AS total,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS ultimos_7_dias
FROM leads
GROUP BY status
ORDER BY
  CASE status
    WHEN 'novo'        THEN 1
    WHEN 'em_contato'  THEN 2
    WHEN 'proposta'    THEN 3
    WHEN 'fechado'     THEN 4
    WHEN 'perdido'     THEN 5
  END;

-- Concede leitura da view para usuários autenticados
GRANT SELECT ON pipeline_resumo TO authenticated;
