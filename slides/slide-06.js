// Slide 6 — La base de datos y el grafo
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: "content",
  index: 6,
  title: "La base de datos: memoria del laboratorio",
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();
  slide.background = { color: theme.bg };

  slide.addText("Persistencia", {
    x: 0.6, y: 0.42, w: 8.8, h: 0.32,
    fontSize: 12, fontFace: "Trebuchet MS",
    color: theme.accent, bold: true, charSpacing: 2.2,
    align: "left", margin: 0,
  });

  slide.addText("La base de datos: memoria del laboratorio", {
    x: 0.6, y: 0.78, w: 8.8, h: 0.58,
    fontSize: 31, fontFace: "Trebuchet MS",
    color: theme.primary, bold: true,
    align: "left", margin: 0, fit: "shrink",
  });

  // Pregunta → 3 respuestas
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 1.5, w: 8.8, h: 0.5,
    fill: { color: theme.light },
    line: { color: theme.accent, width: 1 },
    rectRadius: 0.06,
  });
  slide.addText("¿Para qué sirve la base de datos de Amass?", {
    x: 0.88, y: 1.62, w: 8.25, h: 0.28,
    fontSize: 14, fontFace: "Trebuchet MS",
    color: theme.primary, bold: true,
    align: "left", margin: 0,
  });

  const answers = [
    {
      icon: "◷",
      t: "Persistir",
      d: "Cada ejecución queda guardada. Se puede comparar la superficie de ataque de hoy contra la de la semana pasada y detectar qué cambió.",
    },
    {
      icon: "⊕",
      t: "Correlacionar",
      d: "Un mismo activo encontrado por tres fuentes se guarda una sola vez, anotando las tres procedencias. Se elimina el ruido.",
    },
    {
      icon: "✓",
      t: "Priorizar",
      d: "Almacena TTL, confianza y origen de cada dato, para distinguir un hallazgo sólido de una simple pista.",
    },
  ];

  answers.forEach((a, i) => {
    const x = 0.6 + i * 3.0;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 2.18, w: 2.72, h: 1.86,
      fill: { color: theme.card },
      line: { color: theme.border, width: 1 },
      rectRadius: 0.1,
    });
    slide.addShape(pres.shapes.OVAL, {
      x: x + 0.22, y: 2.38, w: 0.44, h: 0.44,
      fill: { color: theme.accent },
    });
    slide.addText(a.icon, {
      x: x + 0.22, y: 2.46, w: 0.44, h: 0.3,
      fontSize: 14, fontFace: "Arial",
      color: "FFFFFF", bold: true, align: "center", margin: 0,
    });
    slide.addText(a.t, {
      x: x + 0.78, y: 2.46, w: 1.8, h: 0.32,
      fontSize: 15, fontFace: "Trebuchet MS",
      color: theme.primary, bold: true,
      align: "left", margin: 0,
    });
    slide.addText(a.d, {
      x: x + 0.22, y: 2.98, w: 2.32, h: 0.94,
      fontSize: 11, fontFace: "Calibri",
      color: theme.muted,
      align: "left", margin: 0, lineSpacing: 14,
    });
  });

  // SQLite vs PostgreSQL
  slide.addText("Backends disponibles", {
    x: 0.6, y: 4.2, w: 8.8, h: 0.3,
    fontSize: 13, fontFace: "Trebuchet MS",
    color: theme.primary, bold: true,
    align: "left", margin: 0,
  });

  const backends = [
    { t: "SQLite", d: "Se crea solo, sin configurar. Ideal para el laboratorio y para auditorías puntuales.", tag: "USAMOS ESTE", on: true },
    { t: "PostgreSQL", d: "Repositorio centralizado para equipos que necesitan histórico compartido y multiusuario.", tag: "PRODUCCIÓN", on: false },
    { t: "Neo4j", d: "Consultas de grafo-native sobre relaciones de primer y segundo nivel.", tag: "AVANZADO", on: false },
  ];

  backends.forEach((b, i) => {
    const x = 0.6 + i * 3.0;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 4.56, w: 2.72, h: 0.78,
      fill: { color: b.on ? theme.light : theme.card },
      line: { color: b.on ? theme.accent : theme.border, width: b.on ? 1.5 : 1 },
      rectRadius: 0.08,
    });
    slide.addText(b.t, {
      x: x + 0.16, y: 4.64, w: 1.2, h: 0.26,
      fontSize: 13, fontFace: "Trebuchet MS",
      color: theme.primary, bold: true,
      align: "left", margin: 0,
    });
    slide.addText(b.tag, {
      x: x + 1.32, y: 4.66, w: 1.26, h: 0.24,
      fontSize: 8.5, fontFace: "Trebuchet MS",
      color: b.on ? theme.accent : theme.muted, bold: true, charSpacing: 0.8,
      align: "right", margin: 0,
    });
    slide.addText(b.d, {
      x: x + 0.16, y: 4.92, w: 2.42, h: 0.38,
      fontSize: 9.5, fontFace: "Calibri",
      color: theme.muted,
      align: "left", margin: 0, lineSpacing: 12,
    });
  });

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
  pres.writeFile({ fileName: "./output/slide-06-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
