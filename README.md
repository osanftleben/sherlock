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
      facades.js     Häuserzeilen: Fensterachsen, Hauskörper, Erker, Balkone, Gauben, Durchfahrten, Gehwege
      court.js       Hinterhof hinter der Durchfahrt neben Kesslers Werkstatt
      railway.js     Stadtbahn, Bahnhof Börse, Zug
      plaza.js       Platz: Bäume, Litfaßsäule, Urania-Säule, Achteck
      shopwindows.js Schaufenster und Fenster der Schauplätze von Fall 1
      lamps.js       Gaslaternen, die nächsten sechs werfen Licht; kaputte bleiben dunkel
      traffic.js, weather.js, river.js, horizon.js
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
Die Wände der Fensterachsen (je Achse über 200 Dreiecke) werden in `FacadeBatcher.build()` nach
Feldern von `CULL_CELL` Metern (64) in eigene Instanz-Meshes geteilt, damit three.js die Häuser hinter
der Kamera gar nicht erst zeichnet. Kleinere Felder sparen Dreiecke, kosten aber Zeichenaufrufe;
größere umgekehrt. Die Scheiben bleiben je Art ein Mesh, weil sie billig sind.
Große matte Flächen (Putz, Hauskörper, Schiefer, Ziegel, Horizont) nutzen `matte()` aus `kit.js`, also
Lambert statt PBR. Das spart in 1080p rund 2 ms. Was glänzen oder spiegeln soll (Pflaster, Glas,
Eisen), bleibt bei `std()`.
Die Szene wird in einen 4×-MSAA-Puffer im Format R11G11B10F gerechnet (`view.js`): Fließkomma für das
Leuchten, aber halb so breit wie RGBA16F. Schon Löschen und Auflösen des Puffers sind auf schwachen
Grafikchips teuer; mit dem kompakten Format sinkt die GPU-Zeit in 1080p um gut 1 ms.

**Spree:** Der Wasserspiegel steht als `WATER_Y` in `world/berlin/river.js` (2,7 m unter der Quaikante);
Quaimauer, Treppe, Kahn und die Kaimauer am Gegenufer richten sich danach. Das Wasser spiegelt das
Gegenufer ohne zweiten Renderdurchgang: `horizon.js` trägt beim Bauen Häuser und erleuchtete Fenster in
eine kleine Spiegelkarte ein (`BankMirror`), und der Wasser-Shader verfolgt den gespiegelten Sehstrahl bis
zur Uferlinie (`BANK_Z`). Wer dort etwas baut, trägt es mit `mirror.fill(...)` ein. Lichtbahnen der
Quai-Laternen, Kahnlaterne und Regenringe rechnet derselbe Shader. Abstand und Richtung zu Quai und Kahn
meldet `river.js` als `loc.river` an `core/audio.js` (Plätschern, Knarren der Leinen).

**Neues Viertel:** Die Grenzen der Welt sind die Baustellen in `world/berlin/index.js` (`barrier(...)`).
Dahinter stehen Kulissen (Abschnitt „Kulissen hinter den Baustellen“ samt Laternen), die nur den Blick
abschließen. Sperre und Kulisse entfernen, an derselben Stelle mit `block` und `row` weiterbauen und
`loc.map` ergänzen.

**Neuer Innenraum:** Ein Modul wie `world/interiors/bank.js` mit einer `build…`-Funktion anlegen, in
`world/interiors/index.js` eintragen und in `berlin/index.js` mit `doorSpot` und `loc.exits` an ein Haus
anschließen. Was mehrere Räume brauchen, gehört nach `fittings.js`.

**Neue Ladenart:** Die Auslagen der übrigen Läden sind gemalte Bilder aus `shopDisplay(kind)` in
`world/textures.js`. Eine neue Art dort in `SHOP_KINDS` und `SHOP_NAMES` eintragen, ihre Waren zeichnen
und in `shopMix` (`world/berlin/index.js`) einem Straßenzug zuteilen. Dunkle Läden zeigen einen Rollladen.
Für das Schriftbrett über dem Laden braucht die Art eine Zeile in `SIGN_KIND_LINE` und für den
Ausleger ein Zunftzeichen in `shopSigns()`; Atlasgrößen stehen in `SIGN_ATLAS`.
Erleuchtete Wohnungsfenster zeigen Bilder aus `windowAtlas()` (Zeilen = Arten wie Spitzengardine oder
Rollo, Spalten = Varianten). `facades.js` wählt je Stockwerk eines Hauses eine Art. Der Atlas wird so
abgedunkelt, dass ein Fenster aus der Ferne so hell wirkt wie eine einfarbige Scheibe. Dunkle Fenster
zeigen dieselbe Art nur als Schimmer hinter Glas, das ein gemaltes Bild der Nachtstraße spiegelt
(`nightReflection()`); Stärke und Helligkeit stehen in `SHADE_REFLECT` und `SHADE_ALBEDO`.

**Erker, Balkone, Gauben:** Häuser aus `row()` bekommen sie nach eigenem Zufall (`planRelief` in
`facades.js`); Häuser aus `block()` nur mit `relief: true`. Die Schauplätze der Fälle bleiben deshalb
glatt, und nichts verdeckt ihre Schilder oder Fundstellen.

**Durchfahrten und Höfe:** `row({ …, gate: n })` baut in Achse `n` der Reihe eine Tordurchfahrt mit
Rundbogen, Gewölbe und offenen Torflügeln, auf der Hofseite dieselbe Achse gedreht. Der Zufall wird
dabei gezogen wie für die Achse, die dort vorher stand, damit alle übrigen Häuser gleich bleiben. Unter
dem Gewölbe regnet es nicht (`loc.dry`, höchstens vier Stellen je Viertel). Hofwände entstehen mit
`courtWall()` aus denselben Fensterachsen, ohne Hauskörper und Dach (Beispiel: `court.js`). Eine Laterne
wird mit `[x, z, true]` in der Liste der Laternen zur kaputten: kein Licht, eingeschlagene Scheibe.

## Geschichtlicher Hintergrund

Belegte Details: Bahnhof Börse (heute Hackescher Markt), Stadtbahn seit 1882, Litfaßsäulen,
Urania-Säulen, Hobrechts Kanalisation, Neue Synagoge. Das Bankhaus Lindner & Sohn, die Figuren
und die Straßenführung im Einzelnen sind erfunden. Der Name „Sigerson“ stammt aus Conan Doyles
„The Empty House“. Die Holmes-Erzählungen von Conan Doyle sind gemeinfrei.
