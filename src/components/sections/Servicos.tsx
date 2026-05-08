import { motion } from "framer-motion";
import { Shield, Music, Wifi, Cpu, Camera, Lock } from "lucide-react";

const servicos = [
  {
    Icon: Shield,
    title: "Segurança & CFTV",
    description:
      "Câmeras de alta definição, gravação em nuvem, alertas inteligentes e monitoramento remoto 24 horas por dia.",
    tags: ["IP", "4K", "Nuvem", "IA"],
  },
  {
    Icon: Music,
    title: "Sonorização Ambiente",
    description:
      "Sistemas de áudio distribuído para residências e comércios com controle por zona e integração com streaming.",
    tags: ["Multi-zona", "Streaming", "Sem fio"],
  },
  {
    Icon: Wifi,
    title: "Conectividade & Redes",
    description:
      "Infraestrutura de rede cabeada e Wi-Fi de alto desempenho com cobertura total e segmentação por VLAN.",
    tags: ["Wi-Fi 6", "Fibra", "VLAN", "Mesh"],
  },
  {
    Icon: Cpu,
    title: "Automação Residencial",
    description:
      "Controle inteligente de iluminação, climatização, cortinas e portões integrados em um único app.",
    tags: ["App", "Voz", "Cenas", "Timer"],
  },
  {
    Icon: Camera,
    title: "Controle de Acesso",
    description:
      "Portões automáticos, fechaduras digitais, interfones IP e rastreamento de acesso com logs detalhados.",
    tags: ["Biometria", "RFID", "IP", "Log"],
  },
  {
    Icon: Lock,
    title: "Alarme & Detecção",
    description:
      "Sensores de movimento, fumaça, gás e vibração com disparo de alertas e acionamento de sirenes.",
    tags: ["Sensores", "SMS", "App", "Central"],
  },
];

export const Servicos = () => (
  <section id="servicos" className="py-24">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <p className="text-sm font-medium text-primary-glow uppercase tracking-widest mb-3">
          O que fazemos
        </p>
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          Soluções{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            completas
          </span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-lg">
          Cada solução é projetada para funcionar de forma integrada, entregando
          uma experiência coesa e fácil de usar.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servicos.map(({ Icon, title, description, tags }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="group rounded-2xl border border-border/40 bg-card/50 p-6 hover:border-primary/30 hover:bg-card/80 transition-all duration-300"
          >
            <div className="mb-4 inline-flex rounded-xl border border-primary/20 bg-primary/10 p-3">
              <Icon size={22} className="text-primary-glow" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{description}</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/40 px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
