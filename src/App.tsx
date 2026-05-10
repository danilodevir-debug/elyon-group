// ============================================================
// ELYON Group · App.tsx — Roteamento completo (Camadas 01–04)
// ============================================================
// Rotas:
//   /                    → Site institucional (público)
//   /admin               → Painel admin — pipeline de leads  (auth)
//   /admin/projetos      → Painel admin — gestão de projetos (auth)
//   /admin/chamados      → Painel admin — chamados suporte   (auth)
//   /admin/estoque       → Painel admin — gestão de estoque  (auth)
//   /os/:token           → OS do técnico (sem login)
//   /portal/:token       → Portal do cliente (sem login)
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ── Camada 01 — Site institucional ───────────────────────────
import { Header }    from "@/components/Header";
import { Hero }      from "@/components/sections/Hero";
import { Imersiva }  from "@/components/sections/Imersiva";
import { Servicos }  from "@/components/sections/Servicos";
import { Dashboard } from "@/components/sections/Dashboard";
import { Sobre }     from "@/components/sections/Sobre";
import { Contato }   from "@/components/sections/Contato";
import { Footer }    from "@/components/Footer";

// ── Camada 02 — Admin de leads ───────────────────────────────
import { Admin }     from "@/pages/Admin";

// ── Camada 03 — Gestão de projetos + OS técnico ───────────────
import { Projetos }     from "@/pages/Projetos";
import OrdemServico      from "@/pages/OrdemServico";   // default export

// ── Camada 04 — Portal cliente + chamados ────────────────────
import PortalCliente     from "@/pages/PortalCliente";  // default export
import { AdminChamados } from "@/pages/AdminChamados";

// ── Camada 05 — Estoque ───────────────────────────────────────
import { AdminEstoque }  from "@/pages/AdminEstoque";

// ── Layout do site principal ──────────────────────────────────
const SiteLayout = () => (
  <main className="min-h-screen bg-background text-foreground antialiased">
    <Header />
    <Hero />
    <Imersiva />
    <Servicos />
    <Dashboard />
    <Sobre />
    <Contato />
    <Footer />
  </main>
);

// ── App ───────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Camada 01 — institucional */}
        <Route path="/" element={<SiteLayout />} />

        {/* Camada 02 — admin leads */}
        <Route path="/admin" element={<Admin />} />

        {/* Camada 03 — admin projetos + OS técnico */}
        <Route path="/admin/projetos" element={<Projetos />} />
        <Route path="/os/:token"      element={<OrdemServico />} />

        {/* Camada 04 — admin chamados + portal cliente */}
        <Route path="/admin/chamados"  element={<AdminChamados />} />
        <Route path="/portal/:token"   element={<PortalCliente />} />

        {/* Camada 05 — estoque */}
        <Route path="/admin/estoque"   element={<AdminEstoque />} />

        {/* Fallback — redireciona para home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
