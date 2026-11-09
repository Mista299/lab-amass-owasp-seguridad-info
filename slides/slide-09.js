// Slide 9 — Demo 2: enumeración activa + fuerza bruta
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: "content",
  index: 9,
  title: "Paso 1 y 2 — Enumeración activa y fuerza bruta",
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();
  slide.background = { color: theme.bg };

  slide.addText("Práctica · Pasos 1 y 2", {
    x: 0.6, y: 0.42, w: 8.8, h: 0.32,
    fontSize: 12, fontFace: "Trebuchet MS",
    color: theme.accent, bold: true, charSpacing: 2.2,
    align: "left", margin: 0,
  });

  slide.addText("Enumeración activa y fuerza bruta controlada", {
    x: 0.6, y: 0.78, w: 8.8, h: 0.52,
    fontSize: 28, fontFace: "Trebuchet MS",
    color: theme.primary, bold: true,
    align: "left", margin: 0, fit: "shrink",
  });

  // Terminal principal
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 1.48, w: 6.0, h: 3.0,
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
  slide.addText("atacante@lab: ~/amass-lab", {
    x: 1.42, y: 1.62, w: 3.4, h: 0.24,
    fontSize: 10, fontFace: "Consolas",
    color: "6B7280",
    align: "left", margin: 0,
  });

  const lines = [
    { t: "$ amass enum -active \\", c: "E5E7EB" },
    { t: "      -d lab.local -p 80,443 \\", c: "E5E7EB" },
    { t: "      -nf wordlists/seeds.txt", c: "E5E7EB" },
    { t: "", c: "E5E7EB" },
    { t: "29 / 30 [======>      ] 96.67% ? p/s25", c: "4ADE80" },
    { t: "", c: "E5E7EB" },
    { t: "$ amass subs -names -d lab.local -ip", c: "E5E7EB" },
    { t: "vpn.lab.local        192.168.56.106", c: "4ADE80" },
    { t: "old.lab.local        192.168.56.110", c: "4ADE80" },
    { t: "lab.local            192.168.56.103", c: "4ADE80" },
    { t: "mail.lab.local       192.168.56.103", c: "4ADE80" },
    { t: "ns1.lab.local        192.168.56.101", c: "4ADE80" },
  ];

  slide.addText(
    lines.map((l) => ({
      text: l.t || " ",
      options: { color: l.c, breakLine: true },
    })),
    {
      x: 0.85, y: 1.98, w: 5.55, h: 2.38,
      fontSize: 10.5, fontFace: "Consolas",
      align: "left", margin: 0, lineSpacing: 15,
    }
  );

  // Panel derecho: flags
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 6.85, y: 1.48, w: 2.55, h: 3.0,
    fill: { color: theme.card },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.1,
  });

  slide.addText("Flags que importan", {
    x: 7.05, y: 1.66, w: 2.2, h: 0.28,
    fontSize: 13, fontFace: "Trebuchet MS",
    color: theme.primary, bold: true,
    align: "left", margin: 0,
  });

  const flags = [
    ["-active", "Resolución DNS y comprobación de servicios"],
    ["-d", "Dominio objetivo"],
    ["-p", "Puertos: muro de seguridad del ejercicio"],
    ["-nf", "Nombres ya conocidos que se validan contra el DNS"],
    ["-timeout", "Minutos sin progreso antes de terminar"],
  ];

  flags.forEach((f, i) => {
    const y = 2.04 + i * 0.48;
    slide.addText(f[0], {
      x: 7.05, y, w: 0.72, h: 0.24,
      fontSize: 10.5, fontFace: "Consolas",
      color: theme.accent, bold: true,
      align: "left", margin: 0,
    });
    slide.addText(f[1], {
      x: 7.78, y: y - 0.01, w: 1.5, h: 0.44,
      fontSize: 9, fontFace: "Calibri",
      color: theme.muted,
      align: "left", margin: 0, lineSpacing: 11,
    });
  });

  // Banner: la clave pedagógica
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 4.62, w: 8.8, h: 0.62,
    fill: { color: theme.light },
    line: { color: theme.accent, width: 1 },
    rectRadius: 0.06,
  });

  slide.addText(
    [
      { text: "La fuerza bruta no adivina: pregunta al DNS. ", options: { bold: true, color: theme.primary } },
      { text: "En la lista de 13 semillas, 11 existen en la zona y 2 no. El DNS autoritativo es quien decide — y Amass descarta lo que no existe.", options: { color: theme.secondary } },
    ],
    {
      x: 0.85, y: 4.73, w: 8.3, h: 0.42,
      fontSize: 12, fontFace: "Calibri",
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
  pres.writeFile({ fileName: "./output/slide-09-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
