// ============================================================
// ELYON Group · Seção Contato — Camada 02
// Integrado com Supabase Edge Function + WhatsApp automático
// ============================================================

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Phone, Mail, MapPin, MessageCircle, CheckCircle, AlertCircle } from "lucide-react";
import { submitLead } from "@/lib/supabase";

const services = [
  "Segurança & CFTV",
  "Sonorização Ambiente",
  "Conectividade & Redes",
  "Automação Residencial",
  "Projeto Completo Integrado",
  "Manutenção / Suporte",
];

const contactInfo = [
  { Icon: Phone,  label: "Telefone",     value: "(00) 00000-0000",          href: "tel:+5500000000000" },
  { Icon: Mail,   label: "E-mail",       value: "contato@elyongroup.com.br", href: "mailto:contato@elyongroup.com.br" },
  { Icon: MapPin, label: "Localização",  value: "Sua cidade, Estado",        href: "#" },
];

type FormState = "idle" | "loading" | "success" | "error";

export const Contato = () => {
  const [form, setForm] = useState({
    nome: "", telefone: "", email: "", servico: "", mensagem: "",
  });
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    const result = await submitLead({
      nome:     form.nome,
      telefone: form.telefone,
      email:    form.email,
      servico:  form.servico || undefined,
      mensagem: form.mensagem || undefined,
    });

    if (result.success) {
      setState("success");
    } else {
      setState("error");
      setErrorMsg(result.error || "Erro inesperado. Tente novamente.");
    }
  };

  const reset = () => {
    setState("idle");
    setErrorMsg("");
    setForm({ nome: "", telefone: "", email: "", servico: "", mensagem: "" });
  };

  const isValid = form.nome.trim() && form.telefone.trim() && form.email.trim();

  return (
    <section id="contato" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/10 to-background" />
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-gradient-glow blur-3xl opacity-30" />

      <div className="container relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <span className="text-xs uppercase tracking-[0.3em] text-primary-glow font-semibold">
            Fale com a gente
          </span>
          <h2 className="mt-4 font-display font-black text-4xl md:text-6xl tracking-tight leading-[1]">
            Pronto para{" "}
            <span className="text-gradient">transformar</span>
            <br />
            seu espaço?
          </h2>
          <p className="mt-6 text-muted-foreground text-lg leading-relaxed">
            Preencha o formulário e nossa equipe entra em contato em até 2h
            no horário comercial.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start max-w-5xl mx-auto">
          {/* ── Formulário ── */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative glass-card glow-border rounded-2xl p-8">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />

              {/* Estado: sucesso */}
              {state === "success" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-center gap-4"
                >
                  <div className="p-4 rounded-full bg-accent/15 border border-accent/30">
                    <CheckCircle className="h-10 w-10 text-accent" />
                  </div>
                  <h3 className="font-display font-bold text-2xl">Recebemos seu contato!</h3>
                  <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                    Nossa equipe foi notificada e vai retornar em até 2h via WhatsApp.
                  </p>
                  <button
                    onClick={reset}
                    className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                  >
                    Enviar outra mensagem
                  </button>
                </motion.div>
              )}

              {/* Estado: erro */}
              {state === "error" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center gap-4"
                >
                  <div className="p-4 rounded-full bg-destructive/15 border border-destructive/30">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                  </div>
                  <h3 className="font-display font-bold text-xl">Algo deu errado</h3>
                  <p className="text-muted-foreground text-sm max-w-xs">{errorMsg}</p>
                  <button
                    onClick={() => setState("idle")}
                    className="mt-2 px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:border-primary-glow/40 transition-colors"
                  >
                    Tentar novamente
                  </button>
                </motion.div>
              )}

              {/* Estado: formulário */}
              {(state === "idle" || state === "loading") && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                        Nome *
                      </label>
                      <input
                        type="text" name="nome" value={form.nome}
                        onChange={handleChange} required
                        placeholder="Seu nome completo"
                        disabled={state === "loading"}
                        className="w-full px-4 py-3 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                        Telefone *
                      </label>
                      <input
                        type="tel" name="telefone" value={form.telefone}
                        onChange={handleChange} required
                        placeholder="(00) 00000-0000"
                        disabled={state === "loading"}
                        className="w-full px-4 py-3 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      E-mail *
                    </label>
                    <input
                      type="email" name="email" value={form.email}
                      onChange={handleChange} required
                      placeholder="seuemail@exemplo.com"
                      disabled={state === "loading"}
                      className="w-full px-4 py-3 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Serviço desejado
                    </label>
                    <select
                      name="servico" value={form.servico}
                      onChange={handleChange}
                      disabled={state === "loading"}
                      className="w-full px-4 py-3 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground text-sm transition-all appearance-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="" className="bg-background">Selecione um serviço...</option>
                      {services.map((s) => (
                        <option key={s} value={s} className="bg-background">{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Mensagem
                    </label>
                    <textarea
                      name="mensagem" value={form.mensagem}
                      onChange={handleChange} rows={4}
                      placeholder="Descreva seu espaço e o que você precisa..."
                      disabled={state === "loading"}
                      className="w-full px-4 py-3 rounded-xl bg-background/60 border border-border focus:border-primary-glow/60 focus:outline-none focus:ring-1 focus:ring-primary-glow/30 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all resize-none disabled:opacity-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!isValid || state === "loading"}
                    className="group w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-accent text-accent-foreground font-bold text-sm hover:shadow-yellow transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {state === "loading" ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-accent-foreground/40 border-t-accent-foreground animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4" />
                        Solicitar Orçamento
                        <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-muted-foreground/60">
                    Seus dados são utilizados apenas para retorno de contato.
                  </p>
                </form>
              )}
            </div>
          </motion.div>

          {/* ── Info lateral ── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex flex-col gap-6"
          >
            <div className="space-y-4">
              {contactInfo.map((info, i) => (
                <motion.a
                  key={info.label} href={info.href}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex items-center gap-4 group glass-card rounded-xl p-4 hover:shadow-glow transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex-shrink-0 p-3 rounded-xl bg-primary/15 border border-primary/30 group-hover:shadow-glow transition-all">
                    <info.Icon className="h-5 w-5 text-primary-glow" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{info.label}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{info.value}</p>
                  </div>
                </motion.a>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="glass-card rounded-xl p-6 border border-accent/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="text-xs uppercase tracking-widest text-accent font-semibold">Resposta rápida</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Em horário comercial respondemos em{" "}
                <span className="text-foreground font-semibold">até 2 horas</span>.
                Para urgências, entre em contato direto pelo WhatsApp.
              </p>
              <a
                href="https://wa.me/5500000000000"
                target="_blank" rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Abrir WhatsApp direto
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="glass-card rounded-xl p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Por que escolher a ELYON?
              </p>
              <ul className="space-y-3">
                {[
                  "Projetos 100% personalizados",
                  "Engenheiros certificados em campo",
                  "Suporte pós-instalação incluso",
                  "Tecnologia de alto padrão",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-foreground/80">
                    <span className="h-1.5 w-6 bg-accent rounded-full flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
