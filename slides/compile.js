// Compilador de la presentación OWASP Amass
const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Michael Stiven Tabares Tobón";
pres.company = "Universidad de Antioquia";
pres.subject = "Seguridad de la Información 2026-II";
pres.title = "OWASP Amass — Descubrimiento de activos y mapeo de superficie de ataque";

// Tema: Platinum White & Gold + Pure Tech Blue (adaptado a modo claro)
const theme = {
  primary: "111827",   // casi negro — títulos
  secondary: "374151", // gris oscuro — cuerpo
  accent: "0070F3",    // azul acción
  light: "E0EFFF",     // azul claro — superficies
  bg: "FFFFFF",        // fondo
  card: "F7F8FA",      // tarjetas
  border: "D4D8DE",    // bordes
  muted: "6B7280",     // texto secundario
  gold: "D4AF37",      // acento dorado
};

const SLIDES = 11;

for (let i = 1; i <= SLIDES; i++) {
  const num = String(i).padStart(2, "0");
  const mod = require(`./slide-${num}.js`);
  mod.createSlide(pres, theme);
  console.log(`  slide-${num}.js  ✓  ${mod.slideConfig.type}`);
}

pres
  .writeFile({ fileName: "./output/OWASP-Amass-Presentacion.pptx" })
  .then(() => {
    console.log(`\n✓ Presentación generada: slides/output/OWASP-Amass-Presentacion.pptx`);
  })
  .catch((err) => {
    console.error("✗ Error:", err);
    process.exit(1);
  });
