// Slide 8 — Demo 1: verificación del entorno
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: "content",
  index: 8,
  title: "Paso 0 — Verificar el aislamiento",
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();
  slide.background = { color: theme.bg };

  slide.addText("Práctica · Paso 0", {
    x: 0.6, y: 0.42, w: 8.8, h: 0.32,
    fontSize: 12, fontFace: "Trebuchet MS",
    color: theme.accent, bold: true, charSpacing: 2.2,
    align: "left", margin: 0,
  });

  slide.addText("Primero: demostrar que el laboratorio está aislado", {
    x: 0.6, y: 0.78, w: 8.8, h: 0.52,
    fontSize: 28, fontFace: "Trebuchet MS",
    color: theme.primary, bold: true,
    align: "left", margin: 0, fit: "shrink",
  });

  // Terminal
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 1.48, w: 5.65, h: 2.62,
    fill: { color: "0B1220" },
    rectRadius: 0.08,
  });
  slide.addShape(pres.shapes.OVAL, {
    x: 0.82, y: 1.68, w: 0.11, h: 0.11, fill: { color: "EF4444" },
  });
  slide.addShape(pres.shapes.OVAL, {
    x: 1.0, y: 1.68, w: 0.11, h: 0.11, fill: { color: "F59E0B" },
  });
  slide.addShape(pres.shapes.OVAL, {
    x: 1.18, y: 1.68, w: 0.11, h: 0.11, fill: { color: "22C55E" },
  });
  slide.addText("atacante@lab: ~", {
    x: 1.42, y: 1.62, w: 3.0, h: 0.24,
    fontSize: 10, fontFace: "Consolas",
    color: "6B7280",
    align: "left", margin: 0,
  });

  const lines = [
    { t: "# 1. Internet debe estar BLOQUEADO", c: "9CA3AF" },
    { t: "$ curl -s --max-time 5 https://owasp.org", c: "E5E7EB" },
    { t: "(sin salida — DROP por iptables)", c: "F87171" },
    { t: "", c: "E5E7EB" },
    { t: "# 2. El DNS del laboratorio responde", c: "9CA3AF" },
    { t: "$ dig @192.168.56.101 dev.lab.local A", c: "E5E7EB" },
    { t: "dev.lab.local.   300  IN  A  192.168.56.103", c: "4ADE80" },
    { t: "", c: "E5E7EB" },
    { t: "# 3. Versión de Amass", c: "9CA3AF" },
    { t: "$ docker run --rm amass:latest -version", c: "E5E7EB" },
    { t: "v5.1.3", c: "4ADE80" },
  ];

  slide.addText(
    lines.map((l) => ({
      text: l.t || " ",
      options: { color: l.c, breakLine: true },
    })),
    {
      x: 0.85, y: 1.96, w: 5.2, h: 1.98,
      fontSize: 10, fontFace: "Consolas",
      align: "left", margin: 0, lineSpacing: 14,
    }
  );

  // Explicación a la derecha
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 6.5, y: 1.48, w: 2.9, h: 2.62,
    fill: { color: theme.card },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.1,
  });

  slide.addText("Por qué importa", {
    x: 6.72, y: 1.68, w: 2.5, h: 0.3,
    fontSize: 14, fontFace: "Trebuchet MS",
    color: theme.primary, bold: true,
    align: "left", margin: 0,
  });

  const points = [
    "Amass v5 usa 53 resolvers públicos embebidos en el código.",
    "Sin bloqueo de red, el motor sale a Internet aunque el config diga lo contrario.",
    "La redirección DNAT + SNAT los envía al DNS del laboratorio.",
  ];

  points.forEach((p, i) => {
    const y = 2.1 + i * 0.62;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 6.72, y: y + 0.06, w: 0.06, h: 0.42,
      fill: { color: theme.accent },
    });
    slide.addText(p, {
      x: 6.9, y, w: 2.32, h: 0.56,
      fontSize: 10, fontFace: "Calibri",
      color: theme.muted,
      align: "left", margin: 0, lineSpacing: 13,
    });
  });

  // Banner inferior
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 4.3, w: 8.8, h: 0.92,
    fill: { color: theme.primary },
    rectRadius: 0.08,
  });

  slide.addText("Lo que vemos en la terminal", {
    x: 0.88, y: 4.44, w: 8.25, h: 0.26,
    fontSize: 12, fontFace: "Trebuchet MS",
    color: theme.gold, bold: true,
    align: "left", margin: 0,
  });

  slide.addText(
    "Amass v5 no tiene la opción -src ni -o en el subcomando enum. Los resultados se consultan después con amass subs, que lee la base de datos SQLite compartida.",
    {
      x: 0.88, y: 4.72, w: 8.25, h: 0.4,
      fontSize: 11.5, fontFace: "Calibri",
      color: "D1D5DB",
      align: "left", margin: 0, lineSpacing: 15,
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
  pres.writeFile({ fileName: "./output/slide-08-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
