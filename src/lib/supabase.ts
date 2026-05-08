// ============================================================
// ELYON Group · Supabase client (frontend — admin panel)
// ============================================================
// Este client usa a chave ANON (pública).
// A RLS do banco garante que só usuários autenticados leem leads.
// ============================================================

import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    "[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados no .env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnon);

// ── Tipos derivados do schema ─────────────────────────────────

export type LeadStatus =
  | "novo"
  | "em_contato"
  | "proposta"
  | "fechado"
  | "perdido";

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  nome: string;
  telefone: string;
  email: string;
  servico: string | null;
  mensagem: string | null;
  status: LeadStatus;
  notas: string | null;
  origem: string;
}

export interface PipelineResumo {
  status: LeadStatus;
  total: number;
  ultimos_7_dias: number;
}

// ── Helpers de API do admin ───────────────────────────────────

/** Busca todos os leads ordenados por data de criação */
export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Lead[];
}

/** Atualiza o status de um lead */
export async function updateLeadStatus(
  id: string,
  status: LeadStatus
): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}

/** Atualiza as notas internas de um lead */
export async function updateLeadNotas(
  id: string,
  notas: string
): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update({ notas })
    .eq("id", id);

  if (error) throw error;
}

/** Busca o resumo do pipeline (contagem por status) */
export async function fetchPipelineResumo(): Promise<PipelineResumo[]> {
  const { data, error } = await supabase
    .from("pipeline_resumo")
    .select("*");

  if (error) throw error;
  return data as PipelineResumo[];
}

// ── Submissão de lead pelo formulário (chama a Edge Function) ─

export async function submitLead(payload: {
  nome: string;
  telefone: string;
  email: string;
  servico?: string;
  mensagem?: string;
}): Promise<{ success: boolean; leadId?: string; error?: string }> {
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/novo-lead`;

  const res = await fetch(edgeFunctionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // A chave anon é necessária para autenticar a chamada à Edge Function
      apikey: supabaseAnon,
    },
    body: JSON.stringify({
      ...payload,
      origem: "site",
      // Captura UTMs da URL automaticamente se existirem
      utm_source:   new URLSearchParams(window.location.search).get("utm_source")   || undefined,
      utm_medium:   new URLSearchParams(window.location.search).get("utm_medium")   || undefined,
      utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign") || undefined,
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    return { success: false, error: json.error || "Erro ao enviar formulário." };
  }

  return { success: true, leadId: json.leadId };
}
