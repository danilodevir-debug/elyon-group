// ============================================================
// ELYON Group · PropostaBuilder — Criação de Propostas Online
// Componente admin para criar, visualizar e gerenciar propostas
// ============================================================

import { useEffect, useState, useCallback } from "react";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Send,
  Save,
  RefreshCw,
  FilePlus,
  Clock,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Calendar,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase client ──────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnon);

// ── Tipos ────────────────────────────────────────────────────

export type PropostaStatus =
  | "rascunho"
  | "enviada"
  | "visualizada"
  | "aprovada"
  | "recusada"
  | "expirada";

export interface ItemProposta {
  id: string;
  proposta_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ordem: number;
}

export interface PropostaOnline {
  id: string;
  created_at: string;
  updated_at: string;
  projeto_id: string;
  titulo: string;
  introducao: string;
  validade: string;
  valor_total: number;
  status: PropostaStatus;
  enviada_em: string | null;
  visualizada_em: string | null;
  respondida_em: string | null;
  observacao_cliente: string | null;
  criado_por_nome: string;
  itens: ItemProposta[];
}

// Item local para o formulário (sem id de banco ainda)
interface ItemFormulario {
  localId: string; // id temporário para React key
  descricao: string;
  quantidade: number;
  valor_unitario: number;
}

export interface PropostaBuilderProps {
  projetoId: string;
  projetoTitulo: string;
  clienteNome: string;
  clienteToken: string;
}

// ── Constantes ───────────────────────────────────────────────

/** Cores de badge por status */
const STATUS_CORES: Record<PropostaStatus, string> = {
  rascunho: "#64748b",
  enviada: "#38bdf8",
  visualizada: "#a78bfa",
  aprovada: "#34d399",
  recusada: "#f87171",
  expirada: "#94a3b8",
};

/** Labels legíveis por status */
const STATUS_LABELS: Record<PropostaStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  visualizada: "Visualizada",
  aprovada: "Aprovada",
  recusada: "Recusada",
  expirada: "Expirada",
};

// ── Utilitários ──────────────────────────────────────────────

/** Formata valor como moeda brasileira */
const formatBRL = (valor: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

/** Formata data ISO para exibição legível em PT-BR */
const formatData = (iso: string | null): string => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
};

/** Formata data + hora */
const formatDataHora = (iso: string | null): string => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
};

/** Gera ID local temporário para items do formulário */
const gerarLocalId = (): string =>
  Math.random().toString(36).substring(2, 10);

/** Data de hoje no formato yyyy-mm-dd (para min do input date) */
const hoje = (): string => new Date().toISOString().split("T")[0];

// ── Sub-componente: Badge de status ──────────────────────────

interface StatusBadgeProps {
  status: PropostaStatus;
}

const StatusBadge = ({ status }: StatusBadgeProps) => (
  <span
    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
    style={{
      backgroundColor: `${STATUS_CORES[status]}22`,
      color: STATUS_CORES[status],
      border: `1px solid ${STATUS_CORES[status]}55`,
    }}
  >
    {STATUS_LABELS[status]}
  </span>
);

// ── Sub-componente: Linha do tempo da proposta ───────────────

interface LinhaDoTempoProps {
  proposta: PropostaOnline;
}

const LinhaDoTempo = ({ proposta }: LinhaDoTempoProps) => {
  const steps = [
    {
      label: "Criada",
      data: proposta.created_at,
      ativo: true,
      icone: <FilePlus size={14} />,
    },
    {
      label: "Enviada",
      data: proposta.enviada_em,
      ativo: !!proposta.enviada_em,
      icone: <Send size={14} />,
    },
    {
      label: "Visualizada",
      data: proposta.visualizada_em,
      ativo: !!proposta.visualizada_em,
      icone: <Eye size={14} />,
    },
    {
      label: "Respondida",
      data: proposta.respondida_em,
      ativo: !!proposta.respondida_em,
      icone:
        proposta.status === "aprovada" ? (
          <ThumbsUp size={14} />
        ) : proposta.status === "recusada" ? (
          <ThumbsDown size={14} />
        ) : (
          <Clock size={14} />
        ),
    },
  ];

  return (
    <div className="flex items-start gap-0 w-full my-4">
      {steps.map((step, idx) => (
        <div key={step.label} className="flex items-start flex-1">
          {/* Nó */}
          <div className="flex flex-col items-center flex-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all"
              style={{
                backgroundColor: step.ativo ? "#7c3aed22" : "transparent",
                borderColor: step.ativo ? "#7c3aed" : "#334155",
                color: step.ativo ? "#a78bfa" : "#475569",
              }}
            >
              {step.icone}
            </div>
            <span
              className="text-xs font-medium mt-1"
              style={{ color: step.ativo ? "#a78bfa" : "#475569" }}
            >
              {step.label}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">
              {step.ativo ? formatData(step.data) : "—"}
            </span>
          </div>

          {/* Linha conectora (exceto após o último) */}
          {idx < steps.length - 1 && (
            <div
              className="h-0.5 flex-1 mt-4 transition-all"
              style={{
                backgroundColor:
                  steps[idx + 1].ativo ? "#7c3aed66" : "#1e293b",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

// ── Sub-componente: Tabela de itens ──────────────────────────

interface TabelaItensProps {
  itens: ItemProposta[];
}

const TabelaItens = ({ itens }: TabelaItensProps) => {
  const total = itens.reduce((acc, item) => acc + item.valor_total, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">
              Descrição
            </th>
            <th className="text-center py-2 px-3 text-muted-foreground font-medium w-20">
              Qtd
            </th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium w-32">
              Valor Unit.
            </th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium w-32">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {itens
            .sort((a, b) => a.ordem - b.ordem)
            .map((item) => (
              <tr
                key={item.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="py-2 px-3 text-white/90">{item.descricao}</td>
                <td className="py-2 px-3 text-center text-muted-foreground">
                  {item.quantidade}
                </td>
                <td className="py-2 px-3 text-right text-muted-foreground">
                  {formatBRL(item.valor_unitario)}
                </td>
                <td className="py-2 px-3 text-right text-white/90 font-medium">
                  {formatBRL(item.valor_total)}
                </td>
              </tr>
            ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="py-3 px-3 text-right font-semibold text-muted-foreground">
              Total Geral
            </td>
            <td className="py-3 px-3 text-right">
              <span className="text-gradient-yellow font-bold text-base">
                {formatBRL(total)}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ── Sub-componente: Stepper visual ───────────────────────────

interface StepperProps {
  passoAtual: number; // 1, 2 ou 3
}

const Stepper = ({ passoAtual }: StepperProps) => {
  const passos = [
    { numero: 1, label: "Informações" },
    { numero: 2, label: "Itens" },
    { numero: 3, label: "Revisão" },
  ];

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {passos.map((passo, idx) => {
        const concluido = passo.numero < passoAtual;
        const ativo = passo.numero === passoAtual;

        return (
          <div key={passo.numero} className="flex items-center">
            {/* Círculo do passo */}
            <div className="flex flex-col items-center">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all"
                style={{
                  backgroundColor: concluido
                    ? "#7c3aed"
                    : ativo
                    ? "#7c3aed22"
                    : "transparent",
                  borderColor: ativo || concluido ? "#7c3aed" : "#334155",
                  color: ativo || concluido ? "#ffffff" : "#475569",
                }}
              >
                {concluido ? <Check size={16} /> : passo.numero}
              </div>
              <span
                className="text-xs mt-1 font-medium"
                style={{
                  color: ativo ? "#a78bfa" : concluido ? "#7c3aed" : "#475569",
                }}
              >
                {passo.label}
              </span>
            </div>

            {/* Linha entre passos */}
            {idx < passos.length - 1 && (
              <div
                className="w-16 h-0.5 mb-4 mx-1 transition-all"
                style={{
                  backgroundColor: passo.numero < passoAtual ? "#7c3aed66" : "#1e293b",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Sub-componente: Preview da proposta (Passo 3) ────────────

interface PreviewPropostaProps {
  titulo: string;
  introducao: string;
  validade: string;
  clienteNome: string;
  itens: ItemFormulario[];
}

const PreviewProposta = ({
  titulo,
  introducao,
  validade,
  clienteNome,
  itens,
}: PreviewPropostaProps) => {
  const totalGeral = itens.reduce(
    (acc, item) => acc + item.quantidade * item.valor_unitario,
    0
  );

  return (
    <div className="glass-card glow-border rounded-xl overflow-hidden">
      {/* Cabeçalho do preview */}
      <div className="bg-primary/15 border-b border-primary/30 px-6 py-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
            ELYON Group
          </span>
        </div>
        <h3 className="font-display text-lg font-bold text-white">{titulo}</h3>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
          <span>
            <span className="text-white/50">Para: </span>
            <span className="text-white/80">{clienteNome}</span>
          </span>
          <span>
            <span className="text-white/50">Válido até: </span>
            <span className="text-white/80">{formatData(validade)}</span>
          </span>
        </div>
      </div>

      {/* Corpo do preview */}
      <div className="px-6 py-5 space-y-5">
        {/* Introdução */}
        {introducao && (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {introducao}
          </p>
        )}

        {/* Tabela de itens no preview */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">
                  Descrição
                </th>
                <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs w-16">
                  Qtd
                </th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs w-28">
                  Valor Unit.
                </th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs w-28">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr
                  key={item.localId}
                  className="border-b border-white/5"
                >
                  <td className="py-2 px-2 text-white/90 text-xs">
                    {item.descricao || <em className="text-muted-foreground">Sem descrição</em>}
                  </td>
                  <td className="py-2 px-2 text-center text-muted-foreground text-xs">
                    {item.quantidade}
                  </td>
                  <td className="py-2 px-2 text-right text-muted-foreground text-xs">
                    {formatBRL(item.valor_unitario)}
                  </td>
                  <td className="py-2 px-2 text-right text-white/90 font-medium text-xs">
                    {formatBRL(item.quantidade * item.valor_unitario)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total em destaque */}
        <div className="flex justify-end pt-2 border-t border-white/10">
          <div className="text-right">
            <span className="text-xs text-muted-foreground block mb-1">
              Valor Total da Proposta
            </span>
            <span className="text-gradient-yellow font-bold text-2xl">
              {formatBRL(totalGeral)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Componente principal ─────────────────────────────────────

export const PropostaBuilder = ({
  projetoId,
  projetoTitulo,
  clienteNome,
  clienteToken,
}: PropostaBuilderProps) => {
  // ── Estado geral ─────────────────────────────────────────
  const [proposta, setProposta] = useState<PropostaOnline | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modoFormulario, setModoFormulario] = useState(false);
  const [passoAtual, setPassoAtual] = useState<1 | 2 | 3>(1);
  const [itensVisiveis, setItensVisiveis] = useState(false);

  // ── Estado do feedback ────────────────────────────────────
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // ── Estado do formulário ──────────────────────────────────
  const [titulo, setTitulo] = useState("");
  const [introducao, setIntroducao] = useState("");
  const [validade, setValidade] = useState("");
  const [itensForm, setItensForm] = useState<ItemFormulario[]>([
    { localId: gerarLocalId(), descricao: "", quantidade: 1, valor_unitario: 0 },
  ]);

  // ── Buscar proposta ativa ao montar ───────────────────────
  const buscarProposta = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    const { data, error } = await supabase
      .from("propostas_online")
      .select("*, itens:itens_proposta(*)")
      .eq("projeto_id", projetoId)
      .neq("status", "rascunho")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setErro("Erro ao buscar proposta: " + error.message);
    } else {
      setProposta(data as PropostaOnline | null);
    }

    setCarregando(false);
  }, [projetoId]);

  useEffect(() => {
    buscarProposta();
  }, [buscarProposta]);

  // ── Utilitário: link do portal ────────────────────────────
  const linkPortal = `${window.location.origin}/portal/${clienteToken}`;

  // ── Ação: copiar link ─────────────────────────────────────
  const copiarLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(linkPortal);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2500);
    } catch {
      setErro("Não foi possível copiar o link. Copie manualmente: " + linkPortal);
    }
  }, [linkPortal]);

  // ── Ação: entrar no modo formulário ──────────────────────
  const iniciarCriacao = () => {
    // Resetar formulário
    setTitulo("");
    setIntroducao("");
    setValidade("");
    setItensForm([
      { localId: gerarLocalId(), descricao: "", quantidade: 1, valor_unitario: 0 },
    ]);
    setPassoAtual(1);
    setErro(null);
    setSucesso(null);
    setModoFormulario(true);
  };

  // ── Ação: cancelar formulário ─────────────────────────────
  const cancelarFormulario = () => {
    setModoFormulario(false);
    setErro(null);
    setSucesso(null);
  };

  // ── Ação: voltar ao rascunho (reeditar) ──────────────────
  const voltarParaRascunho = async () => {
    if (!proposta) return;
    setSalvando(true);
    setErro(null);

    const { error } = await supabase
      .from("propostas_online")
      .update({ status: "rascunho" })
      .eq("id", proposta.id);

    if (error) {
      setErro("Erro ao voltar para rascunho: " + error.message);
    } else {
      // Recarrega (proposta volta a ser "rascunho" e some do estado B)
      await buscarProposta();
    }

    setSalvando(false);
  };

  // ── Manipulação de itens do formulário ───────────────────

  const adicionarItem = () => {
    setItensForm((prev) => [
      ...prev,
      { localId: gerarLocalId(), descricao: "", quantidade: 1, valor_unitario: 0 },
    ]);
  };

  const removerItem = (localId: string) => {
    setItensForm((prev) => prev.filter((i) => i.localId !== localId));
  };

  const atualizarItem = (
    localId: string,
    campo: keyof Omit<ItemFormulario, "localId">,
    valor: string | number
  ) => {
    setItensForm((prev) =>
      prev.map((item) =>
        item.localId === localId ? { ...item, [campo]: valor } : item
      )
    );
  };

  // Total geral calculado em tempo real
  const totalGeral = itensForm.reduce(
    (acc, item) => acc + item.quantidade * item.valor_unitario,
    0
  );

  // Validação: itens válidos = têm descrição e valor_unitario > 0
  const itensValidos = itensForm.filter(
    (i) => i.descricao.trim() !== "" && i.valor_unitario > 0
  );
  const podeProsseguirPasso2 = itensValidos.length > 0;

  // ── Ação: salvar proposta no banco ────────────────────────
  const salvarProposta = async (statusFinal: "rascunho" | "enviada") => {
    if (!titulo.trim()) {
      setErro("Informe o título da proposta.");
      return;
    }
    if (!validade) {
      setErro("Informe a data de validade.");
      return;
    }
    if (itensValidos.length === 0) {
      setErro("Adicione ao menos um item válido com descrição e valor.");
      return;
    }

    setSalvando(true);
    setErro(null);

    try {
      // 1. Criar proposta com valor_total=0 inicialmente
      const { data: nova, error: errInsert } = await supabase
        .from("propostas_online")
        .insert({
          projeto_id: projetoId,
          titulo: titulo.trim(),
          introducao: introducao.trim(),
          validade,
          valor_total: 0,
          status: statusFinal === "enviada" ? "enviada" : "rascunho",
          criado_por_nome: "Admin ELYON",
          ...(statusFinal === "enviada" && { enviada_em: new Date().toISOString() }),
        })
        .select("id")
        .single();

      if (errInsert || !nova) {
        throw new Error(errInsert?.message ?? "Erro ao criar proposta.");
      }

      // 2. Inserir itens em batch
      const { error: errItens } = await supabase
        .from("itens_proposta")
        .insert(
          itensValidos.map((item, idx) => ({
            proposta_id: nova.id,
            descricao: item.descricao.trim(),
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            ordem: idx,
          }))
        );

      if (errItens) {
        throw new Error("Erro ao inserir itens: " + errItens.message);
      }

      // 3. Calcular total e atualizar proposta
      const totalCalculado = itensValidos.reduce(
        (acc, item) => acc + item.quantidade * item.valor_unitario,
        0
      );

      const { error: errTotal } = await supabase
        .from("propostas_online")
        .update({ valor_total: totalCalculado })
        .eq("id", nova.id);

      if (errTotal) {
        throw new Error("Erro ao atualizar valor total: " + errTotal.message);
      }

      // 4. Se enviada, copiar link automaticamente
      if (statusFinal === "enviada") {
        try {
          await navigator.clipboard.writeText(linkPortal);
          setSucesso("Proposta enviada! Link copiado automaticamente.");
        } catch {
          setSucesso("Proposta enviada! Copie o link manualmente.");
        }
      } else {
        setSucesso("Rascunho salvo com sucesso.");
      }

      // 5. Fechar formulário e recarregar proposta ativa
      setModoFormulario(false);
      await buscarProposta();
    } catch (e: unknown) {
      const mensagem = e instanceof Error ? e.message : "Erro desconhecido.";
      setErro(mensagem);
    } finally {
      setSalvando(false);
    }
  };

  // ── Render: estado de carregamento ────────────────────────
  if (carregando) {
    return (
      <div className="glass-card rounded-xl p-8 flex items-center justify-center gap-3 text-muted-foreground">
        <RefreshCw size={18} className="animate-spin" />
        <span className="text-sm">Carregando proposta...</span>
      </div>
    );
  }

  // ── Render: toast de erro / sucesso ──────────────────────
  const ToastFeedback = () => (
    <>
      {erro && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-sm">
          {erro}
        </div>
      )}
      {sucesso && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-sm flex items-center gap-2">
          <Check size={16} />
          {sucesso}
        </div>
      )}
    </>
  );

  // ================================================================
  // ESTADO C — Formulário de criação (3 passos)
  // ================================================================
  if (modoFormulario) {
    return (
      <div className="glass-card glow-border rounded-xl p-6">
        {/* Cabeçalho do formulário */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-lg font-bold text-gradient">
              Nova Proposta
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {projetoTitulo} · {clienteNome}
            </p>
          </div>
          <button
            onClick={cancelarFormulario}
            className="text-xs text-muted-foreground hover:text-white/80 transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
          >
            Cancelar
          </button>
        </div>

        {/* Stepper */}
        <Stepper passoAtual={passoAtual} />

        <ToastFeedback />

        {/* ── Passo 1: Informações gerais ───────────────────── */}
        {passoAtual === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Título da proposta <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Proposta Técnica — Sistema de Segurança Residencial"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Texto de introdução
              </label>
              <textarea
                value={introducao}
                onChange={(e) => setIntroducao(e.target.value)}
                placeholder={`Prezado ${clienteNome}, apresentamos a seguir nossa proposta técnica para o projeto solicitado...`}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Validade da proposta <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Calendar
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  type="date"
                  value={validade}
                  onChange={(e) => setValidade(e.target.value)}
                  min={hoje()}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>
            </div>

            {/* Botão próximo */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  if (!titulo.trim()) {
                    setErro("Informe o título da proposta.");
                    return;
                  }
                  if (!validade) {
                    setErro("Informe a data de validade.");
                    return;
                  }
                  setErro(null);
                  setPassoAtual(2);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold text-sm shadow-yellow hover:shadow-yellow transition-all"
              >
                Próximo
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Passo 2: Itens da proposta ────────────────────── */}
        {passoAtual === 2 && (
          <div className="space-y-4">
            {/* Lista de itens */}
            <div className="space-y-3">
              {itensForm.map((item, idx) => {
                const itemTotal = item.quantidade * item.valor_unitario;
                return (
                  <div
                    key={item.localId}
                    className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border border-white/8 bg-white/3"
                  >
                    {/* Número do item */}
                    <div className="col-span-1 text-center text-xs text-muted-foreground font-mono">
                      {idx + 1}
                    </div>

                    {/* Descrição */}
                    <div className="col-span-5">
                      <input
                        type="text"
                        value={item.descricao}
                        onChange={(e) =>
                          atualizarItem(item.localId, "descricao", e.target.value)
                        }
                        placeholder="Descrição do item *"
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
                      />
                    </div>

                    {/* Quantidade */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.quantidade}
                        min={0.01}
                        step={1}
                        onChange={(e) =>
                          atualizarItem(
                            item.localId,
                            "quantidade",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/60 transition-colors text-center"
                      />
                    </div>

                    {/* Valor unitário */}
                    <div className="col-span-2">
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          R$
                        </span>
                        <input
                          type="number"
                          value={item.valor_unitario || ""}
                          min={0}
                          step={0.01}
                          onChange={(e) =>
                            atualizarItem(
                              item.localId,
                              "valor_unitario",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          placeholder="0,00"
                          className="w-full bg-white/5 border border-white/10 rounded pl-7 pr-2 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Total calculado */}
                    <div className="col-span-1 text-right text-xs font-medium text-white/70">
                      {itemTotal > 0 ? formatBRL(itemTotal) : "—"}
                    </div>

                    {/* Botão remover */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => removerItem(item.localId)}
                        disabled={itensForm.length === 1}
                        className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remover item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Botão adicionar item */}
            <button
              onClick={adicionarItem}
              className="w-full py-2.5 rounded-lg border border-dashed border-white/20 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={15} />
              Adicionar item
            </button>

            {/* Subtotal */}
            <div className="flex justify-between items-center pt-3 border-t border-white/10">
              <span className="text-sm text-muted-foreground">Subtotal geral</span>
              <span className="text-gradient-yellow font-bold text-lg">
                {formatBRL(totalGeral)}
              </span>
            </div>

            {/* Navegação */}
            <div className="flex justify-between pt-2">
              <button
                onClick={() => setPassoAtual(1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 text-sm text-muted-foreground hover:text-white hover:border-white/30 transition-all"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>
              <button
                onClick={() => {
                  if (!podeProsseguirPasso2) {
                    setErro("Adicione ao menos um item com descrição e valor.");
                    return;
                  }
                  setErro(null);
                  setPassoAtual(3);
                }}
                disabled={!podeProsseguirPasso2}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold text-sm shadow-yellow hover:shadow-yellow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próximo
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Passo 3: Revisão e envio ──────────────────────── */}
        {passoAtual === 3 && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Revise como o cliente verá a proposta antes de enviar.
            </p>

            {/* Preview da proposta */}
            <PreviewProposta
              titulo={titulo}
              introducao={introducao}
              validade={validade}
              clienteNome={clienteNome}
              itens={itensValidos}
            />

            {/* Navegação e ações finais */}
            <div className="flex flex-wrap justify-between gap-3 pt-2">
              <button
                onClick={() => setPassoAtual(2)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/15 text-sm text-muted-foreground hover:text-white hover:border-white/30 transition-all"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>

              <div className="flex gap-3">
                {/* Salvar rascunho */}
                <button
                  onClick={() => salvarProposta("rascunho")}
                  disabled={salvando}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/20 text-sm text-white/80 hover:border-white/35 hover:text-white transition-all disabled:opacity-50"
                >
                  <Save size={15} />
                  {salvando ? "Salvando..." : "Salvar rascunho"}
                </button>

                {/* Enviar ao cliente */}
                <button
                  onClick={() => salvarProposta("enviada")}
                  disabled={salvando}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold text-sm shadow-yellow hover:shadow-yellow transition-all disabled:opacity-50"
                >
                  <Send size={15} />
                  {salvando ? "Enviando..." : "Enviar ao cliente"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ================================================================
  // ESTADO A — Sem proposta ativa
  // ================================================================
  if (!proposta) {
    return (
      <div className="glass-card rounded-xl p-8 text-center space-y-4">
        <ToastFeedback />
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <FileText size={28} className="text-muted-foreground" />
          </div>
        </div>
        <div>
          <p className="text-white/80 font-medium">Nenhuma proposta enviada ainda</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie uma proposta para este projeto e compartilhe com o cliente.
          </p>
        </div>
        <button
          onClick={iniciarCriacao}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold text-sm shadow-yellow hover:shadow-yellow transition-all"
        >
          <Plus size={16} />
          Criar Proposta
        </button>
      </div>
    );
  }

  // ================================================================
  // ESTADO B — Proposta existente
  // ================================================================
  return (
    <div className="glass-card glow-border rounded-xl overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-6 pt-5 pb-4 border-b border-white/8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display font-bold text-white text-base truncate">
                {proposta.titulo}
              </h2>
              <StatusBadge status={proposta.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              Criada em {formatDataHora(proposta.created_at)} · por {proposta.criado_por_nome}
            </p>
          </div>

          {/* Valor total em destaque */}
          <div className="text-right shrink-0">
            <span className="text-xs text-muted-foreground block">Valor total</span>
            <span className="text-gradient-yellow font-bold text-xl">
              {formatBRL(proposta.valor_total)}
            </span>
          </div>
        </div>

        {/* Linha do tempo */}
        <LinhaDoTempo proposta={proposta} />
      </div>

      {/* Corpo */}
      <div className="px-6 py-4 space-y-4">
        <ToastFeedback />

        {/* Card: Aprovada */}
        {proposta.status === "aprovada" && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mb-1">
              <ThumbsUp size={15} />
              Aprovada em {formatData(proposta.respondida_em)}
            </div>
            {proposta.observacao_cliente && (
              <p className="text-sm text-emerald-300/80 italic">
                "{proposta.observacao_cliente}"
              </p>
            )}
          </div>
        )}

        {/* Card: Recusada */}
        {proposta.status === "recusada" && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-red-400 font-semibold text-sm mb-1">
              <ThumbsDown size={15} />
              Recusada em {formatData(proposta.respondida_em)}
            </div>
            {proposta.observacao_cliente && (
              <p className="text-sm text-red-300/80 italic">
                "{proposta.observacao_cliente}"
              </p>
            )}
          </div>
        )}

        {/* Seção de itens — expansível */}
        <div className="rounded-lg border border-white/8 overflow-hidden">
          <button
            onClick={() => setItensVisiveis((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/80 hover:bg-white/5 transition-colors"
          >
            <span className="font-medium flex items-center gap-2">
              <FileText size={14} className="text-muted-foreground" />
              Ver itens da proposta
              <span className="text-xs text-muted-foreground">
                ({proposta.itens?.length ?? 0} {proposta.itens?.length === 1 ? "item" : "itens"})
              </span>
            </span>
            {itensVisiveis ? (
              <ChevronUp size={15} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={15} className="text-muted-foreground" />
            )}
          </button>

          {itensVisiveis && proposta.itens && proposta.itens.length > 0 && (
            <div className="border-t border-white/8 px-1 py-1">
              <TabelaItens itens={proposta.itens} />
            </div>
          )}

          {itensVisiveis && (!proposta.itens || proposta.itens.length === 0) && (
            <div className="border-t border-white/8 px-4 py-3 text-sm text-muted-foreground">
              Nenhum item cadastrado nesta proposta.
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2 pt-1">
          {/* Copiar link do portal */}
          <button
            onClick={copiarLink}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-sm text-white/80 hover:border-white/30 hover:text-white transition-all"
          >
            {linkCopiado ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span className="text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                Copiar link do portal
              </>
            )}
          </button>

          {/* Reeditar (apenas enviada ou visualizada) */}
          {(proposta.status === "enviada" || proposta.status === "visualizada") && (
            <button
              onClick={voltarParaRascunho}
              disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-500/30 text-sm text-amber-400 hover:border-amber-500/60 hover:bg-amber-500/10 transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={salvando ? "animate-spin" : ""} />
              Reeditar
            </button>
          )}

          {/* Nova proposta (apenas aprovada ou recusada) */}
          {(proposta.status === "aprovada" || proposta.status === "recusada") && (
            <button
              onClick={iniciarCriacao}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-foreground font-semibold text-sm shadow-yellow hover:shadow-yellow transition-all"
            >
              <FilePlus size={14} />
              Nova proposta
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropostaBuilder;
