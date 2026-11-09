// Slide 5 — Arquitectura: del dato al grafo
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: "content",
  index: 5,
  title: "Arquitectura: del dato al grafo",
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();
  slide.background = { color: theme.bg };

  slide.addText("Cómo funciona por dentro", {
    x: 0.6, y: 0.42, w: 8.8, h: 0.32,
    fontSize: 12, fontFace: "Trebuchet MS",
    color: theme.accent, bold: true, charSpacing: 2.2,
    align: "left", margin: 0,
  });

  slide.addText("Arquitectura: del dato al grafo", {
    x: 0.6, y: 0.78, w: 8.8, h: 0.58,
    fontSize: 33, fontFace: "Trebuchet MS",
    color: theme.primary, bold: true,
    align: "left", margin: 0, fit: "shrink",
  });

  // Pipeline horizontal de 4 etapas
  const stages = [
    { n: "1", t: "Fuentes", d: "OSINT, DNS\nautoritativo, listas\nde palabras", c: theme.accent },
    { n: "2", t: "Motor", d: "Plugins que\nconsultan, validan\ny correlacionan", c: theme.secondary },
    { n: "3", t: "Base de datos", d: "SQLite local:\nentidades, aristas\ny procedencia", c: theme.gold },
    { n: "4", t: "Salida", d: "subs, track,\nviz y export\nJSON", c: theme.accent },
  ];

  stages.forEach((s, i) => {
    const x = 0.6 + i * 2.32;
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.62, w: 1.95, h: 1.72,
      fill: { color: theme.card },
      line: { color: theme.border, width: 1 },
      rectRadius: 0.1,
    });
    slide.addShape(pres.shapes.OVAL, {
      x: x + 0.18, y: 1.8, w: 0.4, h: 0.4,
      fill: { color: s.c },
    });
    slide.addText(s.n, {
      x: x + 0.18, y: 1.87, w: 0.4, h: 0.26,
      fontSize: 13, fontFace: "Trebuchet MS",
      color: "FFFFFF", bold: true, align: "center", margin: 0,
    });
    slide.addText(s.t, {
      x: x + 0.18, y: 2.3, w: 1.6, h: 0.3,
      fontSize: 14, fontFace: "Trebuchet MS",
      color: theme.primary, bold: true,
      align: "left", margin: 0,
    });
    slide.addText(s.d, {
      x: x + 0.18, y: 2.62, w: 1.62, h: 0.62,
      fontSize: 10, fontFace: "Calibri",
      color: theme.muted,
      align: "left", margin: 0, lineSpacing: 13,
    });

    if (i < stages.length - 1) {
      slide.addText("▶", {
        x: x + 1.96, y: 2.28, w: 0.34, h: 0.3,
        fontSize: 14, fontFace: "Arial",
        color: theme.accent, align: "center", margin: 0,
      });
    }
  });

  // Ejemplo de grafo
  slide.addText("Lo que queda almacenado (Open Asset Model)", {
    x: 0.6, y: 3.56, w: 8.8, h: 0.3,
    fontSize: 13, fontFace: "Trebuchet MS",
    color: theme.primary, bold: true,
    align: "left", margin: 0,
  });

  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 3.92, w: 8.8, h: 1.28,
    fill: { color: theme.primary },
    rectRadius: 0.1,
  });

  const boxes = [
    { x: 0.95, t: "FQDN", v: "vpn.lab.local", c: theme.accent },
    { x: 3.05, t: "IPAddress", v: "192.168.56.106", c: theme.gold },
    { x: 5.15, t: "Service", v: "tcp/443", c: theme.accent },
    { x: 7.25, t: "Source", v: "DNS · conf. 100", c: theme.secondary },
  ];

  boxes.forEach((b, i) => {
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: b.x, y: 4.18, w: 1.72, h: 0.72,
      fill: { color: theme.bg },
      line: { color: b.c, width: 1.5 },
      rectRadius: 0.06,
    });
    slide.addText(b.t, {
      x: b.x + 0.1, y: 4.26, w: 1.52, h: 0.22,
      fontSize: 9.5, fontFace: "Trebuchet MS",
      color: b.c, bold: true, charSpacing: 0.8,
      align: "center", margin: 0,
    });
    slide.addText(b.v, {
      x: b.x + 0.08, y: 4.5, w: 1.56, h: 0.3,
      fontSize: 11, fontFace: "Consolas",
      color: theme.primary,
      align: "center", margin: 0, fit: "shrink",
    });

    if (i < boxes.length - 1) {
      slide.addText("→", {
        x: b.x + 1.74, y: 4.38, w: 0.32, h: 0.3,
        fontSize: 15, fontFace: "Arial",
        color: theme.gold, align: "center", margin: 0,
      });
    }
  });

  slide.addText(
    "Cada arista guarda la fuente y la confianza. Por eso el resultado es auditable y priorizable, no una simple lista de nombres.",
    {
      x: 0.95, y: 4.98, w: 8.1, h: 0.24,
      fontSize: 10, fontFace: "Calibri",
      color: "9CA3AF", align: "center", margin: 0,
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
  pres.writeFile({ fileName: "./output/slide-05-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
