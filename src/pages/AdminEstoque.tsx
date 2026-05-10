// ============================================================
// ELYON Group · Gestão de Estoque — Painel Admin
// Rota: /admin/estoque
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Plus, Minus, Search, RefreshCw, X,
  AlertTriangle, CheckCircle2, XCircle, Loader2,
  ArrowUpCircle, ArrowDownCircle, RotateCcw,
  History, Building2, BarChart2, Edit3,
  Wrench, Boxes, TrendingDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ── Tipos ─────────────────────────────────────────────────────

type ItemTipo      = "material" | "equipamento" | "mao_de_obra";
type MovimentoTipo = "entrada"  | "saida"       | "ajuste";

interface ItemEstoque {
  id:                 string;
  nome:               string;
  tipo:               ItemTipo;
  unidade:            string;
  fornecedor:         string | null;
  valor_unitario:     number;
  quantidade_estoque: number;
  estoque_minimo:     number;
  ativo:              boolean;
}

interface MovimentoEstoque {
  id:          string;
  created_at:  string;
  item_id:     string;
  tipo:        MovimentoTipo;
  quantidade:  number;
  projeto_id:  string | null;
  observacao:  string | null;
}

// ── Config visual ─────────────────────────────────────────────

const TIPO_ITEM: Record<ItemTipo, { label: string; color: string }> = {
  material:    { label: "Material",    color: "#a78bfa" },
  equipamento: { label: "Equipamento", color: "#38bdf8" },
  mao_de_obra: { label: "Mão de obra", color: "#fbbf24" },
};

function getStockStatus(item: ItemEstoque) {
  if (item.quantidade_estoque <= 0)
    return { color: "#f87171", label: "Sem estoque",  bg: "rgba(248,113,113,0.1)", icon: XCircle };
  if (item.quantidade_estoque <= item.estoque_minimo)
    return { color: "#fbbf24", label: "Estoque baixo", bg: "rgba(251,191,36,0.1)", icon: AlertTriangle };
  return { color: "#34d399", label: "OK",             bg: "rgba(52,211,153,0.1)",  icon: CheckCircle2 };
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Guards de sessão ──────────────────────────────────────────

const TelaCarregando = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-6 w-6 rounded-full border-2 border-primary-glow/40 border-t-primary-glow animate-spin" />
  </div>
);

const TelaAcessoNegado = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <p className="text-muted-foreground text-sm">
      Faça login em{" "}
      <a href="/admin" className="text-primary-glow underline">/admin</a>{" "}
      para acessar o estoque.
    </p>
  </div>
);

// ── Componente principal ──────────────────────────────────────

export const AdminEstoque = () => {
  const [session,  setSession]  = useState<boolean | null>(null);
  const [itens,    setItens]    = useState<ItemEstoque[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filtroTipo,   setFiltroTipo]   = useState<ItemTipo | "todos">("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ok" | "baixo" | "sem">("todos");
  const [itemSelecionado, setItemSelecionado] = useState<ItemEstoque | null>(null);
  const [showMovimento,   setShowMovimento]   = useState<MovimentoTipo | null>(null);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(!!data.session));
    const { data: l } = supabase.auth.onAuthStateChange((_e, s) => setSession(!!s));
    return () => l.subscription.unsubscribe();
  }, []);

  // Carrega itens
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("catalogo_itens")
        .select("*")
        .eq("ativo", true)
        .order("tipo")
        .order("nome");
      if (!error) setItens((data ?? []) as ItemEstoque[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (session === null) return <TelaCarregando />;
  if (!session)         return <TelaAcessoNegado />;

  // Filtragem
  const filtered = itens.filter((item) => {
    const matchSearch = !search ||
      item.nome.toLowerCase().includes(search.toLowerCase()) ||
      (item.fornecedor ?? "").toLowerCase().includes(search.toLowerCase());
    const matchTipo = filtroTipo === "todos" || item.tipo === filtroTipo;
    const st = getStockStatus(item);
    const matchStatus =
      filtroStatus === "todos" ? true :
      filtroStatus === "sem"   ? item.quantidade_estoque <= 0 :
      filtroStatus === "baixo" ? item.quantidade_estoque > 0 && item.quantidade_estoque <= item.estoque_minimo :
      /* ok */                   item.quantidade_estoque > item.estoque_minimo;
    void st;
    return matchSearch && matchTipo && matchStatus;
  });

  // Métricas
  const semEstoque   = itens.filter((i) => i.quantidade_estoque <= 0).length;
  const estoqueBAixo = itens.filter((i) => i.quantidade_estoque > 0 && i.quantidade_estoque <= i.estoque_minimo).length;
  const valorTotal   = itens.reduce((acc, i) => acc + i.quantidade_estoque * i.valor_unitario, 0);

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{
        backgroundImage:
          "linear-gradient(rgba(124,58,237,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Boxes className="h-5 w-5 text-primary-glow" />
            <span className="font-bold text-base tracking-tight">
              <span className="text-primary-glow">Estoque</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin"
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors text-xs font-semibold px-3"
            >
              ← Admin
            </a>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
              title="Atualizar"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-red-400 hover:border-red-400/40 transition-colors"
              title="Sair"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">

        {/* ── Métricas ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: "Total de itens",    value: itens.length,    color: "#a78bfa", icon: Package },
            { label: "Sem estoque",       value: semEstoque,      color: "#f87171", icon: XCircle },
            { label: "Estoque baixo",     value: estoqueBAixo,    color: "#fbbf24", icon: AlertTriangle },
            { label: "Valor em estoque",  value: formatCurrency(valorTotal), color: "#34d399", icon: BarChart2 },
          ].map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="glass-card rounded-xl p-4"
            >
              <m.icon className="h-4 w-4 mb-2" style={{ color: m.color }} />
              <div className="text-2xl font-black" style={{ color: m.color }}>{m.value}</div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{m.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Filtros ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-3 mb-6 flex-wrap"
        >
          {/* Busca */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar item ou fornecedor..."
              className="pl-8 pr-4 py-2 w-full rounded-xl bg-card/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary-glow/50 transition-all"
            />
          </div>

          {/* Filtro tipo */}
          <div className="flex gap-1.5 flex-wrap">
            {[{ value: "todos", label: "Todos", color: "#a78bfa" },
              ...Object.entries(TIPO_ITEM).map(([v, c]) => ({ value: v, label: c.label, color: c.color }))
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFiltroTipo(opt.value as ItemTipo | "todos")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={
                  filtroTipo === opt.value
                    ? { background: `${opt.color}20`, borderColor: `${opt.color}50`, color: opt.color }
                    : { borderColor: "rgba(255,255,255,0.08)", color: "#64748b" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Filtro status estoque */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { value: "todos", label: "Todos status", color: "#64748b" },
              { value: "ok",    label: "✓ OK",         color: "#34d399" },
              { value: "baixo", label: "⚠ Baixo",      color: "#fbbf24" },
              { value: "sem",   label: "✕ Sem estoque",color: "#f87171" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFiltroStatus(opt.value as typeof filtroStatus)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={
                  filtroStatus === opt.value
                    ? { background: `${opt.color}20`, borderColor: `${opt.color}50`, color: opt.color }
                    : { borderColor: "rgba(255,255,255,0.08)", color: "#64748b" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Lista ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-primary-glow" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">Nenhum item encontrado.</p>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden border border-border/40">
            {/* Cabeçalho da tabela */}
            <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-border/40 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <span>Item</span>
              <span>Tipo</span>
              <span className="text-right">Estoque</span>
              <span className="text-right">Mínimo</span>
              <span className="text-right">Valor unit.</span>
              <span />
            </div>

            <AnimatePresence>
              {filtered.map((item, i) => {
                const st     = getStockStatus(item);
                const StIcon = st.icon;
                const tp     = TIPO_ITEM[item.tipo];

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 sm:gap-4 px-5 py-4 border-b border-border/30 last:border-0 hover:bg-card/30 transition-colors items-center group"
                  >
                    {/* Nome + fornecedor */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex-shrink-0 h-2 w-2 rounded-full"
                        style={{ background: st.color, boxShadow: `0 0 6px ${st.color}80` }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{item.nome}</p>
                        {item.fornecedor && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">{item.fornecedor}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tipo */}
                    <div>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-md border"
                        style={{ color: tp.color, borderColor: `${tp.color}35`, background: `${tp.color}12` }}
                      >
                        {tp.label}
                      </span>
                    </div>

                    {/* Quantidade */}
                    <div className="text-right">
                      <span className="text-sm font-black" style={{ color: st.color }}>
                        {item.quantidade_estoque % 1 === 0
                          ? item.quantidade_estoque.toFixed(0)
                          : item.quantidade_estoque.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">{item.unidade}</span>
                    </div>

                    {/* Mínimo */}
                    <div className="text-right text-sm text-muted-foreground">
                      {item.estoque_minimo > 0 ? (
                        <span>{item.estoque_minimo % 1 === 0
                          ? item.estoque_minimo.toFixed(0)
                          : item.estoque_minimo.toFixed(2)} {item.unidade}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </div>

                    {/* Valor unit */}
                    <div className="text-right text-sm text-muted-foreground">
                      {formatCurrency(item.valor_unitario)}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        onClick={() => { setItemSelecionado(item); setShowMovimento("entrada"); }}
                        title="Entrada de estoque"
                        className="p-1.5 rounded-lg border border-green-500/30 text-green-400 bg-green-500/8 hover:bg-green-500/20 transition-all"
                      >
                        <ArrowUpCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setItemSelecionado(item); setShowMovimento("saida"); }}
                        title="Saída de estoque"
                        className="p-1.5 rounded-lg border border-red-500/30 text-red-400 bg-red-500/8 hover:bg-red-500/20 transition-all"
                      >
                        <ArrowDownCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setItemSelecionado(item); setShowMovimento(null); }}
                        title="Histórico e ajuste"
                        className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
                      >
                        <History className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Drawer de item (histórico + ajuste) ── */}
      <AnimatePresence>
        {itemSelecionado && (
          <ItemDrawer
            item={itemSelecionado}
            tipoMovimento={showMovimento}
            onClose={() => { setItemSelecionado(null); setShowMovimento(null); }}
            onRefresh={() => {
              load();
              setItemSelecionado(null);
              setShowMovimento(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Drawer de item ────────────────────────────────────────────

const ItemDrawer = ({
  item,
  tipoMovimento,
  onClose,
  onRefresh,
}: {
  item:           ItemEstoque;
  tipoMovimento:  MovimentoTipo | null;
  onClose:        () => void;
  onRefresh:      () => void;
}) => {
  const [historico,    setHistorico]    = useState<MovimentoEstoque[]>([]);
  const [loadingHist,  setLoadingHist]  = useState(true);
  const [abaAtiva,     setAbaAtiva]     = useState<"movimentos" | "ajuste">(
    tipoMovimento ? "movimentos" : "movimentos"
  );
  const [tipoForm,     setTipoForm]     = useState<MovimentoTipo>(tipoMovimento ?? "entrada");
  const [quantidade,   setQuantidade]   = useState("");
  const [observacao,   setObservacao]   = useState("");
  const [estoqueMin,   setEstoqueMin]   = useState(String(item.estoque_minimo));
  const [saving,       setSaving]       = useState(false);
  const [erro,         setErro]         = useState("");

  const loadHistorico = useCallback(async () => {
    setLoadingHist(true);
    const { data } = await supabase
      .from("movimentos_estoque")
      .select("*")
      .eq("item_id", item.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setHistorico((data ?? []) as MovimentoEstoque[]);
    setLoadingHist(false);
  }, [item.id]);

  useEffect(() => { loadHistorico(); }, [loadHistorico]);

  const handleMovimento = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantidade);
    if (!qty || qty <= 0) { setErro("Informe uma quantidade válida."); return; }
    if (tipoForm === "saida" && qty > item.quantidade_estoque) {
      setErro(`Quantidade maior que o estoque atual (${item.quantidade_estoque} ${item.unidade}).`);
      return;
    }
    setErro("");
    setSaving(true);
    try {
      // Calcula novo saldo
      let novoSaldo: number;
      if (tipoForm === "entrada") novoSaldo = item.quantidade_estoque + qty;
      else if (tipoForm === "saida") novoSaldo = item.quantidade_estoque - qty;
      else novoSaldo = qty; // ajuste = valor absoluto

      // Registra movimento
      const { error: errMov } = await supabase
        .from("movimentos_estoque")
        .insert({ item_id: item.id, tipo: tipoForm, quantidade: qty, observacao: observacao || null });
      if (errMov) throw errMov;

      // Atualiza saldo
      const { error: errUpd } = await supabase
        .from("catalogo_itens")
        .update({ quantidade_estoque: novoSaldo })
        .eq("id", item.id);
      if (errUpd) throw errUpd;

      onRefresh();
    } catch {
      setErro("Erro ao registrar movimento. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleAjusteMinimo = async (e: React.FormEvent) => {
    e.preventDefault();
    const min = parseFloat(estoqueMin);
    if (isNaN(min) || min < 0) { setErro("Valor inválido."); return; }
    setSaving(true);
    await supabase.from("catalogo_itens").update({ estoque_minimo: min }).eq("id", item.id);
    setSaving(false);
    onRefresh();
  };

  const st = getStockStatus(item);
  const tp = TIPO_ITEM[item.tipo];

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex-1 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full max-w-md bg-background border-l border-border flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-xl z-10 border-b border-border">
          <div className="flex items-start justify-between px-6 py-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-base leading-tight truncate">{item.nome}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-md border"
                  style={{ color: tp.color, borderColor: `${tp.color}35`, background: `${tp.color}12` }}
                >
                  {tp.label}
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full border"
                  style={{ color: st.color, borderColor: `${st.color}40`, background: st.bg }}
                >
                  {item.quantidade_estoque % 1 === 0
                    ? item.quantidade_estoque.toFixed(0)
                    : item.quantidade_estoque.toFixed(2)}{" "}
                  {item.unidade} — {st.label}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="ml-3 p-2 rounded-lg hover:bg-card/60 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Abas */}
          <div className="flex border-t border-border">
            {[
              { key: "movimentos", label: "Registrar",   icon: <ArrowUpCircle className="h-3.5 w-3.5" /> },
              { key: "ajuste",     label: "Configurar",  icon: <Edit3          className="h-3.5 w-3.5" /> },
            ].map((aba) => (
              <button
                key={aba.key}
                onClick={() => setAbaAtiva(aba.key as typeof abaAtiva)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  abaAtiva === aba.key
                    ? "border-primary-glow text-primary-glow"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {aba.icon}
                {aba.label}
              </button>
            ))}
          </div>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* ── ABA: REGISTRAR MOVIMENTO ── */}
          {abaAtiva === "movimentos" && (
            <>
              {/* Formulário */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Novo movimento
                </p>
                <form onSubmit={handleMovimento} className="space-y-4">
                  {/* Tipo */}
                  <div className="grid grid-cols-3 gap-2">
                    {(["entrada", "saida", "ajuste"] as MovimentoTipo[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipoForm(t)}
                        className={`py-2 rounded-xl border text-xs font-bold transition-all capitalize ${
                          tipoForm === t
                            ? t === "entrada"
                              ? "border-green-500/50 text-green-400 bg-green-500/15"
                              : t === "saida"
                              ? "border-red-500/50 text-red-400 bg-red-500/15"
                              : "border-blue-500/50 text-blue-400 bg-blue-500/15"
                            : "border-border text-muted-foreground hover:bg-card/40"
                        }`}
                      >
                        {t === "entrada" ? "▲ Entrada" : t === "saida" ? "▼ Saída" : "⟳ Ajuste"}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                      Quantidade ({item.unidade}){tipoForm === "ajuste" && " — saldo final"}
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value)}
                      required
                      placeholder="0"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                      Observação (opcional)
                    </label>
                    <textarea
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      rows={2}
                      placeholder="Ex: Compra NF 1234, saída Projeto Alpha..."
                      className={`${inputCls} resize-none`}
                    />
                  </div>

                  {erro && (
                    <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      {erro}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${
                      tipoForm === "entrada"
                        ? "bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30"
                        : tipoForm === "saida"
                        ? "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30"
                        : "bg-blue-500/20 border border-blue-500/40 text-blue-400 hover:bg-blue-500/30"
                    }`}
                  >
                    {saving ? (
                      <span className="inline-flex items-center gap-2 justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                      </span>
                    ) : tipoForm === "entrada" ? "▲ Confirmar Entrada" : tipoForm === "saida" ? "▼ Confirmar Saída" : "⟳ Confirmar Ajuste"}
                  </button>
                </form>
              </section>

              {/* Histórico */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Histórico de movimentos
                </p>
                {loadingHist ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary-glow" />
                  </div>
                ) : historico.length === 0 ? (
                  <div className="glass-card rounded-xl p-6 text-center">
                    <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">Nenhum movimento registrado ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {historico.map((mov) => {
                      const isEntrada = mov.tipo === "entrada";
                      const isAjuste  = mov.tipo === "ajuste";
                      return (
                        <div key={mov.id} className="glass-card rounded-xl px-4 py-3 flex items-start gap-3">
                          <div className={`flex-shrink-0 mt-0.5 ${
                            isEntrada ? "text-green-400" : isAjuste ? "text-blue-400" : "text-red-400"
                          }`}>
                            {isEntrada ? <ArrowUpCircle className="h-4 w-4" /> :
                             isAjuste  ? <RotateCcw     className="h-4 w-4" /> :
                                         <ArrowDownCircle className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-sm font-bold ${
                                isEntrada ? "text-green-400" : isAjuste ? "text-blue-400" : "text-red-400"
                              }`}>
                                {isEntrada ? "+" : isAjuste ? "=" : "−"}
                                {mov.quantidade % 1 === 0 ? mov.quantidade.toFixed(0) : mov.quantidade.toFixed(2)} {item.unidade}
                              </span>
                              <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
                                {formatDate(mov.created_at)}
                              </span>
                            </div>
                            {mov.observacao && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{mov.observacao}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {/* ── ABA: CONFIGURAR ── */}
          {abaAtiva === "ajuste" && (
            <section className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Configurações do item
              </p>

              {/* Info do item */}
              <div className="glass-card rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor unitário</span>
                  <span className="font-semibold">{formatCurrency(item.valor_unitario)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Unidade</span>
                  <span className="font-semibold">{item.unidade}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fornecedor</span>
                  <span className="font-semibold">{item.fornecedor ?? "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor em estoque</span>
                  <span className="font-bold text-accent">
                    {formatCurrency(item.quantidade_estoque * item.valor_unitario)}
                  </span>
                </div>
              </div>

              {/* Ajuste de estoque mínimo */}
              <form onSubmit={handleAjusteMinimo} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                    Estoque mínimo ({item.unidade})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={estoqueMin}
                    onChange={(e) => setEstoqueMin(e.target.value)}
                    className={inputCls}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Alerta amarelo aparece quando o estoque atingir esse valor.
                  </p>
                </div>

                {erro && (
                  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {erro}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl border border-primary/30 bg-primary/10 text-primary-glow font-bold text-sm hover:bg-primary/20 transition-all disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar configuração"}
                </button>
              </form>
            </section>
          )}

        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminEstoque;
