import React, { useState, useMemo, useCallback } from "react";
import { ChevronDown, Copy, Download, Check, RotateCcw, Stethoscope, Info, X } from "lucide-react";

/* ============================================================
   MOTOR DE GERAÇÃO DE LAUDO — ARTERIAL DE MEMBROS SUPERIORES
   ============================================================ */

const SIDE_LABEL = { D: "DIREITO", E: "ESQUERDO" };
const LADO_FEM = { D: "direita", E: "esquerda" };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function todayBR() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}
function todayISO() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function joinList(arr) {
  const clean = (arr || []).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join(", ")} e ${clean[clean.length - 1]}`;
}

/* ---------- Vasos ---------- */

const VASO_LABEL = {
  subclavia: "artéria subclávia",
  axilar: "artéria axilar",
  braquial: "artéria braquial",
  radial: "artéria radial",
  ulnar: "artéria ulnar",
};
const VASO_NOME = {
  subclavia: "subclávia",
  axilar: "axilar",
  braquial: "braquial",
  radial: "radial",
  ulnar: "ulnar",
};
// Ordem hemodinâmica (proximal → distal). Radial e ulnar são paralelas.
const VASO_INDEX = { subclavia: 0, axilar: 1, braquial: 2, radial: 3, ulnar: 3 };
// Destino do reenchimento por colateral quando a oclusão atinge o vaso até o fim
const VASO_JUSANTE = {
  subclavia: "a artéria axilar",
  axilar: "a artéria braquial",
  braquial: "as artérias radial e ulnar",
  radial: "o arco palmar",
  ulnar: "o arco palmar",
};
const VASO_JUSANTE_CURTO = {
  subclavia: "axilar",
  axilar: "braquial",
  braquial: "radial e ulnar",
  radial: "arco palmar",
  ulnar: "arco palmar",
};

/* ---------- Vocabulário ---------- */

const SEGMENTO_OPTIONS = [
  { value: "proximal", label: "Proximal" },
  { value: "medio", label: "Médio" },
  { value: "distal", label: "Distal" },
];
const SEGMENTO_LABEL = { proximal: "proximal", medio: "médio", distal: "distal" };

const MORFOLOGIA_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "preservada", label: "Preservada" },
  { value: "bifasica", label: "Bifásica" },
  { value: "monofasica", label: "Monofásica" },
];
const MORFOLOGIA_LABEL = { normal: "normal", preservada: "preservada", bifasica: "bifásica", monofasica: "monofásica" };

const LOC_FOCAL_OPTIONS = [
  { value: "origem", label: "Origem" },
  { value: "proximal", label: "Segmento proximal" },
  { value: "medio", label: "Segmento médio" },
  { value: "distal", label: "Segmento distal" },
];
const LOC_FOCAL_NOUN = { origem: "origem", proximal: "segmento proximal", medio: "segmento médio", distal: "segmento distal" };
const LOC_FOCAL_PREP = { origem: "na", proximal: "no", medio: "no", distal: "no" };

const PAREDE_OPTIONS = [
  { value: "regular", label: "Paredes regulares" },
  { value: "calcificada", label: "Placas com calcificação leve" },
];

const GRAU_OPTIONS = [
  { value: "50-75", label: "50–75%" },
  { value: ">75", label: ">75%" },
];

const ACHADO_TIPO_LABEL = {
  estenoseFocal: "Estenose focal",
  oclusaoSegmentar: "Oclusão c/ colateral",
  semFluxoTotal: "Sem fluxo detectável",
  calcificacao: "Calcificação intensa",
  aneurisma: "Aneurisma",
  pseudoaneurisma: "Pseudoaneurisma",
  angioplastia: "Angioplastia / Stent",
  desfiladeiro: "Desfiladeiro torácico",
};

// Achados que retiram o vaso da frase "normal" do grupo
const EXCLUDE_TIPOS = ["estenoseFocal", "oclusaoSegmentar", "semFluxoTotal", "aneurisma"];

const GROUPS = {
  g1: {
    title: "Artérias subclávia e axilar",
    vessels: ["subclavia", "axilar"],
    hasParede: true,
    tipos: ["estenoseFocal", "oclusaoSegmentar", "semFluxoTotal", "calcificacao", "aneurisma", "angioplastia", "desfiladeiro"],
  },
  g2: {
    title: "Artéria braquial",
    vessels: ["braquial"],
    hasParede: true,
    tipos: ["estenoseFocal", "oclusaoSegmentar", "semFluxoTotal", "calcificacao", "aneurisma", "pseudoaneurisma", "angioplastia"],
  },
  g3: {
    title: "Artérias radial e ulnar",
    vessels: ["radial", "ulnar"],
    hasParede: false,
    tipos: ["estenoseFocal", "oclusaoSegmentar", "semFluxoTotal", "calcificacao", "aneurisma", "pseudoaneurisma"],
  },
};
const GROUP_ORDER = ["g1", "g2", "g3"];

const ANEURISMA_MORFOLOGIA_OPTIONS = [
  { value: "fusiforme", label: "Fusiforme" },
  { value: "sacular", label: "Sacular" },
];

const DESF_MANOBRA_OPTIONS = [
  { value: "abducao", label: "Abdução 90°" },
  { value: "hiperabducao", label: "Hiperabdução" },
  { value: "adson", label: "Adson" },
  { value: "costoclavicular", label: "Costoclavicular" },
];
const DESF_MANOBRA_TXT = {
  abducao: "abdução do membro superior a 90°",
  hiperabducao: "hiperabdução do membro superior",
  adson: "Adson",
  costoclavicular: "retração costoclavicular",
};
const DESF_EFEITO_OPTIONS = [
  { value: "aumentoVelocidade", label: "Aumento de velocidade" },
  { value: "reducao", label: "Redução significativa" },
  { value: "ausencia", label: "Ausência de fluxo" },
];
const DESF_EFEITO_TXT = {
  aumentoVelocidade: "aumento focal de velocidades e turbilhonamento do fluxo",
  reducao: "redução significativa do fluxo",
  ausencia: "ausência de fluxo detectável",
};

/* ---------- Estado padrão ---------- */

function defaultAchado(gKey) {
  return {
    id: uid(),
    tipo: "estenoseFocal",
    vaso: GROUPS[gKey].vessels[0],
    // estenose
    localFocal: "proximal",
    grauFocal: "50-75",
    // oclusão
    trechosPervio: ["proximal"],
    trechosOcluido: ["distal"],
    reentradaTipo: "jusante",
    reentradaSeg: "distal",
    // calcificação
    calcSeveridade: "impossibilitando",
    calcMorfologia: "preservada",
    // aneurisma
    aneurismaSegmentos: ["proximal"],
    aneurismaMorfologia: "fusiforme",
    aneurismaTrombo: false,
    coloProximal: "",
    dilatacaoAP: "",
    dilatacaoLL: "",
    lumenResidual: "",
    coloDistal: "",
    // pseudoaneurisma
    pseudoSegmento: "distal",
    pseudoMassaAP: "",
    pseudoMassaLL: "",
    pseudoTrombos: false,
    pseudoColoExtensao: "",
    pseudoColoDiametro: "",
    // angioplastia
    angioSegmento: "proximal",
    angioStatus: "pervio",
    angioGrau: "50-75",
    // desfiladeiro torácico
    resultado: "negativo",
    desfManobras: ["abducao", "hiperabducao"],
    desfSegmento: "distal",
    desfEfeito: "reducao",
  };
}

function defaultGroup() {
  return { parede: "regular", morf: "normal", achados: [] };
}

function defaultSideState() {
  return { incluir: false, g1: defaultGroup(), g2: defaultGroup(), g3: defaultGroup(), obsExtra: "" };
}

/* ---------- Cascata hemodinâmica ----------
   Estenose >75% ou oclusão com colateral em um vaso tornam monofásicas
   as curvas de todos os vasos a jusante (índice maior). */

function allAchados(m) {
  return GROUP_ORDER.flatMap((k) => (m[k] && m[k].achados) || []);
}

function computeForcedMono(m) {
  let minIdx = Infinity;
  allAchados(m).forEach((e) => {
    const trig = (e.tipo === "estenoseFocal" && e.grauFocal === ">75") || e.tipo === "oclusaoSegmentar";
    if (trig) minIdx = Math.min(minIdx, VASO_INDEX[e.vaso]);
  });
  const s = new Set();
  Object.keys(VASO_INDEX).forEach((v) => {
    if (VASO_INDEX[v] > minIdx) s.add(v);
  });
  return s;
}

/* ---------- Construtores de frase ---------- */

function grauTexto(grau) {
  return grau === ">75"
    ? "com mais de 75 % de diminuição do diâmetro da luz do vaso"
    : "com aproximadamente 50 a 75 % de diminuição do diâmetro da luz do vaso";
}

function vesselPhrase(vs) {
  if (vs.length === 1) return `Artéria ${VASO_NOME[vs[0]]}`;
  return `Artérias ${joinList(vs.map((v) => VASO_NOME[v]))}`;
}

function buildBaseline(cfg, g, vessels) {
  const morf = MORFOLOGIA_LABEL[g.morf];
  if (cfg.hasParede) {
    const paredeTxt =
      g.parede === "calcificada"
        ? "placas de ateroma com calcificação em algumas áreas, causando irregularidades parietais difusas"
        : "paredes regulares";
    return `${vesselPhrase(vessels)} apresentando diâmetros normais, ${paredeTxt}, sem alteração do fluxo. Curvas de velocidade de morfologia ${morf}.`;
  }
  return `${vesselPhrase(vessels)} com fluxo em toda a extensão e curvas de velocidade de morfologia ${morf}.`;
}

function buildEstenoseLinha(e) {
  return `Aumento focal de velocidades e turbilhonamento do fluxo ${LOC_FOCAL_PREP[e.localFocal]} ${LOC_FOCAL_NOUN[e.localFocal]} da ${VASO_LABEL[e.vaso]}, causado por placa de ateroma, compatível com estenose hemodinamicamente significativa, ${grauTexto(e.grauFocal)}.`;
}

function oclusaoTodaExtensao(e) {
  return (e.trechosOcluido || []).includes("todaExtensao");
}

function buildOclusaoLinha(e) {
  const vaso = VASO_LABEL[e.vaso];
  const parts = [];
  const pervio = (e.trechosPervio || []).filter((t) => t !== "nenhum");
  if (pervio.length > 0) {
    parts.push(`${pervio.length > 1 ? "Segmentos" : "Segmento"} ${joinList(pervio.map((t) => SEGMENTO_LABEL[t]))} da ${vaso} com fluxo.`);
  }
  const toda = oclusaoTodaExtensao(e);
  const ocluidos = (e.trechosOcluido || []).filter((t) => t !== "todaExtensao");
  const ocluidoTxt = toda
    ? "Toda a extensão"
    
    : `${ocluidos.length > 1 ? "Segmentos" : "Segmento"} ${ocluidos.length ? joinList(ocluidos.map((t) => SEGMENTO_LABEL[t])) : "__"}`;
  const reentradaTxt =
    !toda && e.reentradaTipo === "mesmoVaso"
      ? `o segmento ${SEGMENTO_LABEL[e.reentradaSeg]} do próprio vaso, com curvas de velocidade de morfologia monofásica`
      : VASO_JUSANTE[e.vaso];
  parts.push(
    `${ocluidoTxt} da ${vaso} sem fluxo detectável, porém apresentando circulação colateral reenchendo distalmente ${reentradaTxt}.`
  );
  return parts.join(" ");
}

function buildCalcificacaoLinha(e) {
  const sev = e.calcSeveridade === "dificultando" ? "dificultando" : "impossibilitando";
  return `${capitalize(VASO_LABEL[e.vaso])} apresentando placas de ateroma calcificadas, ${sev} a identificação do fluxo em algumas áreas e causando diminuição significativa do fluxo em algumas regiões. Curvas de velocidade de morfologia ${MORFOLOGIA_LABEL[e.calcMorfologia]} distalmente.`;
}

function buildAneurismaLinhas(e) {
  const segmentos = joinList((e.aneurismaSegmentos || []).map((s) => SEGMENTO_LABEL[s])) || "__";
  const aspecto = e.aneurismaMorfologia === "sacular" ? "sacular" : "fusiforme";
  const tromboTxt = e.aneurismaTrombo ? "com" : "sem";
  return [
    `${(e.aneurismaSegmentos || []).length > 1 ? "Segmentos" : "Segmento"} ${segmentos} da ${VASO_LABEL[e.vaso]} apresentando dilatação de aspecto ${aspecto}, ${tromboTxt} trombos murais e apresentando as seguintes medidas:`,
    `Colo Proximal: ${e.coloProximal || "__"} mm`,
    `Dilatação: ${e.dilatacaoAP || "__"} mm (ântero-posterior) / ${e.dilatacaoLL || "__"} mm (látero-lateral)`,
    `Lúmen Residual: ${e.lumenResidual || "__"} mm`,
    `Colo Distal: ${e.coloDistal || "__"} mm`,
  ];
}

function buildPseudoaneurismaLinha(e) {
  const tromboTxt = e.pseudoTrombos ? "com" : "sem";
  return `Presença de massa adjacente ao segmento ${SEGMENTO_LABEL[e.pseudoSegmento]} da ${VASO_LABEL[e.vaso]}, medindo ${e.pseudoMassaAP || "__"} x ${e.pseudoMassaLL || "__"} mm, apresentando fluxo no seu interior, ${tromboTxt} imagens de trombos murais e se comunicando com a artéria através de colo com extensão de ${e.pseudoColoExtensao || "__"} mm e diâmetro de ${e.pseudoColoDiametro || "__"} mm.`;
}

function buildAngioplastiaLinha(e) {
  const vaso = VASO_LABEL[e.vaso];
  const seg = SEGMENTO_LABEL[e.angioSegmento];
  if (e.angioStatus === "pervio") {
    return `Presença de imagem ecogênica tubular (endoprótese arterial / Stent) no lúmen do segmento ${seg} da ${vaso} com fluxo, sem alterações significativas.`;
  }
  if (e.angioStatus === "oclusao") {
    return `Presença de imagem ecogênica tubular (endoprótese arterial / Stent) no lúmen do segmento ${seg} da ${vaso}, sem fluxo detectável em seu interior.`;
  }
  return `Presença de imagem ecogênica tubular (endoprótese arterial / Stent) no lúmen do segmento ${seg} da ${vaso}, apresentando reestenose intra-stent por hiperplasia neointimal, com aumento focal de velocidades e turbilhonamento do fluxo, ${grauTexto(e.angioGrau)}.`;
}

function manobrasTexto(manobras) {
  const nomes = (manobras || []).map((m) => DESF_MANOBRA_TXT[m]);
  if (nomes.length === 0) return { singular: true, txt: "manobra provocativa" };
  return { singular: nomes.length === 1, txt: joinList(nomes) };
}

function buildDesfiladeiroLinha(side, e) {
  const { singular, txt } = manobrasTexto(e.desfManobras);
  if (e.resultado === "positivo") {
    const durante = singular ? `a manobra de ${txt}` : `as manobras de ${txt}`;
    return `Durante ${durante}, observa-se ${DESF_EFEITO_TXT[e.desfEfeito]} no segmento ${SEGMENTO_LABEL[e.desfSegmento]} da ${VASO_LABEL[e.vaso]} ${LADO_FEM[side]}, com normalização do fluxo após retorno à posição neutra, sugestivo de compressão extrínseca na topografia do desfiladeiro torácico.`;
  }
  const atraves = singular ? `da manobra de ${txt}` : `das manobras de ${txt}`;
  return `Executada pesquisa de Síndrome do Desfiladeiro Torácico através ${atraves}, não sendo observada alteração significativa do fluxo nas artérias subclávia e axilar durante ${singular ? "a referida manobra" : "as referidas manobras"}.`;
}

function buildAchadoLinhas(side, e) {
  switch (e.tipo) {
    case "estenoseFocal":
      return [buildEstenoseLinha(e)];
    case "oclusaoSegmentar":
      return [buildOclusaoLinha(e)];
    case "semFluxoTotal":
      return [`${capitalize(VASO_LABEL[e.vaso])} sem fluxo detectável.`];
    case "calcificacao":
      return [buildCalcificacaoLinha(e)];
    case "aneurisma":
      return buildAneurismaLinhas(e);
    case "pseudoaneurisma":
      return [buildPseudoaneurismaLinha(e)];
    case "angioplastia":
      return [buildAngioplastiaLinha(e)];
    case "desfiladeiro":
      return [buildDesfiladeiroLinha(side, e)];
    default:
      return [];
  }
}

function buildGroupLines(side, gKey, g, forcedMono) {
  const cfg = GROUPS[gKey];
  const achados = g.achados || [];
  const excl = new Set(achados.filter((e) => EXCLUDE_TIPOS.includes(e.tipo)).map((e) => e.vaso));
  const restantes = cfg.vessels.filter((v) => !excl.has(v));
  const forced = restantes.filter((v) => forcedMono.has(v) && g.morf !== "monofasica");
  const normais = restantes.filter((v) => !forced.includes(v));

  const lines = [];
  if (normais.length) lines.push(buildBaseline(cfg, g, normais));
  if (forced.length) {
    lines.push(
      `${vesselPhrase(forced)} com fluxo e curvas de velocidade de morfologia monofásica, em decorrência de lesão proximal.`
    );
  }
  achados.forEach((e) => lines.push(...buildAchadoLinhas(side, e)));
  return lines;
}

function buildSideBlock(side, m) {
  const forcedMono = computeForcedMono(m);
  return {
    side,
    header: `MEMBRO SUPERIOR ${SIDE_LABEL[side]}`,
    lines: GROUP_ORDER.flatMap((k) => buildGroupLines(side, k, m[k], forcedMono)),
  };
}

function getActiveSides(state) {
  return ["D", "E"].filter((s) => state[s].incluir);
}
function buildFullReportBlocks(state) {
  return getActiveSides(state).map((s) => buildSideBlock(s, state[s]));
}

/* ---------- Conclusão ---------- */

function buildConclusaoAchado(side, e) {
  const vaso = VASO_LABEL[e.vaso];
  switch (e.tipo) {
    case "estenoseFocal": {
      const grau = e.grauFocal === ">75" ? "> 75 %" : "50-75 %";
      return `Estenose hemodinamicamente significativa (${grau}) ${LOC_FOCAL_PREP[e.localFocal]} ${LOC_FOCAL_NOUN[e.localFocal]} da ${vaso}.`;
    }
    case "oclusaoSegmentar": {
      const ocluidos = (e.trechosOcluido || []).filter((t) => t !== "todaExtensao");
      const segTxt =
        oclusaoTodaExtensao(e) || ocluidos.length === 0
          ? ""
          : `${ocluidos.length > 1 ? "dos segmentos" : "do segmento"} ${joinList(ocluidos.map((t) => SEGMENTO_LABEL[t]))} `;
      return `Obstrução ${segTxt}da ${vaso}, com reenchimento distal por circulação colateral.`;
    }
    case "semFluxoTotal":
      return `Obstrução da ${vaso}, sem reenchimento distal identificado.`;
    case "aneurisma": {
      const aspecto = e.aneurismaMorfologia === "sacular" ? "sacular" : "fusiforme";
      return `Aneurisma ${aspecto} da ${vaso}, medindo ${e.dilatacaoAP || "__"} x ${e.dilatacaoLL || "__"} mm.`;
    }
    case "pseudoaneurisma":
      return `Pseudoaneurisma da ${vaso}, medindo ${e.pseudoMassaAP || "__"} x ${e.pseudoMassaLL || "__"} mm.`;
    case "angioplastia":
      if (e.angioStatus === "pervio") return `Endoprótese arterial (Stent) pérvia na ${vaso}, sem alterações significativas.`;
      if (e.angioStatus === "oclusao") return `Endoprótese arterial (Stent) ocluída na ${vaso}.`;
      return `Endoprótese arterial (Stent) com reestenose na ${vaso}.`;
    case "desfiladeiro":
      if (e.resultado === "positivo") {
        return `Compressão extrínseca da ${vaso} durante manobra provocativa, sugestiva de Síndrome do Desfiladeiro Torácico (componente arterial).`;
      }
      return "Teste para Síndrome do Desfiladeiro Torácico negativo.";
    default:
      return null;
  }
}

// Achados que, sozinhos, não caracterizam laudo alterado
function isAchadoNeutro(e) {
  return (
    e.tipo === "calcificacao" ||
    (e.tipo === "angioplastia" && e.angioStatus === "pervio") ||
    (e.tipo === "desfiladeiro" && e.resultado !== "positivo")
  );
}

function buildConclusaoObsLinha(side, m) {
  if (m.g1.morf !== "monofasica") return null;
  const lado = LADO_FEM[side];
  const alvo = side === "D" ? `do segmento proximal da artéria subclávia ${lado} e do tronco braquiocefálico` : `do segmento proximal da artéria subclávia ${lado}`;
  return `* Obs.: A critério médico, complementar a avaliação ${alvo} com método de imagem axial (Angiotomografia ou Angiorressonância), devido ao padrão das curvas de velocidade de morfologia monofásica na artéria subclávia ${lado}.`;
}

function buildConclusaoSection(state) {
  const sides = getActiveSides(state);
  if (sides.length === 0) return [];
  const lines = ["CONCLUSÃO"];
  sides.forEach((side) => {
    const m = state[side];
    const achados = allAchados(m);
    lines.push(`MEMBRO SUPERIOR ${SIDE_LABEL[side]}`);

    const significativos = achados.filter((e) => !isAchadoNeutro(e));
    if (significativos.length === 0) {
      lines.push(
        `Não há dilatações ou estenoses hemodinamicamente significativas nas artérias do membro superior ${LADO_FEM[side]}.`
      );
    }
    achados
      .filter((e) => e.tipo !== "calcificacao")
      .forEach((e) => {
        const l = buildConclusaoAchado(side, e);
        if (l) lines.push(l);
      });
    if (achados.some((e) => e.tipo === "calcificacao")) lines.push("Calcificação parietal difusa.");

    const obs = buildConclusaoObsLinha(side, m);
    if (obs) lines.push(obs);
  });
  return lines;
}

function buildTituloLinhas(state) {
  const sides = getActiveSides(state);
  if (sides.length === 2) return "ECODOPPLER COLORIDO - SISTEMA ARTERIAL DOS MEMBROS SUPERIORES BILATERALMENTE";
  if (sides.length === 1) return `ECODOPPLER COLORIDO - SISTEMA ARTERIAL DO MEMBRO SUPERIOR ${SIDE_LABEL[sides[0]]}`;
  return "ECODOPPLER COLORIDO - SISTEMA ARTERIAL DO MEMBRO SUPERIOR";
}

function buildIntroLinha(state) {
  const sides = getActiveSides(state);
  let modo = "bilateralmente";
  if (sides.length === 1) modo = sides[0] === "D" ? "unilateralmente à direita" : "unilateralmente à esquerda";
  return `Avaliação anatômica e hemodinâmica das artérias subclávia, axilar, braquial, radial e ulnar, ${modo}.`;
}

function formatObsLine(texto) {
  const t = (texto || "").trim();
  return t.endsWith(".") ? `* Obs.: ${t}` : `* Obs.: ${t}.`;
}
function getExtraObsLines(state) {
  return getActiveSides(state)
    .map((s) => state[s].obsExtra)
    .filter((t) => t && t.trim())
    .map(formatObsLine);
}

function isUpperLine(text) {
  return text === text.toUpperCase() && /[A-ZÀ-Ú]/.test(text) && !text.startsWith("-") && !text.startsWith("*");
}

/* ============================================================
   COMPONENTES DE UI BÁSICOS
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

function Section({ title, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, marginBottom: 12, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, letterSpacing: 0.2 }}>{title}</span>
          {subtitle ? <span style={{ fontSize: 12, color: COLORS.textMuted }}>{subtitle}</span> : null}
        </div>
        <ChevronDown size={17} color={COLORS.textMuted} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms ease" }} />
      </button>
      {open && <div style={{ padding: "2px 16px 16px 16px" }}>{children}</div>}
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 0", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
    >
      <span style={{ flexShrink: 0, width: 36, height: 21, borderRadius: 20, background: checked ? COLORS.accent : COLORS.borderLight, position: "relative", transition: "background 150ms ease" }}>
        <span style={{ position: "absolute", top: 2, left: checked ? 17 : 2, width: 17, height: 17, borderRadius: "50%", background: "#fff", transition: "left 150ms ease" }} />
      </span>
      <span style={{ fontSize: 13.5, color: COLORS.text, fontWeight: 500 }}>{label}</span>
    </button>
  );
}

function PillGroup({ options, value, onChange, multi = false }) {
  const isSelected = (v) => (multi ? value.includes(v) : value === v);
  const toggle = (v) => {
    if (multi) onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
    else onChange(v);
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
        style={{ width, padding: suffix ? "7px 28px 7px 9px" : "7px 9px", borderRadius: 7, border: `1px solid ${COLORS.borderLight}`, background: COLORS.panelAlt, color: COLORS.text, fontSize: 13, outline: "none" }}
      />
      {suffix && (
        <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: COLORS.textMuted, pointerEvents: "none" }}>{suffix}</span>
      )}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || ""}
      style={{ width: "100%", padding: "7px 9px", borderRadius: 7, border: `1px solid ${COLORS.borderLight}`, background: COLORS.panelAlt, color: COLORS.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
    />
  );
}

function Row({ children }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>{children}</div>;
}
function Label({ children }) {
  return <span style={{ fontSize: 12, color: COLORS.textMuted, marginRight: 2 }}>{children}</span>;
}
function Hint({ children, warn }) {
  return <div style={{ marginTop: 6, fontSize: 11, color: warn ? COLORS.warn : COLORS.textMuted }}>{children}</div>;
}
function Divider() {
  return <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "14px 0" }} />;
}

/* ============================================================
   CARDS DE ACHADO
   ============================================================ */

function AneurismaFields({ entry, setE }) {
  return (
    <div style={{ paddingLeft: 4 }}>
      <Row>
        <Label>Segmento(s)</Label>
        <PillGroup options={SEGMENTO_OPTIONS} value={entry.aneurismaSegmentos} onChange={setE("aneurismaSegmentos")} multi />
      </Row>
      <Row>
        <Label>Aspecto</Label>
        <PillGroup options={ANEURISMA_MORFOLOGIA_OPTIONS} value={entry.aneurismaMorfologia} onChange={setE("aneurismaMorfologia")} />
      </Row>
      <div style={{ marginTop: 8 }}>
        <Toggle checked={entry.aneurismaTrombo} onChange={setE("aneurismaTrombo")} label="Com trombos murais" />
      </div>
      <Row>
        <Label>Colo proximal</Label>
        <NumInput value={entry.coloProximal} onChange={setE("coloProximal")} suffix="mm" />
      </Row>
      <Row>
        <Label>Dilatação AP</Label>
        <NumInput value={entry.dilatacaoAP} onChange={setE("dilatacaoAP")} suffix="mm" />
        <Label>Dilatação LL</Label>
        <NumInput value={entry.dilatacaoLL} onChange={setE("dilatacaoLL")} suffix="mm" />
      </Row>
      <Row>
        <Label>Lúmen residual</Label>
        <NumInput value={entry.lumenResidual} onChange={setE("lumenResidual")} suffix="mm" />
      </Row>
      <Row>
        <Label>Colo distal</Label>
        <NumInput value={entry.coloDistal} onChange={setE("coloDistal")} suffix="mm" />
      </Row>
    </div>
  );
}

function AchadoCard({ gKey, entry, index, onChange, onRemove }) {
  const cfg = GROUPS[gKey];
  const setE = (key) => (val) => onChange((prev) => ({ ...prev, [key]: val }));
  const tipoOptions = cfg.tipos.map((t) => ({ value: t, label: ACHADO_TIPO_LABEL[t] }));
  const vesselOptions = cfg.vessels.map((v) => ({ value: v, label: capitalize(VASO_NOME[v]) }));
  const showVaso =
    cfg.vessels.length > 1 && !(entry.tipo === "desfiladeiro" && entry.resultado !== "positivo");
  const toda = oclusaoTodaExtensao(entry);

  return (
    <div style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: 9, padding: 12, marginBottom: 10, background: COLORS.panelAlt }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.accent }}>Achado {index + 1}</span>
        <button onClick={onRemove} style={{ background: "transparent", border: "none", color: COLORS.danger, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "2px 4px" }}>
          Remover
        </button>
      </div>

      <Row>
        <PillGroup options={tipoOptions} value={entry.tipo} onChange={setE("tipo")} />
      </Row>

      {showVaso && (
        <Row>
          <Label>Vaso</Label>
          <PillGroup options={vesselOptions} value={entry.vaso} onChange={setE("vaso")} />
        </Row>
      )}

      {entry.tipo === "estenoseFocal" && (
        <div style={{ paddingLeft: 4 }}>
          <Row>
            <Label>Localização</Label>
            <PillGroup options={LOC_FOCAL_OPTIONS} value={entry.localFocal} onChange={setE("localFocal")} />
          </Row>
          <Row>
            <Label>Grau</Label>
            <PillGroup options={GRAU_OPTIONS} value={entry.grauFocal} onChange={setE("grauFocal")} />
          </Row>
          {entry.grauFocal === ">75" && VASO_INDEX[entry.vaso] < 3 && (
            <Hint warn>Estenose &gt;75%: os vasos a jusante serão descritos automaticamente com curvas monofásicas.</Hint>
          )}
        </div>
      )}

      {entry.tipo === "oclusaoSegmentar" && (
        <div style={{ paddingLeft: 4 }}>
          <Row>
            <Label>Trecho(s) pérvio(s)</Label>
            <PillGroup
              options={[{ value: "nenhum", label: "Nenhum (desde a origem)" }, ...SEGMENTO_OPTIONS]}
              value={entry.trechosPervio}
              onChange={setE("trechosPervio")}
              multi
            />
          </Row>
          <Row>
            <Label>Trecho(s) ocluído(s)</Label>
            <PillGroup
              options={[...SEGMENTO_OPTIONS, { value: "todaExtensao", label: "Toda a extensão" }]}
              value={entry.trechosOcluido}
              onChange={setE("trechosOcluido")}
              multi
            />
          </Row>
          <Row>
            <Label>Reenchimento por colateral</Label>
            <PillGroup
              options={[
                { value: "jusante", label: `A jusante (${VASO_JUSANTE_CURTO[entry.vaso]})` },
                ...(toda ? [] : [{ value: "mesmoVaso", label: "No próprio vaso" }]),
              ]}
              value={toda ? "jusante" : entry.reentradaTipo}
              onChange={setE("reentradaTipo")}
            />
          </Row>
          {!toda && entry.reentradaTipo === "mesmoVaso" && (
            <Row>
              <Label>Segmento reabitado</Label>
              <PillGroup options={SEGMENTO_OPTIONS} value={entry.reentradaSeg} onChange={setE("reentradaSeg")} />
            </Row>
          )}
          {VASO_INDEX[entry.vaso] < 3 && (
            <Hint warn>Os vasos a jusante serão descritos automaticamente com curvas monofásicas.</Hint>
          )}
        </div>
      )}

      {entry.tipo === "calcificacao" && (
        <div style={{ paddingLeft: 4 }}>
          <Row>
            <Label>Grau</Label>
            <PillGroup
              options={[
                { value: "impossibilitando", label: "Impossibilitando" },
                { value: "dificultando", label: "Dificultando" },
              ]}
              value={entry.calcSeveridade}
              onChange={setE("calcSeveridade")}
            />
          </Row>
          <Row>
            <Label>Morfologia distalmente</Label>
            <PillGroup options={MORFOLOGIA_OPTIONS} value={entry.calcMorfologia} onChange={setE("calcMorfologia")} />
          </Row>
        </div>
      )}

      {entry.tipo === "aneurisma" && <AneurismaFields entry={entry} setE={setE} />}

      {entry.tipo === "pseudoaneurisma" && (
        <div style={{ paddingLeft: 4 }}>
          <Row>
            <Label>Segmento</Label>
            <PillGroup options={SEGMENTO_OPTIONS} value={entry.pseudoSegmento} onChange={setE("pseudoSegmento")} />
          </Row>
          <Row>
            <Label>Massa (AP x LL)</Label>
            <NumInput value={entry.pseudoMassaAP} onChange={setE("pseudoMassaAP")} suffix="mm" />
            <NumInput value={entry.pseudoMassaLL} onChange={setE("pseudoMassaLL")} suffix="mm" />
          </Row>
          <div style={{ marginTop: 6 }}>
            <Toggle checked={entry.pseudoTrombos} onChange={setE("pseudoTrombos")} label="Com imagens de trombos murais" />
          </div>
          <Row>
            <Label>Colo (extensão / diâmetro)</Label>
            <NumInput value={entry.pseudoColoExtensao} onChange={setE("pseudoColoExtensao")} suffix="mm" />
            <NumInput value={entry.pseudoColoDiametro} onChange={setE("pseudoColoDiametro")} suffix="mm" />
          </Row>
        </div>
      )}

      {entry.tipo === "angioplastia" && (
        <div style={{ paddingLeft: 4 }}>
          <Row>
            <Label>Segmento</Label>
            <PillGroup options={SEGMENTO_OPTIONS} value={entry.angioSegmento} onChange={setE("angioSegmento")} />
          </Row>
          <Row>
            <Label>Status atual</Label>
            <PillGroup
              options={[
                { value: "pervio", label: "Pérvio, sem alterações" },
                { value: "reestenose", label: "Reestenose intra-stent" },
                { value: "oclusao", label: "Ocluído" },
              ]}
              value={entry.angioStatus}
              onChange={setE("angioStatus")}
            />
          </Row>
          {entry.angioStatus === "reestenose" && (
            <Row>
              <Label>Grau</Label>
              <PillGroup options={GRAU_OPTIONS} value={entry.angioGrau} onChange={setE("angioGrau")} />
            </Row>
          )}
        </div>
      )}

      {entry.tipo === "desfiladeiro" && (
        <div style={{ paddingLeft: 4 }}>
          <Row>
            <Label>Resultado</Label>
            <PillGroup
              options={[
                { value: "negativo", label: "Negativo" },
                { value: "positivo", label: "Positivo" },
              ]}
              value={entry.resultado}
              onChange={setE("resultado")}
            />
          </Row>
          <Row>
            <Label>Manobra(s)</Label>
            <PillGroup options={DESF_MANOBRA_OPTIONS} value={entry.desfManobras} onChange={setE("desfManobras")} multi />
          </Row>
          {entry.resultado === "positivo" && (
            <>
              <Row>
                <Label>Segmento</Label>
                <PillGroup options={SEGMENTO_OPTIONS} value={entry.desfSegmento} onChange={setE("desfSegmento")} />
              </Row>
              <Row>
                <Label>Efeito</Label>
                <PillGroup options={DESF_EFEITO_OPTIONS} value={entry.desfEfeito} onChange={setE("desfEfeito")} />
              </Row>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   FORMULÁRIO DE UM LADO
   ============================================================ */

function addBtnStyle() {
  return {
    width: "100%",
    padding: "9px 0",
    borderRadius: 8,
    border: `1.5px dashed ${COLORS.borderLight}`,
    background: "transparent",
    color: COLORS.accent,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
  };
}

function GroupSection({ gKey, data, update }) {
  const cfg = GROUPS[gKey];
  const g = data[gKey];
  const setG = (key) => (val) => update((prev) => ({ ...prev, [gKey]: { ...prev[gKey], [key]: val } }));
  const setAchados = (fn) => update((prev) => ({ ...prev, [gKey]: { ...prev[gKey], achados: fn(prev[gKey].achados || []) } }));

  return (
    <Section title={cfg.title} defaultOpen>
      {cfg.hasParede && (
        <Row>
          <Label>Paredes</Label>
          <PillGroup options={PAREDE_OPTIONS} value={g.parede} onChange={setG("parede")} />
        </Row>
      )}
      <Row>
        <Label>Morfologia do fluxo</Label>
        <PillGroup options={MORFOLOGIA_OPTIONS} value={g.morf} onChange={setG("morf")} />
      </Row>
      {gKey === "g1" && g.morf === "monofasica" && (
        <Hint warn>Curva monofásica na subclávia: a conclusão incluirá sugestão de investigação do segmento proximal.</Hint>
      )}

      <Divider />
      <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>Achados</div>
      <Hint>
        Vaso com estenose, oclusão, aneurisma ou sem fluxo sai automaticamente da frase "normal". Um achado por vaso.
      </Hint>
      <div style={{ height: 6 }} />

      {(g.achados || []).map((entry, idx) => (
        <AchadoCard
          key={entry.id}
          gKey={gKey}
          entry={entry}
          index={idx}
          onChange={(updater) => setAchados((arr) => arr.map((en) => (en.id === entry.id ? updater(en) : en)))}
          onRemove={() => setAchados((arr) => arr.filter((en) => en.id !== entry.id))}
        />
      ))}
      <button onClick={() => setAchados((arr) => [...arr, defaultAchado(gKey)])} style={addBtnStyle()}>
        + Adicionar achado
      </button>
    </Section>
  );
}

function SideForm({ data, update }) {
  return (
    <div>
      {GROUP_ORDER.map((k) => (
        <GroupSection key={k} gKey={k} data={data} update={update} />
      ))}
      <Section title="Observações adicionais" subtitle="Nota livre">
        <TextInput
          value={data.obsExtra}
          onChange={(v) => update((prev) => ({ ...prev, obsExtra: v }))}
          placeholder="Frase completa a ser incluída no final do laudo"
        />
      </Section>
    </div>
  );
}

/* ============================================================
   PREVIEW
   ============================================================ */

function renderLine(line, key) {
  if (line === "") return <div key={key} style={{ height: 8 }} />;
  const upper = isUpperLine(line);
  return (
    <div key={key} style={{ color: upper ? COLORS.text : COLORS.textMuted, fontWeight: upper ? 700 : 400, marginBottom: 2, marginTop: upper ? 6 : 0 }}>
      {line}
    </div>
  );
}

function ReportPreview({ state, patientName, examDate }) {
  const blocks = useMemo(() => buildFullReportBlocks(state), [state]);
  const conclusao = useMemo(() => buildConclusaoSection(state), [state]);

  if (blocks.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>
        Selecione ao menos um lado (MS Direito e/ou MS Esquerdo) para começar a gerar o laudo.
      </div>
    );
  }

  let k = 0;
  return (
    <div style={{ fontSize: 13, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", lineHeight: 1.55 }}>
      <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>{buildTituloLinhas(state)}</div>
      {patientName.trim() && (
        <div style={{ color: COLORS.textMuted, marginBottom: 2 }}>
          <strong style={{ color: COLORS.text }}>Paciente:</strong> {patientName.trim()}
        </div>
      )}
      {examDate.trim() && (
        <div style={{ color: COLORS.textMuted, marginBottom: 10 }}>
          <strong style={{ color: COLORS.text }}>Data:</strong> {examDate.trim()}
        </div>
      )}
      <div style={{ color: COLORS.textMuted, marginBottom: 10 }}>{buildIntroLinha(state)}</div>

      {blocks.map((b) => (
        <div key={"lado-" + b.side}>
          {renderLine(b.header, k++)}
          {b.lines.map((l) => renderLine(l, k++))}
          <div style={{ height: 10 }} />
        </div>
      ))}

      {conclusao.map((l) => renderLine(l, k++))}
      {getExtraObsLines(state).length > 0 && <div style={{ marginTop: 4 }}>{getExtraObsLines(state).map((l) => renderLine(l, k++))}</div>}
    </div>
  );
}

/* ============================================================
   EXPORTAÇÃO .DOCX
   ============================================================ */

async function exportDocx(state, patientName, examDate) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");

  const blocks = buildFullReportBlocks(state);
  const conclusao = buildConclusaoSection(state);

  const FONT = "Helvetica Neue";
  const SZ = 24;
  const SP = 60;

  const tr = (text, opts = {}) => new TextRun({ text, font: FONT, size: SZ, ...opts });
  const paraText = (text, opts = {}) =>
    new Paragraph({ spacing: { after: SP }, keepLines: true, keepNext: !!opts.keepNext, children: [tr(text, { bold: isUpperLine(text) })] });
  const emptyLine = (opts = {}) => new Paragraph({ children: [], spacing: { after: 0 }, keepNext: !!opts.keepNext });
  const linesToNodes = (lines) =>
    lines.map((item, idx) => {
      const keepNext = idx < lines.length - 1;
      return item === "" ? emptyLine({ keepNext }) : paraText(item, { keepNext });
    });

  const children = [];
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: SP }, children: [tr(buildTituloLinhas(state), { bold: true })] }));
  children.push(emptyLine());
  if (patientName.trim()) {
    children.push(new Paragraph({ spacing: { after: SP }, children: [tr("Paciente: ", { bold: true }), tr(patientName.trim())] }));
  }
  if (examDate.trim()) {
    children.push(new Paragraph({ spacing: { after: 0 }, children: [tr("Data: ", { bold: true }), tr(examDate.trim())] }));
    children.push(emptyLine());
  }
  children.push(new Paragraph({ spacing: { after: SP }, children: [tr(buildIntroLinha(state))] }));
  children.push(emptyLine());

  blocks.forEach((b) => {
    children.push(...linesToNodes([b.header, ...b.lines]));
    children.push(emptyLine());
  });
  if (conclusao.length > 0) {
    children.push(...linesToNodes(conclusao));
    children.push(emptyLine());
  }
  getExtraObsLines(state).forEach((l) => children.push(paraText(l)));

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: SZ } } } },
    sections: [
      {
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const nomePaciente = patientName.trim().replace(/[^\wÀ-ÿ\s\-]+/g, "").trim() || "Laudo";
  a.href = url;
  a.download = `${nomePaciente} ARTERIAL MMSS.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================================================
   MODAL — CRITÉRIOS DE INTERPRETAÇÃO
   ============================================================ */

const CRIT_ARTERIAL = [
  ["Normal", "PSVR < 1,5; fluxo trifásico de alta resistência em repouso"],
  ["< 50%", "PSVR < 2,0; leve turbulência pós-estenótica"],
  ["50 – 75%", "PSVR 2,0 – 4,0; aumento focal de velocidade e turbilhonamento do fluxo"],
  [">75%", "PSVR > 4,0; velocidade muito aumentada; fluxo monofásico distalmente"],
  ["Oclusão", "Ausência de fluxo no segmento; reenchimento distal por colateral, fluxo monofásico de baixa velocidade"],
];

function CriteriosModal({ onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: COLORS.panel, border: `1px solid ${COLORS.borderLight}`, borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "85vh", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.text }}>Critérios de interpretação</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", padding: 4, display: "flex" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "14px 16px 20px 16px", overflowY: "auto" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent, marginBottom: 8 }}>Duplex arterial de MMSS — Graduação de estenose (PSVR)</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Estenose", "Critérios"].map((h, i) => (
                  <th key={i} style={{ textAlign: "left", padding: "7px 8px", background: COLORS.accentDim, color: COLORS.accent, fontWeight: 700, border: `1px solid ${COLORS.border}`, width: i === 0 ? "22%" : "78%" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CRIT_ARTERIAL.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: "7px 8px", border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, fontWeight: ci === 0 ? 600 : 400, verticalAlign: "top" }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 8 }}>
            PSVR = razão entre a velocidade sistólica de pico no segmento estenótico e no segmento normal imediatamente proximal.
            Na pesquisa de desfiladeiro torácico, comparar o fluxo em posição neutra com o obtido em cada manobra; redução
            transitória discreta pode ocorrer em indivíduos assintomáticos — correlacionar com a clínica.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   APP
   ============================================================ */

function actionBtnStyle(extra = {}) {
  return {
    flex: "1 1 110px",
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
    ...extra,
  };
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

function sideToggleStyle(on) {
  return {
    flex: 1,
    padding: "8px 6px",
    borderRadius: 7,
    border: `1px solid ${on ? COLORS.accent : COLORS.borderLight}`,
    background: on ? COLORS.accentDim : "transparent",
    color: on ? COLORS.accent : COLORS.textMuted,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };
}

export default function AppArterialMMSS() {
  const [patientName, setPatientName] = useState("");
  const [examDate, setExamDate] = useState(todayBR());
  const [examDateISO, setExamDateISO] = useState(todayISO());
  const [includeDateOnCopy, setIncludeDateOnCopy] = useState(true);
  const [activeTab, setActiveTab] = useState("D");
  const [state, setState] = useState({ D: defaultSideState(), E: defaultSideState() });
  const [copied, setCopied] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showCriterios, setShowCriterios] = useState(false);

  const updateSide = useCallback((side, updater) => {
    setState((prev) => ({ ...prev, [side]: updater(prev[side]) }));
  }, []);

  const doReset = () => {
    setState({ D: defaultSideState(), E: defaultSideState() });
    setPatientName("");
    setExamDate(todayBR());
    setExamDateISO(todayISO());
    setConfirmReset(false);
  };

  const stateForSide = useCallback(
    (onlySide) =>
      onlySide
        ? {
            ...state,
            D: onlySide === "D" ? state.D : { ...state.D, incluir: false },
            E: onlySide === "E" ? state.E : { ...state.E, incluir: false },
          }
        : state,
    [state]
  );

  const buildReportLines = useCallback(
    (onlySide) => {
      const st = stateForSide(onlySide);
      const lines = [buildTituloLinhas(st), ""];
      if (patientName.trim()) lines.push(`Paciente: ${patientName.trim()}`, "");
      if (examDate.trim() && includeDateOnCopy) lines.push(`Data: ${examDate.trim()}`, "");
      lines.push(buildIntroLinha(st), "");
      buildFullReportBlocks(st).forEach((b) => lines.push(b.header, ...b.lines, ""));
      const conclusao = buildConclusaoSection(st);
      lines.push(...conclusao);
      if (conclusao.length > 0) lines.push("");
      lines.push(...getExtraObsLines(st));
      return lines;
    },
    [stateForSide, patientName, examDate, includeDateOnCopy]
  );

  const buildReportHTML = useCallback(
    (onlySide) => {
      const st = stateForSide(onlySide);
      const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      const pStyle = "margin:2px 0;font-family:Helvetica Neue,Arial,sans-serif;font-size:12pt;";
      const boldStyle = `${pStyle}font-weight:bold;`;
      const blank = `<p style="${pStyle}">&nbsp;</p>`;
      const item = (l) => (l === "" ? blank : `<p style="${isUpperLine(l) ? boldStyle : pStyle}">${esc(l)}</p>`);

      let html = `<div style="font-family:Helvetica Neue,Arial,sans-serif;font-size:12pt;">`;
      html += `<p style="${boldStyle}text-align:center;">${buildTituloLinhas(st)}</p>${blank}`;
      if (patientName.trim()) html += `<p style="${pStyle}"><b>Paciente:</b> ${esc(patientName.trim())}</p>`;
      if (examDate.trim() && includeDateOnCopy) html += `<p style="${pStyle}"><b>Data:</b> ${esc(examDate.trim())}</p>${blank}`;
      html += `<p style="${pStyle}">${buildIntroLinha(st)}</p>${blank}`;
      buildFullReportBlocks(st).forEach((b) => {
        html += [b.header, ...b.lines].map(item).join("") + blank;
      });
      const conclusao = buildConclusaoSection(st);
      html += conclusao.map(item).join("");
      if (conclusao.length > 0) html += blank;
      html += getExtraObsLines(st).map(item).join("");
      return html + "</div>";
    },
    [stateForSide, patientName, examDate, includeDateOnCopy]
  );

  const handleCopy = async (onlySide) => {
    const key = onlySide || "all";
    const text = buildReportLines(onlySide).join("\n");
    try {
      if (window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([buildReportHTML(onlySide)], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch (e) {
      try {
        await navigator.clipboard.writeText(text);
      } catch (e2) {
        console.error("Erro ao copiar:", e2);
        return;
      }
    }
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
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

  const bothSides = state.D.incluir && state.E.incluir;
  const anySide = state.D.incluir || state.E.incluir;
  const mainCopyLabel = bothSides ? "Copiar Bilateral" : state.D.incluir ? "Copiar MSD" : state.E.incluir ? "Copiar MSE" : "Copiar";

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", color: COLORS.text }}>
      {/* ---------- Cabeçalho ---------- */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(253,252,250,0.92)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${COLORS.border}`, padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: COLORS.accentDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Stethoscope size={17} color={COLORS.accent} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: 0.2 }}>Arterial MMSS</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>Gerador de laudo · Ecodoppler colorido</div>
          </div>
          <button
            onClick={() => setShowCriterios(true)}
            title="Critérios de interpretação"
            style={{ background: "transparent", border: `1px solid ${COLORS.borderLight}`, borderRadius: 8, padding: 7, color: COLORS.textMuted, cursor: "pointer", display: "flex" }}
          >
            <Info size={15} />
          </button>
          <button
            onClick={() => setConfirmReset(true)}
            title="Novo laudo"
            style={{ background: "transparent", border: `1px solid ${COLORS.borderLight}`, borderRadius: 8, padding: 7, color: COLORS.textMuted, cursor: "pointer", display: "flex" }}
          >
            <RotateCcw size={15} />
          </button>
        </div>

        <input
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          placeholder="Nome do paciente (opcional)"
          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.borderLight}`, background: COLORS.panelAlt, color: COLORS.text, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
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
            style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${COLORS.borderLight}`, background: COLORS.panelAlt, color: COLORS.text, fontSize: 13, outline: "none", boxSizing: "border-box", colorScheme: "light" }}
          />
          <button
            onClick={() => {
              setExamDateISO(todayISO());
              setExamDate(todayBR());
            }}
            style={{ flexShrink: 0, padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.borderLight}`, background: "transparent", color: COLORS.accent, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
          >
            Hoje
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={() => updateSide("D", (p) => ({ ...p, incluir: !p.incluir }))} style={sideToggleStyle(state.D.incluir)}>
            MS DIREITO
          </button>
          <button onClick={() => updateSide("E", (p) => ({ ...p, incluir: !p.incluir }))} style={sideToggleStyle(state.E.incluir)}>
            MS ESQUERDO
          </button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setActiveTab("D")} style={tabStyle(activeTab === "D")}>
            Formulário — Direito
          </button>
          <button onClick={() => setActiveTab("E")} style={tabStyle(activeTab === "E")}>
            Formulário — Esquerdo
          </button>
        </div>
      </div>

      {/* ---------- Corpo ---------- */}
      <div style={{ padding: "14px 14px 120px 14px" }}>
        {!mobilePreview ? (
          !state[activeTab].incluir ? (
            <div style={{ padding: 24, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>
              MS {activeTab === "D" ? "Direito" : "Esquerdo"} não incluído no laudo. Toque em "MS {SIDE_LABEL[activeTab]}" acima para habilitar o formulário.
            </div>
          ) : (
            <SideForm data={state[activeTab]} update={(updater) => updateSide(activeTab, updater)} />
          )
        ) : (
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
            <ReportPreview state={state} patientName={patientName} examDate={examDate} />
          </div>
        )}
      </div>

      {/* ---------- Rodapé de ações ---------- */}
      <div
        style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(253,252,250,0.97)", backdropFilter: "blur(8px)", borderTop: `1px solid ${COLORS.border}`, padding: "10px 14px calc(10px + env(safe-area-inset-bottom))", display: "flex", flexWrap: "wrap", gap: 8, zIndex: 20 }}
      >
        <label style={{ flexBasis: "100%", display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: COLORS.textMuted, cursor: "pointer", userSelect: "none", marginBottom: 2 }}>
          <input type="checkbox" checked={includeDateOnCopy} onChange={(e) => setIncludeDateOnCopy(e.target.checked)} style={{ accentColor: COLORS.accent, width: 14, height: 14 }} />
          Incluir data ao copiar texto
        </label>
        <button
          onClick={() => setMobilePreview((v) => !v)}
          style={actionBtnStyle({ flex: "0 0 auto", padding: "11px 14px", background: mobilePreview ? COLORS.accentDim : "transparent", color: mobilePreview ? COLORS.accent : COLORS.text })}
        >
          {mobilePreview ? "Editar" : "Visualizar"}
        </button>
        <button onClick={() => handleCopy()} disabled={!anySide} style={actionBtnStyle({ opacity: anySide ? 1 : 0.5 })}>
          {copied === "all" ? <Check size={14} color={COLORS.accent} /> : <Copy size={14} />}
          {copied === "all" ? "Copiado" : mainCopyLabel}
        </button>
        {bothSides && (
          <>
            <button onClick={() => handleCopy("D")} style={actionBtnStyle()}>
              {copied === "D" ? <Check size={14} color={COLORS.accent} /> : <Copy size={14} />}
              {copied === "D" ? "Copiado" : "Copiar MSD"}
            </button>
            <button onClick={() => handleCopy("E")} style={actionBtnStyle()}>
              {copied === "E" ? <Check size={14} color={COLORS.accent} /> : <Copy size={14} />}
              {copied === "E" ? "Copiado" : "Copiar MSE"}
            </button>
          </>
        )}
        <button
          onClick={handleExport}
          disabled={exporting || !anySide}
          style={actionBtnStyle({ border: "none", background: COLORS.accent, color: "#FDFCFA", fontWeight: 700, cursor: exporting ? "default" : "pointer", opacity: exporting || !anySide ? 0.7 : 1 })}
        >
          <Download size={14} />
          {exporting ? "Gerando..." : "Baixar .docx"}
        </button>
      </div>

      {showCriterios && <CriteriosModal onClose={() => setShowCriterios(false)} />}

      {confirmReset && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setConfirmReset(false)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.panel, border: `1px solid ${COLORS.borderLight}`, borderRadius: 12, padding: 24, width: 280, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>Novo laudo</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20, lineHeight: 1.5 }}>Limpar todos os dados e começar um novo laudo?</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmReset(false)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${COLORS.borderLight}`, background: "transparent", color: COLORS.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={doReset}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "none", background: COLORS.accent, color: "#FDFCFA", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
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

// Exportado para testes do motor de texto
export { buildFullReportBlocks, buildConclusaoSection, defaultSideState, defaultAchado };
