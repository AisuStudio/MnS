/* Unit-Tests für das korrigierte Rechenmodell.  Ausführen:  node mns-rechner.test.js
 * Importiert nur reine Funktionen — die Web-Component wird unter Node nicht definiert. */
import assert from 'node:assert/strict';
import {
  ASSUMPTIONS, MEASURES_BAU, MEASURES_PLANER,
  activatedRange, weightedDimension, leanIntensity, steeringIntensity, implementationCost,
  computeReliability, computeSavings, computePublic, computeProfi,
} from './mns-rechner.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('  ✓', name); };

console.log('Modell-Tests:');

test('activatedRange: Ja/Teilweise/Nein', () => {
  assert.deepEqual(activatedRange('Ja', [0.1, 0.3]), [0.1, 0.3]);
  assert.deepEqual(activatedRange('Teilweise', [0.1, 0.3]), [0.05, 0.15]);
  assert.deepEqual(activatedRange('Nein', [0.1, 0.3]), [0, 0]);
});

test('weightedDimension ignoriert "Nein" und ist eine Spanne low<=high', () => {
  const ms = [
    { state: 'Ja', gew: 1, kost: [0.1, 0.2] },
    { state: 'Nein', gew: 1, kost: [0.9, 0.9] },
  ];
  const r = weightedDimension(ms, 'kost');
  assert.equal(r.low, 0.1);
  assert.equal(r.high, 0.2);
});

test('leanIntensity in [0,1], 1 wenn alle "Ja"', () => {
  const allYes = MEASURES_BAU.map((m) => ({ ...m, state: 'Ja' }));
  assert.equal(leanIntensity(allYes), 1);
  const allNo = MEASURES_BAU.map((m) => ({ ...m, state: 'Nein' }));
  assert.equal(leanIntensity(allNo), 0);
});

test('implementationCost: Teilweise = 60% von Ja', () => {
  const one = [{ state: 'Ja', impl: [0.001, 0.001] }];
  const half = [{ state: 'Teilweise', impl: [0.001, 0.001] }];
  const full = implementationCost(one, 1e6);
  const part = implementationCost(half, 1e6);
  assert.ok(Math.abs(part - full * 0.6) < 1e-6);
});

test('computeReliability: Baseline 52%, steigt mit Adoption', () => {
  const none = computeReliability(0);
  const full = computeReliability(1);
  assert.ok(Math.abs(none.current - 0.52) < 1e-9);
  // Ohne Lean: erreichbar = Baseline (kein Effekt).
  assert.ok(Math.abs(none.achievableHigh - 0.52) < 1e-9);
  // Volle Lean-Steuerung: erreichbar = Annahmewerte 82–88 %.
  assert.ok(Math.abs(full.achievableLow - ASSUMPTIONS.reliabilityAchievableLow) < 1e-9);
  assert.ok(Math.abs(full.achievableHigh - ASSUMPTIONS.reliabilityAchievableHigh) < 1e-9);
  assert.equal(full.current, 0.52); // Marker bleibt Baseline
});

test('computeSavings: KORRIGIERT — Anteil DER ÜBERSCHREITUNG, nicht der Bausumme', () => {
  const s = computeSavings(120e6, 1); // volle Lean-Steuerung
  // low = 120M * 0.10 * (0.15*1) = 1.8M ; high = 120M * 0.25 * (0.30*1) = 9.0M
  assert.ok(Math.abs(s.low - 1_800_000) < 1);
  assert.ok(Math.abs(s.high - 9_000_000) < 1);
  // Der alte Excel-Headline (6,39 Mio als EINZELwert) ist KEIN Punktergebnis mehr:
  assert.ok(s.low < 6_389_783 && s.high > 6_389_783, 'alte Zahl liegt INNERHALB der Spanne, ist aber kein Output');
  assert.equal(computeSavings(120e6, 0).high, 0); // ohne Lean keine Einsparung
});

test('computePublic: Einsparung & Zuverlässigkeit steigen mit Lean-Grad', () => {
  const keine = computePublic({ bausumme: 120e6, leanGrad: 0 });
  const voll = computePublic({ bausumme: 120e6, leanGrad: 1 });
  assert.ok(voll.savings.high > keine.savings.high);
  assert.equal(keine.savings.high, 0);
  assert.ok(voll.reliability.achievableHigh > keine.reliability.achievableHigh);
  assert.ok(voll.savings.low <= voll.savings.high);
});

test('computeProfi: 5 Dimensionen, Netto = Einsparung − Impl.-Kosten, Adoption in (0,1)', () => {
  const all = [...MEASURES_BAU, ...MEASURES_PLANER];
  const p = computeProfi({ bausumme: 120e6, measures: all });
  assert.equal(p.dimensions.length, 5);
  assert.ok(p.implCost > 0);
  assert.ok(Math.abs(p.net.high - (p.savings.high - p.implCost)) < 1e-6);
  assert.ok(p.adoption > 0 && p.adoption < 1);
  assert.ok(p.intensity > 0 && p.intensity < 1);
});

test('steeringIntensity: 1 wenn alle Steuerungs-Maßnahmen "Ja", 0 wenn "Nein"', () => {
  assert.equal(steeringIntensity(MEASURES_BAU.map((m) => ({ ...m, state: 'Ja' }))), 1);
  assert.equal(steeringIntensity(MEASURES_BAU.map((m) => ({ ...m, state: 'Nein' }))), 0);
});

console.log(`\n${passed} Tests bestanden.`);
