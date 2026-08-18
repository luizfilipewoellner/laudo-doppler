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
   MOTOR DE GERAÇÃO DE LAUDO — VENOSO PROFUNDO MMSS
   ============================================================ */

const SIDE_LABEL = { D: "DIREITO", E: "ESQUERDO" };

// Segmentos genéricos do membro superior (usados nas veias superficiais)
const SEGMENT_OPTIONS = [
  { value: "antebracoDistal", label: "antebraço distal" },
  { value: "antebracoMedio", label: "antebraço médio" },
  { value: "antebracoProximal", label: "antebraço proximal" },
  { value: "cotovelo", label: "cotovelo" },
  { value: "bracoDistal", label: "braço distal" },
  { value: "bracoMedio", label: "braço médio" },
  { value: "bracoProximal", label: "braço proximal" },
];
const SEG_LABEL = Object.fromEntries(SEGMENT_OPTIONS.map((s) => [s.value, s.label]));

// Segmentos para a veia cefálica (inclui o sulco deltopeitoral, ponto de junção com o sistema
// profundo — análogo à "croça" da safena magna) e para a veia basílica (inclui o hiato do braço,
// ponto em que a basílica perfura a fáscia profunda para se juntar às veias braquiais).
const SEGMENT_OPTIONS_CEFALICA = [{ value: "deltopeitoral", label: "sulco deltopeitoral" }, ...SEGMENT_OPTIONS];
const SEGMENT_OPTIONS_BASILICA = [{ value: "hiato", label: "hiato do braço" }, ...SEGMENT_OPTIONS];
const SEG_LABEL_JUNCAO_CEFALICA = { deltopeitoral: "sulco deltopeitoral", ...SEG_LABEL };
const SEG_LABEL_JUNCAO_BASILICA = { hiato: "hiato do braço", ...SEG_LABEL };

// Veias para trombose profunda (anatômico, uma linha por veia selecionada), em ordem proximal → distal
const VEIN_OPTIONS = [
  { value: "braquiocefalica", label: "braquiocefálica" },
  { value: "jugularInterna", label: "jugular interna" },
  { value: "subclavia", label: "subclávia" },
  { value: "axilar", label: "axilar" },
  { value: "braquial", label: "braquiais" },
  { value: "radial", label: "radiais" },
  { value: "ulnar", label: "ulnares" },
];
const VEIN_LABEL = Object.fromEntries(VEIN_OPTIONS.map((v) => [v.value, v.label]));
// Nome de cada veia tal como entra na frase combinada ("Veias X, Y e Z dilatadas...") — formas
// singular e plural, escolhidas conforme a quantidade de veias do par acometidas (1 ou 2).
const VEIN_LIST_LABEL_SINGULAR = {
  braquiocefalica: "braquiocefálica",
  jugularInterna: "jugular interna",
  subclavia: "subclávia",
  axilar: "axilar",
  braquial: "braquial",
  radial: "radial",
  ulnar: "ulnar",
};
const VEIN_LIST_LABEL_PLURAL = {
  braquial: "braquiais",
  radial: "radiais",
  ulnar: "ulnares",
};
// Veias braquiais, radiais e ulnares são sempre pares (venae comitantes) — o exame pode
// identificar acometimento de apenas uma das duas ou de ambas (ver *QtdPares no estado do membro).
const PARES_VEIAS = new Set(["braquial", "radial", "ulnar"]);
// Ordem de importância anatômica: braquiocefálica -> jugular interna -> subclávia -> axilar ->
// braquial -> radial -> ulnar. Usada para ordenar a frase combinada de trombose, independentemente
// da ordem em que as veias foram marcadas.
const VEIN_ORDER = ["braquiocefalica", "jugularInterna", "subclavia", "axilar", "braquial", "radial", "ulnar"];
function ordenarVeiasPorImportancia(veias) {
  return [...veias].sort((a, b) => VEIN_ORDER.indexOf(a) - VEIN_ORDER.indexOf(b));
}

// Segmentos do membro superior citados na conclusão (trombose por extensão / insuficiência
// valvular / dificuldades técnicas).
const SEGMENTO_OPTIONS = [
  { value: "toracico", label: "torácico" },
  { value: "cervical", label: "cervical" },
  { value: "braco", label: "de braço" },
  { value: "antebraco", label: "de antebraço" },
];
const SEGMENTO_LABEL = Object.fromEntries(SEGMENTO_OPTIONS.map((s) => [s.value, s.label]));
// Mapeamento de cada veia para o segmento correspondente: torácico (tronco braquiocefálico e
// subclávia), cervical (jugular), de braço (axilar e braquiais), de antebraço (radiais e ulnares).
const TROMBO_VEIN_TO_SEGMENTO = {
  braquiocefalica: "toracico",
  subclavia: "toracico",
  jugularInterna: "cervical",
  axilar: "braco",
  braquial: "braco",
  radial: "antebraco",
  ulnar: "antebraco",
};

// Zonas de dificuldade técnica — multisseleção independente da causa (edema / profundidade)
const DIFICULDADE_ZONA_OPTIONS = [
  { value: "radiaisUlnares", label: "radiais/ulnares" },
  { value: "axilaresBraquiais", label: "axilares/braquiais" },
  { value: "troncoBraquiocefalicoSubclavia", label: "tronco braquiocefálico/subclávia" },
];
const DIFICULDADE_ZONA_SEGMENTO = {
  radiaisUlnares: "antebraco",
  axilaresBraquiais: "braco",
  troncoBraquiocefalicoSubclavia: "toracico",
};

// Localização do hematoma: região(ões) e face(s), ambas com multisseleção
const HEMATOMA_REGIAO_OPTIONS = [
  { value: "axilar", label: "axilar" },
  { value: "braco", label: "braço" },
  { value: "antebraco", label: "antebraço" },
];
const HEMATOMA_REGIAO_LABEL = Object.fromEntries(HEMATOMA_REGIAO_OPTIONS.map((r) => [r.value, r.label]));
const HEMATOMA_FACE_OPTIONS = [
  { value: "anterior", label: "anterior" },
  { value: "posterior", label: "posterior" },
  { value: "medial", label: "medial" },
  { value: "lateral", label: "lateral" },
];
const HEMATOMA_FACE_LABEL = Object.fromEntries(HEMATOMA_FACE_OPTIONS.map((f) => [f.value, f.label]));

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

    dificuldadeZonas: [], // radiaisUlnares | axilaresBraquiais | troncoBraquiocefalicoSubclavia — multisseleção
    dificuldadeCausa: "edema", // edema | profundidade

    tromboRecenteAtiva: false,
    tromboRecenteVeias: [],
    tromboRecenteQtdPares: { braquial: 2, radial: 2, ulnar: 2 }, // 1 ou 2 veias acometidas do par

    tromboAntigaAtiva: false,
    tromboAntigaVeias: [],
    tromboAntigaQtdPares: { braquial: 2, radial: 2, ulnar: 2 },

    descritorAntigo: "compativel", // compativel | sugestivo — usado nos achados "antigos" (trombose e tromboflebite)
    recanalizacaoAntigo: "parcial", // total | parcial | nenhuma — usado nos achados "antigos" (trombose e tromboflebite)

    flebiteRecenteCefalicaAtiva: false,
    flebiteRecenteCefalicaSegmentos: [],
    flebiteRecenteBasilicaAtiva: false,
    flebiteRecenteBasilicaSegmentos: [],

    flebiteAntigaCefalicaAtiva: false,
    flebiteAntigaCefalicaSegmentos: [],
    flebiteAntigaBasilicaAtiva: false,
    flebiteAntigaBasilicaSegmentos: [],

    hematomaAtivo: false,
    hematomaModo: "presente", // presente | ausente
    hematomaEcogenicidade: "anecoica", // anecoica | hipoecoica (para "presente")
    hematomaLargura: "",
    hematomaComprimento: "",
    hematomaLocais: ["antebraco"], // axilar | braco | antebraco — multisseleção (presente e ausente)
    hematomaFaces: [], // anterior | posterior | medial | lateral — multisseleção (aplica-se a braço/antebraço)
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
// com concordância singular/plural conforme a quantidade — para veias pareadas (braquial/radial/
// ulnar), a concordância também depende de quantas das duas veias do par foram marcadas.
function buildTromboAnatomicoCombinado(m, prefix, isAntiga) {
  if (!tromboAtivaComDados(m, prefix)) return null;
  const veias = ordenarVeiasPorImportancia(m[`${prefix}Veias`]);
  const qtdPares = m[`${prefix}QtdPares`] || {};

  const imgTxt = isAntiga
    ? `${recanalizacaoImgDetalhe(m.recanalizacaoAntigo)}, ${descritorTexto(m.descritorAntigo)} trombose venosa profunda antiga ${recanalizacaoLabel(m.recanalizacaoAntigo)}`
    : "imagens ecogênicas na luz do vaso, compatível com trombose venosa profunda recente";

  // Caso especial: apenas uma veia pareada isolada, com apenas uma das duas (1) acometida.
  if (veias.length === 1 && PARES_VEIAS.has(veias[0]) && (qtdPares[veias[0]] || 2) === 1) {
    const compress = isAntiga ? recanalizacaoCompress(m.recanalizacaoAntigo, false) : "incompressível, sem fluxo";
    return `Uma das veias ${VEIN_LIST_LABEL_PLURAL[veias[0]]} dilatada, ${compress} e ${imgTxt}.`;
  }

  const totalVasos = veias.reduce((sum, v) => sum + (PARES_VEIAS.has(v) ? qtdPares[v] || 2 : 1), 0);
  const plural = totalVasos > 1;
  const nomes = veias.map((v) => {
    if (!PARES_VEIAS.has(v)) return VEIN_LIST_LABEL_SINGULAR[v];
    return (qtdPares[v] || 2) === 1 ? VEIN_LIST_LABEL_SINGULAR[v] : VEIN_LIST_LABEL_PLURAL[v];
  });
  const prefixo = plural ? "Veias" : "Veia";
  const dilatadaTxt = plural ? "dilatadas" : "dilatada";
  const compress = isAntiga
    ? recanalizacaoCompress(m.recanalizacaoAntigo, plural)
    : plural
    ? "incompressíveis, sem fluxo"
    : "incompressível, sem fluxo";

  return `${prefixo} ${listaFluida(nomes)} ${dilatadaTxt}, ${compress} e ${imgTxt}.`;
}

// Conclusão resumida por segmento (torácico / cervical / de braço / de antebraço), derivada
// automaticamente das veias marcadas — não é mais um campo separado.
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
// os quatro segmentos (torácico, cervical, de braço e de antebraço), pois não sobra nenhum
// segmento "demais".
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

  if (m[`${prefix}CefalicaAtiva`] && m[`${prefix}CefalicaSegmentos`].length > 0) {
    const segs = m[`${prefix}CefalicaSegmentos`].map((s) => SEG_LABEL_JUNCAO_CEFALICA[s]);
    lines.push(`Veia cefálica, ${segListText(segs)}, dilatada, ${compressSing} e ${imgTxt}.`);
  }
  if (m[`${prefix}BasilicaAtiva`] && m[`${prefix}BasilicaSegmentos`].length > 0) {
    const segs = m[`${prefix}BasilicaSegmentos`].map((s) => SEG_LABEL_JUNCAO_BASILICA[s]);
    lines.push(`Veia basílica, ${segListText(segs)}, dilatada, ${compressSing} e ${imgTxt}.`);
  }

  return lines;
}

function buildFlebiteConclusao(m, prefix, isAntiga) {
  const lines = [];
  const tipoTxt = isAntiga ? "antiga" : "recente";
  const sufixo = isAntiga ? `, ${recanalizacaoLabel(m.recanalizacaoAntigo)}` : "";

  if (m[`${prefix}CefalicaAtiva`] && m[`${prefix}CefalicaSegmentos`].length > 0) {
    lines.push(`Tromboflebite superficial ${tipoTxt} na veia cefálica${sufixo}.`);
  }
  if (m[`${prefix}BasilicaAtiva`] && m[`${prefix}BasilicaSegmentos`].length > 0) {
    lines.push(`Tromboflebite superficial ${tipoTxt} na veia basílica${sufixo}.`);
  }

  return lines;
}

/* ---------- Hematoma ---------- */

// Monta a cláusula de localização a partir das regiões (axilar/braço/antebraço) e faces
// (anterior/posterior/medial/lateral) selecionadas — ambas com multisseleção. A face só se aplica
// a braço/antebraço; a região axilar entra como cláusula própria, sem face.
function buildHematomaLocalizacaoTexto(m) {
  const locais = m.hematomaLocais || [];
  const faces = m.hematomaFaces || [];
  const faceLabels = faces.map((f) => HEMATOMA_FACE_LABEL[f]);
  const parts = [];

  if (locais.includes("axilar")) parts.push("na região axilar");

  ["braco", "antebraco"].forEach((r) => {
    if (!locais.includes(r)) return;
    if (faceLabels.length > 0) {
      parts.push(`na${faceLabels.length > 1 ? "s faces" : " face"} ${listaFluida(faceLabels)} do ${HEMATOMA_REGIAO_LABEL[r]}`);
    } else {
      parts.push(`na região do ${HEMATOMA_REGIAO_LABEL[r]}`);
    }
  });

  if (parts.length === 0) return "na região investigada";
  return listaFluida(parts);
}

function buildHematomaTexto(m) {
  const localizacaoTxt = buildHematomaLocalizacaoTexto(m);
  if (m.hematomaModo === "presente") {
    const l = fmtNum(m.hematomaLargura) || "__";
    const c = fmtNum(m.hematomaComprimento) || "__";
    const eco = m.hematomaEcogenicidade === "hipoecoica" ? "hipoecóica" : "anecóica";
    return `Imagem ${eco} entre as fibras musculares, ${localizacaoTxt}, sem fluxo, medindo ${l} x ${c} mm (transversal), com limites precisos e sem comunicação com os vasos tronculares, sugestivo de hematoma muscular.`;
  }
  const aspecto = m.hematomaAspecto === "cistico" ? "cístico" : "nodular";
  const suspeita = m.hematomaSuspeita === "hematoma" ? "hematoma" : "equimose";
  return `Não foram detectadas imagens de aspecto ${aspecto} em planos subcutâneo e/ou muscular, ${localizacaoTxt}, subjacente à região de ${suspeita}.`;
}
function buildHematomaConclusao(m) {
  if (m.hematomaModo === "presente") return "Hematoma muscular.";
  return null;
}

/* ---------- Blocos por membro ---------- */

function safenaAfetada(m, veia) {
  // veia: "Cefalica" | "Basilica"
  return (
    (m[`flebiteRecente${veia}Ativa`] && m[`flebiteRecente${veia}Segmentos`].length > 0) ||
    (m[`flebiteAntiga${veia}Ativa`] && m[`flebiteAntiga${veia}Segmentos`].length > 0)
  );
}

const G1_SUFFIX = "com fluxo espontâneo, fásico aos movimentos respiratórios, sem imagens de trombos.";
const G2_SUFFIX = "com fluxo espontâneo, sem imagens de trombos.";

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
// do mesmo grupo). 1=torácico, 2=cervical, 3=de braço, 4=de antebraço.
const VEIN_GROUP = {
  braquiocefalica: 1,
  subclavia: 1,
  jugularInterna: 2,
  axilar: 3,
  braquial: 3,
  radial: 4,
  ulnar: 4,
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

  const zonas = new Set(m.dificuldadeZonas || []);
  const causaTxt = m.dificuldadeCausa === "profundidade" ? "profundidade dos vasos" : "edema";

  // SUBGRUPO 1 — tronco braquiocefálico / subclávia (segmento torácico).
  emitTromboSeGrupo(1);
  if (zonas.has("troncoBraquiocefalicoSubclavia")) {
    lines.push(
      `Dificuldades técnicas para a avaliação adequada das veias braquiocefálica e subclávia (${causaTxt}), porém não foram detectados sinais compatíveis com trombose recente nesta topografia.`
    );
  } else {
    const itens1 = [
      { key: "braquiocefalica", label: "braquiocefálica" },
      { key: "subclavia", label: "subclávia" },
    ].filter((v) => !tromboVeinAfetada(m, v.key));
    if (itens1.length === 2) {
      lines.push(
        "Veias braquiocefálica e subclávia apresentando diâmetros normais, paredes compressíveis, com fluxo espontâneo, fásico aos movimentos respiratórios, sem imagens de trombos."
      );
    } else {
      const linha = buildBaselineVeiaLine(itens1, G1_SUFFIX);
      if (linha) lines.push(linha);
    }
  }

  // SUBGRUPO 2 — jugular interna (segmento cervical). Sem zona de dificuldade própria.
  emitTromboSeGrupo(2);
  {
    const itens2 = [{ key: "jugularInterna", label: "jugular interna" }].filter((v) => !tromboVeinAfetada(m, v.key));
    const linha = buildBaselineVeiaLine(itens2, G1_SUFFIX);
    if (linha) lines.push(linha);
  }

  // SUBGRUPO 3 — axilar / braquiais (segmento de braço).
  emitTromboSeGrupo(3);
  if (zonas.has("axilaresBraquiais")) {
    lines.push(
      `Dificuldades técnicas para a avaliação adequada das veias axilar e braquiais (${causaTxt}), porém não foram detectados sinais compatíveis com trombose recente nesta topografia.`
    );
  } else {
    const itens3 = [
      { key: "axilar", label: "axilar" },
      { key: "braquial", label: "braquiais", plural: true },
    ].filter((v) => !tromboVeinAfetada(m, v.key));
    if (itens3.length === 2) {
      lines.push(
        "Veias axilar e braquiais apresentando diâmetros normais, paredes compressíveis, com fluxo espontâneo, fásico aos movimentos respiratórios, sem imagens de trombos."
      );
    } else {
      const linha = buildBaselineVeiaLine(itens3, G1_SUFFIX);
      if (linha) lines.push(linha);
    }
  }

  // SUBGRUPO 4 — radiais / ulnares (segmento de antebraço).
  emitTromboSeGrupo(4);
  if (zonas.has("radiaisUlnares")) {
    lines.push(
      `Dificuldades técnicas para a avaliação adequada das veias radiais e ulnares (${causaTxt}), porém não foram detectados sinais compatíveis com trombose recente nesta topografia.`
    );
  } else {
    const itens4 = [
      { key: "radial", label: "radiais", plural: true },
      { key: "ulnar", label: "ulnares", plural: true },
    ].filter((v) => !tromboVeinAfetada(m, v.key));
    if (itens4.length === 2) {
      lines.push(
        "Veias radiais e ulnares apresentando diâmetros normais, paredes compressíveis, com fluxo espontâneo, sem imagens de trombos."
      );
    } else {
      const linha = buildBaselineVeiaLine(itens4, G2_SUFFIX);
      if (linha) lines.push(linha);
    }
  }

  // Tromboflebite superficial (cefálica/basílica) sempre antes da linha basal de veias
  // superficiais, para que a veia acometida não apareça depois da outra descrita como "normal".
  lines.push(...buildFlebiteAnatomico(m, "flebiteRecente", false));
  lines.push(...buildFlebiteAnatomico(m, "flebiteAntiga", true));

  const cefalicaAfetada = safenaAfetada(m, "Cefalica");
  const basilicaAfetada = safenaAfetada(m, "Basilica");
  if (!cefalicaAfetada && !basilicaAfetada) {
    lines.push("Veias cefálica e basílica compressíveis, sem imagens de trombos no lúmen.");
  } else if (cefalicaAfetada && !basilicaAfetada) {
    lines.push("Veia basílica compressível, sem imagens de trombos no lúmen.");
  } else if (!cefalicaAfetada && basilicaAfetada) {
    lines.push("Veia cefálica compressível, sem imagens de trombos no lúmen.");
  } // se ambas afetadas, a linha basal é omitida (as duas já são descritas pela tromboflebite)

  if (m.hematomaAtivo) lines.push(buildHematomaTexto(m));

  return lines;
}

function buildConclusao(m) {
  const lines = [];

  const cefalicaAfetada = safenaAfetada(m, "Cefalica");
  const basilicaAfetada = safenaAfetada(m, "Basilica");

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

  if (!cefalicaAfetada && !basilicaAfetada) {
    lines.push("Veias cefálica e basílica pérvias.");
  } else if (cefalicaAfetada && !basilicaAfetada) {
    lines.push("Veia basílica pérvia.");
  } else if (!cefalicaAfetada && basilicaAfetada) {
    lines.push("Veia cefálica pérvia.");
  }

  lines.push(...buildFlebiteConclusao(m, "flebiteRecente", false));
  lines.push(...buildFlebiteConclusao(m, "flebiteAntiga", true));

  if ((m.dificuldadeZonas || []).length > 0) {
    const segsSet = new Set(m.dificuldadeZonas.map((z) => DIFICULDADE_ZONA_SEGMENTO[z]));
    const segs = SEGMENTO_OPTIONS.filter((s) => segsSet.has(s.value)).map((s) => SEGMENTO_LABEL[s.value]);
    const plural = segs.length > 1;
    lines.push(
      `Dificuldades técnicas para o estudo do${plural ? "s" : ""} segmento${plural ? "s" : ""} ${listaFluida(segs)}, porém sem sinais detectáveis de trombose recente nesta topografia.`
    );
  }

  const hematomaConc = m.hematomaAtivo ? buildHematomaConclusao(m) : null;
  if (hematomaConc) lines.push(hematomaConc);

  return lines;
}

function buildMemberReport(side, member) {
  return {
    side,
    member,
    anatomico: [`MEMBRO SUPERIOR ${SIDE_LABEL[side]}`, "", ...buildAnatomico(member)],
    conclusao: [`MEMBRO SUPERIOR ${SIDE_LABEL[side]}`, "", ...buildConclusao(member)],
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
  if (sides.length === 2) return "SISTEMA VENOSO DOS MEMBROS SUPERIORES BILATERALMENTE";
  if (sides.length === 1) return `SISTEMA VENOSO DO MEMBRO SUPERIOR ${SIDE_LABEL[sides[0]]}`;
  return "SISTEMA VENOSO DOS MEMBROS SUPERIORES BILATERALMENTE";
}
function introTexto(state) {
  const sides = getActiveSides(state);
  const bilateral = sides.length === 2 ? "bilateralmente" : "unilateralmente";
  return `Avaliação anatômica e hemodinâmica das veias profundas tronculares, ${bilateral}.`;
}

/* ============================================================
   COMPONENTES DE UI BÁSICOS (mesma linguagem visual do Mapeamento Venoso)
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

function TromboBlock({ data, set, prefix, tipoLabel, isAntiga }) {
  const ativa = data[`${prefix}Ativa`];
  const veias = data[`${prefix}Veias`];
  const qtdPares = data[`${prefix}QtdPares`] || {};
  const setQtdPar = (veinKey) => (val) => set(`${prefix}QtdPares`)({ ...qtdPares, [veinKey]: val });

  return (
    <>
      <Toggle checked={ativa} onChange={set(`${prefix}Ativa`)} label={`Trombose venosa profunda ${tipoLabel}`} />
      {ativa && (
        <div style={{ marginTop: 4, paddingLeft: 4 }}>
          <Row>
            <Label>Veia(s) acometida(s)</Label>
            <PillGroup options={VEIN_OPTIONS} value={veias} onChange={set(`${prefix}Veias`)} multi />
          </Row>
          {veias.filter((v) => PARES_VEIAS.has(v)).map((v) => (
            <Row key={v}>
              <Label>Quantidade — {VEIN_LIST_LABEL_PLURAL[v]}</Label>
              <PillGroup
                options={[
                  { value: 1, label: "1 veia" },
                  { value: 2, label: "2 veias" },
                ]}
                value={qtdPares[v] || 2}
                onChange={setQtdPar(v)}
              />
            </Row>
          ))}
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>
            O(s) segmento(s) da conclusão (torácico / cervical / de braço / de antebraço) são
            definidos automaticamente conforme a(s) veia(s) marcada(s) acima.
          </div>
          {isAntiga && (
            <>
              <DescritorAntigoControl value={data.descritorAntigo} onChange={set("descritorAntigo")} />
              <RecanalizacaoAntigoControl value={data.recanalizacaoAntigo} onChange={set("recanalizacaoAntigo")} />
            </>
          )}
        </div>
      )}
    </>
  );
}

function FlebiteBlock({ data, set, prefix, tipoLabel, isAntiga }) {
  const cefalicaAtiva = data[`${prefix}CefalicaAtiva`];
  const basilicaAtiva = data[`${prefix}BasilicaAtiva`];
  const algumaAtiva = cefalicaAtiva || basilicaAtiva;

  return (
    <>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>
        Tromboflebite superficial {tipoLabel}
      </div>

      <Toggle
        checked={cefalicaAtiva}
        onChange={set(`${prefix}CefalicaAtiva`)}
        label="Veia cefálica"
      />
      {cefalicaAtiva && (
        <Row>
          <Label>Segmento(s)</Label>
          <PillGroup
            options={SEGMENT_OPTIONS_CEFALICA}
            value={data[`${prefix}CefalicaSegmentos`]}
            onChange={set(`${prefix}CefalicaSegmentos`)}
            multi
          />
        </Row>
      )}

      <Toggle
        checked={basilicaAtiva}
        onChange={set(`${prefix}BasilicaAtiva`)}
        label="Veia basílica"
      />
      {basilicaAtiva && (
        <Row>
          <Label>Segmento(s)</Label>
          <PillGroup
            options={SEGMENT_OPTIONS_BASILICA}
            value={data[`${prefix}BasilicaSegmentos`]}
            onChange={set(`${prefix}BasilicaSegmentos`)}
            multi
          />
        </Row>
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
        <TromboBlock data={data} set={set} prefix="tromboRecente" tipoLabel="recente" />
        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "12px 0" }} />
        <TromboBlock data={data} set={set} prefix="tromboAntiga" tipoLabel="antiga" isAntiga />
      </Section>

      <Section title="Tromboflebite superficial" defaultOpen={false}>
        <FlebiteBlock data={data} set={set} prefix="flebiteRecente" tipoLabel="recente" />
        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "12px 0" }} />
        <FlebiteBlock data={data} set={set} prefix="flebiteAntiga" tipoLabel="antiga" isAntiga />
      </Section>

      <Section title="Achados adicionais" defaultOpen={false}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>
          Dificuldades técnicas
        </div>
        <Row>
          <Label>Zona(s) com dificuldade</Label>
          <PillGroup options={DIFICULDADE_ZONA_OPTIONS} value={data.dificuldadeZonas} onChange={set("dificuldadeZonas")} multi />
        </Row>
        {data.dificuldadeZonas.length > 0 && (
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
              <Label>Região investigada</Label>
              <PillGroup
                options={HEMATOMA_REGIAO_OPTIONS}
                value={data.hematomaLocais}
                onChange={set("hematomaLocais")}
                multi
              />
            </Row>
            <Row>
              <Label>Face(s) (braço/antebraço)</Label>
              <PillGroup
                options={HEMATOMA_FACE_OPTIONS}
                value={data.hematomaFaces}
                onChange={set("hematomaFaces")}
                multi
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
      <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>ECODOPPLER COLORIDO - {title}</div>
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
      <div style={{ color: "#5C6B85", marginBottom: 14 }}>{introTexto(state)}</div>

      {blocks.map((b) => (
        <div key={"membro-" + b.side}>
          {b.anatomico.map((l) => renderLine(l, k++))}
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
    const memberTitle = `SISTEMA VENOSO DO MEMBRO SUPERIOR ${SIDE_LABEL[block.side]}`;

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [tr("ECODOPPLER COLORIDO - ", { bold: true }), tr(memberTitle, { bold: true })],
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

    // Conteúdo anatômico (mantém o cabeçalho "MEMBRO SUPERIOR X")
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
  const sides = getActiveSides(state);
  const sufixoMembro = sides.length === 2 ? "MMSS" : sides[0] === "D" ? "VEN MSD" : "VEN MSE";
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

export default function AppVenosoMMSS() {
  const [patientName, setPatientName] = useState("");
  const [examDate, setExamDate] = useState(todayBR());
  const [examDateISO, setExamDateISO] = useState(() => new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState("D");
  const [state, setState] = useState({ D: defaultMemberState(), E: defaultMemberState() });
  const [copied, setCopied] = useState(null); // null | "all" | "D" | "E"
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

  const buildReportLines = useCallback((onlySide) => {
    const blocks = buildFullReportBlocks(state).filter((b) => !onlySide || b.side === onlySide);
    const title = onlySide ? `SISTEMA VENOSO DO MEMBRO SUPERIOR ${SIDE_LABEL[onlySide]}` : reportTitle(state);
    const lines = [`ECODOPPLER COLORIDO - ${title}`, ""];
    if (patientName.trim()) lines.push(`Paciente: ${patientName.trim()}`, "");
    if (examDate.trim()) lines.push(`Data: ${examDate.trim()}`, "");
    lines.push(introTexto(state), "");
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

  const buildReportHTML = useCallback((onlySide) => {
    const blocks = buildFullReportBlocks(state).filter((b) => !onlySide || b.side === onlySide);
    const title = onlySide ? `SISTEMA VENOSO DO MEMBRO SUPERIOR ${SIDE_LABEL[onlySide]}` : reportTitle(state);

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
    html += `<p style="${boldStyle}text-align:center;">ECODOPPLER COLORIDO - ${title}</p>`;
    html += `<p style="${pStyle}">&nbsp;</p>`;
    if (patientName.trim()) html += `<p style="${pStyle}"><b>Paciente:</b> ${patientName.trim()}</p>`;
    if (examDate.trim()) {
      html += `<p style="${pStyle}"><b>Data:</b> ${examDate.trim()}</p>`;
      html += `<p style="${pStyle}">&nbsp;</p>`;
    }
    html += `<p style="${pStyle}">${introTexto(state)}</p>`;
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

  const handleCopy = async (onlySide) => {
    const key = onlySide || "all";
    try {
      const html = buildReportHTML(onlySide);
      const text = buildReportLines(onlySide).join("\n");
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
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch (e) {
      try {
        await navigator.clipboard.writeText(buildReportLines(onlySide).join("\n"));
        setCopied(key);
        setTimeout(() => setCopied(null), 1800);
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
            <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: 0.2 }}>Venoso Profundo MMSS</div>
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
                MS {SIDE_LABEL[side]}
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
            onClick={() => handleCopy()}
            style={{
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
            }}
          >
            {copied === "all" ? <Check size={14} color={COLORS.accent} /> : <Copy size={14} />}
            {copied === "all" ? "Copiado" : state.D.incluir && state.E.incluir ? "Copiar Bilateral" : state.D.incluir ? "Copiar MSD" : "Copiar MSE"}
          </button>
          {state.D.incluir && state.E.incluir && (
            <>
              <button
                onClick={() => handleCopy("D")}
                style={{
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
                }}
              >
                {copied === "D" ? <Check size={14} color={COLORS.accent} /> : <Copy size={14} />}
                {copied === "D" ? "Copiado" : "Copiar MSD"}
              </button>
              <button
                onClick={() => handleCopy("E")}
                style={{
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
                }}
              >
                {copied === "E" ? <Check size={14} color={COLORS.accent} /> : <Copy size={14} />}
                {copied === "E" ? "Copiado" : "Copiar MSE"}
              </button>
            </>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              flex: "1 1 110px",
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
