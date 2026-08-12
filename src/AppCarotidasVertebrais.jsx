import React, { useState, useMemo, useCallback } from "react";
import {
  ChevronDown,
  Copy,
  Download,
  Check,
  RotateCcw,
  Stethoscope,
  Info,
  X,
} from "lucide-react";

/* ============================================================
   MOTOR DE GERAÇÃO DE LAUDO — CARÓTIDAS E VERTEBRAIS
   ============================================================ */

const SIDE_LABEL = { D: "DIREITA", E: "ESQUERDA" };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function todayBR() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function listaFluida(items) {
  if (!items || items.length === 0) return "";
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(", ") + " e " + items[items.length - 1];
}

/* ---------- Opções ---------- */

const CAROTIDEO_MODO_OPTIONS = [
  { value: "cimt", label: "Normal / complexo médio-intimal" },
  { value: "estenoses", label: "Áreas de estenose" },
];

const ESTENOSE_GRAU_OPTIONS = [
  { value: "discretaModerada", label: "Discreta a moderada" },
  { value: "significativa", label: "Hemodinamicamente significativa" },
  { value: "critica", label: "Crítica (>80%)" },
  { value: "obstrucao", label: "Obstrução" },
];

const LOC_OPTIONS = [
  { value: "proximalACC", label: "segmento proximal da art. carótida comum" },
  { value: "medioProximalACC", label: "segmento médio-proximal da art. carótida comum" },
  { value: "distalACC", label: "segmento distal da art. carótida comum" },
  { value: "bifurcacao", label: "bifurcação carotídea" },
  { value: "origem", label: "origem da art. carótida interna" },
  { value: "proximalACI", label: "segmento proximal da art. carótida interna" },
  { value: "proximalACE", label: "segmento proximal da art. carótida externa" },
];
const LOC_LABEL = Object.fromEntries(
  LOC_OPTIONS.map((o) => [o.value, o.label.replace("art.", "artéria")])
);

const LOC_SIGNIF_OPTIONS = [
  { value: "bifurcacao", label: "bifurcação carotídea" },
  { value: "origem", label: "origem da art. carótida interna" },
  { value: "proximalACI", label: "segmento proximal da art. carótida interna" },
];
const LOC_SIGNIF_LABEL = Object.fromEntries(
  LOC_SIGNIF_OPTIONS.map((o) => [o.value, o.label.replace("art.", "artéria")])
);

const EXTENSA_DESTINO_OPTIONS = [
  { value: "bifurcacao", label: "bifurcação carotídea" },
  { value: "origem", label: "origem da art. carótida interna" },
  { value: "proximalACI", label: "segmento proximal da art. carótida interna" },
  { value: "medioProximalACI", label: "segmento médio-proximal da art. carótida interna" },
];
const EXTENSA_DESTINO_LABEL = Object.fromEntries(
  EXTENSA_DESTINO_OPTIONS.map((o) => [o.value, o.label.replace("art.", "artéria")])
);
const EXTENSA_DESTINO_ARTIGO = {
  bifurcacao: "a",
  origem: "a",
  proximalACI: "o",
  medioProximalACI: "o",
};

const CALCIFICACAO_OPTIONS = [
  { value: "nenhuma", label: "sem calcificação" },
  { value: "comAreas", label: "com áreas de calcificação" },
  { value: "calcificada", label: "calcificada" },
];

const SEG_ACC_OPTIONS = [
  { value: "proximal", label: "proximal" },
  { value: "medioProximal", label: "médio-proximal" },
  { value: "distal", label: "distal" },
];
const SEG_ACC_LABEL = Object.fromEntries(SEG_ACC_OPTIONS.map((o) => [o.value, o.label]));

const SEG_ACI_OPTIONS = [
  { value: "proximal", label: "proximal" },
  { value: "medioProximal", label: "médio-proximal" },
];
const SEG_ACI_LABEL = Object.fromEntries(SEG_ACI_OPTIONS.map((o) => [o.value, o.label]));

const ENDO_LOC_OPTIONS = [
  { value: "proximal", label: "segmento proximal do stent" },
  { value: "media", label: "segmento médio do stent" },
  { value: "distal", label: "segmento distal do stent" },
];
const ENDO_LOC_LABEL = Object.fromEntries(ENDO_LOC_OPTIONS.map((o) => [o.value, o.label]));

const VERT_STATUS_OPTIONS = [
  { value: "pervia", label: "pérvia (boa amplitude)" },
  { value: "fluxoDiminuido", label: "fluxo diminuído" },
  { value: "calibreFluxoDiminuido", label: "calibre e fluxo diminuídos" },
  { value: "dificilIdentificacao", label: "difícil identificação de fluxo" },
  { value: "perviaResistenciaAumentada", label: "pérvia, resistência aumentada" },
];
const VERT_STATUS_TEXT = {
  pervia: "Artéria vertebral pérvia (fluxo de boa amplitude no segmento cervical).",
  fluxoDiminuido: "Artéria vertebral apresentando fluxo diminuído no segmento cervical.",
  calibreFluxoDiminuido: "Artéria vertebral apresentando calibre e fluxo diminuídos no segmento cervical.",
  dificilIdentificacao: "Difícil identificação de fluxo na topografia da artéria vertebral.",
  perviaResistenciaAumentada:
    "Artéria vertebral pérvia (velocidade sistólica de boa amplitude no segmento cervical, porém com sinais de aumento da resistência vascular distal).",
};

function defaultEstenoseEntry() {
  return {
    id: uid(),
    grau: "discretaModerada", // discretaModerada | significativa | critica | obstrucao

    // discretaModerada
    percMin: "",
    percMax: "",
    locais: [],

    // placa (compartilhada entre discretaModerada, significativa e critica)
    plUniformidade: "uniformemente", // uniformemente | predominantemente
    plEcogenicidade: "hipoecoica", // hipoecoica | ecogenica
    plHomogeneidade: "homogenea", // homogenea | heterogenea
    plCalcificacao: "nenhuma", // nenhuma | comAreas | calcificada
    plSuperficie: "regular", // regular | irregular

    // significativa
    esRange: "60-70", // 60-70 | 70-80
    esLocal: "bifurcacao",
    esVelocidade: "",
    esIndice: "",
    aciDistalSemAlteracao: true,

    // critica
    criticaLocal: "bifurcacao",

    // obstrucao
    obstTipo: "semFluxo", // semFluxo | comImagens | sugestiva
    obstUniformidade: "uniformemente",
    obstEcogenicidade: "ecogenicas", // ecogenicas | hipoecoicas
  };
}

function defaultSideState() {
  return {
    incluir: true,
    carotideoModo: "cimt", // cimt | estenoses

    // Complexo médio-intimal
    cimtDistalACC: "",
    cimtBifurcacao: "",
    cimtEspessado: false,

    // Áreas de estenose (múltiplas, quando carotideoModo === "estenoses")
    estenoses: [],

    // Estenose extensa
    extExtensaAtiva: false,
    extExtensaSegmentoACC: "proximal",
    extExtensaPercACCMin: "",
    extExtensaPercACCMax: "",
    extExtensaDestino: "bifurcacao", // bifurcacao | origem | proximalACI | medioProximalACI
    extExtensaPercDestinoMin: "",
    extExtensaPercDestinoMax: "",
    extExtensaUniformidade: "uniformemente", // uniformemente | predominantemente
    extExtensaEcogenicidade: "hipoecoica", // hipoecoica | ecogenica
    extExtensaHomogeneidade: "homogenea", // homogenea | heterogenea
    extExtensaCalcificacao: "nenhuma", // nenhuma | comAreas | calcificada

    // Sombra acústica
    extSombraAtiva: false,
    extSombraModo: "estenose", // estenose | sombra
    extSombraRange: "",
    extSombraLocais: [],
    extSombraImpossibilita: false,
    extSombraSemAlteracaoDistal: true,

    // Tortuosidade ACI distal
    extTortuosidadeACIAtiva: false,
    extTortuosidadeACITipo: "Kinking", // Kinking | Looping

    // Endoprótese
    extEndoproteseAtiva: false,
    endoDiamACC: "",
    endoDiamBif: "",
    endoDiamOrigem: "",
    endoDiamACI: "",
    endoStatus: "semAlteracao", // semAlteracao | estenoseLeve | estenoseSignificativa | obstrucao
    endoEstPercMin: "",
    endoEstPercMax: "",
    endoEstLocal: "media", // proximal | media | distal
    endoEsLocal: "media", // proximal | media | distal
    endoEsVelocidade: "",
    endoEsIndice: "",
    endoObstTipo: "semFluxo", // semFluxo | comImagens | sugestiva
    endoObstUniformidade: "uniformemente",
    endoObstEcogenicidade: "ecogenicas", // ecogenicas | hipoecoicas
    endoAlteracaoACE: false,
    endoVelocidadeACE: "",

    // Vértebro-basilar
    vertStatus: "pervia",
    vertTortuosidadeAtiva: false,
    vertTortuosidadeTipo: "Kinking",
    vertEstenoseOrigemAtiva: false,
    vertEstenoseOrigemVelocidade: "",
    vertEstenoseOrigemMorfologia: "boaAmplitude", // boaAmplitude | fluxoDiminuido
    vertDominanciaAtiva: false,
    vertAumentoCompensatorioAtiva: false,
    vertRouboAtivo: false,
    vertRouboTipo: "inicial", // inicial | latente | estabelecido
    vertOutrosAtiva: false,
    vertOutrosTexto: "",

    // Velocidades de fluxo (cm/s)
    velACCsist: "",
    velACCdiast: "",
    velACEsist: "",
    velACEdiast: "",
    velACIsist: "",
    velACIdiast: "",
    velVertSist: "",
    velVertdiast: "",
  };
}

/* ---------- Construtores de trecho ---------- */

function placaTextoGeneric(m, prefix, incluirSuperficie = true) {
  const calc =
    m[`${prefix}Calcificacao`] === "comAreas"
      ? ", com áreas de calcificação"
      : m[`${prefix}Calcificacao`] === "calcificada"
      ? ", calcificada"
      : ", sem calcificação";
  const uni = m[`${prefix}Uniformidade`] === "predominantemente" ? "predominantemente" : "uniformemente";
  const eco = m[`${prefix}Ecogenicidade`] === "ecogenica" ? "ecogênica" : "hipoecoica";
  const homo = m[`${prefix}Homogeneidade`] === "heterogenea" ? "heterogênea" : "homogênea";
  if (!incluirSuperficie) return `placa de ateroma ${uni} ${eco}, ${homo}${calc}`;
  const sup = m[`${prefix}Superficie`] === "irregular" ? "irregular" : "regular";
  return `placa de ateroma ${uni} ${eco}, ${homo}${calc}, de superfície ${sup}`;
}

function placaTextoExtensa(m) {
  return placaTextoGeneric(m, "extExtensa", false);
}

// Ordem anatômica: Carótida Comum (proximal > médio-proximal > distal) > Bifurcação > Carótida Interna (origem > proximal > médio-proximal) > Carótida Externa
const LOC_ANATOMIC_ORDER = {
  proximalACC: 1,
  medioProximalACC: 2,
  distalACC: 3,
  bifurcacao: 4,
  origem: 5,
  proximalACI: 6,
  medioProximalACI: 7,
  proximalACE: 8,
};

function estenoseEntrySortKey(e) {
  switch (e.grau) {
    case "discretaModerada": {
      const locs = e.locais || [];
      if (locs.length === 0) return 99;
      return Math.min(...locs.map((l) => LOC_ANATOMIC_ORDER[l] ?? 99));
    }
    case "significativa":
      return LOC_ANATOMIC_ORDER[e.esLocal] ?? 99;
    case "critica":
      return LOC_ANATOMIC_ORDER[e.criticaLocal] ?? 99;
    case "obstrucao":
    default:
      return 6.5; // obstrução da artéria carótida interna: entre segmento proximal e médio-proximal da ACI
  }
}

function sortEstenoseEntries(entries) {
  return [...(entries || [])].sort((a, b) => estenoseEntrySortKey(a) - estenoseEntrySortKey(b));
}

function buildEstenoseEntryLinhas(e) {
  switch (e.grau) {
    case "significativa": {
      const local = LOC_SIGNIF_LABEL[e.esLocal];
      const lines = [
        `Estenose hemodinamicamente significativa (${e.esRange}%) em ${local} causada por ${placaTextoGeneric(e, "pl", true)}, apresentando aumento focal de velocidades (${e.esVelocidade || "__"} cm/s \u2013 Índice: ${e.esIndice || "__"}) e turbilhonamento do fluxo.`,
      ];
      if (e.aciDistalSemAlteracao) {
        lines.push("Artéria carótida interna distal sem alteração significativa do fluxo.");
      }
      return lines;
    }
    case "critica": {
      const local = LOC_SIGNIF_LABEL[e.criticaLocal];
      return [
        `Estenose crítica (>80%) em ${local} causada por ${placaTextoGeneric(e, "pl", true)}, com importante repercussão hemodinâmica.`,
      ];
    }
    case "obstrucao": {
      if (e.obstTipo === "sugestiva") {
        return ["Sinais sugestivos de obstrução na artéria carótida interna (difícil identificação de fluxo na artéria carótida interna)."];
      }
      if (e.obstTipo === "semFluxo") {
        return ["Obstrução na artéria carótida interna (artéria carótida interna sem fluxo)."];
      }
      const uni = e.obstUniformidade === "predominantemente" ? "predominantemente" : "uniformemente";
      const eco = e.obstEcogenicidade === "hipoecoicas" ? "hipoecoicas" : "ecogênicas";
      return [`Obstrução na artéria carótida interna (artéria carótida interna apresentando imagens ${uni} ${eco} no lúmen, sem fluxo).`];
    }
    case "discretaModerada":
    default: {
      const locs = (e.locais || []).map((l) => LOC_LABEL[l]);
      const localTxt = locs.length > 0 ? listaFluida(locs) : "__";
      const rangeTxt = `${e.percMin || "__"}-${e.percMax || "__"}`;
      return [`Estenose (${rangeTxt}%) em ${localTxt} (${placaTextoGeneric(e, "pl", true)}, sem alteração significativa do fluxo).`];
    }
  }
}

function buildExtensaLinha(m) {
  const segACC = SEG_ACC_LABEL[m.extExtensaSegmentoACC];
  const destinoTxt = `${EXTENSA_DESTINO_ARTIGO[m.extExtensaDestino]} ${EXTENSA_DESTINO_LABEL[m.extExtensaDestino]}`;
  const rangeACC = `${m.extExtensaPercACCMin || "__"}-${m.extExtensaPercACCMax || "__"}`;
  const rangeDestino = `${m.extExtensaPercDestinoMin || "__"}-${m.extExtensaPercDestinoMax || "__"}`;
  return `Estenose no segmento ${segACC} da artéria carótida comum (${rangeACC}%), estendendo-se para ${destinoTxt} (${rangeDestino}%), causada por ${placaTextoExtensa(m)}.`;
}

function buildSombraLinha(m) {
  const ordered = LOC_SIGNIF_OPTIONS.map((o) => o.value).filter((v) => (m.extSombraLocais || []).includes(v));
  const locs = ordered.map((l) => LOC_SIGNIF_LABEL[l]);
  const localLabel = locs.length > 0 ? listaFluida(locs) : "__";
  const dificultaTxt = m.extSombraImpossibilita ? "dificultando / impossibilitando" : "dificultando";
  const distalTxt = m.extSombraSemAlteracaoDistal
    ? "Não se observa alteração significativa do fluxo no segmento imediatamente distal à placa."
    : "Observa-se aumento focal de velocidades e turbilhonamento de fluxo no segmento imediatamente distal à placa, sugestivo de estenose hemodinamicamente significativa.";

  if (m.extSombraModo === "sombra") {
    return `Sombra acústica em ${localLabel} (placa de ateroma calcificada, ${dificultaTxt} a quantificação do grau de estenose e o estudo anatômico e hemodinâmico local). ${distalTxt}`;
  }
  const rangeTxt = m.extSombraRange ? `${m.extSombraRange}%` : "__";
  return `Estenose (${rangeTxt}) em ${localLabel} (placa de ateroma calcificada, causando sombra acústica posterior, ${dificultaTxt} o estudo anatômico e hemodinâmico local). ${distalTxt}`;
}

function buildEndoproteseLinha1(m) {
  return m.endoStatus === "semAlteracao"
    ? "Endoprótese arterial (Stent) pérvia no território carotídeo, sem alterações significativas."
    : "Endoprótese arterial (Stent) no território carotídeo.";
}

function buildEndoproteseStatusTail(m) {
  switch (m.endoStatus) {
    case "estenoseLeve": {
      const loc = ENDO_LOC_LABEL[m.endoEstLocal];
      return `apresentando estenose intra-stent (${m.endoEstPercMin || "__"}-${m.endoEstPercMax || "__"}%) por hiperplasia neointimal no ${loc}`;
    }
    case "estenoseSignificativa": {
      const loc = ENDO_LOC_LABEL[m.endoEsLocal];
      return `apresentando estenose intra-stent hemodinamicamente significativa por hiperplasia neointimal no ${loc}, com aumento focal de velocidades (${m.endoEsVelocidade || "__"} cm/s \u2013 Índice: ${m.endoEsIndice || "__"}) e turbilhonamento do fluxo`;
    }
    case "obstrucao": {
      if (m.endoObstTipo === "sugestiva") {
        return "apresentando sinais sugestivos de obstrução (difícil identificação de fluxo no interior do stent)";
      }
      if (m.endoObstTipo === "semFluxo") {
        return "apresentando obstrução, sem fluxo em seu interior";
      }
      const uni = m.endoObstUniformidade === "predominantemente" ? "predominantemente" : "uniformemente";
      const eco = m.endoObstEcogenicidade === "hipoecoicas" ? "hipoecoicas" : "ecogênicas";
      return `apresentando obstrução, com imagens ${uni} ${eco} em seu interior, sem fluxo`;
    }
    case "semAlteracao":
    default:
      return "sem alteração do fluxo";
  }
}

function buildEndoproteseLinhas(m) {
  const lines = [
    buildEndoproteseLinha1(m),
    `A endoprótese estende-se do segmento distal da artéria carótida comum (${m.endoDiamACC || "__"} mm de diâmetro transversal), para a bifurcação carotídea (${m.endoDiamBif || "__"} mm de diâmetro), origem (${m.endoDiamOrigem || "__"} mm de diâmetro) e segmento médio-proximal da artéria carótida interna (${m.endoDiamACI || "__"} mm), ${buildEndoproteseStatusTail(m)}.`,
  ];
  if (m.endoAlteracaoACE) {
    lines.push(
      `Alteração hemodinâmica na origem da artéria carótida externa, a qual apresenta aumento focal de velocidades (${m.endoVelocidadeACE || "__"} cm/s) e turbilhonamento do fluxo causados pela presença da endoprótese arterial no território carotídeo.`
    );
  }
  return lines;
}

function buildTerritorioCarotideo(m) {
  const lines = ["[Território Carotídeo]"];

  if (m.carotideoModo === "estenoses") {
    const entries = m.estenoses || [];
    const hasObstrucao = entries.some((e) => e.grau === "obstrucao");
    const hasSignificativaOuCritica = entries.some((e) => e.grau === "significativa" || e.grau === "critica");

    if (hasObstrucao) {
      lines.push("Artérias carótidas comum, interna e externa apresentando calibres normais.");
    } else if (hasSignificativaOuCritica) {
      lines.push("Artérias carótidas comum, interna e externa apresentando calibres normais, com fluxo.");
    } else {
      lines.push(
        "Artérias carótidas comum, interna e externa apresentando calibres normais, sem alteração significativa do fluxo e velocidades dentro da normalidade."
      );
    }

    if (!hasObstrucao && entries.length > 0) {
      const palavra = entries.length === 1 ? "estenose" : "estenoses";
      lines.push(`Território carotídeo pérvio, apresentando ${palavra}:`);
    }

    sortEstenoseEntries(entries).forEach((e) => {
      lines.push(...buildEstenoseEntryLinhas(e));
    });
    if (m.extExtensaAtiva) lines.push(buildExtensaLinha(m));
    if (m.extSombraAtiva) lines.push(buildSombraLinha(m));
    if (m.extEndoproteseAtiva) lines.push(...buildEndoproteseLinhas(m));
  } else {
    lines.push(
      "Artérias carótidas comum, interna e externa apresentando calibres normais, sem placas de ateroma significativas, sem alteração significativa do fluxo e velocidades de fluxo dentro da normalidade."
    );
    lines.push("Medida do Complexo Médio-Intimal em mm:");
    lines.push({ type: "cimtTable", distalACC: m.cimtDistalACC, bifurcacao: m.cimtBifurcacao });
    lines.push(
      m.cimtEspessado
        ? "Território carotídeo pérvio, apresentando espessamento médio-intimal no segmento distal da artéria carótida comum e bifurcação carotídea."
        : "Território carotídeo pérvio, sem espessamento médio-intimal."
    );
  }

  if (m.extTortuosidadeACIAtiva) {
    lines.push(`Artéria carótida interna distal tortuosa (${m.extTortuosidadeACITipo}), sem alteração significativa do fluxo.`);
  }

  return lines;
}

function buildTerritorioVertebral(m) {
  const lines = ["[Território Vértebro-Basilar]", VERT_STATUS_TEXT[m.vertStatus]];

  if (m.vertTortuosidadeAtiva) {
    lines.push(`Artéria vertebral proximal tortuosa (${m.vertTortuosidadeTipo}), sem alteração significativa do fluxo.`);
  }
  if (m.vertEstenoseOrigemAtiva) {
    const morf = m.vertEstenoseOrigemMorfologia === "fluxoDiminuido" ? "com fluxo diminuído" : "de boa amplitude";
    lines.push(
      `Estenose hemodinamicamente significativa (${m.vertEstenoseOrigemVelocidade || "__"} cm/s) na origem da artéria vertebral. Artéria vertebral pérvia no segmento cervical (curvas de morfologia ${morf}).`
    );
  }
  if (m.vertDominanciaAtiva) {
    lines.push(
      "Dominância fisiológica da artéria vertebral (artéria vertebral com calibre e velocidade de fluxo aumentados em relação à vertebral contra-lateral)."
    );
  }
  if (m.vertAumentoCompensatorioAtiva) {
    lines.push("Aumento compensatório do fluxo na artéria vertebral (artéria vertebral com velocidade de fluxo aumentada).");
  }
  if (m.vertRouboAtivo) {
    if (m.vertRouboTipo === "latente") {
      lines.push("Roubo latente de fluxo na artéria vertebral (artéria vertebral apresentando fluxo bidirecional).");
    } else if (m.vertRouboTipo === "estabelecido") {
      lines.push("Roubo de fluxo na artéria vertebral (artéria vertebral apresentando fluxo invertido).");
    } else {
      lines.push(
        "Sinais iniciais de roubo de fluxo na artéria vertebral (artéria vertebral apresentando desaceleração do pico sistólico)."
      );
    }
  }

  return lines;
}

function buildSideBlock(side, m) {
  return {
    side,
    header: `REGIÃO CERVICAL ${SIDE_LABEL[side]}`,
    carotideo: buildTerritorioCarotideo(m),
    vertebral: buildTerritorioVertebral(m),
  };
}

function getActiveSides(state) {
  const sides = [];
  if (state.D.incluir) sides.push("D");
  if (state.E.incluir) sides.push("E");
  return sides;
}
function buildFullReportBlocks(state) {
  return getActiveSides(state).map((s) => buildSideBlock(s, state[s]));
}
function anyCimt(state) {
  return getActiveSides(state).some((s) => state[s].carotideoModo === "cimt");
}

function formatObsLine(texto) {
  const t = (texto || "").trim();
  return t.endsWith(".") ? `* Obs.: ${t}` : `* Obs.: ${t}.`;
}

function getExtraObsLines(state) {
  const lines = [];
  ["D", "E"].forEach((s) => {
    const m = state[s];
    if (m && m.vertOutrosAtiva && m.vertOutrosTexto && m.vertOutrosTexto.trim()) {
      lines.push(formatObsLine(m.vertOutrosTexto));
    }
  });
  return lines;
}

function velCell(m, prefixSist, prefixDiast) {
  const s = m[prefixSist];
  const d = m[prefixDiast];
  if (!s && !d) return "";
  return `${s || "__"} / ${d || "__"}`;
}

/* ============================================================
   COMPONENTES DE UI BÁSICOS (mesma linguagem visual do Venoso Profundo)
   ============================================================ */

const COLORS = {
  bg: "#0B1220",
  panel: "#121B2E",
  panelAlt: "#16213A",
  border: "#22304A",
  borderLight: "#2C3D5C",
  text: "#E7ECF5",
  textMuted: "#8FA0BD",
  accent: "#3DD6C4",
  accentDim: "#1F4A45",
  warn: "#F2A65A",
  danger: "#E2654F",
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
          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, letterSpacing: 0.2 }}>{title}</span>
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
        {description && <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 1 }}>{description}</div>}
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

function TextInput({ value, onChange, placeholder, width = "100%" }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || ""}
      style={{
        width,
        padding: "7px 9px",
        borderRadius: 7,
        border: `1px solid ${COLORS.borderLight}`,
        background: COLORS.panelAlt,
        color: COLORS.text,
        fontSize: 13,
        outline: "none",
        boxSizing: "border-box",
      }}
    />
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

function PlacaControls({ data, set, prefix = "est", superficie = true }) {
  const k = (suffix) => `${prefix}${suffix}`;
  return (
    <>
      <Row>
        <Label>Distribuição</Label>
        <PillGroup
          options={[
            { value: "uniformemente", label: "uniformemente" },
            { value: "predominantemente", label: "predominantemente" },
          ]}
          value={data[k("Uniformidade")]}
          onChange={set(k("Uniformidade"))}
        />
      </Row>
      <Row>
        <Label>Ecogenicidade</Label>
        <PillGroup
          options={[
            { value: "hipoecoica", label: "hipoecoica" },
            { value: "ecogenica", label: "ecogênica" },
          ]}
          value={data[k("Ecogenicidade")]}
          onChange={set(k("Ecogenicidade"))}
        />
      </Row>
      <Row>
        <Label>Homogeneidade</Label>
        <PillGroup
          options={[
            { value: "homogenea", label: "homogênea" },
            { value: "heterogenea", label: "heterogênea" },
          ]}
          value={data[k("Homogeneidade")]}
          onChange={set(k("Homogeneidade"))}
        />
      </Row>
      <Row>
        <Label>Calcificação</Label>
        <PillGroup options={CALCIFICACAO_OPTIONS} value={data[k("Calcificacao")]} onChange={set(k("Calcificacao"))} />
      </Row>
      {superficie && (
        <Row>
          <Label>Superfície</Label>
          <PillGroup
            options={[
              { value: "regular", label: "regular" },
              { value: "irregular", label: "irregular" },
            ]}
            value={data[k("Superficie")]}
            onChange={set(k("Superficie"))}
          />
        </Row>
      )}
    </>
  );
}

function EstenoseEntryCard({ entry, index, onChange, onRemove }) {
  const setE = (key) => (val) => onChange((prev) => ({ ...prev, [key]: val }));
  return (
    <div
      style={{
        border: `1px solid ${COLORS.borderLight}`,
        borderRadius: 9,
        padding: 12,
        marginBottom: 10,
        background: COLORS.panelAlt,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.accent }}>Estenose {index + 1}</span>
        <button
          onClick={onRemove}
          style={{
            background: "transparent",
            border: "none",
            color: COLORS.danger,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            padding: "2px 4px",
          }}
        >
          Remover
        </button>
      </div>

      <Row>
        <PillGroup options={ESTENOSE_GRAU_OPTIONS} value={entry.grau} onChange={setE("grau")} />
      </Row>

      {entry.grau === "discretaModerada" && (
        <div style={{ paddingLeft: 4 }}>
          <Row>
            <Label>Grau (%)</Label>
            <NumInput value={entry.percMin} onChange={setE("percMin")} placeholder="Mín" width={60} />
            <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{"\u2013"}</span>
            <NumInput value={entry.percMax} onChange={setE("percMax")} placeholder="Máx" suffix="%" width={60} />
          </Row>
          <Row>
            <Label>Localização</Label>
            <PillGroup options={LOC_OPTIONS} value={entry.locais} onChange={setE("locais")} multi />
          </Row>
          <PlacaControls data={entry} set={setE} prefix="pl" superficie />
        </div>
      )}

      {entry.grau === "significativa" && (
        <div style={{ paddingLeft: 4 }}>
          <Row>
            <Label>Faixa hemodinâmica</Label>
            <PillGroup
              options={[
                { value: "60-70", label: "60\u201370%" },
                { value: "70-80", label: "70\u201380%" },
              ]}
              value={entry.esRange}
              onChange={setE("esRange")}
            />
          </Row>
          <Row>
            <Label>Localização</Label>
            <PillGroup options={LOC_SIGNIF_OPTIONS} value={entry.esLocal} onChange={setE("esLocal")} />
          </Row>
          <Row>
            <Label>Velocidade / Índice</Label>
            <NumInput value={entry.esVelocidade} onChange={setE("esVelocidade")} suffix="cm/s" />
            <NumInput value={entry.esIndice} onChange={setE("esIndice")} width={64} />
          </Row>
          <PlacaControls data={entry} set={setE} prefix="pl" superficie />
          <div style={{ marginTop: 8 }}>
            <Toggle
              checked={entry.aciDistalSemAlteracao}
              onChange={setE("aciDistalSemAlteracao")}
              label="Incluir linha: ACI distal sem alteração do fluxo"
            />
          </div>
        </div>
      )}

      {entry.grau === "critica" && (
        <div style={{ paddingLeft: 4 }}>
          <Row>
            <Label>Localização</Label>
            <PillGroup options={LOC_SIGNIF_OPTIONS} value={entry.criticaLocal} onChange={setE("criticaLocal")} />
          </Row>
          <PlacaControls data={entry} set={setE} prefix="pl" superficie />
        </div>
      )}

      {entry.grau === "obstrucao" && (
        <div style={{ paddingLeft: 4 }}>
          <Row>
            <PillGroup
              options={[
                { value: "semFluxo", label: "sem fluxo" },
                { value: "comImagens", label: "imagens no lúmen" },
                { value: "sugestiva", label: "sinais sugestivos" },
              ]}
              value={entry.obstTipo}
              onChange={setE("obstTipo")}
            />
          </Row>
          {entry.obstTipo === "comImagens" && (
            <>
              <Row>
                <Label>Distribuição</Label>
                <PillGroup
                  options={[
                    { value: "uniformemente", label: "uniformemente" },
                    { value: "predominantemente", label: "predominantemente" },
                  ]}
                  value={entry.obstUniformidade}
                  onChange={setE("obstUniformidade")}
                />
              </Row>
              <Row>
                <Label>Ecogenicidade</Label>
                <PillGroup
                  options={[
                    { value: "ecogenicas", label: "ecogênicas" },
                    { value: "hipoecoicas", label: "hipoecoicas" },
                  ]}
                  value={entry.obstEcogenicidade}
                  onChange={setE("obstEcogenicidade")}
                />
              </Row>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SideForm({ data, update, obsTireoide, setObsTireoide, obsBatimentos, setObsBatimentos }) {
  const set = (key) => (val) => update((prev) => ({ ...prev, [key]: val }));

  return (
    <div>
      <Section title="Velocidades de fluxo (Doppler)" subtitle="Pico sistólico / diastólico final, cm/s" defaultOpen>
        <Row>
          <Label>Carótida comum</Label>
          <NumInput value={data.velACCsist} onChange={set("velACCsist")} placeholder="Sist." width={70} />
          <NumInput value={data.velACCdiast} onChange={set("velACCdiast")} placeholder="Diast." width={70} />
        </Row>
        <Row>
          <Label>Carótida externa</Label>
          <NumInput value={data.velACEsist} onChange={set("velACEsist")} placeholder="Sist." width={70} />
          <NumInput value={data.velACEdiast} onChange={set("velACEdiast")} placeholder="Diast." width={70} />
        </Row>
        <Row>
          <Label>Carótida interna</Label>
          <NumInput value={data.velACIsist} onChange={set("velACIsist")} placeholder="Sist." width={70} />
          <NumInput value={data.velACIdiast} onChange={set("velACIdiast")} placeholder="Diast." width={70} />
        </Row>
        <Row>
          <Label>Vertebral</Label>
          <NumInput value={data.velVertSist} onChange={set("velVertSist")} placeholder="Sist." width={70} />
          <NumInput value={data.velVertdiast} onChange={set("velVertdiast")} placeholder="Diast." width={70} />
        </Row>
      </Section>

      <Section title="Território carotídeo" defaultOpen>
        <Row>
          <PillGroup options={CAROTIDEO_MODO_OPTIONS} value={data.carotideoModo} onChange={set("carotideoModo")} />
        </Row>

        {data.carotideoModo === "cimt" && (
          <div style={{ marginTop: 10, paddingLeft: 4 }}>
            <Row>
              <Label>Segmento distal da ACC</Label>
              <NumInput value={data.cimtDistalACC} onChange={set("cimtDistalACC")} suffix="mm" />
              <Label>Bifurcação</Label>
              <NumInput value={data.cimtBifurcacao} onChange={set("cimtBifurcacao")} suffix="mm" />
            </Row>
            <div style={{ marginTop: 6 }}>
              <Toggle
                checked={data.cimtEspessado}
                onChange={set("cimtEspessado")}
                label="Espessamento médio-intimal"
                description="Segmento distal da ACC e bifurcação carotídea"
              />
            </div>
          </div>
        )}

        {data.carotideoModo === "estenoses" && (
          <div style={{ marginTop: 10 }}>
            {(data.estenoses || []).map((entry, idx) => (
              <EstenoseEntryCard
                key={entry.id}
                entry={entry}
                index={idx}
                onChange={(updater) =>
                  update((prev) => ({
                    ...prev,
                    estenoses: prev.estenoses.map((en) => (en.id === entry.id ? updater(en) : en)),
                  }))
                }
                onRemove={() =>
                  update((prev) => ({
                    ...prev,
                    estenoses: prev.estenoses.filter((en) => en.id !== entry.id),
                  }))
                }
              />
            ))}
            <button
              onClick={() =>
                update((prev) => ({
                  ...prev,
                  estenoses: [...(prev.estenoses || []), defaultEstenoseEntry()],
                }))
              }
              style={{
                width: "100%",
                padding: "9px 0",
                borderRadius: 8,
                border: `1.5px dashed ${COLORS.borderLight}`,
                background: "transparent",
                color: COLORS.accent,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: 4,
              }}
            >
              + Adicionar estenose
            </button>

            <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "14px 0" }} />

            <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>Estenose extensa</div>
            <Toggle checked={data.extExtensaAtiva} onChange={set("extExtensaAtiva")} label="Estenose com extensão entre segmentos" />
            {data.extExtensaAtiva && (
              <div style={{ marginTop: 4, paddingLeft: 4 }}>
                <Row>
                  <Label>Segmento ACC</Label>
                  <PillGroup options={SEG_ACC_OPTIONS} value={data.extExtensaSegmentoACC} onChange={set("extExtensaSegmentoACC")} />
                  <NumInput value={data.extExtensaPercACCMin} onChange={set("extExtensaPercACCMin")} placeholder="Mín" width={56} />
                  <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{"\u2013"}</span>
                  <NumInput value={data.extExtensaPercACCMax} onChange={set("extExtensaPercACCMax")} placeholder="Máx" suffix="%" width={56} />
                </Row>
                <Row>
                  <Label>Estende-se para</Label>
                  <PillGroup
                    options={[
                      { value: "bifurcacao", label: "bifurcação" },
                      { value: "origem", label: "origem" },
                      { value: "proximalACI", label: "segmento proximal" },
                      { value: "medioProximalACI", label: "segmento médio-proximal" },
                    ]}
                    value={data.extExtensaDestino}
                    onChange={set("extExtensaDestino")}
                  />
                </Row>
                <Row>
                  <Label>Grau no destino</Label>
                  <NumInput value={data.extExtensaPercDestinoMin} onChange={set("extExtensaPercDestinoMin")} placeholder="Mín" width={56} />
                  <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{"\u2013"}</span>
                  <NumInput value={data.extExtensaPercDestinoMax} onChange={set("extExtensaPercDestinoMax")} placeholder="Máx" suffix="%" width={56} />
                </Row>
                <PlacaControls data={data} set={set} prefix="extExtensa" superficie={false} />
              </div>
            )}

            <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "12px 0" }} />

            <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>Sombra acústica</div>
            <Toggle checked={data.extSombraAtiva} onChange={set("extSombraAtiva")} label="Placa calcificada com sombra acústica" />
            {data.extSombraAtiva && (
              <div style={{ marginTop: 4, paddingLeft: 4 }}>
                <Row>
                  <PillGroup
                    options={[
                      { value: "estenose", label: "com estimativa de estenose (%)" },
                      { value: "sombra", label: "sombra pura (sem % estimado)" },
                    ]}
                    value={data.extSombraModo}
                    onChange={set("extSombraModo")}
                  />
                </Row>
                {data.extSombraModo === "estenose" && (
                  <Row>
                    <Label>Faixa (%)</Label>
                    <NumInput value={data.extSombraRange} onChange={set("extSombraRange")} suffix="%" width={90} />
                  </Row>
                )}
                <Row>
                  <Label>Localização</Label>
                  <PillGroup options={LOC_SIGNIF_OPTIONS} value={data.extSombraLocais} onChange={set("extSombraLocais")} multi />
                </Row>
                <Row>
                  <PillGroup
                    options={[
                      { value: "dificulta", label: "dificulta o estudo" },
                      { value: "impossibilita", label: "impossibilita o estudo" },
                    ]}
                    value={data.extSombraImpossibilita ? "impossibilita" : "dificulta"}
                    onChange={(v) => set("extSombraImpossibilita")(v === "impossibilita")}
                  />
                </Row>
                <Row>
                  <PillGroup
                    options={[
                      { value: "semAlteracao", label: "sem alteração distal" },
                      { value: "comAlteracao", label: "sugestivo de estenose distal" },
                    ]}
                    value={data.extSombraSemAlteracaoDistal ? "semAlteracao" : "comAlteracao"}
                    onChange={(v) => set("extSombraSemAlteracaoDistal")(v === "semAlteracao")}
                  />
                </Row>
              </div>
            )}

            <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "12px 0" }} />

            <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>Endoprótese (Stent)</div>
            <Toggle checked={data.extEndoproteseAtiva} onChange={set("extEndoproteseAtiva")} label="Endoprótese arterial no território carotídeo" />
            {data.extEndoproteseAtiva && (
              <div style={{ marginTop: 4, paddingLeft: 4 }}>
                <Row>
                  <Label>Diâmetros (mm)</Label>
                  <NumInput value={data.endoDiamACC} onChange={set("endoDiamACC")} placeholder="ACC" width={60} />
                  <NumInput value={data.endoDiamBif} onChange={set("endoDiamBif")} placeholder="Bif." width={60} />
                  <NumInput value={data.endoDiamOrigem} onChange={set("endoDiamOrigem")} placeholder="Origem" width={60} />
                  <NumInput value={data.endoDiamACI} onChange={set("endoDiamACI")} placeholder="ACI" width={60} />
                </Row>

                <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "10px 0" }} />

                <Row>
                  <Label>Fluxo intra-stent</Label>
                  <PillGroup
                    options={[
                      { value: "semAlteracao", label: "sem alteração de fluxo" },
                      { value: "estenoseLeve", label: "estenose discreta a moderada" },
                      { value: "estenoseSignificativa", label: "hemodinamicamente significativa" },
                      { value: "obstrucao", label: "obstrução" },
                    ]}
                    value={data.endoStatus}
                    onChange={set("endoStatus")}
                  />
                </Row>

                {data.endoStatus === "estenoseLeve" && (
                  <div style={{ paddingLeft: 4 }}>
                    <Row>
                      <Label>Grau (%)</Label>
                      <NumInput value={data.endoEstPercMin} onChange={set("endoEstPercMin")} placeholder="Mín" width={60} />
                      <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{"\u2013"}</span>
                      <NumInput value={data.endoEstPercMax} onChange={set("endoEstPercMax")} placeholder="Máx" suffix="%" width={60} />
                    </Row>
                    <Row>
                      <Label>Localização</Label>
                      <PillGroup options={ENDO_LOC_OPTIONS} value={data.endoEstLocal} onChange={set("endoEstLocal")} />
                    </Row>
                  </div>
                )}

                {data.endoStatus === "estenoseSignificativa" && (
                  <div style={{ paddingLeft: 4 }}>
                    <Row>
                      <Label>Localização</Label>
                      <PillGroup options={ENDO_LOC_OPTIONS} value={data.endoEsLocal} onChange={set("endoEsLocal")} />
                    </Row>
                    <Row>
                      <Label>Velocidade / Índice</Label>
                      <NumInput value={data.endoEsVelocidade} onChange={set("endoEsVelocidade")} suffix="cm/s" />
                      <NumInput value={data.endoEsIndice} onChange={set("endoEsIndice")} width={64} />
                    </Row>
                  </div>
                )}

                {data.endoStatus === "obstrucao" && (
                  <div style={{ paddingLeft: 4 }}>
                    <Row>
                      <PillGroup
                        options={[
                          { value: "semFluxo", label: "sem fluxo" },
                          { value: "comImagens", label: "imagens no interior" },
                          { value: "sugestiva", label: "sinais sugestivos" },
                        ]}
                        value={data.endoObstTipo}
                        onChange={set("endoObstTipo")}
                      />
                    </Row>
                    {data.endoObstTipo === "comImagens" && (
                      <>
                        <Row>
                          <Label>Distribuição</Label>
                          <PillGroup
                            options={[
                              { value: "uniformemente", label: "uniformemente" },
                              { value: "predominantemente", label: "predominantemente" },
                            ]}
                            value={data.endoObstUniformidade}
                            onChange={set("endoObstUniformidade")}
                          />
                        </Row>
                        <Row>
                          <Label>Ecogenicidade</Label>
                          <PillGroup
                            options={[
                              { value: "ecogenicas", label: "ecogênicas" },
                              { value: "hipoecoicas", label: "hipoecoicas" },
                            ]}
                            value={data.endoObstEcogenicidade}
                            onChange={set("endoObstEcogenicidade")}
                          />
                        </Row>
                      </>
                    )}
                  </div>
                )}

                <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "10px 0" }} />

                <div style={{ marginTop: 6 }}>
                  <Toggle
                    checked={data.endoAlteracaoACE}
                    onChange={set("endoAlteracaoACE")}
                    label="Alteração hemodinâmica na origem da ACE"
                  />
                </div>
                {data.endoAlteracaoACE && (
                  <Row>
                    <NumInput value={data.endoVelocidadeACE} onChange={set("endoVelocidadeACE")} suffix="cm/s" />
                  </Row>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "14px 0" }} />

        <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>Tortuosidade</div>
        <Toggle
          checked={data.extTortuosidadeACIAtiva}
          onChange={set("extTortuosidadeACIAtiva")}
          label="Artéria carótida interna distal tortuosa"
        />
        {data.extTortuosidadeACIAtiva && (
          <Row>
            <PillGroup
              options={[
                { value: "Kinking", label: "Kinking" },
                { value: "Looping", label: "Looping" },
              ]}
              value={data.extTortuosidadeACITipo}
              onChange={set("extTortuosidadeACITipo")}
            />
          </Row>
        )}
      </Section>

      <Section title="Território vértebro-basilar" defaultOpen={false}>
        <Row>
          <PillGroup options={VERT_STATUS_OPTIONS} value={data.vertStatus} onChange={set("vertStatus")} />
        </Row>

        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "12px 0" }} />

        <Toggle
          checked={data.vertTortuosidadeAtiva}
          onChange={set("vertTortuosidadeAtiva")}
          label="Artéria vertebral proximal tortuosa"
        />
        {data.vertTortuosidadeAtiva && (
          <Row>
            <PillGroup
              options={[
                { value: "Kinking", label: "Kinking" },
                { value: "Looping", label: "Looping" },
              ]}
              value={data.vertTortuosidadeTipo}
              onChange={set("vertTortuosidadeTipo")}
            />
          </Row>
        )}

        <Toggle
          checked={data.vertEstenoseOrigemAtiva}
          onChange={set("vertEstenoseOrigemAtiva")}
          label="Estenose hemodinamicamente significativa na origem"
        />
        {data.vertEstenoseOrigemAtiva && (
          <div style={{ paddingLeft: 4 }}>
            <Row>
              <NumInput value={data.vertEstenoseOrigemVelocidade} onChange={set("vertEstenoseOrigemVelocidade")} suffix="cm/s" />
              <PillGroup
                options={[
                  { value: "boaAmplitude", label: "boa amplitude" },
                  { value: "fluxoDiminuido", label: "fluxo diminuído" },
                ]}
                value={data.vertEstenoseOrigemMorfologia}
                onChange={set("vertEstenoseOrigemMorfologia")}
              />
            </Row>
          </div>
        )}

        <Toggle checked={data.vertDominanciaAtiva} onChange={set("vertDominanciaAtiva")} label="Dominância fisiológica" />
        <Toggle
          checked={data.vertAumentoCompensatorioAtiva}
          onChange={set("vertAumentoCompensatorioAtiva")}
          label="Aumento compensatório de fluxo"
        />

        <Toggle checked={data.vertRouboAtivo} onChange={set("vertRouboAtivo")} label="Roubo de fluxo" />
        {data.vertRouboAtivo && (
          <div style={{ paddingLeft: 4 }}>
            <Row>
              <PillGroup
                options={[
                  { value: "inicial", label: "Sinais iniciais" },
                  { value: "latente", label: "Roubo latente" },
                  { value: "estabelecido", label: "Roubo estabelecido" },
                ]}
                value={data.vertRouboTipo}
                onChange={set("vertRouboTipo")}
              />
            </Row>
          </div>
        )}
      </Section>

      <Section title="Observações gerais" defaultOpen={false}>
        <Toggle
          checked={obsTireoide}
          onChange={setObsTireoide}
          label="Alterações na morfologia da glândula tireoide"
        />
        <Toggle
          checked={obsBatimentos}
          onChange={setObsBatimentos}
          label="Batimentos cardíacos irregulares durante o exame"
        />

        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "12px 0" }} />

        <Toggle
          checked={data.vertOutrosAtiva}
          onChange={set("vertOutrosAtiva")}
          label="Outros achados"
          description="Ex.: achado do território vértebro-basilar não coberto acima"
        />
        {data.vertOutrosAtiva && (
          <div style={{ paddingLeft: 4, marginTop: 4 }}>
            <TextInput
              value={data.vertOutrosTexto}
              onChange={set("vertOutrosTexto")}
              placeholder="Descreva o achado adicional (frase completa a ser incluída no laudo)"
            />
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

function renderLine(item, key) {
  if (typeof item !== "string") {
    if (item && item.type === "cimtTable") {
      return (
        <table key={key} style={{ borderCollapse: "collapse", fontSize: 12.5, marginTop: 2, marginBottom: 6 }}>
          <tbody>
            <tr>
              <td style={{ padding: "3px 14px 3px 0", color: "#C7D2E4" }}>Segmento distal da artéria carótida comum</td>
              <td style={{ padding: "3px 0", color: COLORS.text, fontWeight: 600 }}>{item.distalACC || "__"} mm</td>
            </tr>
            <tr>
              <td style={{ padding: "3px 14px 3px 0", color: "#C7D2E4" }}>Bifurcação carotídea</td>
              <td style={{ padding: "3px 0", color: COLORS.text, fontWeight: 600 }}>{item.bifurcacao || "__"} mm</td>
            </tr>
          </tbody>
        </table>
      );
    }
    return null;
  }
  const line = item;
  if (line === "") return <div key={key} style={{ height: 8 }} />;
  if (line.startsWith("[") && line.endsWith("]")) {
    return (
      <div key={key} style={{ color: COLORS.accent, fontWeight: 600, textDecoration: "underline", marginTop: 6, marginBottom: 2 }}>
        {line.slice(1, -1)}
      </div>
    );
  }
  const upper = line === line.toUpperCase() && /[A-ZÀ-Ú]/.test(line) && !line.startsWith("-");
  return (
    <div key={key} style={{ color: upper ? COLORS.text : "#C7D2E4", fontWeight: upper ? 700 : 400, marginBottom: 2 }}>
      {line}
    </div>
  );
}

function DopplerTablePreview({ state }) {
  const sides = getActiveSides(state);
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 12 }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "4px 6px", color: COLORS.textMuted, fontWeight: 600 }}></th>
          <th style={{ textAlign: "left", padding: "4px 6px", color: COLORS.textMuted, fontWeight: 600 }}>C. Comum</th>
          <th style={{ textAlign: "left", padding: "4px 6px", color: COLORS.textMuted, fontWeight: 600 }}>C. Externa</th>
          <th style={{ textAlign: "left", padding: "4px 6px", color: COLORS.textMuted, fontWeight: 600 }}>C. Interna</th>
          <th style={{ textAlign: "left", padding: "4px 6px", color: COLORS.textMuted, fontWeight: 600 }}>Vertebral</th>
        </tr>
      </thead>
      <tbody>
        {sides.map((s) => {
          const m = state[s];
          return (
            <tr key={s} style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <td style={{ padding: "4px 6px", color: COLORS.text, fontWeight: 600 }}>{SIDE_LABEL[s].slice(0, 3)}</td>
              <td style={{ padding: "4px 6px", color: "#C7D2E4" }}>{velCell(m, "velACCsist", "velACCdiast") || "\u2014"}</td>
              <td style={{ padding: "4px 6px", color: "#C7D2E4" }}>{velCell(m, "velACEsist", "velACEdiast") || "\u2014"}</td>
              <td style={{ padding: "4px 6px", color: "#C7D2E4" }}>{velCell(m, "velACIsist", "velACIdiast") || "\u2014"}</td>
              <td style={{ padding: "4px 6px", color: "#C7D2E4" }}>{velCell(m, "velVertSist", "velVertdiast") || "\u2014"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ReportPreview({ state, patientName, examDate, obsTireoide, obsBatimentos }) {
  const blocks = useMemo(() => buildFullReportBlocks(state), [state]);

  if (blocks.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>
        Selecione ao menos um lado (Direito e/ou Esquerdo) para começar a gerar o laudo.
      </div>
    );
  }

  let k = 0;
  return (
    <div style={{ fontSize: PREVIEW_SIZE, fontFamily: PREVIEW_FONT, lineHeight: 1.55 }}>
      <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>ECODOPPLER COLORIDO</div>
      <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>AVALIAÇÃO CÉREBRO-VASCULAR EXTRA-CRANIANA</div>
      {patientName && patientName.trim() && (
        <div style={{ color: "#C7D2E4", marginBottom: 2 }}>
          <strong style={{ color: COLORS.text }}>Paciente:</strong> {patientName.trim()}
        </div>
      )}
      {examDate && examDate.trim() && (
        <div style={{ color: "#C7D2E4", marginBottom: 10 }}>
          <strong style={{ color: COLORS.text }}>Data:</strong> {examDate.trim()}
        </div>
      )}

      <div style={{ color: "#C7D2E4", marginBottom: 10 }}>
        <strong style={{ color: COLORS.text }}>VASOS ESTUDADOS:</strong> Territórios Carotídeos e Vértebro-Basilares
        extra-cranianos, utilizando critérios anatômicos e hemodinâmicos em modo B, doppler colorido e análise espectral das
        velocidades de fluxo nas artérias carótidas e vertebrais (Velocidade Sistólica de Pico e Velocidade Diastólica Final).
      </div>

      <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 6 }}>
        DOPPLER: Velocidades de fluxo nas artérias carótidas e vertebrais (Pico Sist./Vel.Diast.Final em cm/s):
      </div>
      <DopplerTablePreview state={state} />

      <div style={{ fontWeight: 700, color: COLORS.text, marginTop: 6, marginBottom: 4 }}>IMPRESSÃO DIAGNÓSTICA</div>
      {blocks.map((b) => (
        <div key={"lado-" + b.side}>
          {renderLine(b.header, k++)}
          {b.carotideo.map((l) => renderLine(l, k++))}
          {b.vertebral.map((l) => renderLine(l, k++))}
        </div>
      ))}

      {anyCimt(state) && (
        <div style={{ marginTop: 10 }}>
          {renderLine("* Valor de referência da medida do complexo médio-intimal (< 50 anos: > 0,8 mm = espessamento).", k++)}
          {renderLine("* Valor de referência da medida do complexo médio-intimal (\u2265 50 anos: \u2265 1,0 mm = espessamento).", k++)}
        </div>
      )}

      {(obsTireoide || obsBatimentos || getExtraObsLines(state).length > 0) && (
        <div style={{ marginTop: 10 }}>
          {obsTireoide && renderLine("* Obs.: Alterações na morfologia da glândula tireoide.", k++)}
          {obsBatimentos && renderLine("* Obs.: Batimentos cardíacos irregulares durante o exame.", k++)}
          {getExtraObsLines(state).map((l) => renderLine(l, k++))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   EXPORTAÇÃO .DOCX
   ============================================================ */

async function exportDocx(state, patientName, examDate, obsTireoide, obsBatimentos) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType } = await import("docx");

  const blocks = buildFullReportBlocks(state);
  const sides = getActiveSides(state);

  const FONT = "Helvetica Neue";
  const SZ = 24; // 12pt
  const SP = 60;

  function tr(text, opts = {}) {
    return new TextRun({ text, font: FONT, size: SZ, ...opts });
  }
  function paraText(text) {
    if (text.startsWith("[") && text.endsWith("]")) {
      return new Paragraph({ spacing: { before: 80, after: SP }, children: [tr(text.slice(1, -1), { bold: true, underline: {} })] });
    }
    const upper = text === text.toUpperCase() && /[A-Z\u00C0-\u00DA]/.test(text) && !text.startsWith("-");
    return new Paragraph({ spacing: { after: SP }, children: [tr(text, { bold: upper })] });
  }
  function emptyLine() {
    return new Paragraph({ children: [], spacing: { after: 0 } });
  }
  function buildCimtTable(item) {
    const colW1 = 6300;
    const colW2 = 2000;
    const row1 = new TableRow({
      children: [
        cell("Segmento distal da artéria carótida comum", { width: colW1 }),
        cell(`${item.distalACC || "__"} mm`, { width: colW2 }),
      ],
    });
    const row2 = new TableRow({
      children: [cell("Bifurcação carotídea", { width: colW1 }), cell(`${item.bifurcacao || "__"} mm`, { width: colW2 })],
    });
    return new Table({
      columnWidths: [colW1, colW2],
      width: { size: colW1 + colW2, type: WidthType.DXA },
      rows: [row1, row2],
    });
  }
  function blockToParagraphs(lines) {
    return lines.map((item) => {
      if (typeof item !== "string") {
        if (item && item.type === "cimtTable") return buildCimtTable(item);
        return emptyLine();
      }
      return item === "" ? emptyLine() : paraText(item);
    });
  }

  const pageProps = {
    size: { width: 12240, height: 15840 },
    margin: { top: 720, right: 720, bottom: 720, left: 720 },
  };

  function cell(text, opts = {}) {
    return new TableCell({
      width: { size: opts.width || 2000, type: WidthType.DXA },
      shading: opts.header ? { type: ShadingType.CLEAR, fill: "1F4A45" } : undefined,
      children: [new Paragraph({ children: [tr(text, { bold: !!opts.header, color: opts.header ? "FFFFFF" : undefined })] })],
    });
  }

  function buildDopplerTable() {
    const colW = 1836; // 5 columns summing to 9180 (within 720 margins on Letter width 12240)
    const headerRow = new TableRow({
      children: [
        cell("", { header: true, width: colW }),
        cell("Carótida Comum", { header: true, width: colW }),
        cell("Carótida Externa", { header: true, width: colW }),
        cell("Carótida Interna", { header: true, width: colW }),
        cell("Vertebral", { header: true, width: colW }),
      ],
    });
    const rows = sides.map((s) => {
      const m = state[s];
      return new TableRow({
        children: [
          cell(SIDE_LABEL[s] === "DIREITA" ? "Direita" : "Esquerda", { width: colW }),
          cell(velCell(m, "velACCsist", "velACCdiast") || "\u2014", { width: colW }),
          cell(velCell(m, "velACEsist", "velACEdiast") || "\u2014", { width: colW }),
          cell(velCell(m, "velACIsist", "velACIdiast") || "\u2014", { width: colW }),
          cell(velCell(m, "velVertSist", "velVertdiast") || "\u2014", { width: colW }),
        ],
      });
    });
    return new Table({
      columnWidths: [colW, colW, colW, colW, colW],
      width: { size: colW * 5, type: WidthType.DXA },
      rows: [headerRow, ...rows],
    });
  }

  const children = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [tr("ECODOPPLER COLORIDO", { bold: true })],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: SP },
      children: [tr("AVALIAÇÃO CÉREBRO-VASCULAR EXTRA-CRANIANA", { bold: true })],
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

  children.push(
    new Paragraph({
      spacing: { after: SP },
      children: [
        tr("VASOS ESTUDADOS: ", { bold: true }),
        tr(
          "Territórios Carotídeos e Vértebro-Basilares extra-cranianos, utilizando critérios anatômicos e hemodinâmicos em modo B, doppler colorido e análise espectral das velocidades de fluxo nas artérias carótidas e vertebrais (Velocidade Sistólica de Pico e Velocidade Diastólica Final)."
        ),
      ],
    })
  );
  children.push(emptyLine());

  children.push(new Paragraph({ spacing: { after: SP }, children: [tr("DOPPLER: ", { bold: true }), tr("Velocidades de fluxo nas artérias carótidas e vertebrais (Pico Sist. / Vel. Diast. Final em cm/s):")] }));
  children.push(buildDopplerTable());
  children.push(emptyLine());

  children.push(new Paragraph({ spacing: { after: SP }, children: [tr("IMPRESSÃO DIAGNÓSTICA", { bold: true })] }));
  children.push(emptyLine());

  blocks.forEach((b) => {
    children.push(paraText(b.header));
    children.push(...blockToParagraphs(b.carotideo));
    children.push(...blockToParagraphs(b.vertebral));
    children.push(emptyLine());
  });

  if (anyCimt(state)) {
    children.push(paraText("* Valor de referência da medida do complexo médio-intimal (< 50 anos: > 0,8 mm = espessamento)."));
    children.push(paraText("* Valor de referência da medida do complexo médio-intimal (\u2265 50 anos: \u2265 1,0 mm = espessamento)."));
    children.push(emptyLine());
  }

  if (obsTireoide) children.push(paraText("* Obs.: Alterações na morfologia da glândula tireoide."));
  if (obsBatimentos) children.push(paraText("* Obs.: Batimentos cardíacos irregulares durante o exame."));
  getExtraObsLines(state).forEach((l) => children.push(paraText(l)));

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 24 } } } },
    sections: [{ properties: { page: pageProps }, children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const nomePaciente = (patientName || "").trim().replace(/[^\wÀ-ÿ\s\-]+/g, "").trim() || "Laudo";
  const nomeArquivo = `${nomePaciente} CAROTIDAS`;
  a.href = url;
  a.download = `${nomeArquivo}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================================================
   MODAL — CRITÉRIOS DE INTERPRETAÇÃO
   ============================================================ */

const CRIT_VERTEBRAIS_VEL = [
  ["30 - 60 cm/s", "Normal"],
  ["20 - 30 cm/s", "Fluxo diminuído"],
  ["< 20 cm/s", "Possível lesão proximal"],
  ["60 - 100 cm/s", "Possível aumento compensatório"],
  ["> 100 cm/s", "Estenose local?"],
];

const CRIT_VERTEBRAIS_DIAM = [["Calibre < 3.0 mm", "Hipoplasia"]];

const CRIT_CAROTIDAS = [
  ["0-40%", "Discreta", "Anatomia (Modo B e Doppler Colorido)\nIntervalo 10%"],
  ["40-60%", "Moderada", "Anatomia (Modo B e Doppler Colorido)\nIntervalo 10%"],
  [
    "60-70%",
    "Hemodinamicamente Significativa",
    "Anatomia (Modo B e Doppler Colorido)\nVelocidade sistólica: < 230 cm/s\nVelocidade diastólica: 40-100 cm/s\nÍndice VSCI / VSCC: 2-4",
  ],
  [
    "70-80%",
    "Hemodinamicamente Significativa",
    "Anatomia (Modo B e Doppler Colorido)\nVelocidade sistólica > 230 cm/s\nVelocidade diastólica > 100 cm/s\nÍndice VSCI / VSCC > 4",
  ],
  ["80%", "Crítica", "Anatomia (Modo B e Doppler Colorido)\nVelocidade diastólica > 100 cm/s"],
  ["Oclusão", "Oclusão", "Ausência de fluxo"],
];

function CritTable({ headers, rows, colWidths }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 4 }}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th
              key={i}
              style={{
                textAlign: "left",
                padding: "7px 8px",
                background: COLORS.accentDim,
                color: COLORS.accent,
                fontWeight: 700,
                border: `1px solid ${COLORS.border}`,
                width: colWidths ? colWidths[i] : undefined,
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((cell, ci) => (
              <td
                key={ci}
                style={{
                  padding: "7px 8px",
                  border: `1px solid ${COLORS.border}`,
                  color: "#C7D2E4",
                  whiteSpace: "pre-line",
                  fontWeight: ci === 0 ? 600 : 400,
                  verticalAlign: "top",
                }}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CriteriosModal({ onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.panel,
          border: `1px solid ${COLORS.borderLight}`,
          borderRadius: 14,
          width: "100%",
          maxWidth: 560,
          maxHeight: "85vh",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: `1px solid ${COLORS.border}`,
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 14.5, fontWeight: 700, color: COLORS.text }}>Critérios de interpretação</div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: COLORS.textMuted,
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "14px 16px 20px 16px", overflowY: "auto" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent, marginBottom: 8 }}>
            Artérias Vertebrais {"\u2014"} Velocidade Sistólica
          </div>
          <CritTable
            headers={["Velocidades Sistólicas", "Interpretação"]}
            rows={CRIT_VERTEBRAIS_VEL}
            colWidths={["42%", "58%"]}
          />

          <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginTop: 10, marginBottom: 6 }}>
            Diâmetro da artéria vertebral
          </div>
          <CritTable headers={["Calibre", "Interpretação"]} rows={CRIT_VERTEBRAIS_DIAM} colWidths={["42%", "58%"]} />

          <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "18px 0 14px 0" }} />

          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent, marginBottom: 8 }}>Artérias Carótidas</div>
          <CritTable
            headers={["Estenose", "Graduação", "Critérios"]}
            rows={CRIT_CAROTIDAS}
            colWidths={["16%", "26%", "58%"]}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   APP
   ============================================================ */

export default function AppCarotidasVertebrais() {
  const [patientName, setPatientName] = useState("");
  const [examDate, setExamDate] = useState(todayBR());
  const [examDateISO, setExamDateISO] = useState(() => new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState("D");
  const [state, setState] = useState({ D: defaultSideState(), E: defaultSideState() });
  const [obsTireoide, setObsTireoide] = useState(false);
  const [obsBatimentos, setObsBatimentos] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showCriterios, setShowCriterios] = useState(false);

  const updateSide = useCallback((side, updater) => {
    setState((prev) => ({ ...prev, [side]: updater(prev[side]) }));
  }, []);
  const resetAll = () => setConfirmReset(true);
  const doReset = () => {
    setState({ D: defaultSideState(), E: defaultSideState() });
    setPatientName("");
    setExamDate(todayBR());
    setExamDateISO(new Date().toISOString().split("T")[0]);
    setObsTireoide(false);
    setObsBatimentos(false);
    setConfirmReset(false);
  };

  const reportLines = useMemo(() => {
    const blocks = buildFullReportBlocks(state);
    const lines = ["ECODOPPLER COLORIDO", "AVALIAÇÃO CÉREBRO-VASCULAR EXTRA-CRANIANA", ""];
    if (patientName.trim()) lines.push(`Paciente: ${patientName.trim()}`, "");
    if (examDate.trim()) lines.push(`Data: ${examDate.trim()}`, "");
    lines.push(
      "VASOS ESTUDADOS: Territórios Carotídeos e Vértebro-Basilares extra-cranianos, utilizando critérios anatômicos e hemodinâmicos em modo B, doppler colorido e análise espectral das velocidades de fluxo nas artérias carótidas e vertebrais (Velocidade Sistólica de Pico e Velocidade Diastólica Final).",
      ""
    );
    getActiveSides(state).forEach((s) => {
      const m = state[s];
      lines.push(
        `DOPPLER ${SIDE_LABEL[s]} \u2014 C.Comum: ${velCell(m, "velACCsist", "velACCdiast") || "\u2014"} | C.Externa: ${
          velCell(m, "velACEsist", "velACEdiast") || "\u2014"
        } | C.Interna: ${velCell(m, "velACIsist", "velACIdiast") || "\u2014"} | Vertebral: ${
          velCell(m, "velVertSist", "velVertdiast") || "\u2014"
        }`
      );
    });
    lines.push("", "IMPRESSÃO DIAGNÓSTICA", "");
    const itemToText = (item) => {
      if (typeof item === "string") return [item];
      if (item && item.type === "cimtTable") {
        return [
          `Segmento distal da artéria carótida comum: ${item.distalACC || "__"} mm`,
          `Bifurcação carotídea: ${item.bifurcacao || "__"} mm`,
        ];
      }
      return [];
    };
    blocks.forEach((b) => {
      lines.push(b.header);
      b.carotideo.forEach((l) => itemToText(l).forEach((t) => lines.push(t)));
      b.vertebral.forEach((l) => itemToText(l).forEach((t) => lines.push(t)));
      lines.push("");
    });
    if (anyCimt(state)) {
      lines.push(
        "* Valor de referência da medida do complexo médio-intimal (< 50 anos: > 0,8 mm = espessamento).",
        "* Valor de referência da medida do complexo médio-intimal (\u2265 50 anos: \u2265 1,0 mm = espessamento).",
        ""
      );
    }
    if (obsTireoide) lines.push("* Obs.: Alterações na morfologia da glândula tireoide.");
    if (obsBatimentos) lines.push("* Obs.: Batimentos cardíacos irregulares durante o exame.");
    getExtraObsLines(state).forEach((l) => lines.push(l));
    return lines;
  }, [state, patientName, examDate, obsTireoide, obsBatimentos]);

  const handleCopy = async () => {
    try {
      const text = reportLines.join("\n");
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.error("Erro ao copiar:", e);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportDocx(state, patientName, examDate, obsTireoide, obsBatimentos);
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
          background: "rgba(11,18,32,0.92)",
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
            <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: 0.2 }}>Carótidas e Vertebrais</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>Gerador de laudo · Ecodoppler colorido</div>
          </div>
          <button
            onClick={() => setShowCriterios(true)}
            title="Critérios de interpretação"
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
            <Info size={15} />
          </button>
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

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={() => setActiveTab("D")} style={tabStyle(activeTab === "D")}>
            Formulário — Direito
          </button>
          <button onClick={() => setActiveTab("E")} style={tabStyle(activeTab === "E")}>
            Formulário — Esquerdo
          </button>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div style={{ padding: "14px 14px 100px 14px" }}>
        {!mobilePreview ? (
          <SideForm
            data={state[activeTab]}
            update={(updater) => updateSide(activeTab, updater)}
            obsTireoide={obsTireoide}
            setObsTireoide={setObsTireoide}
            obsBatimentos={obsBatimentos}
            setObsBatimentos={setObsBatimentos}
          />
        ) : (
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
            <ReportPreview
              state={state}
              patientName={patientName}
              examDate={examDate}
              obsTireoide={obsTireoide}
              obsBatimentos={obsBatimentos}
            />
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
          background: "rgba(11,18,32,0.97)",
          backdropFilter: "blur(8px)",
          borderTop: `1px solid ${COLORS.border}`,
          padding: "10px 14px calc(10px + env(safe-area-inset-bottom))",
          display: "flex",
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
              flex: 1,
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
            {copied ? "Copiado" : "Copiar texto"}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              flex: 1,
              padding: "11px 10px",
              borderRadius: 9,
              border: "none",
              background: COLORS.accent,
              color: "#06231F",
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

      {/* MODAL DE CRITÉRIOS */}
      {showCriterios && <CriteriosModal onClose={() => setShowCriterios(false)} />}

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
                  color: "#06231F",
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
