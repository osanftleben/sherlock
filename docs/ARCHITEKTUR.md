# Architektur: effiziente Darstellung der Stadt

Stand: Entwurf zur Abnahme, 6. November 2026.

## Grundsatz

Es wird nur gerechnet, was man sieht, und das mit der billigsten Technik, die den Look trägt.
Effizienz ist Teil des Entwurfs, kein Nachbessern. Zielrechner ist eine schwache integrierte
Grafik (Intel UHD 620, Laptop von 2017) bei 1920 × 1080 und 60 FPS. Die Iris Xe des
Entwicklungsrechners hat etwa doppelte Leistung und muss entsprechend viel Luft zeigen.
Die dynamische Auflösung bleibt nur als Sicherheitsnetz für noch schwächere Geräte.

## Ausgangslage (gemessen)

| Posten | Iris Xe, 1080p | Ursache |
| --- | --- | --- |
| Pixel und Beleuchtung | ca. 10 ms | PBR-Shader mit 6 Punktlichtern auf jedem Pixel, keine Sortierung der Fassaden |
| Geometrie | ca. 3 ms | rund 450 000 Dreiecke, alle in jedem Bild, weil Fassaden und Bausatz ohne Culling als stadtgroße Meshes vorliegen |
| Nachbearbeitung | ca. 3 ms | bereits gestrafft |

## Bewährte Verfahren, die wir einsetzen

### 1. Szenengraph mit räumlicher Gliederung

- Die Welt wird in **Zellen** zerlegt: je Straßenabschnitt von etwa 30 bis 40 m, am Platz je
  Platzteil. Jede Zelle ist eine `THREE.Group` mit eigener Bounding Box.
- In der Zelle ist jedes Einzelstück ein eigenes Objekt mit eigenem Bounding Volume.
- Gleiche Objekte (Fensterachsen, Laternen, Prellsteine, Fässer, Marktstände) laufen über
  **`InstancedMesh` je Zelle**, damit Culling greift.
- Wo viele verschiedene Teile ein Material teilen (Ladenfronten, Schilder), nutzen wir
  **`BatchedMesh`**: ein Zeichenaufruf, aber jedes Teil wird einzeln gegen das Sichtfeld
  geprüft und von vorne nach hinten sortiert (`perObjectFrustumCulled`, `sortObjects`).
- Ein **Gitter-Index** (Uniform Grid, später Quadtree beim Nachladen von Vierteln) für
  Kollision, Fundstellen und Lichtsuche ersetzt die heutigen linearen Listen.

### 2. Sichtbarkeit

- **Frustum-Culling** von three.js für Zellen, Objekte und Instanzen.
- **Verdeckung über Zellen und Portale (PVS):** Straßen sind Schluchten. Für jede Zelle steht
  vorab fest, welche anderen Zellen von dort aus überhaupt sichtbar sein können. Alles andere
  wird abgeschaltet. Die Tabelle wird beim Bauen der Welt aus Sichtstrahlen berechnet und von
  der Fallprüfung mit überprüft.
- **Von vorne nach hinten:** undurchsichtige Objekte werden in Tiefenreihenfolge gezeichnet,
  damit der Tiefentest verdeckte Pixel vor dem teuren Shader verwirft (Early-Z).
- Dieselbe Sichtbarkeit steuert **Lichter, Effekte und Logik**: Punktlichter gehen nur an
  sichtbare Lichtquellen, Leuchtsprites und Rauch unsichtbarer Zellen sind aus, Passanten und
  Flackern außerhalb der Sicht ruhen.

### 3. Detailstufen (LOD)

- Fensterachsen haben 200 bis 360 Dreiecke. Ab etwa 35 m wechselt eine Zelle auf eine
  **flache Fassade** mit gemalten Fenstern und Normal Map (Impostor), mit `THREE.LOD`.
- Ferne Kulissen (Dom, Synagoge, Sophienkirche, Häuser jenseits der Spree) bleiben
  einfache unbeleuchtete Silhouetten.

### 4. Licht

- **Gebackenes Licht** für alles, was stillsteht: Der Schein der Laternen und erleuchteter
  Fenster wird beim Laden einmal in Vertexfarben bzw. eine Lichtkarte der Fassaden und des
  Pflasters geschrieben.
- **Dynamisches Licht** nur für Bewegtes und für die Spiegelung im nassen Pflaster, mit fester
  kleiner Zahl (2 bis 3), ausgewählt nach Sichtbarkeit und Nähe.
- **Materialien nach Bedarf:** PBR (`MeshStandardMaterial`) nur für nasses Pflaster, Glas und
  Metall. Putz, Mauerwerk, Holz und Stoff nutzen `MeshLambertMaterial` oder unbeleuchtete
  Materialien mit gebackenem Licht.

### 5. Texturen

- **Atlanten** für Auslagen, Schilder und Zunftzeichen (ein Material je Sorte).
- Mipmaps überall; Auflösung nach Betrachtungsabstand, nicht pauschal 2048.
- Alle Texturen bleiben prozedural (Projektgrundsatz: keine Bilddateien).

### 6. Laufzeit

- Pro Bild keine neuen Objekte im Speicher (wiederverwendete Vektoren, Pools für Sprites).
- Animationen und Aktualisierungen nur für sichtbare oder nahe Dinge, sonst seltener.
- Nachbearbeitung wie bisher: MSAA nur für die Szene, ein Schlussdurchgang, Leuchten in
  halber Auflösung.

## Module

```
src/world/berlin/
  index.js        Viertel zusammensetzen: Zellen, Eingänge, Anker, Stadtplan
  cells.js        Zellen, Bounding Boxes, PVS-Tabelle
  facades.js      Fensterachsen je Zelle (Instancing, LOD)
  street.js       Ladenfronten, Tore, Kellerläden, Möbel (BatchedMesh/Instancing je Zelle)
  lights.js       Lichtquellen, Backen, Auswahl der dynamischen Lichter
  ...             railway, river, horizon, plaza, traffic, weather wie bisher
src/world/interiors/
  index.js        Liste der Räume
  <raum>.js       ein Raum je Datei
src/engine/
  visibility.js   Sichtbarkeit pro Bild: Zelle der Kamera, PVS, Frustum
  grid.js         räumlicher Index für Kollision und Fundstellen
src/dev/
  checkCase.js    Fallprüfung (?pruefen)
  measure.js      Messrunde (?messen)
```

Regeln: eine Datei je Zuständigkeit, Richtwert höchstens 400 Zeilen, `npm run lint` vor
jedem Commit.

## Vorhandenes statt Selbstgebautem

| Aufgabe | Werkzeug |
| --- | --- |
| gleiche Objekte | `THREE.InstancedMesh` |
| viele Teile, ein Material | `THREE.BatchedMesh` |
| Detailstufen | `THREE.LOD` |
| Sichtfeld | `THREE.Frustum`, Culling von three.js |
| Strahltests (Sichtbarkeit, Fundstellen) | `three-mesh-bvh` |
| Nachbearbeitung | three.js `postprocessing` (wie bisher, gestrafft) |
| Codeprüfung | ESLint |

Eigenes nur dort, wo es nichts Passendes gibt (PVS-Tabelle für unsere Zellen, Backen der
Laternen in Vertexfarben), jeweils mit Begründung im Code.

## Messen

`?messen` fährt feste Messpunkte ab und meldet GPU-Zeit je Durchgang, Dreiecke und
Zeichenaufrufe. Ziel auf der Iris Xe: höchstens etwa 7 ms GPU-Zeit bei voller Auflösung,
damit der Zielrechner 60 FPS hält.

## Reihenfolge des Umbaus

1. `?messen` als Entwicklerwerkzeug.
2. Zellen und Szenengraph: Fassaden, Bausatz und Möbel je Zelle, Culling an.
3. Sichtbarkeit: PVS-Tabelle, Lichter und Effekte daran gekoppelt.
4. Licht backen, Materialien nach Bedarf.
5. LOD für Fassaden.
6. `interiors.js` in ein Modul je Raum aufteilen.
7. Erst danach die Straßen weiter beleben.

Vom bisherigen, nicht eingecheckten Straßen-Bausatz bleiben die Texturatlanten und die
Ladenlogik; die Mesh-Erzeugung wird auf Zellen umgestellt.
