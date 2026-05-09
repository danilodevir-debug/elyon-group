// ============================================================
// ELYON Group · Painel Admin — Gerenciamento de Chamados de Suporte
// Rota: /admin/chamados  (protegida por Supabase Auth)
// ============================================================

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  X, Search, RefreshCw, MessageCircle, ExternalLink,
  Wrench, Camera, Wifi, Cpu, Music, HelpCircle,
  AlertTriangle, Clock, CheckCircle2, XCircle,
  ChevronDown, Send, Edit3, Check, Filter,
  TicketCheck, Zap, Timer, CalendarCheck,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase client ──────────────────────────────────────────

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnon);

// ── Tipos ─────────────────────────────────────────────────────

export type ChamadoStatus =
  | "aberto"
  | "em_analise"
  | "aguardando_cliente"
  | "resolvido"
  | "fechado";

export type ChamadoPrioridade = "baixa" | "media" | "alta" | "urgente";

export type ChamadoCategoria =
  | "manutencao"
  | "camera_cftv"
  | "rede_conectividade"
  | "automacao"
  | "audio"
  | "outro";

export interface Projeto {
  id: string;
  titulo: string;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_token: string;
}

export interface Chamado {
  id: string;
  created_at: string;
  updated_at: string;
  projeto_id: string;
  titulo: string;
  descricao: string;
  status: ChamadoStatus;
  prioridade: ChamadoPrioridade;
  categoria: ChamadoCategoria;
  aberto_por_nome: string;
  resposta_admin: string | null;
  respondido_por_nome: string | null;
  respondido_em: string | null;
  resolvido_em: string | null;
  tempo_resposta_horas: number | null;
  // join
  projeto: Projeto | null;
}

// ── Queries Supabase ─────────────────────────────────────────

/** Busca todos os chamados com join no projeto */
async function fetchChamados(): Promise<Chamado[]> {
  const { data, error } = await supabase
    .from("chamados_suporte")
    .select("*, projeto:projeto_id(id, titulo, cliente_nome, cliente_telefone, cliente_token)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Chamado[];
}

/** Atualiza status do chamado */
async function updateStatus(id: string, status: ChamadoStatus) {
  const { error } = await supabase
    .from("chamados_suporte")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Atualiza prioridade do chamado */
async function updatePrioridade(id: string, prioridade: ChamadoPrioridade) {
  const { error } = await supabase
    .from("chamados_suporte")
    .update({ prioridade, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Envia resposta para o cliente */
async function enviarResposta(id: string, resposta: string, statusAtual: ChamadoStatus) {
  const agora = new Date().toISOString();
  const novoStatus: ChamadoStatus =
    statusAtual === "aberto" || statusAtual === "em_analise"
      ? "aguardando_cliente"
      : statusAtual;
  const { error } = await supabase
    .from("chamados_suporte")
    .update({
      resposta_admin: resposta,
      respondido_por_nome: "Admin ELYON",
      respondido_em: agora,
      status: novoStatus,
      updated_at: agora,
    })
    .eq("id", id);
  if (error) throw error;
  return novoStatus;
}

/** Marca chamado como resolvido */
async function marcarResolvido(id: string) {
  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("chamados_suporte")
    .update({
      status: "resolvido",
      resolvido_em: agora,
      updated_at: agora,
    })
    .eq("id", id);
  if (error) throw error;
}

/** Fecha o chamado */
async function fecharChamado(id: string) {
  const { error } = await supabase
    .from("chamados_suporte")
    .update({ status: "fechado", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ── Configurações visuais ─────────────────────────────────────

const STATUS_CONFIG: Record<ChamadoStatus, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  aberto:             { label: "Aberto",             color: "#fbbf24", bg: "rgba(251,191,36,0.12)",   icon: AlertTriangle },
  em_analise:         { label: "Em análise",          color: "#38bdf8", bg: "rgba(56,189,248,0.12)",   icon: Search },
  aguardando_cliente: { label: "Aguardando cliente",  color: "#fb923c", bg: "rgba(251,146,60,0.12)",   icon: Clock },
  resolvido:          { label: "Resolvido",           color: "#34d399", bg: "rgba(52,211,153,0.12)",   icon: CheckCircle2 },
  fechado:            { label: "Fechado",             color: "#64748b", bg: "rgba(100,116,139,0.12)",  icon: XCircle },
};

const PRIORIDADE_CONFIG: Record<ChamadoPrioridade, { label: string; color: string; bg: string }> = {
  baixa:   { label: "Baixa",   color: "#64748b", bg: "rgba(100,116,139,0.12)" },
  media:   { label: "Média",   color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
  alta:    { label: "Alta",    color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  urgente: { label: "Urgente", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

const CATEGORIA_CONFIG: Record<ChamadoCategoria, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  manutencao:         { label: "Manutenção",         icon: Wrench },
  camera_cftv:        { label: "Câmera / CFTV",      icon: Camera },
  rede_conectividade: { label: "Rede / Conectividade", icon: Wifi },
  automacao:          { label: "Automação",           icon: Cpu },
  audio:              { label: "Áudio",               icon: Music },
  outro:              { label: "Outro",               icon: HelpCircle },
};

type OrdenacaoTipo = "recentes" | "antigos" | "urgentes" | "sem_resposta";

// ── Utilitários ───────────────────────────────────────────────

/** Formata tempo relativo desde uma data ISO (alias: timeAgo) */
function tempoRelativo(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "agora mesmo";
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

/** Formata data completa em pt-BR */
function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Monta link WhatsApp com mensagem padrão */
function whatsappLink(telefone: string, nome: string): string {
  const digits = telefone.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  const msg = encodeURIComponent(
    `Olá, ${nome}! Aqui é da equipe ELYON Group. Entrando em contato sobre seu chamado de suporte. 🔧`
  );
  return `https://wa.me/${number}?text=${msg}`;
}

/** Verifica se chamado está sem resposta e não está encerrado */
function semResposta(c: Chamado): boolean {
  return !c.resposta_admin && c.status !== "resolvido" && c.status !== "fechado";
}


// ── Constantes de auth (mesma chave usada em Admin.tsx) ──────
const ADMIN_PASSWORD = "elyon2026";
const SESSION_KEY    = "elyon_admin_ok";

// ── Tela de login ─────────────────────────────────────────────
const TelaLogin = () => {
  const [pass, setPass]       = React.useState("");
  const [err, setErr]         = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    if (pass === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      window.location.reload();
    } else {
      setErr("Senha incorreta.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form
        onSubmit={handleLogin}
        className="bg-card border border-border rounded-xl p-8 w-full max-w-sm shadow-lg space-y-4"
      >
        <h2 className="text-xl font-bold text-foreground text-center">Painel Admin</h2>
        <p className="text-sm text-muted-foreground text-center">Chamados de Suporte</p>
        <input
          type="password"
          placeholder="Senha"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />
        {err && <p className="text-red-500 text-sm text-center">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition"
        >
          {loading ? "Verificando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────

export const AdminChamados = () => {
  const [session, setSession] = useState(false);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading]   = useState(true);
  const [erro, setErro]         = useState<string | null>(null);
  const [selected, setSelected] = useState<Chamado | null>(null);

  // Filtros
  const [filtroStatus, setFiltroStatus]         = useState<ChamadoStatus | "todos">("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState<ChamadoPrioridade | "todos">("todos");
  const [filtroCategoria, setFiltroCategoria]   = useState<ChamadoCategoria | "todos">("todos");
  const [busca, setBusca]                       = useState("");
  const [ordenacao, setOrdenacao]               = useState<OrdenacaoTipo>("recentes");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const data = await fetchChamados();
      setChamados(data);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar chamados");
    } finally {
      setLoading(false);
    }
  }, []);

  // Verifica sessão admin ao montar
  useEffect(() => {
    const ok = sessionStorage.getItem(SESSION_KEY) === "1";
    setSession(ok);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Guard: redireciona para login se não autenticado
  if (!session) return <TelaLogin />;

  // Métricas de cabeçalho
  const totalAbertos = chamados.filter((c) => c.status === "aberto").length;
  const totalUrgentes = chamados.filter((c) => c.prioridade === "urgente" && !c.resposta_admin && c.status !== "fechado" && c.status !== "resolvido").length;
  const hoje = new Date().toISOString().slice(0, 10);
  const resolvidosHoje = chamados.filter((c) => c.resolvido_em?.slice(0, 10) === hoje).length;
  const temposResposta = chamados
    .filter((c) => c.tempo_resposta_horas != null)
    .map((c) => c.tempo_resposta_horas as number);
  const mediaResposta = temposResposta.length > 0
    ? (temposResposta.reduce((a, b) => a + b, 0) / temposResposta.length).toFixed(1)
    : "—";

  // Lista filtrada e ordenada
  const chamadosFiltrados = useMemo(() => {
    let lista = [...chamados];

    // Filtro por status
    if (filtroStatus !== "todos") lista = lista.filter((c) => c.status === filtroStatus);

    // Filtro por prioridade
    if (filtroPrioridade !== "todos") lista = lista.filter((c) => c.prioridade === filtroPrioridade);

    // Filtro por categoria
    if (filtroCategoria !== "todos") lista = lista.filter((c) => c.categoria === filtroCategoria);

    // Busca por título ou nome do cliente
    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(
        (c) =>
          c.titulo.toLowerCase().includes(q) ||
          (c.projeto?.cliente_nome ?? "").toLowerCase().includes(q) ||
          c.aberto_por_nome.toLowerCase().includes(q)
      );
    }

    // Ordenação
    const ordemPrioridade: Record<ChamadoPrioridade, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 };
    switch (ordenacao) {
      case "recentes":
        lista.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "antigos":
        lista.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "urgentes":
        lista.sort((a, b) => ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade]);
        break;
      case "sem_resposta":
        lista.sort((a, b) => {
          const aSem = semResposta(a) ? 0 : 1;
          const bSem = semResposta(b) ? 0 : 1;
          if (aSem !== bSem) return aSem - bSem;
          return ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade];
        });
        break;
    }

    return lista;
  }, [chamados, filtroStatus, filtroPrioridade, filtroCategoria, busca, ordenacao]);

  // Atualiza chamado localmente após mutação no drawer
  const atualizarChamado = useCallback((atualizado: Chamado) => {
    setChamados((prev) => prev.map((c) => c.id === atualizado.id ? atualizado : c));
    setSelected(atualizado);
  }, []);

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{
        backgroundImage:
          "linear-gradient(rgba(124,58,237,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      {/* ── Header fixo ── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="font-bold text-base tracking-tight">
              ELYON <span className="text-primary-glow">Group</span>
            </span>
            <span className="hidden sm:inline text-xs text-muted-foreground px-2 py-0.5 rounded-md border border-border">
              Chamados
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Título, cliente..."
                className="pl-8 pr-4 py-2 rounded-lg bg-card/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary-glow/50 w-44 transition-all"
              />
            </div>
            {/* Ordenação */}
            <div className="relative">
              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value as OrdenacaoTipo)}
                className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-card/40 border border-border text-xs text-muted-foreground focus:outline-none focus:border-primary-glow/50 cursor-pointer transition-all"
              >
                <option value="recentes">Mais recentes</option>
                <option value="antigos">Mais antigos</option>
                <option value="urgentes">Urgentes primeiro</option>
                <option value="sem_resposta">Sem resposta primeiro</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
            {/* Refresh */}
            <button
              onClick={carregar}
              disabled={loading}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            {/* Logout */}
            <button
              onClick={() => { sessionStorage.removeItem(SESSION_KEY); window.location.reload(); }}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-red-400 hover:border-red-400/40 transition-colors"
              title="Sair"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-8">

        {/* ── Métricas ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Total abertos"
            value={totalAbertos}
            color="#fbbf24"
            icon={<TicketCheck className="h-5 w-5" />}
          />
          <MetricCard
            label="Urgentes sem resposta"
            value={totalUrgentes}
            color="#ef4444"
            icon={<Zap className="h-5 w-5" />}
          />
          <MetricCard
            label="Tempo médio resposta"
            value={mediaResposta === "—" ? "—" : `${mediaResposta}h`}
            color="#a78bfa"
            icon={<Timer className="h-5 w-5" />}
          />
          <MetricCard
            label="Resolvidos hoje"
            value={resolvidosHoje}
            color="#34d399"
            icon={<CalendarCheck className="h-5 w-5" />}
          />
        </div>

        {/* ── Filtros de status (chips) ── */}
        <div className="flex flex-wrap gap-2 mb-4">
          <FilterChip
            label="Todos"
            ativo={filtroStatus === "todos"}
            onClick={() => setFiltroStatus("todos")}
            color="#a78bfa"
          />
          {(Object.keys(STATUS_CONFIG) as ChamadoStatus[]).map((s) => (
            <FilterChip
              key={s}
              label={STATUS_CONFIG[s].label}
              ativo={filtroStatus === s}
              onClick={() => setFiltroStatus(s)}
              color={STATUS_CONFIG[s].color}
              count={chamados.filter((c) => c.status === s).length}
            />
          ))}
        </div>

        {/* ── Filtros secundários ── */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Prioridade */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mr-1">Prioridade:</span>
            {(["todos", "baixa", "media", "alta", "urgente"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setFiltroPrioridade(p)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  filtroPrioridade === p
                    ? "border-primary-glow/60 text-primary-glow bg-primary/15"
                    : "border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "todos" ? "Todas" : PRIORIDADE_CONFIG[p].label}
              </button>
            ))}
          </div>

          {/* Categoria (select) */}
          <div className="relative">
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value as ChamadoCategoria | "todos")}
              className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-card/40 border border-border text-xs text-muted-foreground focus:outline-none focus:border-primary-glow/50 cursor-pointer transition-all"
            >
              <option value="todos">Todas as categorias</option>
              {(Object.keys(CATEGORIA_CONFIG) as ChamadoCategoria[]).map((cat) => (
                <option key={cat} value={cat}>{CATEGORIA_CONFIG[cat].label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* ── Erro ── */}
        {erro && (
          <div className="glass-card rounded-xl px-4 py-3 mb-6 border border-red-500/20 text-red-400 text-sm">
            {erro}
          </div>
        )}

        {/* ── Lista de chamados ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-7 w-7 rounded-full border-2 border-primary-glow/40 border-t-primary-glow animate-spin" />
          </div>
        ) : chamadosFiltrados.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground text-sm">
            Nenhum chamado encontrado com os filtros selecionados.
          </div>
        ) : (
          <div className="space-y-3">
            {chamadosFiltrados.map((chamado) => (
              <ChamadoCard
                key={chamado.id}
                chamado={chamado}
                onClick={() => setSelected(chamado)}
                selecionado={selected?.id === chamado.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Drawer de atendimento ── */}
      {selected && (
        <ChamadoDrawer
          chamado={selected}
          onClose={() => setSelected(null)}
          onUpdate={atualizarChamado}
        />
      )}
    </div>
  );
};

// ── Componente: Card de métrica ───────────────────────────────

const MetricCard = ({
  label, value, color, icon,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}) => (
  <div className="glass-card rounded-xl p-4 flex items-start justify-between gap-3">
    <div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{label}</div>
    </div>
    <div className="p-2 rounded-lg" style={{ background: `${color}15`, color }}>{icon}</div>
  </div>
);

// ── Componente: Chip de filtro ────────────────────────────────

const FilterChip = ({
  label, ativo, onClick, color, count,
}: {
  label: string;
  ativo: boolean;
  onClick: () => void;
  color: string;
  count?: number;
}) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
    style={
      ativo
        ? { borderColor: `${color}60`, color, background: `${color}15` }
        : { borderColor: "rgba(255,255,255,0.08)", color: "#64748b" }
    }
  >
    {label}
    {count !== undefined && (
      <span
        className="inline-flex items-center justify-center rounded-full h-4 min-w-4 px-1 text-[10px] font-bold"
        style={ativo ? { background: `${color}30` } : { background: "rgba(255,255,255,0.08)" }}
      >
        {count}
      </span>
    )}
  </button>
);

// ── Componente: Card de chamado ───────────────────────────────

const ChamadoCard = ({
  chamado, onClick, selecionado,
}: {
  chamado: Chamado;
  onClick: () => void;
  selecionado: boolean;
}) => {
  const status   = STATUS_CONFIG[chamado.status];
  const prior    = PRIORIDADE_CONFIG[chamado.prioridade];
  const cat      = CATEGORIA_CONFIG[chamado.categoria];
  const CatIcon  = cat.icon;
  const urgenteSemResposta = semResposta(chamado) && chamado.prioridade === "urgente";

  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-xl p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group ${
        selecionado ? "glow-border" : "hover:shadow-glow"
      } ${urgenteSemResposta ? "border-red-500/30" : ""}`}
    >
      <div className="flex items-start gap-4">

        {/* Indicador de prioridade (barra lateral) */}
        <div
          className="flex-shrink-0 w-1 self-stretch rounded-full mt-0.5"
          style={{ background: prior.color }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            {/* Título e badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {/* Badge prioridade */}
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border"
                  style={{ color: prior.color, borderColor: `${prior.color}40`, background: prior.bg }}
                >
                  {chamado.prioridade === "urgente" && <AlertTriangle className="h-2.5 w-2.5" />}
                  {prior.label}
                </span>
                {/* Badge categoria */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-border/40 text-muted-foreground bg-card/30">
                  <CatIcon className="h-2.5 w-2.5" />
                  {cat.label}
                </span>
                {/* Indicador sem resposta */}
                {semResposta(chamado) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <Clock className="h-2.5 w-2.5" />
                    Sem resposta
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-sm leading-snug truncate group-hover:text-primary-glow transition-colors">
                {chamado.titulo}
              </h3>
            </div>

            {/* Status badge + tempo */}
            <div className="flex-shrink-0 flex flex-col items-end gap-1">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                style={{ color: status.color, borderColor: `${status.color}40`, background: status.bg }}
              >
                {status.label}
              </span>
              <span className="text-[11px] text-muted-foreground">{tempoRelativo(chamado.created_at)}</span>
            </div>
          </div>

          {/* Cliente + Projeto */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs text-muted-foreground">
              <span className="text-foreground/70 font-medium">{chamado.projeto?.cliente_nome ?? chamado.aberto_por_nome}</span>
              {chamado.projeto?.titulo && (
                <> · <span>{chamado.projeto.titulo}</span></>
              )}
            </span>
          </div>

          {/* Preview da descrição */}
          <p className="text-xs text-muted-foreground/70 line-clamp-2 leading-relaxed">
            {chamado.descricao}
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Componente: Drawer de atendimento ─────────────────────────

const ChamadoDrawer = ({
  chamado, onClose, onUpdate,
}: {
  chamado: Chamado;
  onClose: () => void;
  onUpdate: (c: Chamado) => void;
}) => {
  const [resposta, setResposta]           = useState(chamado.resposta_admin ?? "");
  const [editandoResposta, setEditando]   = useState(!chamado.resposta_admin);
  const [enviando, setEnviando]           = useState(false);
  const [statusSalvo, setStatusSalvo]     = useState<string | null>(null);
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [salvandoPrior, setSalvandoPrior] = useState(false);

  const status  = STATUS_CONFIG[chamado.status];
  const prior   = PRIORIDADE_CONFIG[chamado.prioridade];
  const cat     = CATEGORIA_CONFIG[chamado.categoria];
  const CatIcon = cat.icon;

  // Muda status
  const handleStatus = async (novoStatus: ChamadoStatus) => {
    if (novoStatus === chamado.status) return;
    setSalvandoStatus(true);
    try {
      await updateStatus(chamado.id, novoStatus);
      const atualizado = { ...chamado, status: novoStatus, updated_at: new Date().toISOString() };
      onUpdate(atualizado);
      setStatusSalvo("Status atualizado!");
      setTimeout(() => setStatusSalvo(null), 2000);
    } finally {
      setSalvandoStatus(false);
    }
  };

  // Muda prioridade
  const handlePrioridade = async (nova: ChamadoPrioridade) => {
    if (nova === chamado.prioridade) return;
    setSalvandoPrior(true);
    try {
      await updatePrioridade(chamado.id, nova);
      const atualizado = { ...chamado, prioridade: nova, updated_at: new Date().toISOString() };
      onUpdate(atualizado);
    } finally {
      setSalvandoPrior(false);
    }
  };

  // Envia resposta
  const handleEnviarResposta = async () => {
    if (!resposta.trim()) return;
    setEnviando(true);
    try {
      const agora = new Date().toISOString();
      const novoStatus = await enviarResposta(chamado.id, resposta.trim(), chamado.status);
      const atualizado: Chamado = {
        ...chamado,
        resposta_admin: resposta.trim(),
        respondido_por_nome: "Admin ELYON",
        respondido_em: agora,
        status: novoStatus,
        updated_at: agora,
      };
      onUpdate(atualizado);
      setEditando(false);
    } finally {
      setEnviando(false);
    }
  };

  // Marcar como resolvido
  const handleResolver = async () => {
    const agora = new Date().toISOString();
    await marcarResolvido(chamado.id);
    onUpdate({ ...chamado, status: "resolvido", resolvido_em: agora, updated_at: agora });
  };

  // Fechar chamado
  const handleFechar = async () => {
    const agora = new Date().toISOString();
    await fecharChamado(chamado.id);
    onUpdate({ ...chamado, status: "fechado", updated_at: agora });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="flex-1 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer — slide da direita */}
      <div
        className="w-full max-w-lg bg-background border-l border-border/60 overflow-y-auto flex flex-col"
        style={{ animation: "slideInRight 0.25s ease-out" }}
      >
        {/* Header do drawer */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 sticky top-0 bg-background/95 backdrop-blur-md z-10">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <CatIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground">{cat.label}</span>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ml-1"
                style={{ color: prior.color, borderColor: `${prior.color}40`, background: prior.bg }}
              >
                {prior.label}
              </span>
            </div>
            <h2 className="font-display font-bold text-base leading-snug truncate">{chamado.titulo}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-card/60 transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 px-6 py-6 space-y-6">

          {/* ── Informações do chamado ── */}
          <section>
            <p className="label-section mb-3">Informações</p>
            <div className="glass-card rounded-xl p-4 space-y-3 text-sm">
              <InfoRow label="Aberto por" value={chamado.aberto_por_nome} />
              <InfoRow label="Cliente" value={chamado.projeto?.cliente_nome ?? "—"} />
              <InfoRow label="Projeto" value={chamado.projeto?.titulo ?? "—"} />
              <InfoRow label="Aberto em" value={formatarData(chamado.created_at)} />
            </div>
          </section>

          {/* ── Links de ação rápida ── */}
          <section className="flex gap-3">
            {chamado.projeto?.cliente_token && (
              <div className="flex-1 flex gap-2">
                <a
                  href={`/portal/${chamado.projeto.cliente_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border border-primary/30 text-primary-glow bg-primary/10 hover:bg-primary/20 transition-all hover:-translate-y-0.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Portal do cliente
                </a>
                {/* Botão copiar link do portal */}
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/portal/${chamado.projeto!.cliente_token}`)}
                  title="Copiar link do portal"
                  className="px-3 py-2.5 rounded-xl text-xs font-bold border border-primary/30 text-primary-glow bg-primary/10 hover:bg-primary/20 transition-all hover:-translate-y-0.5"
                >
                  <Check className="h-3.5 w-3.5 hidden peer-data-copied:block" />
                  📋
                </button>
              </div>
            )}
            {chamado.projeto?.cliente_telefone && (
              <a
                href={whatsappLink(chamado.projeto.cliente_telefone, chamado.projeto.cliente_nome)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-accent text-accent-foreground hover:shadow-yellow transition-all hover:-translate-y-0.5"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            )}
          </section>

          {/* ── Descrição do cliente ── */}
          <section>
            <p className="label-section mb-3">Descrição do cliente</p>
            <div className="glass-card rounded-xl p-4">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{chamado.descricao}</p>
            </div>
          </section>

          {/* ── Status ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="label-section">Status</p>
              {salvandoStatus && <span className="text-xs text-muted-foreground animate-pulse">Salvando...</span>}
              {statusSalvo && <span className="text-xs text-green-400">{statusSalvo}</span>}
            </div>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(STATUS_CONFIG) as ChamadoStatus[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                const StatusIcon = cfg.icon;
                const ativo = chamado.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => handleStatus(s)}
                    disabled={salvandoStatus}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all disabled:opacity-50"
                    style={
                      ativo
                        ? { borderColor: cfg.color, color: cfg.color, background: cfg.bg }
                        : { borderColor: "rgba(255,255,255,0.06)", color: "#64748b" }
                    }
                  >
                    <StatusIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    {cfg.label}
                    {ativo && <Check className="h-3.5 w-3.5 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Prioridade ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="label-section">Prioridade</p>
              {salvandoPrior && <span className="text-xs text-muted-foreground animate-pulse">Salvando...</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PRIORIDADE_CONFIG) as ChamadoPrioridade[]).map((p) => {
                const cfg = PRIORIDADE_CONFIG[p];
                const ativo = chamado.prioridade === p;
                return (
                  <button
                    key={p}
                    onClick={() => handlePrioridade(p)}
                    disabled={salvandoPrior}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all disabled:opacity-50"
                    style={
                      ativo
                        ? { borderColor: cfg.color, color: cfg.color, background: cfg.bg }
                        : { borderColor: "rgba(255,255,255,0.06)", color: "#64748b" }
                    }
                  >
                    {cfg.label}
                    {ativo && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Área de resposta ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="label-section">Resposta para o cliente</p>
              {chamado.resposta_admin && !editandoResposta && (
                <button
                  onClick={() => setEditando(true)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Edit3 className="h-3 w-3" /> Editar
                </button>
              )}
            </div>

            {/* Resposta já existente (modo leitura) */}
            {chamado.resposta_admin && !editandoResposta ? (
              <div className="glass-card rounded-xl p-4 space-y-3">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {chamado.resposta_admin}
                </p>
                <div className="pt-2 border-t border-border/40 flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-xs text-muted-foreground">
                    Respondido por <strong className="text-foreground">{chamado.respondido_por_nome}</strong>{" "}
                    em {formatarData(chamado.respondido_em)}
                  </span>
                </div>
              </div>
            ) : (
              /* Modo de edição/criação de resposta */
              <div className="space-y-3">
                <textarea
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                  rows={6}
                  placeholder="Digite a resposta para o cliente. Seja claro e objetivo sobre o problema e a solução."
                  className="w-full px-4 py-3 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all resize-none"
                />
                <div className="flex gap-2">
                  {chamado.resposta_admin && (
                    <button
                      onClick={() => { setEditando(false); setResposta(chamado.resposta_admin ?? ""); }}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-border text-muted-foreground hover:text-foreground transition-all"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    onClick={handleEnviarResposta}
                    disabled={enviando || !resposta.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-accent text-accent-foreground hover:shadow-yellow transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {enviando ? "Enviando..." : chamado.resposta_admin ? "Atualizar resposta" : "Enviar resposta"}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ── Ações finais ── */}
          <section className="space-y-2">
            {/* Marcar como resolvido: só aparece se tem resposta e não está resolvido/fechado */}
            {chamado.resposta_admin &&
              chamado.status !== "resolvido" &&
              chamado.status !== "fechado" && (
                <button
                  onClick={handleResolver}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border border-green-500/40 text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-all hover:-translate-y-0.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Marcar como Resolvido
                </button>
              )}

            {/* Fechar chamado: só aparece se resolvido */}
            {chamado.status === "resolvido" && (
              <button
                onClick={handleFechar}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-all hover:-translate-y-0.5"
              >
                <XCircle className="h-4 w-4" />
                Fechar Chamado
              </button>
            )}
          </section>

          {/* ── Linha do tempo (histórico) ── */}
          <section>
            <p className="label-section mb-4">Histórico</p>
            <div className="space-y-3">
              <TimelineEvent
                label="Chamado aberto"
                data={chamado.created_at}
                color="#a78bfa"
                icon={<TicketCheck className="h-3.5 w-3.5" />}
              />
              {chamado.respondido_em && (
                <TimelineEvent
                  label={`Resposta enviada por ${chamado.respondido_por_nome ?? "Admin"}`}
                  data={chamado.respondido_em}
                  color="#38bdf8"
                  icon={<Send className="h-3.5 w-3.5" />}
                />
              )}
              {chamado.resolvido_em && (
                <TimelineEvent
                  label="Chamado resolvido"
                  data={chamado.resolvido_em}
                  color="#34d399"
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                />
              )}
              {chamado.status === "fechado" && chamado.updated_at && (
                <TimelineEvent
                  label="Chamado fechado"
                  data={chamado.updated_at}
                  color="#64748b"
                  icon={<XCircle className="h-3.5 w-3.5" />}
                />
              )}
            </div>
          </section>

        </div>
      </div>

      {/* Animação CSS inline — evita dependência de tailwind plugin */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .label-section {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-muted-foreground, #64748b);
        }
      `}</style>
    </div>
  );
};

// ── Componente: linha de info no drawer ───────────────────────

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
    <span className="text-xs font-medium text-right truncate">{value}</span>
  </div>
);

// ── Componente: evento da linha do tempo ──────────────────────

const TimelineEvent = ({
  label, data, color, icon,
}: {
  label: string;
  data: string;
  color: string;
  icon: React.ReactNode;
}) => (
  <div className="flex items-start gap-3">
    {/* Ícone com cor */}
    <div
      className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center"
      style={{ background: `${color}15`, color }}
    >
      {icon}
    </div>
    {/* Texto */}
    <div className="pt-0.5">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{formatarData(data)}</p>
    </div>
  </div>
);
