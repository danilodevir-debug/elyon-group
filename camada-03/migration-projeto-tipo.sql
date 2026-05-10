-- ============================================================
-- ELYON Group · Migration · Tipo de Projeto + Rastreabilidade
-- Execute APÓS schema-catalogo.sql.
-- Adiciona suporte a serviços avulsos e manutenções vinculadas
-- a projetos já concluídos.
-- ============================================================


-- ── 1. Coluna: tipo do projeto ────────────────────────────────

/*
  Classifica o projeto para filtragem e relatórios:
  - projeto_completo : contrato de instalação completa (padrão)
  - servico_avulso   : serviço pontual pós-instalação
  - manutencao       : manutenção preventiva/corretiva
  - garantia         : atendimento coberto pela garantia
*/
ALTER TABLE projetos
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'projeto_completo'
  CHECK (tipo IN ('projeto_completo', 'servico_avulso', 'manutencao', 'garantia'));


-- ── 2. Coluna: projeto origem (rastreabilidade) ──────────────

/*
  Permite vincular um serviço avulso / manutenção ao projeto
  original do cliente. Útil para histórico e relatórios.
  ON DELETE SET NULL: se o projeto pai for deletado, o filho
  permanece, apenas perde a referência.
*/
ALTER TABLE projetos
  ADD COLUMN IF NOT EXISTS projeto_origem_id UUID
  REFERENCES projetos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projetos_origem_id
  ON projetos(projeto_origem_id);


-- ── 3. Atualiza a view projeto_financeiro_resumo ─────────────

/*
  Inclui o tipo na view para que o dashboard possa
  filtrar receita por categoria de projeto.
*/
CREATE OR REPLACE VIEW projeto_financeiro_resumo AS
SELECT
  p.id                                            AS projeto_id,
  p.titulo,
  p.status,
  p.tipo,
  p.projeto_origem_id,
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
GROUP BY p.id, p.titulo, p.status, p.tipo, p.projeto_origem_id, p.valor_proposta;

GRANT SELECT ON projeto_financeiro_resumo TO authenticated;


-- ============================================================
-- FIM · Migration tipo + rastreabilidade
-- ============================================================
