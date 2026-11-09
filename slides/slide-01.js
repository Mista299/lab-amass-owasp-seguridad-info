// Slide 1 — Portada
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: "cover",
  index: 1,
  title: "OWASP Amass",
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();
  slide.background = { color: theme.bg };

  // Bloque lateral izquierdo (franja de acento)
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.32, h: 5.625,
    fill: { color: theme.accent },
  });

  // Etiqueta superior
  slide.addText("OWASP  ·  SEGURIDAD DE LA INFORMACIÓN  ·  2026-II", {
    x: 0.85, y: 0.62, w: 8.4, h: 0.3,
    fontSize: 11, fontFace: "Trebuchet MS",
    color: theme.accent, bold: true, charSpacing: 2.4,
    align: "left", margin: 0,
  });

  // Título principal
  slide.addText("OWASP Amass", {
    x: 0.85, y: 1.25, w: 8.6, h: 1.05,
    fontSize: 54, fontFace: "Trebuchet MS",
    color: theme.primary, bold: true,
    align: "left", margin: 0, fit: "shrink",
  });

  // Subtítulo
  slide.addText("Descubrimiento de activos y mapeo de superficie de ataque", {
    x: 0.85, y: 2.36, w: 8.4, h: 0.42,
    fontSize: 21, fontFace: "Calibri",
    color: theme.secondary,
    align: "left", margin: 0,
  });

  // Descripción breve
  slide.addText(
    "Del subdominio invisible al inventario priorizado: una práctica 100 % offline sobre un DNS autoritativo propio.",
    {
      x: 0.85, y: 2.92, w: 7.5, h: 0.62,
      fontSize: 14, fontFace: "Calibri",
      color: theme.muted,
      align: "left", margin: 0, lineSpacing: 20,
    }
  );

  // Bloque de autor
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.85, y: 3.85, w: 5.55, h: 1.15,
    fill: { color: theme.card },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.08,
  });

  slide.addText("Michael Stiven Tabares Tobón", {
    x: 1.1, y: 4.02, w: 5.1, h: 0.32,
    fontSize: 17, fontFace: "Trebuchet MS",
    color: theme.primary, bold: true,
    align: "left", margin: 0,
  });

  slide.addText(
    [
      { text: "Ingeniería de Sistemas", options: { breakLine: true } },
      { text: "Universidad de Antioquia", options: { breakLine: true } },
      { text: "Seguridad de la Información — 2026-II" },
    ],
    {
      x: 1.1, y: 4.38, w: 5.1, h: 0.58,
      fontSize: 12, fontFace: "Calibri",
      color: theme.muted,
      align: "left", margin: 0, lineSpacing: 15,
    }
  );

  // Diagrama decorativo de nodos (grafo de activos) a la derecha
  const nodes = [
    { x: 7.35, y: 1.28, r: 0.3, fill: theme.accent },
    { x: 8.42, y: 1.95, r: 0.22, fill: theme.secondary },
    { x: 7.05, y: 2.5, r: 0.22, fill: theme.secondary },
    { x: 8.15, y: 3.02, r: 0.26, fill: theme.gold },
    { x: 6.75, y: 3.52, r: 0.19, fill: theme.secondary },
    { x: 8.72, y: 4.0, r: 0.19, fill: theme.secondary },
  ];
  const links = [
    [0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 5], [1, 5],
  ];
  links.forEach(([a, b]) => {
    const n1 = nodes[a];
    const n2 = nodes[b];
    slide.addShape(pres.shapes.LINE, {
      x: Math.min(n1.x, n2.x) + n1.r * 0.5,
      y: Math.min(n1.y, n2.y) + n1.r * 0.5,
      w: Math.abs(n2.x - n1.x) + 0.02,
      h: Math.abs(n2.y - n1.y) + 0.02,
      line: { color: theme.border, width: 1.25 },
      flipH: n2.x < n1.x,
      flipV: n2.y < n1.y,
    });
  });
  nodes.forEach((n) => {
    slide.addShape(pres.shapes.OVAL, {
      x: n.x, y: n.y, w: n.r * 2, h: n.r * 2,
      fill: { color: n.fill },
      line: { color: theme.bg, width: 1.5 },
    });
  });

  slide.addText("laboratorio: lab.local · 192.168.56.0/24", {
    x: 6.55, y: 4.72, w: 3.0, h: 0.28,
    fontSize: 9.5, fontFace: "Consolas",
    color: theme.muted, align: "center", margin: 0,
  });

  return slide;
}

if (require.main === module) {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  const theme = {
    primary: "111827",
    secondary: "374151",
    accent: "0070F3",
    light: "E0EFFF",
    bg: "FFFFFF",
    card: "F7F8FA",
    border: "D4D8DE",
    muted: "6B7280",
    gold: "D4AF37",
  };
  createSlide(pres, theme);
  pres.writeFile({ fileName: "./output/slide-01-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
