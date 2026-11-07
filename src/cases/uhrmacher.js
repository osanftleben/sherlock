// Fall 1. Reine Daten: Der Spielkern kennt keine einzige Figur aus dieser Datei.
// Ein weiterer Fall ist eine weitere solche Datei plus ein Eintrag in cases/index.js.
//
// Die Wahrheit: Prokurist Reinhold Wendt hat bei Lindner & Sohn unterschlagen und die Depotnummern
// auf einem Zettel im Staubdeckel seiner Repetieruhr versteckt. Kessler fand ihn beim Reparieren
// und bestellte Wendt für Freitag, 21 Uhr, ein. Wendt mischte ihm Chloral in den Tee, öffnete
// den Gashahn, spülte seine Tasse, riss die Seite aus dem Buch und nahm die Uhr mit.
export const uhrmacher = {
  id: 'uhrmacher',
  title: 'Der Uhrmacher von der Rosenthaler Straße',
  number: 'Erster Fall',

  intro: [
    'Mai 1891. An den Reichenbachfällen stürzen Sherlock Holmes und Professor Moriarty in die Tiefe. So jedenfalls steht es in Dr. Watsons Bericht.',
    'Holmes lebt. Moriartys Leute suchen ihn, also muss er für die Welt tot bleiben. Er reist als Sigerson, ein norwegischer Forscher, und von diesem Abschnitt seiner Reisen wird Watson nie erfahren.',
    'Berlin, Sonnabend, 12. November 1892. Die Stadt wächst schneller als jede andere in Europa: Gaslaternen, Stadtbahn, Nebel über der Spree. Und ein Zimmer in der Pension Puhlmann, Oranienburger Straße.',
  ],

  start: { location: 'pension', dialog: 'martha' },

  clues: {
    c_gewohnheiten: { title: 'Kesslers Gewohnheiten', text: 'Laut Martha rauchte Kessler nie: Tabakstaub sei Gift fürs Räderwerk. Geschirr ließ er stehen, sie spülte es jeden Sonnabend. Freitags um acht zog er sämtliche Uhren auf.' },
    c_gas: { title: 'Der offene Gashahn', text: 'Der Hahn am Wandarm stand ganz offen, die Flamme war aus. Die Polizei sagt: vom Luftzug ausgeblasen.' },
    c_fenster: { title: 'Die verklebten Fenster', text: 'Alle Fensterfugen sind mit Papierstreifen gegen den Winter verklebt und unversehrt. Die Tür schließt dicht. In diesem Raum zieht es nicht.' },
    c_tassen: { title: 'Zwei Tassen', text: 'Neben dem Sessel eine Tasse mit bitterem Bodensatz. Auf dem Bord eine zweite, frisch gespült und als einzige ohne Staub. Eine Probe des Satzes habe ich eingesteckt.' },
    c_asche: { title: 'Zigarrenasche', text: 'Neben dem Besucherstuhl liegt weiße, feste, lange Asche: eine teure Havanna. Kein Stumpen, kein Pfeifentabak.' },
    c_buch: { title: 'Das Reparaturbuch', text: 'Eine Seite ist herausgerissen. Mit Bleistift schraffiert zeigt die Seite darunter den Abdruck: „Nr. 17. Goldene Repetieruhr. Hr. W…“ Den Rest der Zeile hat der Stift kaum noch eingedrückt.' },
    c_haken: { title: 'Das Hakenbrett', text: 'Jede Uhr in Reparatur hängt an ihrem nummerierten Haken. Haken 17 ist leer. Die Uhr ist nicht in der Werkstatt.' },
    c_uhren: { title: 'Frisch aufgezogen', text: 'Alle Uhren laufen, alle wurden zur selben Zeit aufgezogen. Kessler lebte also am Freitag um acht Uhr abends noch.' },
    c_loesch: { title: 'Das Löschblatt', text: 'Im Spiegel lesbar: „… muss Sie dringend sprechen wegen des Zettels in Ihrer Uhr. Freitag, 9 Uhr abends. Sonst gehe ich zur Polizei. E. K.“' },
    c_extrablatt: { title: 'Das Extrablatt', text: 'An der Litfaßsäule: Nach den Bankzusammenbrüchen des letzten Jahres ordnet der Aufsichtsrat bei Lindner & Sohn eine außerordentliche Revision an, Beginn Montag, 14. November.' },
    c_glocke: { title: 'Das Glöckchen im Dunkeln', text: 'Nachtwächter Krause: Freitag gegen zehn blieb ein Herr unter der kaputten Laterne stehen. Aus seiner Weste klang es hell: pling, pling, wie ein Glöckchen.' },
    c_gang: { title: 'Der Gang des Fremden', text: 'Krause: Zylinder, Überzieher, flotter Schritt, kein Stock, kein Hinken. Kam aus dem Durchgang neben Kesslers Laden und eilte Richtung Bahnhof Börse, wie einer, der die letzte Stadtbahn kriegen will.' },
    c_chloral: { title: 'Chloralhydrat', text: 'Dr. Voss hat den Bodensatz geprüft: Mit Natronlauge riecht er nach Chloroform. Das heißt Chloral, ein starkes Schlafmittel, und zwar in einer gewaltigen Dosis.' },
    c_rezept: { title: 'Das Rezeptbuch', text: 'Chloral diese Woche nur an drei Kunden: Frau Geheimrat Bötticher (78, bettlägerig), Leutnant a. D. von Rathen und, am Freitagmittag, Prokurist Wendt, obwohl dessen letztes Fläschchen erst zwei Wochen alt war.' },
    c_alibi: { title: 'Brandts Alibi', text: 'Wirtin Kluge: Otto Brandt saß am Freitag von sieben Uhr bis Mitternacht in der Schrippe und schlief dann im Hinterzimmer. Der ganze Stammtisch hat ihn weinen sehen.' },
    c_ritz: { title: 'Die Ritznummer', text: 'Brandt: Kessler ritzte die Reparaturnummer und das Jahr in jedes Gehäuse, innen, wo es kein Kunde sieht. Das lässt sich nicht wegpolieren, ohne dass man es merkt.' },
    c_rathen: { title: 'Rathens Bein', text: 'Von Rathen trägt eine Kugel von Mars-la-Tour im Knie und kommt ohne Stock keine drei Schritte weit. Er raucht billige Stumpen.' },
    c_flasche: { title: 'Rathens Fläschchen', text: 'Rathen zeigte mir sein Chloral: Seidels Etikett vom Mittwoch, gut zwei Drittel sind noch darin. Er braucht es Nacht für Nacht für sein Knie.' },
    c_aussage: { title: 'Wendts Aussage', text: 'Wendt behauptet, seine Repetieruhr liege noch bei Kessler, er habe sie seit Mittwoch nicht gesehen. Den Freitagabend habe er in der Bank verbracht und sei nie in der Werkstatt gewesen.' },
    c_havanna: { title: 'Wendts Havanna', text: 'Auf Wendts Schreibtisch steht eine Kiste H. Upmann. Die Asche im Becher ist weiß, fest und lang.' },
    c_portier: { title: 'Der Portier', text: 'Portier Lemke schloss am Freitag um acht ab und ging. Wendt behielt den Schlüssel zur Hofpforte, die hinten zur Burgstraße hinausgeht, um später selbst zu gehen; wann, weiß niemand. Seit Mittwoch fragte Wendt ihn nach der Zeit, die Uhr sei beim Uhrmacher. Heute früh schlug sie in Wendts Weste.' },
    c_uhr17: { title: 'Die Uhr Nr. 17', text: 'Wendt musste mir seine Repetieruhr zeigen. Sie schlägt mit demselben hellen Glöckchen, das Krause und Lemke gehört haben. Innen im Rückdeckel steht Kesslers Ritzung „17/92“. Der Staubdeckel darunter ist leer, am Rand klebt ein Rest Siegellack.' },
    c_fahrplan: { title: 'Der letzte Zug', text: 'Laut Aushang am Bahnhof Börse fährt der letzte Stadtbahnzug nach Charlottenburg um 10.17 Uhr abends.' },
    c_billet: { title: 'Der Billetknipser', text: 'Zühlke: Am Freitag kam Wendt erst kurz vor dem letzten Zug, im Laufschritt quer über den Platz, von der Rosenthaler Straße her. Nicht aus der Banktür nebenan und nicht von hinten aus der Burgstraße, wo die Hofpforte liegt. Als Zühlke ihn zur Eile mahnte, schlug es in seiner Weste.' },
    c_kette: { title: 'Die Uhrkette', text: 'Wendts Uhrkette spannt sich straff in die Westentasche: An ihrem Ende hängt ein Gewicht. Trotzdem liest er die Zeit von der Wanduhr ab, statt die Tasche zu berühren.' },
  },

  deductions: {
    d_mord: { title: 'Kein Unfall', pairs: [['c_gas', 'c_fenster']], text: 'Ohne Zugluft bläst nichts eine Flamme aus. Jemand hat den Hahn geschlossen und wieder geöffnet, nachdem die Flamme erloschen war. Das ist Mord.' },
    d_besuch: { title: 'Ein Gast am Freitagabend', pairs: [['c_tassen', 'c_gewohnheiten'], ['c_asche', 'c_gewohnheiten']], text: 'Kessler spülte nie und rauchte nie. Die saubere Tasse und die Asche stammen von einem Gast, der seine Spuren beseitigen wollte und dabei eine vergaß.' },
    d_betaeubt: { title: 'Betäubt im Sessel', pairs: [['c_tassen', 'c_chloral']], text: 'Das Chloral war im Tee. Kessler schlief, als das Gas zu strömen begann. Deshalb stand er nicht auf.' },
    d_kreis: { title: 'Der Kreis wird enger', pairs: [['c_chloral', 'c_rezept']], text: 'Die bettlägerige Geheimrätin scheidet aus. Das Chloral kann nur von Rathen oder Wendt kommen.' },
    d_flasche: { title: 'Nicht aus Rathens Fläschchen', pairs: [['c_flasche', 'c_chloral']], text: 'Eine Dosis, von der ein Pferd schläft, sagt Dr. Voss. Aus Rathens Fläschchen fehlt kaum ein Drittel, verbraucht in drei Nächten mit dem Knie. Das Chloral in Kesslers Tasse stammt aus einem anderen Fläschchen.' },
    d_rathen: { title: 'Rathen scheidet aus', pairs: [['c_gang', 'c_rathen']], text: 'Der Fremde ging flott und ohne Stock. Rathen kann das nicht, und sein Stumpen hinterlässt keine solche Asche.' },
    d_brandt: { title: 'Brandt scheidet aus', pairs: [['c_alibi', 'c_uhren']], text: 'Um acht lebte Kessler noch, und von sieben bis Mitternacht saß Brandt vor Zeugen in der Schrippe.' },
    d_repetier: { title: 'Uhr Nr. 17 ging spazieren', pairs: [['c_buch', 'c_glocke']], text: 'Eine Repetieruhr schlägt die Zeit auf Knopfdruck, damit man sie im Dunkeln hören kann. Der Mann unter der kaputten Laterne trug die Uhr Nr. 17 bei sich.' },
    d_asche: { title: 'Die Asche gehört Wendt', pairs: [['c_asche', 'c_havanna']], text: 'Dieselbe weiße Asche, dieselbe Zigarre. Über den Unterschied der Tabakaschen habe ich eine Monographie geschrieben; hier genügt ein Blick.' },
    d_luege: { title: 'Wendt lügt', pairs: [['c_aussage', 'c_haken'], ['c_aussage', 'c_kette']], text: 'Die Uhr soll noch bei Kessler liegen, aber der Haken ist leer und Wendts Kette trägt ein Gewicht. Er hat sie selbst geholt, und das nur am Freitagabend.' },
    d_alibi: { title: 'Wendts Alibi hat ein Loch', pairs: [['c_aussage', 'c_portier']], text: 'Sein einziger Zeuge ging um acht. Danach saß der Prokurist allein in der Bank, mit dem Schlüssel zur Hofpforte in der Tasche, und bis zur Rosenthaler Straße sind es zehn Minuten. Und die Uhr, die angeblich noch bei Kessler liegt, schlug heute früh in seiner Weste.' },
    d_zug: { title: 'Zur letzten Stadtbahn', pairs: [['c_gang', 'c_fahrplan']], text: 'Krauses Fremder eilte kurz nach zehn Richtung Börse, wie einer, der die letzte Stadtbahn kriegen will. Die letzte nach Westen fährt um 10.17. Wer sie genommen hat, musste am Eingang am Billetknipser vorbei.' },
    d_umweg: { title: 'Nicht aus der Bank', pairs: [['c_billet', 'c_aussage']], text: 'Wendt will bis spät in der Bank gesessen haben und von dort zur Stadtbahn gegangen sein. Von der Banktür bis zur Treppe sind es zwanzig Schritte, und wer aus der Hofpforte kommt, geht hinten von der Burgstraße her am Viadukt entlang. Keiner der beiden Wege führt quer über den Platz. Er kam aber von der Rosenthaler Straße, aus Kesslers Richtung, kaum eine Viertelstunde nachdem Krause den Fremden aus dem Durchgang kommen sah. Und in seiner Weste schlug die Uhr, die angeblich noch bei Kessler lag.' },
    d_motiv: { title: 'Das Motiv', pairs: [['c_loesch', 'c_extrablatt']], text: 'Am Montag kommt die Revision. Der Zettel in der Uhr war der Beweis einer Unterschlagung, und Kessler drohte mit der Polizei. Dem Täter blieben drei Tage.' },
    d_zettel: { title: 'Der Zettel ist fort', pairs: [['c_uhr17', 'c_loesch']], text: 'Kessler schrieb von einem Zettel in der Uhr, und jetzt ist der Staubdeckel leer. Wendt hat ihn am Freitagabend herausgenommen, bevor er die Uhr einsteckte, und dazu die Seite aus dem Reparaturbuch. Nur der Bleistiftabdruck darunter ist ihm entgangen.' },
    d_beweis: { title: 'Der Beweis in der Weste', pairs: [['c_ritz', 'c_kette']], text: 'In Wendts Weste hängt eine Uhr, in deren Gehäuse Kessler „17/92“ geritzt hat. Ein Griff genügt, und seine Aussage ist widerlegt.' },
  },

  // Paare, die zusammengehören, aber für sich noch keinen Schluss tragen. Holmes sagt dann, was fehlt,
  // statt den Spieler für einen vernünftigen Gedanken zu verspotten.
  near: [
    { pairs: [['c_glocke', 'c_billet'], ['c_glocke', 'c_portier'], ['c_portier', 'c_billet']], text: 'Dasselbe feine Pling, von zwei Zeugen gehört. Das ist kein Zufall. Aber ein Ton überführt niemanden: Ich muss wissen, welche Uhr so schlägt, und sie in der Hand halten.' },
    { pairs: [['c_kette', 'c_glocke']], text: 'An Wendts Kette hängt etwas, das er nicht zeigen will, und Krauses Fremder trug eine Uhr, die im Dunkeln schlägt. Ob es dieselbe ist, sagt mir nur die Uhr selbst.' },
    { pairs: [['c_ritz', 'c_buch'], ['c_ritz', 'c_haken']], text: 'Nr. 17, und Kessler ritzte jede Nummer ins Gehäuse. Wo immer die Uhr jetzt ist, sie trägt seine Unterschrift. Ich muss sie nur finden.' },
    { pairs: [['c_buch', 'c_haken']], text: 'Nr. 17 im Buch, Haken 17 leer. Die Uhr ist fort, und vom Besitzer kenne ich nur den Anfangsbuchstaben. Welcher von Kesslers Kunden heißt mit W, und was sagt er selbst dazu?' },
    { pairs: [['c_buch', 'c_loesch']], text: 'Ein Zettel in einer Uhr, und aus dem Buch fehlt die Seite der Uhr Nr. 17. Wer die Seite herausriss, wusste, worum es in dem Brief ging.' },
    { pairs: [['c_rathen', 'c_asche']], text: 'Rathen raucht billige Stumpen, in der Werkstatt lag Havanna-Asche. Das spricht für ihn, aber Asche kann jeder mitbringen. Wie ging der Fremde, den der Nachtwächter sah?' },
    { pairs: [['c_fahrplan', 'c_billet']], text: 'Wendt erwischte den letzten Zug um 10.17 gerade noch. Das allein ist kein Verbrechen. Entscheidend ist, woher er kam, und was er selbst über seinen Abend behauptet.' },
    { pairs: [['c_rezept', 'c_flasche']], text: 'Rathen kaufte am Mittwoch, sein Fläschchen ist zu zwei Dritteln voll. Wie viel Chloral in Kesslers Tasse war, hat Dr. Voss mir gesagt.' },
    { pairs: [['c_rezept', 'c_tassen']], text: 'Seidels Buch nennt drei Namen. Ich sollte die Liste mit dem vergleichen, was Dr. Voss in der Tasse gefunden hat.' },
  ],

  people: [
    { name: 'Emil Kessler', role: 'Uhrmachermeister, das Opfer. Rosenthaler Straße.' },
    { name: 'Martha Kessler', role: 'Seine Nichte und unsere Auftraggeberin.' },
    { name: 'Dr. Henriette Voss', role: 'Ärztin, in Zürich promoviert, weil Preußen Frauen nicht studieren lässt. Mitbewohnerin der Pension und schwer zu täuschen.' },
    { name: 'Schutzmann Piefke', role: 'Bewacht die Werkstatt. Hält den Fall für erledigt.', when: ['f_piefke'] },
    { name: 'Nachtwächter Krause', role: 'Dreht seine Runde an der Ecke Sophienstraße.', when: ['f_krause'] },
    { name: 'Otto Brandt', role: 'Kesslers Geselle, vor einer Woche entlassen. Trinkt in der Goldenen Schrippe.' },
    { name: 'Egon von Rathen', role: 'Leutnant a. D., spielt und hat Schulden bei Kessler.' },
    { name: 'Reinhold Wendt', role: 'Prokurist im Bankhaus Lindner & Sohn, Kunde bei Kessler.', when: ['f_wendt'] },
    { name: 'Apotheker Seidel', role: 'Apotheke zum Schwarzen Adler.', when: ['f_seidel'] },
    { name: 'Billetknipser Zühlke', role: 'Steht am Eingang zum Bahnhof Börse und kennt jeden, der dort hinaufgeht.', when: ['f_zuehlke'] },
    { name: 'Portier Lemke', role: 'Hütet die Tür des Bankhauses Lindner & Sohn. Geht um acht nach Hause.', when: ['f_lemke'] },
  ],

  // Das erste Ziel, dessen Bedingung noch nicht erfüllt ist, steht im Notizbuch und bei Dr. Voss.
  objectives: [
    { until: ['f_schluessel'], text: 'Fräulein Kessler anhören', hint: 'Sprechen Sie zuerst mit Fräulein Kessler. Sie hat den Schlüssel zur Werkstatt.' },
    { until: ['c_tassen', 'c_buch'], text: 'Die Werkstatt in der Rosenthaler Straße untersuchen', hint: 'Die Werkstatt liegt nicht weit: die Oranienburger hinunter zum Hackeschen Markt, dann nach Norden in die Rosenthaler. Sehen Sie sich jeden Winkel an.' },
    { until: ['c_chloral'], text: 'Den Bodensatz von Dr. Voss prüfen lassen', hint: 'Bringen Sie mir, was Sie in dieser Tasse gefunden haben, dann weiß ich mehr.' },
    { until: ['c_alibi', 'c_rathen', 'c_glocke', 'c_rezept', 'c_aussage'], text: 'Zeugen und Verdächtige befragen: Goldene Schrippe, Apotheke, Bankhaus, Nachtwächter', hint: 'Sie reden noch nicht mit genug Leuten. Die Schrippe in der Sophienstraße, Seidels Apotheke, das Bankhaus am Markt, und nachts läuft an der Ecke Sophienstraße ein Wächter herum.' },
    { until: ['d_mord', 'd_repetier', 'd_luege', 'd_motiv'], text: 'Hinweise im Notizbuch verknüpfen (N)', hint: 'Sie haben genug Fäden. Verknüpfen Sie im Notizbuch je zwei Hinweise miteinander. Etwa: Was sagt uns der Abdruck im Buch über das, was der Wächter gehört hat? Und lesen Sie, was an der Litfaßsäule am Markt klebt. Ganz Berlin redet von Lindner & Sohn.' },
    { until: ['c_uhr17'], text: 'Wendt mit seiner Uhr stellen', hint: 'Wenn Sie recht haben, trägt der Prokurist den Beweis in der Weste. Lassen Sie ihn die Uhr vorführen. Und fragen Sie vorher Brandt, woran man eine Uhr aus Kesslers Werkstatt erkennt.' },
    // Ohne dieses Ziel ginge es von der Uhr direkt zur Anklage, und „Der Zettel ist fort“ bliebe liegen.
    // Die Anklage sperrt es nicht; es lenkt nur den Blick zurück aufs Löschblatt.
    { until: ['d_zettel'], text: 'Den leeren Staubdeckel erklären (N)', hint: 'Ein leerer Staubdeckel und ein Rest Siegellack? Dann lag dort etwas, das niemand finden sollte. Und Kessler schrieb doch von einem Zettel. Legen Sie das zusammen, ehe Sie mir den Täter nennen.' },
    { until: ['f_geloest'], text: 'Dr. Voss die Lösung darlegen', hint: 'Mir scheint, Sie sind so weit. Sagen Sie mir, wer es war.' },
  ],

  doors: {
    werkstatt: { requires: ['f_schluessel'], message: 'Verschlossen. Den Schlüssel hat Fräulein Kessler, und sie wartet in der Pension Puhlmann.' },
  },

  npcs: [
    // Trauerkleid: Ihr Onkel ist eben gestorben.
    { id: 'martha', location: 'pension', anchor: 'martha', name: 'Martha Kessler', dialog: 'martha', look: { outfit: 'dress', coat: 0x141215, collar: 0x1e1b1f, hair: 0x4a3322, skin: 0xd2ab8c, build: 'slim', height: 1.64 } },
    { id: 'voss', location: 'pension', anchor: 'voss', name: 'Dr. Henriette Voss', dialog: 'voss', look: { outfit: 'dress', coat: 0x2a3440, collar: 0xe8e2d4, apron: 0xbfb8a4, hair: 0x6a4a30, eyewear: 'pincenez', chain: true, height: 1.7 } },
    { id: 'piefke', location: 'berlin', anchor: 'vorWerkstatt', name: 'Schutzmann Piefke', dialog: 'piefke', look: { outfit: 'tunic', coat: 0x1b2a44, piping: 0x8a1c1c, trousers: 0x14181f, hat: 'pickelhaube', moustache: 'kaiser', hair: 0x2a2018, sabre: true, build: 'stout' } },
    { id: 'krause', location: 'berlin', anchor: 'sophienEcke', name: 'Nachtwächter Krause', dialog: 'krause', look: { outfit: 'overcoat', coat: 0x3a3226, cape: true, buttons: 0xb8963f, neck: 'scarf', tie: 0x4a3a2a, hat: 'peaked', hatColor: 0x1a1812, beard: 'full', hair: 0x8a847a, lantern: true, cane: true, build: 'stout' } },
    { id: 'seidel', location: 'apotheke', anchor: 'seidel', name: 'Apotheker Seidel', dialog: 'seidel', look: { outfit: 'labcoat', coat: 0xd8d2c4, vest: 0x4a4a48, buttons: 0xe8e4da, trousers: 0x20201f, hair: 0x9a948a, hairStyle: 'receding', moustache: 'walrus', eyewear: 'pincenez', build: 'slim', habit: 'tidy' } },
    { id: 'kluge', location: 'destille', anchor: 'kluge', name: 'Mutter Kluge', dialog: 'kluge', look: { outfit: 'dress', coat: 0x38302a, collar: 0x38302a, apron: 0xb0a890, shawl: 0x5a2a22, hair: 0x7a726a, skin: 0xc49478, build: 'stout', height: 1.6 } },
    { id: 'brandt', location: 'destille', anchor: 'brandt', name: 'Otto Brandt', dialog: 'brandt', look: { outfit: 'jacket', coat: 0x4a3a26, vest: 0x2a241c, shirt: 0xc8c0aa, neck: 'scarf', tie: 0x7a2a1e, trousers: 0x2a241a, hat: 'cap', hatColor: 0x2a2418, hair: 0x4a3622, beard: 'stubble', glass: true, height: 1.72 } },
    { id: 'rathen', location: 'destille', anchor: 'rathen', name: 'Egon von Rathen', dialog: 'rathen', look: { outfit: 'frock', coat: 0x2a2a30, vest: 0x5a1e22, neck: 'cravat', tie: 0xd8d2c4, trousers: 0x3a3a40, hair: 0x5a5048, hairStyle: 'parted', moustache: 'kaiser', eyewear: 'monocle', cane: 'silver', habit: 'lean', build: 'slim', height: 1.8 } },
    { id: 'wendt', location: 'bank', anchor: 'wendt', name: 'Reinhold Wendt', dialog: 'wendt', look: { outfit: 'frock', coat: 0x16181c, vest: 0x2a2a2e, trousers: 0x202024, hair: 0x2a241e, hairStyle: 'parted', beard: 'mutton', moustache: 'brush', eyewear: 'spectacles', chain: true, height: 1.8 } },
    { id: 'lemke', location: 'bank', anchor: 'portier', name: 'Portier Lemke', dialog: 'lemke', look: { outfit: 'overcoat', coat: 0x2c3a5c, buttons: 0xc8a048, trousers: 0x1c2030, neck: 'none', hat: 'peaked', hatColor: 0x222a40, moustache: 'walrus', hair: 0x8a8278, hairStyle: 'receding', build: 'stout', height: 1.74 } },
    { id: 'zuehlke', location: 'berlin', anchor: 'knipser', name: 'Billetknipser Zühlke', dialog: 'zuehlke', look: { outfit: 'tunic', coat: 0x1c2436, piping: 0x9a2a1e, buttons: 0xb8963f, trousers: 0x161a24, hat: 'peaked', hatColor: 0x1a2030, moustache: 'brush', hair: 0x6a6258, hairStyle: 'receding', punch: true, habit: 'punch', height: 1.7 } },
    { id: 'kassierer', location: 'bank', anchor: 'kassierer', name: 'Kassierer', look: { outfit: 'jacket', coat: 0x26262a, vest: 0x3a3a3c, shirt: 0xd8d2c4, neck: 'tie', tie: 0x1a1a1e, hair: 0x6a5a48, hairStyle: 'parted', moustache: 'brush', eyewear: 'spectacles', build: 'slim', height: 1.7 }, say: '„Der Herr Prokurist ist sehr beschäftigt, die Revision, Sie verstehen.“ Er senkt den Blick wieder auf seine Kolonnen. Seine Feder hat seit einer Viertelstunde keine Zahl mehr geschrieben.' },
    { id: 'gast1', location: 'destille', anchor: 'gast1', name: 'Stammgast', look: { coat: 0x2c2a26, neck: 'scarf', tie: 0x3a3428, hat: 'cap', beard: 'full', glass: true, build: 'stout', pose: 'sit' }, say: '„Wat kiekste denn so? Ick sitz hier seit Sedan, und bis jetzt hat mir noch keener wat jefragt, wat ick wissen wollte.“ Wir sind fertig miteinander.' },
    { id: 'gast2', location: 'destille', anchor: 'gast2', name: 'Stammgast', look: { coat: 0x24282c, hat: 'bowler', moustache: 'walrus', hair: 0x5a5048, glass: true, pose: 'sit' }, say: 'Er stiert in seine Molle und hebt nur einen Finger. Die Berliner Fassung von „Guten Abend“.' },
    { id: 'gast3', location: 'destille', anchor: 'gast3', name: 'Kartenspieler', look: { outfit: 'jacket', coat: 0x3a3a2c, vest: 0x5a4a2a, neck: 'tie', tie: 0x2a2a24, hair: 0x6a5a48, hairStyle: 'receding', beard: 'mutton', moustache: 'brush', build: 'stout', pose: 'sit' }, say: '„Der Herr Leutnant spielt nur noch uff Ehrenwort. Ick nehm’ lieber Jroschen, die kann man wenigstens zählen.“ Er mischt weiter, ohne aufzusehen.' },
  ],

  // Dinge, die erst im Lauf des Falls in einem Ort liegen (world/props.js).
  props: [
    // Wendt legt die Uhr im Gespräch auf die Schreibunterlage und rührt sie nicht wieder an.
    { location: 'bank', anchor: 'savonnette', make: 'savonnette', when: ['f_savonnette'] },
  ],

  hotspots: [
    // Werkstatt
    { location: 'werkstatt', anchor: 'gas', label: 'Gaswandarm', glint: true, radius: 0.35, action: { inspect: {
      title: 'Der Gaswandarm', give: ['c_gas'],
      text: 'Der Hahn steht ganz offen, die Polizei hat nur den Haupthahn im Flur gedreht. Der Glasschirm ist sauber, der Brenner frei. Hier ist nichts defekt. Die Flamme ist ausgegangen, oder jemand hat sie ausgehen lassen.',
    } } },
    { location: 'werkstatt', anchor: 'window', label: 'Fenster', glint: true, radius: 0.6, action: { inspect: {
      title: 'Die Fenster', give: ['c_fenster'],
      text: 'Kessler hat die Fugen sorgfältig mit Papierstreifen beklebt. Winterarbeit, wie in jedem Berliner Haushalt. Kein Riss, keine Lücke. Nicht einmal eine Kerze würde hier flackern. So viel zum Luftzug des Herrn Kommissar.',
    } } },
    // Tasse und Bord je in zwei Fassungen: Wer nur eines gesehen hat, liest nichts über das andere.
    // „Zwei Tassen“ gibt es erst, wenn man beide kennt; die Probe für Dr. Voss schon mit der Tasse.
    { location: 'werkstatt', anchor: 'cup', label: 'Tasse neben dem Sessel', glint: true, radius: 0.22, when: ['!f_bord'], action: { inspect: {
      title: 'Die Tasse', seen: 'f_tasse',
      text: 'Kalter Tee mit einem körnigen Satz, stechend und süßlich zugleich. Schlafende Männer trinken ihren Tee nicht zu Ende. Ich fülle etwas davon in ein Röhrchen. Für Dr. Voss.',
    } } },
    { location: 'werkstatt', anchor: 'cup', label: 'Tasse neben dem Sessel', glint: true, radius: 0.22, when: ['f_bord'], action: { inspect: {
      title: 'Die Tasse', give: ['c_tassen'], seen: 'f_tasse',
      text: 'Kalter Tee mit einem körnigen Satz, stechend und süßlich zugleich. Schlafende Männer trinken ihren Tee nicht zu Ende. Ich fülle etwas davon in ein Röhrchen. Für Dr. Voss. Und auf dem Bord steht ihre frisch gespülte Schwester: Kessler hat nicht allein getrunken.',
    } } },
    { location: 'werkstatt', anchor: 'shelf', label: 'Geschirrbord', glint: true, radius: 0.4, when: ['!f_tasse'], action: { inspect: {
      title: 'Das Geschirrbord', seen: 'f_bord',
      text: 'Drei Tassen unter einer Staubschicht. Eine vierte blitzt sauber, der Boden noch mit Wasserrändern. Hier hat jemand gespült, und zwar genau eine Tasse. Bleibt die Frage, wo die steht, aus der Kessler selbst getrunken hat.',
    } } },
    { location: 'werkstatt', anchor: 'shelf', label: 'Geschirrbord', glint: true, radius: 0.4, when: ['f_tasse'], action: { inspect: {
      title: 'Das Geschirrbord', give: ['c_tassen'], seen: 'f_bord',
      text: 'Drei Tassen unter einer Staubschicht. Eine vierte blitzt sauber, der Boden noch mit Wasserrändern. Hier hat jemand gespült, und zwar genau eine Tasse. Zwei Tassen also: die am Sessel, aus der Kessler trank, und diese, die hinterher jemand sauber gemacht hat.',
    } } },
    { location: 'werkstatt', anchor: 'ash', label: 'Asche am Boden', glint: true, radius: 0.3, range: 3, action: { inspect: {
      title: 'Asche', give: ['c_asche'],
      text: 'Weiß, fest, in einem langen Stück abgefallen. So brennt nur eine gute Havanna; kein Berliner Stumpen und erst recht kein Knaster. Der Mann auf diesem Stuhl hat Geld und saß lange genug, um in Ruhe zu rauchen.',
    } } },
    { location: 'werkstatt', anchor: 'ledger', label: 'Reparaturbuch', glint: true, radius: 0.25, action: { inspect: {
      title: 'Das Reparaturbuch', give: ['c_buch'],
      text: 'Die letzte Seite ist herausgerissen, die Fasern sind noch frisch. Aber Kessler schrieb mit hartem Stift. Ein wenig Graphit über die Folgeseite, und der Abdruck tritt hervor: „Nr. 17. Goldene Repetieruhr. Hr. W…“ Danach wird die Spur zu schwach. Eine goldene Repetieruhr trägt kein Arbeiter. Ein wohlhabender Kunde, dessen Name mit W beginnt.',
    } } },
    { location: 'werkstatt', anchor: 'hooks', label: 'Hakenbrett', glint: true, radius: 0.7, action: { inspect: {
      title: 'Das Hakenbrett', give: ['c_haken'],
      text: 'Vierundzwanzig Haken, jeder mit Nummer. Was Kessler in Arbeit hat, hängt samt Zettel an seinem Platz. Nur Haken 17 ist leer, und zwar so sauber leer, dass ein Staubrand die Stelle markiert, an der bis gestern etwas hing.',
    } } },
    { location: 'werkstatt', anchor: 'clocks', label: 'Uhrenwand', glint: true, radius: 1.0, range: 3.4, action: { inspect: {
      title: 'Die Uhrenwand', give: ['c_uhren'],
      text: 'Jede Uhr läuft, und alle Federn stehen gleich. Dieselbe Hand hat sie zur selben Stunde aufgezogen, wie an jedem Freitagabend um acht, sagt die Nichte. Tote ziehen keine Uhren auf.',
    } } },
    { location: 'werkstatt', anchor: 'blotter', label: 'Löschblatt', glint: true, radius: 0.22, action: { inspect: {
      title: 'Das Löschblatt', give: ['c_loesch'],
      text: 'Die oberste Lage trägt die Spuren eines frisch geschriebenen Briefes, natürlich in Spiegelschrift.',
      mirror: '… muss Sie dringend sprechen wegen des Zettels in Ihrer Uhr. Freitag, 9 Uhr abends. Sonst gehe ich zur Polizei. E. K.',
      mirrorLabel: 'Vor den Rasierspiegel halten',
      after: 'Ein Zettel in einer Uhr, und ein Mann, der damit droht, zur Polizei zu gehen. Einen Empfänger nennt das Blatt nicht. Kessler war zu höflich, um auf dem Löschblatt Namen zu hinterlassen.',
    } } },

    // Werkstatt ohne Hinweis: Stimmung und ein Bild von Kessler, nichts, was den Fall verrät.
    { location: 'werkstatt', anchor: 'chair', label: 'Ohrensessel', radius: 0.45, action: { say: 'Kesslers Sessel. Das Polster hat die Form eines schweren Schlafs behalten. Die Brille hat er abgelegt und neben die Tasse gelegt, die Zeitung ist ihm vom Schoß gerutscht. Wer Gas riecht, legt nicht erst in Ruhe seine Brille ab.' } },
    { location: 'werkstatt', anchor: 'lantern', label: 'Blendlaterne', radius: 0.2, action: { say: 'Die Blendlaterne der Polizei, noch immer auf den Sessel gerichtet, als könnte der Tote etwas gestehen. Piefke hat sie stehen lassen. Petroleum für vielleicht noch eine Stunde.' } },
    { location: 'werkstatt', anchor: 'lathe', label: 'Drehstuhl', radius: 0.22, action: { say: 'Ein Uhrmacherdrehstuhl für Wellen und Zapfen, kaum länger als ein Federhalter. Der Antriebsriemen ist abgenommen und aufgerollt, das Werkzeug liegt an seinem Platz. Kessler hat am Freitag Feierabend gemacht, bevor sein Besuch kam.' } },
    { location: 'werkstatt', anchor: 'domes', label: 'Glasglocke', radius: 0.15, action: { say: 'Offene Uhrwerke unter Glasglocken, gegen den Staub. Ein Mann, der Tabakasche fürchtete wie andere die Cholera, hätte in seiner Werkstatt niemanden rauchen lassen. Es sei denn, er wollte einen Gast nicht verärgern.' } },
    { location: 'werkstatt', anchor: 'watchbox', label: 'Kasten mit Taschenuhren', radius: 0.18, action: { say: 'Sechs Taschenuhren auf rotem Samt, fertig gerichtet, sie warten auf ihre Besitzer. Ich drücke bei jeder auf den Bügel. Keine schlägt.' } },
    { location: 'werkstatt', anchor: 'kettle', label: 'Ofen mit Teekessel', radius: 0.3, action: { say: 'Der Ofen ist kalt, im Kessel steht ein Rest Wasser. Am Freitagabend hat hier jemand Tee aufgebrüht. Für wen, verrät mir der Kessel nicht.' } },
    { location: 'werkstatt', anchor: 'vitrine', label: 'Vitrine im Ladentresen', radius: 0.6, action: { say: 'Taschenuhren auf grünem Samt, unberührt, die Vitrine nicht einmal verschlossen. Ein Dieb hätte hier zuerst zugegriffen. Wer am Freitag hier war, wollte keine Uhr. Er wollte eine bestimmte.' } },

    // Stadt
    { location: 'berlin', anchor: 'litfass', replaces: 'litfass', label: 'Litfaßsäule', glint: true, radius: 0.9, range: 3.2, action: { inspect: {
      title: 'Extrablatt', give: ['c_extrablatt'],
      text: 'Zwischen Wintergarten und Zirkus Renz klebt ein roter Anschlag, noch feucht: „Bankhaus Lindner & Sohn. Der Aufsichtsrat ordnet zur Beruhigung der Einleger eine außerordentliche Revision an. Beginn: Montag, den 14. November.“ Für Berlin ist das seit dem letzten Jahr kein gutes Wort mehr.',
    } } },
    // Was Krause beschreibt: die Durchfahrt neben der Werkstatt und die kaputte Laterne davor.
    // Nur Stimmung, kein Hinweis. Nach Krauses Aussage liest Holmes beides anders.
    { location: 'berlin', anchor: 'durchgang', label: 'Durchfahrt zum Hof', radius: 0.9, range: 3.2, when: ['!c_glocke'], action: { say: 'Eine Tordurchfahrt zum Hof, breit genug für einen Bierwagen. Unter dem Gewölbe ist es so finster, dass ich die eigene Hand kaum sehe. Bis zu Kesslers Ladentür sind es keine zehn Schritte.' } },
    { location: 'berlin', anchor: 'durchgang', label: 'Durchfahrt zum Hof', radius: 0.9, range: 3.2, when: ['c_glocke'], action: { say: 'Hier kam Krauses Herr heraus. Wer Kesslers Laden verlässt, steht unter der Laterne über der Tür, und die brennt. Ein paar Schritte weiter, unter diesem Gewölbe, sieht ihn niemand mehr. Er hat hier gewartet, bis die Straße leer war.' } },
    { location: 'berlin', anchor: 'kaputteLaterne', label: 'Kaputte Laterne', radius: 0.6, range: 4, when: ['!c_glocke'], action: { say: 'Eine Scheibe eingeschlagen, der Brenner kalt, die Scherben liegen noch auf dem Gehweg. Zwischen den brennenden Laternen ist das hier das dunkelste Stück der Rosenthaler Straße.' } },
    { location: 'berlin', anchor: 'kaputteLaterne', label: 'Kaputte Laterne', radius: 0.6, range: 4, when: ['c_glocke'], action: { say: 'Krauses kaputte Laterne. Hier blieb der Mann stehen und ließ seine Uhr schlagen. Wer die Stunde im Dunkeln hören kann, muss kein Streichholz anreißen, das ihm ins Gesicht leuchtet.' } },

    { location: 'berlin', anchor: 'fahrplan', replaces: 'fahrplan', label: 'Fahrplan', glint: true, radius: 0.8, action: { inspect: {
      title: 'Der Fahrplan', give: ['c_fahrplan'],
      text: 'Stadtbahn, Winterfahrplan, unter Glas neben dem Eingang. Nach Westen alle zwanzig Minuten, der letzte Zug nach Charlottenburg um 10.17 Uhr abends. Wer ihn verpasst, geht zu Fuß, eine gute Stunde durch den Tiergarten.',
    } } },

    // Bank
    { location: 'bank', anchor: 'zigarren', label: 'Zigarrenkiste', glint: true, radius: 0.25, action: { inspect: {
      title: 'Die Zigarrenkiste', give: ['c_havanna'],
      text: 'H. Upmann, Havanna. Im Aschenbecher daneben liegt ein langes, weißes, festes Stück. Für einen Prokuristen ein teurer Geschmack, aber das Gehalt kenne ich ja nicht.',
    } } },
    { location: 'bank', anchor: 'buecher', label: 'Hauptbücher', radius: 0.5, action: { say: 'Hauptbuch, Depotbuch, Kontokorrent, frisch gestapelt und mit Papierstreifen gespickt. Für Montag. Niemand räumt so gründlich auf wie jemand, der Besuch erwartet.' } },
    { location: 'bank', anchor: 'kurse', label: 'Kurszettel', radius: 0.25, action: { say: 'Der Kurszettel von gestern, mit Bleistift bearbeitet. Argentinier, Portugiesen, Laurahütte, alle eingekreist, alle fallend. Für einen Bankmann ist das Berufslektüre. Für einen Spieler auch. Am Rand, mehrfach durchgestrichen: „Deckung bis Montag?“' } },
    { location: 'bank', anchor: 'tresor', label: 'Tresor', radius: 0.8, action: { say: 'Ein Panzerschrank von Arnheim, Berliner Wertarbeit. Die Tür ist tadellos. Das Unheil wohnt selten im Schloss, meist bei dem, der den Schlüssel hat.' } },
    { location: 'bank', anchor: 'wendtsUhr', label: 'Wendts Uhr', radius: 0.12, when: ['f_savonnette'], action: { say: 'Die Savonnette liegt aufgeklappt auf der grünen Schreibunterlage, und die kleine Sekunde läuft. Das Schlagwerk hakt nicht mehr. Kessler hat die Uhr noch gerichtet, ehe er ihretwegen sterben musste.' } },
    { location: 'bank', anchor: 'wanduhr', label: 'Wanduhr', radius: 0.5, range: 4, action: { say: 'Eine schöne Regulatoruhr, genau auf die Minute. Der Prokurist schaut oft hinauf.' } },

    // Destille
    { location: 'destille', anchor: 'tafel', label: 'Kreidetafel', radius: 0.6, range: 3.6, action: { say: 'Molle zehn Pfennig, Korn fünf. Darunter, wer anschreiben lässt: „Herr Leutnant: 14 M. 60“, zweimal unterstrichen. Mutter Kluge gibt Kredit, aber sie vergisst nichts.' } },
    { location: 'destille', anchor: 'karten', label: 'Kartentisch', radius: 0.5, action: { say: 'Skat, drei Blätter und ein offener Stich. Das Geld liegt beim Gegner. Auf Rathens Seite nur ein Zettel: „Schulde dem Überbringer zwanzig Mark. Ehrenwort. v. R.“ Ein Ehrenwort, das schon gut im Umlauf ist.' } },

    // Apotheke
    { location: 'apotheke', anchor: 'jars', label: 'Standgefäße', radius: 1.2, range: 3.6, action: { say: 'Tinct. Opii, Sal mirabile, Chinin. Eine ganze Wand von Dingen, die heilen oder töten, je nach Löffel. Die roten Schilder heißen: stark wirkend, nur auf Rezept. Chloralhydrat hat ein rotes. Und alles steht hinter dem Tresen, wohin kein Kunde kommt.' } },
    { location: 'apotheke', anchor: 'rezeptbuch', label: 'Rezeptbuch', radius: 0.22, action: { say: 'Seidels Rezeptbuch, aufgeschlagen, in gestochener Handschrift: Datum, Name, Mittel, Menge. Ich könnte darin blättern. Aber ein Apotheker, den man fragt, erzählt mehr als einer, den man bestiehlt.' } },
    { location: 'apotheke', anchor: 'waage', label: 'Tarierwaage', radius: 0.25, action: { say: 'Eine Handwaage, die auf ein Zehntelgramm genau wiegt. Seidel justiert sie jeden Morgen, man sieht es an den blanken Stellen der Schrauben. Wer Gift in Zehntelgramm abgibt, merkt sich auch, an wen.' } },
    { location: 'apotheke', anchor: 'giftschrank', label: 'Giftschrank', radius: 0.5, range: 3.2, action: { say: 'Venena, weiß auf schwarz, hinter Glas und zwei Schlössern: Morphium, Strychnin, Arsenik. Den Schlüssel trägt Seidel an der Uhrkette. Chloral steht nicht hier: Es gilt nicht als Gift, nur als stark wirkend, und wartet hinter dem Tresen bei den roten Schildern. Jede Abgabe trägt Seidel ins Rezeptbuch ein. Wer Chloral wollte, brauchte ein Rezept und hinterließ damit seinen Namen.' } },
    { location: 'apotheke', anchor: 'wanduhr', label: 'Wanduhr', radius: 0.35, range: 3.5, action: { say: 'Die Uhr, die Kessler vor vier Jahren gerichtet hat. Sie geht auf die Sekunde, und am Aufzugsloch ist das Messing blank. Seidel zieht sie jeden Sonntag auf, wie ein Mann, der seinen Versprechen nachkommt.' } },
    { location: 'apotheke', anchor: 'globus_rot', label: 'Schaugefäß', radius: 0.3, action: { say: 'Gefärbtes Wasser in einem Glaskolben, rot und gegenüber grün: seit Jahrhunderten das Zeichen der Apotheke. Und der einzige Inhalt hier, den man bedenkenlos trinken könnte.' } },
    { location: 'apotheke', anchor: 'globus_gruen', label: 'Schaugefäß', radius: 0.3, action: { say: 'Grün wie das Gift, das es nicht enthält. Nachts leuchtet es bis auf die Straße, für den, der eine Arznei braucht, und für den, der eine sucht.' } },

    // Pension
    { location: 'pension', anchor: 'violine', label: 'Violine', radius: 0.35, action: { play: 'violin', say: 'Sie hat nicht den Ton meiner Stradivari, die liegt in der Baker Street, bei einem Mann, der mich für tot hält. Aber sie tut es.' } },
    { location: 'pension', anchor: 'pantoffel', label: 'Persischer Pantoffel', radius: 0.25, action: { say: 'Mein Tabak, in der Ofenröhre warm gehalten. Gewisse Gewohnheiten überleben sogar den eigenen Tod. Frau Puhlmann hält das für norwegische Sitte.' } },
    { location: 'pension', anchor: 'labor', label: 'Experimentiertisch', radius: 0.8, action: { say: 'Dr. Voss’ Reagenzien neben meinen. Sie behauptet, ihre seien besser beschriftet. Sie hat recht.' } },
    { location: 'pension', anchor: 'briefe', label: 'Briefe an der Vertäfelung', radius: 0.25, action: { say: 'Unbeantwortete Post, mit dem Taschenmesser an die Vertäfelung geheftet. Frau Puhlmann nennt das einen Frevel an echter Eiche. Ich nenne es Ordnung.' } },
    { location: 'pension', anchor: 'zeitungen', label: 'Zeitungsstapel', radius: 0.35, action: { say: 'Die Vossische, das Tageblatt, der Börsen-Courier. Berlin druckt mehr Zeitungen als London, und alle sind sich nur in einem einig: dass die anderen lügen.' } },
    { location: 'pension', anchor: 'diplom', label: 'Gerahmtes Diplom', radius: 0.35, action: { say: 'Doctor medicinae, Universität Zürich, mit Auszeichnung. In Preußen hätte man Dr. Voss nicht einmal in den Hörsaal gelassen. Sie hängt das Diplom genau dorthin, wo jeder Besucher es sieht.' } },
    { location: 'pension', anchor: 'buecher', label: 'Bücherregal', radius: 0.9, action: { say: 'Fontane, Virchow, ein Baedeker von Berlin und ein Band über die Tabakaschen, den angeblich ein Toter geschrieben hat.' } },
  ],

  dialogues: {
    martha: {
      who: 'Martha Kessler',
      start: [{ req: ['f_martha'], node: 'hub' }, { node: 'a' }],
      nodes: {
        a: {
          give: ['f_martha'],
          obs: 'Trauerflor, noch hastig geheftet. Tinte am Zeigefinger: Sie führt jemandem die Bücher. Geweint hat sie, aber nicht heute Abend. Heute Abend ist sie wütend.',
          text: 'Herr Sigerson? Dr. Voss sagt, Sie sehen Dinge, die andere übersehen. Mein Onkel, Emil Kessler, der Uhrmacher aus der Rosenthaler, ist tot. Ich habe ihn heute früh gefunden, im Sessel, die ganze Werkstatt voller Gas.',
          opts: [{ t: 'Erzählen Sie weiter.', go: 'hub' }],
        },
        hub: {
          text: 'Fragen Sie nur.',
          opts: [
            { t: 'Was sagt die Polizei?', go: 'polizei', once: true },
            { t: 'Warum glauben Sie nicht an einen Unfall?', go: 'zweifel', once: true },
            { t: 'Beschreiben Sie mir seine Gewohnheiten.', go: 'gewohnheit', once: true },
            { t: 'Wer könnte ihm Böses gewollt haben?', go: 'feinde', once: true },
            { t: 'Ich brauche den Schlüssel zur Werkstatt.', go: 'schluessel', req: ['!f_schluessel'] },
            { t: 'Bis später, Fräulein Kessler.', end: true, req: ['f_schluessel'] },
          ],
        },
        polizei: { text: 'Kommissar Lehmann vom Präsidium war zehn Minuten da. Die Flamme sei vom Luftzug ausgeblasen worden, das Gas strömte weiter, ein Unglück. Die Akte ist schon zu. Einen Schutzmann hat er vor die Tür gestellt, damit nichts wegkommt.', opts: [{ t: 'Weiter.', go: 'hub' }] },
        zweifel: { text: 'Dreißig Jahre hat er mit Gas gearbeitet und nie den kleinsten Fehler gemacht. Und am Donnerstag war er kreideweiß, als ich ihm das Essen brachte. Er sagte: „Martha, man kennt die Leute nicht, bis man ihre Uhr aufgemacht hat.“ Mehr wollte er nicht sagen.', opts: [{ t: 'Das ist ein interessanter Satz.', go: 'hub' }] },
        gewohnheit: { give: ['c_gewohnheiten'], text: 'Er rauchte nie, Tabakstaub sei Gift fürs Räderwerk. Geschirr ließ er stehen, bis ich am Sonnabend zum Spülen kam. Und freitags um acht zog er alle Uhren auf, jede einzelne, darauf konnte man seine eigene stellen.', opts: [{ t: 'Sehr aufschlussreich.', go: 'hub' }] },
        feinde: { give: ['f_feinde'], text: 'Otto Brandt, seinen Gesellen, hat er vor einer Woche entlassen, weil er trank. Leutnant von Rathen schuldet ihm Geld und hat ihn angebrüllt. Beide finden Sie in der Goldenen Schrippe, Sophienstraße. Sonst nur gute Kundschaft: Apotheker Seidel, Mutter Kluge, und die feinen Herren vom Bankhaus Lindner am Markt, wo Onkel auch sein Erspartes hatte.', opts: [{ t: 'Danke.', go: 'hub' }] },
        schluessel: { give: ['f_schluessel'], text: 'Hier. Die Tür hat ein Schnappschloss, sie fällt von allein zu. Bitte, finden Sie heraus, was geschehen ist. Ich habe nicht viel, aber was ich habe, zahle ich Ihnen.', opts: [{ t: 'Behalten Sie Ihr Geld. Das Rätsel ist Lohn genug.', go: 'hub' }] },
      },
    },

    voss: {
      who: 'Dr. Henriette Voss',
      start: [{ req: ['f_voss'], node: 'hub' }, { node: 'a' }],
      nodes: {
        a: {
          give: ['f_voss'],
          text: 'Nun, „Herr Sigerson“. Sie sind so wenig Norweger wie ich Kaiserin. Aber das geht mich nichts an, solange Sie meine Reagenzien zurückstellen. Dem Mädchen sollten Sie helfen.',
          opts: [{ t: 'Das hatte ich vor, Frau Doktor.', go: 'hub' }],
        },
        hub: {
          text: 'Was kann ich für Sie tun?',
          opts: [
            { t: 'Prüfen Sie bitte diesen Bodensatz aus Kesslers Tasse.', go: 'probe', req: ['f_tasse', '!c_chloral'] },
            { t: 'Wo stehen wir, Ihrer Meinung nach?', hint: true },
            // Erst anklagen, wenn der Täter wirklich eingekreist ist, sonst ließe sich die Lösung erraten.
            { t: 'Ich weiß, wer Emil Kessler getötet hat.', accuse: true, req: ['d_repetier', 'd_luege', '!c_uhr17'] },
            { t: 'Ich weiß, wer Emil Kessler getötet hat.', accuse: true, req: ['c_uhr17'] },
            { t: 'Nichts weiter. Ich gehe wieder hinaus.', end: true },
          ],
        },
        probe: { give: ['c_chloral'], text: 'Geben Sie her. Ein paar Tropfen Natronlauge … riechen Sie das? Chloroform. Das entsteht nur aus einem Stoff: Chloralhydrat. Und nicht wenig. Davon schläft ein Pferd. Rezeptpflichtig übrigens, Herr Sigerson. Jede Apotheke führt darüber Buch.', opts: [{ t: 'Ich danke Ihnen.', go: 'hub' }] },
      },
    },

    piefke: {
      who: 'Schutzmann Piefke',
      start: [{ req: ['f_piefke'], node: 'hub' }, { node: 'a' }],
      nodes: {
        a: {
          give: ['f_piefke'],
          obs: 'Pickelhaube, Bart nach dem Vorbild des Kaisers, nasse Stiefel. Steht seit Stunden hier und findet das unter seiner Würde.',
          text: 'Halt, wo wolln Se denn hin? Hier is jeschlossen. Unjlücksfall. Jas. Herr Kommissar war schon da, die Sache is abjeheftet, und ick steh hier im Regen, weil dit Vorschrift is.',
          opts: [{ t: 'Sigerson. Ich komme im Auftrag der Nichte.', go: 'hub' }],
        },
        hub: {
          text: 'Na, wat is denn noch?',
          opts: [
            { t: 'Wie war die Werkstatt, als Sie kamen?', go: 'fund', once: true },
            { t: 'Darf ich hinein?', go: 'rein', req: ['f_schluessel'] },
            { t: 'Darf ich hinein?', go: 'nein', req: ['!f_schluessel'] },
            { t: 'Glauben Sie selbst an den Unfall?', go: 'glaube', once: true, req: ['d_mord'] },
            { t: 'Guten Abend, Herr Wachtmeister.', end: true },
          ],
        },
        fund: { text: 'Tür zu, Fenster zu, Jestank bis uff die Straße. Dit Frollein hat jeschrien. Die Tür? Schnappschloss. Wer rausjeht, zieht se zu, und denn is se zu. Hat aber keener rausjehn müssen, wa? Wenn’s doch ’n Unfall war.', opts: [{ t: 'Gewiss.', go: 'hub' }] },
        rein: { text: 'Mit’m Schlüssel vom Frollein? Na meinetwejen. Aber nüscht mitnehmen, und wenn Se wat finden: Ick hab nüscht jesehn. Licht is abjestellt, unsere Blendlaterne steht drin.', opts: [{ t: 'Sehr verbunden.', go: 'hub' }] },
        nein: { text: 'Ohne Schlüssel und ohne Jenehmijung? Da könnt ja jeder kommen. Fragen Se dit Frollein Kessler.', opts: [{ t: 'Das werde ich.', go: 'hub' }] },
        glaube: { text: 'Ick? Mir fragt keener. Aber unter uns: Dreißig Jahre Uhrmacher, und denn so wat Dusslijes? Na. Sagen Se’s dem Kommissar, wenn Se Beweise ham. Janz feste Beweise.', opts: [{ t: 'Die werde ich haben.', go: 'hub' }] },
      },
    },

    krause: {
      who: 'Nachtwächter Krause',
      start: [{ req: ['f_krause'], node: 'hub' }, { node: 'a' }],
      nodes: {
        a: {
          give: ['f_krause'],
          obs: 'Laterne in der einen Hand, Stock in der anderen, und unter dem Umhang klirrt ein Schlüsselbund, dem Klang nach groß wie ein Kohlkopf. Grauer Vollbart, darüber wache Augen. Dreißig Jahre Nächte, und er hat keine davon verschlafen, was man ihm nur schwer ansieht.',
          text: 'N’Abend, der Herr. Keen Schlüssel dabei? Fuffzehn Pfennich, denn schließ ick uff. Oder wolln Se nur quatschen? Quatschen kost’ nüscht, is aber ooch nüscht wert.',
          opts: [{ t: 'Haben Sie am Freitagabend etwas bei Kessler bemerkt?', go: 'freitag' }, { t: 'Ein andermal.', end: true }],
        },
        hub: {
          text: 'Na, immer noch unterwegs?',
          opts: [
            { t: 'Was war am Freitagabend bei Kessler?', go: 'freitag', req: ['!c_glocke'] },
            { t: 'Erzählen Sie noch einmal von dem Glöckchen.', go: 'glocke', req: ['c_glocke'] },
            { t: 'Wie sah der Mann aus?', go: 'mann', req: ['c_glocke', '!c_gang'] },
            { t: 'Gute Nacht, Krause.', end: true },
          ],
        },
        freitag: { text: 'Freitag? Jejen zehn, kurz nach, kommt ’n Herr aus’m Durchgang neben Kesslern. Ick steh hinten im Dunkeln. Die Laterne da is ja kaputt, hab’s jemeldet, passiert aber nüscht. Und da bleibt der stehn und denn macht’s pling.', opts: [{ t: 'Es macht … pling?', go: 'glocke' }] },
        glocke: { give: ['c_glocke'], sound: 'repeater', text: 'Pling, pling, pling. Janz fein, wie ’n Glöckchen, und dit direkt aus seiner Weste. Hat er nich mal hinjekiekt, nur so rinjefasst. Hab ick noch nie jehört, ick dachte erst, ick hab wat am Ohr.', opts: [{ t: 'Wie sah der Mann aus?', go: 'mann', req: ['!c_gang'] }, { t: 'Danke, das hilft mir sehr.', go: 'hub' }] },
        mann: { give: ['c_gang'], text: 'Jesicht hab ick nich jesehn, war ja stockduster. Zylinder, feiner Überzieher, und flott unterwegs, Richtung Bahnhof Börse. Keen Stock, keen Humpeln. Wie eener, der die letzte Stadtbahn kriegen will.', opts: [{ t: 'Ausgezeichnet beobachtet.', go: 'hub' }] },
      },
    },

    zuehlke: {
      who: 'Billetknipser Zühlke',
      start: [{ req: ['f_zuehlke'], node: 'hub' }, { node: 'a' }],
      nodes: {
        a: {
          give: ['f_zuehlke'],
          obs: 'Dienstmütze mit rotem Band, die Knipszange an einer Schnur am Knopfloch. Der rechte Daumen schwielig vom Lochen. Er sieht jedem ins Gesicht, der an ihm vorbei will, aus Gewohnheit, nicht aus Neugier.',
          text: 'N’Abend, der Herr. Billet? Richtung Charlottenburg in siebzehn Minuten, neun Uhr siebenundfuffzich. Ohne Billet komm Se an mir nich vorbei, und an mir is noch keener vorbeijekommen.',
          opts: [{ t: 'Kein Billet heute. Nur ein paar Fragen.', go: 'hub' }],
        },
        hub: {
          text: 'Fragen Se, bis der Zug kommt.',
          opts: [
            { t: 'Sie sehen jeden, der hier hinaufgeht?', go: 'jeder', once: true },
            { t: 'Wer kam am Freitag zum letzten Zug nach Westen?', go: 'freitag', req: ['c_gang', '!c_billet'] },
            { t: 'Erzählen Sie noch einmal vom Freitag.', go: 'wendt', req: ['c_billet'] },
            { t: 'Gute Nacht, Zühlke.', end: true },
          ],
        },
        jeder: { text: 'Jeden. Zwölf Stunden am Tag, tausend Billets. Die Jesichter vergess ick, aber die Leute nich: wer immer um sieben fährt, wer mit’m Hund kommt, wer ’n Jroschen zu wenig hat. Wer zu spät kommt, den merk ick mir am längsten. Der rennt.', opts: [{ t: 'Das glaube ich.', go: 'hub' }] },
        freitag: { text: 'Freitag? Der Letzte nach Westen jeht zehn Uhr siebzehn, steht da am Aushang. Da kam eener in letzter Minute, Zylinder, feiner Überzieher, im Laufschritt quer übern Platz. Von da drüben, von der Rosenthaler.', opts: [{ t: 'Nicht aus dem Bankhaus nebenan?', go: 'wendt' }] },
        wendt: { give: ['c_billet'], sound: 'repeater', text: 'Nee, dit hätt ick jesehn, die Tür is ja jleich da. Und wer hinten aus der Hofpforte kommt, kommt von der Burgstraße her, unterm Viadukt lang. Der kam aber quer übern Platz. Komisch war et trotzdem, denn et war der Herr Prokurist Wendt von nebenan. Fährt mit Zeitkarte nach Charlottenburg. Ick sach noch: Herr Prokurist, drei Minuten! Und er fasst in die Weste, und denn macht’s pling, pling, janz fein. Hat nich mal hinjekiekt.', opts: [{ t: 'Sie haben ein gutes Gedächtnis, Zühlke.', go: 'hub' }] },
      },
    },

    lemke: {
      who: 'Portier Lemke',
      start: [{ req: ['f_lemke'], node: 'hub' }, { node: 'a' }],
      nodes: {
        a: {
          give: ['f_lemke'],
          obs: 'Livree mit Messingknöpfen, die er selbst poliert, den Daumen am Ärmelaufschlag. Ein Mann, der seit zwanzig Jahren jeden kennt, der durch diese Tür geht, und jeden grüßt, als täte er es zum ersten Mal.',
          text: 'N’Abend, der Herr. Jeschlossen is eijentlich. Sonst jeh ick um achte, aber heute wart ick, bis der Herr Prokurist mit die Bücher fertig is, wejen die Revision. Wejen Herrn Kessler komm Se? Der arme Mann. Hat mir mal ’ne Feder für zehn Pfennich einjesetzt.',
          opts: [{ t: 'Sehr freundlich. Ich habe noch ein paar Fragen.', go: 'hub' }],
        },
        hub: {
          text: 'Na, wat jibt’s?',
          opts: [
            { t: 'Wann sind Sie am Freitag gegangen?', go: 'freitag', req: ['c_aussage', '!c_portier'] },
            { t: 'Hatte Herr Wendt am Freitag keine Uhr dabei?', go: 'uhr', req: ['f_lemke_freitag', '!c_portier'] },
            { t: 'Erzählen Sie noch einmal von der Uhr.', go: 'uhr', req: ['c_portier'] },
            { t: 'Wie ist Herr Wendt so?', go: 'wendt', once: true },
            { t: 'Gute Nacht, Lemke.', end: true },
          ],
        },
        freitag: { give: ['f_lemke_freitag'], text: 'Um achte, wie immer. Licht im Schalterraum aus, Vordertür zu. Der Herr Prokurist saß noch über die Bücher und hat sich den Schlüssel zur Hofpforte jeben lassen, hinten raus nach der Burgstraße, er wollte später selber jehen. Wann? Weeß ick nich. Um halb neune war ick in Pankow bei Muttern.', opts: [{ t: 'Hatte er keine Uhr dabei?', go: 'uhr' }, { t: 'Danke, Lemke.', go: 'hub' }] },
        uhr: { give: ['c_portier'], sound: 'repeater', text: 'Die Uhr? Die war doch beim Uhrmacher, seit Mittwoch. Dreimal am Tag hat er mir jefragt, wie spät dit is, Freitag um sieben noch. Aber heute früh, wie er rinkommt, steht er im Flur und denn macht’s in seiner Weste: pling, pling. Ick sach noch: Na, Herr Prokurist, is se wieder da? Hat er jetan, als ob er nüscht hört.', opts: [{ t: 'Das ist sehr aufschlussreich.', go: 'hub' }] },
        wendt: { text: 'Fleißig. Erster da, letzter weg, seit Wochen schon. Früher hat er mir zu Weihnachten ’ne Zigarre jeschenkt, ’ne echte Havanna. Dies Jahr wird’s wohl nüscht, so wie der aussieht.', opts: [{ t: 'Verstehe.', go: 'hub' }] },
      },
    },

    seidel: {
      who: 'Apotheker Seidel',
      start: [{ req: ['f_seidel'], node: 'hub' }, { node: 'a' }],
      nodes: {
        a: {
          give: ['f_seidel'],
          obs: 'Die Hände rissig vom vielen Waschen, das Pincenez sauber, der Kittel gestärkt: ein Mann, der in Grammen denkt.',
          text: 'Guten Abend. Nachtdienst, ja, ich habe heute Dienst. Der arme Kessler. Er hat mir vor vier Jahren diese Wanduhr gerichtet. Was darf es sein?',
          opts: [{ t: 'Ich habe ein paar Fragen zu Herrn Kessler.', go: 'hub' }],
        },
        hub: {
          text: 'Bitte.',
          opts: [
            { t: 'Wer in der Nachbarschaft bezieht Chloralhydrat?', go: 'rezept', req: ['c_chloral', '!c_rezept'] },
            { t: 'War Kessler krank? Nahm er etwas zum Schlafen?', go: 'krank', once: true },
            { t: 'Was hört man über Kessler?', go: 'ruf', once: true },
            { t: 'Vielen Dank.', end: true },
          ],
        },
        krank: { text: 'Kessler? Gesund wie ein Pferd. Und gegen Schlafmittel hatte er eine Abneigung, sein Vater ist am Laudanum zugrunde gegangen. Baldrian, mehr hätte er nie genommen.', opts: [{ t: 'Das ist wichtig.', go: 'hub' }] },
        ruf: { text: 'Ehrlich bis zur Unbequemlichkeit. Hat einmal zwanzig Pfennig zurückgetragen, bis nach Moabit. Mit dem Gesellen hatte er seinen Ärger, aber das war mehr Kummer als Zorn.', opts: [{ t: 'Verstehe.', go: 'hub' }] },
        rezept: { give: ['c_rezept'], text: 'Das ist … Nun, Sie fragen wegen Kessler? Sehen wir ins Rezeptbuch. Diese Woche drei: Frau Geheimrat Bötticher am Montag, sie ist 78 und steht nicht mehr auf. Leutnant von Rathen am Mittwoch, wegen des Knies. Und Prokurist Wendt, am Freitagmittag. Merkwürdig, sein letztes Fläschchen ist erst zwei Wochen alt.', opts: [{ t: 'Sehr merkwürdig, ja.', go: 'hub' }] },
      },
    },

    kluge: {
      who: 'Mutter Kluge',
      start: [{ req: ['f_kluge'], node: 'hub' }, { node: 'a' }],
      nodes: {
        a: {
          give: ['f_kluge'],
          obs: 'Unterarme wie ein Droschkenkutscher, Schürze frisch gewendet. Wer bei ihr in der Kreide steht, steht dort bis zum Jüngsten Gericht.',
          text: 'Na, Männecken? ’ne Molle und ’n Korn? Sie sehn aus, als ob Se’s brauchen könnten. Wat’n Sie für eener? Dit Reden is nich berlinisch.',
          opts: [{ t: 'Sigerson, aus Norwegen. Ich habe Fragen zu Otto Brandt.', go: 'hub' }],
        },
        hub: {
          text: 'Na, sach schon.',
          opts: [
            { t: 'Wo war Otto Brandt am Freitagabend?', go: 'alibi', req: ['!c_alibi'] },
            { t: 'Und Leutnant von Rathen?', go: 'rathen', once: true },
            { t: 'Haben Sie gehört, was Kessler passiert ist?', go: 'gehoert', once: true },
            { t: 'Danke, Frau Kluge.', end: true },
          ],
        },
        alibi: { give: ['c_alibi'], text: 'Der Otto? Hier, wo sonst. Um sieben rin, und denn hat er jeheult wie ’n Schlosshund, wejen die Entlassung. Dem janzen Stammtisch uff die Nerven. Um zwölfe hab ick ihn ins Hinterzimmer jeschleift und zujedeckt. Der kam nich mal mehr bis zur Tür.', opts: [{ t: 'Das können alle bezeugen?', go: 'zeugen' }] },
        zeugen: { text: 'Fragen Se doch die Herren da drüben, soweit se noch denken können. Dit Heulen ham se bis Rixdorf jehört.', opts: [{ t: 'Das genügt mir.', go: 'hub' }] },
        rathen: { text: 'Der Herr Leutnant? Kommt und jeht, zahlt selten. Steht ewig am Tisch, weil er dit Knie nich krümmen kann. Freitag? War er hier, jing aber früher, kurz nach neun, und die Treppe vorm Haus hat er wieder zehn Minuten jebraucht. Ohne Stock fällt der um.', opts: [{ t: 'Danke.', go: 'hub' }] },
        gehoert: { text: 'Hat sich rumjesprochen. Anständjer Mann. Hat mir mal die Thekenuhr jemacht und nur die Feder berechnet. Sowat vergess ick nich.', opts: [{ t: 'Das glaube ich Ihnen.', go: 'hub' }] },
      },
    },

    brandt: {
      who: 'Otto Brandt',
      start: [{ req: ['f_brandt'], node: 'hub' }, { node: 'a' }],
      nodes: {
        a: {
          give: ['f_brandt'],
          obs: 'Feine Narben an den Fingerkuppen, Lupenabdruck am rechten Auge: guter Handwerker. Zittrige Hände und Tränensäcke: seit einer Woche keiner mehr. Die Trauer hier ist nicht gespielt.',
          text: 'Wat wolln Se? Von der Polente? Ick war’s nich. Ick hab den Alten jemocht, dit können Se mir jlooben oder nich. Der hat mir allet beijebracht, und ick hab’s versoffen.',
          opts: [{ t: 'Ich bin nicht von der Polizei. Erzählen Sie mir von ihm.', go: 'hub' }],
        },
        hub: {
          text: 'Wat denn noch?',
          opts: [
            { t: 'Warum wurden Sie entlassen?', go: 'entlassen', once: true },
            { t: 'Wie arbeitete Kessler? Wie hielt er Reparaturen fest?', go: 'arbeit', req: ['!c_ritz'] },
            { t: 'Was ist eine Repetieruhr?', go: 'repetier', once: true, req: ['c_buch'] },
            { t: 'Hatte Kessler Feinde?', go: 'feind', once: true },
            { t: 'Halten Sie durch, Brandt.', end: true },
          ],
        },
        entlassen: { text: 'Hab ’ne Taschenuhr vom Kommerzienrat fallen lassen, besoffen. Hat er bezahlt, aus eijener Tasche. Dann hat er jesacht: Otto, wenn du nüchtern bist, kommste wieder. Ick war noch nich nüchtern.', opts: [{ t: 'Das tut mir leid.', go: 'hub' }] },
        arbeit: { give: ['c_ritz'], text: 'Akkurat bis zum Jehtnichtmehr. Buch, Zettel, Haken. Und in jedes Jehäuse hat er innen die Nummer jeritzt, und dit Jahr dazu, janz kleen, siebzehn Strich zweenneunzig, sowat. Sieht keen Kunde. Hat er von seinem Lehrmeister. Kriegste nich weg, ohne dass et jeder Uhrmacher merkt.', opts: [{ t: 'Das ist eine sehr nützliche Gewohnheit.', go: 'hub' }] },
        repetier: { text: 'Feinet Stück! Drücken Se uffn Bügel, schlägt se Ihnen die Stunde und die Viertel vor. Hell, wie ’n Glöckchen. Damit Se im Dunkeln wissen, wie spät et is, ohne Licht zu machen. Kostet mehr, als ick im Leben verdient hab. Und im Deckel is Platz. Da is schon mancher Liebesbrief rumjefahren.', opts: [{ t: 'Platz im Deckel. Danke.', go: 'hub' }] },
        feind: { text: 'Feinde? Der Rathen hat rumjebrüllt, der schuldet ihm für drei Reparaturen, und seine goldne Uhr hat der Meester als Pfand behalten, bis er zahlt. Aber der brüllt immer. Dit janze Bein kaputt und dit janze Jeld weg.', opts: [{ t: 'Verstehe.', go: 'hub' }] },
      },
    },

    rathen: {
      who: 'Egon von Rathen',
      start: [{ req: ['f_rathen'], node: 'hub' }, { node: 'a' }],
      nodes: {
        a: {
          give: ['f_rathen'],
          obs: 'Schmiss auf der linken Wange, die Hose an den Knien glänzend, die Manschetten gewendet. Ein Stumpen, der längst aus ist. Er verlagert das Gewicht unablässig auf den Stock.',
          text: 'Wen haben wir denn da? Ein Fremder, der sich für Karten interessiert? Nein? Dann gehen Sie mir aus dem Licht, ich verliere gerade zwanzig Mark und möchte es in Ruhe tun.',
          opts: [{ t: 'Ich komme wegen Emil Kessler.', go: 'hub' }],
        },
        hub: {
          text: 'Noch immer da?',
          opts: [
            { t: 'Sie haben ihn bedroht, heißt es.', go: 'drohung', once: true },
            { t: 'Ihr Bein. Eine Kriegsverletzung?', go: 'bein', req: ['!c_rathen'] },
            { t: 'Sie beziehen Chloral von Seidel.', go: 'chloral', once: true, req: ['c_rezept'] },
            { t: 'Ich wünsche Ihnen bessere Karten.', end: true },
          ],
        },
        drohung: { text: 'Ich habe ihn angeschrien, ja. Vor der ganzen Straße, wenn’s Ihnen hilft. Er hatte meine Uhr in Pfand und wollte sie nicht herausgeben, solange ich nicht zahle. Völlig im Recht, der Mann, deshalb hat es ja so geärgert. Ihn tot zu wissen bringt mir keinen Pfennig: Die Schuld erbt die Nichte.', opts: [{ t: 'Das stimmt wohl.', go: 'hub' }] },
        bein: { give: ['c_rathen'], text: 'Mars-la-Tour, sechzehnter August siebzig. Das ganze Regiment ist geritten, und das meiste davon liegt noch dort. Ich trage ein Stück französisches Blei im Knie. Ohne diesen Stock komme ich keine drei Schritte. Rauchen Sie? Nein? Meine Stumpen würde ich auch niemandem empfehlen.', opts: [{ t: 'Ich bedaure, Herr Leutnant.', go: 'hub' }] },
        chloral: { give: ['c_flasche'], text: 'Natürlich. Sonst schlafe ich überhaupt nicht. Fragen Sie den Stabsarzt, wenn er noch lebt. Hier, bitte, messen Sie nach. Und dann lassen Sie mich in Ruhe verlieren. Oder wollen Sie mir noch den Kaiser anhängen?', obs: 'Er zieht ein braunes Fläschchen aus der Manteltasche und stellt es hart auf den Kartentisch. Seidels Etikett, Mittwoch. Gut zwei Drittel sind noch darin, der Stöpsel sitzt fest.', opts: [{ t: 'Keineswegs.', go: 'hub' }] },
      },
    },

    wendt: {
      who: 'Reinhold Wendt',
      start: [{ req: ['c_uhr17'], node: 'danach' }, { req: ['f_wendt'], node: 'hub' }, { node: 'a' }],
      nodes: {
        a: {
          give: ['f_wendt'],
          obs: 'Tadellose Manschetten, tadelloser Scheitel, Ränder unter den Augen, die er seit Wochen nicht ausgeschlafen hat. Tinte am Daumen, um diese Stunde an einem Sonnabend. Und eine goldene Uhrkette, straff gespannt.',
          text: 'Guten Abend, mein Herr. Die Bank ist geschlossen, aber wir räumen für die Revision auf, reine Formalität. Der Portier sagt, Sie kommen wegen Herrn Kessler? Eine traurige Geschichte. Er war uns ein treuer Einleger.',
          opts: [{ t: 'Sigerson. Ich helfe der Familie. Nur ein paar Fragen.', go: 'hub' }],
        },
        hub: {
          text: 'Selbstverständlich. Was möchten Sie wissen?',
          opts: [
            { t: 'Kessler hatte eine goldene Repetieruhr in Reparatur, Nummer 17, für einen Herrn W.', go: 'uhr', req: ['c_buch', '!c_aussage'] },
            { t: 'Waren Sie Freitagabend in der Werkstatt?', go: 'freitag', once: true, req: ['c_aussage'] },
            { t: 'Wie spät haben wir eigentlich?', go: 'zeit', req: ['!c_kette'] },
            { t: 'Darf ich Ihre Zigarren bewundern?', go: 'zigarre', req: ['!c_havanna'] },
            { t: 'Was hat es mit der Revision auf sich?', go: 'revision', once: true },
            { t: 'Sie schlafen schlecht, Herr Prokurist.', go: 'schlaf', once: true, req: ['c_rezept'] },
            { t: 'Ihr Portier ging am Freitag um acht.', go: 'portier', once: true, req: ['c_portier'] },
            { t: 'Sie nahmen am Freitag den letzten Zug, Herr Prokurist.', go: 'zug', once: true, req: ['c_billet'] },
            { t: 'Herr Prokurist, Ihre Uhr. Lassen Sie sie mich hören.', go: 'stellen', req: ['d_beweis', 'd_repetier', 'c_portier'] },
            { t: 'Danke für Ihre Zeit.', end: true },
          ],
        },
        uhr: { give: ['c_aussage'], obs: 'Bei „Herrn W.“ hebt er den Kopf, ehe ich den Satz beendet habe. Ich habe nur einen Buchstaben genannt.', text: 'Meine Repetieruhr, richtig. Ein Erbstück, das Schlagwerk hakte. Ich habe sie am Mittwoch hingebracht und seither nicht wiedergesehen. Sie muss noch dort liegen, ich lasse sie bei Gelegenheit abholen. Am Freitagabend? Hier in der Bank, bis spät. Dort war ich nie, wenn Sie darauf hinauswollen.', opts: [{ t: 'Ganz und gar nicht.', go: 'hub' }] },
        freitag: { text: 'Das sagte ich bereits. Ich hatte hier zu tun und bin dann mit der Stadtbahn nach Charlottenburg gefahren. Sie dürfen den Portier fragen. Er geht um acht nach Hause, aber er wird Ihnen sagen, dass ich noch da war.', opts: [{ t: 'Um acht. Natürlich.', go: 'hub' }] },
        zeit: { give: ['c_kette'], text: 'Einen Augenblick. Es ist … zwanzig vor zehn.', obs: 'Seine Hand zuckt zur Westentasche, hält auf halbem Weg inne und greift nach dem Federhalter. Er hebt die Augen zur Wanduhr. Die Kette bleibt straff. Etwas hängt an ihr, und er will es mir nicht zeigen.', opts: [{ t: 'Verbindlichen Dank.', go: 'hub' }] },
        zigarre: { give: ['c_havanna'], text: 'H. Upmann, bedienen Sie sich. Mein einziges Laster, wie meine Frau sagt.', obs: 'Im Aschenbecher liegt ein Stück Asche, lang, weiß und fest.', opts: [{ t: 'Sehr freundlich, später vielleicht.', go: 'hub' }] },
        revision: { text: 'Eine Beruhigungsmaßnahme für das Publikum. Seit den Zusammenbrüchen des vergangenen Jahres zuckt jeder Einleger zusammen, wenn eine Tür knarrt. Der Aufsichtsrat lässt es ja sogar an die Litfaßsäulen kleben. Bei uns ist alles in bester Ordnung, und am Montag wird das jeder sehen.', opts: [{ t: 'Daran zweifle ich nicht.', go: 'hub' }] },
        portier: { text: 'Lemke? Gewiss, um acht geht er. Danach war ich allein hier, mit den Büchern. Ist Fleiß neuerdings verdächtig, Herr Sigerson?', obs: 'Er streicht über die Weste, als wolle er sie glätten. Die Kette ist noch immer straff.', opts: [{ t: 'Fleiß nicht.', go: 'hub' }] },
        stellen: { text: 'Meine Uhr? Ich sagte Ihnen bereits, sie liegt bei Kessler. Ich lasse sie abholen, sobald …', obs: 'Er bricht ab. Die Kette spannt sich über der Weste, und er legt die flache Hand darauf.', opts: [{ t: 'Dann hängt an Ihrer Kette ein auffallend schweres Nichts.', go: 'kette' }] },
        kette: { text: 'Ein Ersatz. Eine einfache Taschenuhr, für die paar Tage. Ich wüsste nicht, was Sie das angeht.', opts: [{ t: 'Lemke hörte sie heute früh in Ihrer Weste schlagen. Krause hörte sie Freitag um zehn, unter der kaputten Laterne.', go: 'schlag' }] },
        schlag: { give: ['f_savonnette'], text: '…', obs: 'Eine lange Weile sagt er nichts. Dann zieht er die Uhr aus der Tasche und legt sie auf die Schreibunterlage, als wäre sie heiß: eine goldene Savonnette mit Repetierschieber am Rand.', opts: [{ t: '(Den Repetierschieber ziehen)', go: 'repetition' }] },
        repetition: { sound: 'repetition', text: 'Das beweist gar nichts. Repetieruhren verkauft jeder Juwelier Unter den Linden.', obs: 'Neun tiefe Schläge, dann dreimal hell und tief: drei Viertel zehn. Und darüber derselbe feine Ton, den Krause für ein Glöckchen hielt.', opts: [{ t: '(Den Rückdeckel aufklappen)', go: 'deckel' }] },
        deckel: { give: ['c_uhr17'], text: 'Ich … ich habe sie am Freitag abgeholt. Das ist kein Verbrechen.', obs: 'Innen im Rückdeckel, wo kein Kunde hinsieht, eine feine Ritzung: 17/92. Der Staubdeckel darunter ist leer, nur am Rand klebt ein Rest Siegellack.', opts: [{ t: 'Um neun Uhr abends, mit Chloral in der Tasche. Erzählen Sie das morgen Kommissar Lehmann.', go: 'ende' }] },
        ende: { text: 'Gehen Sie. Bitte, gehen Sie.', obs: 'Er steckt die Uhr nicht wieder ein. Sie liegt aufgeklappt vor ihm auf der Schreibunterlage, und er sieht dem Sekundenzeiger zu, als zähle er mit. Piefke wird die Nacht über die Hofpforte im Auge behalten; dafür sorge ich auf dem Rückweg.', opts: [{ t: 'Gute Nacht, Herr Prokurist.', end: true }] },
        danach: { text: 'Ich habe Ihnen nichts mehr zu sagen. Sagen Sie es dem Kommissar.', obs: 'Die Uhr liegt noch immer vor ihm auf der Schreibunterlage. Er hat sie nicht wieder angerührt.', opts: [{ t: 'Eine Frage noch: Ihre Zigarren.', go: 'zigarre2', req: ['!c_havanna'] }, { t: 'Das werde ich.', end: true }] },
        zigarre2: { give: ['c_havanna'], text: 'H. Upmann. Nehmen Sie die ganze Kiste, wenn Sie wollen. Ich werde sie nicht mehr brauchen.', obs: 'Im Aschenbecher liegt ein Stück Asche, lang, weiß und fest.', opts: [{ t: 'Danke, nein.', end: true }] },
        zug: { text: 'Ich sagte Ihnen ja, dass ich mit der Stadtbahn gefahren bin. Wann genau, weiß ich nicht mehr. Ich hatte meine Uhr ja nicht bei mir.', after: 'Er sagt es zu schnell. Nach der Uhr hatte ich nicht gefragt.', opts: [{ t: 'Natürlich nicht.', go: 'hub' }] },
        schlaf: { text: 'Das sieht man mir an? Die Geschäfte. Dr. Lessing verschreibt mir etwas dagegen, Seidel hat es vorrätig. Ich nehme es selten. Sehr selten. Warum fragen Sie?', opts: [{ t: 'Reine Teilnahme.', go: 'hub' }] },
      },
    },
  },

  accusation: {
    intro: 'Dr. Voss legt den Federhalter weg und lehnt sich zurück. „Also gut. Ich höre. Und kommen Sie mir nicht mit Vermutungen.“',
    questions: [
      {
        text: 'Wer hat Emil Kessler getötet?',
        options: [
          { t: 'Otto Brandt, der entlassene Geselle', wrong: 'Der Mann saß von sieben bis Mitternacht vor Zeugen in der Schrippe, und Kessler lebte um acht noch. Sehen Sie doch nach, wann die Uhren aufgezogen wurden.' },
          { t: 'Egon von Rathen, der verschuldete Leutnant', wrong: 'Ohne Stock fällt er um, sagt die Wirtin. Und der Nachtwächter sah keinen Stock. Außerdem erbt die Nichte, was er Kessler schuldet, samt der Uhr im Pfand: Was hätte er davon?' },
          { t: 'Reinhold Wendt, der Prokurist', correct: true },
          { t: 'Apotheker Seidel', wrong: 'Der Mann hat Ihnen sein Rezeptbuch gezeigt, ohne zu zögern. Und wozu sollte ein Apotheker ausgerechnet Chloral aus dem eigenen Buch nehmen?' },
        ],
      },
      {
        text: 'Wie wurde die Tat begangen?',
        options: [
          { t: 'Ein Schlag auf den Kopf, danach das Gas', wrong: 'Ein Schlag? Lehmann ist ein Esel, aber eine Kopfwunde hätte selbst er gesehen. Was hat Ihnen denn die Tasse verraten?' },
          { t: 'Chloral im Tee, dann den Gashahn geöffnet', correct: true },
          { t: 'Vergiftete Zigarre', wrong: 'Ich bitte Sie. Kessler rauchte gar nicht. Sie haben zu viele Hintertreppenromane gelesen.' },
          { t: 'Die Fenster verklebt und das Gas von außen aufgedreht', wrong: 'Die Streifen klebte Kessler selbst, wie jeden Winter. Und der Haupthahn liegt im Flur. Der Täter saß im Zimmer und trank Tee mit ihm.' },
        ],
      },
      {
        text: 'Warum musste Kessler sterben?',
        options: [
          { t: 'Aus Rache für die Entlassung', wrong: 'Das passt zu Brandt, und Brandt war es nicht. Lesen Sie das Löschblatt noch einmal.' },
          { t: 'Wegen einer Geldschuld', wrong: 'Der Schuldner bleibt schuldig, auch wenn der Gläubiger tot ist. Lesen Sie das Löschblatt noch einmal.' },
          { t: 'Er fand in der Uhr den Beweis einer Unterschlagung, und am Montag kommt die Revision', correct: true },
          { t: 'Wegen der Erbschaft', wrong: 'Welcher Erbschaft? Das Mädchen erbt eine Werkstatt und das Geld, das Rathen ihm schuldet. Es muss um etwas gehen, das Kessler wusste, nicht um etwas, das er besaß.' },
        ],
      },
      {
        text: 'Womit überführen Sie den Täter vor dem Kommissar?',
        options: [
          { t: 'Mit der Zigarrenasche', wrong: 'Ein Richter hat Ihre Monographie nicht gelesen. Asche kehrt man weg, und halb Berlin raucht Upmann. Ein Beweis muss in der Hand liegen.' },
          { t: 'Mit Krauses Aussage', wrong: 'Er hat das Gesicht nicht gesehen. Ein alter Wächter und ein Pling: Das zerlegt ein guter Anwalt in fünf Minuten.' },
          { t: 'Mit der Uhr in seiner Weste und Kesslers Ritznummer 17/92 im Gehäuse', correct: true },
          { t: 'Mit dem Rezeptbuch', wrong: 'Er hat ein Rezept und einen Arzt. Das beweist nur, dass er schlecht schläft.' },
        ],
      },
    ],
    epilogue: [
      'Sonntagmorgen, Bankhaus Lindner & Sohn. Kommissar Lehmann ist übernächtigt und schlecht gelaunt, bis Schutzmann Piefke die goldene Repetieruhr des Prokuristen vor ihn auf den Tisch legt. Mit einer Lupe liest Otto Brandt, nüchtern zum ersten Mal seit acht Tagen, die winzige Ritzung im Gehäuse vor: 17/92.',
      'Wendt schweigt noch eine Stunde. Dann gesteht er: 86.000 Mark aus Kundendepots, verspekuliert an der Börse, dreihundert Schritt von seinem Schreibtisch entfernt. Die Depotnummern hatte er im Staubdeckel notiert, weil er seinen eigenen Büchern nicht mehr traute. Das Schlagwerk hakte, und er vergaß den Zettel, als er die Uhr zur Reparatur gab. Kessler war kein Mann, der einen solchen Zettel übersah.',
      'Martha Kessler führt die Werkstatt weiter. Otto Brandt zieht jeden Freitag um acht die Uhren auf, und er ist dabei nüchtern.',
      'Nach London dringt davon nichts. Der Name Sigerson steht in keiner Akte: Dafür hat Lehmann gesorgt, der den Ruhm gern allein trägt.',
      'Doch in Wendts Schreibtisch lag noch etwas. Ein Brief ohne Absender, mit dem Rat, wie man an der Börse rasch wieder zu Geld komme, gezeichnet mit zwei Buchstaben, die Dr. Voss nichts sagen und bei deren Anblick Holmes sehr still wird: „S. M.“ Colonel Sebastian Moran ist in Berlin.',
    ],
  },
};
