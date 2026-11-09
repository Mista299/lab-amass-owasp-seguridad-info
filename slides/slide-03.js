// Slide 3 — Qué es OWASP Amass
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: "content",
  index: 3,
  title: "¿Qué es OWASP Amass?",
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();
  slide.background = { color: theme.bg };

  slide.addText("Definición", {
    x: 0.6, y: 0.42, w: 8.8, h: 0.32,
    fontSize: 12, fontFace: "Trebuchet MS",
    color: theme.accent, bold: true, charSpacing: 2.2,
    align: "left", margin: 0,
  });

  slide.addText("¿Qué es OWASP Amass?", {
    x: 0.6, y: 0.78, w: 8.8, h: 0.58,
    fontSize: 33, fontFace: "Trebuchet MS",
    color: theme.primary, bold: true,
    align: "left", margin: 0, fit: "shrink",
  });

  // Definición principal
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 1.48, w: 8.8, h: 0.98,
    fill: { color: theme.light },
    line: { color: theme.accent, width: 1 },
    rectRadius: 0.08,
  });

  slide.addText(
    "Framework open source de OWASP para reconocimiento de activos y mapeo de superficie de ataque: combina OSINT, resolución DNS activa y correlación en un grafo de activos persistido.",
    {
      x: 0.88, y: 1.62, w: 8.25, h: 0.72,
      fontSize: 13.5, fontFace: "Calibri",
      color: theme.primary,
      align: "left", margin: 0, lineSpacing: 19,
    }
  );

  // Diferenciadores: 3 columnas
  const cols = [
    {
      n: "01",
      t: "No es solo un enumerador",
      d: "Un subdominio aislado es ruido. Amass lo conecta con IPs, servicios, certificados y sus fuentes de descubrimiento.",
    },
    {
      n: "02",
      t: "Construye un grafo",
      d: "Cada activo se modela como entidad y cada relación como arista. El resultado es un mapa, no una lista.",
    },
    {
      n: "03",
      t: "Persistencia y trazabilidad",
      d: "Cada hallazgo guarda su procedencia, TTL y confianza. Se puede comparar la superficie entre fechas.",
    },
  ];

  cols.forEach((c, i) => {
    const x = 0.6 + i * 3.0;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 2.66, w: 2.72, h: 1.74,
      fill: { color: theme.card },
      line: { color: theme.border, width: 1 },
      rectRadius: 0.1,
    });
    slide.addText(c.n, {
      x: x + 0.22, y: 2.8, w: 1.0, h: 0.38,
      fontSize: 22, fontFace: "Trebuchet MS",
      color: theme.accent, bold: true,
      align: "left", margin: 0,
    });
    slide.addText(c.t, {
      x: x + 0.22, y: 3.2, w: 2.3, h: 0.38,
      fontSize: 13, fontFace: "Trebuchet MS",
      color: theme.primary, bold: true,
      align: "left", margin: 0, fit: "shrink",
    });
    slide.addText(c.d, {
      x: x + 0.22, y: 3.62, w: 2.32, h: 0.68,
      fontSize: 10.5, fontFace: "Calibri",
      color: theme.muted,
      align: "left", margin: 0, lineSpacing: 13.5,
    });
  });

  // Comparativa con dig
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 4.6, w: 8.8, h: 0.62,
    fill: { color: theme.primary },
    rectRadius: 0.08,
  });

  slide.addText(
    [
      { text: "dig ", options: { fontFace: "Consolas", color: theme.gold, bold: true } },
      { text: "responde una pregunta.   ", options: { color: "E5E7EB" } },
      { text: "amass enum", options: { fontFace: "Consolas", color: theme.gold, bold: true } },
      { text: " construye el mapa completo de lo que esa respuesta implica.", options: { color: "E5E7EB" } },
    ],
    {
      x: 0.88, y: 4.78, w: 8.25, h: 0.3,
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
  pres.writeFile({ fileName: "./output/slide-03-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
