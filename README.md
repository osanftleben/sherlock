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

Der Spielstand wird automatisch im Browser gespeichert.

## Aufbau

```
src/
  main.js            Spielablauf: Orte, Dialoge, Notizbuch, Lösung
  core/              Spielstand, Eingabe, synthetisierte Klänge
  engine/            Spielerfigur und Kollision, Ort (Location), Rendering
  world/
    berlin.js        das Viertel um den Hackeschen Markt
    interiors.js     Innenräume
    figures.js       Figuren, Pferde
    kit.js           Geometrie-Bausatz
    textures.js      alle Texturen, zur Laufzeit im Canvas erzeugt
  cases/
    index.js         Liste der Fälle
    uhrmacher.js     Fall 1, reine Daten
  ui/ui.js           Oberfläche als DOM über dem Canvas
```

Das Projekt braucht keine Bild- oder Audiodateien. Texturen und Klänge entstehen im Code.

## Erweitern

**Neuer Fall:** Eine Datei wie `cases/uhrmacher.js` anlegen und in `cases/index.js` eintragen.
Ein Fall besteht nur aus Daten: Hinweise, Schlüsse (Hinweispaare), Figuren, Hotspots und Dialoge.
Figuren und Hotspots hängen an benannten Ankern der Orte (`loc.anchor(...)`). Noch fehlt die
Fallauswahl: `main.js` lädt nur `FIRST_CASE`, und `applyCase` kann einen Fall nicht wieder entfernen.

**Neues Viertel:** Die Grenzen der Welt sind die Baustellen in `world/berlin.js` (`barrier(...)`).
Sie entfernen, an derselben Stelle mit `block` und `row` weiterbauen und `loc.map` ergänzen.

**Neuer Innenraum:** Eine `build…`-Funktion in `world/interiors.js` ergänzen und in `berlin.js`
mit `doorSpot` und `loc.exits` an ein Haus anschließen.

## Geschichtlicher Hintergrund

Belegte Details: Bahnhof Börse (heute Hackescher Markt), Stadtbahn seit 1882, Litfaßsäulen,
Urania-Säulen, Hobrechts Kanalisation, Neue Synagoge. Das Bankhaus Lindner & Sohn, die Figuren
und die Straßenführung im Einzelnen sind erfunden. Der Name „Sigerson“ stammt aus Conan Doyles
„The Empty House“. Die Holmes-Erzählungen von Conan Doyle sind gemeinfrei.
