import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const diferenciais = [
  "Projetos personalizados do zero",
  "Equipe técnica certificada",
  "Suporte pós-instalação dedicado",
  "Sistemas integrados em uma só plataforma",
  "Monitoramento remoto 24/7",
  "Garantia em todos os equipamentos",
];

export const Imersiva = () => (
  <section id="imersiva" className="py-24 overflow-hidden">
    <div className="container">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Texto */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-sm font-medium text-primary-glow uppercase tracking-widest mb-3">
            A experiência ELYON
          </p>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Tecnologia que{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              transforma
            </span>{" "}
            ambientes
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-8">
            Da câmera ao sistema de automação completo, cada projeto ELYON é planejado
            para integrar segurança, conforto e eficiência em um único ecossistema
            controlado pela palma da sua mão.
          </p>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {diferenciais.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <CheckCircle2 size={16} className="text-primary-glow flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Visual */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          <div className="relative rounded-2xl border border-border/40 bg-card/50 p-8 glow-border">
            <div className="absolute -top-px inset-x-8 h-px bg-gradient-to-r from-transparent via-primary-glow/60 to-transparent" />
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "500+", label: "Projetos entregues" },
                { value: "98%", label: "Satisfação dos clientes" },
                { value: "24/7", label: "Suporte técnico" },
                { value: "5 anos", label: "Garantia média" },
              ].map(({ value, label }) => (
                <div key={label} className="rounded-xl border border-border/30 bg-background/50 p-5">
                  <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-1">
                    {value}
                  </p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);
