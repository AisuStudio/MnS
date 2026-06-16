# Korrektur-Log — Lean-Vertragsbewertungs-Tool

Nachvollziehbare Dokumentation aller Korrekturen am Excel-Prototyp
(`Assets/260617 Lean_Vertragsbewertung_Tool_v2_120Mio_ALCA.xlsx`) gegenüber dem
neuen, web-tauglichen Rechenmodell (`mns-rechner.js`). Jeder Eintrag: **Problem →
ALT (Wert/Formel) → NEU (Wert/Formel) → Begründung/Quelle**. Bausumme-Beispiel: 120 Mio €.

---

### K1 — €-Einsparung: Einheitenfehler (kritisch) 🔴

- **Ort:** Blatt `Gesamtbewertung`, Zellen `E10`, `G10`.
- **Problem:** Die „Kostentreue %" beschreibt laut Quellen die *Reduktion der
  Kostenüberschreitung*, **nicht** „Anteil der Bausumme gespart". Die Multiplikation
  mit der Bausumme mischt Einheiten und überhöht das Ergebnis um grob ~5× (es fehlt
  der Bezugsrahmen „erwartete Überschreitung").
- **ALT:**
  - `E10 = AVERAGE(D6:D7)` → `0,0532` (Ø Kostentreue-Potenzial)
  - `G10 = E10 * Bausumme` → **6.389.783 €** (Einzelwert, als „Kosteneinsparung")
- **NEU:** `Einsparung = Bausumme × erwartete_Überschreitung%[Band] × vermeidbarer_Anteil%[Band]`
  → Ausgabe als **Spanne** (z. B. **1,8 – 9,0 Mio €** bei Default-Annahmen), Label „indikativ".
  - Funktion: `computeSavings()` in `mns-rechner.js`.
- **Begründung/Quelle:** PwC 2022 (Kostenüberschreitungen −15–30 %); El Asmar 2013
  (Composite-Index PQR, **keine** €-Einsparung); die alte Punktzahl 6,39 Mio liegt nun
  *innerhalb* der Spanne, wird aber nicht mehr als Einzelwert behauptet.

### K2 — „Ø Gesamtpotenzial": Mittelung heterogener Einheiten 🟠

- **Ort:** Blatt `Gesamtbewertung`, `H6`, `H7`, `H8`.
- **Problem:** Mittelt Termintreue, Kostentreue, Nachtragsred., Planungsqualität und
  Konfliktred. — fünf verschiedene Einheiten — zu einer Zahl ohne ökonomische Bedeutung.
- **ALT:** `H6 = AVERAGE(C6:G6)` → `0,0856` („Ø Gesamtpotenzial 8,6 %").
- **NEU:** Kein Misch-Mittelwert mehr. Die fünf Dimensionen werden **getrennt** als
  Spannen ausgewiesen (Profi-Balken). Hero-Kennzahlen sind die zwei *interpretierbaren*
  Größen: Terminzuverlässigkeit (%) und Einsparspanne (€).
- **Begründung:** Dimensionen sind nicht additiv/mittelbar; getrennte Darstellung erhält die Aussagekraft.

### K3 — Überlappende Maßnahmen: Über-Attribution 🟠

- **Ort:** beide Bewertungsblätter (z. B. LPS, Taktplanung, PPC-Messung, ALCA, Big Room).
- **Problem:** Stark überlappende Maßnahmen (ALCA *bündelt* LPS; PPC ist Teil von LPS)
  werden unabhängig gewichtet gemittelt → Effekte werden mehrfach gezählt.
- **ALT:** gewichteter Schnitt über alle aktiven Maßnahmen, ohne Overlap-Behandlung.
- **NEU (MVP):** Der gewichtete **Schnitt** (statt Summe) wird beibehalten — er dämpft
  Doppelzählung bereits stark (kein >100 %-Effekt). Datenmodell enthält ein `steuerung`-Flag
  zur Gruppierung; ein expliziter Overlap-Cap ist als nächster Ausbau vorgemerkt.
- **Begründung:** Pragmatische, konservative Näherung für das MVP; sauber kennzeichnungsfähig.

### K4 — „Teilweise"-Heuristik & verschwundene Unsicherheit 🟡

- **Ort:** „Akt."-Spalten beider Blätter; Von/Bis-Spalten.
- **Problem:** (a) Nutzen bei „Teilweise" = ½ × „Ja", Impl.-Kosten aber = 0,6 × — inkonsistent
  und unbelegt. (b) Von/Bis kollabieren sofort auf den Mittelwert; die Unsicherheit (genau
  bei fehlendem RCT-Nachweis relevant) wird unsichtbar.
- **ALT:** `=IF(state="Ja",(Von+Bis)/2, IF("Teilweise",(Von+Bis)/4, 0))` → Einzelwert.
- **NEU:** Wirkung als **Band**: Ja → `[Von, Bis]`, Teilweise → `[Von/2, Bis/2]`. Das Band
  wird in den Gauges sichtbar dargestellt. Impl.-Kosten-Faktor 0,6 dokumentiert beibehalten.
  - Funktion: `activatedRange()`.
- **Begründung:** Spannen statt Scheinpräzision; macht die ehrliche Unsicherheit zum Feature.

### K5 — Terminzuverlässigkeit als eigener, belegter Anker 🟢 (Ergänzung)

- **Problem/Anlass:** Die belastbarste Kennzahl (PPC/Terminzuverlässigkeit) war im Excel
  nur eine von fünf gemittelten Dimensionen und nicht als Hero sichtbar.
- **NEU:** Eigene Hero-Gauge: Baseline ≈ 52 % → erreichbar ≈ 82–88 %, skaliert mit dem
  geplanten Grad der Lean-Steuerung (Slider bzw. Steuerungs-Maßnahmen im Profi-Modus).
  - Funktion: `computeReliability()`.
- **Begründung/Quelle:** Ballard/Tommelein 2016 (P2SL Berkeley): Baseline-PPC ~50 %,
  gute LPS-Teams 80–85 %. Am stärksten belegter Wert → bester öffentlicher Anker.

---

## Beibehalten (bewusst nicht geändert) 🟢

- **Aktivierungsmodell** Ja/Teilweise/Nein.
- **Implementierungskosten-Modell** (einmalig + laufend als % der Bausumme; 0,15–0,35 %
  laufend deckt sich mit LUTZ|ABEL 2020). `implementationCost()`.
- **Gewichteter Schnitt statt Summe** je Dimension (vermeidet die >100 %-Falle). `weightedDimension()`.
- **Quellennachweis & Transparenzhinweis** (kein RCT) — übernommen als „Methodik & Quellen".

## Offen / nächster Ausbau

- Default-Annahme „erwartete Überschreitung" (10–25 %) fachlich mit M&S final bestätigen.
- Expliziter Overlap-Cap zwischen gebündelten Maßnahmen (K3).
- Optional: Zeit→Geld-Brücke (Finanzierungs-/BGK-Ersparnis aus Bauzeitverkürzung).
