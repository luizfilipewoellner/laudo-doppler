import React, { useState, useMemo, useCallback } from "react";
import {
  ChevronDown,
  Plus,
  Trash2,
  Copy,
  Download,
  Check,
  RotateCcw,
  Stethoscope,
} from "lucide-react";

/* ============================================================
   MOTOR DE GERAÇÃO DE LAUDO
   ============================================================ */

const SIDE_LABEL = { D: "DIREITO", E: "ESQUERDO" };

const SEGMENTS_MAGNA = [
  { key: "croca",     label: "Croça",         header: true  },
  { key: "coxaProx",  label: "Coxa Proximal",  header: true  },
  { key: "coxaMedia", label: "Média",           indent: true  },
  { key: "coxaDistal",label: "Distal",          indent: true  },
  { key: "joelho",    label: "Joelho",          header: true  },
  { key: "pernaProx", label: "Perna Proximal",  header: true  },
  { key: "pernaMedia",label: "Média",           indent: true  },
  { key: "pernaDistal",label: "Distal",         indent: true  },
];

const SEGMENTS_PARVA = [
  { key: "croca",     label: "Croça",         header: true  },
  { key: "pernaProx", label: "Perna Proximal", header: true  },
  { key: "pernaMedia",label: "Média",          indent: true  },
  { key: "pernaDistal",label: "Distal",        indent: true  },
];

const SEGMENT_LOCATION_OPTIONS = [
  { value: "coxaProx", label: "coxa proximal" },
  { value: "coxaMedia", label: "coxa média" },
  { value: "coxaDistal", label: "coxa distal" },
  { value: "joelho", label: "joelho" },
  { value: "pernaProx", label: "perna proximal" },
  { value: "pernaMedia", label: "perna média" },
  { value: "pernaDistal", label: "perna distal" },
];

const SEGMENT_LOCATION_OPTIONS_PARVA = [
  { value: "pernaProx", label: "perna proximal" },
  { value: "pernaMedia", label: "perna média" },
  { value: "pernaDistal", label: "perna distal" },
];

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

function defaultPerfurante() {
  return {
    id: uid(),
    tipo: "direta",
    diametro: "",
    face: "medial",
    localizacao: "coxa",
    refluxo: "sem",
    distanciaPlantar: "",
  };
}

function defaultRefluxoTrecho(defaultSegment) {
  return {
    id: uid(),
    tipo: "crocaSegmento", // difuso | crocaTributaria | crocaSegmento | segmentoIsolado
    segmentoAte: [defaultSegment],   // array multi-select
    escoadoPor: "tributaria",
    escoadoCm: "",
    segmento: [defaultSegment],      // array multi-select
    causadoPor: "tributaria",
    causadoCm: "",
    escoadoPor2: "tributaria",
    escoadoCm2: "",
  };
}

function defaultMemberState() {
  return {
    incluir: false,
    profundasCompressiveis: true,
    profundasRefluxo: [],

    magnaPresente: true,
    magnaDiametros: Object.fromEntries(SEGMENTS_MAGNA.map((s) => [s.key, ""])),
    magnaSemRefluxo: true,
    magnaRefluxos: [],

    acessoriaPresente: false,
    acessoriaTipo: "anterior",
    acessoriaRefluxo: false,

    reticulares: false,
    varicosas: false,

    perfurantes: [],

    parvaPresente: true,
    parvaDiametros: Object.fromEntries(SEGMENTS_PARVA.map((s) => [s.key, ""])),
    parvaSemRefluxo: true,
    parvaCrocaCm: "",
    parvaRefluxos: [],

    tributariasCroca: "none", // none | magna | parva

    safenectomiaMagna: "none", // none | parcial | total
    safenectomiaMagnaSegmentos: [], // array de segmentos
    safenectomiaMagnaTipo: "segmentar", // segmentar | parcial
    cotoMagnaRefluxo: false,
    cotoMagnaDiametro: "",
    cotoMagnaExtensao: "",

    safenectomiaParva: "none",
    safenectomiaParvaSegmentos: [], // array de segmentos
    safenectomiaParvaTipo: "segmentar",
    cotoParvaRefluxo: false,

    safenaSuperficialAtiva: false,
    safenaSuperficialDe: "coxaProx",
    safenaSuperficialAte: "joelho",

    circunflexaAtiva: false,
    circunflexaDiametro: "",
    circunflexaProfundidade: "",
    circunflexaRefluxo: "sem",
    circunflexaCausadoPor: "tributaria",
    circunflexaCausadoCm: "",
    circunflexaEscoadoPor: "tributaria",
    circunflexaEscoadoCm: "",
    circunflexaLocal: "proximalCoxa",

    tromboRecenteAtiva: false,
    tromboRecenteVeias: [],
    tromboRecenteSegmentos: [],       // multi: segmentos da magna
    tromboRecenteSegmentosParva: [],  // multi: segmentos da parva
    tromboRecenteFaces: [],           // multi: faces das colaterais
    tromboRecenteLocais: [],          // multi: locais das colaterais

    tromboAntigaAtiva: false,
    tromboAntigaVeias: [],
    tromboAntigaSegmentos: [],
    tromboAntigaSegmentosParva: [],
    tromboAntigaFaces: [],
    tromboAntigaLocais: [],
  };
}

const FACE_LABEL = { medial: "medial", lateral: "lateral", posterior: "posterior" };
const LOC_LABEL = { coxa: "coxa", joelho: "joelho", perna: "perna" };
const SEG_LABEL = Object.fromEntries(SEGMENT_LOCATION_OPTIONS.map((s) => [s.value, s.label]));
const FONTE_LABEL = { tributaria: "veia tributária", perfurante: "veia perfurante" };
const FACE_TROMBO_LABEL = {
  anteroLateral: "ântero-lateral",
  anteroMedial: "ântero-medial",
  posteroMedial: "póstero-medial",
  posteroLateral: "póstero-lateral",
};

function fmtNum(v) {
  return v === "" || v === null || v === undefined ? "" : v;
}
function magnaTableHasData(m) {
  return SEGMENTS_MAGNA.some((s) => m.magnaDiametros[s.key] !== "");
}
function parvaTableHasData(m) {
  return SEGMENTS_PARVA.some((s) => m.parvaDiametros[s.key] !== "");
}

function buildProfundas(m) {
  if (!m.profundasCompressiveis) return [];
  return [
    "Veias femoral comum, femoral profunda, femoral, poplítea, tibiais posteriores e fibulares compressíveis, sem imagens sugestivas de trombos recentes.",
  ];
}
function buildProfundasDoppler(m) {
  if (m.profundasRefluxo.length === 0) return ["Veias profundas sem refluxo significativo."];
  const names = {
    femoral: "femoral",
    poplitea: "poplítea",
    tibiaisPosteriores: "tibiais posteriores",
    fibulares: "fibulares",
  };
  const selecionadas = m.profundasRefluxo.map((k) => names[k]);
  let texto;
  if (selecionadas.length === 1) {
    texto = `Veia ${selecionadas[0]} com refluxo.`;
  } else {
    const inicio = selecionadas.slice(0, -1).join(", ");
    const ultimo = selecionadas[selecionadas.length - 1];
    texto = `Veias ${inicio} e ${ultimo} com refluxo.`;
  }
  return [texto];
}
function buildProfundasConclusao(m) {
  return [
    "Sistema venoso profundo pérvio, sem trombose recente.",
    m.profundasRefluxo.length === 0
      ? "Veias profundas sem sinais de insuficiência valvular significativa."
      : "Veias profundas com sinais de insuficiência valvular segmentar.",
  ];
}
function buildMagnaAnatomico(m) {
  const lines = [];
  if (!m.magnaPresente) return lines;

  // Tabela sempre presente (item 5 anterior)
  lines.push("Veia safena magna medindo em ortostatismo (em mm):");
  lines.push("__TABLE_MAGNA__");

  // Item 1 — 1º: safenectomia / "não se detecta"
  if (m.safenectomiaMagna === "total") {
    lines.push("Não se detecta a veia safena magna no seu trajeto habitual (safenectomia).");
  } else if (m.safenectomiaMagna === "parcial" && m.safenectomiaMagnaSegmentos.length > 0) {
    const segs = m.safenectomiaMagnaSegmentos.map((s) => SEG_LABEL[s] || s);
    lines.push(`Não se detecta a veia safena magna ${segs.length > 1 ? "nos segmentos de" : "no segmento"} ${listaFluida(segs)}.`);
  }

  // Item 1 — 2º: safena em plano superficial
  if (m.safenaSuperficialAtiva) {
    const de = SEG_LABEL[m.safenaSuperficialDe] || m.safenaSuperficialDe;
    const ate = SEG_LABEL[m.safenaSuperficialAte] || m.safenaSuperficialAte;
    lines.push(
      `Veia safena magna localizada em plano superficial ao compartimento safênico, do segmento ${de} ao segmento ${ate}.`
    );
  }

  // Acessória (mantida após os achados especiais)
  if (m.acessoriaPresente) {
    lines.push(
      `Presença de veia safena acessória ${m.acessoriaTipo} na coxa, ${
        m.acessoriaRefluxo ? "com" : "sem"
      } refluxo.`
    );
  }
  return lines;
}
function buildParvaAnatomico(m) {
  const lines = [];
  if (!m.parvaPresente) return lines;
  // Item 6: parva só aparece se ao menos 1 campo preenchido
  if (!parvaTableHasData(m) && m.safenectomiaParva === "none") return lines;
  if (parvaTableHasData(m)) {
    lines.push("Veia safena parva medindo em ortostatismo (em mm):");
    lines.push("__TABLE_PARVA__");
  }
  if (m.safenectomiaParva === "parcial" && m.safenectomiaParvaSegmentos.length > 0) {
    const segs = m.safenectomiaParvaSegmentos.map((s) => SEG_LABEL[s] || s);
    const segTxt = listaFluida(segs);
    lines.push(`Não se detecta a veia safena parva ${segs.length > 1 ? "nos segmentos de" : "no segmento"} ${segTxt}.`);
  } else if (m.safenectomiaParva === "total") {
    lines.push("Não se detecta a veia safena parva no seu trajeto habitual (safenectomia).");
  }
  return lines;
}
function buildReticulares(m) {
  if (!m.reticulares && !m.varicosas) return [];
  if (m.reticulares && m.varicosas) return ["Observam-se veias reticulares e varicosas."];
  if (m.reticulares) return ["Observam-se veias reticulares."];
  return ["Observam-se veias varicosas."];
}
function buildPerfurante(p) {
  const diam = fmtNum(p.diametro);
  const dist = fmtNum(p.distanciaPlantar);
  const diamTxt = diam ? `${diam} mm` : "___ mm";
  const distTxt = dist ? `${dist} cm` : "__ cm";
  if (p.face === "lateral") {
    const refluxoTxt = p.refluxo === "sem" ? "sem refluxo" : "com refluxo";
    return `Veia perfurante (diâmetro = ${diamTxt}) na face lateral da ${LOC_LABEL[p.localizacao]}, ${refluxoTxt}, a ${distTxt} acima da base plantar.`;
  }
  const tipoTxt = p.tipo === "direta" ? "direta" : "indireta";
  let refluxoTxt;
  const safenaRef = p.face === "medial" ? "safena magna" : "safena parva";
  switch (p.refluxo) {
    case "sem":
      refluxoTxt = "sem refluxo";
      break;
    case "com":
      refluxoTxt = "com refluxo";
      break;
    case "escoando":
      refluxoTxt = `escoando refluxo da veia ${safenaRef}`;
      break;
    case "transferindo":
      refluxoTxt = `transferindo refluxo para a veia ${safenaRef}`;
      break;
    default:
      refluxoTxt = "sem refluxo";
  }
  return `Veia perfurante ${tipoTxt} (diâmetro = ${diamTxt}) na face ${FACE_LABEL[p.face]} da ${LOC_LABEL[p.localizacao]}, ${refluxoTxt}, a ${distTxt} acima da base plantar.`;
}
function buildPerfurantesSection(m) {
  if (m.perfurantes.length === 0) return [];
  return ["Veias Perfurantes:", ...m.perfurantes.map(buildPerfurante)];
}
function buildRefluxoTrechoText(t, segLabelFn, veiaNome, idx = 0) {
  // segmentoAte e segmento podem ser string (legado) ou array
  const toArr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  // Item 2: a partir do 2º trecho, suprimir "Veia X" e usar "Refluxo..." como prefixo
  const prefixo = idx === 0 ? `Veia ${veiaNome} com refluxo` : "Refluxo";
  switch (t.tipo) {
    case "difuso":
      return idx === 0
        ? `Veia ${veiaNome} com refluxo difuso.`
        : "Refluxo difuso.";
    case "crocaTributaria":
      return idx === 0
        ? `Veia ${veiaNome} com refluxo na croça escoado por veia tributária.`
        : "Refluxo na croça escoado por veia tributária.";
    case "crocaSegmento": {
      const segs = toArr(t.segmentoAte).map(segLabelFn);
      const segTxt = listaFluida(segs) || segLabelFn(t.segmentoAte);
      const fonte = FONTE_LABEL[t.escoadoPor];
      const cm = fmtNum(t.escoadoCm);
      const cmTxt = cm ? `${cm} cm` : "cm";
      const plural = segs.length > 1 ? "s segmentos" : " segmento";
      return `${prefixo} da croça ao${plural} ${segTxt} escoado por ${fonte} (${cmTxt}).`;
    }
    case "segmentoIsolado": {
      const segs = toArr(t.segmento).map(segLabelFn);
      const segTxt = listaFluida(segs) || segLabelFn(t.segmento);
      const fonteC = FONTE_LABEL[t.causadoPor];
      const cmC = fmtNum(t.causadoCm);
      const cmCTxt = cmC ? `${cmC} cm` : "cm";
      const plural = segs.length > 1 ? "s segmentos" : " segmento";
      // Item 1: se cm de escoamento não preenchido, omitir "e escoado..."
      const cmE = fmtNum(t.escoadoCm2);
      if (!cmE) {
        return `${prefixo} no${plural} ${segTxt} causado (${cmCTxt}) por ${fonteC}.`;
      }
      const fonteE = FONTE_LABEL[t.escoadoPor2];
      const cmETxt = `${cmE} cm`;
      return `${prefixo} no${plural} ${segTxt} causado (${cmCTxt}) por ${fonteC} e escoado (${cmETxt}) por ${fonteE}(s).`;
    }
    default:
      return "";
  }
}

function buildMagnaDoppler(m) {
  if (!m.magnaPresente) return [];
  const segLabel = (k) => SEG_LABEL[k] || k;
  // Item 2: "residual" quando safenectomia parcial
  const nomeVeia = m.safenectomiaMagna === "parcial" && m.safenectomiaMagnaSegmentos.length > 0
    ? "safena magna residual"
    : "safena magna";
  const temRefluxo = !m.magnaSemRefluxo && m.magnaRefluxos.length > 0;
  const tromboInfo = getTromboTexts(m, "tromboRecente", "recente");
  const tromboAntigoInfo = getTromboTexts(m, "tromboAntiga", "antiga");
  const tromboMagna = tromboInfo.magna || tromboAntigoInfo.magna;
  const tromboSufixo = tromboMagna ? ` ${tromboMagna.doppler}` : "";

  if (!temRefluxo) {
    return [`Veia ${nomeVeia} sem refluxo significativo.${tromboSufixo}`];
  }

  const linhasRefluxo = m.magnaRefluxos.map((t, idx) =>
    buildRefluxoTrechoText(t, segLabel, nomeVeia, idx)
  );
  // Item 2 (desta sessão): múltiplos trechos na mesma linha
  const linhaUnificada = linhasRefluxo.join(" ");
  const resultado = [linhaUnificada];
  const temDifuso = m.magnaRefluxos.some((t) => t.tipo === "difuso");
  if (!temDifuso) {
    resultado[0] += ` Demais segmentos sem refluxo significativo.`;
  }
  if (tromboSufixo) {
    resultado[0] += tromboSufixo;
  }
  return resultado;
}

function buildParvaDoppler(m) {
  if (!m.parvaPresente) return [];
  const segLabel = (k) => SEG_LABEL[k] || k;
  const crocaCm = fmtNum(m.parvaCrocaCm) || "";
  // Item 2: "residual" quando safenectomia parcial
  const nomeVeia = m.safenectomiaParva === "parcial" && m.safenectomiaParvaSegmentos.length > 0
    ? "safena parva residual"
    : "safena parva";
  const temRefluxo = !m.parvaSemRefluxo && m.parvaRefluxos.length > 0;
  const tromboInfo = getTromboTexts(m, "tromboRecente", "recente");
  const tromboAntigoInfo = getTromboTexts(m, "tromboAntiga", "antiga");
  const tromboParva = tromboInfo.parva || tromboAntigoInfo.parva;
  const tromboSufixo = tromboParva ? ` ${tromboParva.doppler}` : "";
  const crocaLinha = crocaCm && temRefluxo
    ? ` Croça da veia safena parva a aproximadamente ${crocaCm} cm acima da prega poplítea.`
    : "";

  if (!temRefluxo) {
    return [`Veia ${nomeVeia} sem refluxo significativo.${tromboSufixo}`];
  }

  const linhasRefluxo = m.parvaRefluxos.map((t, idx) =>
    buildRefluxoTrechoText(t, segLabel, nomeVeia, idx)
  );
  // Item 2 (desta sessão): múltiplos trechos na mesma linha
  const linhaUnificada = linhasRefluxo.join(" ");
  const resultado = [linhaUnificada];
  const temDifuso = m.parvaRefluxos.some((t) => t.tipo === "difuso");
  if (!temDifuso) {
    resultado[0] += ` Demais segmentos sem refluxo significativo.`;
  }
  resultado[0] += `${tromboSufixo}${crocaLinha}`;
  return resultado;
}
// Helper: determina se safenectomia é segmentar ou parcial (item 5)
// Segmentar = 1 ou 2 segmentos isolados; Parcial = cobre região contínua ampla (coxa inteira ou perna inteira)
const GRUPOS_PARCIAL = [
  ["coxaProx", "coxaMedia", "coxaDistal"], // coxa inteira
  ["pernaProx", "pernaMedia", "pernaDistal"], // perna inteira
  ["coxaProx", "coxaMedia", "coxaDistal", "joelho", "pernaProx", "pernaMedia", "pernaDistal"], // total
];
function tipoSafenectomia(segmentos) {
  if (!segmentos || segmentos.length === 0) return "segmentar";
  if (segmentos.length <= 2) return "segmentar";
  const set = new Set(segmentos);
  for (const grupo of GRUPOS_PARCIAL) {
    if (grupo.every((s) => set.has(s))) return "parcial";
  }
  return segmentos.length >= 3 ? "parcial" : "segmentar";
}

// Item 7: coto residual no Doppler
function buildDopplerCotoMagna(m) {
  if (m.safenectomiaMagna === "none" || !m.cotoMagnaDiametro) return [];
  const diam = fmtNum(m.cotoMagnaDiametro) || "  ";
  const ext = fmtNum(m.cotoMagnaExtensao) || "  ";
  return [
    `Coto residual da veia safena magna, medindo ${diam} mm de diâmetro e ${ext} mm de extensão, ${
      m.cotoMagnaRefluxo ? "com" : "sem"
    } refluxo, originando veias varicosas para coxa.`,
  ];
}

// Item 3: circunflexa no Doppler
function buildDopplerCircunflexa(m) {
  if (!m.circunflexaAtiva) return [];
  const diam = fmtNum(m.circunflexaDiametro) || "__";
  const prof = fmtNum(m.circunflexaProfundidade) || "__";
  const local =
    m.circunflexaLocal === "proximalCoxa"
      ? "no segmento proximal de coxa"
      : "na junção safeno-femoral";
  if (m.circunflexaRefluxo === "sem") {
    return [
      `Veia circunflexa posterior de coxa (diâmetro=${diam} mm e profundidade=${prof} mm), sem refluxo, comunicando a veia safena parva com a veia safena magna ${local}.`,
    ];
  }
  const causadoPor = FONTE_LABEL[m.circunflexaCausadoPor];
  const causadoCm = fmtNum(m.circunflexaCausadoCm) || "  ";
  const escoadoPor = FONTE_LABEL[m.circunflexaEscoadoPor];
  const escoadoCm = fmtNum(m.circunflexaEscoadoCm) || "  ";
  return [
    `Veia circunflexa posterior de coxa (diâmetro=${diam} mm e profundidade=${prof} mm), com refluxo causado (${causadoCm} cm) por ${causadoPor} e escoado (${escoadoCm} cm) por ${escoadoPor}, comunicando a veia safena parva com a veia safena magna ${local}.`,
  ];
}

function buildConclusaoMagna(m) {
  const lines = [];
  if (!m.magnaPresente) return lines;

  if (m.safenectomiaMagna === "total") {
    // Safenectomia total: não existe mais → sem linha de refluxo
    lines.push("Safenectomia magna total.");
    if (m.cotoMagnaDiametro) {
      lines.push(
        m.cotoMagnaRefluxo
          ? "Coto residual da veia safena magna com sinais de insuficiência valvular."
          : "Coto residual da veia safena magna sem sinais de insuficiência valvular."
      );
    }
    return lines;
  }

  // Item 2: "residual" na conclusão quando safenectomia parcial
  const nomeVeia = m.safenectomiaMagna === "parcial" && m.safenectomiaMagnaSegmentos.length > 0
    ? "safena magna residual"
    : "safena magna";

  // Item 3 — 1º: refluxo da safena
  if (m.magnaSemRefluxo || m.magnaRefluxos.length === 0) {
    lines.push(`Veia ${nomeVeia} sem sinais de insuficiência valvular significativa.`);
  } else if (m.magnaRefluxos.length === 1 && m.magnaRefluxos[0].tipo === "difuso") {
    lines.push(`Veia ${nomeVeia} com sinais de insuficiência valvular difusa.`);
  } else {
    lines.push(`Veia ${nomeVeia} com sinais de insuficiência valvular segmentar.`);
  }

  // Item 2 (tributárias): logo abaixo do refluxo da magna
  lines.push(...buildConclusaoTributariasMagna(m));

  // Item 3 — 2º: achados especiais da magna
  if (m.safenectomiaMagna === "parcial" && m.safenectomiaMagnaSegmentos.length > 0) {
    const tipo = tipoSafenectomia(m.safenectomiaMagnaSegmentos);
    lines.push(`Safenectomia magna ${tipo}.`);
    if (m.cotoMagnaDiametro) {
      lines.push(
        m.cotoMagnaRefluxo
          ? "Coto residual da veia safena magna com sinais de insuficiência valvular."
          : "Coto residual da veia safena magna sem sinais de insuficiência valvular."
      );
    }
  }
  if (m.acessoriaPresente && m.acessoriaRefluxo) {
    lines.push(`Veia safena acessória ${m.acessoriaTipo} com sinais de insuficiência valvular.`);
  }
  return lines;
}

function buildConclusaoParva(m) {
  const lines = [];
  if (!m.parvaPresente) return lines;

  if (m.safenectomiaParva === "total") {
    lines.push("Safenectomia parva total.");
    lines.push(
      m.cotoParvaRefluxo
        ? "Coto residual da veia safena parva com sinais de insuficiência valvular."
        : "Coto residual da veia safena parva sem sinais de insuficiência valvular."
    );
    return lines;
  }

  // Item 2: "residual" na conclusão quando safenectomia parcial
  const nomeVeia = m.safenectomiaParva === "parcial" && m.safenectomiaParvaSegmentos.length > 0
    ? "safena parva residual"
    : "safena parva";

  // Item 3 — 1º: refluxo da parva
  if (m.parvaSemRefluxo || m.parvaRefluxos.length === 0) {
    lines.push(`Veia ${nomeVeia} sem sinais de insuficiência valvular significativa.`);
  } else if (m.parvaRefluxos.length === 1 && m.parvaRefluxos[0].tipo === "difuso") {
    lines.push(`Veia ${nomeVeia} com sinais de insuficiência valvular difusa.`);
  } else {
    lines.push(`Veia ${nomeVeia} com sinais de insuficiência valvular segmentar.`);
  }

  // Item 2 (tributárias): logo abaixo do refluxo da parva
  lines.push(...buildConclusaoTributariasParva(m));

  // Item 3 — 2º: achados especiais da parva
  if (m.safenectomiaParva === "parcial" && m.safenectomiaParvaSegmentos.length > 0) {
    const tipo = tipoSafenectomia(m.safenectomiaParvaSegmentos);
    lines.push(`Safenectomia parva ${tipo}.`);
    lines.push(
      m.cotoParvaRefluxo
        ? "Coto residual da veia safena parva com sinais de insuficiência valvular."
        : "Coto residual da veia safena parva sem sinais de insuficiência valvular."
    );
  }
  return lines;
}
function buildConclusaoPerfurantes(m) {
  return m.perfurantes.length > 0 ? ["Veias perfurantes."] : [];
}
function buildConclusaoReticulares(m) {
  if (!m.reticulares && !m.varicosas) return [];
  if (m.reticulares && m.varicosas) return ["Veias reticulares e varicosas."];
  if (m.reticulares) return ["Veias reticulares."];
  return ["Veias varicosas."];
}
function buildConclusaoTributariasMagna(m) {
  if (m.tributariasCroca !== "magna") return [];
  return ["Veias tributárias da croça da veia safena magna com refluxo e originando veias varicosas para a coxa."];
}
function buildConclusaoTributariasParva(m) {
  if (m.tributariasCroca !== "parva") return [];
  return ["Veias tributárias da croça da veia safena parva com refluxo e originando veias varicosas para a perna."];
}
// Helper: formata lista de itens em texto fluido ("a, b e c")
function listaFluida(items) {
  if (!items || items.length === 0) return "";
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(", ") + " e " + items[items.length - 1];
}

function getTromboTexts(m, prefix, labelTipo) {
  const ativa = m[`${prefix}Ativa`];
  if (!ativa) return { magna: null, parva: null, colaterais: null };

  const veias = m[`${prefix}Veias`] || [];
  const isAntiga = labelTipo === "antiga";
  const compress = isAntiga ? "semicompressível, com fluxo parcial" : "incompressível, sem fluxo";
  const trombosTxt = isAntiga ? "trombos antigos" : "trombos recentes";

  const result = { magna: null, parva: null, colaterais: null };

  if (veias.includes("magna")) {
    const segs = (m[`${prefix}Segmentos`] || []).map((s) => SEG_LABEL[s] || s);
    const segTxt = segs.length > 0 ? `no${segs.length > 1 ? "s segmentos" : " segmento"} ${listaFluida(segs)}` : "";
    result.magna = {
      doppler: `Veia safena magna${segTxt ? ", " + segTxt : ""}, dilatada, ${compress} e imagens de ${trombosTxt} no lúmen.`,
      conclusao: "na veia safena magna",
    };
  }
  if (veias.includes("parva")) {
    const segs = (m[`${prefix}SegmentosParva`] || []).map((s) => SEG_LABEL[s] || s);
    const segTxt = segs.length > 0 ? `no${segs.length > 1 ? "s segmentos" : " segmento"} ${listaFluida(segs)}` : "";
    result.parva = {
      doppler: `Veia safena parva${segTxt ? ", " + segTxt : ""}, dilatada, ${compress} e imagens de ${trombosTxt} no lúmen.`,
      conclusao: "na veia safena parva",
    };
  }
  if (veias.includes("colaterais")) {
    const faces = (m[`${prefix}Faces`] || []).map((f) => FACE_TROMBO_LABEL[f] || f);
    const locais = (m[`${prefix}Locais`] || []);
    const faceTxt = faces.length > 0 ? `na${faces.length > 1 ? "s faces" : " face"} ${listaFluida(faces)}` : "";
    const localTxt = locais.length > 0 ? `da ${listaFluida(locais)}` : "";
    const colDesc = [faceTxt, localTxt].filter(Boolean).join(", ");
    result.colaterais = {
      doppler: `Veias colaterais ${colDesc}, dilatadas, ${compress} e imagens de ${trombosTxt} no lúmen.`,
      conclusao: `em veias colaterais${localTxt ? " " + localTxt : ""}`,
    };
  }
  return result;
}

// Retorna frases para o Doppler (magna/parva fundidas no refluxo; colaterais autônomas)
function buildDopplerTrombo(m, prefix, labelTipo, excludeMagnaParva) {
  const t = getTromboTexts(m, prefix, labelTipo);
  const lines = [];
  if (!excludeMagnaParva && t.magna) lines.push(t.magna.doppler);
  if (!excludeMagnaParva && t.parva) lines.push(t.parva.doppler);
  if (t.colaterais) lines.push(t.colaterais.doppler);
  return lines;
}

// Item 3: conclusão com frase unificada por tipo
function buildConclusaoTrombo(m, prefix, labelTipo) {
  const t = getTromboTexts(m, prefix, labelTipo);
  const partes = [];
  if (t.magna) partes.push(t.magna.conclusao);
  if (t.parva) partes.push(t.parva.conclusao);
  if (t.colaterais) partes.push(t.colaterais.conclusao);
  if (partes.length === 0) return [];
  const tipoTxt = labelTipo === "recente" ? "recente" : "antiga";
  return [`Tromboflebite superficial ${tipoTxt} ${listaFluida(partes)}.`];
}

function buildDopplerTromboRecente(m, excludeMagnaParva) {
  return buildDopplerTrombo(m, "tromboRecente", "recente", excludeMagnaParva);
}
function buildConclusaoTromboRecente(m) {
  return buildConclusaoTrombo(m, "tromboRecente", "recente");
}
function buildDopplerTromboAntiga(m, excludeMagnaParva) {
  return buildDopplerTrombo(m, "tromboAntiga", "antiga", excludeMagnaParva);
}
function buildConclusaoTromboAntiga(m) {
  return buildConclusaoTrombo(m, "tromboAntiga", "antiga");
}

function buildMemberReport(member, side) {
  const sideLabel = SIDE_LABEL[side];

  // Item 1: ordem anatômica — safenectomia/superficial já dentro de buildMagnaAnatomico
  // reticulares/varicosas DEPOIS das perfurantes (posição 3 no anatômico)
  const anatomico = [
    `MEMBRO INFERIOR ${sideLabel}`,
    "",
    ...buildProfundas(member),
    ...buildMagnaAnatomico(member),
    ...buildPerfurantesSection(member),
    ...buildParvaAnatomico(member),
    ...buildReticulares(member),   // item 1: reticulares/varicosas por último na anatômica
  ];

  const doppler = [
    "DOPPLER: Avaliação hemodinâmica ao ortostatismo (Doppler colorido e análise espectral):",
    ...buildProfundasDoppler(member),
    ...buildMagnaDoppler(member),
    ...buildDopplerCotoMagna(member),
    ...buildParvaDoppler(member),
    ...buildDopplerCircunflexa(member),
    ...buildDopplerTromboRecente(member, true),
    ...buildDopplerTromboAntiga(member, true),
  ];

  // Item 3: ordem da conclusão
  const conclusao = [
    `MEMBRO INFERIOR ${sideLabel}`,
    "",
    // 1º: sistema venoso profundo
    ...buildProfundasConclusao(member),
    // 2º: refluxo safena magna + achados especiais dela
    ...buildConclusaoMagna(member),
    // 3º: refluxo safena parva + achados especiais dela
    ...buildConclusaoParva(member),
    // 4º: veias perfurantes
    ...buildConclusaoPerfurantes(member),
    // 5º: reticulares e varicosas
    ...buildConclusaoReticulares(member),
    // 6º: tromboflebites
    ...buildConclusaoTromboRecente(member),
    ...buildConclusaoTromboAntiga(member),
  ];
  return { anatomico, doppler, conclusao, member, side };
}

function getActiveSides(state) {
  const sides = [];
  if (state.D.incluir) sides.push("D");
  if (state.E.incluir) sides.push("E");
  return sides;
}

function buildFullReportBlocks(state) {
  return getActiveSides(state).map((s) => buildMemberReport(state[s], s));
}

function reportTitle(state) {
  const sides = getActiveSides(state);
  if (sides.length === 2) return "MAPEAMENTO VENOSO DOS MEMBROS INFERIORES";
  if (sides.length === 1) return `MAPEAMENTO VENOSO DO MEMBRO INFERIOR ${SIDE_LABEL[sides[0]]}`;
  return "MAPEAMENTO VENOSO DO MEMBRO INFERIOR";
}

/* ============================================================
   COMPONENTES DE UI BÁSICOS
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

function Section({ title, subtitle, children, defaultOpen = true, badge }) {
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
          {subtitle ? (
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>{subtitle}</span>
          ) : null}
        </div>
        <ChevronDown
          size={17}
          color={COLORS.textMuted}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
          }}
        />
      </button>
      {open && (
        <div style={{ padding: "2px 16px 16px 16px" }}>
          {children}
        </div>
      )}
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: wrap ? "wrap" : "nowrap",
        marginTop: 8,
      }}
    >
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <span style={{ fontSize: 12, color: COLORS.textMuted, minWidth: 0, marginRight: 2 }}>
      {children}
    </span>
  );
}

function DiameterTable({ segments, values, onChange }) {
  return (
    <div
      style={{
        marginTop: 10,
        marginBottom: 4,
        background: COLORS.panelAlt,
        borderRadius: 8,
        border: `1px solid ${COLORS.border}`,
        overflow: "hidden",
      }}
    >
      {segments.map((s) => (
        <div
          key={s.key}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 90px",
            gap: 10,
            padding: "5px 10px",
            background: s.header ? COLORS.panelAlt : "transparent",
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <div
            style={{
              fontSize: 12.5,
              color: s.header ? COLORS.text : COLORS.textMuted,
              fontWeight: s.header ? 600 : 400,
              paddingLeft: s.indent ? 20 : 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            {s.label}
          </div>
          <NumInput
            value={values[s.key]}
            onChange={(v) => onChange(s.key, v)}
            suffix="mm"
            width="100%"
          />
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   EDITOR DE TRECHO DE REFLUXO (reutilizável: magna / parva)
   ============================================================ */

function RefluxoTrechoCard({ trecho, segmentOptions, onUpdate, onRemove, idx, showCrocaTributaria = true }) {
  const t = trecho;
  const upd = (patch) => onUpdate({ ...t, ...patch });
  return (
    <div
      style={{
        background: COLORS.panelAlt,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        padding: 10,
        marginTop: idx === 0 ? 4 : 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted }}>
          Trecho de refluxo {idx + 1}
        </span>
        <button
          onClick={onRemove}
          style={{
            background: "transparent",
            border: "none",
            color: COLORS.danger,
            cursor: "pointer",
            padding: 4,
            display: "flex",
          }}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <Row>
        <PillGroup
          value={t.tipo}
          onChange={(v) => upd({ tipo: v })}
          options={[
            { value: "difuso", label: "Difuso" },
            ...(showCrocaTributaria
              ? [{ value: "crocaTributaria", label: "Croça (escoado por tributária)" }]
              : []),
            { value: "crocaSegmento", label: "Croça → segmento" },
            { value: "segmentoIsolado", label: "Segmento isolado" },
          ]}
        />
      </Row>

      {t.tipo === "crocaSegmento" && (
        <div style={{ marginTop: 8, paddingLeft: 4 }}>
          <Row>
            <Label>Refluxo vai da croça até (selecione um ou mais segmentos):</Label>
          </Row>
          <Row>
            <PillGroup
              multi
              value={Array.isArray(t.segmentoAte) ? t.segmentoAte : t.segmentoAte ? [t.segmentoAte] : []}
              onChange={(v) => upd({ segmentoAte: v })}
              options={segmentOptions}
            />
          </Row>
          <Row>
            <Label>Escoado por:</Label>
            <PillGroup
              value={t.escoadoPor}
              onChange={(v) => upd({ escoadoPor: v })}
              options={[
                { value: "tributaria", label: "Veia tributária" },
                { value: "perfurante", label: "Veia perfurante" },
              ]}
            />
            <NumInput value={t.escoadoCm} onChange={(v) => upd({ escoadoCm: v })} suffix="cm" />
          </Row>
        </div>
      )}

      {t.tipo === "segmentoIsolado" && (
        <div style={{ marginTop: 8, paddingLeft: 4 }}>
          <Row>
            <Label>Segmento(s) acometido(s):</Label>
          </Row>
          <Row>
            <PillGroup
              multi
              value={Array.isArray(t.segmento) ? t.segmento : t.segmento ? [t.segmento] : []}
              onChange={(v) => upd({ segmento: v })}
              options={segmentOptions}
            />
          </Row>
          <Row>
            <Label>Causado por:</Label>
            <PillGroup
              value={t.causadoPor}
              onChange={(v) => upd({ causadoPor: v })}
              options={[
                { value: "tributaria", label: "Tributária" },
                { value: "perfurante", label: "Perfurante" },
              ]}
            />
            <NumInput value={t.causadoCm} onChange={(v) => upd({ causadoCm: v })} suffix="cm" />
          </Row>
          <Row>
            <Label>Escoado por:</Label>
            <PillGroup
              value={t.escoadoPor2}
              onChange={(v) => upd({ escoadoPor2: v })}
              options={[
                { value: "tributaria", label: "Tributária(s)" },
                { value: "perfurante", label: "Perfurante(s)" },
              ]}
            />
            <NumInput value={t.escoadoCm2} onChange={(v) => upd({ escoadoCm2: v })} suffix="cm" />
          </Row>
        </div>
      )}
    </div>
  );
}

function RefluxoTrechosEditor({
  semRefluxo,
  onSemRefluxoChange,
  trechos,
  onChange,
  segmentOptions,
  defaultSegment,
  showCrocaTributaria = true,
}) {
  const addTrecho = () =>
    onChange([...trechos, defaultRefluxoTrecho(defaultSegment)]);
  const removeTrecho = (id) => onChange(trechos.filter((t) => t.id !== id));
  const updateTrecho = (id, newT) => onChange(trechos.map((t) => (t.id === id ? newT : t)));

  return (
    <div>
      <Toggle
        checked={semRefluxo}
        onChange={(v) => {
          onSemRefluxoChange(v);
          if (v) onChange([]);
        }}
        label="Sem refluxo significativo"
      />
      {!semRefluxo && (
        <>
          {trechos.map((t, idx) => (
            <RefluxoTrechoCard
              key={t.id}
              trecho={t}
              idx={idx}
              segmentOptions={segmentOptions}
              showCrocaTributaria={showCrocaTributaria}
              onUpdate={(newT) => updateTrecho(t.id, newT)}
              onRemove={() => removeTrecho(t.id)}
            />
          ))}
          <button
            onClick={addTrecho}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 10,
              padding: "8px 14px",
              background: "transparent",
              border: `1px dashed ${COLORS.borderLight}`,
              borderRadius: 8,
              color: COLORS.accent,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> Adicionar trecho de refluxo
          </button>
        </>
      )}
    </div>
  );
}

/* ============================================================
   EDITOR DE TROMBOFLEBITE (reutilizável: recente / antiga)
   ============================================================ */

function TromboCard({ veias, segmentos, segmentosParva, faces, locais, onChange }) {
  return (
    <>
      <Row>
        <Label>Veia(s) acometida(s):</Label>
        <PillGroup
          multi
          value={veias}
          onChange={(v) => onChange({ veias: v })}
          options={[
            { value: "magna", label: "Safena magna" },
            { value: "parva", label: "Safena parva" },
            { value: "colaterais", label: "Veias colaterais" },
          ]}
        />
      </Row>

      {veias.includes("magna") && (
        <Row>
          <Label>Segmento(s) magna:</Label>
          <PillGroup
            multi
            value={segmentos}
            onChange={(v) => onChange({ segmentos: v })}
            options={SEGMENT_LOCATION_OPTIONS}
          />
        </Row>
      )}

      {veias.includes("parva") && (
        <Row>
          <Label>Segmento(s) parva:</Label>
          <PillGroup
            multi
            value={segmentosParva}
            onChange={(v) => onChange({ segmentosParva: v })}
            options={SEGMENT_LOCATION_OPTIONS_PARVA}
          />
        </Row>
      )}

      {veias.includes("colaterais") && (
        <>
          <Row>
            <Label>Face(s) colaterais:</Label>
            <PillGroup
              multi
              value={faces}
              onChange={(v) => onChange({ faces: v })}
              options={[
                { value: "anteroLateral", label: "Ântero-lateral" },
                { value: "anteroMedial", label: "Ântero-medial" },
                { value: "posteroMedial", label: "Póstero-medial" },
                { value: "posteroLateral", label: "Póstero-lateral" },
              ]}
            />
          </Row>
          <Row>
            <Label>Local(is) colaterais:</Label>
            <PillGroup
              multi
              value={locais}
              onChange={(v) => onChange({ locais: v })}
              options={[
                { value: "coxa", label: "Coxa" },
                { value: "joelho", label: "Joelho" },
                { value: "perna", label: "Perna" },
              ]}
            />
          </Row>
        </>
      )}
    </>
  );
}

/* ============================================================
   FORMULÁRIO DE UM MEMBRO
   ============================================================ */

function MemberForm({ side, data, update }) {
  const set = (patch) => update((prev) => ({ ...prev, ...patch }));
  const setDiam = (table, key, v) =>
    update((prev) => ({ ...prev, [table]: { ...prev[table], [key]: v } }));

  const addPerfurante = () =>
    update((prev) => ({ ...prev, perfurantes: [...prev.perfurantes, defaultPerfurante()] }));
  const removePerfurante = (id) =>
    update((prev) => ({ ...prev, perfurantes: prev.perfurantes.filter((p) => p.id !== id) }));
  const updatePerfurante = (id, patch) =>
    update((prev) => ({
      ...prev,
      perfurantes: prev.perfurantes.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));

  return (
    <div>
      {/* VEIAS PROFUNDAS */}
      <Section title="Veias profundas" defaultOpen={true}>
        <Toggle
          checked={data.profundasCompressiveis}
          onChange={(v) => set({ profundasCompressiveis: v })}
          label="Compressíveis, sem trombos recentes"
          description="Femoral comum, femoral profunda, femoral, poplítea, tibiais posteriores, fibulares"
        />
        <div style={{ marginTop: 10 }}>
          <Label>Refluxo em (Doppler):</Label>
          <div style={{ marginTop: 6 }}>
            <PillGroup
              multi
              value={data.profundasRefluxo}
              onChange={(v) => set({ profundasRefluxo: v })}
              options={[
                { value: "femoral", label: "Femoral" },
                { value: "poplitea", label: "Poplítea" },
                { value: "tibiaisPosteriores", label: "Tibiais posteriores" },
                { value: "fibulares", label: "Fibulares" },
              ]}
            />
          </div>
        </div>
      </Section>

      {/* SAFENA MAGNA */}
      <Section title="Veia safena magna" defaultOpen={true}>
        <Toggle
          checked={data.magnaPresente}
          onChange={(v) => set({ magnaPresente: v })}
          label="Safena magna presente / avaliada"
        />
        {data.magnaPresente && (
          <>
            <div style={{ marginTop: 6 }}>
              <Label>Diâmetros ao ortostatismo (preencha apenas os medidos):</Label>
              <DiameterTable
                segments={SEGMENTS_MAGNA}
                values={data.magnaDiametros}
                onChange={(k, v) => setDiam("magnaDiametros", k, v)}
              />
            </div>

            <div style={{ marginTop: 12, borderTop: `1px solid ${COLORS.border}`, paddingTop: 10 }}>
              <Label>Padrão de refluxo (Doppler):</Label>
              <div style={{ marginTop: 6 }}>
                <RefluxoTrechosEditor
                  semRefluxo={data.magnaSemRefluxo}
                  onSemRefluxoChange={(v) => set({ magnaSemRefluxo: v })}
                  trechos={data.magnaRefluxos}
                  onChange={(v) => set({ magnaRefluxos: v })}
                  segmentOptions={SEGMENT_LOCATION_OPTIONS}
                  defaultSegment="coxaProx"
                />
              </div>
            </div>

            <div style={{ marginTop: 12, borderTop: `1px solid ${COLORS.border}`, paddingTop: 10 }}>
              <Toggle
                checked={data.acessoriaPresente}
                onChange={(v) => set({ acessoriaPresente: v })}
                label="Veia safena acessória presente"
              />
              {data.acessoriaPresente && (
                <Row>
                  <PillGroup
                    value={data.acessoriaTipo}
                    onChange={(v) => set({ acessoriaTipo: v })}
                    options={[
                      { value: "anterior", label: "Anterior" },
                      { value: "posterior", label: "Posterior" },
                    ]}
                  />
                  <PillGroup
                    value={data.acessoriaRefluxo ? "com" : "sem"}
                    onChange={(v) => set({ acessoriaRefluxo: v === "com" })}
                    options={[
                      { value: "sem", label: "Sem refluxo" },
                      { value: "com", label: "Com refluxo" },
                    ]}
                  />
                </Row>
              )}
            </div>

            <div style={{ marginTop: 12, borderTop: `1px solid ${COLORS.border}`, paddingTop: 10 }}>
              <Toggle
                checked={data.safenaSuperficialAtiva}
                onChange={(v) => set({ safenaSuperficialAtiva: v })}
                label="Safena magna em plano superficial ao compartimento safênico"
              />
              {data.safenaSuperficialAtiva && (
                <Row>
                  <Label>De:</Label>
                  <PillGroup
                    value={data.safenaSuperficialDe}
                    onChange={(v) => set({ safenaSuperficialDe: v })}
                    options={SEGMENT_LOCATION_OPTIONS}
                  />
                </Row>
              )}
              {data.safenaSuperficialAtiva && (
                <Row>
                  <Label>Até:</Label>
                  <PillGroup
                    value={data.safenaSuperficialAte}
                    onChange={(v) => set({ safenaSuperficialAte: v })}
                    options={SEGMENT_LOCATION_OPTIONS}
                  />
                </Row>
              )}
            </div>
          </>
        )}

        {/* SAFENECTOMIA MAGNA — dentro da seção da magna */}
        <div style={{ marginTop: 12, borderTop: `1px solid ${COLORS.border}`, paddingTop: 10 }}>
          <Label>Safenectomia magna:</Label>
          <Row>
            <PillGroup
              value={data.safenectomiaMagna}
              onChange={(v) => set({ safenectomiaMagna: v })}
              options={[
                { value: "none", label: "Não houve" },
                { value: "total", label: "Total" },
                { value: "parcial", label: "Parcial / segmentar" },
              ]}
            />
          </Row>
          {data.safenectomiaMagna === "parcial" && (
            <div style={{ marginTop: 6 }}>
              <Label>Segmento(s) ressecado(s):</Label>
              <Row>
                <PillGroup
                  multi
                  value={data.safenectomiaMagnaSegmentos}
                  onChange={(v) => set({ safenectomiaMagnaSegmentos: v })}
                  options={SEGMENT_LOCATION_OPTIONS}
                />
              </Row>
            </div>
          )}
          {data.safenectomiaMagna !== "none" && (
            <>
              <Row>
                <Toggle
                  checked={data.cotoMagnaRefluxo}
                  onChange={(v) => set({ cotoMagnaRefluxo: v })}
                  label="Coto residual com refluxo"
                />
              </Row>
              <Row>
                <Label>Coto — diâmetro:</Label>
                <NumInput value={data.cotoMagnaDiametro} onChange={(v) => set({ cotoMagnaDiametro: v })} suffix="mm" />
                <Label>extensão:</Label>
                <NumInput value={data.cotoMagnaExtensao} onChange={(v) => set({ cotoMagnaExtensao: v })} suffix="mm" />
              </Row>
            </>
          )}
        </div>
      </Section>
      <Section
        title="Veias perfurantes"
        badge={data.perfurantes.length > 0 ? String(data.perfurantes.length) : null}
        defaultOpen={data.perfurantes.length > 0}
      >
        {data.perfurantes.map((p, idx) => (
          <div
            key={p.id}
            style={{
              background: COLORS.panelAlt,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: 10,
              marginTop: idx === 0 ? 4 : 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted }}>
                Perfurante {idx + 1}
              </span>
              <button
                onClick={() => removePerfurante(p.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: COLORS.danger,
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>

            <Row>
              <Label>Face:</Label>
              <PillGroup
                value={p.face}
                onChange={(v) => updatePerfurante(p.id, { face: v })}
                options={[
                  { value: "medial", label: "Medial" },
                  { value: "lateral", label: "Lateral" },
                  { value: "posterior", label: "Posterior" },
                ]}
              />
            </Row>

            {p.face !== "lateral" && (
              <Row>
                <Label>Tipo:</Label>
                <PillGroup
                  value={p.tipo}
                  onChange={(v) => updatePerfurante(p.id, { tipo: v })}
                  options={[
                    { value: "direta", label: "Direta" },
                    { value: "indireta", label: "Indireta" },
                  ]}
                />
              </Row>
            )}

            <Row>
              <Label>Localização:</Label>
              <PillGroup
                value={p.localizacao}
                onChange={(v) => updatePerfurante(p.id, { localizacao: v })}
                options={[
                  { value: "coxa", label: "Coxa" },
                  { value: "joelho", label: "Joelho" },
                  { value: "perna", label: "Perna" },
                ]}
              />
            </Row>

            <Row>
              <Label>Diâmetro:</Label>
              <NumInput
                value={p.diametro}
                onChange={(v) => updatePerfurante(p.id, { diametro: v })}
                suffix="mm"
              />
              <Label>Distância da base plantar:</Label>
              <NumInput
                value={p.distanciaPlantar}
                onChange={(v) => updatePerfurante(p.id, { distanciaPlantar: v })}
                suffix="cm"
              />
            </Row>

            <Row>
              <Label>Refluxo:</Label>
              {p.face === "lateral" ? (
                <PillGroup
                  value={p.refluxo === "sem" ? "sem" : "com"}
                  onChange={(v) => updatePerfurante(p.id, { refluxo: v })}
                  options={[
                    { value: "sem", label: "Sem refluxo" },
                    { value: "com", label: "Com refluxo" },
                  ]}
                />
              ) : (
                <PillGroup
                  value={p.refluxo}
                  onChange={(v) => updatePerfurante(p.id, { refluxo: v })}
                  options={[
                    { value: "sem", label: "Sem refluxo" },
                    { value: "com", label: "Com refluxo" },
                    {
                      value: "escoando",
                      label: `Escoando da safena ${p.face === "medial" ? "magna" : "parva"}`,
                    },
                    {
                      value: "transferindo",
                      label: `Transferindo p/ safena ${p.face === "medial" ? "magna" : "parva"}`,
                    },
                  ]}
                />
              )}
            </Row>
          </div>
        ))}

        <button
          onClick={addPerfurante}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 10,
            padding: "8px 14px",
            background: "transparent",
            border: `1px dashed ${COLORS.borderLight}`,
            borderRadius: 8,
            color: COLORS.accent,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={14} /> Adicionar perfurante
        </button>
      </Section>

      {/* SAFENA PARVA */}
      <Section title="Veia safena parva" defaultOpen={true}>
        <Toggle
          checked={data.parvaPresente}
          onChange={(v) => set({ parvaPresente: v })}
          label="Safena parva presente / avaliada"
        />
        {data.parvaPresente && (
          <>
            <div style={{ marginTop: 6 }}>
              <Label>Diâmetros ao ortostatismo (preencha apenas os medidos):</Label>
              <DiameterTable
                segments={SEGMENTS_PARVA}
                values={data.parvaDiametros}
                onChange={(k, v) => setDiam("parvaDiametros", k, v)}
              />
            </div>

            <div style={{ marginTop: 12, borderTop: `1px solid ${COLORS.border}`, paddingTop: 10 }}>
              <Label>Padrão de refluxo (Doppler):</Label>
              <div style={{ marginTop: 6 }}>
                <RefluxoTrechosEditor
                  semRefluxo={data.parvaSemRefluxo}
                  onSemRefluxoChange={(v) => set({ parvaSemRefluxo: v })}
                  trechos={data.parvaRefluxos}
                  onChange={(v) => set({ parvaRefluxos: v })}
                  segmentOptions={SEGMENT_LOCATION_OPTIONS_PARVA}
                  defaultSegment="pernaProx"
                />
              </div>

              {!data.parvaSemRefluxo && (
                <Row>
                  <Label>Croça da safena parva, acima da prega poplítea:</Label>
                  <NumInput
                    value={data.parvaCrocaCm}
                    onChange={(v) => set({ parvaCrocaCm: v })}
                    suffix="cm"
                  />
                </Row>
              )}
            </div>
          </>
        )}

        {/* SAFENECTOMIA PARVA — dentro da seção da parva */}
        <div style={{ marginTop: 12, borderTop: `1px solid ${COLORS.border}`, paddingTop: 10 }}>
          <Label>Safenectomia parva:</Label>
          <Row>
            <PillGroup
              value={data.safenectomiaParva}
              onChange={(v) => set({ safenectomiaParva: v })}
              options={[
                { value: "none", label: "Não houve" },
                { value: "total", label: "Total" },
                { value: "parcial", label: "Parcial / segmentar" },
              ]}
            />
          </Row>
          {data.safenectomiaParva === "parcial" && (
            <div style={{ marginTop: 6 }}>
              <Label>Segmento(s) ressecado(s):</Label>
              <Row>
                <PillGroup
                  multi
                  value={data.safenectomiaParvaSegmentos}
                  onChange={(v) => set({ safenectomiaParvaSegmentos: v })}
                  options={SEGMENT_LOCATION_OPTIONS_PARVA}
                />
              </Row>
            </div>
          )}
          {data.safenectomiaParva !== "none" && (
            <Row>
              <Toggle
                checked={data.cotoParvaRefluxo}
                onChange={(v) => set({ cotoParvaRefluxo: v })}
                label="Coto residual com refluxo"
              />
            </Row>
          )}
        </div>
      </Section>

      {/* TRIBUTÁRIAS / RETICULARES */}
      <Section title="Tributárias da croça e veias reticulares" defaultOpen={false}>
        <Toggle
          checked={data.reticulares}
          onChange={(v) => set({ reticulares: v })}
          label="Veias reticulares presentes"
        />
        <Toggle
          checked={data.varicosas}
          onChange={(v) => set({ varicosas: v })}
          label="Veias varicosas presentes"
        />
        <div style={{ marginTop: 12, borderTop: `1px solid ${COLORS.border}`, paddingTop: 10 }}>
          <Label>Veias tributárias da croça com refluxo:</Label>
          <div style={{ fontSize: 11.5, color: COLORS.textMuted, marginTop: 3, marginBottom: 6 }}>
            Magna → varizes para coxa · Parva → varizes para perna
          </div>
          <Row>
            <PillGroup
              value={data.tributariasCroca}
              onChange={(v) => set({ tributariasCroca: v })}
              options={[
                { value: "none", label: "Não" },
                { value: "magna", label: "Da safena magna" },
                { value: "parva", label: "Da safena parva" },
              ]}
            />
          </Row>
        </div>
      </Section>

      {/* ACHADOS ESPECIAIS */}
      <Section title="Achados especiais" subtitle="circunflexa · tromboflebite" defaultOpen={false}>
        {/* CIRCUNFLEXA */}
        <div style={{ padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
          <Toggle
            checked={data.circunflexaAtiva}
            onChange={(v) => set({ circunflexaAtiva: v })}
            label="Veia circunflexa posterior de coxa"
            description="Comunicação entre safena parva e magna"
          />
          {data.circunflexaAtiva && (
            <>
              <Row>
                <Label>Diâmetro:</Label>
                <NumInput
                  value={data.circunflexaDiametro}
                  onChange={(v) => set({ circunflexaDiametro: v })}
                  suffix="mm"
                />
                <Label>Profundidade:</Label>
                <NumInput
                  value={data.circunflexaProfundidade}
                  onChange={(v) => set({ circunflexaProfundidade: v })}
                  suffix="mm"
                />
              </Row>
              <Row>
                <Label>Local da comunicação:</Label>
                <PillGroup
                  value={data.circunflexaLocal}
                  onChange={(v) => set({ circunflexaLocal: v })}
                  options={[
                    { value: "proximalCoxa", label: "Segmento proximal de coxa" },
                    { value: "juncaoSafenoFemoral", label: "Junção safeno-femoral" },
                  ]}
                />
              </Row>
              <Row>
                <Label>Refluxo:</Label>
                <PillGroup
                  value={data.circunflexaRefluxo}
                  onChange={(v) => set({ circunflexaRefluxo: v })}
                  options={[
                    { value: "sem", label: "Sem refluxo" },
                    { value: "com", label: "Com refluxo" },
                  ]}
                />
              </Row>
              {data.circunflexaRefluxo === "com" && (
                <>
                  <Row>
                    <Label>Causado por:</Label>
                    <PillGroup
                      value={data.circunflexaCausadoPor}
                      onChange={(v) => set({ circunflexaCausadoPor: v })}
                      options={[
                        { value: "tributaria", label: "Tributária" },
                        { value: "perfurante", label: "Perfurante" },
                      ]}
                    />
                    <NumInput
                      value={data.circunflexaCausadoCm}
                      onChange={(v) => set({ circunflexaCausadoCm: v })}
                      suffix="cm"
                    />
                  </Row>
                  <Row>
                    <Label>Escoado por:</Label>
                    <PillGroup
                      value={data.circunflexaEscoadoPor}
                      onChange={(v) => set({ circunflexaEscoadoPor: v })}
                      options={[
                        { value: "tributaria", label: "Tributária" },
                        { value: "perfurante", label: "Perfurante" },
                      ]}
                    />
                    <NumInput
                      value={data.circunflexaEscoadoCm}
                      onChange={(v) => set({ circunflexaEscoadoCm: v })}
                      suffix="cm"
                    />
                  </Row>
                </>
              )}
            </>
          )}
        </div>

        {/* TROMBOFLEBITE RECENTE */}
        <div style={{ padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
          <Toggle
            checked={data.tromboRecenteAtiva}
            onChange={(v) => set({ tromboRecenteAtiva: v })}
            label="Tromboflebite superficial recente"
          />
          {data.tromboRecenteAtiva && (
            <TromboCard
              veias={data.tromboRecenteVeias}
              segmentos={data.tromboRecenteSegmentos}
              segmentosParva={data.tromboRecenteSegmentosParva}
              faces={data.tromboRecenteFaces}
              locais={data.tromboRecenteLocais}
              onChange={(patch) => {
                const mapped = {};
                if ("veias" in patch) mapped.tromboRecenteVeias = patch.veias;
                if ("segmentos" in patch) mapped.tromboRecenteSegmentos = patch.segmentos;
                if ("segmentosParva" in patch) mapped.tromboRecenteSegmentosParva = patch.segmentosParva;
                if ("faces" in patch) mapped.tromboRecenteFaces = patch.faces;
                if ("locais" in patch) mapped.tromboRecenteLocais = patch.locais;
                set(mapped);
              }}
            />
          )}
        </div>

        {/* TROMBOFLEBITE ANTIGA */}
        <div style={{ paddingTop: 10 }}>
          <Toggle
            checked={data.tromboAntigaAtiva}
            onChange={(v) => set({ tromboAntigaAtiva: v })}
            label="Tromboflebite superficial antiga (recanalização parcial)"
          />
          {data.tromboAntigaAtiva && (
            <TromboCard
              veias={data.tromboAntigaVeias}
              segmentos={data.tromboAntigaSegmentos}
              segmentosParva={data.tromboAntigaSegmentosParva}
              faces={data.tromboAntigaFaces}
              locais={data.tromboAntigaLocais}
              onChange={(patch) => {
                const mapped = {};
                if ("veias" in patch) mapped.tromboAntigaVeias = patch.veias;
                if ("segmentos" in patch) mapped.tromboAntigaSegmentos = patch.segmentos;
                if ("segmentosParva" in patch) mapped.tromboAntigaSegmentosParva = patch.segmentosParva;
                if ("faces" in patch) mapped.tromboAntigaFaces = patch.faces;
                if ("locais" in patch) mapped.tromboAntigaLocais = patch.locais;
                set(mapped);
              }}
            />
          )}
        </div>
      </Section>
    </div>
  );
}

/* ============================================================
   PREVIEW DO LAUDO (texto)
   ============================================================ */

function renderDiamRow(s, value) {
  const label = s.header
    ? <strong>{s.label}</strong>
    : <span style={{ paddingLeft: 16, display: "block" }}>{s.label}</span>;
  return (
    <tr key={s.key}>
      <td style={{
        ...previewTdLabel,
        fontWeight: s.header ? 600 : 400,
        color: s.header ? "#E7ECF5" : COLORS.textMuted,
        paddingLeft: s.indent ? 22 : 10,
      }}>
        {s.label}
      </td>
      <td style={previewTdValue}>{value}</td>
    </tr>
  );
}

function renderLineWithTable(line, member, key) {
  if (line === "__TABLE_MAGNA__") {
    return (
      <table key={key} style={previewTableStyle}>
        <tbody>
          {SEGMENTS_MAGNA.map((s) =>
            renderDiamRow(s, member.magnaDiametros[s.key] !== "" ? `${member.magnaDiametros[s.key]} mm` : "---")
          )}
        </tbody>
      </table>
    );
  }
  if (line === "__TABLE_PARVA__") {
    return (
      <table key={key} style={previewTableStyle}>
        <tbody>
          {SEGMENTS_PARVA.map((s) =>
            renderDiamRow(s, member.parvaDiametros[s.key] !== "" ? `${member.parvaDiametros[s.key]} mm` : "---")
          )}
        </tbody>
      </table>
    );
  }
  if (line === "") return <div key={key} style={{ height: 8 }} />;
  const isHeading = line === line.toUpperCase() && /[A-ZÀ-Ú]/.test(line) && !line.startsWith("-");
  return (
    <div
      key={key}
      style={{
        fontWeight: isHeading ? 700 : 400,
        marginBottom: 4,
        color: isHeading ? COLORS.text : "#C7D2E4",
      }}
    >
      {line}
    </div>
  );
}

const previewTableStyle = {
  borderCollapse: "collapse",
  margin: "6px 0 10px 0",
  fontSize: 12.5,
};
const previewTdLabel = {
  border: `1px solid ${COLORS.borderLight}`,
  padding: "4px 10px",
  color: COLORS.textMuted,
  background: COLORS.panelAlt,
};
const previewTdValue = {
  border: `1px solid ${COLORS.borderLight}`,
  padding: "4px 14px",
  color: COLORS.text,
  minWidth: 60,
};

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
    <div style={{ fontSize: 13, lineHeight: 1.55 }}>
      <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 2 }}>ECODOPPLER COLORIDO</div>
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
      <div style={{ color: "#C7D2E4", marginBottom: 14 }}>
        Avaliação anatômica e hemodinâmica dos sistemas venosos profundo e superficial.
      </div>

      {blocks.map((b) => (
        <div key={"anat-" + b.side}>{b.anatomico.map((l) => renderLineWithTable(l, b.member, k++))}</div>
      ))}
      {blocks.map((b) => (
        <div key={"dopp-" + b.side}>{b.doppler.map((l) => renderLineWithTable(l, b.member, k++))}</div>
      ))}

      <div style={{ fontWeight: 700, color: COLORS.text, marginTop: 6, marginBottom: 4 }}>
        CONCLUSÃO
      </div>
      {blocks.map((b) => (
        <div key={"conc-" + b.side}>{b.conclusao.map((l) => renderLineWithTable(l, b.member, k++))}</div>
      ))}
    </div>
  );
}

/* ============================================================
   EXPORTAÇÃO .DOCX
   ============================================================ */

async function exportDocx(state, patientName, examDate) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    AlignmentType,
    WidthType,
    BorderStyle,
  } = await import("docx");

  const blocks = buildFullReportBlocks(state);
  const title = reportTitle(state);

  const FONT = "Helvetica Neue";
  const SZ = 24;       // 12pt (Word usa half-points)
  const SZ_HD = 24;    // 12pt negrito para títulos de seção
  const SZ_TITLE = 24; // 12pt negrito para cabeçalho
  const SP = 60;       // espaçamento normal entre parágrafos
  const SP_HD = 60;    // espaçamento após títulos
  const LINE = 240;    // altura de uma linha em branco (~12pt × 20 = 240 twips)

  function tr(text, opts = {}) {
    return new TextRun({ text, font: FONT, size: SZ, ...opts });
  }

  const border = { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" };
  const borders = { top: border, bottom: border, left: border, right: border };

  function diamTable(segments, values, fillEmpty = false) {
    return new Table({
      width: { size: 50, type: WidthType.PERCENTAGE },
      rows: segments.map(
        (s) =>
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 35, type: WidthType.PERCENTAGE },
                shading: { fill: s.indent ? "F5F5F5" : "E8E8E8" },
                margins: { top: 30, bottom: 30, left: s.indent ? 280 : 80, right: 80 },
                children: [
                  new Paragraph({
                    spacing: { after: 0 },
                    children: [tr(s.label)],  // item 1: sem negrito
                  }),
                ],
              }),
              new TableCell({
                borders,
                width: { size: 15, type: WidthType.PERCENTAGE },
                shading: { fill: "FFFFFF" },
                margins: { top: 30, bottom: 30, left: 80, right: 80 },
                children: [
                  new Paragraph({
                    spacing: { after: 0 },
                    children: [
                      tr(values[s.key] !== "" ? `${values[s.key]} mm` : (fillEmpty ? "---" : "")),
                    ],
                  }),
                ],
              }),
            ],
          })
      ),
    });
  }

  function paraText(text) {
    const upper = text === text.toUpperCase() && /[A-Z\u00C0-\u00DA]/.test(text) && !text.startsWith("-");
    return new Paragraph({
      spacing: { after: SP },
      children: [tr(text, { bold: upper })],
    });
  }

  function emptyLine() {
    return new Paragraph({ children: [], spacing: { after: LINE } });
  }

  function blockToParagraphs(lines, member) {
    const out = [];
    lines.forEach((line) => {
      if (line === "__TABLE_MAGNA__") {
        try { out.push(diamTable(SEGMENTS_MAGNA, member.magnaDiametros, true)); }
        catch(e) { out.push(new Paragraph({ children: [tr("[tabela safena magna]")] })); }
        out.push(new Paragraph({ children: [], spacing: { after: SP } }));
      } else if (line === "__TABLE_PARVA__") {
        try { out.push(diamTable(SEGMENTS_PARVA, member.parvaDiametros)); }
        catch(e) { out.push(new Paragraph({ children: [tr("[tabela safena parva]")] })); }
        out.push(new Paragraph({ children: [], spacing: { after: SP } }));
      } else if (line === "") {
        out.push(new Paragraph({ children: [], spacing: { after: SP } }));
      } else {
        out.push(paraText(line));
      }
    });
    return out;
  }

  const pageProps = {
    size: { width: 12240, height: 15840 },
    margin: { top: 720, right: 720, bottom: 720, left: 720 },
  };

  function buildSectionChildren(block) {
    const sc = [];
    const memberTitle = `MAPEAMENTO VENOSO DO MEMBRO INFERIOR ${SIDE_LABEL[block.side]}`;

    // Cabeçalho + item 2: linha em branco após o título
    sc.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [
          tr("ECODOPPLER COLORIDO \u2014 ", { bold: true }),
          tr(memberTitle, { bold: true }),
        ],
      })
    );
    sc.push(emptyLine()); // item 2: linha em branco após título

    if (patientName && patientName.trim()) {
      sc.push(new Paragraph({
        spacing: { after: SP },
        children: [tr("Paciente: ", { bold: true }), tr(patientName.trim())],
      }));
    }
    if (examDate && examDate.trim()) {
      sc.push(new Paragraph({
        spacing: { after: 0 },
        children: [tr("Data: ", { bold: true }), tr(examDate.trim())],
      }));
      sc.push(emptyLine()); // item 2: linha em branco após data
    }

    sc.push(new Paragraph({
      spacing: { after: SP },
      children: [tr("Avalia\u00e7\u00e3o anat\u00f4mica e hemodin\u00e2mica dos sistemas venosos profundo e superficial.")],
    }));

    // Seção anatômica (pular "MEMBRO INFERIOR X" e linha vazia)
    sc.push(...blockToParagraphs(block.anatomico.slice(2), block.member));

    // item 3: linha em branco antes do DOPPLER
    sc.push(emptyLine());
    sc.push(...blockToParagraphs(block.doppler, block.member));

    // item 3: linha em branco antes da CONCLUSÃO
    sc.push(emptyLine());
    sc.push(new Paragraph({
      spacing: { after: SP },
      children: [tr("CONCLUS\u00c3O", { bold: true })],
    }));
    sc.push(...blockToParagraphs(block.conclusao.slice(2), block.member));
    return sc;
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
  const sufixoMembro = sides.length === 2 ? "MMII" : sides[0] === "D" ? "MAP MID" : "MAP MIE";
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
   APP PRINCIPAL
   ============================================================ */

export default function App() {
  const [patientName, setPatientName] = useState("");
  const [examDate, setExamDate] = useState(todayBR());
  const [examDateISO, setExamDateISO] = useState(() => new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState("D");
  const [state, setState] = useState({
    D: defaultMemberState(),
    E: defaultMemberState(),
  });
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);

  const updateSide = useCallback((side, updater) => {
    setState((prev) => ({ ...prev, [side]: updater(prev[side]) }));
  }, []);

  const toggleSide = (side) => {
    setState((prev) => ({
      ...prev,
      [side]: { ...prev[side], incluir: !prev[side].incluir },
    }));
  };

  const [confirmReset, setConfirmReset] = useState(false);

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
    const lines = ["ECODOPPLER COLORIDO", title, ""];
    if (patientName.trim()) lines.push(`Paciente: ${patientName.trim()}`, "");
    if (examDate.trim()) lines.push(`Data: ${examDate.trim()}`, "");
    lines.push("Avaliação anatômica e hemodinâmica dos sistemas venosos profundo e superficial.", "");
    blocks.forEach((b) => {
      b.anatomico.forEach((l) => lines.push(l === "__TABLE_MAGNA__" || l === "__TABLE_PARVA__" ? "" : l));
      lines.push("");
    });
    blocks.forEach((b) => {
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
      await navigator.clipboard.writeText(reportLines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      // fallback silencioso
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
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
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
            <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: 0.2 }}>
              Mapeamento Venoso MMII
            </div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>
              Gerador de laudo · Ecodoppler colorido
            </div>
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
              <button
                onClick={() => setActiveTab("D")}
                style={tabStyle(activeTab === "D")}
              >
                Formulário — Direito
              </button>
            )}
            {state.E.incluir && (
              <button
                onClick={() => setActiveTab("E")}
                style={tabStyle(activeTab === "E")}
              >
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
            <MemberForm
              side={activeTab}
              data={state[activeTab]}
              update={(updater) => updateSide(activeTab, updater)}
            />
          ) : (
            <div
              style={{
                background: COLORS.panel,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
                padding: 16,
              }}
            >
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

      {/* MODAL DE CONFIRMAÇÃO — substitui window.confirm */}
      {confirmReset && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
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
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>
              Novo laudo
            </div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20, lineHeight: 1.5 }}>
              Limpar todos os dados e começar um novo laudo?
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmReset(false)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8,
                  border: `1px solid ${COLORS.borderLight}`,
                  background: "transparent", color: COLORS.textMuted,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={doReset}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8,
                  border: "none",
                  background: COLORS.accent, color: "#06231F",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
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
