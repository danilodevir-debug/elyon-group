-- ============================================================
-- ELYON Group · Camada 03 · Catálogo de Itens
-- Execute APÓS o schema da Camada 03 já estar aplicado.
-- Permite reaproveitar materiais, equipamentos e mão-de-obra
-- como templates ao lançar custos em qualquer projeto.
-- ============================================================


-- ============================================================
-- TABELA: catalogo_itens
-- ============================================================

/*
  Catálogo centralizado de itens reutilizáveis.
  Ao lançar um custo em itens_financeiros, o admin pode buscar
  um item do catálogo e auto-preencher os campos.
  O catálogo é apenas um template — a edição fica em itens_financeiros.
*/
CREATE TABLE IF NOT EXISTS catalogo_itens (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Classificação (reutiliza o enum já existente)
  tipo             item_financeiro_tipo NOT NULL DEFAULT 'material',

  -- Identificação
  nome             TEXT NOT NULL,
  descricao        TEXT,

  -- Precificação padrão (pode ser ajustado no lançamento)
  valor_unitario   NUMERIC(12,2) NOT NULL DEFAULT 0,
  unidade          TEXT NOT NULL DEFAULT 'un',   -- 'un', 'm', 'h', 'cx', 'kg'

  -- Fornecedor padrão
  fornecedor       TEXT,

  -- Soft-delete: itens inativos não aparecem na busca
  ativo            BOOLEAN NOT NULL DEFAULT TRUE
);

-- Índice para busca por nome (LIKE / iLIKE)
CREATE INDEX idx_catalogo_nome ON catalogo_itens USING gin(to_tsvector('portuguese', nome));
-- Índice para filtro por tipo
CREATE INDEX idx_catalogo_tipo ON catalogo_itens(tipo);

CREATE TRIGGER catalogo_itens_updated_at
  BEFORE UPDATE ON catalogo_itens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- RLS: catalogo_itens
-- Apenas autenticados (admin/equipe)
-- ============================================================

ALTER TABLE catalogo_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated pode ler catálogo"
  ON catalogo_itens FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated pode inserir no catálogo"
  ON catalogo_itens FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated pode atualizar catálogo"
  ON catalogo_itens FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated pode desativar item do catálogo"
  ON catalogo_itens FOR DELETE
  TO authenticated
  USING (true);


-- ============================================================
-- SEEDS: itens de exemplo para começar o catálogo
-- ============================================================

INSERT INTO catalogo_itens (tipo, nome, unidade, valor_unitario, fornecedor) VALUES
  -- Materiais
  ('material', 'Cabo UTP Cat6 (m)',             'm',  3.50,   'Furukawa'),
  ('material', 'Cabo HDMI 4K 5m',               'un', 45.00,  NULL),
  ('material', 'Eletroduto PVC 3/4 (m)',         'm',  4.20,   NULL),
  ('material', 'Caixa de passagem 4x2',          'un', 3.00,   NULL),
  ('material', 'Patch Panel 24 portas Cat6',     'un', 280.00, 'Furukawa'),

  -- Equipamentos
  ('equipamento', 'Câmera IP 4MP Bullet',        'un', 380.00, 'Intelbras'),
  ('equipamento', 'Câmera IP 4MP Dome',          'un', 420.00, 'Intelbras'),
  ('equipamento', 'DVR 8 canais 1080p',          'un', 650.00, 'Intelbras'),
  ('equipamento', 'NVR 16 canais PoE',           'un', 1200.00,'Intelbras'),
  ('equipamento', 'Switch PoE 8 portas',         'un', 750.00, 'TP-Link'),
  ('equipamento', 'Roteador Wi-Fi 6 AX3000',     'un', 580.00, 'TP-Link'),
  ('equipamento', 'Access Point Omada EAP670',   'un', 890.00, 'TP-Link'),
  ('equipamento', 'HD 1TB SATA Surveillance',    'un', 290.00, NULL),
  ('equipamento', 'No-break 1440VA',             'un', 1100.00,NULL),

  -- Mão de obra
  ('mao_de_obra', 'Hora técnica instalação',     'h',  90.00,  NULL),
  ('mao_de_obra', 'Hora técnica configuração',   'h',  110.00, NULL),
  ('mao_de_obra', 'Passagem de cabo (ponto)',     'un', 60.00,  NULL),
  ('mao_de_obra', 'Visita técnica diagnóstico',  'un', 150.00, NULL);


-- ============================================================
-- FIM · Catálogo de itens
-- ============================================================
