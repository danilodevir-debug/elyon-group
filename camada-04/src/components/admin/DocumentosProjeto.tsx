// ============================================================
// ELYON Group · Componente de Gestão de Documentos por Projeto
// Embeddável no detalhe de qualquer projeto do painel admin
// ============================================================

import { useEffect, useState, useRef, useCallback } from "react";
import {
  FolderOpen,
  BookOpen,
  Map,
  Award,
  Shield,
  FileText,
  Image,
  File,
  UploadCloud,
  ExternalLink,
  Trash2,
  Eye,
  EyeOff,
  X,
  Plus,
  Loader2,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase client ──────────────────────────────────────────
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnon);

// ── Tipos ─────────────────────────────────────────────────────

export type TipoDocumento =
  | "manual"
  | "planta"
  | "certificado"
  | "garantia"
  | "relatorio"
  | "foto"
  | "outro";

export interface Documento {
  id: string;
  created_at: string;
  projeto_id: string;
  titulo: string;
  descricao: string | null;
  tipo: TipoDocumento;
  storage_path: string;
  url_publica: string;
  tamanho_bytes: number;
  mime_type: string;
  visivel_cliente: boolean;
  criado_por_nome: string;
}

interface DocumentosProjetoProps {
  projetoId: string;
}

// ── Ícones e cores por tipo ────────────────────────────────────

const tipoIcone: Record<TipoDocumento, React.ElementType> = {
  manual:      BookOpen,
  planta:      Map,
  certificado: Award,
  garantia:    Shield,
  relatorio:   FileText,
  foto:        Image,
  outro:       File,
};

const tipoCor: Record<TipoDocumento, string> = {
  manual:      "#a78bfa",
  planta:      "#38bdf8",
  certificado: "#fbbf24",
  garantia:    "#34d399",
  relatorio:   "#94a3b8",
  foto:        "#f472b6",
  outro:       "#64748b",
};

const tipoLabel: Record<TipoDocumento, string> = {
  manual:      "Manual",
  planta:      "Planta",
  certificado: "Certificado",
  garantia:    "Garantia",
  relatorio:   "Relatório",
  foto:        "Foto",
  outro:       "Outro",
};

// Todos os tipos disponíveis como opção de filtro
const TIPOS_FILTRO: (TipoDocumento | "todos")[] = [
  "todos", "manual", "planta", "certificado", "garantia", "relatorio", "foto", "outro",
];

// ── Utilitários ────────────────────────────────────────────────

/** Formata bytes em B, KB ou MB legível */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Formata data ISO para DD/MM/AAAA */
function formatData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

// ── Subcomponente: Switch toggle pequeno ──────────────────────

interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`
        relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60
        ${checked ? "bg-primary" : "bg-white/10"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <span
        className={`
          inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm
          transform transition-transform duration-200
          ${checked ? "translate-x-4" : "translate-x-1"}
        `}
      />
    </button>
  );
}

// ── Subcomponente: Card de documento ──────────────────────────

interface DocumentoCardProps {
  doc: Documento;
  onToggleVisivel: (doc: Documento) => void;
  onDelete: (id: string, storagePath: string) => void;
  toggling: boolean;
}

function DocumentoCard({ doc, onToggleVisivel, onDelete, toggling }: DocumentoCardProps) {
  // Estado local para confirmação de exclusão inline
  const [confirmando, setConfirmando] = useState(false);
  const [deletando, setDeletando] = useState(false);

  const Icone = tipoIcone[doc.tipo];
  const cor   = tipoCor[doc.tipo];

  async function handleConfirmarDelete() {
    setDeletando(true);
    await onDelete(doc.id, doc.storage_path);
    // onDelete já remove da lista acima; se falhar, permite cancelar
    setDeletando(false);
    setConfirmando(false);
  }

  return (
    <div className="glass-card glow-border rounded-xl p-4 flex flex-col gap-3 relative">
      {/* Cabeçalho do card */}
      <div className="flex items-start gap-3">
        {/* Ícone grande do tipo */}
        <div
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ backgroundColor: `${cor}22` }}
        >
          <Icone size={22} style={{ color: cor }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white truncate leading-tight">{doc.titulo}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Badge de tipo */}
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${cor}22`, color: cor }}
            >
              {tipoLabel[doc.tipo]}
            </span>
            {/* Badge "Oculto" quando invisível */}
            {!doc.visivel_cliente && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-red-500/50 text-red-400">
                Oculto
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Descrição (se existir) */}
      {doc.descricao && (
        <p className="text-xs text-muted-foreground line-clamp-2">{doc.descricao}</p>
      )}

      {/* Metadados */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{formatBytes(doc.tamanho_bytes)}</span>
        <span className="text-white/20">•</span>
        <span>{formatData(doc.created_at)}</span>
        <span className="text-white/20">•</span>
        <span>{doc.criado_por_nome}</span>
      </div>

      {/* Linha de ações */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
        {/* Toggle visível ao cliente */}
        <div className="flex items-center gap-2">
          {doc.visivel_cliente
            ? <Eye size={13} className="text-primary" />
            : <EyeOff size={13} className="text-muted-foreground" />}
          <span className="text-xs text-muted-foreground">Visível ao cliente</span>
          <ToggleSwitch
            checked={doc.visivel_cliente}
            onChange={() => onToggleVisivel(doc)}
            disabled={toggling}
          />
        </div>

        {/* Ações direita */}
        <div className="flex items-center gap-1">
          {/* Botão baixar */}
          <a
            href={doc.url_publica}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir / baixar"
            className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
          >
            <ExternalLink size={14} />
          </a>

          {/* Botão excluir */}
          <button
            type="button"
            title="Excluir documento"
            onClick={() => setConfirmando(true)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Confirmação inline de exclusão */}
      {confirmando && (
        <div className="absolute inset-0 rounded-xl bg-[#09090f]/95 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 z-10">
          <p className="text-sm font-semibold text-white text-center">Excluir documento?</p>
          <p className="text-xs text-muted-foreground text-center">
            Isso não pode ser desfeito.
          </p>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              disabled={deletando}
              className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-muted-foreground hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarDelete}
              disabled={deletando}
              className="px-3 py-1.5 text-xs rounded-lg border border-red-500/60 text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 transition-colors"
            >
              {deletando && <Loader2 size={11} className="animate-spin" />}
              Confirmar exclusão
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────

export default function DocumentosProjeto({ projetoId }: DocumentosProjetoProps) {
  // ── Estado da lista ────────────────────────────────────────
  const [documentos, setDocumentos]   = useState<Documento[]>([]);
  const [carregando, setCarregando]   = useState(true);
  const [filtroTipo, setFiltroTipo]   = useState<TipoDocumento | "todos">("todos");
  const [togglingId, setTogglingId]   = useState<string | null>(null);

  // ── Estado do formulário de upload ──────────────────────────
  const [formAberto, setFormAberto]   = useState(false);
  const [titulo, setTitulo]           = useState("");
  const [tipo, setTipo]               = useState<TipoDocumento>("manual");
  const [descricao, setDescricao]     = useState("");
  const [visivelCliente, setVisivelCliente] = useState(true);
  const [arquivo, setArquivo]         = useState<File | null>(null);
  const [enviando, setEnviando]       = useState(false);
  const [erroUpload, setErroUpload]   = useState<string | null>(null);

  // ── Drag & drop ────────────────────────────────────────────
  const [arrastando, setArrastando]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Buscar documentos do Supabase ──────────────────────────
  const buscarDocumentos = useCallback(async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from("documentos")
        .select("*")
        .eq("projeto_id", projetoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocumentos((data as Documento[]) ?? []);
    } catch (err) {
      console.error("Erro ao buscar documentos:", err);
    } finally {
      setCarregando(false);
    }
  }, [projetoId]);

  useEffect(() => {
    buscarDocumentos();
  }, [buscarDocumentos]);

  // ── Filtro local por tipo ──────────────────────────────────
  const documentosFiltrados = filtroTipo === "todos"
    ? documentos
    : documentos.filter((d) => d.tipo === filtroTipo);

  const totalVisiveis = documentos.filter((d) => d.visivel_cliente).length;

  // ── Toggle visibilidade ────────────────────────────────────
  async function handleToggleVisivel(doc: Documento) {
    setTogglingId(doc.id);
    // Optimistic update
    setDocumentos((prev) =>
      prev.map((d) => d.id === doc.id ? { ...d, visivel_cliente: !d.visivel_cliente } : d)
    );
    try {
      const { error } = await supabase
        .from("documentos")
        .update({ visivel_cliente: !doc.visivel_cliente })
        .eq("id", doc.id);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao atualizar visibilidade:", err);
      // Reverter em caso de erro
      setDocumentos((prev) =>
        prev.map((d) => d.id === doc.id ? { ...d, visivel_cliente: doc.visivel_cliente } : d)
      );
    } finally {
      setTogglingId(null);
    }
  }

  // ── Excluir documento ──────────────────────────────────────
  async function handleDelete(id: string, storagePath: string) {
    // Optimistic: remove da lista imediatamente
    setDocumentos((prev) => prev.filter((d) => d.id !== id));
    try {
      const { error: dbError } = await supabase
        .from("documentos")
        .delete()
        .eq("id", id);
      if (dbError) throw dbError;

      const { error: storageError } = await supabase.storage
        .from("elyon-documentos")
        .remove([storagePath]);
      if (storageError) console.warn("Erro ao remover arquivo do storage:", storageError);
    } catch (err) {
      console.error("Erro ao excluir documento:", err);
      // Recarrega a lista para consistência
      buscarDocumentos();
    }
  }

  // ── Drag & drop handlers ───────────────────────────────────
  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastando(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastando(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastando(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setArquivo(dropped);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) setArquivo(selected);
  }

  // ── Upload ─────────────────────────────────────────────────
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo || !titulo.trim()) return;

    setEnviando(true);
    setErroUpload(null);

    try {
      // 1. Fazer upload do arquivo para o Storage
      const nomeSeguro = arquivo.name.replace(/\s/g, "_");
      const filePath = `projetos/${projetoId}/${Date.now()}-${nomeSeguro}`;

      const { error: uploadError } = await supabase.storage
        .from("elyon-documentos")
        .upload(filePath, arquivo);

      if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

      // 2. Gerar URL assinada com validade de 1 ano
      const { data: urlData, error: urlError } = await supabase.storage
        .from("elyon-documentos")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      if (urlError || !urlData?.signedUrl)
        throw new Error("Erro ao gerar URL de acesso ao arquivo.");

      // 3. Salvar metadados no banco de dados
      const novoDoc = {
        projeto_id:      projetoId,
        titulo:          titulo.trim(),
        tipo,
        descricao:       descricao.trim() || null,
        storage_path:    filePath,
        url_publica:     urlData.signedUrl,
        tamanho_bytes:   arquivo.size,
        mime_type:       arquivo.type,
        visivel_cliente: visivelCliente,
        criado_por_nome: "Admin ELYON",
      };

      const { data: inserted, error: insertError } = await supabase
        .from("documentos")
        .insert(novoDoc)
        .select()
        .single();

      if (insertError) throw new Error(`Erro ao salvar metadados: ${insertError.message}`);

      // 4. Atualizar lista local (optimistic insert no topo)
      setDocumentos((prev) => [inserted as Documento, ...prev]);

      // 5. Resetar formulário
      resetarFormulario();
      setFormAberto(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido no upload.";
      setErroUpload(msg);
    } finally {
      setEnviando(false);
    }
  }

  /** Limpa todos os campos do formulário */
  function resetarFormulario() {
    setTitulo("");
    setTipo("manual");
    setDescricao("");
    setVisivelCliente(true);
    setArquivo(null);
    setErroUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function fecharFormulario() {
    resetarFormulario();
    setFormAberto(false);
  }

  // ── Ícone de preview do arquivo selecionado ────────────────
  function iconePreviewMime(mimeType: string): React.ElementType {
    if (mimeType.startsWith("image/"))       return Image;
    if (mimeType === "application/pdf")      return FileText;
    if (mimeType.includes("word"))           return BookOpen;
    if (mimeType.includes("sheet") || mimeType.includes("csv")) return FileText;
    return File;
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <section className="flex flex-col gap-4">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FolderOpen size={20} className="text-primary" />
          <h2 className="font-display font-semibold text-lg text-white">Documentos</h2>
          {/* Contadores */}
          {!carregando && (
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">
                {documentos.length} total
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary">
                {totalVisiveis} visíveis
              </span>
            </div>
          )}
        </div>

        {/* Botão adicionar */}
        <button
          type="button"
          onClick={() => setFormAberto((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:shadow-yellow transition-all duration-200"
        >
          <Plus size={15} />
          Adicionar Documento
        </button>
      </div>

      {/* ── Formulário de upload ────────────────────────────── */}
      {formAberto && (
        <div className="glass-card glow-border rounded-xl p-5 flex flex-col gap-4">
          {/* Header do formulário */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-base">Adicionar Documento</h3>
            <button
              type="button"
              onClick={fecharFormulario}
              className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="w-full h-px bg-white/5" />

          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            {/* Título */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Título <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Manual de operação do sistema"
                required
                className="
                  w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                  text-sm text-white placeholder:text-white/30
                  focus:outline-none focus:border-primary/60 focus:bg-primary/5
                  transition-colors
                "
              />
            </div>

            {/* Tipo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tipo <span className="text-red-400">*</span>
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoDocumento)}
                required
                className="
                  w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                  text-sm text-white
                  focus:outline-none focus:border-primary/60 focus:bg-primary/5
                  transition-colors appearance-none cursor-pointer
                "
              >
                {(Object.keys(tipoLabel) as TipoDocumento[]).map((t) => (
                  <option key={t} value={t} className="bg-[#09090f] text-white">
                    {tipoLabel[t]}
                  </option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Descrição
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição opcional do documento..."
                rows={2}
                className="
                  w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                  text-sm text-white placeholder:text-white/30
                  focus:outline-none focus:border-primary/60 focus:bg-primary/5
                  transition-colors resize-none
                "
              />
            </div>

            {/* Toggle visível ao cliente */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Visível ao cliente</p>
                <p className="text-xs text-muted-foreground">
                  O cliente poderá baixar este documento no portal
                </p>
              </div>
              <ToggleSwitch
                checked={visivelCliente}
                onChange={() => setVisivelCliente((v) => !v)}
              />
            </div>

            {/* Zona de arquivo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Arquivo <span className="text-red-400">*</span>
              </label>

              {/* Input oculto */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileInputChange}
                className="hidden"
                accept="*/*"
              />

              {/* Zona de drag & drop */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative flex flex-col items-center justify-center gap-2 py-8 rounded-xl
                  border-2 border-dashed cursor-pointer select-none
                  transition-all duration-200
                  ${arrastando
                    ? "border-accent bg-accent/10"
                    : arquivo
                    ? "border-primary/50 bg-primary/5"
                    : "border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10"
                  }
                `}
              >
                {arrastando ? (
                  <>
                    <UploadCloud size={32} className="text-accent" />
                    <p className="text-sm font-medium text-accent">Solte aqui</p>
                  </>
                ) : arquivo ? (
                  /* Arquivo selecionado: mostra preview */
                  <>
                    {(() => {
                      const Ico = iconePreviewMime(arquivo.type);
                      return <Ico size={32} className="text-primary" />;
                    })()}
                    <p className="text-sm font-medium text-white text-center px-4 truncate max-w-full">
                      {arquivo.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatBytes(arquivo.size)}</p>
                    <p className="text-xs text-primary/70">Clique para trocar o arquivo</p>
                  </>
                ) : (
                  /* Estado inicial */
                  <>
                    <UploadCloud size={32} className="text-primary/60" />
                    <p className="text-sm text-white/70">
                      Arraste um arquivo ou{" "}
                      <span className="text-primary font-medium">clique para selecionar</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Qualquer formato aceito</p>
                  </>
                )}
              </div>
            </div>

            {/* Barra de progresso indeterminate durante envio */}
            {enviando && (
              <div className="w-full h-1 rounded-full overflow-hidden bg-white/10">
                <div className="h-full bg-primary rounded-full animate-[slide_1.5s_ease-in-out_infinite]" />
              </div>
            )}

            {/* Mensagem de erro */}
            {erroUpload && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <X size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-400">{erroUpload}</p>
              </div>
            )}

            {/* Ações do formulário */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={fecharFormulario}
                disabled={enviando}
                className="px-4 py-2 text-sm rounded-lg border border-white/10 text-muted-foreground hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando || !arquivo || !titulo.trim()}
                className="
                  flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                  bg-accent text-accent-foreground
                  disabled:opacity-50 disabled:cursor-not-allowed
                  hover:shadow-yellow transition-all duration-200
                "
              >
                {enviando ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Fazer Upload
                    <span className="text-base leading-none">→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Chips de filtro por tipo ────────────────────────── */}
      {documentos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TIPOS_FILTRO.map((t) => {
            const ativo = filtroTipo === t;
            const label = t === "todos" ? "Todos" : tipoLabel[t];
            const qtd   = t === "todos"
              ? documentos.length
              : documentos.filter((d) => d.tipo === t).length;

            if (t !== "todos" && qtd === 0) return null;

            return (
              <button
                key={t}
                type="button"
                onClick={() => setFiltroTipo(t)}
                className={`
                  flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                  border transition-all duration-200
                  ${ativo
                    ? "bg-primary/20 border-primary/50 text-primary"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/8 hover:text-white"
                  }
                `}
              >
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ativo ? "bg-primary/30" : "bg-white/10"}`}>
                  {qtd}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Estado de carregamento ──────────────────────────── */}
      {carregando ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : documentos.length === 0 ? (
        /* ── Estado vazio ──────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5">
            <FolderOpen size={32} className="text-muted-foreground" />
          </div>
          <p className="font-semibold text-white">Nenhum documento cadastrado</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Adicione manuais, plantas, certificados e garantias do projeto
          </p>
        </div>
      ) : documentosFiltrados.length === 0 ? (
        /* ── Sem resultados para o filtro ─────────────────── */
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
          <File size={24} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum documento do tipo "{filtroTipo === "todos" ? "todos" : tipoLabel[filtroTipo as TipoDocumento]}"
          </p>
        </div>
      ) : (
        /* ── Grid de cards ─────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {documentosFiltrados.map((doc) => (
            <DocumentoCard
              key={doc.id}
              doc={doc}
              onToggleVisivel={handleToggleVisivel}
              onDelete={handleDelete}
              toggling={togglingId === doc.id}
            />
          ))}
        </div>
      )}

      {/* Animação da barra de progresso indeterminate via keyframes inline */}
      <style>{`
        @keyframes slide {
          0%   { transform: translateX(-100%) scaleX(0.5); }
          50%  { transform: translateX(0%)    scaleX(1);   }
          100% { transform: translateX(100%) scaleX(0.5);  }
        }
      `}</style>
    </section>
  );
}
