import React, { useState } from "react";
import { Activity, GitBranch } from "lucide-react";
import AppVenosoProfundo from "./AppVenosoProfundo";
import AppMapeamento from "./AppMapeamento";

/* ============================================================
   CASCA COM ABAS — LAUDOS VENOSOS
   Cada laudo (Doppler Venoso Profundo / Mapeamento Venoso) roda
   como um app React totalmente independente, com seu próprio
   estado (paciente, data, achados). A troca de aba não reseta
   nem compartilha dados entre os dois — cada um mantém o que
   já foi preenchido enquanto a página não é recarregada.
   ============================================================ */

const COLORS = {
  bg: "#0B1220",
  panel: "#121B2E",
  border: "#22304A",
  borderLight: "#2C3D5C",
  text: "#E7ECF5",
  textMuted: "#8FA0BD",
  accent: "#3DD6C4",
  accentDim: "#1F4A45",
};

const TABS = [
  { key: "profundo", label: "Doppler Venoso Profundo", icon: Activity, Component: AppVenosoProfundo },
  { key: "mapeamento", label: "Mapeamento Venoso", icon: GitBranch, Component: AppMapeamento },
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
          background: "rgba(11,18,32,0.97)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${COLORS.border}`,
          padding: "10px 14px",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
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
