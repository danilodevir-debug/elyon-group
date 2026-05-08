import { motion } from "framer-motion";
import { Activity, Camera, Bell, Wifi, TrendingUp, Shield } from "lucide-react";

const metrics = [
  { icon: Camera, label: "Câmeras online", value: "12/12", color: "text-green-400" },
  { icon: Bell, label: "Alertas hoje", value: "3", color: "text-yellow-400" },
  { icon: Wifi, label: "Dispositivos", value: "47", color: "text-blue-400" },
  { icon: Shield, label: "Status", value: "Seguro", color: "text-green-400" },
];

const events = [
  { time: "08:42", desc: "Acesso autorizado — Porta principal", type: "ok" },
  { time: "10:15", desc: "Câmera 03 — Movimento detectado", type: "alert" },
  { time: "11:30", desc: "Sistema de som ativado — Sala", type: "ok" },
  { time: "14:00", desc: "Portão automático — Abertura remota", type: "ok" },
  { time: "15:22", desc: "Sensor de fumaça — Teste periódico OK", type: "ok" },
];

export const Dashboard = () => (
  <section id="dashboard" className="py-24">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <p className="text-sm font-medium text-primary-glow uppercase tracking-widest mb-3">
          Controle total
        </p>
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          Tudo na palma da{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            sua mão
          </span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-lg">
          Monitore câmeras, controle dispositivos e receba alertas em tempo real —
          de qualquer lugar.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Métricas */}
        <div className="lg:col-span-1 grid grid-cols-2 gap-4 content-start">
          {metrics.map(({ icon: Icon, label, value, color }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="rounded-xl border border-border/40 bg-card/50 p-4"
            >
              <Icon size={16} className={`${color} mb-3`} />
              <p className={`text-2xl font-bold ${color} mb-1`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Log de eventos */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="lg:col-span-2 rounded-2xl border border-border/40 bg-card/50 p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Activity size={16} className="text-primary-glow" />
            <span className="font-semibold text-sm">Log de Eventos — Hoje</span>
            <span className="ml-auto flex items-center gap-1 text-xs text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Ao vivo
            </span>
          </div>
          <div className="space-y-3">
            {events.map((ev, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border/30 bg-background/40 px-4 py-3"
              >
                <span className="text-xs text-muted-foreground font-mono mt-0.5 flex-shrink-0">
                  {ev.time}
                </span>
                <span className="text-sm text-foreground/80">{ev.desc}</span>
                <span
                  className={`ml-auto text-xs flex-shrink-0 ${
                    ev.type === "alert" ? "text-yellow-400" : "text-green-400"
                  }`}
                >
                  {ev.type === "alert" ? "⚠" : "✓"}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp size={12} />
            Exibindo eventos das últimas 8 horas
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);
