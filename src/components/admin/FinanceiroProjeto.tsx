// ============================================================
// ELYON Group · Módulo Financeiro por Projeto
// Componente: FinanceiroProjeto
// Recebe: projetoId (uuid) + valorProposta (numeric)
// ============================================================

import { useEffect, useState, useCallback, useRef } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Package,
  Wrench,
  Cpu,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ── Tipos ─────────────────────────────────────────────────────

type TipoItem = "material" | "mao_de_obra" | "equipamento" | "outro";

interface ItemFinanceiro {
  id: string;
  created_at: string;
  projeto_id: string;
  tipo: TipoItem;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  fornecedor: string | null;
}

interface FinanceiroResumo {
  projeto_id: string;
  valor_proposta: number;
  custo_total: number;
  margem: number;
  margem_pct: number;
}

interface NovoItem {
  tipo: TipoItem;
  descricao: string;
  quantidade: string;
  valor_unitario: string;
  fornecedor: string;
}

// ── Props do componente ───────────────────────────────────────

interface FinanceiroProjetoProps {
  projetoId: string;
  valorProposta: number;
}

// ── Configuração dos tipos de item ────────────────────────────

const TIPO_CONFIG: Record<
  TipoItem,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  material: {
    label: "Material",
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.10)",
    icon: <Package className="h-3.5 w-3.5" />,
  },
  mao_de_obra: {
    label: "Mão de Obra",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.10)",
    icon: <Wrench className="h-3.5 w-3.5" />,
  },
  equipamento: {
    label: "Equipamento",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.10)",
    icon: <Cpu className="h-3.5 w-3.5" />,
  },
  outro: {
    label: "Outro",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.10)",
    icon: <MoreHorizontal className="h-3.5 w-3.5" />,
  },
};

// Ordem de exibição dos grupos
const TIPO_ORDER: TipoItem[] = ["material", "mao_de_obra", "equipamento", "outro"];

// ── Formatação monetária ──────────────────────────────────────

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// ── Cor da margem ─────────────────────────────────────────────

function margemColor(pct: number): { cor: string; bg: string; label: string } {
  if (pct >= 20) return { cor: "#34d399", bg: "rgba(52,211,153,0.10)", label: "Saudável" };
  if (pct >= 5)  return { cor: "#fbbf24", bg: "rgba(251,191,36,0.10)",  label: "Atenção"  };
  return            { cor: "#f87171", bg: "rgba(248,113,113,0.10)", label: "Crítica"  };
}

// ── Skeleton de carregamento ──────────────────────────────────

const MetricSkeleton = () => (
  <div className="glass-card rounded-xl p-4 animate-pulse">
    <div className="h-3 w-20 rounded bg-border/40 mb-3" />
    <div className="h-7 w-32 rounded bg-border/40 mb-2" />
    <div className="h-2 w-16 rounded bg-border/30" />
  </div>
);

// ============================================================
// Componente principal
// ============================================================

export const FinanceiroProjeto = ({
  projetoId,
  valorProposta,
}: FinanceiroProjetoProps) => {
  // ── Estado da UI ──────────────────────────────────────────
  const [itens, setItens]           = useState<ItemFinanceiro[]>([]);
  const [resumo, setResumo]         = useState<FinanceiroResumo | null>(null);
  const [loadingItens, setLoadingItens] = useState(true);
  const [loadingResumo, setLoadingResumo] = useState(true);

  // Formulário de novo item
  const [showForm, setShowForm]     = useState(false);
  const [salvando, setSalvando]     = useState(false);
  const [erroForm, setErroForm]     = useState<string | null>(null);

  // Confirmação de exclusão inline
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  // Grupos recolhíveis
  const [gruposAbertos, setGruposAbertos] = useState<Record<TipoItem, boolean>>({
    material: true,
    mao_de_obra: true,
    equipamento: true,
    outro: true,
  });

  // Ref para scroll ao formulário
  const formRef = useRef<HTMLDivElement>(null);

  // ── Dados do formulário ───────────────────────────────────
  const novoItemInicial: NovoItem = {
    tipo: "material",
    descricao: "",
    quantidade: "1",
    valor_unitario: "",
    fornecedor: "",
  };
  const [novoItem, setNovoItem] = useState<NovoItem>(novoItemInicial);

  // ── Fetch de itens ────────────────────────────────────────
  const fetchItens = useCallback(async () => {
    setLoadingItens(true);
    try {
      const { data, error } = await supabase
        .from("itens_financeiros")
        .select("*")
        .eq("projeto_id", projetoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItens((data ?? []) as ItemFinanceiro[]);
    } catch (err) {
      console.error("[FinanceiroProjeto] Erro ao buscar itens:", err);
    } finally {
      setLoadingItens(false);
    }
  }, [projetoId]);

  // ── Fetch do resumo (view) ────────────────────────────────
  const fetchResumo = useCallback(async () => {
    setLoadingResumo(true);
    try {
      const { data, error } = await supabase
        .from("projeto_financeiro_resumo")
        .select("*")
        .eq("projeto_id", projetoId)
        .single();

      // PGRST116 = nenhuma linha encontrada (projeto sem itens ainda)
      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setResumo(data as FinanceiroResumo);
      } else {
        // Resumo vazio — projeto sem custos ainda
        setResumo({
          projeto_id: projetoId,
          valor_proposta: valorProposta,
          custo_total: 0,
          margem: valorProposta,
          margem_pct: 100,
        });
      }
    } catch (err) {
      console.error("[FinanceiroProjeto] Erro ao buscar resumo:", err);
    } finally {
      setLoadingResumo(false);
    }
  }, [projetoId, valorProposta]);

  useEffect(() => {
    fetchItens();
    fetchResumo();
  }, [fetchItens, fetchResumo]);

  // ── Adicionar item (optimistic update) ───────────────────
  const handleAdicionarItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroForm(null);

    // Validação básica
    if (!novoItem.descricao.trim()) {
      setErroForm("A descrição é obrigatória.");
      return;
    }
    const valorUnit = parseFloat(novoItem.valor_unitario.replace(",", "."));
    if (isNaN(valorUnit) || valorUnit <= 0) {
      setErroForm("Informe um valor unitário válido.");
      return;
    }
    const qtd = parseFloat(novoItem.quantidade.replace(",", ".")) || 1;

    const valorTotal = qtd * valorUnit;

    // Cria item temporário para optimistic update
    const itemTemp: ItemFinanceiro = {
      id: `temp-${Date.now()}`,
      created_at: new Date().toISOString(),
      projeto_id: projetoId,
      tipo: novoItem.tipo,
      descricao: novoItem.descricao.trim(),
      quantidade: qtd,
      valor_unitario: valorUnit,
      valor_total: valorTotal,
      fornecedor: novoItem.fornecedor.trim() || null,
    };

    // Adiciona imediatamente na lista
    setItens((prev) => [itemTemp, ...prev]);
    // Fecha e reseta form
    setNovoItem(novoItemInicial);
    setShowForm(false);
    setSalvando(true);

    try {
      const { data, error } = await supabase
        .from("itens_financeiros")
        .insert({
          projeto_id: projetoId,
          tipo: itemTemp.tipo,
          descricao: itemTemp.descricao,
          quantidade: itemTemp.quantidade,
          valor_unitario: itemTemp.valor_unitario,
          fornecedor: itemTemp.fornecedor,
        })
        .select()
        .single();

      if (error) throw error;

      // Substitui o item temporário pelo real (com ID correto do banco)
      setItens((prev) =>
        prev.map((i) => (i.id === itemTemp.id ? (data as ItemFinanceiro) : i))
      );
      // Atualiza o resumo
      await fetchResumo();
    } catch (err) {
      console.error("[FinanceiroProjeto] Erro ao inserir item:", err);
      // Reverte o optimistic update
      setItens((prev) => prev.filter((i) => i.id !== itemTemp.id));
      setErroForm("Erro ao salvar o item. Tente novamente.");
      setShowForm(true);
    } finally {
      setSalvando(false);
    }
  };

  // ── Deletar item ──────────────────────────────────────────
  const handleDeletar = async (itemId: string) => {
    setDeletandoId(itemId);
    // Guarda o item para reverter se necessário
    const itemBackup = itens.find((i) => i.id === itemId);

    // Optimistic: remove da lista
    setItens((prev) => prev.filter((i) => i.id !== itemId));
    setConfirmandoId(null);

    try {
      const { error } = await supabase
        .from("itens_financeiros")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      await fetchResumo();
    } catch (err) {
      console.error("[FinanceiroProjeto] Erro ao deletar item:", err);
      // Reverte remoção
      if (itemBackup) {
        setItens((prev) => [itemBackup, ...prev]);
      }
    } finally {
      setDeletandoId(null);
    }
  };

  // ── Agrupa itens por tipo ─────────────────────────────────
  const itensPorTipo = TIPO_ORDER.reduce(
    (acc, tipo) => {
      acc[tipo] = itens.filter((i) => i.tipo === tipo);
      return acc;
    },
    {} as Record<TipoItem, ItemFinanceiro[]>
  );

  // ── Barra de progresso custo vs proposta ──────────────────
  const custoPct =
    resumo && resumo.valor_proposta > 0
      ? Math.min((resumo.custo_total / resumo.valor_proposta) * 100, 100)
      : 0;
  const margemInfo = resumo ? margemColor(resumo.margem_pct) : margemColor(100);

  // ── Toggle grupo ──────────────────────────────────────────
  const toggleGrupo = (tipo: TipoItem) => {
    setGruposAbertos((prev) => ({ ...prev, [tipo]: !prev[tipo] }));
  };

  // ── Scroll ao abrir formulário ────────────────────────────
  const abrirFormulario = () => {
    setShowForm(true);
    setErroForm(null);
    setNovoItem(novoItemInicial);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6">

      {/* ── 1. Métricas de resumo ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Proposta */}
        {loadingResumo ? (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        ) : (
          <>
            {/* Card: Proposta */}
            <div
              className="glass-card rounded-xl p-4 border border-border/40 transition-all duration-500"
              style={{ animation: "fadeInUp 0.3s ease both" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-3.5 w-3.5 text-primary-glow" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Valor da Proposta
                </span>
              </div>
              <p className="text-2xl font-black text-foreground font-display">
                {formatBRL(resumo?.valor_proposta ?? valorProposta)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Receita prevista do projeto</p>
            </div>

            {/* Card: Custo Real */}
            <div
              className="glass-card rounded-xl p-4 border border-border/40 transition-all duration-500"
              style={{ animation: "fadeInUp 0.4s ease both" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-3.5 w-3.5" style={{ color: "#38bdf8" }} />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Custo Real
                </span>
              </div>
              <p className="text-2xl font-black font-display" style={{ color: "#38bdf8" }}>
                {formatBRL(resumo?.custo_total ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {itens.length} {itens.length === 1 ? "item lançado" : "itens lançados"}
              </p>
            </div>

            {/* Card: Margem */}
            <div
              className="glass-card rounded-xl p-4 border border-border/40 transition-all duration-500"
              style={{
                animation: "fadeInUp 0.5s ease both",
                borderColor: `${margemInfo.cor}30`,
                background: margemInfo.bg,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                {resumo && resumo.margem >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" style={{ color: margemInfo.cor }} />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" style={{ color: margemInfo.cor }} />
                )}
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Margem
                </span>
                <span
                  className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ color: margemInfo.cor, background: `${margemInfo.cor}18` }}
                >
                  {margemInfo.label}
                </span>
              </div>
              <p className="text-2xl font-black font-display" style={{ color: margemInfo.cor }}>
                {formatBRL(resumo?.margem ?? valorProposta)}
              </p>
              <p className="text-xs mt-1" style={{ color: margemInfo.cor }}>
                {resumo?.margem_pct != null
                  ? `${resumo.margem_pct >= 0 ? "+" : ""}${resumo.margem_pct.toFixed(1)}% da proposta`
                  : "—"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Barra de progresso custo / proposta ────────────── */}
      {!loadingResumo && resumo && (
        <div className="glass-card rounded-xl px-5 py-4 border border-border/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Custo vs Proposta
            </span>
            <span
              className="text-xs font-bold"
              style={{
                color: custoPct > 100 ? "#f87171" : custoPct > 80 ? "#fbbf24" : "#34d399",
              }}
            >
              {custoPct.toFixed(1)}% utilizado
            </span>
          </div>
          <div className="relative h-2.5 rounded-full bg-border/30 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
              style={{
                width: `${custoPct}%`,
                background:
                  custoPct > 100
                    ? "linear-gradient(90deg, #f87171, #ef4444)"
                    : custoPct > 80
                    ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                    : "linear-gradient(90deg, #a78bfa, #7c3aed)",
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-muted-foreground">{formatBRL(resumo.custo_total)}</span>
            <span className="text-xs text-muted-foreground">{formatBRL(resumo.valor_proposta)}</span>
          </div>
        </div>
      )}

      {/* ── 2. Lista de itens agrupados por tipo ────────────── */}
      <div className="space-y-3">
        {TIPO_ORDER.map((tipo) => {
          const config = TIPO_CONFIG[tipo];
          const grupo  = itensPorTipo[tipo] ?? [];
          const subtotal = grupo.reduce((s, i) => s + i.valor_total, 0);
          const aberto  = gruposAbertos[tipo];

          return (
            <div
              key={tipo}
              className="glass-card rounded-xl border border-border/40 overflow-hidden"
            >
              {/* Cabeçalho do grupo */}
              <button
                onClick={() => toggleGrupo(tipo)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors text-left"
              >
                <span
                  className="flex items-center justify-center h-6 w-6 rounded-md flex-shrink-0"
                  style={{ color: config.color, background: config.bg }}
                >
                  {config.icon}
                </span>
                <span
                  className="text-sm font-bold tracking-wide flex-1"
                  style={{ color: config.color }}
                >
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground mr-2">
                  {grupo.length} {grupo.length === 1 ? "item" : "itens"}
                </span>
                <span className="text-sm font-black" style={{ color: config.color }}>
                  {formatBRL(subtotal)}
                </span>
                <span className="ml-2 text-muted-foreground">
                  {aberto ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </span>
              </button>

              {/* Itens do grupo */}
              {aberto && (
                <div className="border-t border-border/30">
                  {loadingItens ? (
                    <div className="px-5 py-4 space-y-2">
                      {[1, 2].map((n) => (
                        <div key={n} className="animate-pulse flex gap-3">
                          <div className="h-4 flex-1 rounded bg-border/30" />
                          <div className="h-4 w-24 rounded bg-border/30" />
                        </div>
                      ))}
                    </div>
                  ) : grupo.length === 0 ? (
                    <div className="px-5 py-4 text-xs text-muted-foreground/50 italic">
                      Nenhum item nesta categoria.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/20">
                      {grupo.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group ${
                            deletandoId === item.id ? "opacity-40 pointer-events-none" : ""
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {item.descricao}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              {item.fornecedor && (
                                <span className="text-xs text-muted-foreground/70">
                                  Fornec.: {item.fornecedor}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground/60">
                                {item.quantidade} ×{" "}
                                {formatBRL(item.valor_unitario)}
                              </span>
                            </div>
                          </div>

                          {/* Valor total do item */}
                          <span className="text-sm font-bold text-foreground flex-shrink-0 mt-0.5">
                            {formatBRL(item.valor_total)}
                          </span>

                          {/* Ações: confirmar exclusão inline */}
                          {confirmandoId === item.id ? (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-xs text-muted-foreground mr-1">Confirmar?</span>
                              <button
                                onClick={() => handleDeletar(item.id)}
                                className="h-6 w-6 flex items-center justify-center rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                                title="Confirmar exclusão"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setConfirmandoId(null)}
                                className="h-6 w-6 flex items-center justify-center rounded-md bg-border/30 hover:bg-border/50 text-muted-foreground transition-colors"
                                title="Cancelar"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmandoId(item.id)}
                              className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                              title="Excluir item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 3. Formulário "Adicionar item" inline ───────────── */}
      <div ref={formRef}>
        {!showForm ? (
          <button
            onClick={abrirFormulario}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/30 text-sm font-semibold text-primary-glow hover:bg-primary/8 hover:border-primary/50 transition-all group"
          >
            <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
            Adicionar item de custo
          </button>
        ) : (
          <div className="glass-card glow-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-bold text-foreground">Novo Item de Custo</h4>
              <button
                onClick={() => { setShowForm(false); setErroForm(null); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAdicionarItem} className="space-y-4">
              {/* Tipo + Descrição */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Tipo */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Tipo
                  </label>
                  <select
                    value={novoItem.tipo}
                    onChange={(e) =>
                      setNovoItem((p) => ({ ...p, tipo: e.target.value as TipoItem }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground text-sm transition-all"
                  >
                    {TIPO_ORDER.map((t) => (
                      <option key={t} value={t}>
                        {TIPO_CONFIG[t].label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Descrição */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Descrição <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={novoItem.descricao}
                    onChange={(e) =>
                      setNovoItem((p) => ({ ...p, descricao: e.target.value }))
                    }
                    placeholder="Ex: Câmera IP Intelbras VIP 1220"
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Quantidade + Valor unitário + Fornecedor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Quantidade */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Quantidade
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={novoItem.quantidade}
                    onChange={(e) =>
                      setNovoItem((p) => ({ ...p, quantidade: e.target.value }))
                    }
                    placeholder="1"
                    className="w-full px-3 py-2.5 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all"
                  />
                </div>

                {/* Valor Unitário */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Valor Unitário <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={novoItem.valor_unitario}
                      onChange={(e) =>
                        setNovoItem((p) => ({ ...p, valor_unitario: e.target.value }))
                      }
                      placeholder="0,00"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all"
                    />
                  </div>
                </div>

                {/* Fornecedor */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Fornecedor
                  </label>
                  <input
                    type="text"
                    value={novoItem.fornecedor}
                    onChange={(e) =>
                      setNovoItem((p) => ({ ...p, fornecedor: e.target.value }))
                    }
                    placeholder="Ex: Intelbras, CFTV Mais..."
                    className="w-full px-3 py-2.5 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all"
                  />
                </div>
              </div>

              {/* Preview do total */}
              {novoItem.valor_unitario && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/8 border border-primary/20">
                  <span className="text-xs text-muted-foreground">Total calculado:</span>
                  <span className="text-sm font-black text-primary-glow">
                    {formatBRL(
                      (parseFloat(novoItem.quantidade.replace(",", ".")) || 1) *
                      (parseFloat(novoItem.valor_unitario.replace(",", ".")) || 0)
                    )}
                  </span>
                </div>
              )}

              {/* Erro */}
              {erroForm && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  {erroForm}
                </div>
              )}

              {/* Ações do formulário */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold text-sm hover:shadow-yellow transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {salvando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Salvar Item
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setErroForm(null); }}
                  className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Keyframes para animação de entrada ─────────────── */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
};

export default FinanceiroProjeto;
