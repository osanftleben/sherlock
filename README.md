# Sherlock Holmes in Berlin

Detektivspiel im Browser (WebGL, Three.js). Berlin, November 1892: Holmes gilt seit den
Reichenbachfällen als tot und lebt als „Sigerson“ in einer Pension an der Oranienburger Straße.

Ziel ist eine frei begehbare Stadt mit mehreren Fällen. Bisher gibt es ein Viertel und den ersten Fall.

## Starten

```bash
npm install
```

```bash
npm run dev
```

Danach http://localhost:5173 öffnen.

Vor dem Einchecken den Code prüfen (ESLint: fehlende oder überflüssige Importe, Tippfehler in Namen):

```bash
npm run lint
```

## Steuerung

| Taste | Aktion |
| --- | --- |
| WASD oder Pfeiltasten | gehen |
| Maus | schauen (ohne Zeigersperre: Maustaste halten und ziehen) |
| Umschalt | laufen |
| E oder Klick | untersuchen, ansprechen, Tür öffnen |
| N oder Tab | Notizbuch: Hinweise verknüpfen, Schlüsse, Personen |
| M | Stadtplan |
| Esc | Pause |

Der Spielstand wird automatisch im Browser gespeichert, für jeden Fall getrennt.

## Aufbau

```
src/
  main.js            Spielablauf: Orte, Dialoge, Notizbuch, Lösung
  core/              Spielstand, Eingabe, synthetisierte Klänge
  engine/            Spielerfigur und Kollision, Ort (Location), Rendering
  world/
    berlin/          das Viertel um den Hackeschen Markt
      index.js       Straßenzüge, Eingänge, Anker, Stadtplan
      facades.js     Häuserzeilen: Fensterachsen, Hauskörper, Gehwege
      railway.js     Stadtbahn, Bahnhof Börse, Zug
      plaza.js       Platz: Bäume, Litfaßsäule, Urania-Säule, Achteck
      lamps.js, traffic.js, weather.js, river.js, horizon.js
    interiors/       Innenräume, ein Modul je Raum
      index.js       Liste der Räume
      room.js        Grundgerüst eines Raums: Wände, Tür, Möbel, Lampen, Uhren
      fittings.js    Ausstattung für mehrere Räume (Teppich, Ohrensessel, Gaskrone …)
      werkstatt.js, apotheke.js, destille.js, bank.js, pension.js
    figures.js       Figuren, Pferde
    kit.js           Geometrie-Bausatz
    textures.js      alle Texturen, zur Laufzeit im Canvas erzeugt
  cases/
    index.js         Liste der Fälle
    uhrmacher.js     Fall 1, reine Daten
  ui/ui.js           Oberfläche als DOM über dem Canvas
  dev/checkCase.js   Fallprüfung, nur im Entwicklungsmodus
```

Das Projekt braucht keine Bild- oder Audiodateien. Texturen und Klänge entstehen im Code.

## Erweitern

**Neuer Fall:** Eine Datei wie `cases/uhrmacher.js` anlegen und in `CASE_LIST` in `cases/index.js`
eintragen. Ein Fall besteht nur aus Daten: Hinweise, Schlüsse (Hinweispaare), Figuren, Hotspots und
Dialoge. Figuren und Hotspots hängen an benannten Ankern der Orte (`loc.anchor(...)`). Mit
`after: '<id>'` wird ein Fall erst freigegeben, wenn jener gelöst ist. Der Titelbildschirm listet alle
Fälle; beim Wechsel baut `removeCase` die Figuren und Fundstellen des alten Falls ab und `applyCase`
die des neuen auf. Jeder Fall hat seinen eigenen Spielstand.

**Fall prüfen:** Bei laufendem `npm run dev` die Adresse http://localhost:5173/?pruefen öffnen. Geprüft
werden alle Fälle nacheinander. Eine Tafel oben rechts und die Browser-Konsole zeigen das Ergebnis:

- *Fehler:* Anker, Dialogziele oder Bedingungen, die ins Leere zeigen. Fundstellen, die von keinem
  begehbaren Standpunkt aus in Reichweite liegen. Hinweise, Schlüsse oder Ziele, die sich beim
  simulierten Durchspielen nie gewinnen lassen, und eine Anklage, die nie angeboten wird.
- *Warnungen:* Fundstellen, die überall hinter Geometrie liegen, stehende Figuren in Möbeln und
  Hinweise, die zu keinem Schluss gehören.

Optik und Texte prüft das nicht. Bedingungen der Form `!id` wertet die Simulation eher zu großzügig.

**Darstellung messen:** Bei laufendem `npm run dev` die Adresse http://localhost:5173/?messen=1080
öffnen (Browserfenster sichtbar lassen). Gemessen wird an festen Standpunkten in 1920 × 1080 bei
voller innerer Auflösung: GPU-Zeit je Durchgang (Szene, Leuchten, Schlussbild), Bildrate,
Zeichenaufrufe und Dreiecke.

**Neues Viertel:** Die Grenzen der Welt sind die Baustellen in `world/berlin/index.js` (`barrier(...)`).
Sie entfernen, an derselben Stelle mit `block` und `row` weiterbauen und `loc.map` ergänzen.

**Neuer Innenraum:** Ein Modul wie `world/interiors/bank.js` mit einer `build…`-Funktion anlegen, in
`world/interiors/index.js` eintragen und in `berlin/index.js` mit `doorSpot` und `loc.exits` an ein Haus
anschließen. Was mehrere Räume brauchen, gehört nach `fittings.js`.

## Geschichtlicher Hintergrund

Belegte Details: Bahnhof Börse (heute Hackescher Markt), Stadtbahn seit 1882, Litfaßsäulen,
Urania-Säulen, Hobrechts Kanalisation, Neue Synagoge. Das Bankhaus Lindner & Sohn, die Figuren
und die Straßenführung im Einzelnen sind erfunden. Der Name „Sigerson“ stammt aus Conan Doyles
„The Empty House“. Die Holmes-Erzählungen von Conan Doyle sind gemeinfrei.
