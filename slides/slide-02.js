// Slide 2 — El problema: la superficie de ataque invisible
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: "content",
  index: 2,
  title: "La superficie de ataque que nadie conoce",
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();
  slide.background = { color: theme.bg };

  // Encabezado
  slide.addText("El problema", {
    x: 0.6, y: 0.42, w: 8.8, h: 0.32,
    fontSize: 12, fontFace: "Trebuchet MS",
    color: theme.accent, bold: true, charSpacing: 2.2,
    align: "left", margin: 0,
  });

  slide.addText("La superficie de ataque que nadie conoce", {
    x: 0.6, y: 0.78, w: 8.8, h: 0.58,
    fontSize: 33, fontFace: "Trebuchet MS",
    color: theme.primary, bold: true,
    align: "left", margin: 0, fit: "shrink",
  });

  // Stat cards
  const stats = [
    { big: "20+", label: "subdominios descubiertos\nen una organización mediana", accent: theme.accent },
    { big: "12", label: "servicios públicos que\nse analizan y se pierden de vista", accent: theme.gold },
    { big: "0", label: "registros en el inventario\noficial de la organización", accent: theme.secondary },
  ];

  stats.forEach((s, i) => {
    const x = 0.6 + i * 3.0;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.62, w: 2.72, h: 1.62,
      fill: { color: theme.card },
      line: { color: theme.border, width: 1 },
      rectRadius: 0.1,
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.62, w: 2.72, h: 0.07,
      fill: { color: s.accent },
    });
    slide.addText(s.big, {
      x: x + 0.22, y: 1.84, w: 2.3, h: 0.72,
      fontSize: 46, fontFace: "Trebuchet MS",
      color: s.accent, bold: true,
      align: "left", margin: 0,
    });
    slide.addText(s.label, {
      x: x + 0.22, y: 2.56, w: 2.32, h: 0.58,
      fontSize: 11, fontFace: "Calibri",
      color: theme.muted,
      align: "left", margin: 0, lineSpacing: 14,
    });
  });

  // Narrativa inferior
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 3.46, w: 8.8, h: 1.5,
    fill: { color: theme.primary },
    rectRadius: 0.1,
  });

  slide.addText("¿", {
    x: 0.82, y: 3.56, w: 0.5, h: 0.7,
    fontSize: 40, fontFace: "Georgia",
    color: theme.accent, bold: true, align: "left", margin: 0,
  });

  slide.addText(
    "Cada subdominio olvidado es una puerta que nadie vigila. El problema no es técnico: es que el inventario de activos se construye después del incidente, no antes.",
    {
      x: 1.32, y: 3.68, w: 7.75, h: 0.72,
      fontSize: 14, fontFace: "Calibri",
      color: "F3F4F6",
      align: "left", margin: 0, lineSpacing: 20,
    }
  );

  slide.addText(
    [
      { text: "OWASP Amass responde con una pregunta concreta: ", options: {} },
      { text: "¿qué activos existen realmente y cuáles de ellos importan?", options: { bold: true, color: theme.gold } },
    ],
    {
      x: 1.32, y: 4.44, w: 7.75, h: 0.34,
      fontSize: 12.5, fontFace: "Calibri",
      color: "D1D5DB",
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
  pres.writeFile({ fileName: "./output/slide-02-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
