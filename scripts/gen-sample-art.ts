// Generates clearly labelled placeholder product illustrations (SVG) for the SAMPLE catalogue.
// Run: npx tsx scripts/gen-sample-art.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { products, palette, type Art } from "../prisma/sample-data";

const { GOLD, CHAR, WOOD, STEEL, TAUPE } = palette;
const OUT = join(process.cwd(), "public", "samples");
mkdirSync(OUT, { recursive: true });

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

const draw: Record<Art, (t: string) => string> = {
  dutchOven: (t) => `
    <rect x="150" y="430" width="70" height="34" rx="17" fill="${shade(t, -0.08)}"/>
    <rect x="580" y="430" width="70" height="34" rx="17" fill="${shade(t, -0.08)}"/>
    <path d="M200 400 h400 v170 a70 70 0 0 1 -70 70 h-260 a70 70 0 0 1 -70 -70z" fill="${t}"/>
    <path d="M225 420 h30 v150 a40 40 0 0 0 20 36 h-10 a50 50 0 0 1 -40 -48z" fill="${shade(t, 0.12)}" opacity=".6"/>
    <ellipse cx="400" cy="398" rx="222" ry="36" fill="${shade(t, -0.06)}"/>
    <ellipse cx="400" cy="388" rx="208" ry="28" fill="${shade(t, 0.05)}"/>
    <rect x="370" y="330" width="60" height="50" rx="14" fill="${GOLD}"/>
    <rect x="360" y="322" width="80" height="16" rx="8" fill="${shade(GOLD, 0.1)}"/>`,
  saucepan: (t) => `
    <rect x="520" y="420" width="210" height="28" rx="14" fill="${shade(t, -0.15)}"/>
    <path d="M220 400 h300 v170 a50 50 0 0 1 -50 50 h-200 a50 50 0 0 1 -50 -50z" fill="${t}"/>
    <rect x="236" y="420" width="18" height="150" rx="9" fill="#fff" opacity=".45"/>
    <ellipse cx="370" cy="398" rx="160" ry="22" fill="${shade(t, -0.2)}"/>
    <ellipse cx="370" cy="380" rx="150" ry="20" fill="#dfe6e6" opacity=".7"/>
    <circle cx="370" cy="352" r="16" fill="${CHAR}"/>`,
  skillet: (t) => `
    <rect x="540" y="452" width="230" height="30" rx="15" fill="${shade(t, -0.05)}"/>
    <path d="M130 440 h420 l-30 110 a40 40 0 0 1 -38 28 h-284 a40 40 0 0 1 -38 -28z" fill="${t}"/>
    <ellipse cx="340" cy="440" rx="212" ry="34" fill="${shade(t, -0.12)}"/>
    <ellipse cx="340" cy="440" rx="190" ry="26" fill="${shade(t, 0.08)}"/>`,
  stockpot: (t) => `
    <rect x="200" y="300" width="400" height="320" rx="40" fill="${t}"/>
    <rect x="160" y="340" width="56" height="26" rx="13" fill="${GOLD}"/>
    <rect x="584" y="340" width="56" height="26" rx="13" fill="${GOLD}"/>
    <ellipse cx="400" cy="300" rx="210" ry="30" fill="${shade(t, -0.08)}"/>
    <rect x="372" y="250" width="56" height="36" rx="12" fill="${GOLD}"/>
    <rect x="220" y="320" width="20" height="270" rx="10" fill="#fff" opacity=".35"/>`,
  knife: (t) => `
    <g transform="rotate(-28 400 400)">
      <path d="M150 380 h380 v44 h-330 q-40 0 -50 -44z" fill="#d9dedb"/>
      <path d="M150 380 h380 v10 h-375z" fill="#fff" opacity=".7"/>
      <rect x="530" y="372" width="18" height="60" rx="4" fill="${STEEL}"/>
      <rect x="548" y="378" width="170" height="48" rx="20" fill="${t}"/>
      <circle cx="590" cy="402" r="6" fill="${GOLD}"/><circle cx="640" cy="402" r="6" fill="${GOLD}"/><circle cx="690" cy="402" r="6" fill="${GOLD}"/>
    </g>`,
  knifeBlock: (t) => `
    <path d="M250 640 l90 -330 h180 l60 330z" fill="${t}"/>
    <path d="M340 310 h180 l10 30 h-196z" fill="${shade(t, 0.1)}"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="${352 + i * 34}" y="${240 - (i % 2) * 25}" width="22" height="80" rx="9" fill="${CHAR}"/><circle cx="${363 + i * 34}" cy="${262 - (i % 2) * 25}" r="4" fill="${GOLD}"/>`).join("")}`,
  board: (t) => `
    <rect x="150" y="300" width="500" height="320" rx="30" fill="${t}"/>
    <rect x="175" y="325" width="450" height="270" rx="18" fill="none" stroke="${shade(t, -0.12)}" stroke-width="6"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<line x1="${210 + i * 60}" y1="340" x2="${210 + i * 60}" y2="580" stroke="${shade(t, i % 2 ? -0.06 : 0.06)}" stroke-width="22"/>`).join("")}
    <circle cx="600" cy="340" r="12" fill="#F3EEE4"/>`,
  spoon: (t) => `
    ${[-14, 0, 14].map((r, i) => `<g transform="rotate(${r} 400 420)"><ellipse cx="${400 + (i - 1) * 6}" cy="250" rx="55" ry="80" fill="${shade(t, (i - 1) * 0.06)}"/><ellipse cx="${400 + (i - 1) * 6}" cy="250" rx="38" ry="60" fill="${shade(t, -0.1 + (i - 1) * 0.06)}"/><rect x="${388 + (i - 1) * 6}" y="320" width="24" height="330" rx="12" fill="${shade(t, (i - 1) * 0.06)}"/></g>`).join("")}`,
  utensilCrock: (t) => `
    ${[-18, -6, 6, 18].map((r, i) => `<g transform="rotate(${r} 400 600)"><rect x="390" y="190" width="20" height="300" rx="10" fill="${STEEL}"/>${i % 2 ? `<ellipse cx="400" cy="190" rx="40" ry="34" fill="${STEEL}"/>` : `<rect x="365" y="160" width="70" height="70" rx="10" fill="${shade(STEEL, -0.1)}"/>`}</g>`).join("")}
    <path d="M270 400 h260 l-20 220 a30 30 0 0 1 -30 28 h-160 a30 30 0 0 1 -30 -28z" fill="${t}"/>
    <rect x="262" y="390" width="276" height="26" rx="13" fill="${shade(t, -0.06)}"/>`,
  whisk: (t) => `
    <g transform="rotate(-30 400 400)">
      ${[-60, -36, -12, 12, 36, 60].map((d) => `<path d="M400 470 C ${400 + d * 2.4} 380, ${400 + d * 1.6} 170, 400 150" fill="none" stroke="${t}" stroke-width="6"/>`).join("")}
      <rect x="380" y="460" width="40" height="230" rx="20" fill="${CHAR}"/>
      <rect x="376" y="456" width="48" height="24" rx="6" fill="${STEEL}"/>
    </g>`,
  tongs: (t) => `
    <g transform="rotate(-25 400 400)">
      <path d="M200 380 L640 392 L640 404 L200 420 z" fill="${STEEL}"/>
      <path d="M200 430 L640 410 L640 422 L200 470 z" fill="${shade(STEEL, -0.1)}"/>
      <rect x="160" y="370" width="60" height="56" rx="12" fill="${t}"/><rect x="160" y="428" width="60" height="50" rx="12" fill="${t}"/>
      <circle cx="640" cy="406" r="20" fill="${CHAR}"/>
    </g>`,
  jar: (t) => `
    ${[0, 1].map((i) => {
      const x = 220 + i * 210, h = 280 - i * 60;
      return `<rect x="${x}" y="${640 - h}" width="170" height="${h}" rx="26" fill="#e6efeb" opacity=".85" stroke="#cfd8d4" stroke-width="4"/>
      <rect x="${x + 10}" y="${640 - h * 0.62}" width="150" height="${h * 0.62 - 10}" rx="18" fill="${i ? "#C9A96A" : "#D5CBB8"}"/>
      <rect x="${x - 6}" y="${640 - h - 34}" width="182" height="42" rx="12" fill="${t}"/>`;
    }).join("")}`,
  canisters: (t) => `
    ${[0, 1, 2].map((i) => {
      const x = 170 + i * 165, h = 300 - i * 50, col = [palette.IVORY, t, TAUPE][i];
      return `<rect x="${x}" y="${640 - h}" width="150" height="${h}" rx="30" fill="${col}" stroke="${shade(col, -0.08)}" stroke-width="4"/>
      <rect x="${x - 4}" y="${640 - h - 28}" width="158" height="36" rx="12" fill="${WOOD}"/>`;
    }).join("")}`,
  container: (t) => `
    ${[0, 1, 2].map((i) => `<rect x="${230 - i * 20}" y="${560 - i * 90}" width="${340 + i * 40}" height="80" rx="16" fill="${shade(t, -i * 0.05)}"/><rect x="${222 - i * 20}" y="${552 - i * 90}" width="${356 + i * 40}" height="18" rx="9" fill="${palette.SAGE}"/>`).join("")}`,
  kettle: (t) => `
    <path d="M520 470 C 600 470, 640 380, 700 300" fill="none" stroke="${t}" stroke-width="16" stroke-linecap="round"/>
    <path d="M250 640 h300 l-30 -230 a120 80 0 0 0 -240 0z" fill="${t}"/>
    <path d="M300 300 C 300 220, 500 220, 500 300" fill="none" stroke="${GOLD}" stroke-width="18"/>
    <ellipse cx="400" cy="400" rx="120" ry="20" fill="${shade(t, 0.1)}"/>
    <rect x="230" y="636" width="340" height="24" rx="10" fill="${shade(t, -0.05)}"/>
    <rect x="280" y="430" width="16" height="190" rx="8" fill="#fff" opacity=".2"/>`,
  toaster: (t) => `
    <rect x="180" y="360" width="440" height="270" rx="80" fill="${t}"/>
    <rect x="270" y="372" width="110" height="18" rx="9" fill="${CHAR}"/><rect x="420" y="372" width="110" height="18" rx="9" fill="${CHAR}"/>
    <rect x="590" y="460" width="40" height="18" rx="6" fill="${CHAR}"/>
    <circle cx="400" cy="560" r="20" fill="${GOLD}"/>
    <rect x="200" y="400" width="18" height="190" rx="9" fill="#fff" opacity=".4"/>`,
  blender: (t) => `
    <path d="M300 200 h200 l-20 290 h-160z" fill="#e3ebe8" opacity=".9" stroke="#c9d3cf" stroke-width="4"/>
    <path d="M314 360 h172 l-8 130 h-156z" fill="${palette.SAGE}" opacity=".6"/>
    <rect x="290" y="180" width="220" height="34" rx="10" fill="${CHAR}"/>
    <path d="M280 490 h240 l20 150 h-280z" fill="${t}"/>
    <circle cx="400" cy="570" r="24" fill="${GOLD}"/>`,
  scale: (t) => `
    <rect x="200" y="480" width="400" height="80" rx="20" fill="${t}"/>
    <rect x="190" y="460" width="420" height="30" rx="12" fill="#e7ece9" opacity=".9"/>
    <rect x="330" y="510" width="140" height="34" rx="6" fill="#1c1c1c"/>
    <text x="400" y="535" font-family="monospace" font-size="24" fill="${GOLD}" text-anchor="middle">250 g</text>`,
  bowls: (t) => `
    <path d="M160 460 h480 a240 180 0 0 1 -480 0z" fill="${palette.IVORY}" stroke="${shade(palette.IVORY, -0.1)}" stroke-width="4"/>
    <path d="M220 400 h360 a180 140 0 0 1 -360 0z" fill="${TAUPE}"/>
    <path d="M280 345 h240 a120 95 0 0 1 -240 0z" fill="${t}"/>`,
  grater: (t) => `
    <path d="M300 240 h200 l40 400 h-280z" fill="${t}"/>
    ${Array.from({ length: 8 }, (_, r) => Array.from({ length: 5 }, (_, c) => `<rect x="${318 + c * 36 + r * 2}" y="${300 + r * 40}" width="18" height="8" rx="4" fill="${shade(t, -0.25)}"/>`).join("")).join("")}
    <rect x="360" y="190" width="80" height="60" rx="20" fill="none" stroke="${CHAR}" stroke-width="16"/>`,
  measuring: (t) => `
    ${[0, 1, 2, 3].map((i) => `<g transform="translate(${170 + i * 120} ${420 + i * 20})"><path d="M0 0 h${110 - i * 10} a${55 - i * 5} 50 0 0 1 -${110 - i * 10} 0z" fill="${shade(t, -i * 0.04)}"/><rect x="${100 - i * 10}" y="-6" width="70" height="14" rx="7" fill="${shade(t, -0.1)}"/></g>`).join("")}`,
  mortar: (t) => `
    <g transform="rotate(25 470 330)"><rect x="440" y="200" width="56" height="260" rx="28" fill="${shade(t, 0.12)}"/></g>
    <path d="M220 420 h360 a180 170 0 0 1 -360 0z" fill="${t}"/>
    <ellipse cx="400" cy="420" rx="180" ry="26" fill="${shade(t, 0.15)}"/>
    <rect x="320" y="580" width="160" height="40" rx="12" fill="${shade(t, -0.05)}"/>`,
  cruet: (t) => `
    <path d="M330 640 h140 a20 20 0 0 0 20 -20 v-210 c0 -50 -40 -60 -40 -110 v-60 h-80 v60 c0 50 -40 60 -40 110 v210 a20 20 0 0 0 20 20z" fill="#e1ebe6" opacity=".85" stroke="#c6d1cb" stroke-width="4"/>
    <path d="M314 470 h172 v150 a20 20 0 0 1 -20 20 h-132 a20 20 0 0 1 -20 -20z" fill="${t}" opacity=".85"/>
    <rect x="368" y="200" width="64" height="44" rx="8" fill="${STEEL}"/>
    <path d="M400 200 l60 -50 l10 12 l-52 52z" fill="${STEEL}"/>`,
  mitt: (t) => `
    <path d="M300 640 v-300 a110 110 0 0 1 220 0 v300z" fill="${t}"/>
    <path d="M300 420 a50 50 0 0 1 -60 -70 l40 -40 l40 60z" fill="${t}"/>
    <rect x="290" y="600" width="240" height="50" rx="14" fill="${palette.IVORY}"/>
    ${[0, 1, 2, 3].map((i) => `<line x1="320" y1="${380 + i * 50}" x2="500" y2="${380 + i * 50}" stroke="${shade(t, -0.08)}" stroke-width="4" stroke-dasharray="10 10"/>`).join("")}`,
  saltCellar: (t) => `
    <path d="M270 640 h260 v-170 a130 40 0 0 0 -260 0z" fill="${t}"/>
    <ellipse cx="400" cy="470" rx="130" ry="36" fill="${shade(t, -0.12)}"/>
    <ellipse cx="460" cy="430" rx="140" ry="36" fill="${shade(t, 0.06)}" transform="rotate(-12 460 430)"/>
    <circle cx="300" cy="470" r="8" fill="${GOLD}"/>`,
  trivet: (t) => `
    <circle cx="400" cy="440" r="210" fill="none" stroke="${t}" stroke-width="22"/>
    <path d="M250 520 L350 360 L400 430 L460 330 L560 520" fill="none" stroke="${t}" stroke-width="22" stroke-linejoin="round"/>`,
};

function svg(art: Art, tone: string, variant: 0 | 1): string {
  const bg = variant === 0 ? "#F3EEE4" : "#E9E2D4";
  const body = draw[art](tone);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="Sample product illustration">
  <rect width="800" height="800" fill="${bg}"/>
  <ellipse cx="400" cy="660" rx="300" ry="26" fill="#000" opacity=".07"/>
  <g ${variant === 1 ? 'transform="translate(400 420) scale(1.25) translate(-400 -420)"' : ""}>${body}</g>
  <g transform="translate(28 748)"><rect width="168" height="30" rx="15" fill="#2C2C2C" opacity=".82"/><text x="84" y="20" font-family="Arial, sans-serif" font-size="13" letter-spacing="2" fill="#FAF8F2" text-anchor="middle">SAMPLE IMAGE</text></g>
</svg>`;
}

for (const p of products) {
  writeFileSync(join(OUT, `${p.slug}.svg`), svg(p.art, p.tone, 0));
  writeFileSync(join(OUT, `${p.slug}-detail.svg`), svg(p.art, p.tone, 1));
}
console.log(`Wrote ${products.length * 2} sample illustrations to public/samples`);

// Hero still-life illustration (placeholder until brand photography is supplied)
const leaf = (x: number, y: number, r: number, s = 1, c = palette.OLIVE) =>
  `<ellipse cx="0" cy="-26" rx="11" ry="28" fill="${c}" transform="translate(${x} ${y}) rotate(${r}) scale(${s})"/>`;
const branch = (x: number, y: number, len: number, lean: number) => {
  let out = `<path d="M${x} ${y} q ${lean} ${-len / 2} ${lean * 1.6} ${-len}" stroke="#5d5a3e" stroke-width="3" fill="none"/>`;
  for (let i = 1; i < 9; i++) {
    const t = i / 9, px = x + lean * 1.6 * t * t + lean * 0.2 * t, py = y - len * t;
    out += leaf(px, py, -50 + (i % 2) * 100, 0.8 + (i % 3) * 0.12, i % 2 ? palette.OLIVE : palette.SAGE);
  }
  return out;
};
const hero = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="Kitchen still life with a green Dutch oven, stoneware bowls and wooden utensils">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6F2EA"/><stop offset="1" stop-color="#E8E0D1"/></linearGradient>
    <linearGradient id="counter" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EDE6D8"/><stop offset="1" stop-color="#DCD2BF"/></linearGradient>
    <radialGradient id="light" cx=".75" cy=".2" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#wall)"/>
  <path d="M0 220 C 300 260 500 160 760 230 S 1100 200 1200 260" stroke="#e3dccf" stroke-width="3" fill="none"/>
  <path d="M0 420 C 260 380 420 470 700 410 S 1000 450 1200 400" stroke="#e6dfd2" stroke-width="2" fill="none"/>
  <rect width="1200" height="900" fill="url(#light)"/>
  <rect x="0" y="660" width="1200" height="240" fill="url(#counter)"/>
  <rect x="0" y="652" width="1200" height="12" fill="#cfc4ae"/>
  <!-- wooden board behind -->
  <rect x="770" y="250" width="230" height="410" rx="40" fill="#B88A5A"/><circle cx="885" cy="292" r="16" fill="#EDE6D8"/>
  <rect x="790" y="330" width="190" height="320" rx="24" fill="none" stroke="#a87a4c" stroke-width="5"/>
  <!-- plant -->
  <path d="M110 660 h150 l-15 -150 h-120z" fill="#F3EFE6" stroke="#ddd4c4" stroke-width="3"/>
  ${branch(185, 515, 330, -40)}${branch(190, 515, 380, 25)}${branch(180, 520, 260, -90)}
  <!-- utensil crock -->
  <g transform="translate(560 160) scale(.62)">${draw.utensilCrock(palette.IVORY).replaceAll(STEEL, WOOD)}</g>
  <!-- stacked bowls (behind the pot) -->
  <g transform="translate(800 345) scale(.55)">${draw.bowls(palette.SAGE)}</g>
  <!-- dutch oven hero -->
  <g transform="translate(230 175) scale(.95)">${draw.dutchOven(palette.FOREST)}</g>
  <ellipse cx="640" cy="790" rx="420" ry="20" fill="#000" opacity=".05"/>
</svg>`;
mkdirSync(join(process.cwd(), "public", "brand"), { recursive: true });
writeFileSync(join(process.cwd(), "public", "brand", "hero.svg"), hero);
console.log("Wrote public/brand/hero.svg");
