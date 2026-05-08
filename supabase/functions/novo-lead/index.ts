// ============================================================
// ELYON Group · Supabase Edge Function: novo-lead
// Deploy: supabase functions deploy novo-lead
// ============================================================
// Esta função é chamada pelo formulário de contato.
// Ela:
//   1. Valida os dados recebidos
//   2. Salva o lead no banco de dados (via service_role — seguro)
//   3. Envia mensagem automática no WhatsApp via Z-API
// As chaves Z-API ficam APENAS aqui, nunca expostas no frontend.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadPayload {
  nome: string;
  telefone: string;
  email: string;
  servico?: string;
  mensagem?: string;
  origem?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

// ── Helpers ──────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

// Monta a mensagem de WhatsApp para a equipe ELYON
function buildWhatsAppMessage(lead: LeadPayload): string {
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return (
    `🔔 *Novo Lead — ELYON Group*\n\n` +
    `📋 *Nome:* ${lead.nome}\n` +
    `📱 *Telefone:* ${lead.telefone}\n` +
    `📧 *E-mail:* ${lead.email}\n` +
    `🔧 *Serviço:* ${lead.servico || "Não especificado"}\n` +
    `💬 *Mensagem:*\n${lead.mensagem || "Sem mensagem adicional"}\n\n` +
    `📍 *Origem:* ${lead.origem || "site"}\n` +
    `🕐 *Horário:* ${now}\n\n` +
    `👉 Responda em até 2h para maximizar a conversão!`
  );
}

// Envia mensagem via Z-API
async function sendWhatsApp(message: string): Promise<boolean> {
  const instanceId = Deno.env.get("ZAPI_INSTANCE_ID");
  const token      = Deno.env.get("ZAPI_TOKEN");
  const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN");
  // Número da ELYON Group que vai RECEBER as notificações (apenas dígitos, com DDI)
  const recipientNumber = Deno.env.get("ZAPI_RECIPIENT_NUMBER");

  if (!instanceId || !token || !recipientNumber) {
    console.warn("[ZAPI] Variáveis não configuradas — notificação WhatsApp ignorada.");
    return false;
  }

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(clientToken ? { "Client-Token": clientToken } : {}),
    },
    body: JSON.stringify({
      phone: recipientNumber,
      message,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[ZAPI] Falha ao enviar mensagem:", err);
    return false;
  }

  console.log("[ZAPI] Mensagem enviada com sucesso.");
  return true;
}

// ── Handler principal ─────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 1. Parse do body
  let payload: LeadPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Validação mínima
  if (!payload.nome?.trim()) {
    return new Response(JSON.stringify({ error: "Campo 'nome' é obrigatório." }), {
      status: 422,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!isValidEmail(payload.email)) {
    return new Response(JSON.stringify({ error: "E-mail inválido." }), {
      status: 422,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!isValidPhone(payload.telefone)) {
    return new Response(JSON.stringify({ error: "Telefone inválido." }), {
      status: 422,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 3. Salva no banco (service_role bypassa RLS)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: lead, error: dbError } = await supabase
    .from("leads")
    .insert({
      nome:         payload.nome.trim(),
      telefone:     payload.telefone.trim(),
      email:        payload.email.trim().toLowerCase(),
      servico:      payload.servico?.trim() || null,
      mensagem:     payload.mensagem?.trim() || null,
      origem:       payload.origem || "site",
      utm_source:   payload.utm_source || null,
      utm_medium:   payload.utm_medium || null,
      utm_campaign: payload.utm_campaign || null,
      status:       "novo",
    })
    .select("id, created_at")
    .single();

  if (dbError) {
    console.error("[DB] Erro ao inserir lead:", dbError);
    return new Response(JSON.stringify({ error: "Erro ao salvar lead." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[DB] Lead salvo:", lead.id);

  // 4. Notificação WhatsApp (não bloqueia a resposta em caso de falha)
  const whatsappMsg = buildWhatsAppMessage(payload);
  sendWhatsApp(whatsappMsg).catch((err) =>
    console.error("[ZAPI] Erro inesperado:", err)
  );

  // 5. Resposta de sucesso
  return new Response(
    JSON.stringify({
      success: true,
      leadId: lead.id,
      message: "Lead recebido com sucesso. Em breve entraremos em contato.",
    }),
    {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
