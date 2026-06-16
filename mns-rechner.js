/*! mns-rechner.js — Meile & Stein · Lean-Einsparrechner (Standalone Web Component)
 *
 *  Selbst-enthaltenes ESM-Modul, KEINE Runtime-Dependencies. Einbinden:
 *    <script type="module" src="mns-rechner.js"></script>
 *    <mns-lean-rechner bausumme="120000000"></mns-lean-rechner>
 *
 *  100 % client-seitig: kein Netzwerk-Call, kein localStorage, kein Tracking
 *  (no-datagrab / DSGVO-sauber). Theming via CSS Custom Properties (s. unten).
 *
 *  Aufbau:  1) DATEN  2) MODELL (reine Funktionen)  3) GAUGE  4) WEB COMPONENT
 *  Hinweis: Modell korrigiert ggü. Excel-Prototyp — Details siehe KORREKTUR-LOG.md
 */

/* =========================================================================
   1) DATEN — Modell-Annahmen + Maßnahmen (aus Excel portiert)
   ========================================================================= */

/** Belegte, bewusst sichtbare Annahmen. Im Profi-Modus anpassbar. */
export const ASSUMPTIONS = {
  // Terminzuverlässigkeit (PPC). Branchen-Baseline ~50–52 %; mit LPS erreichen
  // gute Teams 80–85 %. Quelle: Ballard/Tommelein 2016 (P2SL Berkeley).
  reliabilityBaseline: 0.52,        // klassisch gesteuertes Projekt (PPC ~52 %)
  reliabilityAchievableLow: 0.82,   // mit konsequenter Lean-Steuerung erreichbar
  reliabilityAchievableHigh: 0.88,
  // Erwartete Kostenüberschreitung großer (öffentlicher) Bauprojekte, als
  // Anteil der Bausumme. DIES ist der im Excel fehlende Bezugsrahmen.
  expectedOverrunLow: 0.10,
  expectedOverrunHigh: 0.25,
  // Anteil der Überschreitung, der durch Lean vermeidbar ist.
  // Quelle: PwC 2022 (Kostenüberschreitungen −15–30 %).
  overrunReductionLow: 0.15,
  overrunReductionHigh: 0.30,
};

// Dimensionen (Reihenfolge fest). 'term' treibt Zuverlässigkeit, 'kost' die €-Spanne.
export const DIMENSIONS = [
  { key: 'term', label: 'Termintreue' },
  { key: 'kost', label: 'Kostentreue' },
  { key: 'nach', label: 'Nachtragsred.' },
  { key: 'qual', label: 'Planungsqualität' },
  { key: 'konf', label: 'Konfliktred.' },
];

// Maßnahmen: von/bis je Dimension, Gewicht (gew), Impl.-Kosten [einmalig, laufend]
// als Anteil der Bausumme. Werte 1:1 aus Excel-Blatt übernommen.
export const MEASURES_BAU = [
  { id: 'b1',  kat: 'Planungsmethodik', name: 'Last Planner System (LPS)', steuerung: true,
    state: 'Ja', gew: 0.9, term: [.15,.30], kost: [.05,.12], nach: [.10,.20], qual: [.10,.20], konf: [.08,.15], impl: [.001,.0025], quelle: 'Fernández-Solís 2015 (TAMU); Cheng & Johnson 2016' },
  { id: 'b2',  kat: 'Planungsmethodik', name: 'Taktplanung / Takt-Steuerung', steuerung: true,
    state: 'Teilweise', gew: 0.7, term: [.10,.25], kost: [.05,.15], nach: [.05,.12], qual: [.08,.18], konf: [.05,.10], impl: [.0008,.002], quelle: 'KIT Gehbauer 2009; Dlouhy et al. IGLC 2016' },
  { id: 'b3',  kat: 'Planungsmethodik', name: 'Big Room / Co-Location', steuerung: true,
    state: 'Teilweise', gew: 0.6, term: [.08,.18], kost: [.03,.10], nach: [.05,.15], qual: [.05,.15], konf: [.10,.20], impl: [.0005,.003], quelle: 'Cheng & Johnson 2016; IPA-Zentrum 2022' },
  { id: 'b4',  kat: 'Vergütung & Anreize', name: 'Bonus/Malus-Klausel (Termin)', steuerung: false,
    state: 'Teilweise', gew: 0.7, term: [.10,.20], kost: [.03,.08], nach: [.03,.08], qual: [.02,.06], konf: [.02,.05], impl: [.0003,.0005], quelle: 'RiskConsult 2022 (A-Nord); PwC 2022' },
  { id: 'b5',  kat: 'Vergütung & Anreize', name: 'Bonus/Malus (Kosten/Qualität)', steuerung: false,
    state: 'Nein', gew: 0.7, term: [.05,.12], kost: [.08,.18], nach: [.05,.12], qual: [.05,.15], konf: [.03,.08], impl: [.0004,.0006], quelle: 'El Asmar et al. 2013 (JCEM); IPA-Zentrum 2022' },
  { id: 'b6',  kat: 'Vergütung & Anreize', name: 'GMP-Vertrag (Guaranteed Max. Price)', steuerung: false,
    state: 'Nein', gew: 0.6, term: [.05,.15], kost: [.10,.20], nach: [.10,.20], qual: [.03,.10], konf: [.05,.12], impl: [.0008,.001], quelle: 'Baumensch.de 2024; Darrington 2011' },
  { id: 'b7',  kat: 'Frühe Integration', name: 'Early Contractor Involvement (ECI)', steuerung: false,
    state: 'Nein', gew: 0.8, term: [.08,.18], kost: [.05,.15], nach: [.10,.22], qual: [.10,.20], konf: [.08,.18], impl: [.001,.0015], quelle: 'RiskConsult 2022; Kapellmann 2023' },
  { id: 'b8',  kat: 'Frühe Integration', name: 'Target Value Design (TVD)', steuerung: false,
    state: 'Nein', gew: 0.8, term: [.05,.12], kost: [.10,.25], nach: [.08,.18], qual: [.08,.18], konf: [.05,.12], impl: [.0012,.0008], quelle: 'Ballard 2009; El Asmar 2013' },
  { id: 'b9',  kat: 'Lean-Vertragszusätze', name: 'ALCA/LC-BVB (VDI 2553 konform)', steuerung: true,
    state: 'Ja', gew: 0.8, term: [.08,.20], kost: [.04,.12], nach: [.08,.18], qual: [.06,.15], konf: [.06,.14], impl: [.0005,.001], quelle: 'LUTZ|ABEL / LC-Akademie 2020; VDI 2553' },
  { id: 'b10', kat: 'Lean-Vertragszusätze', name: 'PPC-Messung als Vertragspflicht', steuerung: true,
    state: 'Ja', gew: 0.6, term: [.10,.20], kost: [.02,.08], nach: [.03,.08], qual: [.05,.12], konf: [.03,.08], impl: [.0002,.0008], quelle: 'LCI LPS Handbook; Viana et al. IGLC 2010' },
  { id: 'b11', kat: 'Kollaboration & Streit', name: 'Interne Konfliktlösung (Eskalation)', steuerung: false,
    state: 'Ja', gew: 0.7, term: [.03,.08], kost: [.02,.06], nach: [.05,.12], qual: [.03,.08], konf: [.20,.40], impl: [.0003,.0003], quelle: 'IPA-Zentrum 2024; Kapellmann 2023' },
  { id: 'b12', kat: 'Kollaboration & Streit', name: 'No-Blame-Kultur / Partnering', steuerung: false,
    state: 'Ja', gew: 0.6, term: [.03,.10], kost: [.02,.08], nach: [.05,.15], qual: [.05,.12], konf: [.15,.30], impl: [.0004,.0005], quelle: 'BG BAU 2020 (Rodde); DAB 03.2023' },
  { id: 'b13', kat: 'BIM & Digitalisierung', name: 'BIM-Pflicht (AIA/BAP als Anlage)', steuerung: false,
    state: 'Teilweise', gew: 0.7, term: [.05,.15], kost: [.03,.10], nach: [.08,.18], qual: [.10,.25], konf: [.05,.12], impl: [.0015,.002], quelle: 'LUTZ|ABEL 2020; BBR; Springer 2025' },
  { id: 'b14', kat: 'IPA-Vollmodell', name: 'IPA-Mehrparteienvertrag (vollständig)', steuerung: true,
    state: 'Nein', gew: 1.0, term: [.35,.60], kost: [.15,.30], nach: [.30,.55], qual: [.20,.40], konf: [.30,.60], impl: [.004,.008], quelle: 'IPA-Leitfaden 2020 (GLCI); El Asmar 2013' },
];

export const MEASURES_PLANER = [
  { id: 'p1',  kat: 'Leistungsbild', name: 'Zielorientierte Leistungsvereinbarung', steuerung: false,
    state: 'Ja', gew: 0.8, term: [.05,.15], kost: [.05,.12], nach: [.08,.18], qual: [.08,.18], konf: [.05,.12], impl: [.0004,.0003], quelle: '§ 650p BGB (2018); DAB 03.2023' },
  { id: 'p2',  kat: 'Leistungsbild', name: 'Stufenvertrag mit ECI-Option', steuerung: false,
    state: 'Ja', gew: 0.7, term: [.05,.12], kost: [.05,.12], nach: [.05,.14], qual: [.05,.14], konf: [.03,.08], impl: [.0005,.0004], quelle: 'VgV § 14; Kapellmann; BAK 2021' },
  { id: 'p3',  kat: 'Leistungsbild', name: 'Lean als Besondere Leistung (ALCA)', steuerung: true,
    state: 'Ja', gew: 0.8, term: [.08,.18], kost: [.03,.10], nach: [.06,.14], qual: [.06,.15], konf: [.05,.12], impl: [.0005,.0012], quelle: 'LUTZ|ABEL / LC-Akademie 2020; VDI 2553' },
  { id: 'p4',  kat: 'Honorar & Anreize', name: 'Erfolgsbeteiligung Kostenunterschr.', steuerung: false,
    state: 'Nein', gew: 0.7, term: [.03,.08], kost: [.08,.18], nach: [.05,.12], qual: [.05,.12], konf: [.03,.08], impl: [.0004,.0005], quelle: '§ 650p BGB; Ballard TVD 2009' },
  { id: 'p5',  kat: 'Honorar & Anreize', name: 'IPA-Vergütung (Selbstkosten+Overhead)', steuerung: false,
    state: 'Nein', gew: 1.0, term: [.08,.18], kost: [.10,.22], nach: [.15,.30], qual: [.10,.22], konf: [.10,.22], impl: [.002,.003], quelle: 'DAB 05.2023; IPA-Zentrum 2022' },
  { id: 'p6',  kat: 'Koordination', name: 'BIM-Koordinationspflicht (AIA/BAP)', steuerung: false,
    state: 'Teilweise', gew: 0.8, term: [.05,.12], kost: [.03,.08], nach: [.08,.18], qual: [.12,.25], konf: [.05,.12], impl: [.0012,.0018], quelle: 'LUTZ|ABEL 2020; Springer 2025; BBR' },
  { id: 'p7',  kat: 'Koordination', name: 'Interdisziplinäre Pull-Planning-Teilnahme', steuerung: true,
    state: 'Ja', gew: 0.7, term: [.08,.18], kost: [.03,.08], nach: [.08,.16], qual: [.08,.18], konf: [.05,.12], impl: [.0003,.0012], quelle: 'LCI LPS for Design; LUTZ|ABEL 2020' },
  { id: 'p8',  kat: 'Koordination', name: 'Big Room-Pflicht (Planungsgewerke)', steuerung: true,
    state: 'Teilweise', gew: 0.6, term: [.05,.15], kost: [.03,.08], nach: [.05,.12], qual: [.08,.18], konf: [.08,.18], impl: [.0005,.0025], quelle: 'IPA-Zentrum 2022; DAB 03.2023' },
  { id: 'p9',  kat: 'Vergaberecht (VgV)', name: 'Lean-Kompetenz als Zuschlagskriterium', steuerung: false,
    state: 'Ja', gew: 0.6, term: [.05,.12], kost: [.03,.08], nach: [.05,.12], qual: [.05,.14], konf: [.03,.08], impl: [.0004,.0002], quelle: 'BAK 2021; VgV § 127 GWB' },
  { id: 'p10', kat: 'Vergaberecht (VgV)', name: 'Gemeinsame Planervergabe', steuerung: false,
    state: 'Teilweise', gew: 0.5, term: [.05,.12], kost: [.02,.08], nach: [.05,.14], qual: [.05,.14], konf: [.05,.12], impl: [.0006,.0003], quelle: 'BAK 2023; § 97 Abs. 4 GWB' },
  { id: 'p11', kat: 'IPA-Vollmodell (Planer)', name: 'IPA-Mehrparteienvertrag inkl. Planer', steuerung: true,
    state: 'Nein', gew: 1.0, term: [.30,.55], kost: [.12,.28], nach: [.25,.50], qual: [.18,.38], konf: [.25,.55], impl: [.0035,.007], quelle: 'Cheng & Johnson 2016; El Asmar 2013' },
];

/* =========================================================================
   2) MODELL — reine Funktionen (korrigiert; geben Spannen low/high zurück)
   ========================================================================= */

export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Aktivierter Wertebereich einer Maßnahme/Dimension.
 *  Ja        → [von, bis]
 *  Teilweise → [von/2, bis/2]   (halbe Wirkung; im Excel (von+bis)/4 = halber Mittelwert)
 *  Nein      → [0, 0]
 */
export function activatedRange(state, [von, bis]) {
  if (state === 'Ja') return [von, bis];
  if (state === 'Teilweise') return [von / 2, bis / 2];
  return [0, 0];
}

/** Gewichteter Schnitt einer Dimension über AKTIVE Maßnahmen (Excel-Logik, beibehalten). */
export function weightedDimension(measures, dimKey) {
  let wsumLo = 0, wsumHi = 0, wtot = 0;
  for (const m of measures) {
    if (m.state === 'Nein') continue;
    const [lo, hi] = activatedRange(m.state, m[dimKey]);
    wsumLo += lo * m.gew;
    wsumHi += hi * m.gew;
    wtot += m.gew;
  }
  if (wtot === 0) return { low: 0, high: 0 };
  return { low: wsumLo / wtot, high: wsumHi / wtot };
}

/** Lean-Intensität 0..1: gewichteter Aktivierungsgrad über ALLE Maßnahmen. */
export function leanIntensity(measures) {
  let active = 0, total = 0;
  for (const m of measures) {
    const f = m.state === 'Ja' ? 1 : m.state === 'Teilweise' ? 0.5 : 0;
    active += m.gew * f;
    total += m.gew;
  }
  return total === 0 ? 0 : active / total;
}

/** Implementierungskosten (€): Summe aktiver Maßnahmen. Teilweise → 60 %. (Excel-Logik) */
export function implementationCost(measures, bausumme) {
  let sum = 0;
  for (const m of measures) {
    const factor = m.state === 'Ja' ? 1 : m.state === 'Teilweise' ? 0.6 : 0;
    sum += (m.impl[0] + m.impl[1]) * bausumme * factor;
  }
  return sum;
}

/** Steuerungs-Intensität 0..1: Aktivierungsgrad NUR der schedule-relevanten Maßnahmen (steuerung). */
export function steeringIntensity(measures) {
  let active = 0, total = 0;
  for (const m of measures) {
    if (!m.steuerung) continue;
    const f = m.state === 'Ja' ? 1 : m.state === 'Teilweise' ? 0.5 : 0;
    active += m.gew * f;
    total += m.gew;
  }
  return total === 0 ? 0 : active / total;
}

/**
 * Terminzuverlässigkeit als Spanne.
 * @param adoption 0..1 — geplanter Grad der Lean-Steuerung (öffentl.: Slider; Profi: steeringIntensity).
 *   Baseline (klassisch) ≈ 52 %; mit voller Lean-Steuerung erreichbar ≈ 82–88 %.
 */
export function computeReliability(adoption, a = ASSUMPTIONS) {
  return {
    current: a.reliabilityBaseline,
    achievableLow: lerp(a.reliabilityBaseline, a.reliabilityAchievableLow, adoption),
    achievableHigh: lerp(a.reliabilityBaseline, a.reliabilityAchievableHigh, adoption),
  };
}

/**
 * Einsparspanne (€) — KORRIGIERT.
 * Einsparung = Bausumme × erwartete Überschreitung × vermeidbarer Anteil DER ÜBERSCHREITUNG × adoption.
 * (Der Excel-Fehler war: Kostentreue-% × Bausumme — ohne Überschreitungs-Bezug.)
 * @param adoption 0..1 — Grad der Lean-Steuerung (skaliert den vermeidbaren Anteil).
 */
export function computeSavings(bausumme, adoption, a = ASSUMPTIONS) {
  const low = bausumme * a.expectedOverrunLow * (a.overrunReductionLow * adoption);
  const high = bausumme * a.expectedOverrunHigh * (a.overrunReductionHigh * adoption);
  return { low, high };
}

/** Öffentliches Modell: Bausumme + 1 Regler (leanGrad 0..1 = geplanter Grad der Lean-Steuerung). */
export function computePublic({ bausumme, leanGrad }, a = ASSUMPTIONS) {
  return {
    reliability: computeReliability(leanGrad, a),
    savings: computeSavings(bausumme, leanGrad, a),
  };
}

/** Profi-Modell: aus Maßnahmen-Toggles. Adoption (Reliability & €) = steeringIntensity. */
export function computeProfi({ bausumme, measures }, a = ASSUMPTIONS) {
  const adoption = steeringIntensity(measures);
  const reliability = computeReliability(adoption, a);
  const savings = computeSavings(bausumme, adoption, a);
  const implCost = implementationCost(measures, bausumme);
  const dimensions = DIMENSIONS.map((d) => ({ ...d, ...weightedDimension(measures, d.key) }));
  return {
    adoption, intensity: leanIntensity(measures), reliability, savings, implCost, dimensions,
    net: { low: savings.low - implCost, high: savings.high - implCost },
  };
}

/* =========================================================================
   3) GAUGE — handgebauter SVG-Halbkreis-Tacho (mit Band für Spannen)
   ========================================================================= */

function pointOnArc(cx, cy, r, frac) {
  const ang = (180 - 180 * clamp(frac, 0, 1)) * Math.PI / 180;
  return [cx + r * Math.cos(ang), cy - r * Math.sin(ang)];
}
function arcPath(cx, cy, r, fracA, fracB) {
  const [x1, y1] = pointOnArc(cx, cy, r, fracA);
  const [x2, y2] = pointOnArc(cx, cy, r, fracB);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** @returns SVG-String. value/band in [min,max]. */
function gaugeSVG({ min, max, bandLow, bandHigh, marker, big, sub, minLabel, maxLabel }) {
  const cx = 110, cy = 110, r = 90;
  const f = (v) => (v - min) / (max - min);
  const track = arcPath(cx, cy, r, 0, 1);
  const band = arcPath(cx, cy, r, f(bandLow), f(bandHigh));
  let markerEl = '';
  if (marker != null) {
    const [mx, my] = pointOnArc(cx, cy, r, f(marker));
    const [ix, iy] = pointOnArc(cx, cy, r - 16, f(marker));
    markerEl = `<line x1="${ix.toFixed(1)}" y1="${iy.toFixed(1)}" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" class="mns-g-marker"/>`;
  }
  return `
  <svg viewBox="0 0 220 150" class="mns-gauge" role="img">
    <path d="${track}" class="mns-g-track"/>
    <path d="${band}" class="mns-g-band"/>
    ${markerEl}
    <text x="${cx}" y="100" class="mns-g-big" text-anchor="middle">${big}</text>
    <text x="${cx}" y="122" class="mns-g-sub" text-anchor="middle">${sub}</text>
    <text x="18" y="138" class="mns-g-tick">${minLabel}</text>
    <text x="202" y="138" class="mns-g-tick" text-anchor="end">${maxLabel}</text>
  </svg>`;
}

/* =========================================================================
   4) WEB COMPONENT
   ========================================================================= */

const fmtEuro = (n) => Math.round(n).toLocaleString('de-DE');
const fmtMio = (n) => (n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 });
const fmtPct = (x) => Math.round(x * 100);
// Spanne; Einheit nach Größenordnung, vorzeichensicher (für ggf. negatives Netto).
const rangeEuro = (lo, hi) => {
  const mio = Math.max(Math.abs(lo), Math.abs(hi)) >= 1e6;
  const f = mio ? (x) => (x / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 }) : (x) => fmtEuro(x);
  return `${f(lo)}–${f(hi)}${mio ? ' Mio €' : ' €'}`;
};

const METHODIK = `
  <p><strong>Wie wird gerechnet?</strong> Die Werte sind <em>indikativ</em> und als
  Orientierungsspanne zu verstehen — keine Zusicherung.</p>
  <ul>
    <li><strong>Terminzuverlässigkeit:</strong> Branchen-Baseline ≈ 52 % (PPC), mit
      konsequenter Lean-Steuerung (Last Planner System) erreichbar ≈ 82–88 %.
      Quelle: Ballard/Tommelein 2016 (P2SL Berkeley).</li>
    <li><strong>Einsparspanne (€):</strong> Bausumme × erwartete Kostenüberschreitung
      (≈ 10–25 % bei Großprojekten) × vermeidbarer Anteil (≈ 15–30 %, PwC 2022).
      Es wird ausdrücklich nur ein Anteil <em>der Überschreitung</em> betrachtet,
      nicht der Gesamtsumme.</li>
    <li>100 % im Browser gerechnet — es werden <strong>keine Daten übertragen</strong>.</li>
  </ul>`;

if (typeof customElements !== 'undefined' && typeof HTMLElement !== 'undefined') {
  class MnsLeanRechner extends HTMLElement {
    connectedCallback() {
      this.bausumme = Number(this.getAttribute('bausumme')) || 120_000_000;
      this.leanGrad = 0.6;
      this.mode = 'public';
      this.tab = 'bau';
      this.measures = {
        bau: MEASURES_BAU.map((m) => ({ ...m })),
        planer: MEASURES_PLANER.map((m) => ({ ...m })),
      };
      this.attachShadow({ mode: 'open' });
      this.render();
    }

    styles() {
      return `
      /* Design-Tokens von meilestn.de (Divi/Rubik). Alle via Host überschreibbar. */
      :host{
        --mns-fg:#1a1a1a; --mns-muted:#666; --mns-bg:#fff; --mns-line:#e2e2e2;
        --mns-accent:#ff6948; --mns-accent-strong:#ff603d; --mns-band:#ff6948;
        --mns-track:#e5e5e5; --mns-soft:#f3f3f3; --mns-radius:10px;
        --mns-font:'Rubik',Helvetica,Arial,Lucida,sans-serif;
        --mns-font-display:var(--mns-font);
        display:block; color:var(--mns-fg); font-family:var(--mns-font);
      }
      /* meilestn.de ist hell — Widget folgt dem Host (kein Auto-Dark). */
      *{box-sizing:border-box}
      .wrap{background:var(--mns-bg);border:1px solid var(--mns-line);border-radius:var(--mns-radius);
        padding:clamp(18px,4vw,32px);max-width:760px;margin:0 auto}
      h2{font-size:1.15rem;font-weight:700;letter-spacing:.3px;margin:0 0 2px}
      .lead{color:var(--mns-muted);font-size:.9rem;margin:0 0 22px}
      .inputs{display:flex;flex-wrap:wrap;gap:20px 28px;margin-bottom:8px}
      .field{flex:1 1 240px;min-width:200px}
      label{display:block;font-size:.8rem;color:var(--mns-muted);margin-bottom:6px}
      input[type=text]{width:100%;font:inherit;font-size:1.05rem;padding:10px 12px;
        border:1px solid var(--mns-line);border-radius:9px;background:var(--mns-soft);color:var(--mns-fg)}
      input[type=range]{width:100%;accent-color:var(--mns-band)}
      .rangerow{display:flex;justify-content:space-between;font-size:.72rem;color:var(--mns-muted);margin-top:4px}
      .gauges{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:26px 0 6px}
      @media(max-width:520px){.gauges{grid-template-columns:1fr}}
      .card{background:var(--mns-soft);border:1px solid var(--mns-line);border-radius:12px;padding:14px 10px;text-align:center}
      .card h3{margin:0;font-size:.82rem;font-weight:600;color:var(--mns-muted)}
      .mns-gauge{width:100%;height:auto;max-width:240px}
      .mns-g-track{fill:none;stroke:var(--mns-track);stroke-width:14;stroke-linecap:round}
      .mns-g-band{fill:none;stroke:var(--mns-band);stroke-width:14;stroke-linecap:round}
      .mns-g-marker{stroke:var(--mns-fg);stroke-width:2;opacity:.55}
      .mns-g-big{fill:var(--mns-fg);font-size:20px;font-weight:700;font-family:var(--mns-font-display)}
      .mns-g-sub{fill:var(--mns-muted);font-size:9.5px}
      .mns-g-tick{fill:var(--mns-muted);font-size:9px}
      .toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:18px;flex-wrap:wrap}
      .modes button{font:inherit;font-size:.8rem;padding:7px 12px;border:1px solid var(--mns-line);
        background:var(--mns-bg);color:var(--mns-fg);border-radius:8px;cursor:pointer}
      .modes button[aria-pressed=true]{background:var(--mns-accent);color:var(--mns-bg);border-color:var(--mns-accent)}
      details{margin-top:14px;font-size:.85rem;color:var(--mns-muted)}
      summary{cursor:pointer;color:var(--mns-fg);font-size:.82rem}
      details ul{margin:8px 0 0;padding-left:18px}
      details a{color:inherit}
      .profi{margin-top:18px;border-top:1px solid var(--mns-line);padding-top:16px}
      .tabs{display:flex;gap:8px;margin-bottom:10px}
      .tabs button{font:inherit;font-size:.78rem;padding:6px 11px;border:1px solid var(--mns-line);
        background:var(--mns-bg);color:var(--mns-fg);border-radius:8px;cursor:pointer}
      .tabs button[aria-pressed=true]{background:var(--mns-accent);color:var(--mns-bg);border-color:var(--mns-accent)}
      table{width:100%;border-collapse:collapse;font-size:.8rem}
      td,th{text-align:left;padding:7px 6px;border-bottom:1px solid var(--mns-line);vertical-align:top}
      th{color:var(--mns-muted);font-weight:500;font-size:.72rem}
      td select{font:inherit;font-size:.78rem;padding:4px 6px;border:1px solid var(--mns-line);
        border-radius:6px;background:var(--mns-bg);color:var(--mns-fg)}
      .net{display:flex;flex-wrap:wrap;gap:10px 26px;margin-top:14px;font-size:.85rem}
      .net b{font-weight:600}
      .dimbars{margin-top:14px;display:grid;gap:6px}
      .dimbar{display:grid;grid-template-columns:120px 1fr 90px;align-items:center;gap:8px;font-size:.74rem}
      .bar{height:8px;background:var(--mns-track);border-radius:5px;overflow:hidden}
      .bar i{display:block;height:100%;background:var(--mns-band)}
      .foot{margin-top:16px;font-size:.7rem;color:var(--mns-muted)}`;
    }

    render() {
      const r = computePublic({ bausumme: this.bausumme, leanGrad: this.leanGrad });
      const rel = r.reliability, sav = r.savings;
      // Hero-Werte (öffentlich vs. Profi für Gauges)
      let profi = null;
      if (this.mode === 'profi') {
        const all = [...this.measures.bau, ...this.measures.planer];
        profi = computeProfi({ bausumme: this.bausumme, measures: all });
      }
      const relG = profi ? profi.reliability : rel;
      const savG = profi ? profi.savings : sav;

      const relGauge = gaugeSVG({
        min: 0, max: 100,
        bandLow: fmtPct(relG.current), bandHigh: fmtPct(relG.achievableHigh),
        marker: fmtPct(relG.current),
        big: `${fmtPct(relG.achievableLow)}–${fmtPct(relG.achievableHigh)}%`,
        sub: `klassisch ≈ ${fmtPct(relG.current)} %`, minLabel: '0 %', maxLabel: '100 %',
      });
      const savMax = Math.max(savG.high * 1.25, this.bausumme * 0.04);
      const savGauge = gaugeSVG({
        min: 0, max: savMax / 1e6,
        bandLow: savG.low / 1e6, bandHigh: savG.high / 1e6,
        big: rangeEuro(savG.low, savG.high),
        sub: 'indikativ · vermiedene Mehrkosten', minLabel: '0', maxLabel: `${fmtMio(savMax)} Mio €`,
      });

      this.shadowRoot.innerHTML = `<style>${this.styles()}</style>
      <div class="wrap">
        <h2>Lean-Einsparpotenzial Ihres Bauprojekts</h2>
        <p class="lead">Termine, die halten — und das Geld, das darin steckt. Indikative Schätzung, ohne Datenerfassung.</p>
        <div class="inputs">
          <div class="field">
            <label for="bs">Bausumme (netto, KG 200–700)</label>
            <input id="bs" type="text" inputmode="numeric" value="${fmtEuro(this.bausumme)} €">
          </div>
          ${this.mode === 'public' ? `
          <div class="field">
            <label for="rg">Geplanter Grad der Lean-Steuerung</label>
            <input id="rg" type="range" min="0" max="100" value="${Math.round(this.leanGrad * 100)}">
            <div class="rangerow"><span>klassisch</span><span>konsequent</span></div>
          </div>` : ''}
        </div>

        <div class="gauges">
          <div class="card"><h3>Terminzuverlässigkeit</h3>${relGauge}</div>
          <div class="card"><h3>Einsparpotenzial</h3>${savGauge}</div>
        </div>

        <div class="toolbar">
          <div class="modes">
            <button data-mode="public" aria-pressed="${this.mode === 'public'}">Einfach</button>
            <button data-mode="profi" aria-pressed="${this.mode === 'profi'}">Profi-Modus</button>
          </div>
          <span style="font-size:.72rem;color:var(--mns-muted)">Meile&nbsp;+&nbsp;Stein · Bausteuerung</span>
        </div>

        ${profi ? this.renderProfi(profi) : ''}

        <details>
          <summary>Methodik &amp; Quellen</summary>
          ${METHODIK}
        </details>
        <p class="foot">Werte als Orientierungsrahmen (Praxis-/Literaturwerte, kein RCT-Nachweis). Quellen u.&nbsp;a.: P2SL/Berkeley 2016, PwC 2022, KIT Gehbauer 2009, El&nbsp;Asmar 2013, LUTZ|ABEL 2020.</p>
      </div>`;

      this.bind();
    }

    renderProfi(p) {
      const list = this.measures[this.tab];
      const rows = list.map((m) => `
        <tr>
          <td>${m.name}<br><span style="color:var(--mns-muted);font-size:.68rem">${m.kat}</span></td>
          <td>
            <select data-id="${m.id}" data-grp="${this.tab}">
              ${['Ja', 'Teilweise', 'Nein'].map((s) => `<option ${s === m.state ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </td>
        </tr>`).join('');
      const bars = p.dimensions.map((d) => {
        const w = clamp(d.high / 0.35, 0, 1) * 100;
        return `<div class="dimbar"><span>${d.label}</span>
          <span class="bar"><i style="width:${w.toFixed(0)}%"></i></span>
          <span style="text-align:right;color:var(--mns-muted)">${fmtPct(d.low)}–${fmtPct(d.high)} %</span></div>`;
      }).join('');
      return `<div class="profi">
        <div class="tabs">
          <button data-tab="bau" aria-pressed="${this.tab === 'bau'}">Bauvertrag (VOB)</button>
          <button data-tab="planer" aria-pressed="${this.tab === 'planer'}">Planervertrag (VgV/HOAI)</button>
        </div>
        <table><thead><tr><th>Maßnahme</th><th>Aktivierung</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="dimbars">${bars}</div>
        <div class="net">
          <span>Einsparspanne: <b>${rangeEuro(p.savings.low, p.savings.high)}</b></span>
          <span>Implementierungskosten: <b>${fmtEuro(p.implCost)} €</b></span>
          <span>Netto (indikativ): <b>${rangeEuro(p.net.low, p.net.high)}</b></span>
        </div>
        <p class="foot">Netto bezieht nur die Kosteneinsparung ein; der größte Hebel — Zeit/Terminzuverlässigkeit — ist hier bewusst nicht monetarisiert. Bei geringer Maßnahmentiefe können die Implementierungskosten überwiegen.</p>
      </div>`;
    }

    bind() {
      const root = this.shadowRoot;
      const bs = root.getElementById('bs');
      if (bs) {
        bs.addEventListener('input', () => {
          const n = Number(bs.value.replace(/[^\d]/g, ''));
          if (n > 0) this.bausumme = n;
        });
        bs.addEventListener('blur', () => this.render());
        bs.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.render(); });
      }
      const rg = root.getElementById('rg');
      if (rg) rg.addEventListener('input', () => { this.leanGrad = Number(rg.value) / 100; this.render(); });
      root.querySelectorAll('.modes button').forEach((b) =>
        b.addEventListener('click', () => { this.mode = b.dataset.mode; this.render(); }));
      root.querySelectorAll('.tabs button').forEach((b) =>
        b.addEventListener('click', () => { this.tab = b.dataset.tab; this.render(); }));
      root.querySelectorAll('select[data-id]').forEach((sel) =>
        sel.addEventListener('change', () => {
          const m = this.measures[sel.dataset.grp].find((x) => x.id === sel.dataset.id);
          if (m) m.state = sel.value;
          this.render();
        }));
    }
  }
  if (!customElements.get('mns-lean-rechner')) customElements.define('mns-lean-rechner', MnsLeanRechner);
}
