// Slide 10 — Demo 3: interpretation and prioritization
const pptxgen = require("pptxgenjs");

const slideConfig = {
  type: "content",
  index: 10,
  title: "Paso 3 — Del hallazgo al riesgo",
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();
  slide.background = { color: theme.bg };

  slide.addText("Práctica · Paso 3", {
    x: 0.6, y: 0.42, w: 8.8, h: 0.32,
    fontSize: 12, fontFace: "Trebuchet MS",
    color: theme.accent, bold: true, charSpacing: 2.2,
    align: "left", margin: 0,
  });

  slide.addText("Del hallazgo al riesgo: el valor real de Amass", {
    x: 0.6, y: 0.78, w: 8.8, h: 0.52,
    fontSize: 28, fontFace: "Trebuchet MS",
    color: theme.primary, bold: true,
    align: "left", margin: 0, fit: "shrink",
  });

  // Tabla de priorización
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 1.46, w: 8.8, h: 2.72,
    fill: { color: theme.card },
    line: { color: theme.border, width: 1 },
    rectRadius: 0.08,
  });

  // Encabezados
  const heads = [
    { t: "Activo", x: 0.85, w: 2.25 },
    { t: "Severidad", x: 3.2, w: 1.35 },
    { t: "Por qué importa", x: 4.7, w: 4.5 },
  ];
  heads.forEach((h) => {
    slide.addText(h.t, {
      x: h.x, y: 1.6, w: h.w, h: 0.26,
      fontSize: 10.5, fontFace: "Trebuchet MS",
      color: theme.muted, bold: true, charSpacing: 1.2,
      align: "left", margin: 0,
    });
  });

  const rows = [
    { a: "vpn.lab.local", sev: "CRÍTICO", c: "DC2626", why: "Acceso remoto a toda la organización desde un único activo" },
    { a: "dev / staging / qa", sev: "ALTO", c: "EA580C", why: "Entornos de preproducción con controles más débiles que producción" },
    { a: "jenkins / gitlab", sev: "ALTO", c: "EA580C", why: "Cadena de suministro: acceso al código y a los pipelines de despliegue" },
    { a: "admin.lab.local", sev: "ALTO", c: "EA580C", why: "Panel de administración expuesto a Internet" },
    { a: "old.lab.local", sev: "MEDIO", c: "CA8A04", why: "Activo residual: probable deuda técnica sin actualizar" },
    { a: "www / mail", sev: "BAJO", c: "059669", why: "Activos públicos esperados, sin señal de riesgo por sí solos" },
  ];

  rows.forEach((r, i) => {
    const y = 1.92 + i * 0.37;
    if (i % 2 === 0) {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: 0.72, y: y - 0.02, w: 8.56, h: 0.35,
        fill: { color: theme.bg },
      });
    }
    slide.addText(r.a, {
      x: 0.85, y, w: 2.25, h: 0.3,
      fontSize: 10.5, fontFace: "Consolas",
      color: theme.primary, bold: true,
      align: "left", margin: 0, valign: "top",
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 3.2, y: y + 0.02, w: 0.86, h: 0.24,
      fill: { color: r.c },
      rectRadius: 0.05,
    });
    slide.addText(r.sev, {
      x: 3.2, y: y + 0.055, w: 0.86, h: 0.2,
      fontSize: 8.5, fontFace: "Trebuchet MS",
      color: "FFFFFF", bold: true, charSpacing: 0.6,
      align: "center", margin: 0,
    });
    slide.addText(r.why, {
      x: 4.7, y, w: 4.5, h: 0.3,
      fontSize: 10, fontFace: "Calibri",
      color: theme.secondary,
      align: "left", margin: 0, valign: "top", lineSpacing: 12,
    });
  });

  // Conclusión
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 4.34, w: 8.8, h: 0.88,
    fill: { color: theme.primary },
    rectRadius: 0.08,
  });

  slide.addText(
    [
      { text: "La herramienta no prioriza: ", options: { color: "E5E7EB" } },
      { text: "entrega el inventario con su procedencia. ", options: { color: "FFFFFF", bold: true } },
      { text: "La priorización exige contexto: si 192.168.56.103 es producción o un laboratorio de pruebas, el mismo hallazgo cambia de severidad. Eso lo decide el equipo, no el script.", options: { color: "E5E7EB" } },
    ],
    {
      x: 0.9, y: 4.48, w: 8.2, h: 0.62,
      fontSize: 12, fontFace: "Calibri",
      align: "left", margin: 0, lineSpacing: 16,
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
  pres.writeFile({ fileName: "./output/slide-10-preview.pptx" });
}

module.exports = { createSlide, slideConfig };
