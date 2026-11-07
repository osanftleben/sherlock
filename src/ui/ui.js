// Die gesamte Oberfläche als DOM über dem Canvas. Sie kennt das Spiel nur über Rückrufe.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, className, onClick) {
  const b = el('button', className, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

export class UI {
  constructor(root) {
    this.root = root;
    this.reticle = el('div', 'reticle');
    this.prompt = el('div', 'prompt');
    this.prompt.hidden = true;
    this.objective = el('div', 'objective');
    this.keys = el('div', 'keys', 'WASD gehen · Umschalt laufen · E untersuchen · N Notizbuch · M Stadtplan');
    this.banner = el('div', 'banner');
    this.toasts = el('div', 'toasts');
    this.layer = el('div');
    this.hud = el('div');
    this.hud.append(this.reticle, this.prompt, this.objective, this.keys, this.banner);
    root.append(this.hud, this.toasts, this.layer);
    this.hud.hidden = true;
    this.keyHandler = null;
    this.tab = 'clues';
  }

  clear() {
    this.layer.replaceChildren();
    this.keyHandler = null;
  }

  setHud(visible) {
    this.hud.hidden = !visible;
  }

  setKeys(visible) {
    this.keys.hidden = !visible;
    this.reticle.hidden = !visible;
  }

  setPrompt(label) {
    this.reticle.classList.toggle('on', !!label);
    if (this.lastPrompt === label) return;
    this.lastPrompt = label;
    this.prompt.hidden = !label;
    if (!label) return;
    const key = el('kbd', '', 'E');
    this.prompt.replaceChildren(key, document.createTextNode(label));
  }

  setObjective(text) {
    if (!text) {
      this.objective.replaceChildren();
      return;
    }
    this.objective.replaceChildren(el('small', '', 'Nächster Schritt'), document.createTextNode(text));
  }

  showBanner(name) {
    this.banner.textContent = name;
    this.banner.classList.add('on');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.banner.classList.remove('on'), 2600);
  }

  toast(kind, title) {
    const t = el('div', `toast${kind === 'deduction' ? ' deduction' : ''}`);
    t.append(el('small', '', kind === 'deduction' ? 'Schlussfolgerung' : 'Neuer Hinweis'), document.createTextNode(title));
    this.toasts.append(t);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
    setTimeout(() => t.remove(), 5000);
  }

  loading(text) {
    this.clear();
    const s = el('div', 'screen solid');
    s.append(el('h1', '', 'Berlin, 1892'), el('p', 'sub', text));
    this.layer.append(s);
  }

  // cases: [{ id, number, title, status: 'neu' | 'begonnen' | 'geloest' | 'gesperrt', current, after }]
  title({ cases, onNew, onContinue }) {
    this.clear();
    const s = el('div', 'screen');
    s.append(el('h1', '', 'Sherlock Holmes'), el('h1', '', 'in Berlin'));
    const list = el('div', 'cases');
    const STATUS = { neu: '', begonnen: 'Begonnen', geloest: 'Gelöst' };
    for (const c of cases) {
      const card = el('div', `case ${c.status}`);
      card.append(el('p', 'number', c.number), el('p', 'sub', c.title));
      const menu = el('div', 'menu');
      if (c.status === 'gesperrt') {
        card.append(el('p', 'state', `Erst nach „${c.after}“`));
      } else {
        if (STATUS[c.status]) card.append(el('p', 'state', STATUS[c.status]));
        if (c.status === 'neu') {
          menu.append(button('Beginnen', '', () => onNew(c.id)));
        } else {
          menu.append(
            button(c.status === 'geloest' ? 'Weiter umsehen' : 'Fortsetzen', '', () => onContinue(c.id)),
            button('Von vorn', '', () => onNew(c.id)),
          );
        }
      }
      card.append(menu);
      list.append(card);
    }
    s.append(list);
    const controls = el('p', 'controls');
    controls.innerHTML = 'WASD oder Pfeiltasten gehen · Maus schauen · Umschalt laufen<br>E oder Klick untersuchen · N Notizbuch · M Stadtplan · Esc Pause';
    s.append(controls);
    this.layer.append(s);
  }

  story(paragraphs, onDone) {
    let i = 0;
    const show = () => {
      this.clear();
      const s = el('div', 'screen solid');
      s.append(el('p', 'story', paragraphs[i]));
      const menu = el('div', 'menu');
      const next = () => {
        i++;
        if (i < paragraphs.length) show();
        else onDone();
      };
      menu.append(button(i < paragraphs.length - 1 ? 'Weiter' : 'Beginnen', '', next));
      s.append(menu);
      this.layer.append(s);
      this.keyHandler = (code) => {
        if (code === 'Space' || code === 'Enter') next();
      };
    };
    show();
  }

  pause({ onResume, onTitle }) {
    this.clear();
    const s = el('div', 'screen');
    s.append(el('h1', '', 'Pause'));
    const menu = el('div', 'menu');
    menu.style.marginTop = '24px';
    menu.append(button('Weiter', '', onResume), button('Zum Titel', '', onTitle));
    s.append(menu);
    this.layer.append(s);
    this.keyHandler = (code) => {
      if (code === 'Escape') onResume();
    };
  }

  dialog({ who, obs, text, options, onChoose }) {
    this.clear();
    const d = el('div', 'dialog');
    d.append(el('h3', '', who));
    if (obs) d.append(el('p', 'obs', obs));
    d.append(el('p', 'line', text));
    const opts = el('div', 'opts');
    options.forEach((o, i) => {
      const b = button('', '', () => onChoose(o));
      b.append(el('b', '', `${i + 1}.`), document.createTextNode(o.t));
      opts.append(b);
    });
    d.append(opts);
    this.layer.append(d);
    this.keyHandler = (code) => {
      const m = code.match(/^(?:Digit|Numpad)(\d)$/);
      if (m && options[Number(m[1]) - 1]) onChoose(options[Number(m[1]) - 1]);
    };
  }

  inspect({ title, text, mirror, mirrorLabel, after, onReveal, onClose }) {
    this.clear();
    const c = el('div', 'card');
    c.append(el('h2', '', title), el('p', '', text));
    const actions = el('div', 'actions');
    const close = button('Zurück', 'btn', onClose);
    let revealed = !mirror;
    if (mirror) {
      const m = el('p', 'mirror', mirror);
      c.append(m);
      const reveal = button(mirrorLabel || 'Im Spiegel lesen', 'btn', () => {
        revealed = true;
        m.replaceWith(el('p', 'revealed', mirror));
        if (after) c.insertBefore(el('p', '', after), actions);
        reveal.remove();
        if (onReveal) onReveal();
      });
      actions.append(reveal);
    }
    actions.append(close);
    c.append(actions);
    this.layer.append(c);
    this.keyHandler = (code) => {
      if (code === 'Escape' || code === 'KeyE' || code === 'Space' || code === 'Enter') {
        if (revealed || code === 'Escape') onClose();
      }
    };
  }

  // Notizbuch; `book` liefert jederzeit den aktuellen Stand.
  notebook(book, tab = this.tab) {
    this.tab = tab;
    this.clear();
    const p = el('div', 'panel');
    const head = el('header');
    head.append(el('h2', '', 'Notizbuch'));
    const tabs = el('div', 'tabs');
    const names = { clues: 'Hinweise', deductions: 'Schlüsse', people: 'Personen', map: 'Stadtplan' };
    for (const [key, name] of Object.entries(names)) {
      const b = button(name, key === tab ? 'on' : '', () => this.notebook(book, key));
      tabs.append(b);
    }
    head.append(tabs, button('Schließen', 'btn', book.onClose));
    p.append(head);
    const page = el('div', 'page');
    p.append(page);
    this.layer.append(p);

    if (tab === 'clues') this.renderClues(p, page, book);
    if (tab === 'deductions') this.renderDeductions(page, book);
    if (tab === 'people') this.renderPeople(page, book);
    if (tab === 'map') this.renderMap(page, book);

    this.keyHandler = (code) => {
      if (code === 'Escape' || code === 'Tab' || code === 'KeyN') book.onClose();
      // M schaltet den Stadtplan um wie N das Notizbuch: Wer ihn mit M geöffnet hat, schließt ihn mit M.
      if (code === 'KeyM') {
        if (tab === 'map') book.onClose();
        else this.notebook(book, 'map');
      }
    };
  }

  renderClues(panel, page, book) {
    if (book.objective) page.append(el('p', 'goal', `Nächster Schritt: ${book.objective}`));
    const clues = book.clues();
    if (!clues.length) {
      page.append(el('p', 'empty', 'Noch keine Hinweise. „Es ist ein kapitaler Fehler, Theorien aufzustellen, bevor man Daten hat.“'));
      return;
    }
    const picked = new Set();
    const titles = Object.fromEntries(clues.map((c) => [c.id, c.title]));
    const bar = el('div', 'combine');
    const result = el('div', 'result', 'Wählen Sie zwei Hinweise aus, die zusammengehören.');
    // Die Auswahl steht unten in der Leiste, denn beim Blättern verschwindet der erste Hinweis aus dem Bild.
    const showPicked = () => {
      const names = [...picked].map((id) => `„${titles[id]}“`);
      result.textContent = names.length === 2 ? `${names[0]} und ${names[1]} verknüpfen?`
        : names.length === 1 ? `${names[0]} und …?` : 'Wählen Sie zwei Hinweise aus, die zusammengehören.';
    };
    const go = button('Verknüpfen', 'btn', () => {
      const [a, b] = [...picked];
      const outcome = book.combine(a, b);
      // Auf der Seite bleiben, damit man gleich weiter verknüpfen kann; der Schluss steht unten.
      result.textContent = outcome.title ? `Neuer Schluss: ${outcome.title}. ${outcome.text}` : outcome.text;
      picked.clear();
      page.querySelectorAll('.clue.sel').forEach((n) => n.classList.remove('sel'));
      go.disabled = true;
    });
    go.disabled = true;
    for (const c of clues) {
      const b = button('', 'clue', () => {
        if (picked.has(c.id)) {
          picked.delete(c.id);
          b.classList.remove('sel');
        } else {
          if (picked.size === 2) return;
          picked.add(c.id);
          b.classList.add('sel');
        }
        go.disabled = picked.size !== 2;
        showPicked();
      });
      b.append(el('b', '', c.title), document.createTextNode(c.text));
      page.append(b);
    }
    bar.append(result, go);
    panel.append(bar);
  }

  renderDeductions(page, book) {
    const list = book.deductions();
    if (!list.length) {
      page.append(el('p', 'empty', 'Noch keine Schlüsse. Verknüpfen Sie Hinweise, die zusammengehören.'));
      return;
    }
    for (const d of list) {
      const row = el('div', 'deduction');
      row.append(el('b', '', d.title), document.createTextNode(d.text));
      page.append(row);
    }
    page.append(el('p', 'empty', `${list.length} von ${book.deductionTotal} möglichen Schlüssen gezogen.`));
  }

  renderPeople(page, book) {
    for (const person of book.people()) {
      const row = el('div', 'person');
      row.append(el('b', '', `${person.name}: `), document.createTextNode(person.role));
      page.append(row);
    }
  }

  renderMap(page, book) {
    page.style.overflow = 'hidden';
    const c = el('canvas', 'map');
    page.append(c);
    const rect = page.getBoundingClientRect();
    const ratio = devicePixelRatio || 1;
    c.width = Math.max(10, rect.width - 8) * ratio;
    c.height = Math.max(10, rect.height - 24) * ratio;
    drawMap(c, book.map, book.playerAt(), ratio);
  }

  accusation({ intro, question, index, total, onAnswer, onCancel }) {
    this.clear();
    const c = el('div', 'card');
    c.append(el('h2', '', 'Die Lösung'));
    if (intro) c.append(el('p', '', intro));
    c.append(el('p', 'progress', `Frage ${index + 1} von ${total}`), el('p', '', question.text));
    const list = el('div', 'choices');
    question.options.forEach((o) => list.append(button(o.t, 'btn', () => onAnswer(o))));
    c.append(list);
    const actions = el('div', 'actions');
    actions.append(button('Noch nicht', 'btn', onCancel));
    c.append(actions);
    this.layer.append(c);
    this.keyHandler = (code) => {
      if (code === 'Escape') onCancel();
    };
  }

  ending({ paragraphs, tally, onRoam, onTitle }) {
    this.clear();
    let i = 0;
    const show = () => {
      this.layer.replaceChildren();
      const s = el('div', 'screen solid');
      if (i === paragraphs.length) {
        s.append(el('h1', '', 'Fall gelöst'), el('p', 'tally', tally));
        const menu = el('div', 'menu');
        menu.append(button('Weiter durch Berlin streifen', '', onRoam), button('Zum Titel', '', onTitle));
        s.append(menu);
        this.keyHandler = null;
      } else {
        s.append(el('p', 'story', paragraphs[i]));
        const menu = el('div', 'menu');
        const next = () => {
          i++;
          show();
        };
        menu.append(button('Weiter', '', next));
        s.append(menu);
        this.keyHandler = (code) => {
          if (code === 'Space' || code === 'Enter') next();
        };
      }
      this.layer.append(s);
    };
    show();
  }

  handleKey(code) {
    if (this.keyHandler) {
      this.keyHandler(code);
      return true;
    }
    return false;
  }
}

function drawMap(canvas, map, player, ratio) {
  const ctx = canvas.getContext('2d');
  const { bounds } = map;
  const pad = 26 * ratio;
  const worldW = bounds.maxX - bounds.minX;
  const worldH = bounds.maxZ - bounds.minZ;
  const scale = Math.min((canvas.width - pad * 2) / worldW, (canvas.height - pad * 2) / worldH);
  const ox = (canvas.width - worldW * scale) / 2;
  const oy = (canvas.height - worldH * scale) / 2;
  const X = (x) => ox + (x - bounds.minX) * scale;
  const Z = (z) => oy + (z - bounds.minZ) * scale;

  ctx.fillStyle = '#d8caa6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const rect = (r, fill) => {
    ctx.fillStyle = fill;
    ctx.fillRect(X(r.x0), Z(r.z0), (r.x1 - r.x0) * scale, (r.z1 - r.z0) * scale);
  };
  rect(map.water, '#8ea3a6');
  rect(map.rail, '#8c6f5a');
  for (const s of map.streets) rect(s, '#f1e8d0');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5c4a33';
  ctx.font = `italic ${15 * ratio}px "EB Garamond", serif`;
  for (const s of [...map.streets, map.water, map.rail]) {
    if (!s.name) continue;
    ctx.save();
    ctx.translate(X(s.tx), Z(s.tz));
    if (s.vertical) ctx.rotate(-Math.PI / 2);
    ctx.fillText(s.name, 0, 0);
    ctx.restore();
  }

  for (const place of map.places) {
    const x = X(place.at.x);
    const y = Z(place.at.z);
    ctx.fillStyle = '#7a2a1e';
    ctx.beginPath();
    ctx.arc(x, y, 5 * ratio, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#2a1e12';
    ctx.font = `${16 * ratio}px "EB Garamond", serif`;
    ctx.textAlign = place.at.x > 60 ? 'right' : 'left';
    const dx = place.at.x > 60 ? -9 * ratio : 9 * ratio;
    ctx.fillText(place.name, x + dx, y - 11 * ratio);
  }

  if (player) {
    const x = X(player.x);
    const y = Z(player.z);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-player.yaw);
    ctx.fillStyle = '#14406a';
    ctx.beginPath();
    ctx.moveTo(0, -10 * ratio);
    ctx.lineTo(6 * ratio, 7 * ratio);
    ctx.lineTo(-6 * ratio, 7 * ratio);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#5c4a33';
  ctx.textAlign = 'right';
  ctx.font = `italic ${14 * ratio}px "EB Garamond", serif`;
  ctx.fillText('N ↑', canvas.width - 14 * ratio, 18 * ratio);
}
