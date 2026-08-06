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
   MOTOR DE GERAÇÃO DE LAUDO — VENOSO PROFUNDO MMII
   ============================================================ */

const SIDE_LABEL = { D: "DIREITO", E: "ESQUERDO" };

const SEGMENT_OPTIONS = [
  { value: "coxaProx", label: "coxa proximal" },
  { value: "coxaMedia", label: "coxa média" },
  { value: "coxaDistal", label: "coxa distal" },
  { value: "joelho", label: "joelho" },
  { value: "pernaProx", label: "perna proximal" },
  { value: "pernaMedia", label: "perna média" },
  { value: "pernaDistal", label: "perna distal" },
];
const SEG_LABEL = Object.fromEntries(SEGMENT_OPTIONS.map((s) => [s.value, s.label]));

// Segmentos para a veia safena magna (inclui croça, coxa e joelho) e para a safena parva
// (inclui croça e perna, já que a safena parva não se estende à coxa/joelho).
const SEGMENT_OPTIONS_MAGNA = [{ value: "croca", label: "croça" }, ...SEGMENT_OPTIONS];
const SEGMENT_OPTIONS_PARVA = [
  { value: "croca", label: "croça" },
  { value: "pernaProx", label: "perna proximal" },
  { value: "pernaMedia", label: "perna média" },
  { value: "pernaDistal", label: "perna distal" },
];
const SEG_LABEL_CROCA = { croca: "croça", ...SEG_LABEL };

// Veias para trombose profunda (anatômico, uma linha por veia selecionada)
const VEIN_OPTIONS = [
  { value: "femoralComum", label: "femoral comum" },
  { value: "femoralProfunda", label: "femoral profunda" },
  { value: "femoral", label: "femoral" },
  { value: "poplitea", label: "poplítea" },
  { value: "tibiaisPosteriores", label: "veias tibiais posteriores" },
  { value: "tibialPosterior", label: "uma das tibiais posteriores" },
  { value: "fibular", label: "fibular" },
  { value: "musculares", label: "musculares (gastrocnêmias/soleares)" },
];
const VEIN_LABEL = Object.fromEntries(VEIN_OPTIONS.map((v) => [v.value, v.label]));
// Nome de cada veia tal como entra na frase combinada ("Veias X, Y e Z dilatadas...").
const VEIN_LIST_LABEL = {
  femoralComum: "femoral comum",
  femoralProfunda: "femoral profunda",
  femoral: "femoral",
  poplitea: "poplítea",
  musculares: "musculares gastrocnêmias e soleares",
  tibiaisPosteriores: "tibiais posteriores",
  tibialPosterior: "uma das tibiais posteriores",
  fibular: "fibular",
};
// Veias cujo nome já é intrinsecamente plural, mesmo quando é a única selecionada.
const VEIN_INTRINSECAMENTE_PLURAL = new Set(["musculares", "tibiaisPosteriores"]);
// Ordem de importância anatômica: femoral comum -> femoral profunda -> femoral -> poplítea ->
// tibiais posteriores -> fibular -> musculares. Usada para ordenar a frase combinada de trombose,
// independentemente da ordem em que as veias foram marcadas.
const VEIN_ORDER = [
  "femoralComum",
  "femoralProfunda",
  "femoral",
  "poplitea",
  "tibiaisPosteriores",
  "tibialPosterior",
  "fibular",
  "musculares",
];
function ordenarVeiasPorImportancia(veias) {
  return [...veias].sort((a, b) => VEIN_ORDER.indexOf(a) - VEIN_ORDER.indexOf(b));
}

// Segmentos para trombose por extensão / insuficiência valvular
const SEGMENTO_OPTIONS = [
  { value: "femoroPopliteo", label: "fêmoro-poplíteo" },
  { value: "popliteoPodal", label: "poplíteo-podal" },
];
const SEGMENTO_LABEL = Object.fromEntries(SEGMENTO_OPTIONS.map((s) => [s.value, s.label]));
// Mapeamento de cada veia para o segmento correspondente na conclusão (fêmoro-poplíteo =
// femoral comum/profunda/femoral/poplítea; poplíteo-podal = tibiais posteriores, fibular, musculares).
const TROMBO_VEIN_TO_SEGMENTO = {
  femoralComum: "femoroPopliteo",
  femoralProfunda: "femoroPopliteo",
  femoral: "femoroPopliteo",
  poplitea: "femoroPopliteo",
  tibiaisPosteriores: "popliteoPodal",
  tibialPosterior: "popliteoPodal",
  fibular: "popliteoPodal",
  musculares: "popliteoPodal",
};

// Veias para refluxo (Doppler)
const REFLUXO_VEIN_OPTIONS = [
  { value: "femoralComum", label: "femoral comum" },
  { value: "femoral", label: "femoral" },
  { value: "poplitea", label: "poplítea" },
  { value: "tibiaisPosteriores", label: "tibiais posteriores" },
  { value: "fibulares", label: "fibulares" },
];
const REFLUXO_VEIN_LABEL = Object.fromEntries(REFLUXO_VEIN_OPTIONS.map((v) => [v.value, v.label]));
// Segmento correspondente a cada veia com refluxo (fêmoro-poplíteo = femoral comum/femoral/poplítea;
// poplíteo-podal = tibiais posteriores/fibulares) — usado para derivar a conclusão automaticamente.
const REFLUXO_VEIN_TO_SEGMENTO = {
  femoralComum: "femoroPopliteo",
  femoral: "femoroPopliteo",
  poplitea: "femoroPopliteo",
  tibiaisPosteriores: "popliteoPodal",
  fibulares: "popliteoPodal",
};

// Faces para tromboflebite superficial em colaterais
const FACE_OPTIONS = [
  { value: "anteroMedial", label: "ântero-medial" },
  { value: "medial", label: "medial" },
  { value: "posteroMedial", label: "póstero-medial" },
  { value: "posterior", label: "posterior" },
  { value: "posteroLateral", label: "póstero-lateral" },
];
const FACE_LABEL = Object.fromEntries(FACE_OPTIONS.map((f) => [f.value, f.label]));

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
function fmtNum(v) {
  return v === "" || v === null || v === undefined ? "" : v;
}
function listaFluida(items) {
  if (!items || items.length === 0) return "";
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(", ") + " e " + items[items.length - 1];
}

function defaultMemberState() {
  return {
    incluir: false,

    dificuldadeAtiva: false,
    dificuldadeCausa: "edema", // edema | profundidade

    tromboRecenteAtiva: false,
    tromboRecenteVeias: [],

    tromboAntigaAtiva: false,
    tromboAntigaVeias: [],

    refluxoAtiva: false,
    refluxoVeias: [], // segmento da conclusão é derivado automaticamente das veias marcadas

    descritorAntigo: "compativel", // compativel | sugestivo — usado nos achados "antigos" (trombose e tromboflebite)
    recanalizacaoAntigo: "parcial", // total | parcial | nenhuma — usado nos achados "antigos" (trombose e tromboflebite)

    flebiteRecenteMagnaAtiva: false,
    flebiteRecenteMagnaSegmentos: [],
    flebiteRecenteParvaAtiva: false,
    flebiteRecenteParvaSegmentos: [],
    flebiteRecenteColateralAtiva: false,
    flebiteRecenteColateralFaces: [],
    flebiteRecenteColateralLocais: [],

    flebiteAntigaMagnaAtiva: false,
    flebiteAntigaMagnaSegmentos: [],
    flebiteAntigaParvaAtiva: false,
    flebiteAntigaParvaSegmentos: [],
    flebiteAntigaColateralAtiva: false,
    flebiteAntigaColateralFaces: [],
    flebiteAntigaColateralLocais: [],

    cistoAtivo: false,
    cistoTipo: "integro", // integro | roto
    cistoUniformidade: "uniformemente", // uniformemente | predominantemente
    cistoEcogenicidade: "anecoico", // anecoico | hipoecoico
    cistoHomogeneidade: "homogeneo", // homogeneo | heterogeneo
    cistoLimites: "precisos", // precisos | imprecisos (apenas "roto")
    cistoDissecadoRoto: "dissecado", // dissecado | roto (apenas "roto")
    cistoLargura: "",
    cistoComprimento: "",

    hematomaAtivo: false,
    hematomaModo: "presente", // presente | ausente
    hematomaEcogenicidade: "anecoica", // anecoica | hipoecoica (para "presente")
    hematomaLargura: "",
    hematomaComprimento: "",
    hematomaLocal: "perna", // inguinal | coxa | perna (para o modo "ausente")
    hematomaAspecto: "nodular", // nodular | cistico (para "ausente")
    hematomaSuspeita: "equimose", // equimose | hematoma (para "ausente")
  };
}

/* ---------- Construtores de trecho (trombose profunda) ---------- */

function descritorTexto(descritor) {
  return descritor === "sugestivo" ? "sugestivo de" : "compatível com";
}

// Texto do grau de recanalização e concordância singular/plural do estado de compressibilidade
// para achados "antigos" (trombose venosa profunda e tromboflebite superficial).
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
function recanalizacaoImgDetalhe(nivel) {
  if (nivel === "total") return "com discreto espessamento parietal residual, sem imagens de trombos ocupando o lúmen venoso";
  if (nivel === "nenhuma") return "imagens ecogênicas ocupando todo o lúmen venoso";
  return "imagens ecogênicas ocupando parcialmente o lúmen venoso";
}

function tromboAtivaComDados(m, prefix) {
  return m[`${prefix}Ativa`] && m[`${prefix}Veias`].length > 0;
}

function tromboVeinAfetada(m, v) {
  return (
    (m.tromboRecenteAtiva && m.tromboRecenteVeias.includes(v)) ||
    (m.tromboAntigaAtiva && m.tromboAntigaVeias.includes(v))
  );
}

// Todas as veias selecionadas (recente ou antiga) entram na MESMA linha do texto anatômico,
// com concordância singular/plural conforme a quantidade e a natureza de cada veia.
function buildTromboAnatomicoCombinado(m, prefix, isAntiga) {
  if (!tromboAtivaComDados(m, prefix)) return null;
  const veias = ordenarVeiasPorImportancia(m[`${prefix}Veias`]);

  const imgTxt = isAntiga
    ? `${recanalizacaoImgDetalhe(m.recanalizacaoAntigo)}, ${descritorTexto(m.descritorAntigo)} trombose venosa profunda antiga ${recanalizacaoLabel(m.recanalizacaoAntigo)}`
    : "imagens ecogênicas na luz do vaso, compatível com trombose venosa profunda recente";

  // Caso especial: apenas "uma das tibiais posteriores" isoladamente (achado singular por natureza).
  if (veias.length === 1 && veias[0] === "tibialPosterior") {
    const compress = isAntiga ? recanalizacaoCompress(m.recanalizacaoAntigo, false) : "incompressível, sem fluxo";
    return `Uma das veias tibiais posteriores dilatada, ${compress} e ${imgTxt}.`;
  }

  const plural = veias.length > 1 || VEIN_INTRINSECAMENTE_PLURAL.has(veias[0]);
  const nomes = veias.map((v) => VEIN_LIST_LABEL[v]);
  const prefixo = plural ? "Veias" : "Veia";
  const dilatadaTxt = plural ? "dilatadas" : "dilatada";
  const compress = isAntiga
    ? recanalizacaoCompress(m.recanalizacaoAntigo, plural)
    : plural
    ? "incompressíveis, sem fluxo"
    : "incompressível, sem fluxo";

  return `${prefixo} ${listaFluida(nomes)} ${dilatadaTxt}, ${compress} e ${imgTxt}.`;
}

// Conclusão resumida por segmento (fêmoro-poplíteo / poplíteo-podal), derivada automaticamente
// das veias marcadas — não é mais um campo separado.
function buildTromboConclusaoLinha(m, prefix, isAntiga) {
  if (!tromboAtivaComDados(m, prefix)) return null;
  const tipoTxt = isAntiga ? "antiga" : "recente";
  const segsSet = new Set(m[`${prefix}Veias`].map((v) => TROMBO_VEIN_TO_SEGMENTO[v]));
  const segs = SEGMENTO_OPTIONS.filter((s) => segsSet.has(s.value)).map((s) => SEGMENTO_LABEL[s.value]);
  const plural = segs.length > 1;
  const sufixo = isAntiga ? `, ${recanalizacaoLabel(m.recanalizacaoAntigo)}` : "";
  return `Trombose venosa profunda ${tipoTxt} ${plural ? "nos segmentos" : "no segmento"} ${listaFluida(segs)}${sufixo}.`;
}

// Linha complementar fixa do modelo (não é um campo adicional/editável pelo usuário): afirma a
// permeabilidade do(s) segmento(s) restante(s). Some quando trombose recente + antiga já cobrem
// os dois segmentos (fêmoro-poplíteo e poplíteo-podal), pois não sobra nenhum segmento "demais".
function buildTromboComplementoLinha(m) {
  const segsAfetados = new Set();
  if (tromboAtivaComDados(m, "tromboRecente")) {
    m.tromboRecenteVeias.forEach((v) => segsAfetados.add(TROMBO_VEIN_TO_SEGMENTO[v]));
  }
  if (tromboAtivaComDados(m, "tromboAntiga")) {
    m.tromboAntigaVeias.forEach((v) => segsAfetados.add(TROMBO_VEIN_TO_SEGMENTO[v]));
  }
  if (segsAfetados.size === 0 || segsAfetados.size >= SEGMENTO_OPTIONS.length) return null;
  return "Demais segmentos pérvios, sem sinais de trombose.";
}

/* ---------- Construtores de trecho (tromboflebite superficial) ---------- */

function segListText(segLabels) {
  return segLabels.length > 1 ? `nos segmentos ${listaFluida(segLabels)}` : `no segmento ${segLabels[0]}`;
}

function buildFlebiteAnatomico(m, prefix, isAntiga) {
  const lines = [];
  const compressSing = isAntiga ? recanalizacaoCompress(m.recanalizacaoAntigo, false) : "incompressível, sem fluxo";
  const imgTxt = isAntiga
    ? `${recanalizacaoImgDetalhe(m.recanalizacaoAntigo)}, ${descritorTexto(m.descritorAntigo)} tromboflebite superficial antiga ${recanalizacaoLabel(m.recanalizacaoAntigo)}`
    : "imagens ecogênicas na luz do vaso, compatível com tromboflebite superficial recente";

  if (m[`${prefix}MagnaAtiva`] && m[`${prefix}MagnaSegmentos`].length > 0) {
    const segs = m[`${prefix}MagnaSegmentos`].map((s) => SEG_LABEL_CROCA[s]);
    lines.push(`Veia safena magna, ${segListText(segs)}, dilatada, ${compressSing} e ${imgTxt}.`);
  }
  if (m[`${prefix}ParvaAtiva`] && m[`${prefix}ParvaSegmentos`].length > 0) {
    const segs = m[`${prefix}ParvaSegmentos`].map((s) => SEG_LABEL_CROCA[s]);
    lines.push(`Veia safena parva, ${segListText(segs)}, dilatada, ${compressSing} e ${imgTxt}.`);
  }
  if (
    m[`${prefix}ColateralAtiva`] &&
    (m[`${prefix}ColateralFaces`].length > 0 || m[`${prefix}ColateralLocais`].length > 0)
  ) {
    const faces = m[`${prefix}ColateralFaces`].map((f) => FACE_LABEL[f]);
    const locais = m[`${prefix}ColateralLocais`].map((l) => SEG_LABEL[l]);
    const faceTxt = faces.length ? `na${faces.length > 1 ? "s faces" : " face"} ${listaFluida(faces)}` : "";
    const localTxt = locais.length
      ? `${faceTxt ? " " : ""}${locais.length > 1 ? "dos segmentos" : "do segmento"} ${listaFluida(locais)}`
      : "";
    if (isAntiga) {
      const compressPlural = recanalizacaoCompress(m.recanalizacaoAntigo, true);
      lines.push(
        `Veias superficiais ${faceTxt}${localTxt}, ${compressPlural} e ${recanalizacaoImgDetalhe(m.recanalizacaoAntigo)}, ${descritorTexto(m.descritorAntigo)} tromboflebite superficial antiga ${recanalizacaoLabel(m.recanalizacaoAntigo)}.`
      );
    } else {
      lines.push(
        `Veias superficiais ${faceTxt}${localTxt}, dilatadas, incompressíveis, sem fluxo, com imagens ecogênicas, compatível com tromboflebite superficial recente.`
      );
    }
  }

  return lines;
}

function buildFlebiteConclusao(m, prefix, isAntiga) {
  const lines = [];
  const tipoTxt = isAntiga ? "antiga" : "recente";
  const sufixo = isAntiga ? `, ${recanalizacaoLabel(m.recanalizacaoAntigo)}` : "";

  if (m[`${prefix}MagnaAtiva`] && m[`${prefix}MagnaSegmentos`].length > 0) {
    lines.push(`Tromboflebite superficial ${tipoTxt} na veia safena magna${sufixo}.`);
  }
  if (m[`${prefix}ParvaAtiva`] && m[`${prefix}ParvaSegmentos`].length > 0) {
    lines.push(`Tromboflebite superficial ${tipoTxt} na veia safena parva${sufixo}.`);
  }
  if (m[`${prefix}ColateralAtiva`] && m[`${prefix}ColateralLocais`].length > 0) {
    const areas = [
      ...new Set(
        m[`${prefix}ColateralLocais`].map((l) => (l.startsWith("coxa") ? "coxa" : l === "joelho" ? "joelho" : "perna"))
      ),
    ];
    lines.push(`Tromboflebite superficial ${tipoTxt} na ${listaFluida(areas)}.`);
  }

  return lines;
}

/* ---------- Cisto de Baker / Hematoma ---------- */

function buildCistoTexto(m) {
  const uniformidade = m.cistoUniformidade === "predominantemente" ? "predominantemente" : "uniformemente";
  const eco = m.cistoEcogenicidade === "hipoecoico" ? "hipoecóico" : "anecóico";
  const homogeneidade = m.cistoHomogeneidade === "heterogeneo" ? "heterogêneo" : "homogêneo";

  if (m.cistoTipo === "integro") {
    const l = fmtNum(m.cistoLargura) || "__";
    const c = fmtNum(m.cistoComprimento) || "__";
    return `Imagem cística na região poplítea, com conteúdo ${uniformidade} ${eco}, de aspecto ${homogeneidade}, sem fluxo e sem comunicação com vasos. A referida imagem mede ${l} x ${c} mm (transversal), apresenta debris no interior, e se comunica com a articulação do joelho, compatível com cisto de Baker íntegro.`;
  }

  const limites = m.cistoLimites === "imprecisos" ? "imprecisão de seus limites" : "manutenção de limites precisos";
  const dissecadoRoto = m.cistoDissecadoRoto === "roto" ? "roto" : "dissecado";
  return `Imagem na região poplítea, com conteúdo ${uniformidade} ${eco}, de aspecto ${homogeneidade}, sem fluxo e sem comunicação com vasos, com ${limites}, comunicação com a articulação do joelho e propagação para o plano muscular na panturrilha, sugestivo de cisto de Baker ${dissecadoRoto}.`;
}
function buildCistoConclusao(m) {
  if (m.cistoTipo === "integro") return "Cisto de Baker íntegro.";
  return `Cisto de Baker ${m.cistoDissecadoRoto === "roto" ? "roto" : "dissecado"}.`;
}

function buildHematomaTexto(m) {
  if (m.hematomaModo === "presente") {
    const l = fmtNum(m.hematomaLargura) || "__";
    const c = fmtNum(m.hematomaComprimento) || "__";
    const eco = m.hematomaEcogenicidade === "hipoecoica" ? "hipoecóica" : "anecóica";
    return `Imagem ${eco} entre as fibras musculares da panturrilha, sem fluxo, medindo ${l} x ${c} mm (transversal), com limites precisos e sem comunicação com os vasos tronculares, sugestivo de hematoma muscular.`;
  }
  const localTxt = m.hematomaLocal === "inguinal" ? "inguinal" : `da ${m.hematomaLocal}`;
  const aspecto = m.hematomaAspecto === "cistico" ? "cístico" : "nodular";
  const suspeita = m.hematomaSuspeita === "hematoma" ? "hematoma" : "equimose";
  return `Não foram detectadas imagens de aspecto ${aspecto} em planos subcutâneo e/ou muscular, na região ${localTxt}, subjacente à região de ${suspeita}.`;
}

/* ---------- Blocos por membro ---------- */

function safenaAfetada(m, veia) {
  // veia: "Magna" | "Parva"
  return (
    (m[`flebiteRecente${veia}Ativa`] && m[`flebiteRecente${veia}Segmentos`].length > 0) ||
    (m[`flebiteAntiga${veia}Ativa`] && m[`flebiteAntiga${veia}Segmentos`].length > 0)
  );
}

const G1_SUFFIX =
  "com fluxo espontâneo, fásico aos movimentos respiratórios e aumentado durante manobras de compressão distal, sem imagens de trombos.";
const G2_SUFFIX = "com fluxo espontâneo e aumentado durante manobras de compressão distal, sem imagens de trombos.";

function buildBaselineVeiaLine(itens, sufixoFrase) {
  if (itens.length === 0) return null;
  const plural = itens.length > 1 || itens.some((i) => i.plural);
  const nomes = itens.map((i) => i.label);
  const prefixo = plural ? "Veias" : "Veia";
  const diametroTxt = plural ? "diâmetros normais" : "diâmetro normal";
  return `${prefixo} ${listaFluida(nomes)} apresentando ${diametroTxt}, paredes compressíveis, ${sufixoFrase}`;
}

// Grupo anatômico de cada veia, usado para decidir ANTES de qual linha basal a frase de
// trombose deve entrar (a frase de uma veia trombosada nunca vem depois da linha "normal"
// do mesmo grupo).
const VEIN_GROUP = {
  femoralComum: 1,
  femoralProfunda: 1,
  femoral: 1,
  poplitea: 1,
  tibiaisPosteriores: 2,
  tibialPosterior: 2,
  fibular: 2,
  musculares: 3,
};

function buildAnatomico(m) {
  const lines = [];

  const trR = buildTromboAnatomicoCombinado(m, "tromboRecente", false);
  const trA = buildTromboAnatomicoCombinado(m, "tromboAntiga", true);
  const trREarliestGroup = trR ? Math.min(...m.tromboRecenteVeias.map((v) => VEIN_GROUP[v])) : null;
  const trAEarliestGroup = trA ? Math.min(...m.tromboAntigaVeias.map((v) => VEIN_GROUP[v])) : null;
  function emitTromboSeGrupo(grupo) {
    if (trR && trREarliestGroup === grupo) lines.push(trR);
    if (trA && trAEarliestGroup === grupo) lines.push(trA);
  }

  // GRUPO 1 — femoral comum / femoral profunda / femoral / poplítea.
  emitTromboSeGrupo(1);
  const g1Todos = [
    { key: "femoralComum", label: "femoral comum" },
    { key: "femoralProfunda", label: "femoral profunda" },
    { key: "femoral", label: "femoral" },
    { key: "poplitea", label: "poplítea" },
  ];
  const g1Restantes = g1Todos.filter((v) => !tromboVeinAfetada(m, v.key));
  if (g1Restantes.length === 4) {
    lines.push(
      "Veias femoral comum, femoral profunda, femoral e poplítea apresentando diâmetros normais, paredes compressíveis, com fluxo espontâneo, fásico aos movimentos respiratórios e aumentado durante manobras de compressão distal, sem imagens de trombos."
    );
  } else {
    const linha = buildBaselineVeiaLine(g1Restantes, G1_SUFFIX);
    if (linha) lines.push(linha);
  }

  // GRUPO 2 — tibiais posteriores / fibulares (cede lugar à frase de dificuldade técnica quando ativa).
  emitTromboSeGrupo(2);
  if (m.dificuldadeAtiva) {
    const causaTxt = m.dificuldadeCausa === "profundidade" ? "profundidade dos vasos" : "edema";
    lines.push(
      `Dificuldades técnicas para a avaliação adequada das veias tibiais posteriores e fibulares (${causaTxt}), porém não foram detectados sinais compatíveis com trombose recente nesta topografia.`
    );
  } else {
    const g2Todos = [
      {
        key: "tibiaisGroup",
        label: "tibiais posteriores",
        plural: true,
        afetada: tromboVeinAfetada(m, "tibiaisPosteriores") || tromboVeinAfetada(m, "tibialPosterior"),
      },
      { key: "fibular", label: "fibulares", plural: true, afetada: tromboVeinAfetada(m, "fibular") },
    ];
    const g2Restantes = g2Todos.filter((v) => !v.afetada);
    if (g2Restantes.length === 2) {
      lines.push(
        "Veias tibiais posteriores e fibulares apresentando diâmetros normais, paredes compressíveis, com fluxo espontâneo e aumentado durante manobras de compressão distal, sem imagens de trombos."
      );
    } else {
      const linha = buildBaselineVeiaLine(g2Restantes, G2_SUFFIX);
      if (linha) lines.push(linha);
    }
  }

  // GRUPO 3 — musculares (omite a linha basal se já descritas como trombosadas).
  emitTromboSeGrupo(3);
  if (!tromboVeinAfetada(m, "musculares")) {
    lines.push("Veias musculares gastrocnêmias e soleares compressíveis, sem imagens de trombos no lúmen.");
  }

  // Tromboflebite superficial (safena magna/parva/colaterais) sempre antes da linha basal
  // de safenas, para que a veia acometida não apareça depois da outra descrita como "normal".
  lines.push(...buildFlebiteAnatomico(m, "flebiteRecente", false));
  lines.push(...buildFlebiteAnatomico(m, "flebiteAntiga", true));

  const magnaAfetada = safenaAfetada(m, "Magna");
  const parvaAfetada = safenaAfetada(m, "Parva");
  if (!magnaAfetada && !parvaAfetada) {
    lines.push("Veias safenas magna e parva compressíveis, sem imagens de trombos no lúmen.");
  } else if (magnaAfetada && !parvaAfetada) {
    lines.push("Veia safena parva compressível, sem imagens de trombos no lúmen.");
  } else if (!magnaAfetada && parvaAfetada) {
    lines.push("Veia safena magna compressível, sem imagens de trombos no lúmen.");
  } // se ambas afetadas, a linha basal é omitida (as duas já são descritas pela tromboflebite)

  if (m.cistoAtivo) lines.push(buildCistoTexto(m));
  if (m.hematomaAtivo) lines.push(buildHematomaTexto(m));

  return lines;
}

function buildDoppler(m) {
  const lines = [];
  if (!m.refluxoAtiva || m.refluxoVeias.length === 0) {
    lines.push("Veias profundas tronculares sem refluxo significativo.");
  } else {
    const nomes = m.refluxoVeias.map((v) => REFLUXO_VEIN_LABEL[v]);
    const prefixoVeia = nomes.length > 1 ? "Veias" : "Veia";
    lines.push(`${prefixoVeia} ${listaFluida(nomes)} com refluxo.`);
    if (m.refluxoVeias.length < REFLUXO_VEIN_OPTIONS.length) {
      lines.push("Demais veias visualizadas sem sinais de refluxo significativo.");
    }
  }
  return lines;
}

function buildConclusao(m) {
  const lines = [];

  const magnaAfetada = safenaAfetada(m, "Magna");
  const parvaAfetada = safenaAfetada(m, "Parva");

  const tromboRecenteAtiva = tromboAtivaComDados(m, "tromboRecente");
  const tromboAntigaAtiva = tromboAtivaComDados(m, "tromboAntiga");
  if (!tromboRecenteAtiva && !tromboAntigaAtiva) {
    lines.push("Sistema venoso profundo pérvio, sem sinais de trombose venosa profunda.");
  } else {
    const lr = buildTromboConclusaoLinha(m, "tromboRecente", false);
    if (lr) lines.push(lr);
    const la = buildTromboConclusaoLinha(m, "tromboAntiga", true);
    if (la) lines.push(la);
    const complemento = buildTromboComplementoLinha(m);
    if (complemento) lines.push(complemento);
  }

  if (!m.refluxoAtiva || m.refluxoVeias.length === 0) {
    lines.push("Veias profundas tronculares sem sinais de insuficiência valvular significativa.");
  } else {
    const segsSet = new Set(m.refluxoVeias.map((v) => REFLUXO_VEIN_TO_SEGMENTO[v]));
    const segs = SEGMENTO_OPTIONS.filter((s) => segsSet.has(s.value)).map((s) => SEGMENTO_LABEL[s.value]);
    const prefixoSeg = segs.length > 1 ? "Segmentos" : "Segmento";
    lines.push(`${prefixoSeg} ${listaFluida(segs)} com sinais de insuficiência valvular.`);
  }

  const muscularesTrombosadas = tromboVeinAfetada(m, "musculares");
  if (!muscularesTrombosadas) {
    lines.push("Veias musculares gastrocnêmias e soleares pérvias.");
  }

  if (!magnaAfetada && !parvaAfetada) {
    lines.push("Veias safenas magna e parva pérvias.");
  } else if (magnaAfetada && !parvaAfetada) {
    lines.push("Veia safena parva pérvia.");
  } else if (!magnaAfetada && parvaAfetada) {
    lines.push("Veia safena magna pérvia.");
  }

  lines.push(...buildFlebiteConclusao(m, "flebiteRecente", false));
  lines.push(...buildFlebiteConclusao(m, "flebiteAntiga", true));

  if (m.dificuldadeAtiva) {
    lines.push(
      "Dificuldades técnicas para o estudo do segmento poplíteo-podal, porém sem sinais detectáveis de trombose recente nesta topografia."
    );
  }

  if (m.cistoAtivo) lines.push(buildCistoConclusao(m));
  if (m.hematomaAtivo && m.hematomaModo === "presente") lines.push("Hematoma muscular.");

  return lines;
}

function buildMemberReport(side, member) {
  return {
    side,
    member,
    anatomico: [`MEMBRO INFERIOR ${SIDE_LABEL[side]}`, "", ...buildAnatomico(member)],
    doppler: [
      "DOPPLER: Avaliação hemodinâmica ao ortostatismo (Doppler colorido e análise espectral):",
      "",
      ...buildDoppler(member),
    ],
    conclusao: [`MEMBRO INFERIOR ${SIDE_LABEL[side]}`, "", ...buildConclusao(member)],
  };
}

function getActiveSides(state) {
  const sides = [];
  if (state.D.incluir) sides.push("D");
  if (state.E.incluir) sides.push("E");
  return sides;
}
function buildFullReportBlocks(state) {
  return getActiveSides(state).map((s) => buildMemberReport(s, state[s]));
}
function reportTitle(state) {
  const sides = getActiveSides(state);
  if (sides.length === 2) return "SISTEMA VENOSO PROFUNDO DOS MEMBROS INFERIORES";
  if (sides.length === 1) return `SISTEMA VENOSO PROFUNDO DO MEMBRO INFERIOR ${SIDE_LABEL[sides[0]]}`;
  return "SISTEMA VENOSO PROFUNDO DOS MEMBROS INFERIORES";
}
function introTexto(state) {
  const sides = getActiveSides(state);
  const bilateral = sides.length === 2 ? "bilateralmente" : "unilateralmente";
  return `Avaliação anatômica e hemodinâmica das veias profundas tronculares e veias musculares, ${bilateral}.`;
}

/* ============================================================
   COMPONENTES DE UI BÁSICOS (mesma linguagem visual do Mapeamento Venoso)
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
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>
            O(s) segmento(s) da conclusão (fêmoro-poplíteo / poplíteo-podal) são definidos automaticamente
            conforme a(s) veia(s) marcada(s) acima.
          </div>
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

function FlebiteBlock({ data, set, prefix, tipoLabel, isAntiga }) {
  const magnaAtiva = data[`${prefix}MagnaAtiva`];
  const parvaAtiva = data[`${prefix}ParvaAtiva`];
  const colateralAtiva = data[`${prefix}ColateralAtiva`];
  const algumaAtiva = magnaAtiva || parvaAtiva || colateralAtiva;

  return (
    <>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>
        Tromboflebite superficial {tipoLabel}
      </div>

      <Toggle
        checked={magnaAtiva}
        onChange={set(`${prefix}MagnaAtiva`)}
        label="Veia safena magna"
      />
      {magnaAtiva && (
        <Row>
          <Label>Segmento(s)</Label>
          <PillGroup
            options={SEGMENT_OPTIONS_MAGNA}
            value={data[`${prefix}MagnaSegmentos`]}
            onChange={set(`${prefix}MagnaSegmentos`)}
            multi
          />
        </Row>
      )}

      <Toggle
        checked={parvaAtiva}
        onChange={set(`${prefix}ParvaAtiva`)}
        label="Veia safena parva"
      />
      {parvaAtiva && (
        <Row>
          <Label>Segmento(s)</Label>
          <PillGroup
            options={SEGMENT_OPTIONS_PARVA}
            value={data[`${prefix}ParvaSegmentos`]}
            onChange={set(`${prefix}ParvaSegmentos`)}
            multi
          />
        </Row>
      )}

      <Toggle
        checked={colateralAtiva}
        onChange={set(`${prefix}ColateralAtiva`)}
        label="Veias colaterais superficiais"
      />
      {colateralAtiva && (
        <>
          <Row>
            <Label>Face(s)</Label>
            <PillGroup
              options={FACE_OPTIONS}
              value={data[`${prefix}ColateralFaces`]}
              onChange={set(`${prefix}ColateralFaces`)}
              multi
            />
          </Row>
          <Row>
            <Label>Segmento(s)</Label>
            <PillGroup
              options={SEGMENT_OPTIONS}
              value={data[`${prefix}ColateralLocais`]}
              onChange={set(`${prefix}ColateralLocais`)}
              multi
            />
          </Row>
        </>
      )}
      {isAntiga && algumaAtiva && (
        <>
          <DescritorAntigoControl value={data.descritorAntigo} onChange={set("descritorAntigo")} />
          <RecanalizacaoAntigoControl value={data.recanalizacaoAntigo} onChange={set("recanalizacaoAntigo")} />
        </>
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

      <Section title="Tromboflebite superficial" defaultOpen={false}>
        <FlebiteBlock data={data} set={set} prefix="flebiteRecente" tipoLabel="recente" />
        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "12px 0" }} />
        <FlebiteBlock data={data} set={set} prefix="flebiteAntiga" tipoLabel="antiga" isAntiga />
      </Section>

      <Section title="Refluxo / insuficiência valvular" defaultOpen={false}>
        <Toggle checked={data.refluxoAtiva} onChange={set("refluxoAtiva")} label="Veias profundas com refluxo" />
        {data.refluxoAtiva && (
          <div style={{ marginTop: 4, paddingLeft: 4 }}>
            <Row>
              <Label>Veia(s) com refluxo</Label>
              <PillGroup options={REFLUXO_VEIN_OPTIONS} value={data.refluxoVeias} onChange={set("refluxoVeias")} multi />
            </Row>
            <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>
              O(s) segmento(s) da conclusão (fêmoro-poplíteo / poplíteo-podal) são definidos automaticamente
              conforme a(s) veia(s) marcada(s) acima.
            </div>
          </div>
        )}
      </Section>

      <Section title="Achados adicionais" defaultOpen={false}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>
          Dificuldades técnicas
        </div>
        <Toggle
          checked={data.dificuldadeAtiva}
          onChange={set("dificuldadeAtiva")}
          label="Tibiais posteriores / fibulares"
          description="Substitui a descrição padrão dessas veias e acrescenta observação na conclusão"
        />
        {data.dificuldadeAtiva && (
          <Row>
            <Label>Causa</Label>
            <PillGroup
              options={[
                { value: "edema", label: "edema" },
                { value: "profundidade", label: "profundidade dos vasos" },
              ]}
              value={data.dificuldadeCausa}
              onChange={set("dificuldadeCausa")}
            />
          </Row>
        )}

        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "12px 0" }} />

        <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>
          Cisto de Baker
        </div>
        <Toggle checked={data.cistoAtivo} onChange={set("cistoAtivo")} label="Presença de cisto de Baker" />
        {data.cistoAtivo && (
          <div style={{ marginTop: 4, paddingLeft: 4 }}>
            <Row>
              <PillGroup
                options={[
                  { value: "integro", label: "íntegro" },
                  { value: "roto", label: "dissecado / roto" },
                ]}
                value={data.cistoTipo}
                onChange={set("cistoTipo")}
              />
            </Row>
            <Row>
              <Label>Distribuição</Label>
              <PillGroup
                options={[
                  { value: "uniformemente", label: "uniformemente" },
                  { value: "predominantemente", label: "predominantemente" },
                ]}
                value={data.cistoUniformidade}
                onChange={set("cistoUniformidade")}
              />
            </Row>
            <Row>
              <Label>Ecogenicidade</Label>
              <PillGroup
                options={[
                  { value: "anecoico", label: "anecóico" },
                  { value: "hipoecoico", label: "hipoecóico" },
                ]}
                value={data.cistoEcogenicidade}
                onChange={set("cistoEcogenicidade")}
              />
            </Row>
            <Row>
              <Label>Aspecto</Label>
              <PillGroup
                options={[
                  { value: "homogeneo", label: "homogêneo" },
                  { value: "heterogeneo", label: "heterogêneo" },
                ]}
                value={data.cistoHomogeneidade}
                onChange={set("cistoHomogeneidade")}
              />
            </Row>
            {data.cistoTipo === "integro" ? (
              <Row>
                <Label>Mede</Label>
                <NumInput value={data.cistoLargura} onChange={set("cistoLargura")} suffix="mm" width={70} />
                <Label>x</Label>
                <NumInput value={data.cistoComprimento} onChange={set("cistoComprimento")} suffix="mm" width={70} />
              </Row>
            ) : (
              <>
                <Row>
                  <Label>Limites</Label>
                  <PillGroup
                    options={[
                      { value: "precisos", label: "manutenção de limites" },
                      { value: "imprecisos", label: "imprecisão nos limites" },
                    ]}
                    value={data.cistoLimites}
                    onChange={set("cistoLimites")}
                  />
                </Row>
                <Row>
                  <Label>Classificação</Label>
                  <PillGroup
                    options={[
                      { value: "dissecado", label: "dissecado" },
                      { value: "roto", label: "roto" },
                    ]}
                    value={data.cistoDissecadoRoto}
                    onChange={set("cistoDissecadoRoto")}
                  />
                </Row>
              </>
            )}
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
                  <Label>Região investigada</Label>
                  <PillGroup
                    options={[
                      { value: "inguinal", label: "inguinal" },
                      { value: "coxa", label: "coxa" },
                      { value: "perna", label: "perna" },
                    ]}
                    value={data.hematomaLocal}
                    onChange={set("hematomaLocal")}
                  />
                </Row>
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
    <div key={key} style={{ color: upper ? COLORS.text : "#C7D2E4", fontWeight: upper ? 700 : 400, marginBottom: 2 }}>
      {line}
    </div>
  );
}

function ReportPreview({ state, patientName, examDate }) {
  const blocks = useMemo(() => buildFullReportBlocks(state), [state]);
  const title = reportTitle(state);

  if (blocks.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>
        Selecione ao menos um membro (Direito e/ou Esquerdo) para começar a gerar o laudo.
      </div>
    );
  }

  let k = 0;
  return (
    <div style={{ fontSize: PREVIEW_SIZE, fontFamily: PREVIEW_FONT, lineHeight: 1.55 }}>
      <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>ECO DOPPLER COLORIDO</div>
      <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>{title}</div>
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
      <div style={{ color: "#C7D2E4", marginBottom: 14 }}>{introTexto(state)}</div>

      {blocks.map((b) => (
        <div key={"membro-" + b.side}>
          {b.anatomico.map((l) => renderLine(l, k++))}
          {b.doppler.map((l) => renderLine(l, k++))}
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
  const { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak } = await import("docx");

  const blocks = buildFullReportBlocks(state);
  const title = reportTitle(state);

  const FONT = "Helvetica Neue";
  const SZ = 24; // 12pt
  const SP = 60;
  const LINE = 240;

  function tr(text, opts = {}) {
    return new TextRun({ text, font: FONT, size: SZ, ...opts });
  }
  function paraText(text) {
    const upper = text === text.toUpperCase() && /[A-Z\u00C0-\u00DA]/.test(text) && !text.startsWith("-");
    return new Paragraph({ spacing: { after: SP }, children: [tr(text, { bold: upper })] });
  }
  function emptyLine() {
    return new Paragraph({ children: [], spacing: { after: LINE } });
  }
  function blockToParagraphs(lines) {
    return lines.map((line) => (line === "" ? new Paragraph({ children: [], spacing: { after: SP } }) : paraText(line)));
  }

  const pageProps = {
    size: { width: 12240, height: 15840 },
    margin: { top: 720, right: 720, bottom: 720, left: 720 },
  };

  const children = [];
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [tr("ECO DOPPLER COLORIDO \u2014 ", { bold: true }), tr(title, { bold: true })],
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
  children.push(new Paragraph({ spacing: { after: SP }, children: [tr(introTexto(state))] }));
  children.push(emptyLine());

  blocks.forEach((b) => {
    children.push(...blockToParagraphs(b.anatomico));
    children.push(...blockToParagraphs(b.doppler));
    children.push(emptyLine());
  });

  children.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );
  children.push(new Paragraph({ spacing: { after: SP }, children: [tr("CONCLUSÃO", { bold: true })] }));
  blocks.forEach((b) => {
    children.push(...blockToParagraphs(b.conclusao));
    children.push(emptyLine());
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 24 } } } },
    sections: [{ properties: { page: pageProps }, children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const sides = getActiveSides(state);
  const sufixoMembro = sides.length === 2 ? "MMII" : sides[0] === "D" ? "VEN MID" : "VEN MIE";
  const nomePaciente = (patientName || "").trim().replace(/[^\wÀ-ÿ\s\-]+/g, "").trim() || "Laudo";
  const nomeArquivo = `${nomePaciente} ${sufixoMembro}`;
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

export default function AppVenosoProfundo() {
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
  const toggleSide = (side) => {
    setState((prev) => ({ ...prev, [side]: { ...prev[side], incluir: !prev[side].incluir } }));
  };
  const resetAll = () => setConfirmReset(true);
  const doReset = () => {
    setState({ D: defaultMemberState(), E: defaultMemberState() });
    setPatientName("");
    setExamDate(todayBR());
    setExamDateISO(new Date().toISOString().split("T")[0]);
    setConfirmReset(false);
  };

  const reportLines = useMemo(() => {
    const blocks = buildFullReportBlocks(state);
    const title = reportTitle(state);
    const lines = ["ECO DOPPLER COLORIDO", title, ""];
    if (patientName.trim()) lines.push(`Paciente: ${patientName.trim()}`, "");
    if (examDate.trim()) lines.push(`Data: ${examDate.trim()}`, "");
    lines.push(introTexto(state), "");
    blocks.forEach((b) => {
      b.anatomico.forEach((l) => lines.push(l));
      b.doppler.forEach((l) => lines.push(l));
      lines.push("");
    });
    lines.push("CONCLUSÃO", "");
    blocks.forEach((b) => {
      b.conclusao.forEach((l) => lines.push(l));
      lines.push("");
    });
    return lines;
  }, [state, patientName, examDate]);

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
      await exportDocx(state, patientName, examDate);
    } catch (e) {
      console.error("Erro ao gerar .docx:", e);
      alert(`Erro ao gerar .docx:\n${e?.message || e}`);
    } finally {
      setExporting(false);
    }
  };

  const sidesActive = (state.D.incluir ? 1 : 0) + (state.E.incluir ? 1 : 0);

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
            <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: 0.2 }}>Venoso Profundo MMII</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>Gerador de laudo · Ecodoppler colorido</div>
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

        {/* SELETOR DE MEMBRO */}
        <div style={{ display: "flex", gap: 8 }}>
          {["D", "E"].map((side) => {
            const included = state[side].incluir;
            return (
              <button
                key={side}
                onClick={() => toggleSide(side)}
                style={{
                  flex: 1,
                  padding: "9px 8px",
                  borderRadius: 8,
                  border: `1.5px solid ${included ? COLORS.accent : COLORS.borderLight}`,
                  background: included ? COLORS.accentDim : "transparent",
                  color: included ? COLORS.accent : COLORS.textMuted,
                  fontWeight: 600,
                  fontSize: 12.5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {included && <Check size={13} />}
                MI {SIDE_LABEL[side]}
              </button>
            );
          })}
        </div>

        {sidesActive > 0 && (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {state.D.incluir && (
              <button onClick={() => setActiveTab("D")} style={tabStyle(activeTab === "D")}>
                Formulário — Direito
              </button>
            )}
            {state.E.incluir && (
              <button onClick={() => setActiveTab("E")} style={tabStyle(activeTab === "E")}>
                Formulário — Esquerdo
              </button>
            )}
          </div>
        )}
      </div>

      {/* CONTEÚDO */}
      {sidesActive === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 4 }}>
            Selecione o(s) membro(s) a laudar acima para começar.
          </div>
        </div>
      ) : (
        <div style={{ padding: "14px 14px 100px 14px" }}>
          {!mobilePreview ? (
            <MemberForm data={state[activeTab]} update={(updater) => updateSide(activeTab, updater)} />
          ) : (
            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
              <ReportPreview state={state} patientName={patientName} examDate={examDate} />
            </div>
          )}
        </div>
      )}

      {/* BARRA INFERIOR FIXA */}
      {sidesActive > 0 && (
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
      )}

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
