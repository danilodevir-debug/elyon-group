// ============================================================
// ELYON Group · Portal do Cliente
// Rota: /portal/:token
// ============================================================
// Acesso público via link único (sem login).
// O token é passado como header x-cliente-token em todas as
// requisições ao Supabase.
// ============================================================

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import {
  FolderOpen,
  FileText,
  BookOpen,
  Map,
  Award,
  Shield,
  Image,
  File,
  Download,
  HeadphonesIcon,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Check,
  Loader2,
  MapPin,
  Calendar,
  User,
  Phone,
  Building2,
  DollarSign,
  ClipboardList,
  Wrench,
  Star,
  Home,
} from "lucide-react";

// ── Configuração Supabase (anon, sem login) ──────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Cria um client específico com o token do cliente no header
function criarClientePortal(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { "x-cliente-token": token },
    },
  });
}

// ── Tipos ────────────────────────────────────────────────────

type ProjetoStatus =
  | "planejamento"
  | "em_andamento"
  | "pausado"
  | "concluido"
  | "cancelado";

type OSStatus = "pendente" | "em_andamento" | "concluida" | "cancelada";

type DocumentoTipo =
  | "manual"
  | "planta"
  | "certificado"
  | "garantia"
  | "relatorio"
  | "foto"
  | "outro";

type ChamadoStatus =
  | "aberto"
  | "em_analise"
  | "aguardando_cliente"
  | "resolvido"
  | "fechado";

type ChamadoPrioridade = "baixa" | "media" | "alta" | "urgente";

type ChamadoCategoria =
  | "manutencao"
  | "camera_cftv"
  | "rede_conectividade"
  | "automacao"
  | "audio"
  | "outro";

type PropostaStatus =
  | "rascunho"
  | "enviada"
  | "visualizada"
  | "aprovada"
  | "recusada"
  | "expirada";

interface Projeto {
  id: string;
  cliente_token: string;
  titulo: string;
  descricao: string | null;
  status: ProjetoStatus;
  data_inicio: string | null;
  data_previsao_conclusao: string | null;
  data_conclusao: string | null;
  cliente_nome: string;
  cliente_telefone: string | null;
  endereco: string | null;
  responsavel_nome: string | null;
  valor_proposta: number | null;
}

interface OrdemServico {
  id: string;
  projeto_id: string;
  titulo: string;
  status: OSStatus;
  tecnico_nome: string | null;
  data_agendada: string | null;
  data_conclusao: string | null;
}

interface Documento {
  id: string;
  projeto_id: string;
  titulo: string;
  descricao: string | null;
  tipo: DocumentoTipo;
  url_publica: string;
  tamanho_bytes: number | null;
  mime_type: string | null;
  visivel_cliente: boolean;
  criado_por_nome: string | null;
  created_at: string;
}

interface Chamado {
  id: string;
  projeto_id: string;
  titulo: string;
  descricao: string;
  status: ChamadoStatus;
  prioridade: ChamadoPrioridade;
  categoria: ChamadoCategoria;
  aberto_por_nome: string;
  resposta_admin: string | null;
  respondido_em: string | null;
  created_at: string;
  updated_at: string;
}

interface ItemProposta {
  id: string;
  proposta_id: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ordem: number;
}

interface Proposta {
  id: string;
  projeto_id: string;
  titulo: string;
  introducao: string | null;
  validade: string | null;
  valor_total: number;
  status: PropostaStatus;
  enviada_em: string | null;
  visualizada_em: string | null;
  respondida_em: string | null;
  observacao_cliente: string | null;
  itens_proposta: ItemProposta[];
}

type AbaAtiva = "projeto" | "proposta" | "documentos" | "suporte";

// ── Helpers de formatação ────────────────────────────────────

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Tempo relativo desde a data (ex: "há 2h", "há 3 dias")
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "agora mesmo";
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

const _moedaFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatarMoeda(valor: number | null): string {
  if (valor === null || valor === undefined) return "—";
  return _moedaFormatter.format(valor);
}

function formatarBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Mapeamentos de labels e cores ────────────────────────────

const STATUS_PROJETO: Record<ProjetoStatus, { label: string; cor: string }> = {
  planejamento: { label: "Planejamento", cor: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
  em_andamento: { label: "Em Andamento", cor: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  pausado: { label: "Pausado", cor: "text-orange-400 bg-orange-400/10 border-orange-400/30" },
  concluido: { label: "Concluído", cor: "text-green-400 bg-green-400/10 border-green-400/30" },
  cancelado: { label: "Cancelado", cor: "text-red-400 bg-red-400/10 border-red-400/30" },
};

const STATUS_OS: Record<OSStatus, { label: string; cor: string; icone: React.ReactNode }> = {
  pendente: {
    label: "Pendente",
    cor: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    icone: <Clock size={12} />,
  },
  em_andamento: {
    label: "Em Andamento",
    cor: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    icone: <Loader2 size={12} className="animate-spin" />,
  },
  concluida: {
    label: "Concluída",
    cor: "text-green-400 bg-green-400/10 border-green-400/30",
    icone: <CheckCircle2 size={12} />,
  },
  cancelada: {
    label: "Cancelada",
    cor: "text-red-400 bg-red-400/10 border-red-400/30",
    icone: <XCircle size={12} />,
  },
};

const STATUS_CHAMADO: Record<ChamadoStatus, { label: string; cor: string }> = {
  aberto: { label: "Aberto", cor: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  em_analise: { label: "Em Análise", cor: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
  aguardando_cliente: { label: "Aguardando você", cor: "text-orange-400 bg-orange-400/10 border-orange-400/30" },
  resolvido: { label: "Resolvido", cor: "text-green-400 bg-green-400/10 border-green-400/30" },
  fechado: { label: "Fechado", cor: "text-zinc-400 bg-zinc-400/10 border-zinc-400/30" },
};

const PRIORIDADE_CHAMADO: Record<ChamadoPrioridade, { label: string; cor: string }> = {
  baixa: { label: "Baixa", cor: "text-zinc-400 bg-zinc-400/10 border-zinc-400/30" },
  media: { label: "Média", cor: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
  alta: { label: "Alta", cor: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  urgente: { label: "Urgente", cor: "text-red-400 bg-red-400/10 border-red-400/30" },
};

const CATEGORIA_CHAMADO: Record<ChamadoCategoria, string> = {
  manutencao: "Manutenção",
  camera_cftv: "Câmera / CFTV",
  rede_conectividade: "Rede / Conectividade",
  automacao: "Automação",
  audio: "Áudio",
  outro: "Outro",
};

// Ícone por tipo de documento
function IconeDocumento({ tipo, size = 20 }: { tipo: DocumentoTipo; size?: number }) {
  const props = { size, className: "text-primary" };
  switch (tipo) {
    case "manual":       return <BookOpen {...props} />;
    case "planta":       return <Map {...props} />;
    case "certificado":  return <Award {...props} />;
    case "garantia":     return <Shield {...props} />;
    case "foto":         return <Image {...props} />;
    case "relatorio":    return <FileText {...props} />;
    default:             return <File {...props} />;
  }
}

const TIPO_LABEL: Record<DocumentoTipo, string> = {
  manual:      "Manual",
  planta:      "Planta",
  certificado: "Certificado",
  garantia:    "Garantia",
  relatorio:   "Relatório",
  foto:        "Foto",
  outro:       "Outro",
};

// ── Componente: Timeline de status do projeto ────────────────

function TimelineProjeto({ status }: { status: ProjetoStatus }) {
  // Etapas lineares do projeto (pausado/cancelado são estados especiais)
  const etapas: { key: ProjetoStatus; label: string }[] = [
    { key: "planejamento", label: "Planejamento" },
    { key: "em_andamento", label: "Em Andamento" },
    { key: "concluido",    label: "Concluído" },
  ];

  const ordemEtapa: Record<string, number> = {
    planejamento: 0,
    em_andamento: 1,
    concluido:    2,
    pausado:      1, // mesmo nível de em_andamento
    cancelado:    -1,
  };

  const indiceAtual = ordemEtapa[status] ?? 0;
  const ehCancelado = status === "cancelado";
  const ehPausado   = status === "pausado";

  return (
    <div className="w-full">
      {/* Aviso de status especial */}
      {ehCancelado && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <XCircle size={16} />
          <span>Este projeto foi cancelado.</span>
        </div>
      )}
      {ehPausado && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm">
          <AlertCircle size={16} />
          <span>Projeto temporariamente pausado.</span>
        </div>
      )}

      {/* Steps horizontais */}
      <div className="flex items-center gap-0 w-full">
        {etapas.map((etapa, idx) => {
          const concluido = !ehCancelado && indiceAtual > idx;
          const ativo     = !ehCancelado && indiceAtual === idx;
          const futuro    = ehCancelado || indiceAtual < idx;

          return (
            <div key={etapa.key} className="flex items-center flex-1 last:flex-none">
              {/* Círculo da etapa */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                    ${concluido ? "bg-green-500/20 border-green-500 text-green-400" : ""}
                    ${ativo     ? "bg-primary/20 border-primary text-primary shadow-glow" : ""}
                    ${futuro    ? "bg-white/5 border-white/20 text-white/30" : ""}
                  `}
                >
                  {concluido ? (
                    <Check size={14} />
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`
                    text-[11px] font-medium text-center leading-tight
                    ${concluido ? "text-green-400" : ""}
                    ${ativo     ? "text-primary" : ""}
                    ${futuro    ? "text-white/30" : ""}
                  `}
                >
                  {etapa.label}
                </span>
              </div>

              {/* Linha conectora (menos no último) */}
              {idx < etapas.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2 rounded-full transition-all
                    ${concluido ? "bg-green-500/50" : "bg-white/10"}
                  `}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Componente: Badge de status genérico ─────────────────────

function Badge({ label, cor }: { label: string; cor: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cor}`}>
      {label}
    </span>
  );
}

// ── Aba 1: Projeto ───────────────────────────────────────────

function AbaProjeto({
  projeto,
  ordens,
}: {
  projeto: Projeto;
  ordens: OrdemServico[];
}) {
  const st = STATUS_PROJETO[projeto.status];

  return (
    <div className="space-y-6">
      {/* Card concluído */}
      {projeto.status === "concluido" && (
        <div className="glass-card glow-border p-5 rounded-2xl flex items-center gap-4 bg-green-500/5 border-green-500/30">
          <div className="p-3 rounded-full bg-green-500/20">
            <CheckCircle2 size={28} className="text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-green-400 font-display">Projeto concluído!</p>
            <p className="text-sm text-muted-foreground">
              Finalizado em {formatarData(projeto.data_conclusao)}
            </p>
          </div>
        </div>
      )}

      {/* Informações gerais */}
      <div className="glass-card glow-border rounded-2xl p-5 space-y-4">
        <h3 className="font-display font-semibold text-white flex items-center gap-2">
          <Building2 size={18} className="text-primary" />
          Informações do Projeto
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Endereço */}
          {projeto.endereco && (
            <InfoItem
              icone={<MapPin size={15} className="text-primary" />}
              label="Endereço"
              valor={projeto.endereco}
            />
          )}
          {/* Responsável */}
          {projeto.responsavel_nome && (
            <InfoItem
              icone={<User size={15} className="text-primary" />}
              label="Responsável ELYON"
              valor={projeto.responsavel_nome}
            />
          )}
          {/* Data início */}
          <InfoItem
            icone={<Calendar size={15} className="text-primary" />}
            label="Data de Início"
            valor={formatarData(projeto.data_inicio)}
          />
          {/* Previsão */}
          <InfoItem
            icone={<Clock size={15} className="text-primary" />}
            label="Previsão de Conclusão"
            valor={formatarData(projeto.data_previsao_conclusao)}
          />
          {/* Telefone */}
          {projeto.cliente_telefone && (
            <InfoItem
              icone={<Phone size={15} className="text-primary" />}
              label="Seu Telefone"
              valor={projeto.cliente_telefone}
            />
          )}
        </div>

        {/* Descrição */}
        {projeto.descricao && (
          <div className="pt-2 border-t border-white/10">
            <p className="text-xs text-muted-foreground mb-1">Descrição</p>
            <p className="text-sm text-white/80 leading-relaxed">{projeto.descricao}</p>
          </div>
        )}
      </div>

      {/* Timeline de status */}
      <div className="glass-card glow-border rounded-2xl p-5 space-y-4">
        <h3 className="font-display font-semibold text-white flex items-center gap-2">
          <ClipboardList size={18} className="text-primary" />
          Andamento
        </h3>
        <TimelineProjeto status={projeto.status} />
      </div>

      {/* Ordens de Serviço */}
      <div className="glass-card glow-border rounded-2xl p-5 space-y-4">
        <h3 className="font-display font-semibold text-white flex items-center gap-2">
          <Wrench size={18} className="text-primary" />
          Ordens de Serviço
          <span className="ml-auto text-xs text-muted-foreground font-normal">
            {ordens.length} {ordens.length === 1 ? "ordem" : "ordens"}
          </span>
        </h3>

        {ordens.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma ordem de serviço registrada ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {ordens.map((os) => {
              const st = STATUS_OS[os.status];
              return (
                <div
                  key={os.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg border ${os.status === "concluida" ? "bg-green-500/10 border-green-500/20" : "bg-white/5 border-white/10"}`}>
                    {st.icone}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{os.titulo}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge label={st.label} cor={st.cor} />
                      {os.tecnico_nome && (
                        <span className="text-xs text-muted-foreground">
                          Técnico: {os.tecnico_nome}
                        </span>
                      )}
                      {os.data_agendada && (
                        <span className="text-xs text-muted-foreground">
                          Agendado: {formatarData(os.data_agendada)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Subcomponente de linha de informação
function InfoItem({
  icone,
  label,
  valor,
}: {
  icone: React.ReactNode;
  label: string;
  valor: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0">{icone}</div>
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm text-white font-medium">{valor}</p>
      </div>
    </div>
  );
}

// ── Aba 2: Proposta ──────────────────────────────────────────

function AbaProposta({
  proposta,
  projetoId,
  supabasePortal,
  onAtualizar,
}: {
  proposta: Proposta | null;
  projetoId: string;
  supabasePortal: ReturnType<typeof criarClientePortal>;
  onAtualizar: () => void;
}) {
  const [modalAberto, setModalAberto] = useState<"aprovar" | "recusar" | null>(null);
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function responderProposta(decisao: "aprovada" | "recusada") {
    if (!proposta) return;
    setSalvando(true);
    try {
      await supabasePortal
        .from("propostas_online")
        .update({
          status: decisao,
          respondida_em: new Date().toISOString(),
          observacao_cliente: observacao || null,
        })
        .eq("id", proposta.id)
        .eq("projeto_id", projetoId);

      setModalAberto(null);
      setObservacao("");
      onAtualizar();
    } finally {
      setSalvando(false);
    }
  }

  if (!proposta) {
    return (
      <div className="glass-card glow-border rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
        <div className="p-4 rounded-full bg-white/5 border border-white/10">
          <FileText size={32} className="text-muted-foreground" />
        </div>
        <div>
          <p className="font-display font-semibold text-white mb-1">Nenhuma proposta ativa</p>
          <p className="text-sm text-muted-foreground">
            Quando uma proposta for enviada para você, ela aparecerá aqui.
          </p>
        </div>
      </div>
    );
  }

  const podeResponder =
    proposta.status === "enviada" || proposta.status === "visualizada";
  const jaRespondida =
    proposta.status === "aprovada" || proposta.status === "recusada";
  const st = STATUS_PROJETO; // reutilizar
  const corStatus: Record<PropostaStatus, string> = {
    rascunho:   "text-zinc-400 bg-zinc-400/10 border-zinc-400/30",
    enviada:    "text-blue-400 bg-blue-400/10 border-blue-400/30",
    visualizada:"text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    aprovada:   "text-green-400 bg-green-400/10 border-green-400/30",
    recusada:   "text-red-400 bg-red-400/10 border-red-400/30",
    expirada:   "text-orange-400 bg-orange-400/10 border-orange-400/30",
  };
  const labelStatus: Record<PropostaStatus, string> = {
    rascunho:    "Rascunho",
    enviada:     "Aguardando Resposta",
    visualizada: "Em Análise",
    aprovada:    "Aprovada",
    recusada:    "Recusada",
    expirada:    "Expirada",
  };

  // Itens ordenados
  const itens = [...(proposta.itens_proposta || [])].sort(
    (a, b) => a.ordem - b.ordem
  );

  return (
    <div className="space-y-6">
      {/* Header da proposta */}
      <div className="glass-card glow-border rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-lg text-white">{proposta.titulo}</h3>
            {proposta.validade && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Válida até {formatarData(proposta.validade)}
              </p>
            )}
          </div>
          <Badge
            label={labelStatus[proposta.status]}
            cor={corStatus[proposta.status]}
          />
        </div>

        {/* Introdução personalizada */}
        {proposta.introducao && (
          <div className="pt-3 border-t border-white/10">
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
              {proposta.introducao}
            </p>
          </div>
        )}
      </div>

      {/* Tabela de itens */}
      <div className="glass-card glow-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <h3 className="font-display font-semibold text-white">Itens da Proposta</h3>
        </div>

        {/* Cabeçalho da tabela */}
        <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-white/5 text-xs text-muted-foreground uppercase tracking-wide">
          <div className="col-span-6">Descrição</div>
          <div className="col-span-2 text-center">Qtd</div>
          <div className="col-span-2 text-right">Unit.</div>
          <div className="col-span-2 text-right">Total</div>
        </div>

        {/* Linhas */}
        <div className="divide-y divide-white/5">
          {itens.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-12 gap-2 px-5 py-3.5 hover:bg-white/[0.03] transition-colors"
            >
              <div className="col-span-6 text-sm text-white">{item.descricao}</div>
              <div className="col-span-2 text-sm text-center text-muted-foreground">
                {item.quantidade}
              </div>
              <div className="col-span-2 text-sm text-right text-muted-foreground">
                {formatarMoeda(item.valor_unitario)}
              </div>
              <div className="col-span-2 text-sm text-right text-white font-medium">
                {formatarMoeda(item.valor_total)}
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="px-5 py-4 bg-primary/5 border-t border-primary/20 flex justify-between items-center">
          <span className="font-display font-semibold text-white">Total Geral</span>
          <span className="text-xl font-bold text-gradient-yellow">
            {formatarMoeda(proposta.valor_total)}
          </span>
        </div>
      </div>

      {/* Confirmação de resposta */}
      {jaRespondida && (
        <div
          className={`glass-card rounded-2xl p-5 flex items-center gap-4 ${
            proposta.status === "aprovada"
              ? "bg-green-500/5 border border-green-500/30"
              : "bg-red-500/5 border border-red-500/30"
          }`}
        >
          {proposta.status === "aprovada" ? (
            <CheckCircle2 size={28} className="text-green-400 shrink-0" />
          ) : (
            <XCircle size={28} className="text-red-400 shrink-0" />
          )}
          <div>
            <p className={`font-semibold font-display ${proposta.status === "aprovada" ? "text-green-400" : "text-red-400"}`}>
              Proposta {proposta.status === "aprovada" ? "aprovada" : "recusada"} com sucesso
            </p>
            <p className="text-sm text-muted-foreground">
              Respondido em {formatarData(proposta.respondida_em)}
            </p>
            {proposta.observacao_cliente && (
              <p className="text-sm text-white/70 mt-1 italic">
                "{proposta.observacao_cliente}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Botões de ação */}
      {podeResponder && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setModalAberto("aprovar")}
            className="
              flex items-center justify-center gap-2 py-4 px-4
              rounded-2xl font-semibold font-display text-base
              bg-green-500/20 hover:bg-green-500/30
              border border-green-500/40 hover:border-green-500/60
              text-green-400 transition-all min-h-[56px]
              hover:shadow-[0_0_20px_rgba(34,197,94,0.2)]
            "
          >
            <Check size={20} />
            Aprovar
          </button>
          <button
            onClick={() => setModalAberto("recusar")}
            className="
              flex items-center justify-center gap-2 py-4 px-4
              rounded-2xl font-semibold font-display text-base
              bg-red-500/20 hover:bg-red-500/30
              border border-red-500/40 hover:border-red-500/60
              text-red-400 transition-all min-h-[56px]
              hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]
            "
          >
            <X size={20} />
            Recusar
          </button>
        </div>
      )}

      {/* Modal de confirmação */}
      {modalAberto && (
        <ModalConfirmacaoProposta
          tipo={modalAberto}
          observacao={observacao}
          onObservacao={setObservacao}
          salvando={salvando}
          onConfirmar={() =>
            responderProposta(modalAberto === "aprovar" ? "aprovada" : "recusada")
          }
          onCancelar={() => {
            setModalAberto(null);
            setObservacao("");
          }}
        />
      )}
    </div>
  );
}

// Modal de confirmação de proposta
function ModalConfirmacaoProposta({
  tipo,
  observacao,
  onObservacao,
  salvando,
  onConfirmar,
  onCancelar,
}: {
  tipo: "aprovar" | "recusar";
  observacao: string;
  onObservacao: (v: string) => void;
  salvando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const ehAprovar = tipo === "aprovar";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-card glow-border rounded-2xl p-6 w-full max-w-md space-y-5">
        {/* Ícone */}
        <div className={`flex items-center gap-3 ${ehAprovar ? "text-green-400" : "text-red-400"}`}>
          {ehAprovar ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
          <h3 className="font-display font-bold text-lg text-white">
            {ehAprovar ? "Confirmar aprovação" : "Confirmar recusa"}
          </h3>
        </div>

        <p className="text-sm text-muted-foreground">
          {ehAprovar
            ? "Ao aprovar, você autoriza a ELYON Group a prosseguir com o projeto conforme os termos desta proposta."
            : "Ao recusar, nossa equipe será notificada. Você poderá entrar em contato para ajustes."}
        </p>

        {/* Campo de observação */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Observação (opcional)
          </label>
          <textarea
            value={observacao}
            onChange={(e) => onObservacao(e.target.value)}
            placeholder={
              ehAprovar
                ? "Algum comentário sobre a aprovação?"
                : "Motivo da recusa ou sugestões..."
            }
            className="
              w-full px-4 py-3 rounded-xl text-sm text-white
              bg-white/5 border border-white/10
              focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30
              placeholder-white/30 resize-none
            "
            rows={3}
          />
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-muted-foreground bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={salvando}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold font-display transition-all
              ${ehAprovar
                ? "bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400"
                : "bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400"}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {salvando ? (
              <Loader2 size={16} className="animate-spin" />
            ) : ehAprovar ? (
              <Check size={16} />
            ) : (
              <X size={16} />
            )}
            {ehAprovar ? "Confirmar Aprovação" : "Confirmar Recusa"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Aba 3: Documentos ────────────────────────────────────────

function AbaDocumentos({ documentos }: { documentos: Documento[] }) {
  const tipos = Array.from(new Set(documentos.map((d) => d.tipo)));
  const [filtro, setFiltro] = useState<DocumentoTipo | "todos">("todos");

  const docsFiltrados =
    filtro === "todos" ? documentos : documentos.filter((d) => d.tipo === filtro);

  if (documentos.length === 0) {
    return (
      <div className="glass-card glow-border rounded-2xl p-10 flex flex-col items-center gap-4 text-center">
        <div className="p-4 rounded-full bg-white/5 border border-white/10">
          <FolderOpen size={32} className="text-muted-foreground" />
        </div>
        <div>
          <p className="font-display font-semibold text-white mb-1">Nenhum documento disponível</p>
          <p className="text-sm text-muted-foreground">
            Quando documentos do seu projeto forem adicionados, eles aparecerão aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filtros por tipo */}
      {tipos.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <FiltroChip
            label="Todos"
            ativo={filtro === "todos"}
            onClick={() => setFiltro("todos")}
          />
          {tipos.map((tipo) => (
            <FiltroChip
              key={tipo}
              label={TIPO_LABEL[tipo]}
              ativo={filtro === tipo}
              onClick={() => setFiltro(tipo)}
            />
          ))}
        </div>
      )}

      {/* Grid de documentos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {docsFiltrados.map((doc) => (
          <div
            key={doc.id}
            className="glass-card glow-border rounded-2xl p-4 flex items-start gap-4 hover:border-primary/40 transition-all group"
          >
            {/* Ícone */}
            <div className="shrink-0 p-3 rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
              <IconeDocumento tipo={doc.tipo} size={22} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-sm truncate">{doc.titulo}</p>
              {doc.descricao && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {doc.descricao}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                <span className="text-xs text-muted-foreground">{TIPO_LABEL[doc.tipo]}</span>
                {doc.tamanho_bytes && (
                  <span className="text-xs text-muted-foreground">
                    {formatarBytes(doc.tamanho_bytes)}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatarData(doc.created_at)}
                </span>
              </div>
            </div>

            {/* Download */}
            <a
              href={doc.url_publica}
              target="_blank"
              rel="noopener noreferrer"
              className="
                shrink-0 p-2.5 rounded-xl
                bg-accent/10 hover:bg-accent/20
                border border-accent/20 hover:border-accent/40
                text-accent transition-all
                hover:shadow-yellow
              "
              title="Baixar documento"
            >
              <Download size={16} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function FiltroChip({
  label,
  ativo,
  onClick,
}: {
  label: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-full text-xs font-medium border transition-all
        ${ativo
          ? "bg-primary/20 border-primary/50 text-primary shadow-glow"
          : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"}
      `}
    >
      {label}
    </button>
  );
}

// ── Aba 4: Suporte ───────────────────────────────────────────

function AbaSuporte({
  chamados,
  projeto,
  supabasePortal,
  onAtualizar,
}: {
  chamados: Chamado[];
  projeto: Projeto;
  supabasePortal: ReturnType<typeof criarClientePortal>;
  onAtualizar: () => void;
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {/* Botão de novo chamado */}
      <button
        onClick={() => setModalAberto(true)}
        className="
          w-full flex items-center justify-center gap-2 py-4 px-4
          rounded-2xl font-semibold font-display text-base
          bg-primary/15 hover:bg-primary/25
          border border-primary/30 hover:border-primary/50
          text-primary transition-all min-h-[56px]
          shadow-glow hover:shadow-glow
        "
      >
        <Plus size={20} />
        Abrir Novo Chamado
      </button>

      {/* Lista de chamados */}
      {chamados.length === 0 ? (
        <div className="glass-card glow-border rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
          <div className="p-3 rounded-full bg-white/5 border border-white/10">
            <HeadphonesIcon size={28} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Nenhum chamado aberto. Se precisar de suporte, clique no botão acima.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {chamados.map((chamado) => (
            <ChamadoCard
              key={chamado.id}
              chamado={chamado}
              expandido={expandido === chamado.id}
              onToggle={() =>
                setExpandido(expandido === chamado.id ? null : chamado.id)
              }
            />
          ))}
        </div>
      )}

      {/* Modal de novo chamado */}
      {modalAberto && (
        <ModalNovoChamado
          projeto={projeto}
          supabasePortal={supabasePortal}
          onSalvo={() => {
            setModalAberto(false);
            onAtualizar();
          }}
          onCancelar={() => setModalAberto(false)}
        />
      )}
    </div>
  );
}

// Card de chamado expansível
function ChamadoCard({
  chamado,
  expandido,
  onToggle,
}: {
  chamado: Chamado;
  expandido: boolean;
  onToggle: () => void;
}) {
  const stStatus = STATUS_CHAMADO[chamado.status];
  const stPrio   = PRIORIDADE_CHAMADO[chamado.prioridade];

  return (
    <div
      className={`glass-card rounded-2xl overflow-hidden border transition-all ${
        expandido ? "border-primary/40 shadow-glow" : "border-white/10 hover:border-white/20"
      }`}
    >
      {/* Linha do chamado (clicável) */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm font-medium text-white truncate">{chamado.titulo}</p>
          <div className="flex flex-wrap gap-2">
            <Badge label={stStatus.label} cor={stStatus.cor} />
            <Badge label={stPrio.label} cor={stPrio.cor} />
            <span className="text-xs text-muted-foreground">
              {CATEGORIA_CHAMADO[chamado.categoria]}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {timeAgo(chamado.created_at)}
            </span>
          </div>
          {/* Preview da resposta admin (quando recolhido) */}
          {!expandido && chamado.resposta_admin && (
            <p className="text-xs text-primary/80 truncate">
              Resposta: {chamado.resposta_admin}
            </p>
          )}
        </div>
        <div className="shrink-0 text-muted-foreground mt-0.5">
          {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
          {/* Descrição completa */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
              Descrição
            </p>
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
              {chamado.descricao}
            </p>
          </div>

          {/* Resposta do admin */}
          {chamado.resposta_admin && (
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs text-primary uppercase tracking-wide mb-1.5">
                Resposta ELYON
              </p>
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
                {chamado.resposta_admin}
              </p>
              {chamado.respondido_em && (
                <p className="text-xs text-muted-foreground mt-2">
                  Respondido em {formatarData(chamado.respondido_em)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Modal de novo chamado
function ModalNovoChamado({
  projeto,
  supabasePortal,
  onSalvo,
  onCancelar,
}: {
  projeto: Projeto;
  supabasePortal: ReturnType<typeof criarClientePortal>;
  onSalvo: () => void;
  onCancelar: () => void;
}) {
  const [titulo, setTitulo]         = useState("");
  const [descricao, setDescricao]   = useState("");
  const [categoria, setCategoria]   = useState<ChamadoCategoria>("outro");
  const [salvando, setSalvando]     = useState(false);
  const [erro, setErro]             = useState("");

  async function salvar() {
    if (!titulo.trim() || !descricao.trim()) {
      setErro("Título e descrição são obrigatórios.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const { error } = await supabasePortal
        .from("chamados_suporte")
        .insert({
          projeto_id:       projeto.id,
          titulo:           titulo.trim(),
          descricao:        descricao.trim(),
          categoria,
          prioridade:       "media",
          aberto_por_nome:  projeto.cliente_nome,
          status:           "aberto",
        });

      if (error) throw error;
      onSalvo();
    } catch {
      setErro("Erro ao abrir chamado. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const categorias: { value: ChamadoCategoria; label: string }[] = [
    { value: "manutencao",         label: "Manutenção" },
    { value: "camera_cftv",        label: "Câmera / CFTV" },
    { value: "rede_conectividade", label: "Rede / Conectividade" },
    { value: "automacao",          label: "Automação" },
    { value: "audio",              label: "Áudio" },
    { value: "outro",              label: "Outro" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-card glow-border rounded-2xl p-6 w-full max-w-md space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-white">Novo Chamado</h3>
          <button
            onClick={onCancelar}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Título */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Título <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Câmera do portão não está funcionando"
            className="
              w-full px-4 py-3 rounded-xl text-sm text-white
              bg-white/5 border border-white/10
              focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30
              placeholder-white/30
            "
          />
        </div>

        {/* Categoria */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Categoria <span className="text-red-400">*</span>
          </label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as ChamadoCategoria)}
            className="
              w-full px-4 py-3 rounded-xl text-sm text-white
              bg-white/5 border border-white/10
              focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30
            "
          >
            {categorias.map((cat) => (
              <option key={cat.value} value={cat.value} className="bg-zinc-900">
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Descrição */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Descrição <span className="text-red-400">*</span>
          </label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva o problema com o máximo de detalhes possível..."
            className="
              w-full px-4 py-3 rounded-xl text-sm text-white
              bg-white/5 border border-white/10
              focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30
              placeholder-white/30 resize-none
            "
            rows={4}
          />
        </div>

        {/* Erro */}
        {erro && (
          <p className="text-sm text-red-400 flex items-center gap-1.5">
            <AlertCircle size={14} />
            {erro}
          </p>
        )}

        {/* Botões */}
        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-muted-foreground bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="
              flex-1 flex items-center justify-center gap-2 py-3
              rounded-xl text-sm font-bold font-display
              bg-primary/20 hover:bg-primary/30
              border border-primary/40 hover:border-primary/60
              text-primary transition-all shadow-glow
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {salvando ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            Abrir Chamado
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal: PortalCliente ──────────────────────

export default function PortalCliente() {
  const { token } = useParams<{ token: string }>();

  // Estado de dados
  const [projeto,   setProjeto]   = useState<Projeto | null>(null);
  const [ordens,    setOrdens]    = useState<OrdemServico[]>([]);
  const [documentos,setDocumentos]= useState<Documento[]>([]);
  const [chamados,  setChamados]  = useState<Chamado[]>([]);
  const [proposta,  setProposta]  = useState<Proposta | null>(null);

  // Estado de UI
  const [carregando,  setCarregando]  = useState(true);
  const [tokenInvalido, setTokenInvalido] = useState(false);
  const [abaAtiva,    setAbaAtiva]    = useState<AbaAtiva>("projeto");

  // Ref para auto-scroll na aba proposta
  const propostaRef = useRef<HTMLDivElement>(null);

  // Client Supabase com token do cliente
  const supabasePortal = token ? criarClientePortal(token) : null;

  // ── Carregamento de dados ────────────────────────────────

  const carregarDados = useCallback(async () => {
    if (!token || !supabasePortal) return;

    setCarregando(true);

    // 1. Buscar projeto pelo token
    const { data: proj, error: errProjeto } = await supabasePortal
      .from("projetos")
      .select("*")
      .eq("cliente_token", token)
      .single();

    if (errProjeto || !proj) {
      setTokenInvalido(true);
      setCarregando(false);
      return;
    }

    setProjeto(proj);

    // 2. Buscar dados paralelos
    const [
      { data: osData },
      { data: docsData },
      { data: chamadosData },
      { data: propostaData },
    ] = await Promise.all([
      supabasePortal
        .from("ordens_servico")
        .select("*")
        .eq("projeto_id", proj.id)
        .order("data_agendada", { ascending: true }),

      supabasePortal
        .from("documentos")
        .select("*")
        .eq("projeto_id", proj.id)
        .eq("visivel_cliente", true)
        .order("created_at", { ascending: false }),

      supabasePortal
        .from("chamados_suporte")
        .select("*")
        .eq("projeto_id", proj.id)
        .order("created_at", { ascending: false }),

      supabasePortal
        .from("propostas_online")
        .select("*, itens_proposta(*)")
        .eq("projeto_id", proj.id)
        .in("status", ["enviada", "visualizada", "aprovada", "recusada"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    setOrdens(osData || []);
    setDocumentos(docsData || []);
    setChamados(chamadosData || []);
    setProposta(propostaData || null);

    setCarregando(false);
  }, [token]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // ── Marcar proposta como visualizada ao abrir aba ────────

  useEffect(() => {
    async function marcarVisualizada() {
      if (
        abaAtiva === "proposta" &&
        proposta &&
        proposta.status === "enviada" &&
        supabasePortal
      ) {
        await supabasePortal
          .from("propostas_online")
          .update({
            status:         "visualizada",
            visualizada_em: new Date().toISOString(),
          })
          .eq("id", proposta.id)
          .eq("projeto_id", proposta.projeto_id);

        // Atualiza localmente sem recarregar tudo
        setProposta((p) => p ? { ...p, status: "visualizada", visualizada_em: new Date().toISOString() } : p);
      }
    }
    marcarVisualizada();
  }, [abaAtiva, proposta?.id]);

  // ── Badge de alerta na aba Proposta ─────────────────────

  const temPropostaPendente =
    proposta?.status === "enviada" || proposta?.status === "visualizada";

  // ── Tabs de navegação ────────────────────────────────────

  const abas: {
    key: AbaAtiva;
    label: string;
    icone: React.ReactNode;
  }[] = [
    { key: "projeto",    label: "Projeto",    icone: <Home size={20} /> },
    { key: "proposta",   label: "Proposta",   icone: <FileText size={20} /> },
    { key: "documentos", label: "Documentos", icone: <FolderOpen size={20} /> },
    { key: "suporte",    label: "Suporte",    icone: <HeadphonesIcon size={20} /> },
  ];

  // ── Tela de loading ──────────────────────────────────────

  if (carregando) {
    return (
      <div className="min-h-screen grid-bg bg-[#09090f] flex flex-col items-center justify-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Star size={28} className="text-primary" />
          <span className="font-display font-bold text-2xl text-gradient">ELYON</span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 size={20} className="animate-spin text-primary" />
          <span className="text-sm">Carregando seu portal...</span>
        </div>
      </div>
    );
  }

  // ── Tela de token inválido ───────────────────────────────

  if (tokenInvalido || !projeto) {
    return (
      <div className="min-h-screen grid-bg bg-[#09090f] flex flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="flex items-center gap-2 mb-4">
          <Star size={28} className="text-primary" />
          <span className="font-display font-bold text-2xl text-gradient">ELYON</span>
        </div>

        <div className="glass-card glow-border rounded-2xl p-8 max-w-md w-full space-y-4">
          <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 w-fit mx-auto">
            <XCircle size={36} className="text-red-400" />
          </div>
          <h2 className="font-display font-bold text-xl text-white">
            Link inválido ou expirado
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Este link de acesso não é válido ou não foi encontrado em nosso sistema.
            Verifique se o endereço está correto ou entre em contato com a ELYON Group.
          </p>
          <div className="pt-2 border-t border-white/10 space-y-2">
            <p className="text-xs text-muted-foreground">
              Precisa de ajuda?{" "}
              <a
                href="mailto:contato@elyongroup.com.br"
                className="text-primary hover:underline"
              >
                contato@elyongroup.com.br
              </a>
            </p>
            <a
              href="https://wa.me/5511999999999?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20portal%20ELYON"
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                bg-green-500/15 hover:bg-green-500/25
                border border-green-500/30 hover:border-green-500/50
                text-green-400 transition-all
              "
            >
              {/* Ícone WhatsApp via SVG inline */}
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Falar via WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Portal completo ──────────────────────────────────────

  const stProjeto = STATUS_PROJETO[projeto.status];

  return (
    <div className="min-h-screen grid-bg bg-[#09090f] flex flex-col">
      {/* ─── Header fixo ──────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#09090f]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Star size={20} className="text-primary" />
            <span className="font-display font-bold text-lg text-gradient leading-none">
              ELYON
            </span>
          </div>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Informações do projeto */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate leading-none mb-0.5">
              {projeto.cliente_nome}
            </p>
            <p className="text-sm font-medium text-white truncate leading-none">
              {projeto.titulo}
            </p>
          </div>

          {/* Badge de status */}
          <Badge label={stProjeto.label} cor={stProjeto.cor} />
        </div>

        {/* ─── Abas (desktop: no header) ─────────────────── */}
        <div className="hidden sm:block border-t border-white/10">
          <div className="max-w-2xl mx-auto px-4 flex">
            {abas.map((aba) => (
              <button
                key={aba.key}
                onClick={() => setAbaAtiva(aba.key)}
                className={`
                  relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all
                  ${abaAtiva === aba.key
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-white border-b-2 border-transparent"}
                `}
              >
                {aba.icone}
                {aba.label}
                {/* Badge de alerta na proposta */}
                {aba.key === "proposta" && temPropostaPendente && (
                  <span className="absolute top-1.5 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ─── Conteúdo principal ───────────────────────────── */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 pb-28 sm:pb-8">
        {abaAtiva === "projeto" && (
          <AbaProjeto projeto={projeto} ordens={ordens} />
        )}
        {abaAtiva === "proposta" && (
          <div ref={propostaRef}>
            <AbaProposta
              proposta={proposta}
              projetoId={projeto.id}
              supabasePortal={supabasePortal!}
              onAtualizar={carregarDados}
            />
          </div>
        )}
        {abaAtiva === "documentos" && (
          <AbaDocumentos documentos={documentos} />
        )}
        {abaAtiva === "suporte" && (
          <AbaSuporte
            chamados={chamados}
            projeto={projeto}
            supabasePortal={supabasePortal!}
            onAtualizar={carregarDados}
          />
        )}
      </main>

      {/* ─── Bottom tabs (mobile) ─────────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#09090f]/95 backdrop-blur-md border-t border-white/10">
        <div className="flex">
          {abas.map((aba) => (
            <button
              key={aba.key}
              onClick={() => setAbaAtiva(aba.key)}
              className={`
                relative flex-1 flex flex-col items-center gap-1 py-3 min-h-[56px] transition-all
                ${abaAtiva === aba.key ? "text-primary" : "text-muted-foreground"}
              `}
            >
              {aba.icone}
              <span className="text-[10px] font-medium">{aba.label}</span>
              {/* Badge de alerta */}
              {aba.key === "proposta" && temPropostaPendente && (
                <span className="absolute top-2 right-[calc(50%-8px)] w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              {/* Indicador ativo */}
              {abaAtiva === aba.key && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ─── Footer ───────────────────────────────────────── */}
      <footer className="hidden sm:block border-t border-white/5 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          <span className="text-gradient font-semibold">ELYON Group</span>
          {" "}· Tecnologia com propósito
        </p>
      </footer>
    </div>
  );
}
