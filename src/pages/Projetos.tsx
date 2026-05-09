// ============================================================
// ELYON Group · Gestão de Projetos — Painel Admin
// Rota: /admin/projetos
// ============================================================
// Depende de: @/lib/supabase (supabase client + tipos Lead)
// Stack: React + TypeScript + Tailwind + Framer Motion + Lucide
// ============================================================

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Check, Search, RefreshCw, ChevronRight,
  FolderOpen, Calendar, DollarSign, User, Phone,
  MapPin, FileText, ClipboardList, ExternalLink,
  Building2, Clock, AlertCircle, CheckCircle2,
  PauseCircle, XCircle, Loader2, Copy, Wrench,
  StickyNote, Link2, BarChart2, FileSignature,
} from "lucide-react";
import { supabase, type Lead } from "@/lib/supabase";
import { FinanceiroProjeto } from "@/components/admin/FinanceiroProjeto";
import { PropostaBuilder }   from "@/components/admin/PropostaBuilder";
import DocumentosProjeto     from "@/components/admin/DocumentosProjeto";

// ── Tipos ────────────────────────────────────────────────────

export type ProjetoStatus =
  | "planejamento"
  | "em_andamento"
  | "pausado"
  | "concluido"
  | "cancelado";

export type OSStatus =
  | "pendente"
  | "em_andamento"
  | "concluida"
  | "cancelada";

export interface Projeto {
  id: string;
  created_at: string;
  updated_at: string;
  lead_id: string | null;
  titulo: string;
  descricao: string | null;
  status: ProjetoStatus;
  data_inicio: string | null;
  data_previsao_conclusao: string | null;
  data_conclusao: string | null;
  responsavel_nome: string | null;
  valor_proposta: number | null;
  notas: string | null;
  cliente_nome: string;
  cliente_telefone: string | null;
  endereco: string | null;
  // Adicionado pela Camada 04 — token de acesso ao portal do cliente
  cliente_token: string | null;
}

export interface OrdemServico {
  id: string;
  projeto_id: string;
  titulo: string;
  status: OSStatus;
  tecnico_nome: string | null;
  data_agendada: string | null;
  token_acesso: string;
}

export interface CreateProjetoData {
  titulo: string;
  cliente_nome: string;
  cliente_telefone?: string;
  endereco?: string;
  descricao?: string;
  data_inicio?: string;
  data_previsao_conclusao?: string;
  responsavel_nome?: string;
  valor_proposta?: number | null;
  notas?: string;
  lead_id?: string | null;
  status?: ProjetoStatus;
}

export interface CreateOSData {
  projeto_id: string;
  titulo: string;
  tecnico_nome?: string;
  data_agendada?: string;
}

// ── Helpers Supabase ──────────────────────────────────────────

/** Busca todos os projetos ordenados por criação */
export async function fetchProjetos(): Promise<Projeto[]> {
  const { data, error } = await supabase
    .from("projetos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Projeto[];
}

/** Cria um novo projeto */
export async function createProjeto(data: CreateProjetoData): Promise<void> {
  const { error } = await supabase.from("projetos").insert({
    ...data,
    status: data.status ?? "planejamento",
  });
  if (error) throw error;
}

/** Atualiza o status de um projeto */
export async function updateProjetoStatus(
  id: string,
  status: ProjetoStatus
): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (status === "concluido") {
    updates.data_conclusao = new Date().toISOString().split("T")[0];
  }
  const { error } = await supabase.from("projetos").update(updates).eq("id", id);
  if (error) throw error;
}

/** Atualiza notas internas de um projeto */
export async function updateProjetoNotas(
  id: string,
  notas: string
): Promise<void> {
  const { error } = await supabase
    .from("projetos")
    .update({ notas })
    .eq("id", id);
  if (error) throw error;
}

/** Busca ordens de serviço vinculadas a um projeto */
export async function fetchOSdoProjeto(projeto_id: string): Promise<OrdemServico[]> {
  const { data, error } = await supabase
    .from("ordens_servico")
    .select("*")
    .eq("projeto_id", projeto_id)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as OrdemServico[];
}

/** Cria uma nova OS e gera token de acesso */
export async function createOS(data: CreateOSData): Promise<void> {
  // Gera token único para o link do técnico
  const token = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
  const { error } = await supabase.from("ordens_servico").insert({
    ...data,
    token_acesso: token,
    status: "pendente",
  });
  if (error) throw error;
}

/** Atualiza status de uma OS */
export async function updateOSStatus(
  id: string,
  status: OSStatus
): Promise<void> {
  const { error } = await supabase
    .from("ordens_servico")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

// ── Config de status ──────────────────────────────────────────

const STATUS_PROJETO: {
  value: ProjetoStatus;
  label: string;
  color: string;
  bg: string;
  icon: React.ElementType;
}[] = [
  { value: "planejamento",  label: "Planejamento",  color: "#94a3b8", bg: "rgba(148,163,184,0.1)", icon: Clock },
  { value: "em_andamento",  label: "Em andamento",  color: "#38bdf8", bg: "rgba(56,189,248,0.1)",  icon: Loader2 },
  { value: "pausado",       label: "Pausado",        color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  icon: PauseCircle },
  { value: "concluido",     label: "Concluído",      color: "#34d399", bg: "rgba(52,211,153,0.1)",  icon: CheckCircle2 },
  { value: "cancelado",     label: "Cancelado",      color: "#f87171", bg: "rgba(248,113,113,0.1)", icon: XCircle },
];

const STATUS_OS: {
  value: OSStatus;
  label: string;
  color: string;
}[] = [
  { value: "pendente",    label: "Pendente",    color: "#94a3b8" },
  { value: "em_andamento",label: "Em andamento",color: "#38bdf8" },
  { value: "concluida",   label: "Concluída",   color: "#34d399" },
  { value: "cancelada",   label: "Cancelada",   color: "#f87171" },
];

function getStatusProjeto(s: ProjetoStatus) {
  return STATUS_PROJETO.find((x) => x.value === s) ?? STATUS_PROJETO[0];
}

function getStatusOS(s: OSStatus) {
  return STATUS_OS.find((x) => x.value === s) ?? STATUS_OS[0];
}

// ── Utils ─────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(val: number | null | undefined): string {
  if (!val) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
}

// ── Constantes de auth ────────────────────────────────────────
const ADMIN_PASSWORD = "elyon2026";
const SESSION_KEY    = "elyon_admin_ok";

const TelaLoginProjetos = () => {
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
        <p className="text-sm text-muted-foreground text-center">Gestão de Projetos</p>
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

export const Projetos = () => {
  const [session, setSession]         = useState(false);
  const [projetos, setProjetos]       = useState<Projeto[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filtroStatus, setFiltroStatus] = useState<ProjetoStatus | "todos">("todos");
  const [projetoSelecionado, setProjetoSelecionado] = useState<Projeto | null>(null);
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [leads, setLeads]             = useState<Lead[]>([]);

  // Carrega projetos e leads disponíveis
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [proj, ldsRes] = await Promise.all([
        fetchProjetos(),
        supabase.from("leads").select("id, nome, telefone").order("created_at", { ascending: false }),
      ]);
      setProjetos(proj);
      if (!ldsRes.error) setLeads(ldsRes.data as Lead[]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Verifica sessão admin ao montar
  useEffect(() => {
    const ok = sessionStorage.getItem(SESSION_KEY) === "1";
    setSession(ok);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Guard: redireciona para login se não autenticado
  if (!session) return <TelaLoginProjetos />;

  // Filtragem
  const filtered = projetos.filter((p) => {
    const matchSearch =
      !search ||
      p.titulo.toLowerCase().includes(search.toLowerCase()) ||
      p.cliente_nome.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filtroStatus === "todos" || p.status === filtroStatus;
    return matchSearch && matchStatus;
  });

  // Métricas
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const concluidosMes = projetos.filter(
    (p) =>
      p.status === "concluido" &&
      p.data_conclusao &&
      new Date(p.data_conclusao) >= inicioMes
  ).length;
  const receitaTotal = projetos
    .filter((p) => p.status === "concluido")
    .reduce((acc, p) => acc + (p.valor_proposta ?? 0), 0);
  const emAndamento = projetos.filter((p) => p.status === "em_andamento").length;

  const handleStatusChange = async (id: string, status: ProjetoStatus) => {
    await updateProjetoStatus(id, status);
    setProjetos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
    if (projetoSelecionado?.id === id) {
      setProjetoSelecionado((prev) => (prev ? { ...prev, status } : null));
    }
  };

  const handleProjetoCriado = () => {
    setShowNovoModal(false);
    load();
  };

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
            <FolderOpen className="h-5 w-5 text-primary-glow" />
            <span className="font-bold text-base tracking-tight">
              <span className="text-primary-glow">Projetos</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
              title="Atualizar"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowNovoModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground font-bold text-sm hover:shadow-yellow transition-all hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Projeto</span>
            </button>
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

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {/* ── Métricas ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: "Total de projetos", value: projetos.length, color: "#a78bfa", icon: FolderOpen },
            { label: "Em andamento",      value: emAndamento,     color: "#38bdf8", icon: Loader2 },
            { label: "Concluídos este mês",value: concluidosMes,  color: "#34d399", icon: CheckCircle2 },
            { label: "Receita concluída", value: formatCurrency(receitaTotal), color: "#fbbf24", icon: DollarSign },
          ].map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="glass-card rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <m.icon className="h-4 w-4" style={{ color: m.color }} />
              </div>
              <div className="text-2xl font-black" style={{ color: m.color }}>
                {m.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
                {m.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Filtros e busca ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex flex-col sm:flex-row gap-3 mb-6"
        >
          {/* Busca */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título ou cliente..."
              className="pl-8 pr-4 py-2 w-full rounded-xl bg-card/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary-glow/50 transition-all"
            />
          </div>

          {/* Filtro de status */}
          <div className="flex gap-1.5 flex-wrap">
            {[{ value: "todos", label: "Todos" }, ...STATUS_PROJETO.map((s) => ({ value: s.value, label: s.label }))].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFiltroStatus(opt.value as ProjetoStatus | "todos")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  filtroStatus === opt.value
                    ? "bg-primary/15 border-primary/40 text-primary-glow"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Grid de Cards ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-primary-glow" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24 text-muted-foreground"
          >
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">Nenhum projeto encontrado.</p>
            <button
              onClick={() => setShowNovoModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary-glow text-sm font-semibold hover:bg-primary/25 transition-all"
            >
              <Plus className="h-4 w-4" />
              Criar primeiro projeto
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((projeto, i) => (
                <ProjetoCard
                  key={projeto.id}
                  projeto={projeto}
                  index={i}
                  onClick={() => setProjetoSelecionado(projeto)}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Modal Novo Projeto ── */}
      <AnimatePresence>
        {showNovoModal && (
          <NovoProjetoModal
            leads={leads}
            onClose={() => setShowNovoModal(false)}
            onCriado={handleProjetoCriado}
          />
        )}
      </AnimatePresence>

      {/* ── Drawer Detalhe Projeto ── */}
      <AnimatePresence>
        {projetoSelecionado && (
          <ProjetoDrawer
            projeto={projetoSelecionado}
            onClose={() => setProjetoSelecionado(null)}
            onStatusChange={handleStatusChange}
            onRefresh={load}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Card de Projeto ───────────────────────────────────────────

const ProjetoCard = ({
  projeto,
  index,
  onClick,
  onStatusChange,
}: {
  projeto: Projeto;
  index: number;
  onClick: () => void;
  onStatusChange: (id: string, s: ProjetoStatus) => void;
}) => {
  const st = getStatusProjeto(projeto.status);
  const StatusIcon = st.icon;

  // Contador de OS (é carregado no drawer; aqui mostramos placeholder)
  const nextStatus = STATUS_PROJETO[
    STATUS_PROJETO.findIndex((s) => s.value === projeto.status) + 1
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      onClick={onClick}
      className="glass-card rounded-2xl p-5 cursor-pointer hover:shadow-glow transition-all duration-300 hover:-translate-y-1 group border"
      style={{ borderColor: `${st.color}20` }}
    >
      {/* Header do card */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm leading-tight truncate group-hover:text-primary-glow transition-colors">
            {projeto.titulo}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{projeto.cliente_nome}</span>
          </div>
        </div>
        {/* Badge de status */}
        <span
          className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border"
          style={{
            color: st.color,
            borderColor: `${st.color}40`,
            background: st.bg,
          }}
        >
          <StatusIcon className="h-3 w-3" />
          {st.label}
        </span>
      </div>

      {/* Infos */}
      <div className="space-y-1.5 mb-4">
        {projeto.data_previsao_conclusao && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>Previsão: {formatDate(projeto.data_previsao_conclusao)}</span>
          </div>
        )}
        {projeto.valor_proposta && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3 flex-shrink-0" />
            <span className="text-accent font-semibold">
              {formatCurrency(projeto.valor_proposta)}
            </span>
          </div>
        )}
        {projeto.responsavel_nome && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3 flex-shrink-0" />
            <span>{projeto.responsavel_nome}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 pt-3 border-t border-border/40">
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold border border-border/50 text-muted-foreground hover:text-primary-glow hover:border-primary/30 hover:bg-primary/8 transition-all"
        >
          <ClipboardList className="h-3 w-3" />
          Ver OS
        </button>
        {nextStatus && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(projeto.id, nextStatus.value);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold border border-border/50 text-muted-foreground hover:text-foreground hover:bg-card/60 transition-all"
          >
            <ChevronRight className="h-3 w-3" />
            {nextStatus.label}
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ── Modal Novo Projeto ────────────────────────────────────────

const NovoProjetoModal = ({
  leads,
  onClose,
  onCriado,
}: {
  leads: Lead[];
  onClose: () => void;
  onCriado: () => void;
}) => {
  const [saving, setSaving] = useState(false);
  const [erro, setErro]     = useState("");
  const [form, setForm]     = useState<CreateProjetoData>({
    titulo: "",
    cliente_nome: "",
    cliente_telefone: "",
    endereco: "",
    descricao: "",
    data_inicio: "",
    data_previsao_conclusao: "",
    responsavel_nome: "",
    valor_proposta: null,
    notas: "",
    lead_id: null,
    status: "planejamento",
  });

  const set = (key: keyof CreateProjetoData, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.cliente_nome.trim()) {
      setErro("Título e nome do cliente são obrigatórios.");
      return;
    }
    setErro("");
    setSaving(true);
    try {
      await createProjeto({
        ...form,
        valor_proposta: form.valor_proposta ?? 0,
        lead_id: form.lead_id || null,
        data_inicio: form.data_inicio || undefined,
        data_previsao_conclusao: form.data_previsao_conclusao || undefined,
        responsavel_nome: form.responsavel_nome || undefined,
        descricao: form.descricao || undefined,
        cliente_telefone: form.cliente_telefone || undefined,
        endereco: form.endereco || undefined,
        notas: form.notas || undefined,
      });
      onCriado();
    } catch (err) {
      setErro("Erro ao salvar projeto. Verifique a conexão.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all";
  const labelCls =
    "block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-2xl bg-background border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/15 border border-primary/30">
              <FolderOpen className="h-4 w-4 text-primary-glow" />
            </div>
            <div>
              <h2 className="font-bold text-base">Novo Projeto</h2>
              <p className="text-xs text-muted-foreground">Preencha os dados do projeto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-card/60 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[75vh]">
          <div className="px-6 py-5 space-y-5">
            {/* Seção: Dados básicos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Título do Projeto *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => set("titulo", e.target.value)}
                  required
                  placeholder="Ex: Automação residencial - Casa Alphaville"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Cliente (Nome) *</label>
                <input
                  type="text"
                  value={form.cliente_nome}
                  onChange={(e) => set("cliente_nome", e.target.value)}
                  required
                  placeholder="Nome do cliente"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Telefone do cliente</label>
                <input
                  type="tel"
                  value={form.cliente_telefone}
                  onChange={(e) => set("cliente_telefone", e.target.value)}
                  placeholder="(11) 99999-9999"
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelCls}>Endereço / Local</label>
                <input
                  type="text"
                  value={form.endereco}
                  onChange={(e) => set("endereco", e.target.value)}
                  placeholder="Rua, número, bairro, cidade"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Seção: Vinculo com Lead (opcional) */}
            {leads.length > 0 && (
              <div>
                <label className={labelCls}>Vincular a Lead existente (opcional)</label>
                <select
                  value={form.lead_id ?? ""}
                  onChange={(e) => set("lead_id", e.target.value || null)}
                  className={inputCls}
                >
                  <option value="">— Nenhum lead vinculado —</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome} {l.telefone ? `· ${l.telefone}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Seção: Datas e responsável */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Data início</label>
                <input
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) => set("data_inicio", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Previsão conclusão</label>
                <input
                  type="date"
                  value={form.data_previsao_conclusao}
                  onChange={(e) => set("data_previsao_conclusao", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Status inicial</label>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as ProjetoStatus)}
                  className={inputCls}
                >
                  {STATUS_PROJETO.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Responsável</label>
                <input
                  type="text"
                  value={form.responsavel_nome}
                  onChange={(e) => set("responsavel_nome", e.target.value)}
                  placeholder="Nome do responsável"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Valor da proposta (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor_proposta ?? ""}
                  onChange={(e) =>
                    set("valor_proposta", e.target.value ? parseFloat(e.target.value) : null)
                  }
                  placeholder="0,00"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className={labelCls}>Descrição / Escopo do projeto</label>
              <textarea
                value={form.descricao}
                onChange={(e) => set("descricao", e.target.value)}
                rows={3}
                placeholder="Descreva os serviços, equipamentos e escopo..."
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Notas internas */}
            <div>
              <label className={labelCls}>Notas internas</label>
              <textarea
                value={form.notas}
                onChange={(e) => set("notas", e.target.value)}
                rows={2}
                placeholder="Observações, detalhes de negociação..."
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Erro */}
            {erro && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {erro}
              </div>
            )}
          </div>

          {/* Footer do modal */}
          <div className="flex gap-3 px-6 py-4 border-t border-border/60 bg-background/60">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-card/40 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold text-sm hover:shadow-yellow transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </span>
              ) : (
                "Criar Projeto"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ── Drawer Detalhe do Projeto ─────────────────────────────────

const ProjetoDrawer = ({
  projeto,
  onClose,
  onStatusChange,
  onRefresh,
}: {
  projeto: Projeto;
  onClose: () => void;
  onStatusChange: (id: string, s: ProjetoStatus) => void;
  onRefresh: () => void;
}) => {
  type DrawerAba = "operacional" | "financeiro" | "proposta" | "documentos";
  const [abaAtiva, setAbaAtiva]     = useState<DrawerAba>("operacional");
  const [ordens, setOrdens]         = useState<OrdemServico[]>([]);
  const [loadingOS, setLoadingOS]   = useState(true);
  const [showNovaOS, setShowNovaOS] = useState(false);
  const [notas, setNotas]           = useState(projeto.notas ?? "");
  const [savingNotas, setSavingNotas] = useState(false);
  const [savedNotas, setSavedNotas]   = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedPortal, setCopiedPortal] = useState(false);

  const dominio =
    typeof window !== "undefined"
      ? `${window.location.origin}`
      : "https://elyongroup.com.br";

  const loadOS = useCallback(async () => {
    setLoadingOS(true);
    try {
      const os = await fetchOSdoProjeto(projeto.id);
      setOrdens(os);
    } finally {
      setLoadingOS(false);
    }
  }, [projeto.id]);

  useEffect(() => { loadOS(); }, [loadOS]);

  const handleSaveNotas = async () => {
    setSavingNotas(true);
    await updateProjetoNotas(projeto.id, notas);
    setSavingNotas(false);
    setSavedNotas(true);
    setTimeout(() => setSavedNotas(false), 2000);
  };

  const handleOSStatusChange = async (id: string, status: OSStatus) => {
    await updateOSStatus(id, status);
    setOrdens((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
  };

  const handleCopyLink = (token: string) => {
    const link = `${dominio}/os/${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  // Contagem de OS concluídas
  const osConcluidas = ordens.filter((o) => o.status === "concluida").length;
  const st = getStatusProjeto(projeto.status);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
    >
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex-1 bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full max-w-lg bg-background border-l border-border flex flex-col overflow-hidden"
      >
        {/* Header do drawer */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-xl z-10 border-b border-border">
          <div className="flex items-start justify-between px-6 py-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-lg leading-tight truncate">
                {projeto.titulo}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{projeto.cliente_nome}</span>
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border"
                  style={{ color: st.color, borderColor: `${st.color}40`, background: st.bg }}
                >
                  {st.label}
                </span>
                {/* Link do portal do cliente */}
                {projeto.cliente_token && (
                  <button
                    onClick={() => {
                      const link = `${dominio}/portal/${projeto.cliente_token}`;
                      navigator.clipboard.writeText(link).then(() => {
                        setCopiedPortal(true);
                        setTimeout(() => setCopiedPortal(false), 2000);
                      });
                    }}
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border transition-all ${
                      copiedPortal
                        ? "border-green-500/40 text-green-400 bg-green-500/10"
                        : "border-accent/40 text-accent bg-accent/10 hover:bg-accent/20"
                    }`}
                    title="Copiar link do portal do cliente"
                  >
                    {copiedPortal ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                    {copiedPortal ? "Copiado!" : "Portal"}
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-3 p-2 rounded-lg hover:bg-card/60 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Barra de abas */}
          <div className="flex border-t border-border">
            {(
              [
                { key: "operacional", label: "Operacional", icon: <ClipboardList className="h-3.5 w-3.5" /> },
                { key: "financeiro",  label: "Financeiro",  icon: <BarChart2 className="h-3.5 w-3.5" /> },
                { key: "proposta",    label: "Proposta",    icon: <FileSignature className="h-3.5 w-3.5" /> },
                { key: "documentos",  label: "Documentos",  icon: <FolderOpen className="h-3.5 w-3.5" /> },
              ] as { key: DrawerAba; label: string; icon: React.ReactNode }[]
            ).map((aba) => (
              <button
                key={aba.key}
                onClick={() => setAbaAtiva(aba.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  abaAtiva === aba.key
                    ? "border-primary-glow text-primary-glow"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {aba.icon}
                <span className="hidden sm:inline">{aba.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto">

        {/* ── ABA: OPERACIONAL ── */}
        {abaAtiva === "operacional" && (
        <div className="px-6 py-6 space-y-6">
          {/* ── Status ── */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Status do projeto
            </p>
            <div className="grid grid-cols-1 gap-2">
              {STATUS_PROJETO.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.value}
                    onClick={() => onStatusChange(projeto.id, s.value)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      projeto.status === s.value
                        ? ""
                        : "border-border/40 text-muted-foreground hover:bg-card/40"
                    }`}
                    style={
                      projeto.status === s.value
                        ? { borderColor: s.color, color: s.color, background: s.bg }
                        : {}
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {s.label}
                    {projeto.status === s.value && (
                      <Check className="h-3.5 w-3.5 ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Dados do cliente ── */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Cliente
            </p>
            <div className="glass-card rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-semibold">{projeto.cliente_nome}</span>
              </div>
              {projeto.cliente_telefone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">{projeto.cliente_telefone}</span>
                </div>
              )}
              {projeto.endereco && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{projeto.endereco}</span>
                </div>
              )}
            </div>
          </section>

          {/* ── Detalhes do projeto ── */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Detalhes
            </p>
            <div className="glass-card rounded-xl p-4 space-y-2.5">
              {projeto.responsavel_nome && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground">Responsável: </span>
                    <span className="text-sm">{projeto.responsavel_nome}</span>
                  </div>
                </div>
              )}
              {projeto.data_inicio && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground">Início: </span>
                    <span className="text-sm">{formatDate(projeto.data_inicio)}</span>
                  </div>
                </div>
              )}
              {projeto.data_previsao_conclusao && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground">Previsão: </span>
                    <span className="text-sm">{formatDate(projeto.data_previsao_conclusao)}</span>
                  </div>
                </div>
              )}
              {projeto.data_conclusao && (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground">Concluído em: </span>
                    <span className="text-sm text-green-400">{formatDate(projeto.data_conclusao)}</span>
                  </div>
                </div>
              )}
              {projeto.valor_proposta && (
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-accent flex-shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground">Valor proposta: </span>
                    <span className="text-sm font-bold text-accent">{formatCurrency(projeto.valor_proposta)}</span>
                  </div>
                </div>
              )}
              {projeto.descricao && (
                <div className="flex items-start gap-3 pt-1 border-t border-border/40">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{projeto.descricao}</p>
                </div>
              )}
            </div>
          </section>

          {/* ── Ordens de Serviço ── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Ordens de Serviço
                </p>
                {ordens.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary-glow">
                    {osConcluidas}/{ordens.length} concluídas
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowNovaOS(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-primary-glow hover:bg-primary/25 transition-all"
              >
                <Plus className="h-3 w-3" />
                Nova OS
              </button>
            </div>

            {loadingOS ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary-glow" />
              </div>
            ) : ordens.length === 0 ? (
              <div className="glass-card rounded-xl p-6 text-center">
                <Wrench className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Nenhuma OS criada ainda</p>
                <button
                  onClick={() => setShowNovaOS(true)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-glow hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  Criar primeira OS
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {ordens.map((os) => {
                  const osStatus = getStatusOS(os.status);
                  const osLink = `${dominio}/os/${os.token_acesso}`;
                  const copied = copiedToken === os.token_acesso;

                  return (
                    <div
                      key={os.id}
                      className="glass-card rounded-xl p-4 border"
                      style={{ borderColor: `${osStatus.color}20` }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{os.titulo}</p>
                          {os.tecnico_nome && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Técnico: {os.tecnico_nome}
                            </p>
                          )}
                          {os.data_agendada && (
                            <p className="text-xs text-muted-foreground">
                              Agendada: {formatDate(os.data_agendada)}
                            </p>
                          )}
                        </div>
                        {/* Status badge e seletor */}
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                            style={{
                              color: osStatus.color,
                              borderColor: `${osStatus.color}40`,
                              background: `${osStatus.color}12`,
                            }}
                          >
                            {osStatus.label}
                          </span>
                          {/* Avançar status */}
                          {os.status !== "concluida" && os.status !== "cancelada" && (
                            <select
                              value={os.status}
                              onChange={(e) =>
                                handleOSStatusChange(os.id, e.target.value as OSStatus)
                              }
                              className="text-xs rounded-lg px-2 py-1 bg-background/60 border border-border text-muted-foreground focus:outline-none focus:border-primary-glow/50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {STATUS_OS.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Link de acesso do técnico */}
                      <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
                          /os/{os.token_acesso}
                        </span>
                        <a
                          href={osLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary-glow hover:underline font-semibold flex-shrink-0"
                        >
                          Abrir
                        </a>
                        <button
                          onClick={() => handleCopyLink(os.token_acesso)}
                          className={`flex-shrink-0 p-1.5 rounded-lg border transition-all ${
                            copied
                              ? "border-green-500/40 text-green-400 bg-green-500/10"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                          title="Copiar link"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Notas internas ── */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Notas internas
              </p>
            </div>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={4}
              placeholder="Registre observações, próximos passos, ajustes..."
              className="w-full px-4 py-3 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all resize-none"
            />
            <button
              onClick={handleSaveNotas}
              disabled={savingNotas}
              className={`mt-2 w-full py-2.5 rounded-xl text-xs font-bold border transition-all ${
                savedNotas
                  ? "border-green-500/40 text-green-400 bg-green-500/10"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              }`}
            >
              {savedNotas ? "✓ Salvo!" : savingNotas ? "Salvando..." : "Salvar notas"}
            </button>
          </section>
        </div>
        )} {/* fim aba operacional */}

        {/* ── ABA: FINANCEIRO ── */}
        {abaAtiva === "financeiro" && (
          <div className="px-6 py-6">
            <FinanceiroProjeto
              projetoId={projeto.id}
              valorProposta={projeto.valor_proposta ?? 0}
            />
          </div>
        )}

        {/* ── ABA: PROPOSTA ── */}
        {abaAtiva === "proposta" && (
          <div className="px-6 py-6">
            <PropostaBuilder
              projetoId={projeto.id}
              projetoTitulo={projeto.titulo}
              clienteNome={projeto.cliente_nome}
              clienteToken={projeto.cliente_token ?? ""}
            />
          </div>
        )}

        {/* ── ABA: DOCUMENTOS ── */}
        {abaAtiva === "documentos" && (
          <div className="px-6 py-6">
            <DocumentosProjeto projetoId={projeto.id} />
          </div>
        )}

        </div> {/* fim corpo scroll */}
      </motion.div>

      {/* ── Modal Nova OS (inline no drawer) ── */}
      <AnimatePresence>
        {showNovaOS && (
          <NovaOSModal
            projetoId={projeto.id}
            onClose={() => setShowNovaOS(false)}
            onCriada={() => {
              setShowNovaOS(false);
              loadOS();
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Modal Nova OS ─────────────────────────────────────────────

const NovaOSModal = ({
  projetoId,
  onClose,
  onCriada,
}: {
  projetoId: string;
  onClose: () => void;
  onCriada: () => void;
}) => {
  const [saving, setSaving] = useState(false);
  const [erro, setErro]     = useState("");
  const [form, setForm]     = useState<CreateOSData>({
    projeto_id: projetoId,
    titulo: "",
    tecnico_nome: "",
    data_agendada: "",
  });

  const set = (key: keyof CreateOSData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim()) {
      setErro("O título da OS é obrigatório.");
      return;
    }
    setErro("");
    setSaving(true);
    try {
      await createOS({
        projeto_id: projetoId,
        titulo: form.titulo,
        tecnico_nome: form.tecnico_nome || undefined,
        data_agendada: form.data_agendada || undefined,
      });
      onCriada();
    } catch (err) {
      setErro("Erro ao criar OS.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md bg-background border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/15 border border-accent/30">
              <Wrench className="h-4 w-4 text-accent" />
            </div>
            <div>
              <h2 className="font-bold text-base">Nova Ordem de Serviço</h2>
              <p className="text-xs text-muted-foreground">Será gerado link de acesso para o técnico</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-card/60 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                Título da OS *
              </label>
              <input
                type="text"
                value={form.titulo}
                onChange={(e) => set("titulo", e.target.value)}
                required
                placeholder="Ex: Instalação câmeras - Setor leste"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                Técnico responsável
              </label>
              <input
                type="text"
                value={form.tecnico_nome}
                onChange={(e) => set("tecnico_nome", e.target.value)}
                placeholder="Nome do técnico"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                Data agendada
              </label>
              <input
                type="datetime-local"
                value={form.data_agendada}
                onChange={(e) => set("data_agendada", e.target.value)}
                className={inputCls}
              />
            </div>

            {erro && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {erro}
              </div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/8 border border-primary/20">
              <ExternalLink className="h-3.5 w-3.5 text-primary-glow flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Um link único será gerado automaticamente para o técnico acessar esta OS no campo.
              </p>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-card/40 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold text-sm hover:shadow-yellow transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </span>
              ) : (
                "Criar OS"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default Projetos;
