import { motion } from "framer-motion";
import { Award, Users, MapPin, Zap } from "lucide-react";

const valores = [
  {
    Icon: Award,
    title: "Excelência técnica",
    desc: "Equipe certificada pelos principais fabricantes do mercado.",
  },
  {
    Icon: Users,
    title: "Foco no cliente",
    desc: "Cada projeto é único. Ouvimos, projetamos e entregamos.",
  },
  {
    Icon: MapPin,
    title: "Atendimento local",
  desc: "Presença regional com rapidez de resposta e suporte presencial.",
  },
  {
    Icon: Zap,
    title: "Inovação contínua",
    desc: "Sempre atualizados com as melhores tecnologias do setor.",
  },
];

export const Sobre = () => (
  <section id="sobre" className="py-24">
    <div className="container">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Visual */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative order-2 lg:order-1"
        >
          <div className="rounded-2xl border border-border/40 bg-card/50 p-8 glow-border">
            <div className="absolute -top-px inset-x-8 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
            <div className="space-y-4">
              {valores.map(({ Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4 rounded-xl border border-border/30 bg-background/40 p-4">
                  <div className="flex-shrink-0 rounded-lg border border-primary/20 bg-primary/10 p-2">
                    <Icon size={18} className="text-primary-glow" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-1">{title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Texto */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="order-1 lg:order-2"
        >
          <p className="text-sm font-medium text-primary-glow uppercase tracking-widest mb-3">
            Quem somos
          </p>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            A ELYON{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Group
            </span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-6">
            Somos uma empresa especializada em tecnologia integrada para ambientes
            residenciais e comerciais. Nossa missão é transformar espaços comuns em
            ambientes inteligentes, seguros e conectados.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-8">
            Com uma equipe de técnicos certificados e parceria com os principais
            fabricantes do mercado, entregamos projetos completos — da consultoria
            à instalação e suporte contínuo.
          </p>
          <a
            href="#contato"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Fale com a ELYON
          </a>
        </motion.div>
      </div>
    </div>
  </section>
);
