
// ── Tab: Home (hub de navegação) ─────────────────────────────

const HomeTab = ({ onNavigate, leads, resumo }: {
  onNavigate: (tab: "home" | "leads" | "financeiro" | "sistema") => void;
  leads: Lead[];
  resumo: PipelineResumo[];
}) => {
  const total    = leads.length;
  const novos    = leads.filter((l) => l.status === "novo").length;
  const fechados = leads.filter((l) => l.status === "fechado").length;
  const hoje     = leads.filter((l) => new Date(l.created_at).toDateString() === new Date().toDateString()).length;

  const cards = [
    {
      title: "Pipeline de Leads",
      desc: "Kanban com todos os leads, contatos e status de negociação",
      href: null as null | string,
      tab: "leads" as const,
      icon: <Activity className="h-6 w-6" />,
      color: "#a78bfa",
      stats: [
        { label: "Total", value: total },
        { label: "Novos", value: novos },
        { label: "Hoje",  value: hoje  },
        { label: "Fechados", value: fechados },
      ],
    },
    {
      title: "Gestão de Projetos",
      desc: "Projetos, OS para técnicos, documentos e controle financeiro",
      href: "/admin/projetos",
      tab: null as null | "leads" | "financeiro" | "sistema",
      icon: <FolderOpen className="h-6 w-6" />,
      color: "#38bdf8",
      stats: [],
    },
    {
      title: "Chamados de Suporte",
      desc: "Tickets abertos pelos clientes via portal, com respostas e histórico",
      href: "/admin/chamados",
      tab: null as null | "leads" | "financeiro" | "sistema",
      icon: <TicketCheck className="h-6 w-6" />,
      color: "#fbbf24",
      stats: [],
    },
    {
      title: "Dashboard Financeiro",
      desc: "Receita, custo e margem consolidados de todos os projetos",
      href: null as null | string,
      tab: "financeiro" as const,
      icon: <BarChart2 className="h-6 w-6" />,
      color: "#34d399",
      stats: [],
    },
    {
      title: "Diagnóstico do Sistema",
      desc: "Status das variáveis de ambiente, conexão Supabase e tabelas",
      href: null as null | string,
      tab: "sistema" as const,
      icon: <Database className="h-6 w-6" />,
      color: "#f87171",
      stats: [],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">
          Painel <span className="text-primary-glow">ELYON</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Selecione um módulo para começar</p>
      </div>

      {/* Cards de navegação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const handleClick = () => {
            if (c.href) window.location.href = c.href;
            else if (c.tab) onNavigate(c.tab);
          };
          return (
            <button
              key={c.title}
              onClick={handleClick}
              className="glass-card rounded-2xl p-5 text-left hover:shadow-glow hover:-translate-y-1 transition-all duration-300 group border border-border/60 hover:border-opacity-60"
              style={{ borderColor: `${c.color}20` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl" style={{ background: `${c.color}15`, color: c.color }}>
                  {c.icon}
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-1" />
              </div>
              <h3 className="font-bold text-sm mb-1" style={{ color: c.color }}>{c.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">{c.desc}</p>
              {c.stats.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border/40">
                  {c.stats.map((s) => (
                    <div key={s.label} className="text-center">
                      <div className="text-lg font-black" style={{ color: c.color }}>{s.value}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
              {c.href && (
                <div className="pt-3 border-t border-border/40">
                  <span className="text-xs font-mono text-muted-foreground/50">{c.href}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Links rápidos */}
      <div className="glass-card rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Acesso rápido — links diretos</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Portal do cliente",  href: "/portal/{token}",  desc: "Acesse via token do projeto" },
            { label: "OS do técnico",      href: "/os/{token}",      desc: "Acesse via token da OS" },
            { label: "Site institucional", href: "/",                desc: "Página pública ELYON" },
          ].map((l) => (
            <a key={l.label} href={l.href.includes("{") ? "#" : l.href} target={l.href.includes("{") ? undefined : "_blank"} rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary-glow/40 hover:bg-primary/5 transition-all group">
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary-glow transition-colors flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold">{l.label}</p>
                <p className="text-xs text-muted-foreground font-mono">{l.href}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};


// ── Tab: Financeiro ───────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (v: number, t: number) => t > 0 ? `${Math.round((v / t) * 100)}%` : "—";

const FinanceiroTab = () => {
  const [itens, setItens]       = React.useState<{ tipo: "receita" | "custo"; valor: number; projeto_titulo: string }[]>([]);
  const [projetos, setProjetos] = React.useState<{ id: string; titulo: string; cliente_nome: string; status: string; valor_proposta: number }[]>([]);
  const [loading, setLoading]   = React.useState(true);
  // financeiro: sem estado de erro (graceful empty)

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [finRes, projRes] = await Promise.all([
          supabase.from("financeiro_itens").select("tipo, valor, projeto:projeto_id(titulo)"),
          supabase.from("projetos").select("id, titulo, cliente_nome, status, valor_proposta").order("created_at", { ascending: false }),
        ]);
        if (finRes.error) throw finRes.error;
        if (projRes.error) throw projRes.error;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setItens((finRes.data ?? []).map((i: any) => ({
          tipo: i.tipo as "receita" | "custo",
          valor: Number(i.valor),
          projeto_titulo: i.projeto?.titulo ?? "—",
        })));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProjetos((projRes.data ?? []) as any);
      } catch (_e: unknown) {
        setItens([]);
        setProjetos([]);
      } finally { setLoading(false); }
    })();
  }, []);

  const receita = itens.filter((i) => i.tipo === "receita").reduce((s, i) => s + i.valor, 0);
  const custo   = itens.filter((i) => i.tipo === "custo").reduce((s, i) => s + i.valor, 0);
  const margem  = receita - custo;
  const totalProposta = projetos.reduce((s, p) => s + Number(p.valor_proposta ?? 0), 0);

  const statusColors: Record<string, string> = {
    planejamento: "#a78bfa", em_andamento: "#38bdf8",
    pausado: "#fbbf24", concluido: "#34d399", cancelado: "#f87171",
  };

  const porProjeto = projetos.map((p) => {
    const pItens = itens.filter((i) => i.projeto_titulo === p.titulo);
    const r = pItens.filter((i) => i.tipo === "receita").reduce((s, i) => s + i.valor, 0);
    const c = pItens.filter((i) => i.tipo === "custo").reduce((s, i) => s + i.valor, 0);
    return { ...p, receita: r, custo: c, margem: r - c };
  });

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary-glow" /></div>;
  // sem banner de erro — dados financeiros mostram vazio se RLS bloquear

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Receita total",     value: fmt(receita),      color: "#34d399", icon: <TrendingUp   className="h-4 w-4" /> },
          { label: "Custo total",       value: fmt(custo),         color: "#f87171", icon: <TrendingDown className="h-4 w-4" /> },
          { label: "Margem bruta",      value: fmt(margem),        color: margem >= 0 ? "#a78bfa" : "#f87171", icon: <DollarSign className="h-4 w-4" /> },
          { label: "Propostas (total)", value: fmt(totalProposta), color: "#fbbf24", icon: <BarChart2   className="h-4 w-4" /> },
        ].map((k) => (
          <div key={k.label} className="glass-card rounded-xl p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg mt-0.5" style={{ background: `${k.color}18`, color: k.color }}>{k.icon}</div>
            <div>
              <div className="text-xl font-black" style={{ color: k.color }}>{k.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {receita > 0 && (
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Margem bruta</span>
            <span className="text-sm font-bold" style={{ color: margem >= 0 ? "#a78bfa" : "#f87171" }}>{pct(margem, receita)}</span>
          </div>
          <div className="h-2 rounded-full bg-card/60 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, (margem / receita) * 100))}%`, background: margem >= 0 ? "#a78bfa" : "#f87171" }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
            <span>Custo: {pct(custo, receita)}</span>
            <span>Receita: {fmt(receita)}</span>
          </div>
        </div>
      )}

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-primary-glow" /><span className="font-semibold text-sm">Projetos — breakdown financeiro</span></div>
          <span className="text-xs text-muted-foreground">{projetos.length} projeto(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {["Projeto", "Cliente", "Status", "Receita", "Custo", "Margem", "Proposta"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {porProjeto.map((p, i) => {
                const cor  = statusColors[p.status] ?? "#94a3b8";
                const mPct = p.receita > 0 ? Math.round((p.margem / p.receita) * 100) : null;
                return (
                  <tr key={p.id} className={`border-b border-border/30 hover:bg-primary/5 transition-colors ${i % 2 !== 0 ? "bg-card/20" : ""}`}>
                    <td className="px-4 py-3 font-medium max-w-[160px] truncate">{p.titulo}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.cliente_nome}</td>
                    <td className="px-4 py-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={{ color: cor, borderColor: `${cor}40`, background: `${cor}12` }}>{p.status.replace("_", " ")}</span></td>
                    <td className="px-4 py-3 font-mono text-xs text-green-400">{p.receita > 0 ? fmt(p.receita) : "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-red-400">{p.custo   > 0 ? fmt(p.custo)   : "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: p.margem >= 0 ? "#a78bfa" : "#f87171" }}>
                      {p.receita > 0 ? `${fmt(p.margem)}${mPct !== null ? ` (${mPct}%)` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-accent">{Number(p.valor_proposta) > 0 ? fmt(Number(p.valor_proposta)) : "—"}</td>
                  </tr>
                );
              })}
              {projetos.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">Nenhum projeto cadastrado ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-right">
        <a href="/admin/projetos" className="inline-flex items-center gap-1.5 text-xs text-primary-glow hover:underline">
          <ExternalLink className="h-3 w-3" /> Abrir gestão de projetos
        </a>
      </div>
    </div>
  );
};


// ── Tab: Sistema ─────────────────────────────────────────────

const SistemaTab = () => {
  const [counts, setCounts]   = React.useState<{ tabela: string; label: string; icon: React.ReactNode; count: number | null; erro: string | null }[]>([]);
  const [loading, setLoading] = React.useState(true);

  const envVars = [
    { key: "VITE_SUPABASE_URL",      value: import.meta.env.VITE_SUPABASE_URL      as string | undefined },
    { key: "VITE_SUPABASE_ANON_KEY", value: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined },
    { key: "VITE_ZAPI_INSTANCE_ID",  value: import.meta.env.VITE_ZAPI_INSTANCE_ID  as string | undefined },
    { key: "VITE_ZAPI_TOKEN",        value: import.meta.env.VITE_ZAPI_TOKEN        as string | undefined },
    { key: "VITE_ZAPI_PHONE",        value: import.meta.env.VITE_ZAPI_PHONE        as string | undefined },
  ];

  const tabelasDef = [
    { tabela: "leads",            label: "Leads",             icon: <Activity    className="h-3.5 w-3.5" /> },
    { tabela: "projetos",         label: "Projetos",          icon: <FolderOpen  className="h-3.5 w-3.5" /> },
    { tabela: "ordens_servico",   label: "Ordens de serviço", icon: <Wrench      className="h-3.5 w-3.5" /> },
    { tabela: "chamados_suporte", label: "Chamados",          icon: <TicketCheck className="h-3.5 w-3.5" /> },
    { tabela: "financeiro_itens", label: "Itens financeiros", icon: <DollarSign  className="h-3.5 w-3.5" /> },
    { tabela: "propostas",        label: "Propostas",         icon: <BarChart2   className="h-3.5 w-3.5" /> },
  ];

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const results = await Promise.all(
        tabelasDef.map(async (t) => {
          try {
            const { count, error } = await supabase.from(t.tabela).select("*", { count: "exact", head: true });
            return { ...t, count: error ? null : (count ?? 0), erro: error ? error.message : null };
          } catch (e: unknown) {
            return { ...t, count: null, erro: e instanceof Error ? e.message : "Erro" };
          }
        })
      );
      setCounts(results);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const supabaseOk = counts.some((c) => c.count !== null);
  const envOk      = envVars.filter((e) => !!e.value).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Supabase",             ok: !loading && supabaseOk,         desc: loading ? "Verificando..." : supabaseOk ? "Conectado e respondendo" : "Sem resposta",    icon: <Database    className="h-5 w-5" /> },
          { label: "Variáveis de ambiente", ok: envOk === envVars.length,       desc: `${envOk}/${envVars.length} configuradas`,                                              icon: <ShieldCheck className="h-5 w-5" /> },
          { label: "Auth admin",            ok: true,                           desc: "Senha local sessionStorage (provisório)",                                               icon: <Activity    className="h-5 w-5" /> },
        ].map((s) => (
          <div key={s.label} className={`glass-card rounded-xl p-4 border ${s.ok ? "border-green-500/20" : "border-red-500/20"}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${s.ok ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>{s.icon}</div>
              <span className="font-semibold text-sm">{s.label}</span>
              <span className={`ml-auto h-2 w-2 rounded-full ${s.ok ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            </div>
            <p className="text-xs text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary-glow" />
          <span className="font-semibold text-sm">Variáveis de ambiente</span>
        </div>
        <div className="divide-y divide-border/40">
          {envVars.map((e) => {
            const ok      = !!e.value;
            const preview = e.value ? (e.key.includes("KEY") || e.key.includes("TOKEN") ? `${e.value.slice(0,8)}...${e.value.slice(-4)}` : e.value.length > 40 ? `${e.value.slice(0,40)}...` : e.value) : undefined;
            return (
              <div key={e.key} className="flex items-center gap-3 px-5 py-3">
                {ok ? <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />}
                <code className="text-xs font-mono text-foreground flex-1">{e.key}</code>
                <span className={`text-xs font-mono ${ok ? "text-muted-foreground" : "text-red-400"}`}>{ok ? preview : "NÃO DEFINIDA"}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2">
          <Database className="h-4 w-4 text-primary-glow" />
          <span className="font-semibold text-sm">Tabelas — registros</span>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />}
        </div>
        <div className="divide-y divide-border/40">
          {counts.map((t) => (
            <div key={t.tabela} className="flex items-center gap-3 px-5 py-3">
              <div className={t.erro ? "text-red-400" : "text-primary-glow"}>{t.icon}</div>
              <span className="text-sm flex-1">{t.label}</span>
              <code className="text-xs font-mono text-muted-foreground">{t.tabela}</code>
              <span className={`text-sm font-bold min-w-[40px] text-right ${t.erro ? "text-red-400" : "text-foreground"}`}>
                {loading ? "…" : t.erro ? "ERR" : String(t.count ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-primary-glow" />
          <span className="font-semibold text-sm">Painéis admin</span>
        </div>
        <div className="divide-y divide-border/40">
          {[
            { label: "Leads (pipeline)", href: "/admin",          icon: <Activity   className="h-3.5 w-3.5" /> },
            { label: "Projetos",         href: "/admin/projetos", icon: <FolderOpen className="h-3.5 w-3.5" /> },
            { label: "Chamados",         href: "/admin/chamados", icon: <TicketCheck className="h-3.5 w-3.5" /> },
          ].map((p) => (
            <a key={p.href} href={p.href} className="flex items-center gap-3 px-5 py-3 hover:bg-primary/5 transition-colors group">
              <div className="text-muted-foreground group-hover:text-primary-glow transition-colors">{p.icon}</div>
              <span className="text-sm flex-1">{p.label}</span>
              <code className="text-xs font-mono text-muted-foreground">{p.href}</code>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary-glow transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ELYON Group · Painel Admin — Pipeline de Leads
// Rota: /admin  (protegida por Supabase Auth)
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import {
  LogOut, RefreshCw, Phone, Mail, MessageCircle,
  ChevronRight, StickyNote, X, Check, Search,
  BarChart2, Activity, Database, CheckCircle2, AlertCircle,
  DollarSign, TrendingUp, TrendingDown, FolderOpen,
  TicketCheck, Wrench, ExternalLink, Loader2, ShieldCheck, Home,
} from "lucide-react";
import {
  supabase,
  fetchLeads,
  fetchPipelineResumo,
  updateLeadStatus,
  updateLeadNotas,
  type Lead,
  type LeadStatus,
  type PipelineResumo,
} from "@/lib/supabase";

// ── Config das colunas do pipeline ───────────────────────────

const COLUMNS: { status: LeadStatus; label: string; color: string; bg: string }[] = [
  { status: "novo",       label: "Novos",          color: "#a78bfa", bg: "rgba(167,139,250,0.08)" },
  { status: "em_contato", label: "Em contato",     color: "#38bdf8", bg: "rgba(56,189,248,0.08)"  },
  { status: "proposta",   label: "Proposta",        color: "#fbbf24", bg: "rgba(251,191,36,0.08)"  },
  { status: "fechado",    label: "Fechado ✓",       color: "#34d399", bg: "rgba(52,211,153,0.08)"  },
  { status: "perdido",    label: "Perdido",         color: "#f87171", bg: "rgba(248,113,113,0.08)" },
];

function statusColor(s: LeadStatus) {
  return COLUMNS.find((c) => c.status === s)?.color ?? "#94a3b8";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function whatsappLink(phone: string, nome: string) {
  const digits = phone.replace(/\D/g, "");
  const number = digits.startsWith("55") ? digits : `55${digits}`;
  const msg = encodeURIComponent(`Olá, ${nome}! Aqui é da ELYON Group. Passando para retornar seu contato sobre o orçamento. 😊`);
  return `https://wa.me/${number}?text=${msg}`;
}

// ── Componente principal ──────────────────────────────────────

// Senha do painel admin (altere aqui se quiser trocar)
const ADMIN_PASSWORD = "elyon2026";
const SESSION_KEY = "elyon_admin_ok";

export const Admin = () => {
  const [session, setSession] = useState<boolean | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass]   = useState("");
  const [loginErr, setLoginErr]     = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Verifica sessão salva no sessionStorage
  useEffect(() => {
    const ok = sessionStorage.getItem(SESSION_KEY) === "1";
    setSession(ok);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr("");
    setLoginLoading(true);
    await new Promise((r) => setTimeout(r, 400)); // simula latência
    if (loginPass === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setSession(true);
    } else {
      setLoginErr("Senha incorreta.");
    }
    setLoginLoading(false);
  };

  if (session === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-primary-glow/40 border-t-primary-glow animate-spin" />
      </div>
    );
  }

  if (!session) return <LoginScreen onLogin={handleLogin} email={loginEmail} setEmail={setLoginEmail} pass={loginPass} setPass={setLoginPass} err={loginErr} loading={loginLoading} />;

  return <Dashboard />;
};

// ── Tela de login ─────────────────────────────────────────────

const LoginScreen = ({ onLogin, email, setEmail, pass, setPass, err, loading }: {
  onLogin: (e: React.FormEvent) => void;
  email: string; setEmail: (v: string) => void;
  pass: string;  setPass:  (v: string) => void;
  err: string;   loading: boolean;
}) => (
  <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
    <div className="absolute inset-0" style={{
      backgroundImage: "linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)",
      backgroundSize: "40px 40px",
    }} />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full"
      style={{ background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)", filter: "blur(40px)" }}
    />
    <div className="relative w-full max-w-sm mx-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="font-bold text-lg tracking-tight">
            ELYON <span className="text-primary-glow">Group</span>
          </span>
        </div>
        <p className="text-sm text-muted-foreground">Painel Administrativo</p>
      </div>
      <form onSubmit={onLogin} className="glass-card glow-border rounded-2xl p-8 space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@elyongroup.com.br"
            className="w-full px-4 py-3 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all" />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Senha</label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} required placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all" />
        </div>
        {err && <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{err}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm hover:shadow-yellow transition-all hover:-translate-y-0.5 disabled:opacity-50">
          {loading ? "Entrando..." : "Entrar no Painel"}
        </button>
      </form>
    </div>
  </div>
);

// ── Dashboard principal ───────────────────────────────────────

const Dashboard = () => {
  const [leads, setLeads]     = useState<Lead[]>([]);
  const [resumo, setResumo]   = useState<PipelineResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [view, setView]       = useState<"kanban" | "list">("kanban");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "leads" | "financeiro" | "sistema">("home");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, r] = await Promise.all([fetchLeads(), fetchPipelineResumo()]);
      setLeads(l);
      setResumo(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: string, status: LeadStatus) => {
    await updateLeadStatus(id, status);
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : null);
  };

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.nome.toLowerCase().includes(q) ||
           l.email.toLowerCase().includes(q) ||
           l.telefone.includes(q) ||
           (l.servico ?? "").toLowerCase().includes(q);
  });

  const byStatus = (s: LeadStatus) => filtered.filter((l) => l.status === s);
  const totalLeads = leads.length;
  const novosHoje  = leads.filter((l) => new Date(l.created_at).toDateString() === new Date().toDateString()).length;
  const fechados   = leads.filter((l) => l.status === "fechado").length;

  const handleLogout = () => { sessionStorage.removeItem(SESSION_KEY); window.location.reload(); };

  return (
    <div className="min-h-screen bg-background text-foreground" style={{
      backgroundImage: "linear-gradient(rgba(124,58,237,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.03) 1px, transparent 1px)",
      backgroundSize: "40px 40px",
    }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="font-bold text-base tracking-tight">
              ELYON <span className="text-primary-glow">Group</span>
            </span>
            <span className="hidden sm:inline text-xs text-muted-foreground px-2 py-0.5 rounded-md border border-border">Admin</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Nav tabs */}
            <nav className="flex items-center rounded-lg border border-border overflow-hidden">
              {([
                { id: "home",       label: "Início",     icon: <Home       className="h-3 w-3" /> },
                { id: "leads",      label: "Leads",      icon: <Activity   className="h-3 w-3" /> },
                { id: "financeiro", label: "Financeiro", icon: <BarChart2  className="h-3 w-3" /> },
                { id: "sistema",    label: "Sistema",    icon: <Database   className="h-3 w-3" /> },
              ] as const).map((t) => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors border-r border-border last:border-0 ${activeTab === t.id ? "bg-primary/15 text-primary-glow" : "text-muted-foreground hover:text-foreground"}`}>
                  {t.icon}{t.label}
                </button>
              ))}
            </nav>
            {activeTab === "leads" && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar lead..."
                    className="pl-8 pr-4 py-2 rounded-lg bg-card/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary-glow/50 w-44 transition-all" />
                </div>
                <div className="flex items-center rounded-lg border border-border overflow-hidden">
                  {(["kanban", "list"] as const).map((v) => (
                    <button key={v} onClick={() => setView(v)}
                      className={`px-3 py-1.5 text-xs font-semibold transition-colors ${view === v ? "bg-primary/15 text-primary-glow" : "text-muted-foreground hover:text-foreground"}`}>
                      {v === "kanban" ? "Kanban" : "Lista"}
                    </button>
                  ))}
                </div>
                <button onClick={load} disabled={loading}
                  className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
              </>
            )}
            <button onClick={handleLogout}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-red-400 hover:border-red-400/40 transition-colors" title="Sair">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-8">

        {activeTab === "home"       && <HomeTab onNavigate={setActiveTab} leads={leads} resumo={resumo} />}
        {activeTab === "financeiro" && <FinanceiroTab />}
        {activeTab === "sistema"    && <SistemaTab />}

        {activeTab === "leads" && <>
        {/* Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total de leads", value: totalLeads, color: "#a78bfa" },
            { label: "Novos hoje",     value: novosHoje,  color: "#fbbf24" },
            { label: "Fechados",       value: fechados,   color: "#34d399" },
            { label: "Taxa conversão", value: totalLeads ? `${Math.round((fechados / totalLeads) * 100)}%` : "—", color: "#38bdf8" },
          ].map((m) => (
            <div key={m.label} className="glass-card rounded-xl p-4">
              <div className="text-2xl font-black" style={{ color: m.color }}>{m.value}</div>
              <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Kanban */}
        {view === "kanban" && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((col) => {
              const colLeads = byStatus(col.status);
              return (
                <div key={col.status} className="flex-shrink-0 w-72">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: col.color }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: col.color }}>{col.label}</span>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground bg-card/40 px-2 py-0.5 rounded-full border border-border">{colLeads.length}</span>
                  </div>
                  <div className="space-y-3 min-h-[100px]">
                    {colLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} onSelect={() => setSelected(lead)}
                        onStatusChange={handleStatusChange} highlight={col.color} />
                    ))}
                    {colLeads.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border/50 p-4 text-center text-xs text-muted-foreground/50">
                        Vazio
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lista */}
        {view === "list" && (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    {["Nome", "Serviço", "Telefone", "Status", "Data", "Ações"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, i) => (
                    <tr key={lead.id}
                      className={`border-b border-border/30 hover:bg-primary/5 transition-colors cursor-pointer ${i % 2 === 0 ? "" : "bg-card/20"}`}
                      onClick={() => setSelected(lead)}>
                      <td className="px-4 py-3 font-medium">{lead.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lead.servico || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lead.telefone}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-1 rounded-full border"
                          style={{ color: statusColor(lead.status), borderColor: `${statusColor(lead.status)}40`, background: `${statusColor(lead.status)}12` }}>
                          {COLUMNS.find((c) => c.status === lead.status)?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(lead.created_at)}</td>
                      <td className="px-4 py-3">
                        <a href={whatsappLink(lead.telefone, lead.nome)} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors">
                          <MessageCircle className="h-3.5 w-3.5" /> WA
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">Nenhum lead encontrado.</div>
              )}
            </div>
          </div>
        )}
        </>}
      </div>

      {/* Drawer de detalhe */}
      {selected && (
        <LeadDrawer lead={selected} onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange} />
      )}
    </div>
  );
};

// ── Card do lead (kanban) ─────────────────────────────────────

const LeadCard = ({ lead, onSelect, onStatusChange, highlight }: {
  lead: Lead;
  onSelect: () => void;
  onStatusChange: (id: string, s: LeadStatus) => void;
  highlight: string;
}) => {
  const nextStatus = COLUMNS[COLUMNS.findIndex((c) => c.status === lead.status) + 1];

  return (
    <div
      className="glass-card rounded-xl p-4 cursor-pointer hover:shadow-glow transition-all duration-300 hover:-translate-y-0.5 group"
      style={{ borderColor: `${highlight}25` }}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="font-semibold text-sm leading-tight">{lead.nome}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{lead.servico || "Serviço não informado"}</p>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
          {new Date(lead.created_at).toLocaleDateString("pt-BR")}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground truncate">{lead.telefone}</span>
      </div>

      {lead.mensagem && (
        <p className="text-xs text-muted-foreground/70 line-clamp-2 mb-3 italic">
          "{lead.mensagem}"
        </p>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-border/40">
        <a href={whatsappLink(lead.telefone, lead.nome)} target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold text-accent border border-accent/25 bg-accent/8 hover:bg-accent/15 transition-colors">
          <MessageCircle className="h-3 w-3" /> WhatsApp
        </a>
        {nextStatus && (
          <button
            onClick={(e) => { e.stopPropagation(); onStatusChange(lead.id, nextStatus.status); }}
            className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold border border-border/50 hover:bg-card/60 transition-colors text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-3 w-3" /> {nextStatus.label}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Drawer de detalhe ─────────────────────────────────────────

const LeadDrawer = ({ lead, onClose, onStatusChange }: {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (id: string, s: LeadStatus) => void;
}) => {
  const [notas, setNotas]       = useState(lead.notas ?? "");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  const saveNotas = async () => {
    setSaving(true);
    await updateLeadNotas(lead.id, notas);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-background border-l border-border overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
          <div>
            <h3 className="font-display font-bold text-lg">{lead.nome}</h3>
            <p className="text-xs text-muted-foreground">{formatDate(lead.created_at)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-card/60 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 px-6 py-6 space-y-6">
          {/* Status */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Status do pipeline</p>
            <div className="grid grid-cols-1 gap-2">
              {COLUMNS.map((col) => (
                <button key={col.status}
                  onClick={() => onStatusChange(lead.id, col.status)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${lead.status === col.status ? "border-opacity-60 bg-opacity-15" : "border-border/40 text-muted-foreground hover:bg-card/40"}`}
                  style={lead.status === col.status ? {
                    borderColor: col.color, color: col.color,
                    background: col.bg,
                  } : {}}>
                  {lead.status === col.status && <Check className="h-3.5 w-3.5" />}
                  {col.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contato */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Contato</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{lead.telefone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{lead.email}</span>
              </div>
            </div>
            <a href={whatsappLink(lead.telefone, lead.nome)} target="_blank" rel="noopener noreferrer"
              className="mt-3 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm hover:shadow-yellow transition-all hover:-translate-y-0.5">
              <MessageCircle className="h-4 w-4" />
              Abrir WhatsApp
            </a>
          </div>

          {/* Serviço & Mensagem */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Serviço solicitado</p>
            <p className="text-sm text-foreground">{lead.servico || "Não especificado"}</p>
          </div>
          {lead.mensagem && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Mensagem do lead</p>
              <div className="glass-card rounded-xl p-4">
                <p className="text-sm text-muted-foreground leading-relaxed italic">"{lead.mensagem}"</p>
              </div>
            </div>
          )}

          {/* Notas internas */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Notas internas</p>
            </div>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={4}
              placeholder="Registre observações, próximos passos, proposta enviada..."
              className="w-full px-4 py-3 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all resize-none" />
            <button onClick={saveNotas} disabled={saving}
              className={`mt-2 w-full py-2.5 rounded-xl text-xs font-bold border transition-all ${saved ? "border-green-500/40 text-green-400 bg-green-500/10" : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"}`}>
              {saved ? "✓ Salvo!" : saving ? "Salvando..." : "Salvar notas"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
