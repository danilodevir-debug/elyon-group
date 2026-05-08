// ============================================================
// ELYON Group · Ordem de Serviço para Técnicos em Campo
// Rota: /os/:token — acesso sem login via token único
// Mobile-first, dark premium design
// ============================================================

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import {
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  Circle,
  ClipboardList,
  Loader2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Clock,
  User,
  Wrench,
  CheckCheck,
} from "lucide-react";

// ── Supabase client com token do técnico no header ───────────
// O RLS (camada-03/schema.sql) valida x-os-token em cada query anon.
// Criamos um client por token, igual ao padrão do PortalCliente.
const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function criarClienteOS(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { "x-os-token": token },
    },
  });
}

// ── Tipos ─────────────────────────────────────────────────────

type OSStatus = "pendente" | "em_andamento" | "concluida" | "cancelada";

interface Projeto {
  titulo: string;
  cliente_nome: string;
  cliente_telefone: string;
  endereco: string;
}

interface OrdemServico {
  id: string;
  titulo: string;
  descricao: string;
  status: OSStatus;
  tecnico_nome: string;
  data_agendada: string | null;
  data_inicio_real: string | null;
  data_conclusao: string | null;
  observacoes_tecnico: string | null;
  token_acesso: string;
  projeto: Projeto;
}

interface ChecklistItem {
  id: string;
  os_id: string;
  descricao: string;
  concluido: boolean;
  concluido_em: string | null;
  ordem: number;
}

// ── Helpers de data/hora ──────────────────────────────────────

/** Formata data agendada de forma amigável: "Hoje, 14:00" ou "Seg, 12/05 às 09:00" */
function formatarDataAgendada(isoString: string | null): string {
  if (!isoString) return "Não agendada";
  const data = new Date(isoString);
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);

  const hora = data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const ehHoje =
    data.toDateString() === hoje.toDateString();
  const ehAmanha =
    data.toDateString() === amanha.toDateString();

  if (ehHoje) return `Hoje, ${hora}`;
  if (ehAmanha) return `Amanhã, ${hora}`;

  const diaSemana = data.toLocaleDateString("pt-BR", { weekday: "short" });
  const diaMes = data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${diaSemana.replace(".", "")}, ${diaMes} às ${hora}`;
}

/** Formata uma duração em minutos para "Xh Ym" ou "Y min" */
function formatarDuracao(inicio: string, fim: string): string {
  const diffMs = new Date(fim).getTime() - new Date(inicio).getTime();
  const totalMin = Math.round(diffMs / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/** Formata hora no formato HH:MM */
function formatarHora(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Componente de loading ─────────────────────────────────────

function TelaLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6"
         style={{ background: "#09090f" }}>
      <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-glow animate-spin" />
      </div>
      <p className="text-muted-foreground text-base">Carregando ordem de serviço...</p>
    </div>
  );
}

// ── Componente de erro / token inválido ───────────────────────

function TelaErro({ mensagem }: { mensagem: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
         style={{ background: "#09090f" }}>
      <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <div>
        <h1 className="font-display text-xl font-bold text-white mb-2">
          Ordem não encontrada
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{mensagem}</p>
      </div>
    </div>
  );
}

// ── Componente OS cancelada ───────────────────────────────────

function TelaCancelada({ os }: { os: OrdemServico }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
         style={{ background: "#09090f" }}>
      <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
        <XCircle className="w-8 h-8 text-red-400" />
      </div>
      <div>
        <h1 className="font-display text-xl font-bold text-white mb-1">
          OS Cancelada
        </h1>
        <p className="text-muted-foreground text-sm mb-4">{os.titulo}</p>
        <p className="text-muted-foreground text-sm">
          Esta ordem de serviço foi cancelada. Entre em contato com o escritório para mais informações.
        </p>
      </div>
    </div>
  );
}

// ── Componente de conclusão com animação ─────────────────────

function TelaConcluida({ os, totalItens }: { os: OrdemServico; totalItens: number }) {
  const duracao =
    os.data_inicio_real && os.data_conclusao
      ? formatarDuracao(os.data_inicio_real, os.data_conclusao)
      : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
         style={{ background: "#09090f" }}>
      {/* Ícone animado */}
      <div className="w-24 h-24 rounded-full bg-green-500/15 border-2 border-green-500/50 flex items-center justify-center shadow-glow"
           style={{ animation: "pulse 2s ease-in-out infinite" }}>
        <CheckCheck className="w-12 h-12 text-green-400" />
      </div>

      <div>
        <h1 className="font-display text-2xl font-bold text-white mb-2">
          OS Concluída!
        </h1>
        <p className="text-muted-foreground text-sm">{os.titulo}</p>
      </div>

      {/* Resumo */}
      <div className="glass-card glow-border w-full max-w-sm rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Itens concluídos</span>
          <span className="text-white font-semibold">{totalItens} de {totalItens}</span>
        </div>
        {os.data_inicio_real && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Início</span>
            <span className="text-white font-semibold">{formatarHora(os.data_inicio_real)}</span>
          </div>
        )}
        {os.data_conclusao && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Conclusão</span>
            <span className="text-white font-semibold">{formatarHora(os.data_conclusao)}</span>
          </div>
        )}
        {duracao && (
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-muted-foreground text-sm">Duração total</span>
            <span className="text-accent font-bold text-base">{duracao}</span>
          </div>
        )}
      </div>

      <p className="text-muted-foreground text-sm">
        Você pode fechar esta janela agora.
      </p>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────

export default function OrdemServico() {
  const { token } = useParams<{ token: string }>();

  // Client Supabase com o token do técnico injetado no header
  // Criado uma única vez por token (memo manual com ref)
  const supabase = token ? criarClienteOS(token) : null;

  // Estados principais
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [os, setOs] = useState<OrdemServico | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  // Estados de interação
  const [iniciandoOS, setIniciandoOS] = useState(false);
  const [concluindoOS, setConcluindoOS] = useState(false);
  const [confirmarConclusao, setConfirmarConclusao] = useState(false);
  const [itemAtualizando, setItemAtualizando] = useState<Set<string>>(new Set());
  const [observacoes, setObservacoes] = useState("");
  const [salvandoObs, setSalvandoObs] = useState<"idle" | "salvando" | "salvo">("idle");

  // Ref para debounce das observações
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Busca inicial dos dados ───────────────────────────────

  useEffect(() => {
    if (!token || !supabase) {
      setErro("Token de acesso não informado.");
      setLoading(false);
      return;
    }
    buscarOS();
  }, [token]);

  async function buscarOS() {
    if (!supabase || !token) return;
    try {
      // Busca a OS com dados do projeto — o RLS valida x-os-token no header
      const { data: osData, error: osError } = await supabase
        .from("ordens_servico")
        .select("*, projeto:projeto_id(titulo, cliente_nome, cliente_telefone, endereco)")
        .eq("token_acesso", token)
        .single();

      if (osError || !osData) {
        setErro("Link inválido ou expirado. Solicite um novo link ao escritório.");
        return;
      }

      setOs(osData as OrdemServico);
      setObservacoes(osData.observacoes_tecnico || "");

      // Busca checklist apenas se OS está ativa ou concluída
      if (osData.status !== "cancelada") {
        const { data: itemsData, error: itemsError } = await supabase
          .from("checklist_items")
          .select("*")
          .eq("os_id", osData.id)
          .order("ordem");

        if (!itemsError && itemsData) {
          setChecklist(itemsData as ChecklistItem[]);
        }
      }
    } catch (e) {
      setErro("Erro ao carregar a ordem de serviço. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }

  // ── Iniciar OS ────────────────────────────────────────────

  async function iniciarOS() {
    if (!os || !token || !supabase || iniciandoOS) return;
    setIniciandoOS(true);
    try {
      const agora = new Date().toISOString();
      const { error } = await supabase
        .from("ordens_servico")
        .update({ status: "em_andamento", data_inicio_real: agora })
        .eq("token_acesso", token);

      if (error) throw error;
      setOs((prev) =>
        prev ? { ...prev, status: "em_andamento", data_inicio_real: agora } : prev
      );
    } catch {
      alert("Erro ao iniciar a OS. Tente novamente.");
    } finally {
      setIniciandoOS(false);
    }
  }

  // ── Marcar/desmarcar item do checklist ────────────────────

  async function toggleItem(item: ChecklistItem) {
    if (itemAtualizando.has(item.id) || !supabase) return;

    // Otimistic update: atualiza imediatamente na UI
    const novoConcluido = !item.concluido;
    const agora = new Date().toISOString();

    setChecklist((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, concluido: novoConcluido, concluido_em: novoConcluido ? agora : null }
          : i
      )
    );
    setItemAtualizando((prev) => new Set(prev).add(item.id));

    try {
      const { error } = await supabase
        .from("checklist_items")
        .update({
          concluido: novoConcluido,
          concluido_em: novoConcluido ? agora : null,
        })
        .eq("id", item.id);

      if (error) {
        // Reverte se falhou
        setChecklist((prev) =>
          prev.map((i) => (i.id === item.id ? item : i))
        );
      }
    } catch {
      // Reverte se falhou
      setChecklist((prev) =>
        prev.map((i) => (i.id === item.id ? item : i))
      );
    } finally {
      setItemAtualizando((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  // ── Auto-save de observações (debounce 2s) ────────────────

  const salvarObservacoes = useCallback(
    async (texto: string) => {
      if (!token || !supabase) return;
      setSalvandoObs("salvando");
      try {
        await supabase
          .from("ordens_servico")
          .update({ observacoes_tecnico: texto })
          .eq("token_acesso", token);
        setSalvandoObs("salvo");
        // Limpa o indicador "Salvo" após 3s
        setTimeout(() => setSalvandoObs("idle"), 3000);
      } catch {
        setSalvandoObs("idle");
      }
    },
    [token]
  );

  function handleObservacoesChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const texto = e.target.value;
    setObservacoes(texto);
    setSalvandoObs("salvando");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      salvarObservacoes(texto);
    }, 2000);
  }

  // ── Concluir OS ───────────────────────────────────────────

  async function concluirOS() {
    if (!os || !token || !supabase || concluindoOS) return;
    setConcluindoOS(true);
    try {
      const agora = new Date().toISOString();
      const { error } = await supabase
        .from("ordens_servico")
        .update({ status: "concluida", data_conclusao: agora })
        .eq("token_acesso", token);

      if (error) throw error;
      setOs((prev) =>
        prev ? { ...prev, status: "concluida", data_conclusao: agora } : prev
      );
      setConfirmarConclusao(false);
    } catch {
      alert("Erro ao concluir a OS. Tente novamente.");
    } finally {
      setConcluindoOS(false);
    }
  }

  // ── Cálculos derivados ────────────────────────────────────

  const totalItens = checklist.length;
  const itensConcluidos = checklist.filter((i) => i.concluido).length;
  const progressoPct = totalItens > 0 ? Math.round((itensConcluidos / totalItens) * 100) : 0;
  const todosConc = totalItens > 0 && itensConcluidos === totalItens;

  // ── Renders condicionais ──────────────────────────────────

  if (loading) return <TelaLoading />;
  if (erro) return <TelaErro mensagem={erro} />;
  if (!os) return <TelaErro mensagem="Ordem de serviço não encontrada." />;
  if (os.status === "cancelada") return <TelaCancelada os={os} />;
  if (os.status === "concluida") return <TelaConcluida os={os} totalItens={totalItens} />;

  // ── Tela principal (pendente | em_andamento) ──────────────

  const projeto = os.projeto;
  const telCliente = projeto?.cliente_telefone?.replace(/\D/g, "");

  return (
    <div className="min-h-screen pb-10" style={{ background: "#09090f" }}>

      {/* ── Header fixo ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 glass-card border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3">
        {/* Logo + nome */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-4 h-4 text-primary-glow" />
          </div>
          <span className="font-display text-sm font-bold text-gradient truncate">
            ELYON Group
          </span>
        </div>

        {/* Badge de status + botão ligar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {os.status === "pendente" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/20 text-accent border border-accent/30">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Pendente
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary-glow border border-primary/30">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-glow"
                    style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
              Em andamento
            </span>
          )}

          {/* Botão ligar para o cliente */}
          {telCliente && (
            <a
              href={`tel:${telCliente}`}
              className="w-10 h-10 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Ligar para o cliente"
            >
              <Phone className="w-4 h-4 text-green-400" />
            </a>
          )}
        </div>
      </header>

      {/* ── Conteúdo principal ──────────────────────────── */}
      <main className="px-4 pt-5 space-y-4 max-w-lg mx-auto">

        {/* Card do projeto */}
        <div className="glass-card glow-border rounded-2xl p-5 space-y-4">
          {/* Título da OS */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Ordem de Serviço
            </p>
            <h1 className="font-display text-lg font-bold text-white leading-tight">
              {os.titulo}
            </h1>
          </div>

          {/* Informações do cliente */}
          <div className="space-y-2.5">
            {/* Cliente */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-primary-glow" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="text-white font-semibold text-base leading-tight">
                  {projeto?.cliente_nome || "—"}
                </p>
              </div>
            </div>

            {/* Endereço */}
            {projeto?.endereco && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-primary-glow" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Endereço</p>
                  <p className="text-white text-base leading-tight">
                    {projeto.endereco}
                  </p>
                </div>
              </div>
            )}

            {/* Data agendada */}
            {os.data_agendada && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Agendamento</p>
                  <p className="text-accent font-semibold text-base leading-tight">
                    {formatarDataAgendada(os.data_agendada)}
                  </p>
                </div>
              </div>
            )}

            {/* Horário de início real */}
            {os.data_inicio_real && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Iniciada às</p>
                  <p className="text-green-400 font-semibold text-base leading-tight">
                    {formatarHora(os.data_inicio_real)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Descrição */}
          {os.descricao && (
            <div className="border-t border-white/10 pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Descrição do serviço
              </p>
              <p className="text-white/80 text-sm leading-relaxed">
                {os.descricao}
              </p>
            </div>
          )}
        </div>

        {/* ── Botão "Iniciar OS" (só se pendente) ─────── */}
        {os.status === "pendente" && (
          <button
            onClick={iniciarOS}
            disabled={iniciandoOS}
            className="w-full h-14 rounded-2xl bg-accent text-accent-foreground font-display font-bold text-base
                       flex items-center justify-center gap-2 shadow-glow
                       active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {iniciandoOS ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <Wrench className="w-5 h-5" />
                Iniciar OS agora
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        )}

        {/* ── Checklist ───────────────────────────────── */}
        {totalItens > 0 && (
          <div className="glass-card rounded-2xl overflow-hidden">
            {/* Header do checklist */}
            <div className="px-5 pt-5 pb-3 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary-glow" />
                  <span className="font-display font-bold text-white text-base">
                    Checklist
                  </span>
                </div>
                <span className="text-sm font-semibold text-muted-foreground">
                  {itensConcluidos}/{totalItens}
                </span>
              </div>

              {/* Barra de progresso */}
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progressoPct}%`,
                    background: todosConc
                      ? "rgb(34, 197, 94)"
                      : "var(--color-primary, #7c3aed)",
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {progressoPct}% concluído
              </p>
            </div>

            {/* Lista de itens */}
            <div className="divide-y divide-white/5">
              {checklist.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item)}
                  disabled={itemAtualizando.has(item.id) || os.status === "pendente"}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left
                             active:bg-white/5 transition-colors disabled:opacity-60"
                >
                  {/* Checkbox grande e tátil (mínimo 44px) */}
                  <div className="flex-shrink-0 w-11 h-11 flex items-center justify-center">
                    {itemAtualizando.has(item.id) ? (
                      <Loader2 className="w-7 h-7 text-primary-glow animate-spin" />
                    ) : item.concluido ? (
                      <CheckCircle2 className="w-7 h-7 text-green-400"
                                    style={{ filter: "drop-shadow(0 0 6px rgb(74 222 128 / 0.6))" }} />
                    ) : (
                      <Circle className="w-7 h-7 text-muted-foreground/50" />
                    )}
                  </div>

                  {/* Texto do item */}
                  <span
                    className={`text-base leading-snug flex-1 transition-all duration-200 ${
                      item.concluido
                        ? "line-through text-muted-foreground"
                        : "text-white"
                    }`}
                  >
                    {item.descricao}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Observações do técnico ───────────────────── */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-bold text-white text-base">
              Observações
            </p>
            {/* Indicador de auto-save */}
            {salvandoObs === "salvando" && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                Salvando...
              </span>
            )}
            {salvandoObs === "salvo" && (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                Salvo
              </span>
            )}
          </div>

          <textarea
            value={observacoes}
            onChange={handleObservacoesChange}
            placeholder="Registre problemas, observações e materiais usados..."
            rows={5}
            disabled={os.status === "pendente"}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white
                       placeholder:text-muted-foreground/50 text-base leading-relaxed
                       resize-none focus:outline-none focus:border-primary/50 transition-colors
                       disabled:opacity-50"
            style={{ minHeight: "120px" }}
          />

          {os.status === "pendente" && (
            <p className="text-xs text-muted-foreground mt-2">
              Inicie a OS para registrar observações.
            </p>
          )}
        </div>

        {/* ── Botão "Concluir OS" (só quando todos os itens concluídos) ── */}
        {os.status === "em_andamento" && todosConc && (
          <button
            onClick={() => setConfirmarConclusao(true)}
            className="w-full h-14 rounded-2xl bg-green-600 text-white font-display font-bold text-base
                       flex items-center justify-center gap-2
                       active:scale-[0.98] transition-transform"
            style={{ boxShadow: "0 0 24px rgb(34 197 94 / 0.4)" }}
          >
            <CheckCheck className="w-5 h-5" />
            Concluir OS
          </button>
        )}

        {/* Mensagem quando nem todos os itens estão concluídos */}
        {os.status === "em_andamento" && totalItens > 0 && !todosConc && (
          <p className="text-center text-sm text-muted-foreground py-2">
            Conclua todos os itens do checklist para finalizar a OS.
          </p>
        )}

      </main>

      {/* ── Dialog de confirmação de conclusão ──────────── */}
      {confirmarConclusao && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setConfirmarConclusao(false)}
        >
          <div
            className="glass-card glow-border w-full max-w-sm rounded-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30
                              flex items-center justify-center mx-auto mb-4">
                <CheckCheck className="w-7 h-7 text-green-400" />
              </div>
              <h2 className="font-display text-lg font-bold text-white mb-1">
                Confirmar conclusão?
              </h2>
              <p className="text-muted-foreground text-sm">
                Todos os {totalItens} itens foram concluídos. Deseja finalizar a OS?
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={concluirOS}
                disabled={concluindoOS}
                className="w-full h-14 rounded-xl bg-green-600 text-white font-bold text-base
                           flex items-center justify-center gap-2
                           active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {concluindoOS ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Concluindo...
                  </>
                ) : (
                  "Sim, concluir OS"
                )}
              </button>

              <button
                onClick={() => setConfirmarConclusao(false)}
                className="w-full h-12 rounded-xl bg-white/5 text-muted-foreground font-semibold text-base
                           active:scale-[0.98] transition-transform"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
