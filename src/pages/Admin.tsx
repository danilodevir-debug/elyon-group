// ============================================================
// ELYON Group · Painel Admin — Pipeline de Leads
// Rota: /admin  (protegida por Supabase Auth)
// ============================================================

import { useEffect, useState, useCallback } from "react";
import {
  LogOut, RefreshCw, Phone, Mail, MessageCircle,
  ChevronRight, StickyNote, X, Check, Search,
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
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar lead..."
                className="pl-8 pr-4 py-2 rounded-lg bg-card/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary-glow/50 w-48 transition-all" />
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
            <button onClick={handleLogout}
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
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
