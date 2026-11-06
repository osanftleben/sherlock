import '@fontsource/unifrakturmaguntia/400.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/eb-garamond/600.css';
import './style.css';
import * as THREE from 'three';
import { GameState } from './core/state.js';
import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { View } from './engine/view.js';
import { Player } from './engine/player.js';
import { UI } from './ui/ui.js';
import { buildBerlin } from './world/berlin.js';
import { buildInteriors } from './world/interiors.js';
import { idleFigure, makeFigure, talkFigure } from './world/figures.js';
import { softDisc } from './world/textures.js';
import { CASES, FIRST_CASE } from './cases/index.js';

const RETORTS = [
  'Nein. Das eine erklärt das andere nicht.',
  'Eine hübsche Idee, aber nur, wenn man die Tatsachen ein wenig biegt.',
  'Watson hätte das geglaubt. Ich nicht.',
  'Diese beiden Dinge haben nichts miteinander zu schaffen.',
  'Man darf die Tatsachen nicht der Theorie anpassen.',
];

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

class Game {
  constructor() {
    this.state = new GameState();
    this.view = new View(document.getElementById('view'));
    this.input = new Input(this.view.renderer.domElement);
    this.audio = new Audio();
    this.ui = new UI(document.getElementById('ui'));
    this.player = new Player(this.view.camera);
    this.locations = {};
    this.speakers = {};
    this.location = null;
    this.mode = 'loading';
    this.target = null;
    this.time = 0;
    this.saveTimer = 0;
    this.travelling = false;
    this.case = CASES[FIRST_CASE];
  }

  async init() {
    this.ui.loading('Die Stadt erwacht …');
    await Promise.all([
      document.fonts.load('40px "UnifrakturMaguntia"'),
      document.fonts.load('20px "EB Garamond"'),
      document.fonts.load('italic 20px "EB Garamond"'),
    ]);
    await nextFrame();

    const berlin = buildBerlin();
    this.locations[berlin.id] = berlin;
    for (const room of buildInteriors()) this.locations[room.id] = room;
    this.applyEnvironments();
    this.applyCase(this.case);

    this.input.onKey = (code) => this.onKey(code);
    this.input.onClick = () => this.interact();
    this.input.onLockLost = () => this.pause();
    this.state.onAdd((id) => this.onLearned(id));

    await nextFrame();
    const { renderer } = this.view;
    for (const loc of Object.values(this.locations)) renderer.compile(loc.scene, this.view.camera);

    this.enter('berlin', { pos: [0, 0, 10], yaw: 0 });
    this.showTitle();
    this.view.fadeTarget = 0;
    this.lastFrame = performance.now();
    renderer.setAnimationLoop(() => this.frame());
  }

  // Sanfte Spiegelung auf nassem Stein und Metall, gebaut aus einer Mini-Szene.
  applyEnvironments() {
    const pmrem = new THREE.PMREMGenerator(this.view.renderer);
    const make = (top, bottom, glow) => {
      const scene = new THREE.Scene();
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(10, 16, 12),
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          uniforms: { top: { value: new THREE.Color(top) }, bottom: { value: new THREE.Color(bottom) } },
          vertexShader: 'varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
          fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying float vY; void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.2, 0.4, vY)), 1.0); }',
        }),
      );
      scene.add(sphere);
      for (let i = 0; i < 6; i++) {
        const blob = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(glow) }));
        const a = (i / 6) * Math.PI * 2;
        blob.position.set(Math.cos(a) * 8, 1.6, Math.sin(a) * 8);
        scene.add(blob);
      }
      return pmrem.fromScene(scene, 0.04).texture;
    };
    const street = make(0x28344c, 0x0a0c10, 0xff9a4a);
    const room = make(0x4a3a28, 0x1a120c, 0xffb070);
    for (const loc of Object.values(this.locations)) {
      const outdoors = loc.ambience === 'street';
      loc.scene.environment = outdoors ? street : room;
      loc.scene.environmentIntensity = outdoors ? 0.55 : 0.3;
    }
    pmrem.dispose();
  }

  applyCase(c) {
    for (const def of c.hotspots) {
      const loc = this.locations[def.location];
      const a = loc.anchors[def.anchor];
      if (def.replaces) loc.hotspots = loc.hotspots.filter((s) => s.id !== def.replaces);
      const spot = loc.addHotspot({ ...def, pos: a.pos.clone() });
      if (def.glint) this.addGlint(loc, spot);
    }
    for (const npc of c.npcs) {
      const loc = this.locations[npc.location];
      const a = loc.anchors[npc.anchor];
      const fig = makeFigure(npc.look);
      if (npc.dialog) this.speakers[npc.dialog] = fig;
      fig.position.copy(a.pos);
      fig.rotation.y = a.yaw;
      loc.scene.add(fig);
      loc.collide(a.pos.x - 0.28, a.pos.x + 0.28, a.pos.z - 0.28, a.pos.z + 0.28);
      loc.onUpdate((dt, t, { camera }) => idleFigure(fig, t, camera.position));
      loc.addHotspot({
        id: `npc_${npc.id}`,
        pos: [a.pos.x, a.pos.y + 1.45, a.pos.z],
        radius: 0.6,
        range: 3.2,
        label: npc.name,
        action: npc.dialog ? { dialog: npc.dialog } : { say: npc.say },
      });
    }
  }

  // Kleines Funkeln, damit winzige Spuren im Halbdunkel auffindbar bleiben.
  addGlint(loc, spot) {
    const inspect = spot.action.inspect;
    const doneKey = inspect && (inspect.seen || (inspect.give && inspect.give[0]));
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softDisc('glint'),
      color: 0xfff0c0,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    sprite.position.copy(spot.pos);
    loc.scene.add(sprite);
    loc.onUpdate((dt, t, { camera }) => {
      const near = camera.position.distanceTo(spot.pos) < 6.5;
      sprite.visible = near && !(doneKey && this.state.has(doneKey));
      if (sprite.visible) sprite.scale.setScalar(0.075 + 0.03 * Math.sin(t * 3 + spot.pos.x * 5));
    });
  }

  showTitle() {
    this.mode = 'title';
    this.input.lookEnabled = false;
    this.input.unlock();
    this.ui.setHud(false);
    this.ui.title({
      canContinue: GameState.hasSave(),
      caseInfo: this.case,
      onNew: () => this.newGame(),
      onContinue: () => this.continueGame(),
    });
    this.enter('berlin', { pos: [0, 0, 10], yaw: 0 });
    this.titleYaw = 0;
  }

  newGame() {
    this.audio.start();
    GameState.clearSave();
    this.state.reset();
    this.state.caseId = this.case.id;
    this.mode = 'story';
    this.ui.story(this.case.intro, () => {
      this.travel(this.case.start.location, this.locations[this.case.start.location].spawn, () => {
        this.openDialog(this.case.start.dialog);
      });
    });
  }

  continueGame() {
    this.audio.start();
    this.state.load();
    const id = this.state.location && this.locations[this.state.location] ? this.state.location : this.case.start.location;
    const spawn = this.state.player || this.locations[id].spawn;
    this.travel(id, spawn, () => this.setPlay());
  }

  enter(id, spawn) {
    this.location = this.locations[id];
    this.view.setLocation(this.location);
    this.player.teleport(spawn.pos, spawn.yaw, this.location);
    this.audio.setEnvironment(this.location.ambience);
    this.state.location = id;
    this.state.player = { pos: spawn.pos, yaw: spawn.yaw };
  }

  // Abblenden, Ort wechseln, einblenden.
  travel(id, spawn, then) {
    if (this.travelling) return;
    this.travelling = true;
    this.ui.clear();
    this.mode = 'travel';
    this.input.lookEnabled = false;
    this.view.fadeTarget = 1;
    setTimeout(() => {
      this.enter(id, spawn);
      this.view.fadeTarget = 0;
      this.travelling = false;
      this.ui.showBanner(this.location.name);
      this.ui.setHud(true);
      this.state.save();
      if (then) then();
      else this.setPlay();
    }, 320);
  }

  setPlay() {
    this.ui.clear();
    this.mode = 'play';
    this.ui.setHud(true);
    this.ui.setKeys(true);
    this.input.lookEnabled = true;
    this.input.lock();
    this.updateObjective();
  }

  setMenu(mode) {
    this.mode = mode;
    this.input.lookEnabled = false;
    this.input.unlock();
    this.ui.setPrompt(null);
    this.ui.setKeys(false);
  }

  pause() {
    if (this.mode !== 'play') return;
    this.setMenu('pause');
    this.state.save();
    this.ui.pause({
      onResume: () => this.setPlay(),
      onTitle: () => {
        this.state.save();
        this.showTitle();
      },
    });
  }

  onKey(code) {
    this.audio.start();
    if (this.ui.handleKey(code)) return;
    if (this.mode !== 'play') return;
    if (code === 'KeyE') this.interact();
    else if (code === 'KeyN' || code === 'Tab') this.openNotebook('clues');
    else if (code === 'KeyM') this.openNotebook('map');
    else if (code === 'Escape') this.pause();
  }

  interact() {
    if (this.mode !== 'play' || !this.target) return;
    const spot = this.target;
    const a = spot.action;
    if (a.door) {
      const rule = this.case.doors[a.door];
      if (rule && !this.state.check(rule.requires)) {
        this.showCard(spot.label, rule.message);
        return;
      }
      this.audio.door();
      this.travel(a.to, this.locations[a.to].spawn);
    } else if (a.exit) {
      this.audio.door();
      this.travel('berlin', this.locations.berlin.exits[this.location.id]);
    } else if (a.dialog) {
      this.openDialog(a.dialog);
    } else if (a.inspect) {
      this.openInspect(a.inspect);
    } else if (a.say) {
      if (a.play) this.audio[a.play]();
      this.showCard(spot.label, a.say);
    }
  }

  showCard(title, text) {
    this.setMenu('inspect');
    this.audio.page();
    this.ui.inspect({ title, text, onClose: () => this.setPlay() });
  }

  openInspect(item) {
    this.setMenu('inspect');
    this.audio.page();
    const give = () => {
      if (item.seen) this.state.add(item.seen);
      for (const id of item.give || []) this.state.add(id);
      this.state.save();
    };
    if (!item.mirror) give();
    this.ui.inspect({
      title: item.title,
      text: item.text,
      mirror: item.mirror,
      mirrorLabel: item.mirrorLabel,
      after: item.after,
      onReveal: give,
      onClose: () => this.setPlay(),
    });
  }

  openDialog(id) {
    const dlg = this.case.dialogues[id];
    this.setMenu('dialog');
    // Etwas unter den Kopf zielen, damit das Gesicht über dem Dialogfeld bleibt.
    const speaker = this.location.hotspots.find((s) => s.action.dialog === id);
    this.player.focus = speaker ? { x: speaker.pos.x, y: speaker.pos.y - 0.5, z: speaker.pos.z } : null;
    let start = dlg.start;
    if (Array.isArray(start)) start = start.find((s) => this.state.check(s.req)).node;
    this.showNode(id, start);
  }

  showNode(id, nodeId, override) {
    const dlg = this.case.dialogues[id];
    const node = dlg.nodes[nodeId];
    for (const g of node.give || []) this.state.add(g);
    if (node.sound) this.audio[node.sound]();
    const options = node.opts
      .map((o, i) => ({ ...o, key: `o_${id}_${nodeId}_${i}` }))
      .filter((o) => this.state.check(o.req) && !(o.once && this.state.has(o.key)));
    if (!options.length) options.push({ t: 'Auf Wiedersehen.', end: true });
    // Die Figur spricht ungefähr so lange, wie man zum Lesen ihrer Zeilen braucht.
    const speaker = this.speakers[id];
    const spoken = override || node.text || '';
    if (speaker) talkFigure(speaker, this.time + Math.min(6, 1.2 + spoken.length * 0.03));
    this.ui.dialog({
      who: node.who || dlg.who,
      obs: override ? null : node.obs,
      text: override || node.text,
      options,
      onChoose: (o) => {
        this.audio.page();
        if (o.once) this.state.known.add(o.key);
        if (o.accuse) this.startAccusation();
        else if (o.hint) this.showNode(id, nodeId, this.currentObjective()?.hint || 'Ich wüsste nicht, was noch fehlt.');
        else if (o.end) {
          this.state.save();
          this.setPlay();
        } else this.showNode(id, o.go);
      },
    });
  }

  currentObjective() {
    return this.case.objectives.find((o) => !this.state.check(o.until));
  }

  updateObjective() {
    const o = this.currentObjective();
    this.ui.setObjective(o ? o.text : null);
  }

  onLearned(id) {
    if (id.startsWith('c_')) {
      this.audio.chime();
      this.ui.toast('clue', this.case.clues[id].title);
    } else if (id.startsWith('d_')) {
      this.audio.deduction();
      this.ui.toast('deduction', this.case.deductions[id].title);
    }
    this.updateObjective();
  }

  openNotebook(tab) {
    this.setMenu('notebook');
    this.audio.page();
    const { state } = this;
    const c = this.case;
    const book = {
      objective: this.currentObjective()?.text,
      clues: () => Object.keys(c.clues).filter((k) => state.has(k)).map((k) => ({ id: k, ...c.clues[k] })),
      deductions: () => Object.keys(c.deductions).filter((k) => state.has(k)).map((k) => c.deductions[k]),
      deductionTotal: Object.keys(c.deductions).length,
      people: () => c.people.filter((p) => state.check(p.when)),
      combine: (a, b) => this.combine(a, b),
      map: this.locations.berlin.map,
      playerAt: () => this.mapPosition(),
      onClose: () => this.setPlay(),
    };
    this.ui.notebook(book, tab);
  }

  // Drinnen zeigt der Plan die Tür des Hauses, in dem man gerade ist.
  mapPosition() {
    if (this.location.id === 'berlin') {
      return { x: this.player.pos.x, z: this.player.pos.z, yaw: this.player.yaw };
    }
    const exit = this.locations.berlin.exits[this.location.id];
    return exit ? { x: exit.pos[0], z: exit.pos[2], yaw: exit.yaw } : null;
  }

  combine(a, b) {
    const hit = Object.entries(this.case.deductions).find(([, d]) =>
      d.pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a)));
    if (!hit) {
      const key = [a, b].sort().join('+');
      this.state.triedPairs.add(key);
      return { text: RETORTS[this.state.triedPairs.size % RETORTS.length] };
    }
    const [id, deduction] = hit;
    if (this.state.has(id)) return { text: `Das hatte ich schon erkannt: ${deduction.title}.` };
    this.state.add(id);
    this.state.save();
    return deduction;
  }

  startAccusation() {
    const { accusation } = this.case;
    const ask = (i) => {
      const question = accusation.questions[i];
      this.ui.accusation({
        intro: i === 0 ? accusation.intro : null,
        question,
        index: i,
        total: accusation.questions.length,
        onAnswer: (option) => {
          this.audio.page();
          if (!option.correct) {
            this.state.attempts += 1;
            this.state.save();
            this.ui.dialog({
              who: 'Dr. Henriette Voss',
              text: option.wrong,
              options: [{ t: 'Sie haben recht. Ich sehe es mir noch einmal an.' }],
              onChoose: () => this.setPlay(),
            });
          } else if (i + 1 < accusation.questions.length) {
            ask(i + 1);
          } else {
            this.finishCase();
          }
        },
        onCancel: () => this.setPlay(),
      });
    };
    this.setMenu('accuse');
    ask(0);
  }

  finishCase() {
    const { state } = this;
    state.solved = true;
    state.add('f_geloest');
    state.save();
    this.audio.deduction();
    this.ui.setHud(false);
    const total = Object.keys(this.case.deductions).length;
    const found = Object.keys(this.case.deductions).filter((k) => state.has(k)).length;
    let verdict = 'Beim ersten Versuch. Watson würde darüber schreiben, wenn er es wüsste.';
    if (state.attempts === 1) verdict = 'Beim zweiten Versuch. Auch mir gelingt nicht immer alles auf Anhieb.';
    if (state.attempts > 1) verdict = `Nach ${state.attempts} Fehlversuchen. Dr. Voss sagt nichts, aber sie lächelt.`;
    this.ui.ending({
      paragraphs: this.case.accusation.epilogue,
      tally: `${verdict} ${found} von ${total} Schlüssen gezogen.`,
      onRoam: () => this.setPlay(),
      onTitle: () => this.showTitle(),
    });
  }

  frame() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.time += dt;
    const { camera } = this.view;

    if (this.mode === 'title') {
      // Langsamer Schwenk über den Markt hinter dem Titelbild.
      this.titleYaw += dt * 0.025;
      this.player.yaw = Math.sin(this.titleYaw) * 0.5;
      this.player.apply();
    } else {
      this.player.update(dt, this.input, this.location, this.audio, this.mode === 'play');
    }

    this.location.update(dt, this.time, { camera, player: this.player });
    this.audio.update(dt, this.location.trainDistance ?? Infinity);

    if (this.mode === 'play') {
      this.target = this.player.findTarget(this.location, this.state);
      this.ui.setPrompt(this.target ? this.target.label : null);
      this.saveTimer -= dt;
      if (this.saveTimer < 0) {
        this.saveTimer = 5;
        this.state.player = { pos: [this.player.pos.x, 0, this.player.pos.z], yaw: this.player.yaw };
        this.state.save();
      }
    } else {
      this.target = null;
    }

    this.view.adapt(dt);
    this.view.render(dt, this.time);
  }
}

const game = new Game();
game.init().catch((err) => {
  console.error(err);
  document.getElementById('ui').textContent = `Das Spiel konnte nicht starten: ${err.message}`;
});
if (import.meta.env.DEV) window.__game = game;
