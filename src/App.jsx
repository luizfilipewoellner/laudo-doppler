import React, { useState } from "react";
import { Activity, GitBranch, Stethoscope, HeartPulse, Waves, ArrowUpRight } from "lucide-react";
import AppVenosoProfundo from "./AppVenosoProfundo";
import AppMapeamento from "./AppMapeamento";
import AppCarotidasVertebrais from "./AppCarotidasVertebrais";
import AppArterialMMII from "./AppArterialMMII";
import AppVenosoCervical from "./AppVenosoCervical";
import AppVenosoMMSS from "./AppVenosoMMSS";

/* ============================================================
   CASCA COM ABAS — LAUDOS VASCULARES
   Cada laudo (Doppler Venoso Profundo / Mapeamento Venoso /
   Carótidas e Vertebrais / Arterial de MMII / Venoso Cervical /
   Venoso Profundo MMSS) roda como um app React totalmente
   independente, com seu próprio estado (paciente, data, achados).
   A troca de aba não reseta nem compartilha dados entre eles —
   cada um mantém o que já foi preenchido enquanto a página não
   é recarregada.
   ============================================================ */

const COLORS = {
  bg: "#FDFCFA",
  panel: "#FFFFFF",
  border: "#E3DFD9",
  borderLight: "#D8D3CB",
  text: "#1B2942",
  textMuted: "#5C6B85",
  accent: "#7A2036",
  accentDim: "#F3E3E6",
};

const TABS = [
  { key: "profundo", label: "Doppler Venoso Profundo", icon: Activity, Component: AppVenosoProfundo },
  { key: "mapeamento", label: "Mapeamento Venoso", icon: GitBranch, Component: AppMapeamento },
  { key: "carotidas", label: "Carótidas e Vertebrais", icon: Stethoscope, Component: AppCarotidasVertebrais },
  { key: "arterial", label: "Arterial de MMII", icon: HeartPulse, Component: AppArterialMMII },
  { key: "cervical", label: "Venoso Cervical", icon: Waves, Component: AppVenosoCervical },
  { key: "mmss", label: "Venoso Profundo MMSS", icon: ArrowUpRight, Component: AppVenosoMMSS },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("profundo");

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "rgba(253,252,250,0.97)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${COLORS.border}`,
          padding: "10px 14px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: "1 1 140px",
                  padding: "10px 8px",
                  borderRadius: 9,
                  border: `1.5px solid ${active ? COLORS.accent : COLORS.borderLight}`,
                  background: active ? COLORS.accentDim : "transparent",
                  color: active ? COLORS.accent : COLORS.textMuted,
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cada aba fica montada em uma div própria — trocar de aba apenas
          esconde/mostra via CSS, preservando o estado de ambos os formulários
          (nada é desmontado, então não há perda de dados ao alternar). */}
      {TABS.map((tab) => (
        <div key={tab.key} style={{ display: activeTab === tab.key ? "block" : "none" }}>
          <tab.Component />
        </div>
      ))}
    </div>
  );
}
