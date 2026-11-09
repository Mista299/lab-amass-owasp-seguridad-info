// Slide 11 — Cierre y conclusiones
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: "summary",
  index: 11,
  title: "Conclusiones",
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();
  slide.background = { color: theme.bg };

  slide.addText("Cierre", {
    x: 0.6, y: 0.42, w: 8.8, h: 0.32,
    fontSize: 12, fontFace: "Trebuchet MS",
    color: theme.accent, bold: true, charSpacing: 2.2,
    align: "left", margin: 0,
  });

  slide.addText("Tres ideas para llevarse", {
    x: 0.6, y: 0.78, w: 8.8, h: 0.58,
    fontSize: 33, fontFace: "Trebuchet MS",
    color: theme.primary, bold: true,
    align: "left", margin: 0, fit: "shrink",
  });

  const takeaways = [
    {
      n: "01",
      t: "Amass es un grafo, no una lista",
      d: "Conecta nombre, IP, servicio y procedencia. El valor está en la relación entre los datos, no en el dato aislado.",
    },
    {
      n: "02",
      t: "Pasivo y activo responden preguntas distintas",
      d: "El pasivo no toca el objetivo; el activo lo interroga. Ambos son legítimos, pero exigen autorización y alcance distintos.",
    },
    {
      n: "03",
      t: "El límite real es el ethical scope",
      d: "La herramienta se automatiza; la responsabilidad no. Entender el alcance es más difícil que dominar los comandos.",
    },
  ];

  takeaways.forEach((t, i) => {
    const x = 0.6 + i * 3.0;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.56, w: 2.72, h: 2.16,
      fill: { color: theme.card },
      line: { color: theme.border, width: 1 },
      rectRadius: 0.1,
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.56, w: 2.72, h: 0.08,
      fill: { color: i === 1 ? theme.gold : theme.accent },
    });
    slide.addText(t.n, {
      x: x + 0.22, y: 1.78, w: 1.2, h: 0.42,
      fontSize: 26, fontFace: "Trebuchet MS",
      color: i === 1 ? theme.gold : theme.accent, bold: true,
      align: "left", margin: 0,
    });
    slide.addText(t.t, {
      x: x + 0.22, y: 2.22, w: 2.3, h: 0.62,
      fontSize: 13, fontFace: "Trebuchet MS",
      color: theme.primary, bold: true,
      align: "left", margin: 0, lineSpacing: 16, fit: "shrink",
    });
    slide.addText(t.d, {
      x: x + 0.22, y: 2.88, w: 2.32, h: 0.74,
      fontSize: 10.5, fontFace: "Calibri",
      color: theme.muted,
      align: "left", margin: 0, lineSpacing: 13.5,
    });
  });

  // Nota del laboratorio
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 3.9, w: 5.6, h: 0.62,
    fill: { color: theme.light },
    line: { color: theme.accent, width: 1 },
    rectRadius: 0.06,
  });

  slide.addText(
    [
      { text: "Todo lo demostrado se ejecutó en máquinas virtuales locales. ", options: { color: theme.primary, bold: true } },
      { text: "Ni una sola consulta salió a Internet.", options: { color: theme.accent } },
    ],
    {
      x: 0.85, y: 4.04, w: 5.1, h: 0.36,
      fontSize: 12, fontFace: "Calibri",
      align: "left", margin: 0, lineSpacing: 15,
    }
  );

  // Preguntas
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 6.45, y: 3.9, w: 2.95, h: 0.62,
    fill: { color: theme.primary },
    rectRadius: 0.06,
  });

  slide.addText("¿Preguntas?", {
    x: 6.45, y: 4.0, w: 2.95, h: 0.42,
    fontSize: 20, fontFace: "Trebuchet MS",
    color: "FFFFFF", bold: true,
    align: "center", margin: 0,
  });

  // Pie
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 4.72, w: 8.8, h: 0.02,
    fill: { color: theme.border },
  });

  slide.addText(
    "Michael Stiven Tabares Tobón  ·  Ingeniería de Sistemas  ·  Universidad de Antioquia  ·  Seguridad de la Información 2026-II",
    {
      x: 0.6, y: 4.86, w: 6.6, h: 0.28,
      fontSize: 10.5, fontFace: "Calibri",
      color: theme.muted,
      align: "left", margin: 0,
    }
  );

  slide.addText("owasp.org/projects/amass", {
    x: 7.0, y: 4.86, w: 2.4, h: 0.28,
    fontSize: 10.5, fontFace: "Consolas",
    color: theme.accent,
    align: "right", margin: 0,
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
  pres.writeFile({ fileName: "./output/slide-11-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
