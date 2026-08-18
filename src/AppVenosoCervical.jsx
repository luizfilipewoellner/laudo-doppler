import React, { useState, useMemo, useCallback } from "react";
import {
  ChevronDown,
  Copy,
  Download,
  Check,
  RotateCcw,
  Stethoscope,
} from "lucide-react";

/* ============================================================
   MOTOR DE GERAÇÃO DE LAUDO — VENOSO CERVICAL (SEMPRE BILATERAL)
   ============================================================ */

const SIDE_LABEL = { D: "DIREITA", E: "ESQUERDA" };

// Veias profundas do trajeto cervical avaliadas para trombose.
// Cada veia gera sempre sua própria frase (nunca são combinadas na mesma sentença).
const VEIN_OPTIONS = [
  { value: "braquiocefalica", label: "braquiocefálica" },
  { value: "jugularInterna", label: "jugular interna" },
  { value: "subclavia", label: "subclávia" },
];
const VEIN_LABEL = Object.fromEntries(VEIN_OPTIONS.map((v) => [v.value, v.label]));
const VEIN_ORDER = ["braquiocefalica", "jugularInterna", "subclavia"];

// Veias braquiocefálica e subclávia têm janela óssea (esterno/clavícula) que impede o teste
// de compressibilidade — por isso essa avaliação não entra na frase dessas duas veias.
// A veia jugular interna é compressível e essa informação é mantida na frase.
const VEIN_COMPRESSAO_AVALIADA = new Set(["jugularInterna"]);

// Veias em que a "dificuldade técnica" pode ser assinalada (janela óssea/edema).
const VEIN_DIFICULDADE_APLICAVEL = new Set(["braquiocefalica", "subclavia"]);

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Localizações para linfonodomegalia
const LINFONODO_LOCAL_OPTIONS = [
  { value: "cervicalAnterior", label: "cervical anterior" },
  { value: "cervicalLateral", label: "cervical lateral" },
  { value: "submandibular", label: "submandibular" },
  { value: "supraclavicular", label: "supraclavicular" },
  { value: "occipital", label: "occipital" },
];
const LINFONODO_LOCAL_LABEL = Object.fromEntries(LINFONODO_LOCAL_OPTIONS.map((o) => [o.value, o.label]));

// Localizações para hematoma cervical
const HEMATOMA_LOCAL_OPTIONS = [
  { value: "cervicalAnterior", label: "cervical anterior" },
  { value: "cervicalLateral", label: "cervical lateral" },
  { value: "supraclavicular", label: "supraclavicular" },
];
const HEMATOMA_LOCAL_LABEL = Object.fromEntries(HEMATOMA_LOCAL_OPTIONS.map((o) => [o.value, o.label]));

function todayBR() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function fmtNum(v) {
  return v === "" || v === null || v === undefined ? "" : v;
}

function defaultMemberState() {
  return {
    // Dificuldade técnica — independente por veia (braquiocefálica / subclávia)
    dificuldadeBraquiocefalicaAtiva: false,
    dificuldadeBraquiocefalicaCausa: "edema", // edema | profundidade
    dificuldadeSubclaviaAtiva: false,
    dificuldadeSubclaviaCausa: "edema", // edema | profundidade

    tromboRecenteAtiva: false,
    tromboRecenteVeias: [],

    tromboAntigaAtiva: false,
    tromboAntigaVeias: [],

    descritorAntigo: "compativel", // compativel | sugestivo — usado nos achados "antigos"
    recanalizacaoAntigo: "parcial", // total | parcial | nenhuma — usado nos achados "antigos"

    flebiteRecenteAtiva: false, // veia jugular externa
    flebiteAntigaAtiva: false, // veia jugular externa

    linfonodoAtivo: false,
    linfonodoLocal: "cervicalLateral",
    linfonodoLargura: "",
    linfonodoComprimento: "",
    linfonodoHilo: "preservado", // preservado | apagado

    hematomaAtivo: false,
    hematomaModo: "presente", // presente | ausente
    hematomaEcogenicidade: "anecoica", // anecoica | hipoecoica (para "presente")
    hematomaLargura: "",
    hematomaComprimento: "",
    hematomaLocal: "cervicalAnterior",
    hematomaAspecto: "nodular", // nodular | cistico (para "ausente")
    hematomaSuspeita: "equimose", // equimose | hematoma (para "ausente")
  };
}

/* ---------- Construtores de trecho (trombose profunda) ---------- */

function descritorTexto(descritor) {
  return descritor === "sugestivo" ? "sugestivo de" : "compatível com";
}

// Texto do grau de recanalização e concordância singular/plural do estado de compressibilidade
// (usado apenas para a veia jugular interna, a única com compressibilidade avaliada).
function recanalizacaoLabel(nivel) {
  if (nivel === "total") return "totalmente recanalizada";
  if (nivel === "nenhuma") return "não recanalizada";
  return "parcialmente recanalizada";
}
function recanalizacaoCompress(nivel, plural) {
  if (nivel === "total") return plural ? "compressíveis, com fluxo presente" : "compressível, com fluxo presente";
  if (nivel === "nenhuma") return plural ? "incompressíveis, sem fluxo" : "incompressível, sem fluxo";
  return plural ? "semicompressíveis, com fluxo parcial" : "semicompressível, com fluxo parcial";
}
// Equivalente ao anterior, mas sem menção à compressibilidade — usado para braquiocefálica
// e subclávia, onde essa avaliação não é feita (janela óssea).
function recanalizacaoFluxo(nivel) {
  if (nivel === "total") return "com fluxo presente";
  if (nivel === "nenhuma") return "sem fluxo";
  return "com fluxo parcial";
}
function recanalizacaoImgDetalhe(nivel) {
  if (nivel === "total") return "com discreto espessamento parietal residual, sem imagens de trombos ocupando o lúmen venoso";
  if (nivel === "nenhuma") return "imagens ecogênicas ocupando todo o lúmen venoso";
  return "imagens ecogênicas ocupando parcialmente o lúmen venoso";
}

function tromboVeinAfetada(m, v) {
  return (
    (m.tromboRecenteAtiva && m.tromboRecenteVeias.includes(v)) ||
    (m.tromboAntigaAtiva && m.tromboAntigaVeias.includes(v))
  );
}

// Frase individual de trombose para UMA veia específica (nunca combina veias na mesma frase).
function buildTromboVeiaLinha(v, m, isAntiga) {
  const nome = VEIN_LABEL[v];
  const avaliaCompressao = VEIN_COMPRESSAO_AVALIADA.has(v);
  const imgTxt = isAntiga
    ? `${recanalizacaoImgDetalhe(m.recanalizacaoAntigo)}, ${descritorTexto(m.descritorAntigo)} trombose venosa profunda antiga ${recanalizacaoLabel(m.recanalizacaoAntigo)}`
    : "imagens ecogênicas na luz do vaso, compatível com trombose venosa profunda recente";

  if (avaliaCompressao) {
    const compress = isAntiga ? recanalizacaoCompress(m.recanalizacaoAntigo, false) : "incompressível, sem fluxo";
    return `Veia ${nome} dilatada, ${compress} e ${imgTxt}.`;
  }
  const fluxo = isAntiga ? recanalizacaoFluxo(m.recanalizacaoAntigo) : "sem fluxo ao Doppler";
  return `Veia ${nome} dilatada, ${fluxo} e ${imgTxt}.`;
}

// Frase de conclusão para UMA veia específica.
function buildTromboConclusaoVeia(v, m, isAntiga) {
  const tipoTxt = isAntiga ? "antiga" : "recente";
  const sufixo = isAntiga ? `, ${recanalizacaoLabel(m.recanalizacaoAntigo)}` : "";
  return `Trombose venosa profunda ${tipoTxt} na veia ${VEIN_LABEL[v]}${sufixo}.`;
}

// Frase basal (veia sem trombose e sem dificuldade técnica) — individual por veia.
function buildBaselineVeiaLinhaIndividual(v) {
  const nome = VEIN_LABEL[v];
  if (VEIN_COMPRESSAO_AVALIADA.has(v)) {
    return `Veia ${nome} apresentando diâmetro normal, parede compressível, com fluxo espontâneo, fásico à respiração, sem imagens de trombos.`;
  }
  return `Veia ${nome} apresentando diâmetro normal e fluxo espontâneo, fásico à respiração, sem imagens de trombos em toda sua extensão avaliável.`;
}

// Frase de dificuldade técnica — individual por veia (braquiocefálica e/ou subclávia).
function buildDificuldadeAnatomicoLinha(v, m) {
  const nome = VEIN_LABEL[v];
  const causaKey = m[`dificuldade${capitalize(v)}Causa`];
  const causa = causaKey === "profundidade" ? "profundidade dos vasos" : "edema";
  return `Dificuldade técnica para a avaliação adequada da veia ${nome} (${causa}), porém não foram detectados sinais compatíveis com trombose recente nesta topografia.`;
}

/* ---------- Construtores de trecho (tromboflebite superficial — veia jugular externa) ---------- */

function buildFlebiteAnatomicoCervical(m, prefix, isAntiga) {
  if (!m[`${prefix}Ativa`]) return [];
  const compressSing = isAntiga ? recanalizacaoCompress(m.recanalizacaoAntigo, false) : "incompressível, sem fluxo";
  const imgTxt = isAntiga
    ? `${recanalizacaoImgDetalhe(m.recanalizacaoAntigo)}, ${descritorTexto(m.descritorAntigo)} tromboflebite superficial antiga ${recanalizacaoLabel(m.recanalizacaoAntigo)}`
    : "imagens ecogênicas na luz do vaso, compatível com tromboflebite superficial recente";
  return [`Veia jugular externa dilatada, ${compressSing} e ${imgTxt}.`];
}

function buildFlebiteConclusaoCervical(m, prefix, isAntiga) {
  if (!m[`${prefix}Ativa`]) return [];
  const tipoTxt = isAntiga ? "antiga" : "recente";
  const sufixo = isAntiga ? `, ${recanalizacaoLabel(m.recanalizacaoAntigo)}` : "";
  return [`Tromboflebite superficial ${tipoTxt} na veia jugular externa${sufixo}.`];
}

/* ---------- Linfonodomegalia / Hematoma ---------- */

function buildLinfonodoTexto(m) {
  const loc = LINFONODO_LOCAL_LABEL[m.linfonodoLocal];
  const l = fmtNum(m.linfonodoLargura) || "__";
  const c = fmtNum(m.linfonodoComprimento) || "__";
  const hilo = m.linfonodoHilo === "apagado" ? "hilo gorduroso apagado" : "hilo gorduroso preservado";
  return `Linfonodo em topografia ${loc}, medindo ${l} x ${c} mm, com ${hilo}, sem sinais de coleção ou trombose venosa associada.`;
}
function buildLinfonodoConclusao(m) {
  const loc = LINFONODO_LOCAL_LABEL[m.linfonodoLocal];
  return `Linfonodomegalia em topografia ${loc}.`;
}

function buildHematomaTexto(m) {
  const loc = HEMATOMA_LOCAL_LABEL[m.hematomaLocal];
  if (m.hematomaModo === "presente") {
    const l = fmtNum(m.hematomaLargura) || "__";
    const c = fmtNum(m.hematomaComprimento) || "__";
    const eco = m.hematomaEcogenicidade === "hipoecoica" ? "hipoecóica" : "anecóica";
    return `Imagem ${eco} em plano subcutâneo/muscular na região ${loc}, sem fluxo ao Doppler, medindo ${l} x ${c} mm (transversal), com limites precisos e sem comunicação com os vasos tronculares, sugestivo de hematoma cervical.`;
  }
  const aspecto = m.hematomaAspecto === "cistico" ? "cístico" : "nodular";
  const suspeita = m.hematomaSuspeita === "hematoma" ? "hematoma" : "equimose";
  return `Não foram detectadas imagens de aspecto ${aspecto} em plano subcutâneo e/ou muscular, na região ${loc}, subjacente à área de ${suspeita}.`;
}

/* ---------- Blocos por lado ---------- */

function buildAnatomico(m) {
  const lines = [];

  VEIN_ORDER.forEach((v) => {
    const isRecente = m.tromboRecenteAtiva && m.tromboRecenteVeias.includes(v);
    const isAntiga = m.tromboAntigaAtiva && m.tromboAntigaVeias.includes(v);
    const dificuldadeAtiva = VEIN_DIFICULDADE_APLICAVEL.has(v) && m[`dificuldade${capitalize(v)}Ativa`];

    if (isRecente) lines.push(buildTromboVeiaLinha(v, m, false));
    if (isAntiga) lines.push(buildTromboVeiaLinha(v, m, true));

    if (!isRecente && !isAntiga) {
      if (dificuldadeAtiva) {
        lines.push(buildDificuldadeAnatomicoLinha(v, m));
      } else {
        lines.push(buildBaselineVeiaLinhaIndividual(v));
      }
    }
  });

  // Tromboflebite superficial (veia jugular externa) sempre antes da linha basal, para que a
  // veia acometida não apareça depois de já ter sido descrita como "normal".
  lines.push(...buildFlebiteAnatomicoCervical(m, "flebiteRecente", false));
  lines.push(...buildFlebiteAnatomicoCervical(m, "flebiteAntiga", true));

  if (!m.flebiteRecenteAtiva && !m.flebiteAntigaAtiva) {
    lines.push("Veia jugular externa compressível, sem imagens de trombos no lúmen.");
  }

  if (m.linfonodoAtivo) lines.push(buildLinfonodoTexto(m));
  if (m.hematomaAtivo) lines.push(buildHematomaTexto(m));

  return lines;
}

function buildConclusao(m) {
  const lines = [];

  const algumaTrombose = VEIN_ORDER.some((v) => tromboVeinAfetada(m, v));
  if (!algumaTrombose) {
    lines.push("Sistema venoso profundo cervical pérvio, sem sinais de trombose venosa profunda.");
  } else {
    VEIN_ORDER.forEach((v) => {
      const isRecente = m.tromboRecenteAtiva && m.tromboRecenteVeias.includes(v);
      const isAntiga = m.tromboAntigaAtiva && m.tromboAntigaVeias.includes(v);
      if (isRecente) lines.push(buildTromboConclusaoVeia(v, m, false));
      if (isAntiga) lines.push(buildTromboConclusaoVeia(v, m, true));
    });
  }

  if (!m.flebiteRecenteAtiva && !m.flebiteAntigaAtiva) {
    lines.push("Veia jugular externa pérvia, sem sinais de tromboflebite superficial.");
  }
  lines.push(...buildFlebiteConclusaoCervical(m, "flebiteRecente", false));
  lines.push(...buildFlebiteConclusaoCervical(m, "flebiteAntiga", true));

  VEIN_ORDER.forEach((v) => {
    if (VEIN_DIFICULDADE_APLICAVEL.has(v) && m[`dificuldade${capitalize(v)}Ativa`]) {
      lines.push(
        `Dificuldade técnica para o estudo da veia ${VEIN_LABEL[v]}, porém sem sinais detectáveis de trombose recente nesta topografia.`
      );
    }
  });

  if (m.linfonodoAtivo) lines.push(buildLinfonodoConclusao(m));
  if (m.hematomaAtivo && m.hematomaModo === "presente") lines.push("Hematoma cervical.");

  return lines;
}

function buildMemberReport(side, member) {
  return {
    side,
    member,
    anatomico: [`REGIÃO CERVICAL ${SIDE_LABEL[side]}`, "", ...buildAnatomico(member)],
    conclusao: [`REGIÃO CERVICAL ${SIDE_LABEL[side]}`, "", ...buildConclusao(member)],
  };
}

// O exame é sempre bilateral — não há seletor de lado.
function getActiveSides() {
  return ["D", "E"];
}
function buildFullReportBlocks(state) {
  return getActiveSides().map((s) => buildMemberReport(s, state[s]));
}
function reportTitle() {
  return "SISTEMA VENOSO CERVICAL";
}
function introTexto() {
  return "Avaliação anatômica e hemodinâmica das veias braquiocefálica, jugular interna, subclávia e jugular externa, bilateralmente.";
}

/* ============================================================
   COMPONENTES DE UI BÁSICOS (mesma linguagem visual do app de MMII)
   ============================================================ */

const COLORS = {
  bg: "#FDFCFA",
  panel: "#FFFFFF",
  panelAlt: "#F5F2EE",
  border: "#E3DFD9",
  borderLight: "#D8D3CB",
  text: "#1B2942",
  textMuted: "#5C6B85",
  accent: "#7A2036",
  accentDim: "#F3E3E6",
  warn: "#B8792E",
  danger: "#B23A3A",
};

function Section({ title, subtitle, children, defaultOpen = false, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        background: COLORS.panel,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, letterSpacing: 0.2 }}>
            {title}
          </span>
          {badge ? (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: COLORS.accent,
                background: COLORS.accentDim,
                padding: "2px 7px",
                borderRadius: 20,
                letterSpacing: 0.3,
              }}
            >
              {badge}
            </span>
          ) : null}
          {subtitle ? <span style={{ fontSize: 12, color: COLORS.textMuted }}>{subtitle}</span> : null}
        </div>
        <ChevronDown
          size={17}
          color={COLORS.textMuted}
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms ease" }}
        />
      </button>
      {open && <div style={{ padding: "2px 16px 16px 16px" }}>{children}</div>}
    </div>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "9px 0",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 36,
          height: 21,
          borderRadius: 20,
          background: checked ? COLORS.accent : COLORS.borderLight,
          position: "relative",
          transition: "background 150ms ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 17 : 2,
            width: 17,
            height: 17,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 150ms ease",
          }}
        />
      </span>
      <span>
        <div style={{ fontSize: 13.5, color: COLORS.text, fontWeight: 500 }}>{label}</div>
        {description && (
          <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 1 }}>{description}</div>
        )}
      </span>
    </button>
  );
}

function PillGroup({ options, value, onChange, multi = false }) {
  const isSelected = (v) => (multi ? value.includes(v) : value === v);
  const toggle = (v) => {
    if (multi) {
      onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
    } else {
      onChange(v);
    }
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((opt) => {
        const sel = isSelected(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            style={{
              padding: "6px 12px",
              borderRadius: 7,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              border: `1px solid ${sel ? COLORS.accent : COLORS.borderLight}`,
              background: sel ? COLORS.accentDim : "transparent",
              color: sel ? COLORS.accent : COLORS.textMuted,
              transition: "all 120ms ease",
              whiteSpace: "nowrap",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function NumInput({ value, onChange, placeholder, suffix, width = 72 }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "" || parseFloat(v) >= 0) onChange(v);
        }}
        placeholder={placeholder || "0"}
        style={{
          width,
          padding: suffix ? "7px 28px 7px 9px" : "7px 9px",
          borderRadius: 7,
          border: `1px solid ${COLORS.borderLight}`,
          background: COLORS.panelAlt,
          color: COLORS.text,
          fontSize: 13,
          outline: "none",
        }}
      />
      {suffix && (
        <span
          style={{
            position: "absolute",
            right: 9,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 11,
            color: COLORS.textMuted,
            pointerEvents: "none",
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  );
}

function Row({ children, wrap = true }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: wrap ? "wrap" : "nowrap", marginTop: 8 }}>
      {children}
    </div>
  );
}
function Label({ children }) {
  return <span style={{ fontSize: 12, color: COLORS.textMuted, minWidth: 0, marginRight: 2 }}>{children}</span>;
}

/* ============================================================
   BLOCOS DE FORMULÁRIO REUTILIZÁVEIS
   ============================================================ */

function DescritorAntigoControl({ value, onChange }) {
  return (
    <Row>
      <Label>Termo usado nos achados antigos</Label>
      <PillGroup
        options={[
          { value: "compativel", label: "compatível com" },
          { value: "sugestivo", label: "sugestivo de" },
        ]}
        value={value}
        onChange={onChange}
      />
    </Row>
  );
}

function RecanalizacaoAntigoControl({ value, onChange }) {
  return (
    <Row>
      <Label>Grau de recanalização</Label>
      <PillGroup
        options={[
          { value: "total", label: "totalmente recanalizada" },
          { value: "parcial", label: "parcialmente recanalizada" },
          { value: "nenhuma", label: "não recanalizada" },
        ]}
        value={value}
        onChange={onChange}
      />
    </Row>
  );
}

function TromboBlock({ ativa, setAtiva, veias, setVeias, tipoLabel, isAntiga, descritor, setDescritor, recanalizacao, setRecanalizacao }) {
  return (
    <>
      <Toggle checked={ativa} onChange={setAtiva} label={`Trombose venosa profunda ${tipoLabel}`} />
      {ativa && (
        <div style={{ marginTop: 4, paddingLeft: 4 }}>
          <Row>
            <Label>Veia(s) acometida(s)</Label>
            <PillGroup options={VEIN_OPTIONS} value={veias} onChange={setVeias} multi />
          </Row>
          {isAntiga && (
            <>
              <DescritorAntigoControl value={descritor} onChange={setDescritor} />
              <RecanalizacaoAntigoControl value={recanalizacao} onChange={setRecanalizacao} />
            </>
          )}
        </div>
      )}
    </>
  );
}

function FlebiteCervicalBlock({ data, set, prefix, tipoLabel, isAntiga }) {
  const ativa = data[`${prefix}Ativa`];
  return (
    <>
      <Toggle
        checked={ativa}
        onChange={set(`${prefix}Ativa`)}
        label={`Tromboflebite superficial ${tipoLabel} (veia jugular externa)`}
      />
      {isAntiga && ativa && (
        <div style={{ marginTop: 4, paddingLeft: 4 }}>
          <DescritorAntigoControl value={data.descritorAntigo} onChange={set("descritorAntigo")} />
          <RecanalizacaoAntigoControl value={data.recanalizacaoAntigo} onChange={set("recanalizacaoAntigo")} />
        </div>
      )}
    </>
  );
}

function DificuldadeVeiaBlock({ data, set, veiaKey, label }) {
  const ativa = data[`dificuldade${capitalize(veiaKey)}Ativa`];
  const causa = data[`dificuldade${capitalize(veiaKey)}Causa`];
  return (
    <>
      <Toggle
        checked={ativa}
        onChange={set(`dificuldade${capitalize(veiaKey)}Ativa`)}
        label={label}
        description="Substitui a descrição padrão desta veia e acrescenta observação na conclusão"
      />
      {ativa && (
        <Row>
          <Label>Causa</Label>
          <PillGroup
            options={[
              { value: "edema", label: "edema" },
              { value: "profundidade", label: "profundidade dos vasos" },
            ]}
            value={causa}
            onChange={set(`dificuldade${capitalize(veiaKey)}Causa`)}
          />
        </Row>
      )}
    </>
  );
}

function MemberForm({ data, update }) {
  const set = (key) => (val) => update((prev) => ({ ...prev, [key]: val }));

  return (
    <div>
      <Section title="Trombose venosa profunda" defaultOpen={false}>
        <TromboBlock
          ativa={data.tromboRecenteAtiva}
          setAtiva={set("tromboRecenteAtiva")}
          veias={data.tromboRecenteVeias}
          setVeias={set("tromboRecenteVeias")}
          tipoLabel="recente"
        />
        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "12px 0" }} />
        <TromboBlock
          ativa={data.tromboAntigaAtiva}
          setAtiva={set("tromboAntigaAtiva")}
          veias={data.tromboAntigaVeias}
          setVeias={set("tromboAntigaVeias")}
          tipoLabel="antiga"
          isAntiga
          descritor={data.descritorAntigo}
          setDescritor={set("descritorAntigo")}
          recanalizacao={data.recanalizacaoAntigo}
          setRecanalizacao={set("recanalizacaoAntigo")}
        />
      </Section>

      <Section title="Tromboflebite superficial" subtitle="veia jugular externa" defaultOpen={false}>
        <FlebiteCervicalBlock data={data} set={set} prefix="flebiteRecente" tipoLabel="recente" />
        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "12px 0" }} />
        <FlebiteCervicalBlock data={data} set={set} prefix="flebiteAntiga" tipoLabel="antiga" isAntiga />
      </Section>

      <Section title="Achados adicionais" defaultOpen={false}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>
          Dificuldades técnicas
        </div>
        <DificuldadeVeiaBlock data={data} set={set} veiaKey="braquiocefalica" label="Veia braquiocefálica" />
        <div style={{ height: 6 }} />
        <DificuldadeVeiaBlock data={data} set={set} veiaKey="subclavia" label="Veia subclávia" />

        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "12px 0" }} />

        <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>
          Linfonodomegalia
        </div>
        <Toggle checked={data.linfonodoAtivo} onChange={set("linfonodoAtivo")} label="Presença de linfonodomegalia" />
        {data.linfonodoAtivo && (
          <div style={{ marginTop: 4, paddingLeft: 4 }}>
            <Row>
              <Label>Localização</Label>
              <PillGroup options={LINFONODO_LOCAL_OPTIONS} value={data.linfonodoLocal} onChange={set("linfonodoLocal")} />
            </Row>
            <Row>
              <Label>Mede</Label>
              <NumInput value={data.linfonodoLargura} onChange={set("linfonodoLargura")} suffix="mm" width={70} />
              <Label>x</Label>
              <NumInput value={data.linfonodoComprimento} onChange={set("linfonodoComprimento")} suffix="mm" width={70} />
            </Row>
            <Row>
              <Label>Hilo gorduroso</Label>
              <PillGroup
                options={[
                  { value: "preservado", label: "preservado" },
                  { value: "apagado", label: "apagado" },
                ]}
                value={data.linfonodoHilo}
                onChange={set("linfonodoHilo")}
              />
            </Row>
          </div>
        )}

        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "12px 0" }} />

        <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>Hematoma</div>
        <Toggle checked={data.hematomaAtivo} onChange={set("hematomaAtivo")} label="Achado relativo a hematoma" />
        {data.hematomaAtivo && (
          <div style={{ marginTop: 4, paddingLeft: 4 }}>
            <Row>
              <PillGroup
                options={[
                  { value: "presente", label: "hematoma presente" },
                  { value: "ausente", label: "investigado / ausente" },
                ]}
                value={data.hematomaModo}
                onChange={set("hematomaModo")}
              />
            </Row>
            <Row>
              <Label>Região</Label>
              <PillGroup options={HEMATOMA_LOCAL_OPTIONS} value={data.hematomaLocal} onChange={set("hematomaLocal")} />
            </Row>
            {data.hematomaModo === "presente" ? (
              <>
                <Row>
                  <Label>Ecogenicidade</Label>
                  <PillGroup
                    options={[
                      { value: "anecoica", label: "anecóica" },
                      { value: "hipoecoica", label: "hipoecóica" },
                    ]}
                    value={data.hematomaEcogenicidade}
                    onChange={set("hematomaEcogenicidade")}
                  />
                </Row>
                <Row>
                  <Label>Mede</Label>
                  <NumInput value={data.hematomaLargura} onChange={set("hematomaLargura")} suffix="mm" width={70} />
                  <Label>x</Label>
                  <NumInput value={data.hematomaComprimento} onChange={set("hematomaComprimento")} suffix="mm" width={70} />
                </Row>
              </>
            ) : (
              <>
                <Row>
                  <Label>Aspecto da imagem</Label>
                  <PillGroup
                    options={[
                      { value: "nodular", label: "nodular" },
                      { value: "cistico", label: "cístico" },
                    ]}
                    value={data.hematomaAspecto}
                    onChange={set("hematomaAspecto")}
                  />
                </Row>
                <Row>
                  <Label>Suspeita clínica</Label>
                  <PillGroup
                    options={[
                      { value: "equimose", label: "equimose" },
                      { value: "hematoma", label: "hematoma" },
                    ]}
                    value={data.hematomaSuspeita}
                    onChange={set("hematomaSuspeita")}
                  />
                </Row>
              </>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ============================================================
   PREVIEW
   ============================================================ */

const PREVIEW_SIZE = 13;
const PREVIEW_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function renderLine(line, key) {
  if (line === "") return <div key={key} style={{ height: 8 }} />;
  const upper = line === line.toUpperCase() && /[A-ZÀ-Ú]/.test(line) && !line.startsWith("-");
  return (
    <div key={key} style={{ color: upper ? COLORS.text : "#5C6B85", fontWeight: upper ? 700 : 400, marginBottom: 2 }}>
      {line}
    </div>
  );
}

function ReportPreview({ state, patientName, examDate }) {
  const blocks = useMemo(() => buildFullReportBlocks(state), [state]);
  const title = reportTitle();

  let k = 0;
  return (
    <div style={{ fontSize: PREVIEW_SIZE, fontFamily: PREVIEW_FONT, lineHeight: 1.55 }}>
      <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>ECODOPPLER COLORIDO</div>
      <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>{title}</div>
      {patientName && patientName.trim() && (
        <div style={{ color: "#5C6B85", marginBottom: 2 }}>
          <strong style={{ color: COLORS.text }}>Paciente:</strong> {patientName.trim()}
        </div>
      )}
      {examDate && examDate.trim() && (
        <div style={{ color: "#5C6B85", marginBottom: 10 }}>
          <strong style={{ color: COLORS.text }}>Data:</strong> {examDate.trim()}
        </div>
      )}
      <div style={{ color: "#5C6B85", marginBottom: 14 }}>{introTexto()}</div>

      {blocks.map((b) => (
        <div key={"lado-" + b.side}>
          {b.anatomico.map((l) => renderLine(l, k++))}
          <div key={k++} style={{ height: 8 }} />
        </div>
      ))}

      <div style={{ fontWeight: 700, color: COLORS.text, marginTop: 6, marginBottom: 4 }}>CONCLUSÃO</div>
      {blocks.map((b) => (
        <div key={"conc-" + b.side}>{b.conclusao.map((l) => renderLine(l, k++))}</div>
      ))}
    </div>
  );
}

/* ============================================================
   EXPORTAÇÃO .DOCX
   ============================================================ */

async function exportDocx(state, patientName, examDate) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");

  const blocks = buildFullReportBlocks(state);

  const FONT = "Helvetica Neue";
  const SZ = 24; // 12pt
  const SP = 60;

  function tr(text, opts = {}) {
    return new TextRun({ text, font: FONT, size: SZ, ...opts });
  }
  function paraText(text) {
    const upper = text === text.toUpperCase() && /[A-Z\u00C0-\u00DA]/.test(text) && !text.startsWith("-");
    return new Paragraph({ spacing: { after: SP }, children: [tr(text, { bold: upper })] });
  }
  function emptyLine() {
    return new Paragraph({ children: [], spacing: { after: 0 } });
  }
  function blockToParagraphs(lines) {
    return lines.map((line) => (line === "" ? new Paragraph({ children: [], spacing: { after: 0 } }) : paraText(line)));
  }

  const pageProps = {
    size: { width: 12240, height: 15840 },
    margin: { top: 720, right: 720, bottom: 720, left: 720 },
  };

  function buildSectionChildren(block) {
    const children = [];
    const memberTitle = `SISTEMA VENOSO CERVICAL \u2014 REGI\u00C3O ${SIDE_LABEL[block.side]}`;

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [tr("ECODOPPLER COLORIDO \u2014 ", { bold: true }), tr(memberTitle, { bold: true })],
      })
    );
    children.push(emptyLine());

    if (patientName && patientName.trim()) {
      children.push(new Paragraph({ spacing: { after: SP }, children: [tr("Paciente: ", { bold: true }), tr(patientName.trim())] }));
    }
    if (examDate && examDate.trim()) {
      children.push(new Paragraph({ spacing: { after: 0 }, children: [tr("Data: ", { bold: true }), tr(examDate.trim())] }));
      children.push(emptyLine());
    }
    children.push(new Paragraph({ spacing: { after: SP }, children: [tr(introTexto())] }));
    children.push(emptyLine());

    // Conteúdo anatômico (mantém o cabeçalho "REGIÃO CERVICAL X")
    children.push(...blockToParagraphs(block.anatomico));
    children.push(emptyLine());

    children.push(new Paragraph({ spacing: { after: SP }, children: [tr("CONCLUSÃO", { bold: true })] }));
    children.push(...blockToParagraphs(block.conclusao.slice(2)));

    return children;
  }

  const sections = blocks.map((block, idx) => ({
    properties: {
      page: pageProps,
      ...(idx > 0 ? { type: "nextPage" } : {}),
    },
    children: buildSectionChildren(block),
  }));

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 24 } } } },
    sections,
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const nomePaciente = (patientName || "").trim().replace(/[^\wÀ-ÿ\s\-]+/g, "").trim() || "Laudo";
  const nomeArquivo = `${nomePaciente} VEN CERVICAL`;
  a.href = url;
  a.download = `${nomeArquivo}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================================================
   APP
   ============================================================ */

export default function AppVenosoCervical() {
  const [patientName, setPatientName] = useState("");
  const [examDate, setExamDate] = useState(todayBR());
  const [examDateISO, setExamDateISO] = useState(() => new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState("D");
  const [state, setState] = useState({ D: defaultMemberState(), E: defaultMemberState() });
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const updateSide = useCallback((side, updater) => {
    setState((prev) => ({ ...prev, [side]: updater(prev[side]) }));
  }, []);
  const resetAll = () => setConfirmReset(true);
  const doReset = () => {
    setState({ D: defaultMemberState(), E: defaultMemberState() });
    setPatientName("");
    setExamDate(todayBR());
    setExamDateISO(new Date().toISOString().split("T")[0]);
    setConfirmReset(false);
  };

  const buildReportLines = useCallback(() => {
    const blocks = buildFullReportBlocks(state);
    const title = reportTitle();
    const lines = [`ECODOPPLER COLORIDO — ${title}`, ""];
    if (patientName.trim()) lines.push(`Paciente: ${patientName.trim()}`, "");
    if (examDate.trim()) lines.push(`Data: ${examDate.trim()}`, "");
    lines.push(introTexto(), "");
    blocks.forEach((b) => {
      b.anatomico.forEach((l) => lines.push(l));
      lines.push("");
    });
    lines.push("CONCLUSÃO", "");
    blocks.forEach((b) => {
      lines.push(b.conclusao[0]);
      b.conclusao.slice(2).forEach((l) => lines.push(l));
      lines.push("");
    });
    return lines;
  }, [state, patientName, examDate]);

  const buildReportHTML = useCallback(() => {
    const blocks = buildFullReportBlocks(state);
    const title = reportTitle();

    const pStyle = `margin:2px 0;font-family:Helvetica Neue,Arial,sans-serif;font-size:12pt;`;
    const boldStyle = `${pStyle}font-weight:bold;`;

    function linesToHTML(lines) {
      return lines.map((l) => {
        if (l === "") return `<p style="${pStyle}">&nbsp;</p>`;
        const upper = l === l.toUpperCase() && /[A-ZÀ-Ú]/.test(l) && !l.startsWith("-");
        return `<p style="${upper ? boldStyle : pStyle}">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`;
      }).join("");
    }

    let html = `<div style="font-family:Helvetica Neue,Arial,sans-serif;font-size:12pt;">`;
    html += `<p style="${boldStyle}text-align:center;">ECODOPPLER COLORIDO — ${title}</p>`;
    html += `<p style="${pStyle}">&nbsp;</p>`;
    if (patientName.trim()) html += `<p style="${pStyle}"><b>Paciente:</b> ${patientName.trim()}</p>`;
    if (examDate.trim()) {
      html += `<p style="${pStyle}"><b>Data:</b> ${examDate.trim()}</p>`;
      html += `<p style="${pStyle}">&nbsp;</p>`;
    }
    html += `<p style="${pStyle}">${introTexto()}</p>`;
    html += `<p style="${pStyle}">&nbsp;</p>`;

    blocks.forEach((b) => {
      html += linesToHTML(b.anatomico);
      html += `<p style="${pStyle}">&nbsp;</p>`;
    });

    html += `<p style="${boldStyle}">CONCLUSÃO</p>`;
    blocks.forEach((b) => {
      html += linesToHTML([b.conclusao[0], ...b.conclusao.slice(2)]);
      html += `<p style="${pStyle}">&nbsp;</p>`;
    });

    html += `</div>`;
    return html;
  }, [state, patientName, examDate]);

  const handleCopy = async () => {
    try {
      const html = buildReportHTML();
      const text = buildReportLines().join("\n");
      if (window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      try {
        await navigator.clipboard.writeText(buildReportLines().join("\n"));
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch (e2) {
        console.error("Erro ao copiar:", e2);
      }
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportDocx(state, patientName, examDate);
    } catch (e) {
      console.error("Erro ao gerar .docx:", e);
      alert(`Erro ao gerar .docx:\n${e?.message || e}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: COLORS.text,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(253,252,250,0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${COLORS.border}`,
          padding: "12px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: COLORS.accentDim,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Stethoscope size={17} color={COLORS.accent} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: 0.2 }}>Venoso Cervical</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>Gerador de laudo · Ecodoppler colorido · sempre bilateral</div>
          </div>
          <button
            onClick={resetAll}
            title="Novo laudo"
            style={{
              background: "transparent",
              border: `1px solid ${COLORS.borderLight}`,
              borderRadius: 8,
              padding: 7,
              color: COLORS.textMuted,
              cursor: "pointer",
              display: "flex",
            }}
          >
            <RotateCcw size={15} />
          </button>
        </div>

        <input
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          placeholder="Nome do paciente (opcional)"
          style={{
            width: "100%",
            padding: "9px 12px",
            borderRadius: 8,
            border: `1px solid ${COLORS.borderLight}`,
            background: COLORS.panelAlt,
            color: COLORS.text,
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 8,
          }}
        />

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            type="date"
            value={examDateISO}
            onChange={(e) => {
              setExamDateISO(e.target.value);
              if (e.target.value) {
                const [y, m, d] = e.target.value.split("-");
                setExamDate(`${d}/${m}/${y}`);
              }
            }}
            style={{
              flex: 1,
              padding: "9px 12px",
              borderRadius: 8,
              border: `1px solid ${COLORS.borderLight}`,
              background: COLORS.panelAlt,
              color: COLORS.text,
              fontSize: 13,
              outline: "none",
              boxSizing: "border-box",
              colorScheme: "dark",
            }}
          />
          <button
            onClick={() => {
              const today = new Date();
              const iso = today.toISOString().split("T")[0];
              setExamDateISO(iso);
              setExamDate(todayBR());
            }}
            style={{
              flexShrink: 0,
              padding: "9px 14px",
              borderRadius: 8,
              border: `1px solid ${COLORS.borderLight}`,
              background: "transparent",
              color: COLORS.accent,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Hoje
          </button>
        </div>

        {/* ABAS DE FORMULÁRIO — exame sempre bilateral, sem seletor de lado */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setActiveTab("D")} style={tabStyle(activeTab === "D")}>
            Formulário — Direita
          </button>
          <button onClick={() => setActiveTab("E")} style={tabStyle(activeTab === "E")}>
            Formulário — Esquerda
          </button>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ padding: "14px 14px 100px 14px" }}>
        {!mobilePreview ? (
          <MemberForm data={state[activeTab]} update={(updater) => updateSide(activeTab, updater)} />
        ) : (
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
            <ReportPreview state={state} patientName={patientName} examDate={examDate} />
          </div>
        )}
      </div>

      {/* BARRA INFERIOR FIXA */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(253,252,250,0.97)",
          backdropFilter: "blur(8px)",
          borderTop: `1px solid ${COLORS.border}`,
          padding: "10px 14px calc(10px + env(safe-area-inset-bottom))",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          zIndex: 20,
        }}
      >
        <button
          onClick={() => setMobilePreview((v) => !v)}
          style={{
            flex: "0 0 auto",
            padding: "11px 14px",
            borderRadius: 9,
            border: `1px solid ${COLORS.borderLight}`,
            background: mobilePreview ? COLORS.accentDim : "transparent",
            color: mobilePreview ? COLORS.accent : COLORS.text,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {mobilePreview ? "Editar" : "Visualizar"}
        </button>
        <button
          onClick={handleCopy}
          style={{
            flex: "1 1 160px",
            padding: "11px 10px",
            borderRadius: 9,
            border: `1px solid ${COLORS.borderLight}`,
            background: "transparent",
            color: COLORS.text,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {copied ? <Check size={14} color={COLORS.accent} /> : <Copy size={14} />}
          {copied ? "Copiado" : "Copiar Bilateral"}
        </button>
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            flex: "1 1 160px",
            padding: "11px 10px",
            borderRadius: 9,
            border: "none",
            background: COLORS.accent,
            color: "#FDFCFA",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: exporting ? "default" : "pointer",
            opacity: exporting ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Download size={14} />
          {exporting ? "Gerando..." : "Baixar .docx"}
        </button>
      </div>

      {/* MODAL DE CONFIRMAÇÃO */}
      {confirmReset && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setConfirmReset(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: COLORS.panel,
              border: `1px solid ${COLORS.borderLight}`,
              borderRadius: 12,
              padding: 24,
              width: 280,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>Novo laudo</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20, lineHeight: 1.5 }}>
              Limpar todos os dados e começar um novo laudo?
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmReset(false)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  border: `1px solid ${COLORS.borderLight}`,
                  background: "transparent",
                  color: COLORS.textMuted,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={doReset}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  border: "none",
                  background: COLORS.accent,
                  color: "#FDFCFA",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function tabStyle(active) {
  return {
    flex: 1,
    padding: "8px 6px",
    borderRadius: 7,
    border: `1px solid ${active ? COLORS.accent : "transparent"}`,
    background: active ? COLORS.accentDim : COLORS.panelAlt,
    color: active ? COLORS.accent : COLORS.textMuted,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };
}
