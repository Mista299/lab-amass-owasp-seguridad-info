// Slide 7 — Divisor: Manos a la obra
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: "section",
  index: 7,
  title: "Manos a la obra",
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();
  slide.background = { color: theme.primary };

  // Número gigante
  slide.addText("02", {
    x: 0.7, y: 0.6, w: 3.0, h: 1.6,
    fontSize: 110, fontFace: "Trebuchet MS",
    color: theme.accent, bold: true,
    align: "left", margin: 0,
  });

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.78, y: 2.34, w: 1.35, h: 0.09,
    fill: { color: theme.gold },
  });

  slide.addText("Manos a la obra", {
    x: 0.75, y: 2.68, w: 6.6, h: 0.82,
    fontSize: 46, fontFace: "Trebuchet MS",
    color: "FFFFFF", bold: true,
    align: "left", margin: 0, fit: "shrink",
  });

  slide.addText(
    "Laboratorio 100 % offline: un DNS autoritativo propio, una zona ficticia y 17 minutos de práctica real.",
    {
      x: 0.78, y: 3.6, w: 6.4, h: 0.68,
      fontSize: 16, fontFace: "Calibri",
      color: "D1D5DB",
      align: "left", margin: 0, lineSpacing: 22,
    }
  );

  // Diagrama de la topología del laboratorio
  const panelX = 6.35;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: panelX, y: 0.72, w: 3.1, h: 4.2,
    fill: { color: "1F2937" },
    line: { color: "374151", width: 1 },
    rectRadius: 0.1,
  });

  slide.addText("TOPOLOGÍA DEL LAB", {
    x: panelX + 0.22, y: 0.9, w: 2.7, h: 0.26,
    fontSize: 9.5, fontFace: "Trebuchet MS",
    color: theme.gold, bold: true, charSpacing: 1.6,
    align: "left", margin: 0,
  });

  const nodes = [
    { y: 1.32, t: "DNS autoritativo", ip: "192.168.56.101", c: theme.accent },
    { y: 2.14, t: "Amass + motor", ip: "192.168.56.100", c: theme.gold },
    { y: 2.96, t: "Metasploitable 3", ip: "192.168.56.103", c: theme.accent },
    { y: 3.78, t: "Zona ficticia", ip: "lab.local", c: theme.secondary },
  ];

  nodes.forEach((n, i) => {
    if (i < nodes.length - 1) {
      slide.addShape(pres.shapes.LINE, {
        x: panelX + 0.42, y: n.y + 0.44,
        w: 0, h: 0.38,
        line: { color: "4B5563", width: 1.5, dashType: "dash" },
      });
    }
    slide.addShape(pres.shapes.OVAL, {
      x: panelX + 0.32, y: n.y, w: 0.22, h: 0.22,
      fill: { color: n.c },
    });
    slide.addText(n.t, {
      x: panelX + 0.66, y: n.y - 0.04, w: 2.3, h: 0.26,
      fontSize: 11.5, fontFace: "Trebuchet MS",
      color: "F3F4F6", bold: true,
      align: "left", margin: 0,
    });
    slide.addText(n.ip, {
      x: panelX + 0.66, y: n.y + 0.19, w: 2.3, h: 0.24,
      fontSize: 10, fontFace: "Consolas",
      color: "9CA3AF",
      align: "left", margin: 0,
    });
  });

  slide.addText("sin salida a Internet", {
    x: panelX + 0.22, y: 4.56, w: 2.7, h: 0.26,
    fontSize: 10, fontFace: "Consolas",
    color: theme.accent, bold: true,
    align: "center", margin: 0,
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
  pres.writeFile({ fileName: "./output/slide-07-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
