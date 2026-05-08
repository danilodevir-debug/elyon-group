import { motion } from "framer-motion";
import { ArrowRight, Shield, Wifi, Cpu, Music } from "lucide-react";

const chips = [
  { Icon: Shield, label: "Segurança & CFTV" },
  { Icon: Music, label: "Sonorização" },
  { Icon: Wifi, label: "Conectividade" },
  { Icon: Cpu, label: "Automação" },
];

export const Hero = () => (
  <section className="relative min-h-screen flex items-center overflow-hidden">
    {/* Background glow */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[80px]" />
    </div>

    {/* Grid overlay */}
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage:
          "linear-gradient(hsl(var(--primary-glow)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-glow)) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }}
    />

    <div className="container relative z-10 pt-24 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-3xl"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary-glow mb-6"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          Tecnologia Integrada para Ambientes Premium
        </motion.div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
          Ambientes{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            inteligentes
          </span>
          ,<br />
          segurança{" "}
          <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
            real
          </span>
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
          Projetamos e instalamos sistemas integrados de segurança, sonorização,
          conectividade e automação residencial — do planejamento à entrega.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-4 mb-12">
          <a
            href="#contato"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Solicitar Orçamento <ArrowRight size={16} />
          </a>
          <a
            href="#servicos"
            className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-6 py-3 font-semibold text-foreground hover:bg-muted/30 transition-colors"
          >
            Ver Serviços
          </a>
        </div>

        {/* Service chips */}
        <div className="flex flex-wrap gap-3">
          {chips.map(({ Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-full border border-border/40 bg-card/50 px-4 py-1.5 text-sm text-muted-foreground"
            >
              <Icon size={14} className="text-primary-glow" />
              {label}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);
