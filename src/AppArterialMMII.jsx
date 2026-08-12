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
   MOTOR DE GERAÇÃO DE LAUDO — ARTERIAL DE MEMBROS INFERIORES
   ============================================================ */

const SIDE_LABEL = { D: "DIREITO", E: "ESQUERDO" };

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
function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function joinList(arr) {
  const clean = (arr || []).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  const last = clean[clean.length - 1];
  return `${clean.slice(0, -1).join(", ")} e ${last}`;
}

/* ---------- Opções / vocabulário ---------- */

const FEMORAL_VESSEL_OPTIONS = [
  { value: "femoralComum", label: "Femoral comum" },
  { value: "femoralProfunda", label: "Femoral profunda" },
  { value: "femoral", label: "Femoral (superficial)" },
  { value: "poplitea", label: "Poplítea" },
];
const FEMORAL_LABEL = {
  femoralComum: "artéria femoral comum",
  femoralProfunda: "artéria femoral profunda",
  femoral: "artéria femoral",
  poplitea: "artéria poplítea",
};
const FEMORAL_BASELINE_VESSELS = [
  { value: "femoralComum", label: "femoral comum" },
  { value: "femoralProfunda", label: "femoral profunda" },
  { value: "femoral", label: "femoral" },
  { value: "poplitea", label: "poplítea" },
];
const CASCADE_ORDER = ["femoralComum", "femoral", "poplitea"];

const TIBIAL_VESSEL_OPTIONS = [
  { value: "tibialAnterior", label: "Tibial anterior" },
  { value: "tibialPosterior", label: "Tibial posterior" },
  { value: "fibular", label: "Fibular" },
];
const TIBIAL_LABEL = {
  tibialAnterior: "artéria tibial anterior",
  tibialPosterior: "artéria tibial posterior",
  fibular: "artéria fibular",
};
const TIBIAL_LABEL_SEM_ARTERIA = {
  tibialAnterior: "tibial anterior",
  tibialPosterior: "tibial posterior",
  fibular: "fibular",
};

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
const MORFOLOGIA_LABEL = {
  normal: "normal",
  preservada: "preservada",
  bifasica: "bifásica",
  monofasica: "monofásica",
};

const LOC_FOCAL_OPTIONS = [
  { value: "origem", label: "Origem" },
  { value: "proximal", label: "Segmento proximal" },
  { value: "medio", label: "Segmento médio" },
  { value: "distal", label: "Segmento distal" },
];
const LOC_FOCAL_NOUN = {
  origem: "origem",
  proximal: "segmento proximal",
  medio: "segmento médio",
  distal: "segmento distal",
};
const LOC_FOCAL_PREP = {
  origem: "na",
  proximal: "no",
  medio: "no",
  distal: "no",
};

const REENTRY_OPTIONS = [
  { value: "supraPatelar", label: "Supra-patelar" },
  { value: "infraPatelar", label: "Infra-patelar" },
  { value: "interlinha", label: "Interlinha articular do joelho" },
];

const PAREDE_OPTIONS = [
  { value: "regular", label: "Paredes regulares" },
  { value: "calcificada", label: "Placas com calcificação leve" },
];

const FEMORAL_ACHADO_TIPOS = [
  { value: "estenoseFocal", label: "Estenose focal" },
  { value: "oclusaoSegmentar", label: "Oclusão c/ colateral" },
  { value: "semFluxoTotal", label: "Sem fluxo detectável" },
  { value: "calcificacaoImpossibilitante", label: "Calcificação intensa" },
  { value: "aneurisma", label: "Aneurisma" },
  { value: "pseudoaneurisma", label: "Pseudoaneurisma" },
  { value: "angioplastia", label: "Angioplastia prévia" },
  { value: "aprisionamento", label: "Aprisionamento poplíteo" },
];

const DISTAL_ACHADO_TIPOS = [
  { value: "oclusaoSegmentar", label: "Oclusão c/ colateral" },
  { value: "semFluxoPar", label: "Sem fluxo detectável" },
  { value: "calcificacaoImpossibilitante", label: "Calcificação intensa" },
  { value: "aneurisma", label: "Aneurisma" },
];

const DISTAL_ANEURISMA_VASO_OPTIONS = [
  { value: "troncoTibiofibular", label: "Tronco tibiofibular" },
  ...TIBIAL_VESSEL_OPTIONS,
];

const FEMORAL_ANEURISMA_LABELMAP = {
  femoralComum: { label: "artéria femoral comum", prep: "da" },
  femoralProfunda: { label: "artéria femoral profunda", prep: "da" },
  femoral: { label: "artéria femoral", prep: "da" },
  poplitea: { label: "artéria poplítea", prep: "da" },
};
const DISTAL_ANEURISMA_LABELMAP = {
  troncoTibiofibular: { label: "tronco tíbio-fibular", prep: "do" },
  tibialAnterior: { label: "artéria tibial anterior", prep: "da" },
  tibialPosterior: { label: "artéria tibial posterior", prep: "da" },
  fibular: { label: "artéria fibular", prep: "da" },
};

const PAR_SEM_FLUXO_OPTIONS = [
  { value: "ataPediosa", label: "Tibial anterior / pediosa" },
  { value: "atpFibular", label: "Tibial posterior / fibular" },
];

const ANEURISMA_MORFOLOGIA_OPTIONS = [
  { value: "fusiforme", label: "Fusiforme" },
  { value: "sacular", label: "Sacular" },
];

const PSEUDO_VASO_OPTIONS = [
  { value: "femoralComum", label: "Femoral comum" },
  { value: "femoralProximal", label: "Femoral proximal" },
];
const PSEUDO_VASO_LABEL = {
  femoralComum: "artéria femoral comum",
  femoralProximal: "artéria femoral proximal",
};

const APRISIONAMENTO_MANOBRA_OPTIONS = [
  { value: "extensao", label: "Extensão forçada" },
  { value: "flexao", label: "Flexão forçada" },
];

const PONTE_TIPO_OPTIONS = [
  { value: "femoropopliteaSupra", label: "Fêmoro-poplítea (supragenicular)" },
  { value: "femoropopliteaInfra", label: "Fêmoro-poplítea (infragenicular)" },
  { value: "femorotibial", label: "Fêmoro-tibial" },
  { value: "femorofemoralCruzado", label: "Fêmoro-femoral cruzado" },
  { value: "aortobifemoral", label: "Aorto-bifemoral" },
  { value: "iliacofemoral", label: "Ilíaco-femoral" },
  { value: "outro", label: "Outro" },
];
const PONTE_TIPO_LABEL_TXT = {
  femoropopliteaSupra: "fêmoro-poplítea (supragenicular)",
  femoropopliteaInfra: "fêmoro-poplítea (infragenicular)",
  femorotibial: "fêmoro-tibial",
  femorofemoralCruzado: "fêmoro-femoral cruzado",
  aortobifemoral: "aorto-bifemoral",
  iliacofemoral: "ilíaco-femoral",
};

const PONTE_LOCAL_OPTIONS = [
  { value: "anastomoseProximal", label: "Anastomose proximal" },
  { value: "corpoProximal", label: "Corpo proximal" },
  { value: "corpoMedio", label: "Corpo médio" },
  { value: "corpoDistal", label: "Corpo distal" },
  { value: "anastomoseDistal", label: "Anastomose distal" },
];
const PONTE_LOCAL_LABEL_TXT = {
  anastomoseProximal: "anastomose proximal",
  corpoProximal: "corpo proximal",
  corpoMedio: "corpo médio",
  corpoDistal: "corpo distal",
  anastomoseDistal: "anastomose distal",
};

const PONTE_ANAST_PROX_OPTIONS = [
  { value: "femoralComum", label: "Femoral comum" },
  { value: "bifurcacaoFemoral", label: "Bifurcação femoral" },
  { value: "origemFemoral", label: "Origem da femoral" },
];
const PONTE_ANAST_PROX_LABEL = {
  femoralComum: "artéria femoral comum",
  bifurcacaoFemoral: "bifurcação femoral",
  origemFemoral: "origem da artéria femoral",
};

const PONTE_ANAST_DIST_OPTIONS = [
  { value: "femoralDistal", label: "Femoral distal" },
  { value: "poplitea", label: "Poplítea" },
];
const PONTE_ANAST_DIST_LABEL = {
  femoralDistal: "artéria femoral distal",
  poplitea: "artéria poplítea",
};

const PONTE_ESTENOSE_LOCAL_OPTIONS = [
  { value: "proximal", label: "Anastomose proximal" },
  { value: "distal", label: "Anastomose distal" },
  { value: "derivacao", label: "Corpo da derivação" },
];

/* ---------- Estado padrão ---------- */

function defaultAchadoFemoral() {
  return {
    id: uid(),
    tipo: "estenoseFocal",
    vaso: "femoral",
    localFocal: "proximal",
    grauFocal: "50-75",
    // oclusão segmentar (trechos múltiplos)
    trechosPervio: ["proximal"],
    trechosOcluido: ["distal"],
    reentrada: "supraPatelar",
    reentradaCm: "",
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
    pseudoVaso: "femoralComum",
    pseudoMassaAP: "",
    pseudoMassaLL: "",
    pseudoTrombos: false,
    pseudoColoExtensao: "",
    pseudoColoDiametro: "",
    pseudoSegundaMassaAtiva: false,
    pseudoMassa2AP: "",
    pseudoMassa2LL: "",
    pseudoPertuitoDiametro: "",
    pseudoPertuitoExtensao: "",
    // angioplastia
    angioSegmento: "proximal",
    angioStatus: "pervio",
    angioGrau: "50-75",
    // aprisionamento
    resultado: "negativo",
    aprisionamentoSegmento: "proximal",
    aprisionamentoManobra: "flexao",
  };
}

function defaultAchadoDistal() {
  return {
    id: uid(),
    tipo: "oclusaoSegmentar",
    vaso: "tibialAnterior",
    trechoPervioProx: "proximal",
    morfologiaProx: "normal",
    trechoOcluido: "distal",
    trechoReentrada: "distal",
    parSemFluxo: "ataPediosa",
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
  };
}

function defaultPonte() {
  return {
    id: uid(),
    tipo: "femoropopliteaInfra",
    tipoOutro: "",
    material: "veia",
    status: "pervia",
    anastomoseProximal: "femoralComum",
    anastomoseDistal: "poplitea",
    estenoseLocalPonte: "derivacao",
    anastomoseSegmento: "proximal",
    direcaoCruzada: "direitaParaEsquerda",
    estenoseLocal: "corpoMedio",
    estenoseGrau: "50-75",
  };
}

function defaultSideState() {
  return {
    incluir: true,
    femParede: "regular",
    femMorfologia: "normal",
    femAchados: [],
    pontes: [],
    distMorfologia: "normal",
    distAchados: [],
    obsExtra: "",
  };
}

/* ---------- Cascata hemodinâmica (estenose >75% reduz fluxo a jusante) ---------- */

function computeCascadeMonofasica(femAchados) {
  const vasosAfetados = new Set();
  (femAchados || [])
    .filter((e) => e.tipo === "estenoseFocal" && e.grauFocal === ">75")
    .forEach((e) => {
      if (e.vaso) vasosAfetados.add(e.vaso);
    });

  let cascadeIndex = -1;
  CASCADE_ORDER.forEach((v, i) => {
    if (vasosAfetados.has(v) && (cascadeIndex === -1 || i < cascadeIndex)) cascadeIndex = i;
  });

  return {
    poplíteaMonofasica: cascadeIndex === 0 || cascadeIndex === 1,
    distalMonofasica: cascadeIndex !== -1,
  };
}

/* ---------- Construtores de trecho — achados principais ---------- */

function buildEstenoseFocalLinha(labelMap, e) {
  const vaso = labelMap[e.vaso];
  const grauTxt =
    e.grauFocal === ">75"
      ? "com mais de 75 % de diminuição do diâmetro da luz do vaso"
      : "com aproximadamente 50 a 75 % de diminuição do diâmetro da luz do vaso";
  return `Aumento focal de velocidades e turbilhonamento do fluxo ${LOC_FOCAL_PREP[e.localFocal]} ${LOC_FOCAL_NOUN[e.localFocal]} da ${vaso}, causado por placa de ateroma, compatível com estenose hemodinamicamente significativa, ${grauTxt}.`;
}

function buildOclusaoSegmentarFemoralLinha(labelMap, e) {
  const vaso = labelMap[e.vaso];
  const parts = [];
  const pervioSegs = (e.trechosPervio || []).filter((t) => t !== "nenhum");
  if (pervioSegs.length > 0) {
    parts.push(`Segmento ${joinList(pervioSegs.map((t) => SEGMENTO_LABEL[t]))} da ${vaso} com fluxo.`);
  }
  const ocluidoArr = e.trechosOcluido || [];
  const todaExtensao = ocluidoArr.includes("todaExtensao");
  const ocluidoTxt = todaExtensao
    ? "Toda a extensão"
    : `Segmento ${joinList(ocluidoArr.map((t) => SEGMENTO_LABEL[t]))}`;
  const reentryLocal =
    e.reentrada === "supraPatelar"
      ? `supra-patelar (a aproximadamente ${e.reentradaCm || "__"} cm acima da borda superior da patela)`
      : e.reentrada === "infraPatelar"
      ? "infra-patelar"
      : "na topografia da interlinha articular do joelho";
  // Infra-patelar e interlinha articular são pontos de reentrada anatomicamente relativos à
  // artéria poplítea (abaixo do joelho), independentemente de qual vaso proximal está ocluído.
  const reentryVaso = e.reentrada !== "supraPatelar" && e.vaso !== "poplitea" ? labelMap["poplitea"] : vaso;
  parts.push(
    `${ocluidoTxt} da ${vaso} sem fluxo detectável, porém apresentando circulação colateral reenchendo distalmente a ${reentryVaso} ${reentryLocal}.`
  );
  return parts.join(" ");
}

function buildCalcificacaoLinha(labelMap, e, morfDistalmente = true) {
  const vaso = labelMap[e.vaso];
  const sev = e.calcSeveridade === "dificultando" ? "dificultando" : "impossibilitando";
  const cauda = morfDistalmente
    ? ` Curvas de velocidade de morfologia ${MORFOLOGIA_LABEL[e.calcMorfologia]} distalmente.`
    : "";
  return `${capitalize(vaso)} apresentando placas de ateroma calcificadas, ${sev} a identificação do fluxo em algumas áreas e causando diminuição significativa do fluxo em algumas regiões.${cauda}`;
}

function buildOclusaoSegmentarDistalLinha(labelMap, e) {
  const vaso = labelMap[e.vaso];
  const parts = [];
  if (e.trechoPervioProx && e.trechoPervioProx !== "nenhum") {
    parts.push(
      `Segmento ${SEGMENTO_LABEL[e.trechoPervioProx]} da ${vaso} com fluxo e curvas de morfologia ${MORFOLOGIA_LABEL[e.morfologiaProx]}.`
    );
  }
  const ocluidoTxt =
    e.trechoOcluido === "todaExtensao" ? "Toda a extensão" : `Segmento ${SEGMENTO_LABEL[e.trechoOcluido]}`;
  parts.push(`${ocluidoTxt} da ${vaso} sem fluxo detectável, com reenchimento distal por circulação colateral.`);
  parts.push(`Segmento ${SEGMENTO_LABEL[e.trechoReentrada]} da ${vaso} com fluxo e curvas de morfologia monofásica.`);
  return parts.join(" ");
}

function buildSemFluxoParLinha(e) {
  return e.parSemFluxo === "ataPediosa"
    ? "Artéria tibial anterior / pediosa sem fluxo detectável."
    : "Artéria tibial posterior / fibular sem fluxo detectável.";
}

function buildAneurismaLinhas(labelMap, e) {
  const info = labelMap[e.vaso];
  const segmentos = joinList((e.aneurismaSegmentos || []).map((s) => SEGMENTO_LABEL[s]));
  const aspecto = e.aneurismaMorfologia === "sacular" ? "sacular" : "fusiforme";
  const tromboTxt = e.aneurismaTrombo ? "com" : "sem";
  return [
    `Segmento ${segmentos} ${info.prep} ${info.label} apresentando dilatação de aspecto ${aspecto}, ${tromboTxt} trombos murais e apresentando as seguintes medidas:`,
    `Colo Proximal: ${e.coloProximal || "__"} mm`,
    `Dilatação: ${e.dilatacaoAP || "__"} mm (ântero-posterior) / ${e.dilatacaoLL || "__"} mm (látero-lateral)`,
    `Lúmen Residual: ${e.lumenResidual || "__"} mm`,
    `Colo Distal: ${e.coloDistal || "__"} mm`,
  ];
}

function summarizeAneurismaConclusao(labelMap, e) {
  const info = labelMap[e.vaso];
  const aspecto = e.aneurismaMorfologia === "sacular" ? "sacular" : "fusiforme";
  return `aneurisma ${aspecto} ${info.prep === "do" ? "do" : "da"} ${info.label}, medindo ${e.dilatacaoAP || "__"} x ${e.dilatacaoLL || "__"} mm`;
}

function buildPseudoaneurismaLinhas(e) {
  const vaso = PSEUDO_VASO_LABEL[e.pseudoVaso];
  const tromboTxt = e.pseudoTrombos ? "com" : "sem";
  let texto = `Presença de massa na região inguinal medindo ${e.pseudoMassaAP || "__"} x ${e.pseudoMassaLL || "__"} mm, apresentando fluxo no seu interior, ${tromboTxt} imagens de trombos murais e se comunicando com a ${vaso} através de colo com extensão de ${e.pseudoColoExtensao || "__"} mm e diâmetro de ${e.pseudoColoDiametro || "__"} mm.`;
  if (e.pseudoSegundaMassaAtiva) {
    texto += ` Observa-se ainda, comunicação desta massa com outra massa mais superficial, a qual também apresenta fluxo no seu interior e mede aproximadamente ${e.pseudoMassa2AP || "__"} x ${e.pseudoMassa2LL || "__"} mm. O pertuito de comunicação entre as massas mede ${e.pseudoPertuitoDiametro || "__"} mm de diâmetro e extensão de ${e.pseudoPertuitoExtensao || "__"} mm.`;
  }
  return [texto];
}

function summarizePseudoaneurismaConclusao(e) {
  return `pseudoaneurisma da ${PSEUDO_VASO_LABEL[e.pseudoVaso]}`;
}

function buildAngioplastiaLinhas(labelMap, e) {
  const vaso = labelMap[e.vaso];
  const segmento = SEGMENTO_LABEL[e.angioSegmento];
  if (e.angioStatus === "pervio") {
    return [`Presença de imagem ecogênica tubular (endoprótese arterial / Stent) no lúmen do segmento ${segmento} da ${vaso} com fluxo, sem alterações significativas.`];
  }
  if (e.angioStatus === "oclusao") {
    return [`Presença de imagem ecogênica tubular (endoprótese arterial / Stent) no lúmen do segmento ${segmento} da ${vaso}, sem fluxo detectável em seu interior.`];
  }
  const grauTxt =
    e.angioGrau === ">75"
      ? "com mais de 75 % de diminuição do diâmetro da luz do vaso"
      : "com aproximadamente 50 a 75 % de diminuição do diâmetro da luz do vaso";
  return [`Presença de imagem ecogênica tubular (endoprótese arterial / Stent) no lúmen do segmento ${segmento} da ${vaso}, apresentando reestenose intra-stent por hiperplasia neointimal, com aumento focal de velocidades e turbilhonamento do fluxo, ${grauTxt}.`];
}

function buildAprisionamentoLinhas(side, e) {
  if (e.resultado === "positivo") {
    const ladoTxt = side === "D" ? "direita" : "esquerda";
    const segmento = SEGMENTO_LABEL[e.aprisionamentoSegmento];
    const manobraTxt = e.aprisionamentoManobra === "extensao" ? "extensão" : "flexão";
    return [
      `Presença de aumento focal de velocidade e turbilhonamento do fluxo no segmento ${segmento} da artéria poplítea ${ladoTxt} durante a manobra de ${manobraTxt} forçada do pé, sugestivo de compressão extrínseca.`,
    ];
  }
  return [
    "Executada pesquisa de Síndrome do Aprisionamento da Artéria Poplítea através das manobras de extensão e flexão forçadas no pé, não sendo observada alteração significativa do fluxo durante as referidas manobras.",
  ];
}

function buildFemoralBaseline(m, excludeVasos) {
  const paredeTxt =
    m.femParede === "calcificada"
      ? "placas de ateroma com calcificação em algumas áreas, causando irregularidades parietais difusas"
      : "paredes regulares";
  const morfSentence = `Curvas de velocidade de morfologia ${MORFOLOGIA_LABEL[m.femMorfologia]}.`;

  const vessels = FEMORAL_BASELINE_VESSELS.filter((v) => !excludeVasos.has(v.value));
  if (vessels.length === 0) return morfSentence;

  const names = vessels.map((v) => v.label);
  let vesselPhrase;
  if (names.length === 1) {
    vesselPhrase = `Artéria ${names[0]}`;
  } else {
    const last = names[names.length - 1];
    const rest = names.slice(0, -1);
    vesselPhrase = `Artérias ${rest.join(", ")} e ${last}`;
  }

  return `${vesselPhrase} apresentando diâmetros normais, ${paredeTxt}, sem alteração do fluxo. ${morfSentence}`;
}

/* ---------- Pontes / enxertos (bypass) ---------- */

function buildPonteFemoropoplíteaLinha(p) {
  const materialTxt = p.material === "protese" ? "prótese" : "veia";
  const anastProxTxt = PONTE_ANAST_PROX_LABEL[p.anastomoseProximal];
  const anastDistTxt = PONTE_ANAST_DIST_LABEL[p.anastomoseDistal];
  let statusTxt;
  if (p.status === "oclusao") {
    statusTxt = "Derivação arterial sem fluxo.";
  } else if (p.status === "estenose") {
    const localTxt =
      p.estenoseLocalPonte === "proximal"
        ? "Área de anastomose proximal"
        : p.estenoseLocalPonte === "distal"
        ? "Área de anastomose distal"
        : "Derivação arterial";
    statusTxt = `${localTxt} apresentando aumento focal de velocidades e discreto turbilhonamento do fluxo, sugestivo de alteração hemodinâmica.`;
  } else {
    statusTxt = "Não há alteração do fluxo em toda extensão da derivação e nas áreas de anastomoses.";
  }
  return `Derivação arterial (${materialTxt}) no território fêmoro-poplíteo com área de anastomose proximal na topografia da ${anastProxTxt} e área de anastomose distal na topografia da ${anastDistTxt}. ${statusTxt}`;
}

function buildPonteAortobifemoralLinha(side, p) {
  const ladoTxt = side === "D" ? "direita" : "esquerda";
  const segmentoTxt = SEGMENTO_LABEL[p.anastomoseSegmento];
  if (p.status === "oclusao") {
    return `Observa-se área de anastomose distal (prótese arterial) no segmento ${segmentoTxt} da artéria femoral comum ${ladoTxt}, sem fluxo detectável.`;
  }
  const statusTxt =
    p.status === "estenose" ? "com alterações hemodinamicamente significativas" : "sem alterações hemodinamicamente significativas";
  return `Observa-se área de anastomose distal (prótese arterial) no segmento ${segmentoTxt} da artéria femoral comum ${ladoTxt} com fluxo, ${statusTxt}.`;
}

function buildPonteCruzadaLinha(p) {
  const [origemTxt, destinoTxt] =
    p.direcaoCruzada === "esquerdaParaDireita" ? ["esquerda", "direita"] : ["direita", "esquerda"];
  const anastProxLado = origemTxt;
  const anastDistLado = destinoTxt;
  let statusTxt;
  if (p.status === "oclusao") {
    statusTxt = "Derivação arterial sem fluxo.";
  } else if (p.status === "estenose") {
    const localTxt =
      p.estenoseLocalPonte === "proximal"
        ? "Área de anastomose proximal"
        : p.estenoseLocalPonte === "distal"
        ? "Área de anastomose distal"
        : "Derivação arterial";
    statusTxt = `${localTxt} apresentando aumento focal de velocidades e discreto turbilhonamento do fluxo, sugestivo de alteração hemodinâmica.`;
  } else {
    statusTxt = "Não há alteração do fluxo em toda extensão da derivação e nas áreas de anastomoses. Curvas de velocidade de morfologia preservada.";
  }
  return `Derivação arterial (prótese) fêmoro-femoral da ${origemTxt} para a ${destinoTxt} com área de anastomose proximal na artéria femoral comum ${anastProxLado} e área de anastomose distal na bifurcação femoral ${anastDistLado}. ${statusTxt}`;
}

function buildPonteGenericaLinha(p) {
  const tipoTxt = p.tipo === "outro" ? p.tipoOutro || "__" : PONTE_TIPO_LABEL_TXT[p.tipo];
  const materialTxt = p.material === "protese" ? "prótese" : "veia";
  if (p.status === "oclusao") {
    return `Ponte de ${materialTxt} em posição ${tipoTxt}, ocluída, sem fluxo detectável em seu interior.`;
  }
  if (p.status === "estenose") {
    const grauTxt =
      p.estenoseGrau === ">75"
        ? "com mais de 75 % de diminuição do diâmetro da luz do vaso"
        : "com aproximadamente 50 a 75 % de diminuição do diâmetro da luz do vaso";
    return `Ponte de ${materialTxt} em posição ${tipoTxt}, pérvia, apresentando estenose focal em ${PONTE_LOCAL_LABEL_TXT[p.estenoseLocal]}, com aumento focal de velocidades e turbilhonamento do fluxo, ${grauTxt}.`;
  }
  return `Ponte de ${materialTxt} em posição ${tipoTxt}, pérvia, sem alterações significativas do fluxo, com anastomoses proximal e distal sem sinais de estenose.`;
}

function buildPonteLinha(side, p) {
  if (p.tipo === "femoropopliteaSupra" || p.tipo === "femoropopliteaInfra") return buildPonteFemoropoplíteaLinha(p);
  if (p.tipo === "aortobifemoral") return buildPonteAortobifemoralLinha(side, p);
  if (p.tipo === "femorofemoralCruzado") return buildPonteCruzadaLinha(p);
  return buildPonteGenericaLinha(p);
}

function summarizePonteConclusao(side, p) {
  const materialTxt = p.material === "protese" ? "prótese" : "veia";
  if (p.tipo === "aortobifemoral") {
    const ladoTxt = side === "D" ? "direita" : "esquerda";
    if (p.status === "oclusao") return `ponte aorto-bifemoral (anastomose na femoral comum ${ladoTxt}) sem fluxo detectável`;
    if (p.status === "estenose") return `ponte aorto-bifemoral (anastomose na femoral comum ${ladoTxt}) com alterações hemodinamicamente significativas`;
    return "ponte aorto-bifemoral pérvia, sem alterações hemodinamicamente significativas";
  }
  if (p.tipo === "femorofemoralCruzado") {
    if (p.status === "oclusao") return "ponte fêmoro-femoral cruzada sem fluxo detectável";
    if (p.status === "estenose") return "ponte fêmoro-femoral cruzada com alteração hemodinâmica focal";
    return "ponte fêmoro-femoral cruzada pérvia, sem alteração do fluxo";
  }
  if (p.tipo === "femoropopliteaSupra" || p.tipo === "femoropopliteaInfra") {
    if (p.status === "oclusao") return `derivação arterial (${materialTxt}) fêmoro-poplítea sem fluxo`;
    if (p.status === "estenose") return `derivação arterial (${materialTxt}) fêmoro-poplítea com alteração hemodinâmica focal`;
    return `derivação arterial (${materialTxt}) fêmoro-poplítea pérvia, sem alteração do fluxo`;
  }
  const tipoTxt = p.tipo === "outro" ? p.tipoOutro || "__" : PONTE_TIPO_LABEL_TXT[p.tipo];
  if (p.status === "oclusao") return `ponte de ${materialTxt} em posição ${tipoTxt}, ocluída`;
  if (p.status === "estenose") return `ponte de ${materialTxt} em posição ${tipoTxt}, com estenose focal`;
  return `ponte de ${materialTxt} em posição ${tipoTxt}, pérvia, sem alterações significativas`;
}

function buildTerritorioFemoral(side, m, cascade) {
  const femAchados = m.femAchados || [];
  const aneurismaVasos = new Set(femAchados.filter((e) => e.tipo === "aneurisma").map((e) => e.vaso));
  const semFluxoTotalVasos = new Set(femAchados.filter((e) => e.tipo === "semFluxoTotal").map((e) => e.vaso));
  const estenoseVasosSet = new Set(femAchados.filter((e) => e.tipo === "estenoseFocal").map((e) => e.vaso));
  const oclusaoVasosSet = new Set(femAchados.filter((e) => e.tipo === "oclusaoSegmentar").map((e) => e.vaso));

  const poplíteaJaDescrita =
    estenoseVasosSet.has("poplitea") || oclusaoVasosSet.has("poplitea") || aneurismaVasos.has("poplitea") || semFluxoTotalVasos.has("poplitea");
  const poplíteaForcadaMonofasica = cascade.poplíteaMonofasica && !poplíteaJaDescrita;

  const baselineExclude = new Set([...aneurismaVasos, ...semFluxoTotalVasos, ...estenoseVasosSet, ...oclusaoVasosSet]);
  if (poplíteaForcadaMonofasica) baselineExclude.add("poplitea");

  const lines = ["[Segmento Fêmoro-Poplíteo]", buildFemoralBaseline(m, baselineExclude)];

  femAchados.forEach((e) => {
    if (e.tipo === "estenoseFocal") lines.push(buildEstenoseFocalLinha(FEMORAL_LABEL, e));
    else if (e.tipo === "oclusaoSegmentar") lines.push(buildOclusaoSegmentarFemoralLinha(FEMORAL_LABEL, e));
    else if (e.tipo === "semFluxoTotal") lines.push(`${capitalize(FEMORAL_LABEL[e.vaso])} sem fluxo detectável.`);
    else if (e.tipo === "calcificacaoImpossibilitante") lines.push(buildCalcificacaoLinha(FEMORAL_LABEL, e));
    else if (e.tipo === "aneurisma") lines.push(...buildAneurismaLinhas(FEMORAL_ANEURISMA_LABELMAP, e));
    else if (e.tipo === "pseudoaneurisma") lines.push(...buildPseudoaneurismaLinhas(e));
    else if (e.tipo === "angioplastia") lines.push(...buildAngioplastiaLinhas(FEMORAL_LABEL, e));
    else if (e.tipo === "aprisionamento") lines.push(...buildAprisionamentoLinhas(side, e));
  });

  if (poplíteaForcadaMonofasica) {
    lines.push(
      "Artéria poplítea com fluxo e curvas de velocidade de morfologia monofásica, em decorrência de estenose proximal."
    );
  }

  (m.pontes || []).forEach((p) => lines.push(buildPonteLinha(side, p)));
  return lines;
}

function distalVesselHasAchado(distAchados, vesselValues) {
  return distAchados.some((e) => {
    if (e.tipo === "semFluxoPar") {
      if (vesselValues.includes("tibialAnterior") && e.parSemFluxo === "ataPediosa") return true;
      if ((vesselValues.includes("tibialPosterior") || vesselValues.includes("fibular")) && e.parSemFluxo === "atpFibular") return true;
      return false;
    }
    return vesselValues.includes(e.vaso);
  });
}

function buildTerritorioDistal(m, cascade) {
  const distAchados = m.distAchados || [];
  const troncoAfetado = distalVesselHasAchado(distAchados, ["troncoTibiofibular"]);
  const ataAfetado = distalVesselHasAchado(distAchados, ["tibialAnterior"]);
  const atpFibularAfetado = distalVesselHasAchado(distAchados, ["tibialPosterior", "fibular"]);

  const morfEfetiva = cascade.distalMonofasica ? "monofasica" : m.distMorfologia;

  const lines = ["[Segmento Poplíteo-Podal]"];
  if (!troncoAfetado) {
    lines.push("Tronco tíbio-fibular com fluxo, sem alterações significativas.");
  }
  if (!ataAfetado) {
    lines.push(
      `Artérias tibial anterior e pediosa com fluxo e curvas de velocidade de morfologia ${MORFOLOGIA_LABEL[morfEfetiva]}.`
    );
  }
  if (!atpFibularAfetado) {
    lines.push(
      `Artérias tibial posterior e fibular com fluxo em toda a extensão e curvas de velocidade de morfologia ${MORFOLOGIA_LABEL[morfEfetiva]}.`
    );
  }
  distAchados.forEach((e) => {
    if (e.tipo === "oclusaoSegmentar") lines.push(buildOclusaoSegmentarDistalLinha(TIBIAL_LABEL, e));
    else if (e.tipo === "semFluxoPar") lines.push(buildSemFluxoParLinha(e));
    else if (e.tipo === "calcificacaoImpossibilitante") lines.push(buildCalcificacaoLinha(TIBIAL_LABEL, e));
    else if (e.tipo === "aneurisma") lines.push(...buildAneurismaLinhas(DISTAL_ANEURISMA_LABELMAP, e));
  });
  return lines;
}

function buildSideBlock(side, m) {
  const cascade = computeCascadeMonofasica(m.femAchados || []);
  return {
    side,
    header: `MEMBRO INFERIOR ${SIDE_LABEL[side]}`,
    femoral: buildTerritorioFemoral(side, m, cascade),
    distal: buildTerritorioDistal(m, cascade),
    obs: [],
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

/* ---------- Conclusão ---------- */

function pickWorstFemoral(estenoses, oclusoes, semFluxos) {
  if (semFluxos.length > 0) return { tipo: "semFluxo" };
  if (oclusoes.length > 0) return { tipo: "oclusao", entry: oclusoes[0] };
  if (estenoses.length > 0) {
    const e75 = estenoses.find((e) => e.grauFocal === ">75");
    return { tipo: "estenose", entry: e75 || estenoses[0] };
  }
  return null;
}

function pickWorstDistal(oclusoes, semFluxos) {
  if (semFluxos.length > 0) return { tipo: "semFluxo" };
  if (oclusoes.length > 0) return { tipo: "oclusao", entry: oclusoes[0] };
  return null;
}

function buildConclusaoFemoralLinhas(side, m) {
  const achados = m.femAchados || [];
  const pontes = m.pontes || [];
  const estenoses = achados.filter((e) => e.tipo === "estenoseFocal");
  const oclusoes = achados.filter((e) => e.tipo === "oclusaoSegmentar");
  const semFluxos = achados.filter((e) => e.tipo === "semFluxoTotal");
  const aneurismas = achados.filter((e) => e.tipo === "aneurisma");
  const pseudoaneurismas = achados.filter((e) => e.tipo === "pseudoaneurisma");
  const angioplastias = achados.filter((e) => e.tipo === "angioplastia");
  const angioAbnormal = angioplastias.filter((e) => e.angioStatus !== "pervio");
  const aprisionamentos = achados.filter((e) => e.tipo === "aprisionamento");
  const aprisionamentoPositivo = aprisionamentos.filter((e) => e.resultado === "positivo");

  const worst = pickWorstFemoral(estenoses, oclusoes, semFluxos);

  const lines = [];
  const semAchados =
    !worst &&
    aneurismas.length === 0 &&
    pseudoaneurismas.length === 0 &&
    angioAbnormal.length === 0 &&
    aprisionamentoPositivo.length === 0 &&
    pontes.length === 0;

  if (semAchados) {
    lines.push("Não há dilatações ou estenoses hemodinamicamente significativas no território fêmoro-poplíteo.");
  } else {
    if (worst) {
      if (worst.tipo === "semFluxo") {
        lines.push("Obstrução no território fêmoro-poplíteo, sem reenchimento distal identificado.");
      } else if (worst.tipo === "oclusao") {
        const reentradaTxt =
          worst.entry.reentrada === "infraPatelar"
            ? "infra-patelar"
            : worst.entry.reentrada === "interlinha"
            ? "na interlinha articular do joelho"
            : "supra-patelar";
        lines.push(`Obstrução no território fêmoro-poplíteo, reenchendo distalmente ${reentradaTxt}.`);
      } else if (worst.tipo === "estenose") {
        const grauTxt = worst.entry.grauFocal === ">75" ? "> 75 %" : "50-75 %";
        lines.push(`Território fêmoro-poplíteo pérvio, porém com estenose hemodinamicamente significativa (${grauTxt}).`);
      }
    }
    aneurismas.forEach((e) => {
      lines.push(`${capitalize(summarizeAneurismaConclusao(FEMORAL_ANEURISMA_LABELMAP, e))}.`);
    });
    pseudoaneurismas.forEach((e) => {
      lines.push(`${capitalize(summarizePseudoaneurismaConclusao(e))}.`);
    });
    aprisionamentoPositivo.forEach(() => {
      lines.push("Síndrome de aprisionamento da artéria poplítea, com compressão extrínseca do fluxo durante manobra provocativa.");
    });
    pontes.forEach((p) => lines.push(`${capitalize(summarizePonteConclusao(side, p))}.`));
  }

  angioplastias.forEach((e) => {
    if (e.angioStatus === "pervio") lines.push("Endoprótese arterial (Stent) pérvia no território fêmoro-poplíteo, sem alterações significativas.");
    else if (e.angioStatus === "oclusao") lines.push("Endoprótese arterial (Stent) ocluída no território fêmoro-poplíteo.");
    else lines.push("Endoprótese arterial (Stent) com reestenose no território fêmoro-poplíteo.");
  });

  aprisionamentos
    .filter((e) => e.resultado !== "positivo")
    .forEach(() => {
      lines.push("Teste para Síndrome do Aprisionamento da Artéria Poplítea negativo.");
    });

  return lines;
}

function buildConclusaoDistalLinhas(m) {
  const achados = m.distAchados || [];
  const oclusoes = achados.filter((e) => e.tipo === "oclusaoSegmentar");
  const semFluxos = achados.filter((e) => e.tipo === "semFluxoPar");
  const aneurismas = achados.filter((e) => e.tipo === "aneurisma");

  const worst = pickWorstDistal(oclusoes, semFluxos);

  const lines = [];
  const semAchados = !worst && aneurismas.length === 0;

  if (semAchados) {
    lines.push("Não há dilatações ou estenoses hemodinamicamente significativas no território poplíteo-podal.");
  } else {
    if (worst) {
      if (worst.tipo === "semFluxo") {
        const vasoTxt = worst.entry.parSemFluxo === "ataPediosa" ? "tibial anterior / pediosa" : "tibial posterior / fibular";
        lines.push(`Obstrução segmentar na artéria ${vasoTxt}.`);
      } else if (worst.tipo === "oclusao") {
        lines.push(`Obstrução segmentar na artéria ${TIBIAL_LABEL_SEM_ARTERIA[worst.entry.vaso]}.`);
      }
    }
    aneurismas.forEach((e) => {
      lines.push(`${capitalize(summarizeAneurismaConclusao(DISTAL_ANEURISMA_LABELMAP, e))}.`);
    });
  }

  return lines;
}

function buildConclusaoObsAortoIliacoLinha(side, m) {
  if (m.femMorfologia !== "monofasica") return null;
  const ladoTxt = side === "D" ? "direita" : "esquerda";
  return `* Obs.: A critério médico, realizar Ecodoppler Colorido do Território Aorto-Ilíaco, devido ao padrão das curvas de velocidade morfologia monofásica na artéria femoral comum ${ladoTxt}.`;
}

function buildConclusaoSection(state) {
  const sides = getActiveSides(state);
  if (sides.length === 0) return [];
  const lines = ["CONCLUSÃO"];
  sides.forEach((side) => {
    const m = state[side];
    lines.push(`MEMBRO INFERIOR ${SIDE_LABEL[side]}`);
    lines.push(...buildConclusaoFemoralLinhas(side, m));
    lines.push(...buildConclusaoDistalLinhas(m));

    const temCalc =
      (m.femAchados || []).some((e) => e.tipo === "calcificacaoImpossibilitante") ||
      (m.distAchados || []).some((e) => e.tipo === "calcificacaoImpossibilitante");
    if (temCalc) lines.push("Calcificação parietal difusa.");

    const obsLinha = buildConclusaoObsAortoIliacoLinha(side, m);
    if (obsLinha) lines.push(obsLinha);
  });
  return lines;
}

function buildTituloLinhas(state) {
  const sides = getActiveSides(state);
  if (sides.length === 2) {
    return "ECODOPPLER COLORIDO - SISTEMA ARTERIAL DOS MEMBROS INFERIORES BILATERALMENTE";
  }
  if (sides.length === 1) {
    const ladoTxt = sides[0] === "D" ? "DIREITO" : "ESQUERDO";
    return `ECODOPPLER COLORIDO - SISTEMA ARTERIAL DO MEMBRO INFERIOR ${ladoTxt}`;
  }
  return "ECODOPPLER COLORIDO - SISTEMA ARTERIAL DO MEMBRO INFERIOR";
}

function buildIntroLinha(state) {
  const sides = getActiveSides(state);
  let modo = "bilateralmente";
  if (sides.length === 1) modo = sides[0] === "D" ? "unilateralmente à direita" : "unilateralmente à esquerda";
  return `Avaliação anatômica e hemodinâmica das artérias femorais, poplítea, tibiais anterior e posterior e fibular, ${modo}.`;
}

function formatObsLine(texto) {
  const t = (texto || "").trim();
  return t.endsWith(".") ? `* Obs.: ${t}` : `* Obs.: ${t}.`;
}
function getExtraObsLines(state) {
  const lines = [];
  ["D", "E"].forEach((s) => {
    const m = state[s];
    if (m && m.incluir && m.obsExtra && m.obsExtra.trim()) lines.push(formatObsLine(m.obsExtra));
  });
  return lines;
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
   CARDS DE ACHADO
   ============================================================ */

function achadoCardStyle() {
  return {
    border: `1px solid ${COLORS.borderLight}`,
    borderRadius: 9,
    padding: 12,
    marginBottom: 10,
    background: COLORS.panelAlt,
  };
}

function CardHeader({ index, onRemove, label = "Achado" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.accent }}>
        {label} {index + 1}
      </span>
      <button
        onClick={onRemove}
        style={{ background: "transparent", border: "none", color: COLORS.danger, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "2px 4px" }}
      >
        Remover
      </button>
    </div>
  );
}

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

function PseudoaneurismaFields({ entry, setE }) {
  return (
    <div style={{ paddingLeft: 4 }}>
      <Row>
        <Label>Comunicação com</Label>
        <PillGroup options={PSEUDO_VASO_OPTIONS} value={entry.pseudoVaso} onChange={setE("pseudoVaso")} />
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
      <div style={{ marginTop: 6 }}>
        <Toggle
          checked={entry.pseudoSegundaMassaAtiva}
          onChange={setE("pseudoSegundaMassaAtiva")}
          label="Segunda massa comunicante (mais superficial)"
        />
      </div>
      {entry.pseudoSegundaMassaAtiva && (
        <>
          <Row>
            <Label>2ª massa (AP x LL)</Label>
            <NumInput value={entry.pseudoMassa2AP} onChange={setE("pseudoMassa2AP")} suffix="mm" />
            <NumInput value={entry.pseudoMassa2LL} onChange={setE("pseudoMassa2LL")} suffix="mm" />
          </Row>
          <Row>
            <Label>Pertuito (diâmetro / extensão)</Label>
            <NumInput value={entry.pseudoPertuitoDiametro} onChange={setE("pseudoPertuitoDiametro")} suffix="mm" />
            <NumInput value={entry.pseudoPertuitoExtensao} onChange={setE("pseudoPertuitoExtensao")} suffix="mm" />
          </Row>
        </>
      )}
    </div>
  );
}

function AngioplastiaFields({ entry, setE }) {
  return (
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
          <PillGroup
            options={[
              { value: "50-75", label: "50–75%" },
              { value: ">75", label: ">75%" },
            ]}
            value={entry.angioGrau}
            onChange={setE("angioGrau")}
          />
        </Row>
      )}
    </div>
  );
}

function AprisionamentoFields({ entry, setE }) {
  return (
    <div style={{ paddingLeft: 4 }}>
      <Row>
        <Label>Resultado do teste dinâmico</Label>
        <PillGroup
          options={[
            { value: "negativo", label: "Negativo" },
            { value: "positivo", label: "Positivo" },
          ]}
          value={entry.resultado}
          onChange={setE("resultado")}
        />
      </Row>
      {entry.resultado === "positivo" && (
        <>
          <Row>
            <Label>Segmento</Label>
            <PillGroup options={SEGMENTO_OPTIONS} value={entry.aprisionamentoSegmento} onChange={setE("aprisionamentoSegmento")} />
          </Row>
          <Row>
            <Label>Manobra provocativa</Label>
            <PillGroup options={APRISIONAMENTO_MANOBRA_OPTIONS} value={entry.aprisionamentoManobra} onChange={setE("aprisionamentoManobra")} />
          </Row>
        </>
      )}
    </div>
  );
}

function AchadoFemoralCard({ entry, index, onChange, onRemove }) {
  const setE = (key) => (val) => onChange((prev) => ({ ...prev, [key]: val }));
  const showGenericVaso = ["estenoseFocal", "oclusaoSegmentar", "semFluxoTotal", "calcificacaoImpossibilitante", "aneurisma", "angioplastia"].includes(
    entry.tipo
  );
  return (
    <div style={achadoCardStyle()}>
      <CardHeader index={index} onRemove={onRemove} />

      <Row>
        <PillGroup options={FEMORAL_ACHADO_TIPOS} value={entry.tipo} onChange={setE("tipo")} />
      </Row>

      {showGenericVaso && (
        <Row>
          <Label>Vaso</Label>
          <PillGroup options={FEMORAL_VESSEL_OPTIONS} value={entry.vaso} onChange={setE("vaso")} />
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
            <PillGroup
              options={[
                { value: "50-75", label: "50–75%" },
                { value: ">75", label: ">75%" },
              ]}
              value={entry.grauFocal}
              onChange={setE("grauFocal")}
            />
          </Row>
          {entry.grauFocal === ">75" && (
            <div style={{ marginTop: 6, fontSize: 11, color: COLORS.warn }}>
              Estenose &gt;75%: o fluxo a jusante (poplítea e segmento poplíteo-podal) será automaticamente descrito
              como monofásico.
            </div>
          )}
        </div>
      )}

      {entry.tipo === "oclusaoSegmentar" && (
        <div style={{ paddingLeft: 4 }}>
          <Row>
            <Label>Trecho(s) pérvio(s)</Label>
            <PillGroup
              options={[{ value: "nenhum", label: "Nenhum (oclusão desde a origem)" }, ...SEGMENTO_OPTIONS]}
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
            <Label>Reentrada por colateral</Label>
            <PillGroup options={REENTRY_OPTIONS} value={entry.reentrada} onChange={setE("reentrada")} />
          </Row>
          {entry.reentrada === "supraPatelar" && (
            <Row>
              <Label>Altura acima da borda da patela</Label>
              <NumInput value={entry.reentradaCm} onChange={setE("reentradaCm")} suffix="cm" />
            </Row>
          )}
        </div>
      )}

      {entry.tipo === "calcificacaoImpossibilitante" && (
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
      {entry.tipo === "pseudoaneurisma" && <PseudoaneurismaFields entry={entry} setE={setE} />}
      {entry.tipo === "angioplastia" && <AngioplastiaFields entry={entry} setE={setE} />}
      {entry.tipo === "aprisionamento" && <AprisionamentoFields entry={entry} setE={setE} />}
    </div>
  );
}

function AchadoDistalCard({ entry, index, onChange, onRemove }) {
  const setE = (key) => (val) => onChange((prev) => ({ ...prev, [key]: val }));
  return (
    <div style={achadoCardStyle()}>
      <CardHeader index={index} onRemove={onRemove} />

      <Row>
        <PillGroup options={DISTAL_ACHADO_TIPOS} value={entry.tipo} onChange={setE("tipo")} />
      </Row>

      {entry.tipo === "oclusaoSegmentar" && (
        <div style={{ paddingLeft: 4 }}>
          <Row>
            <Label>Vaso</Label>
            <PillGroup options={TIBIAL_VESSEL_OPTIONS} value={entry.vaso} onChange={setE("vaso")} />
          </Row>
          <Row>
            <Label>Trecho pérvio proximal</Label>
            <PillGroup
              options={[{ value: "nenhum", label: "Nenhum (oclusão desde a origem)" }, ...SEGMENTO_OPTIONS]}
              value={entry.trechoPervioProx}
              onChange={setE("trechoPervioProx")}
            />
          </Row>
          {entry.trechoPervioProx !== "nenhum" && (
            <Row>
              <Label>Morfologia (trecho pérvio)</Label>
              <PillGroup options={MORFOLOGIA_OPTIONS} value={entry.morfologiaProx} onChange={setE("morfologiaProx")} />
            </Row>
          )}
          <Row>
            <Label>Trecho ocluído</Label>
            <PillGroup
              options={[...SEGMENTO_OPTIONS, { value: "todaExtensao", label: "Toda a extensão" }]}
              value={entry.trechoOcluido}
              onChange={setE("trechoOcluido")}
            />
          </Row>
          <Row>
            <Label>Reentrada distal (colateral)</Label>
            <PillGroup options={SEGMENTO_OPTIONS} value={entry.trechoReentrada} onChange={setE("trechoReentrada")} />
          </Row>
        </div>
      )}

      {entry.tipo === "semFluxoPar" && (
        <div style={{ paddingLeft: 4 }}>
          <Row>
            <PillGroup options={PAR_SEM_FLUXO_OPTIONS} value={entry.parSemFluxo} onChange={setE("parSemFluxo")} />
          </Row>
        </div>
      )}

      {entry.tipo === "calcificacaoImpossibilitante" && (
        <div style={{ paddingLeft: 4 }}>
          <Row>
            <Label>Vaso</Label>
            <PillGroup options={TIBIAL_VESSEL_OPTIONS} value={entry.vaso} onChange={setE("vaso")} />
          </Row>
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

      {entry.tipo === "aneurisma" && (
        <div style={{ paddingLeft: 4 }}>
          <Row>
            <Label>Vaso</Label>
            <PillGroup options={DISTAL_ANEURISMA_VASO_OPTIONS} value={entry.vaso} onChange={setE("vaso")} />
          </Row>
          <AneurismaFields entry={entry} setE={setE} />
        </div>
      )}
    </div>
  );
}

function PonteCard({ entry, index, onChange, onRemove }) {
  const setE = (key) => (val) => onChange((prev) => ({ ...prev, [key]: val }));
  const isFemoropopliteaOuCruzado =
    entry.tipo === "femoropopliteaSupra" || entry.tipo === "femoropopliteaInfra" || entry.tipo === "femorofemoralCruzado";
  const isGenerico = !isFemoropopliteaOuCruzado && entry.tipo !== "aortobifemoral";

  return (
    <div style={achadoCardStyle()}>
      <CardHeader index={index} onRemove={onRemove} label="Ponte" />

      <Row>
        <Label>Tipo</Label>
        <PillGroup options={PONTE_TIPO_OPTIONS} value={entry.tipo} onChange={setE("tipo")} />
      </Row>
      {entry.tipo === "outro" && (
        <Row>
          <TextInput value={entry.tipoOutro} onChange={setE("tipoOutro")} placeholder="Descreva a posição da ponte" />
        </Row>
      )}

      {entry.tipo !== "aortobifemoral" && entry.tipo !== "femorofemoralCruzado" && (
        <Row>
          <Label>Material</Label>
          <PillGroup
            options={[
              { value: "veia", label: "Veia" },
              { value: "protese", label: "Prótese" },
            ]}
            value={entry.material}
            onChange={setE("material")}
          />
        </Row>
      )}

      {(entry.tipo === "femoropopliteaSupra" || entry.tipo === "femoropopliteaInfra") && (
        <>
          <Row>
            <Label>Anastomose proximal</Label>
            <PillGroup options={PONTE_ANAST_PROX_OPTIONS} value={entry.anastomoseProximal} onChange={setE("anastomoseProximal")} />
          </Row>
          <Row>
            <Label>Anastomose distal</Label>
            <PillGroup options={PONTE_ANAST_DIST_OPTIONS} value={entry.anastomoseDistal} onChange={setE("anastomoseDistal")} />
          </Row>
        </>
      )}

      {entry.tipo === "femorofemoralCruzado" && (
        <Row>
          <Label>Direção</Label>
          <PillGroup
            options={[
              { value: "direitaParaEsquerda", label: "Direita → Esquerda" },
              { value: "esquerdaParaDireita", label: "Esquerda → Direita" },
            ]}
            value={entry.direcaoCruzada}
            onChange={setE("direcaoCruzada")}
          />
        </Row>
      )}

      {entry.tipo === "aortobifemoral" && (
        <Row>
          <Label>Segmento da anastomose (femoral comum)</Label>
          <PillGroup options={SEGMENTO_OPTIONS} value={entry.anastomoseSegmento} onChange={setE("anastomoseSegmento")} />
        </Row>
      )}

      <Row>
        <Label>Status</Label>
        <PillGroup
          options={[
            { value: "pervia", label: "Pérvia, sem alterações" },
            { value: "estenose", label: "Alteração hemodinâmica" },
            { value: "oclusao", label: "Ocluída" },
          ]}
          value={entry.status}
          onChange={setE("status")}
        />
      </Row>

      {entry.status === "estenose" && isFemoropopliteaOuCruzado && (
        <Row>
          <Label>Localização</Label>
          <PillGroup options={PONTE_ESTENOSE_LOCAL_OPTIONS} value={entry.estenoseLocalPonte} onChange={setE("estenoseLocalPonte")} />
        </Row>
      )}

      {entry.status === "estenose" && isGenerico && (
        <>
          <Row>
            <Label>Localização</Label>
            <PillGroup options={PONTE_LOCAL_OPTIONS} value={entry.estenoseLocal} onChange={setE("estenoseLocal")} />
          </Row>
          <Row>
            <Label>Grau</Label>
            <PillGroup
              options={[
                { value: "50-75", label: "50–75%" },
                { value: ">75", label: ">75%" },
              ]}
              value={entry.estenoseGrau}
              onChange={setE("estenoseGrau")}
            />
          </Row>
        </>
      )}
    </div>
  );
}

/* ============================================================
   FORMULÁRIO DE UM LADO
   ============================================================ */

function SideForm({ data, update }) {
  const set = (key) => (val) => update((prev) => ({ ...prev, [key]: val }));

  return (
    <div>
      <Section title="Segmento fêmoro-poplíteo" subtitle="Femoral comum, profunda, femoral e poplítea" defaultOpen>
        <Row>
          <Label>Paredes</Label>
          <PillGroup options={PAREDE_OPTIONS} value={data.femParede} onChange={set("femParede")} />
        </Row>
        <Row>
          <Label>Morfologia do fluxo</Label>
          <PillGroup options={MORFOLOGIA_OPTIONS} value={data.femMorfologia} onChange={set("femMorfologia")} />
        </Row>
        {data.femMorfologia === "monofasica" && (
          <div style={{ marginTop: 6, fontSize: 11.5, color: COLORS.warn }}>
            Curva monofásica selecionada: a conclusão incluirá automaticamente a sugestão de Ecodoppler Colorido do
            Território Aorto-Ilíaco.
          </div>
        )}

        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "14px 0" }} />
        <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>Achados adicionais</div>
        <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 6 }}>
          Um vaso com estenose, oclusão, aneurisma ou sem fluxo detectável é excluído automaticamente da frase de
          "diâmetros normais" acima. Se houver mais de um vaso acometido, adicione um novo achado para cada um.
          Estenose &gt;75% reduz automaticamente o fluxo a jusante para monofásico.
        </div>

        {(data.femAchados || []).map((entry, idx) => (
          <AchadoFemoralCard
            key={entry.id}
            entry={entry}
            index={idx}
            onChange={(updater) =>
              update((prev) => ({
                ...prev,
                femAchados: prev.femAchados.map((en) => (en.id === entry.id ? updater(en) : en)),
              }))
            }
            onRemove={() =>
              update((prev) => ({ ...prev, femAchados: prev.femAchados.filter((en) => en.id !== entry.id) }))
            }
          />
        ))}
        <button
          onClick={() =>
            update((prev) => ({ ...prev, femAchados: [...(prev.femAchados || []), defaultAchadoFemoral()] }))
          }
          style={addBtnStyle()}
        >
          + Adicionar achado
        </button>

        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "14px 0" }} />
        <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>Ponte / Enxerto (Bypass)</div>

        {(data.pontes || []).map((entry, idx) => (
          <PonteCard
            key={entry.id}
            entry={entry}
            index={idx}
            onChange={(updater) =>
              update((prev) => ({ ...prev, pontes: prev.pontes.map((en) => (en.id === entry.id ? updater(en) : en)) }))
            }
            onRemove={() => update((prev) => ({ ...prev, pontes: prev.pontes.filter((en) => en.id !== entry.id) }))}
          />
        ))}
        <button
          onClick={() => update((prev) => ({ ...prev, pontes: [...(prev.pontes || []), defaultPonte()] }))}
          style={addBtnStyle()}
        >
          + Adicionar ponte
        </button>
      </Section>

      <Section title="Segmento poplíteo-podal" subtitle="Tronco tibiofibular, tibial anterior, posterior e fibular" defaultOpen>
        <Row>
          <Label>Morfologia do fluxo</Label>
          <PillGroup options={MORFOLOGIA_OPTIONS} value={data.distMorfologia} onChange={set("distMorfologia")} />
        </Row>
        <div style={{ marginTop: 6, fontSize: 11, color: COLORS.textMuted }}>
          Todos os vasos são considerados normais por padrão. Ao adicionar um achado abaixo para um vaso específico, a
          respectiva linha "normal" é automaticamente suprimida. Se houver estenose &gt;75% no segmento
          fêmoro-poplíteo, a morfologia aqui é sobrescrita automaticamente para monofásica.
        </div>

        <div style={{ borderTop: `1px solid ${COLORS.border}`, margin: "14px 0" }} />
        <div style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.text, marginBottom: 2 }}>Achados adicionais</div>

        {(data.distAchados || []).map((entry, idx) => (
          <AchadoDistalCard
            key={entry.id}
            entry={entry}
            index={idx}
            onChange={(updater) =>
              update((prev) => ({
                ...prev,
                distAchados: prev.distAchados.map((en) => (en.id === entry.id ? updater(en) : en)),
              }))
            }
            onRemove={() =>
              update((prev) => ({ ...prev, distAchados: prev.distAchados.filter((en) => en.id !== entry.id) }))
            }
          />
        ))}
        <button
          onClick={() =>
            update((prev) => ({ ...prev, distAchados: [...(prev.distAchados || []), defaultAchadoDistal()] }))
          }
          style={addBtnStyle()}
        >
          + Adicionar achado
        </button>
      </Section>

      <Section title="Observações adicionais" subtitle="Nota livre">
        <TextInput
          value={data.obsExtra}
          onChange={set("obsExtra")}
          placeholder="Frase completa a ser incluída no final do laudo"
        />
      </Section>
    </div>
  );
}

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

/* ============================================================
   PREVIEW
   ============================================================ */

const PREVIEW_SIZE = 13;
const PREVIEW_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function renderLine(item, key) {
  const line = item;
  if (line === "") return <div key={key} style={{ height: 8 }} />;
  if (line.startsWith("[") && line.endsWith("]")) {
    return (
      <div key={key} style={{ color: COLORS.accent, fontWeight: 600, marginTop: 6, marginBottom: 2 }}>
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

function ReportPreview({ state, patientName, examDate }) {
  const blocks = useMemo(() => buildFullReportBlocks(state), [state]);
  const conclusao = useMemo(() => buildConclusaoSection(state), [state]);

  if (blocks.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>
        Selecione ao menos um lado (MI Direito e/ou MI Esquerdo) para começar a gerar o laudo.
      </div>
    );
  }

  let k = 0;
  return (
    <div style={{ fontSize: PREVIEW_SIZE, fontFamily: PREVIEW_FONT, lineHeight: 1.55 }}>
      <div style={{ fontWeight: 700, color: COLORS.text, marginBottom: 10 }}>{buildTituloLinhas(state)}</div>
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

      <div style={{ color: "#C7D2E4", marginBottom: 10 }}>{buildIntroLinha(state)}</div>

      {blocks.map((b) => (
        <div key={"lado-" + b.side}>
          {renderLine(b.header, k++)}
          {b.femoral.map((l) => renderLine(l, k++))}
          {b.distal.map((l) => renderLine(l, k++))}
          <div style={{ height: 10 }} />
        </div>
      ))}

      {conclusao.length > 0 && <div>{conclusao.map((l) => renderLine(l, k++))}</div>}

      {getExtraObsLines(state).length > 0 && (
        <div style={{ marginTop: 4 }}>{getExtraObsLines(state).map((l) => renderLine(l, k++))}</div>
      )}
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

  function tr(text, opts = {}) {
    return new TextRun({ text, font: FONT, size: SZ, ...opts });
  }
  function paraText(text, opts = {}) {
    if (text.startsWith("[") && text.endsWith("]")) {
      return new Paragraph({
        spacing: { before: 80, after: SP },
        keepLines: true,
        keepNext: !!opts.keepNext,
        children: [tr(text.slice(1, -1), { bold: true })],
      });
    }
    const upper = text === text.toUpperCase() && /[A-Z\u00C0-\u00DA]/.test(text) && !text.startsWith("-");
    return new Paragraph({
      spacing: { after: SP },
      keepLines: true,
      keepNext: !!opts.keepNext,
      children: [tr(text, { bold: upper })],
    });
  }
  function emptyLine(opts = {}) {
    return new Paragraph({ children: [], spacing: { after: 0 }, keepNext: !!opts.keepNext });
  }
  function buildSideNodes(b) {
    const items = [b.header, ...b.femoral, ...b.distal];
    return items.map((item, idx) => {
      const keepNext = idx < items.length - 1;
      return item === "" ? emptyLine({ keepNext }) : paraText(item, { keepNext });
    });
  }
  function buildConclusaoNodes(lines) {
    return lines.map((item, idx) => {
      const keepNext = idx < lines.length - 1;
      return item === "" ? emptyLine({ keepNext }) : paraText(item, { keepNext });
    });
  }

  const pageProps = {
    size: { width: 12240, height: 15840 },
    margin: { top: 720, right: 720, bottom: 720, left: 720 },
  };

  const children = [];
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: SP },
      children: [tr(buildTituloLinhas(state), { bold: true })],
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

  children.push(new Paragraph({ spacing: { after: SP }, children: [tr(buildIntroLinha(state))] }));
  children.push(emptyLine());

  blocks.forEach((b) => {
    children.push(...buildSideNodes(b));
    children.push(emptyLine());
  });

  if (conclusao.length > 0) {
    children.push(...buildConclusaoNodes(conclusao));
    children.push(emptyLine());
  }

  getExtraObsLines(state).forEach((l) => children.push(paraText(l)));

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 24 } } } },
    sections: [{ properties: { page: pageProps }, children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const nomePaciente = (patientName || "").trim().replace(/[^\wÀ-ÿ\s\-]+/g, "").trim() || "Laudo";
  const nomeArquivo = `${nomePaciente} ARTERIAL MMII`;
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

const CRIT_ARTERIAL = [
  ["Normal", "PSVR < 1,5; sem alteração significativa do espectro; fluxo trifásico/bifásico"],
  ["< 50%", "PSVR < 2,0; leve turbulência pós-estenótica"],
  ["50 \u2013 75%", "PSVR 2,0 \u2013 4,0; aumento focal de velocidade e turbilhonamento do fluxo"],
  [">75%", "PSVR > 4,0; velocidade muito aumentada; fluxo monofásico distalmente"],
  ["Oclusão", "Ausência de fluxo no segmento; reenchimento distal por colateral, fluxo monofásico de baixa velocidade"],
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
            style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", padding: 4, display: "flex" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "14px 16px 20px 16px", overflowY: "auto" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent, marginBottom: 8 }}>
            Duplex arterial de MMII — Graduação de estenose (PSVR)
          </div>
          <CritTable headers={["Estenose", "Critérios"]} rows={CRIT_ARTERIAL} colWidths={["22%", "78%"]} />
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 8 }}>
            PSVR = razão entre a velocidade sistólica de pico no segmento estenótico e a velocidade no segmento normal
            imediatamente proximal. Critérios de referência gerais; correlacionar sempre com o quadro clínico e, quando
            disponível, com o índice tornozelo-braço (ITB).
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   APP
   ============================================================ */

export default function AppArterialMMII() {
  const [patientName, setPatientName] = useState("");
  const [examDate, setExamDate] = useState(todayBR());
  const [examDateISO, setExamDateISO] = useState(() => new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState("D");
  const [state, setState] = useState({ D: defaultSideState(), E: defaultSideState() });
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
    setConfirmReset(false);
  };

  const reportLines = useMemo(() => {
    const blocks = buildFullReportBlocks(state);
    const conclusao = buildConclusaoSection(state);
    const lines = [buildTituloLinhas(state), ""];
    if (patientName.trim()) lines.push(`Paciente: ${patientName.trim()}`, "");
    if (examDate.trim()) lines.push(`Data: ${examDate.trim()}`, "");
    lines.push(buildIntroLinha(state), "");
    blocks.forEach((b) => {
      lines.push(b.header);
      b.femoral.forEach((l) => lines.push(l));
      b.distal.forEach((l) => lines.push(l));
      lines.push("");
    });
    conclusao.forEach((l) => lines.push(l));
    if (conclusao.length > 0) lines.push("");
    getExtraObsLines(state).forEach((l) => lines.push(l));
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: COLORS.text,
      }}
    >
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
            <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: 0.2 }}>Arterial MMII</div>
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
            onClick={resetAll}
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

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            onClick={() => updateSide("D", (prev) => ({ ...prev, incluir: !prev.incluir }))}
            style={{
              flex: 1,
              padding: "8px 6px",
              borderRadius: 7,
              border: `1px solid ${state.D.incluir ? COLORS.accent : COLORS.borderLight}`,
              background: state.D.incluir ? COLORS.accentDim : "transparent",
              color: state.D.incluir ? COLORS.accent : COLORS.textMuted,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            MI DIREITO
          </button>
          <button
            onClick={() => updateSide("E", (prev) => ({ ...prev, incluir: !prev.incluir }))}
            style={{
              flex: 1,
              padding: "8px 6px",
              borderRadius: 7,
              border: `1px solid ${state.E.incluir ? COLORS.accent : COLORS.borderLight}`,
              background: state.E.incluir ? COLORS.accentDim : "transparent",
              color: state.E.incluir ? COLORS.accent : COLORS.textMuted,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            MI ESQUERDO
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

      <div style={{ padding: "14px 14px 100px 14px" }}>
        {!mobilePreview ? (
          activeTab === "D" && !state.D.incluir ? (
            <div style={{ padding: 24, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>
              MI Direito não incluído no laudo. Toque em "MI DIREITO" acima para habilitar o formulário.
            </div>
          ) : activeTab === "E" && !state.E.incluir ? (
            <div style={{ padding: 24, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>
              MI Esquerdo não incluído no laudo. Toque em "MI ESQUERDO" acima para habilitar o formulário.
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

      {showCriterios && <CriteriosModal onClose={() => setShowCriterios(false)} />}

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
