// Slide 4 — Pasivo vs Activo (comparación)
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: "content",
  index: 4,
  title: "Dos estrategias: pasivo y activo",
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();
  slide.background = { color: theme.bg };

  slide.addText("Estrategias de reconocimiento", {
    x: 0.6, y: 0.42, w: 8.8, h: 0.32,
    fontSize: 12, fontFace: "Trebuchet MS",
    color: theme.accent, bold: true, charSpacing: 2.2,
    align: "left", margin: 0,
  });

  slide.addText("Dos estrategias: pasivo y activo", {
    x: 0.6, y: 0.78, w: 8.8, h: 0.58,
    fontSize: 33, fontFace: "Trebuchet MS",
    color: theme.primary, bold: true,
    align: "left", margin: 0, fit: "shrink",
  });

  const panels = [
    {
      x: 0.6,
      tag: "PASIVO",
      tagColor: theme.secondary,
      title: "No toca el objetivo",
      rows: [
        ["Consulta", "Fuentes OSINT: Certificate Transparency, DNS histórico, motores de búsqueda"],
        ["Tráfico al objetivo", "Ninguno"],
        ["Detecta", "Nombres publicados, certificados emitidos, dominios históricos"],
        ["Límite", "Lo que otros ya publicaron"],
        ["Riesgo", "Muy bajo"],
      ],
    },
    {
      x: 5.05,
      tag: "ACTIVO",
      tagColor: theme.accent,
      title: "Interroga la infraestructura",
      rows: [
        ["Consulta", "El DNS autoritativo y los servicios del objetivo"],
        ["Tráfico al objetivo", "Consultas DNS + comprobación de puertos"],
        ["Detecta", "Lo que existe ahora, incluidos hosts sin índice público"],
        ["Límite", "El alcance y los puertos que se autoricen"],
        ["Riesgo", "Medio — requiere autorización expresa"],
      ],
    },
  ];

  panels.forEach((p) => {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: p.x, y: 1.5, w: 4.35, h: 3.05,
      fill: { color: theme.card },
      line: { color: theme.border, width: 1 },
      rectRadius: 0.1,
    });

    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: p.x + 0.24, y: 1.7, w: 1.18, h: 0.34,
      fill: { color: p.tagColor },
      rectRadius: 0.06,
    });
    slide.addText(p.tag, {
      x: p.x + 0.24, y: 1.76, w: 1.18, h: 0.24,
      fontSize: 11, fontFace: "Trebuchet MS",
      color: "FFFFFF", bold: true, charSpacing: 1.4,
      align: "center", margin: 0,
    });

    slide.addText(p.title, {
      x: p.x + 0.24, y: 2.16, w: 3.9, h: 0.36,
      fontSize: 17, fontFace: "Trebuchet MS",
      color: theme.primary, bold: true,
      align: "left", margin: 0,
    });

    p.rows.forEach((r, i) => {
      const y = 2.58 + i * 0.4;
      slide.addText(r[0], {
        x: p.x + 0.24, y, w: 1.16, h: 0.34,
        fontSize: 10, fontFace: "Trebuchet MS",
        color: p.tagColor, bold: true,
        align: "left", margin: 0, valign: "top", lineSpacing: 12,
      });
      slide.addText(r[1], {
        x: p.x + 1.44, y, w: 2.72, h: 0.36,
        fontSize: 9.5, fontFace: "Calibri",
        color: theme.secondary,
        align: "left", margin: 0, valign: "top", lineSpacing: 11.5,
      });
    });
  });

  // Nota de cierre
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 4.72, w: 8.8, h: 0.5,
    fill: { color: theme.light },
    line: { color: theme.accent, width: 1 },
    rectRadius: 0.06,
  });

  slide.addText(
    [
      { text: "En este laboratorio usaremos el modo activo contra un DNS propio. ", options: { color: theme.primary } },
      { text: "Un ataque a un DNS real sin autorización no es unethical: es un delito.", options: { color: theme.accent, bold: true } },
    ],
    {
      x: 0.85, y: 4.84, w: 8.3, h: 0.28,
      fontSize: 12.5, fontFace: "Calibri",
      align: "left", margin: 0,
    }
  );

  return slide;
}

if (require.main === module) {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  const theme = {
    primary: "111827", secondary: "374151", accent: "0070F3", light: "E0EFFF",
    bg: "FFFFFF", card: "F7F8FA", border: "D4D8DE", muted: "6B7280", gold: "D4AF37",
  };
  createSlide(pres, theme);
  pres.writeFile({ fileName: "./output/slide-04-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
