import { Shield, Music, Wifi, Cpu, MessageCircle } from "lucide-react";

const services = [
  { Icon: Shield, label: "Segurança & CFTV" },
  { Icon: Music, label: "Sonorização Ambiente" },
  { Icon: Wifi, label: "Conectividade" },
  { Icon: Cpu, label: "Automação Residencial" },
];

const navLinks = [
  { href: "#imersiva", label: "Experiência" },
  { href: "#servicos", label: "Serviços" },
  { href: "#dashboard", label: "Dashboard" },
  { href: "#sobre", label: "Sobre" },
  { href: "#contato", label: "Contato" },
];

export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-border/40 bg-background">
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-glow/40 to-transparent" />

      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="font-bold text-lg tracking-tight">
                ELYON <span className="text-primary-glow">Group</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Transformando ambientes através de tecnologia integrada em segurança,
              áudio, conectividade e automação.
            </p>
            <a
              href="https://wa.me/5500000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-accent-foreground text-xs font-bold hover:shadow-yellow transition-all hover:-translate-y-0.5"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Falar pelo WhatsApp
            </a>
          </div>

          {/* Nav */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
              Navegação
            </p>
            <ul className="space-y-3">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
                  >
                    <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-primary-glow opacity-0 group-hover:opacity-100 transition-opacity" />
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
              Soluções
            </p>
            <ul className="space-y-3">
              {services.map(({ Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary-glow flex-shrink-0" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/40 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {year} ELYON Group. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-xs text-muted-foreground font-mono">
              sistema v1.0 · online
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
