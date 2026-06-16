# MnS — Lean-Einsparrechner

Standalone-Web-Widget für **Meile + Stein** ([meilestn.de](https://meilestn.de)): macht das
Lean-Einsparpotenzial von Bauprojekten sichtbar — datensparsam, ohne Build-Schritt, ohne Datenerfassung.

## Einbinden

```html
<script type="module" src="mns-rechner.js"></script>
<mns-lean-rechner bausumme="120000000"></mns-lean-rechner>
```

Stack-agnostisch (Custom Element, keine Runtime-Dependencies), 100 % client-seitig — kein
Netzwerk-Call, kein Tracking (DSGVO-sauber). Theming über CSS Custom Properties (`--mns-accent`,
`--mns-band`, …) zur Anpassung an die Host-Designtokens.

## Funktionen

- **Einfach:** Bausumme + 1 Regler → 2 Tachos: Terminzuverlässigkeit (≈ 52 % → 82–88 %) und
  indikative Einsparspanne (€).
- **Profi:** Lean-Maßnahmen je Vertrag (VOB / VgV-HOAI) per Ja/Teilweise/Nein, mit
  Dimensions-Aufschlüsselung, Implementierungskosten und Netto-Spanne.
- Werte als **Spannen** (indikativ) statt Scheinpräzision; „Methodik & Quellen" eingebaut.

## Dateien

| Datei | Zweck |
|---|---|
| `mns-rechner.js` | Das Widget (Daten · Modell · SVG-Gauge · Web Component) |
| `KORREKTUR-LOG.md` | Nachvollziehbare Korrekturen ggü. dem Excel-Prototyp |
| `methodik.md` | Inhalt für das Website-Panel „Methodik & Quellen" |
| `mns-rechner.test.js` | Unit-Tests des Modells — `node mns-rechner.test.js` |
| `index.html`, `demo/` | Einbettungs-Demo |
| `Assets/` | Excel-Prototyp (Quelle) |

## Vorschau lokal

```bash
python3 -m http.server 8765 --directory .
# → http://localhost:8765
```

## Status

MVP. Offen: Designtokens von meilestn.de einsetzen; Annahme „erwartete Überschreitung (10–25 %)"
fachlich bestätigen; finaler Embed-Mechanismus auf der Live-Seite.
