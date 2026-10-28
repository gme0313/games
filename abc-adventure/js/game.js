// ABC 冒險：小暴龍走路原型（Phaser 3，直式）
const W = 540, H = 960, GROUND = 720, HERO_X = 150;
const GROUND_H = H - GROUND + 6;   // 地面素材高度（look.js 的背景會用到）
const FONT = '"Chalkboard SE","Comic Sans MS","Noto Sans TC","Microsoft JhengHei",sans-serif';
const INK = '#7a5c99';
const COLORS = [0xff9db8, 0x8fd0f5, 0x8fe0b4, 0xffc46b, 0xc3a4f2, 0xffa98a];
// 每關的題型分配（題數 = 總和，無論對錯都會出完）
// word 看圖選字母、wordToPic 聽英文選圖片、toLower 看大寫選小寫、toUpper 看小寫選大寫
const MIX = { word: 5, wordToPic: 2, toLower: 2, toUpper: 1 };
const ROUNDS = Object.values(MIX).reduce((a, b) => a + b, 0);
const SPEED = 170;         // 小暴龍走路速度（像素/秒）
const STOP_GAP = 590;      // 每題之間的距離（約 3.5 秒的路程）

const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);

// ---- 語音與音效 ----
const PRAISE = ['你好棒！', '答對了！', '好厲害！', '你好聰明！', '太棒了！'];
const hasTTS = 'speechSynthesis' in window;
if (hasTTS) speechSynthesis.getVoices();   // 先觸發語音清單載入（Chrome 是非同步的）

// 挑最適合的語音：優先該語言的「Natural / Online」，其次 Google，其餘最後
// 中文只接受台灣腔（zh-TW / Hant-TW），找不到才退而求其次用其他中文
function voiceFor(lang) {
  const norm = s => s.replace('_', '-').toLowerCase();
  const want = norm(lang), base = want.split('-')[0];
  const voices = speechSynthesis.getVoices();
  const exact = voices.filter(v => { const l = norm(v.lang); return l === want || (base === 'zh' && /tw|hant/.test(l)); });
  const pool = exact.length ? exact : voices.filter(v => norm(v.lang).startsWith(base));
  const score = v => (/natural|online/i.test(v.name) ? 3 : /google/i.test(v.name) ? 2 : 0);
  return pool.sort((a, b) => score(b) - score(a))[0];
}
// 唸一句；Android 偶爾不會觸發 onend，所以加上逾時保底，避免遊戲卡住
function speakOne(text, lang) {
  return new Promise(resolve => {
    const zh = lang.startsWith('zh'), u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = zh ? 0.9 : 0.85; u.pitch = zh ? 1.05 : 1.15;
    const v = voiceFor(lang);
    if (v) u.voice = v;
    const end = () => { clearTimeout(timer); resolve(); };
    const timer = setTimeout(end, 1500 + text.length * 400);
    u.onend = u.onerror = end;
    speechSynthesis.speak(u);
  });
}
// 依序唸出多段 [文字, 語言]；一種語言一段，不要把中英文混在同一句
let sayId = 0;
async function say(parts) {
  if (!hasTTS) return;
  const id = ++sayId;
  speechSynthesis.cancel();
  for (const [text, lang] of parts) {
    if (id !== sayId) return;   // 已被新的語音取代
    await speakOne(text, lang);
  }
}
let ac;
const audioCtx = () => ac = ac || new (window.AudioContext || window.webkitAudioContext)();
function beep(freqs) {
  try {
    audioCtx();
    freqs.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * .12;
      o.frequency.value = f; o.type = 'triangle';
      g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.001, t + .2);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + .22);
    });
  } catch (e) {}
}

// ---- 背景音樂：水晶風的輕柔鈴音（Web Audio 即時合成，不需要音檔）----
// 在 C 大調和弦（C、Am、F、G）上隨機彈琶音，加上回音；音量刻意壓得比語音小很多
const MUSIC_VOLUME = 0.045;
const MUSIC_KEY = 'abc-adventure-music';
const CHORDS = [[261.63, 329.63, 392, 523.25, 659.25], [220, 261.63, 329.63, 440, 523.25],
                [174.61, 261.63, 349.23, 440, 523.25], [196, 293.66, 392, 493.88, 587.33]];
const music = {
  on: (() => { try { return localStorage.getItem(MUSIC_KEY) !== 'off'; } catch (e) { return true; } })(),
  started: false, out: null, step: 0, next: 0, timer: 0,
  start() {
    if (this.started) { this.apply(); return; }
    try {
      const c = audioCtx();
      this.out = c.createGain(); this.out.gain.value = 0;
      const echo = c.createDelay(1), fb = c.createGain(), lp = c.createBiquadFilter();   // 回音：延遲＋回授＋低通，聽起來像空間殘響
      echo.delayTime.value = .42; fb.gain.value = .45; lp.type = 'lowpass'; lp.frequency.value = 2400;
      this.out.connect(c.destination); this.out.connect(echo); echo.connect(lp); lp.connect(fb); fb.connect(echo); lp.connect(c.destination);
      this.started = true; this.next = c.currentTime + .3;
      this.timer = setInterval(() => this.schedule(), 400);
      this.apply();
    } catch (e) {}
  },
  apply() {
    if (!this.started) return;
    const c = audioCtx(); if (c.state === 'suspended') c.resume();
    this.out.gain.cancelScheduledValues(c.currentTime);
    this.out.gain.setTargetAtTime(this.on ? MUSIC_VOLUME : 0, c.currentTime, .6);
  },
  toggle() {
    this.on = !this.on;
    try { localStorage.setItem(MUSIC_KEY, this.on ? 'on' : 'off'); } catch (e) {}
    this.start();
    return this.on;
  },
  schedule() {
    const c = audioCtx();
    while (this.next < c.currentTime + 1.2) {
      const chord = CHORDS[Math.floor(this.step / 8) % CHORDS.length];
      if (this.on && Math.random() < .8) this.bell(pick(chord) * (Math.random() < .25 ? 2 : 1), this.next);
      if (this.step % 8 === 0) this.bell(chord[0] / 2, this.next, .7);   // 每個和弦的第一拍補一個低音
      this.step++; this.next += .72;
    }
  },
  bell(freq, t, vol = 1) {
    const c = audioCtx();
    [[1, 1, 3], [2, .35, 1.8], [3.01, .12, .9]].forEach(([m, a, len]) => {   // 基音＋泛音，泛音衰減得快，才有水晶的亮感
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = freq * m;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a * vol, t + .012);
      g.gain.exponentialRampToValueAtTime(.0001, t + len);
      o.connect(g); g.connect(this.out); o.start(t); o.stop(t + len + .05);
    });
  }
};
// 瀏覽器要求先有一次點擊才能發聲；切到別的分頁或 App 時暫停
['click', 'touchend'].forEach(ev => document.addEventListener(ev, () => music.start(), { passive: true }));
document.addEventListener('visibilitychange', () => {
  if (!ac) return;
  if (document.hidden) ac.suspend(); else if (music.started) ac.resume();
});

// ---- 共用 UI ----
function txt(scene, x, y, s, size, color = INK, wrap = 0) {
  return scene.add.text(x, y, s, {
    fontFamily: FONT, fontSize: size + 'px', fontStyle: 'bold', color, align: 'center',
    wordWrap: wrap ? { width: wrap } : undefined, resolution: window.devicePixelRatio || 1
  }).setOrigin(0.5);
}
// 按鈕：用獨立的透明矩形接收點擊，避免容器點擊範圍的問題
function button(scene, x, y, w, h, color, label, size, cb, plain = false) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0xb99be0, .35).fillRoundedRect(-w / 2, -h / 2 + 7, w, h, 26);
  g.fillStyle(0xffffff).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 28);
  g.fillStyle(color).fillRoundedRect(-w / 2, -h / 2, w, h, 24);
  const t = txt(scene, 0, 0, label, size, '#ffffff');
  if (!plain) t.setStroke('#9b7cc9', 6);   // 圖片（emoji）選項不加描邊
  const hit = scene.add.rectangle(0, 0, w + 16, h + 16, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
  hit.on('pointerdown', () => cb(c));
  return c.add([g, t, hit]);
}
function confetti(scene) {
  for (let i = 0; i < 16; i++) {
    const t = scene.add.text(Phaser.Math.Between(20, W - 20), -30, pick(['🎉', '⭐', '✨', '🎈', '💖']), { fontSize: '34px' }).setDepth(50);
    scene.tweens.add({ targets: t, y: H + 40, angle: 360, duration: Phaser.Math.Between(1300, 2200), delay: Phaser.Math.Between(0, 400), onComplete: () => t.destroy() });
  }
}

// ============ 場景：標題 ============
class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create(data) {
    if (!data || !data.keep) rollLook();   // 每次回到標題就隨機換一組顏色與時段（從選角畫面回來時不換）
    ensureLook(this);
    addBackdrop(this);
    txt(this, W / 2, 190, 'ABC 冒險', 76, '#ffffff').setStroke('#b99be0', 12);
    const hero = this.add.sprite(W / 2, GROUND, tex('heroIdle')).setOrigin(0.5, 1).setScale(1.9);
    this.tweens.add({ targets: hero, scaleY: 1.96, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    button(this, W / 2, 360, 300, 100, COLORS[0], '▶ 開始', 52, () => {
      say([["Let's go!", 'en-US']]);        // 第一次點擊會解鎖語音
      this.cameras.main.fadeOut(400, 255, 230, 245);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Walk'));
    });
    button(this, W / 2, 480, 300, 80, COLORS[1], `🔄 換主角（${CHARS[look.char].name}）`, 30, () => this.scene.start('Select'));
    const note = button(this, W - 50, 50, 64, 64, 0xc3a4f2, music.on ? '🎵' : '🔇', 30, () => {
      note.list[1].setText(music.toggle() ? '🎵' : '🔇');
    });
    this.cameras.main.fadeIn(400, 255, 230, 245);
  }
}

// ============ 場景：選擇主角 ============
// 2x2 的卡片，點一下就選定（會記住），按「好了」回標題
class SelectScene extends Phaser.Scene {
  constructor() { super('Select'); }
  create() {
    const ids = Object.keys(CHARS);
    ids.forEach(id => ensureChar(this, id));
    addBackdrop(this);
    txt(this, W / 2, 100, '選擇主角', 60, '#ffffff').setStroke('#b99be0', 12);

    this.frames = this.add.graphics();
    this.sprites = {};
    ids.forEach((id, i) => {
      const cx = 145 + (i % 2) * 250, cy = 320 + Math.floor(i / 2) * 270;
      this.sprites[id] = this.add.sprite(cx, cy + 30, tex('heroIdle', id)).setOrigin(0.5, 1).setScale(0.95);
      txt(this, cx, cy + 72, CHARS[id].name, 34);
      txt(this, cx, cy + 102, CHARS[id].en, 18, '#a58bc7');
      this.add.rectangle(cx, cy, 220, 240, 0xffffff, 0.001).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.choose(id));
    });
    this.centers = ids.map((id, i) => [145 + (i % 2) * 250, 320 + Math.floor(i / 2) * 270]);
    this.ids = ids;
    this.drawFrames();

    button(this, W / 2, 800, 300, 90, COLORS[2], '✔ 好了', 44, () => {
      sayId++;
      this.scene.start('Title', { keep: true });
    });
    this.cameras.main.fadeIn(300, 255, 230, 245);
  }
  drawFrames() {
    const g = this.frames.clear();
    this.ids.forEach((id, i) => {
      const [cx, cy] = this.centers[i], on = id === look.char;
      g.fillStyle(0xb99be0, 0.25).fillRoundedRect(cx - 110, cy - 114, 220, 240, 30);
      g.fillStyle(on ? 0xfff6c8 : 0xffffff, on ? 0.95 : 0.75).fillRoundedRect(cx - 110, cy - 120, 220, 240, 30);
      g.lineStyle(on ? 8 : 3, on ? 0xff9db8 : 0xd4c1f5).strokeRoundedRect(cx - 110, cy - 120, 220, 240, 30);
      if (on) {
        g.fillStyle(0xff9db8).fillCircle(cx + 96, cy - 106, 20);
        g.lineStyle(5, 0xffffff).beginPath().moveTo(cx + 87, cy - 106).lineTo(cx + 94, cy - 98).lineTo(cx + 106, cy - 115).strokePath();
      }
    });
  }
  choose(id) {
    look.char = id; saveChar(id);
    this.drawFrames();
    beep([523, 659]);
    const s = this.sprites[id];
    this.tweens.add({ targets: s, y: s.y - 30, duration: 160, yoyo: true, repeat: 1, ease: 'Quad.out' });
    say([[CHARS[id].en, 'en-US'], [CHARS[id].name, 'zh-TW']]);
  }
}

// ---- 出題：每關抽 ROUNDS 個不同字母，並盡量避開玩過的單字 ----
const SEEN_KEY = 'abc-adventure-seen';
function loadSeen() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY)) || []); } catch (e) { return new Set(); }
}
function saveSeen(seen) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch (e) {}
}
// ---- 題型 ----
// word＝看圖選開頭字母；wordToPic＝聽英文語音選圖片（英文單字只是輔助，單字範圍見 words.js 的 PIC_WORDS）
// case＝大小寫配對（toLower：看大寫選小寫、toUpper：看小寫選大寫；小寫字形比較多變，所以題數較少）
// 每關的題型分配見最上方的 MIX
const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const CONFUSABLE = ['bdpq', 'nu', 'mw', 'gq'];    // 小寫長得像的字母，不放進同一題的選項
const isCaseType = t => t === 'toLower' || t === 'toUpper';

function pickQuestions() {
  const seen = loadSeen();
  const types = Object.entries(MIX).flatMap(([t, n]) => Array(n).fill(t));
  const wordTypes = types.filter(t => !isCaseType(t));   // 這些題型都要用到單字
  const caseTypes = types.filter(isCaseType);
  // 單字配圖題只能用 PIC_WORDS 裡的單字，所以先替它們挑有這類單字的字母，其餘題型再從剩下的字母挑
  const picTypes = wordTypes.filter(t => t === 'wordToPic'), otherTypes = wordTypes.filter(t => t !== 'wordToPic');
  const picLetters = shuffle(Object.keys(WORDS).filter(l => WORDS[l].some(w => PIC_WORDS.has(w[0])))).slice(0, picTypes.length);
  const otherLetters = shuffle(Object.keys(WORDS).filter(l => !picLetters.includes(l))).slice(0, otherTypes.length);
  const slots = [...picTypes.map((type, i) => ({ type, letter: picLetters[i] })), ...otherTypes.map((type, i) => ({ type, letter: otherLetters[i] }))];
  const caseLetters = shuffle(ALPHABET.filter(c => !slots.some(s => s.letter === c))).slice(0, caseTypes.length);
  const wordQs = slots.map(({ type, letter }) => {
    const pool = type === 'wordToPic' ? WORDS[letter].filter(w => PIC_WORDS.has(w[0])) : WORDS[letter];
    let fresh = pool.filter(w => !seen.has(w[0]));
    if (!fresh.length) { pool.forEach(w => seen.delete(w[0])); fresh = pool; }   // 都玩過就重新輪一輪
    const [en, zh, emoji] = pick(fresh);
    seen.add(en);
    return { type, letter, en, zh, emoji };
  });
  saveSeen(seen);
  const caseQs = caseLetters.map((letter, i) => ({ type: 'case', letter, dir: caseTypes[i] }));
  const first = wordQs.find(q => q.type === 'word');   // 第 1 題固定是「看圖選字母」，其餘隨機穿插
  return [first, ...shuffle([...wordQs.filter(q => q !== first), ...caseQs])];
}

// 大小寫題的干擾選項：兩個其他字母（大寫或小寫依題目方向），避開小寫字形和題目長得像的
// 例如題目是 b，選項就不會出現 D（小寫 d 和 b 太像）
function caseOthers(letter, upper) {
  const ans = letter.toLowerCase();
  const twin = CONFUSABLE.find(g => g.includes(ans)) || '';
  const pool = ALPHABET.filter(c => c.toLowerCase() !== ans && !twin.includes(c.toLowerCase()));
  return shuffle(pool).slice(0, 2).map(c => upper ? c : c.toLowerCase());
}
// 單字題的干擾項：首字母不同，而且不會和答案太像（例如 Boat 和 Ship，見 words.js 的 SIMILAR）
const similar = (a, b) => SIMILAR.some(g => g.includes(a) && g.includes(b));
// 顏色題的干擾項只會是其他顏色，其他題則不出現顏色
function wordOthers(q) {
  const isColor = COLOR_NAMES.includes(q.en);
  const all = Object.values(WORDS).flat().filter(w => PIC_WORDS.has(w[0]) && COLOR_NAMES.includes(w[0]) === isColor);
  return shuffle(all.filter(w => w[0][0].toUpperCase() !== q.letter && !similar(w[0], q.en))).slice(0, 2);
}

// 依題型整理出畫面與選項：big＝題目大字（或圖示）、options＝已洗牌的三個選項
// pic＝選項是圖片
function questionSpec(q) {
  const letters = vals => vals.map(v => ({ value: v, label: v }));
  if (q.type === 'case') {
    const toUpper = q.dir === 'toUpper', shown = toUpper ? q.letter.toLowerCase() : q.letter;   // q.letter 一律是大寫
    const answer = toUpper ? q.letter : q.letter.toLowerCase();
    return {
      big: shown, bigSize: 130, answer, optSize: 66,
      text: toUpper ? `這是小寫的 ${shown}\n哪一個是大寫的 ${q.letter}？` : `這是大寫的 ${shown}\n哪一個是小寫的 ${q.letter}？`,
      options: letters(shuffle([answer, ...caseOthers(q.letter, toUpper)]))
    };
  }
  if (q.type === 'wordToPic') {
    const ws = shuffle([[q.en, q.zh, q.emoji], ...wordOthers(q)]);
    return {
      big: q.en, bigSize: Math.min(110, Math.floor(420 / (q.en.length * 0.6))), answer: q.emoji, optSize: 64, pic: true,
      text: `${q.zh}\n哪一張圖片是 ${q.en}？`, options: ws.map(w => ({ value: w[2], label: w[2] }))
    };
  }
  const others = shuffle(Object.keys(WORDS).filter(c => c !== q.letter)).slice(0, 2);   // word：看圖選開頭字母
  return {
    big: q.emoji, bigIsEmoji: true, answer: q.letter, optSize: 66,
    text: `${q.zh}（${q.en}）\n是哪個字母開頭？`, options: letters(shuffle([q.letter, ...others]))
  };
}

// ============ 場景：走路與答題 ============
// 相機固定不動，小暴龍留在原地踏步，背景與路標往左移動，營造往右走的效果
// 每題 3 分：一次答對 3 分，答錯一次 2 分，答錯兩次就公布答案、得 1 分；共 ROUNDS 題，無論對錯都會進到下一題
class WalkScene extends Phaser.Scene {
  constructor() { super('Walk'); }
  create() {
    this.stops = Array.from({ length: ROUNDS }, (_, i) => 500 + i * STOP_GAP);
    this.finishX = this.stops[ROUNDS - 1] + 650;
    this.dist = 0; this.round = 0; this.state = 'walk'; this.score = 0;
    this.questions = pickQuestions();

    ensureLook(this);
    this.layers = addBackdrop(this);

    this.signs = this.stops.map(x => ({ x: x + 150, obj: this.makeSign(false) }));
    this.signs.push({ x: this.finishX, obj: this.makeSign(true) });

    this.hero = this.add.sprite(HERO_X, GROUND, tex('heroIdle')).setOrigin(0.5, 1).setDepth(5);
    this.hero.play(walkKey());
    this.cameras.main.fadeIn(500, 255, 230, 245);

    this.scoreText = txt(this, W / 2, 50, '', 40).setStroke('#ffffff', 8).setDepth(20);   // 上方置中：⭐ 目前得分/滿分
    this.addScore(0);
    this.progress = txt(this, W - 70, 50, '', 30).setStroke('#ffffff', 7).setDepth(20);
    button(this, 50, 50, 64, 64, 0xc3a4f2, '🏠', 30, () => { sayId++; if (hasTTS) speechSynthesis.cancel(); this.scene.start('Title'); }).setDepth(20);
  }
  makeSign(flag) {
    const c = this.add.container(0, 0).setDepth(2);
    const g = this.add.graphics();
    g.fillStyle(0xc9a27a).fillRect(-6, GROUND - 130, 12, 130);
    g.fillStyle(flag ? 0xff9db8 : 0xffd96b).fillCircle(0, GROUND - 150, 40);
    g.lineStyle(5, 0xffffff).strokeCircle(0, GROUND - 150, 40);
    const t = txt(this, 0, GROUND - 150, flag ? '🏁' : '?', flag ? 40 : 54, '#ffffff').setStroke('#c98f2b', 6);
    return c.add([g, t]);
  }
  update(time, dt) {
    if (this.state === 'walk') this.dist += SPEED * dt / 1000;
    const L = this.layers;
    L.clouds.tilePositionX = this.dist * 0.1 + time * 0.01;
    L.mountains.tilePositionX = this.dist * 0.2;
    L.hills.tilePositionX = this.dist * 0.4;
    L.trees.tilePositionX = this.dist * 0.75;
    L.ground.tilePositionX = this.dist;
    this.signs.forEach(s => s.obj.x = HERO_X + s.x - this.dist);
    if (this.state !== 'walk') return;
    if (this.round < ROUNDS && this.dist >= this.stops[this.round]) this.ask();
    else if (this.round >= ROUNDS && this.dist >= this.finishX - 200) this.finish();
  }
  ask() {
    this.state = 'ask'; this.wrong = 0; this.choices = [];
    this.hero.stop().setTexture(tex('heroIdle'));
    const q = this.q = this.questions[this.round];
    this.progress.setText(`第 ${this.round + 1} 題`);
    const spec = questionSpec(q);
    this.answer = spec.answer;

    const p = this.panel = this.add.container(W / 2, -400).setDepth(30);
    const bg = this.add.graphics();
    bg.fillStyle(0xb99be0, 0.3).fillRoundedRect(-250, -205, 500, 430, 40);
    bg.fillStyle(0xffffff, 0.94).fillRoundedRect(-250, -215, 500, 430, 40);
    p.add(bg);
    p.add(spec.bigIsEmoji ? this.add.text(0, -120, spec.big, { fontSize: '110px' }).setOrigin(0.5) : txt(this, 0, -120, spec.big, spec.bigSize, '#f06a9b'));
    this.question = txt(this, 0, -15, spec.text, 32, INK, 440);
    p.add(this.question);
    const bw = 125, gap = 155;
    spec.options.forEach(({ value, label }, i) => {
      const color = spec.pic ? 0xfff3d6 : COLORS[(i + this.round) % COLORS.length];
      const btn = button(this, (i - 1) * gap, 125, bw, 125, color, label, spec.optSize, b => {
        if (this.state !== 'ask') return;
        if (value === this.answer) { this.state = 'cheer'; this.correct(); }
        else this.miss(b);
      }, spec.pic);
      this.choices.push({ letter: value, btn });
      p.add(btn);
    });
    p.add(button(this, 195, -165, 70, 70, 0xffd96b, '🔊', 34, () => this.speakQuestion()));
    this.tweens.add({ targets: p, y: 340, duration: 450, ease: 'Back.out' });
    this.speakQuestion();
  }
  addScore(n) {
    this.score += n;
    this.scoreText.setText(`⭐ ${this.score}/${ROUNDS * 3}`);
    if (n) this.tweens.add({ targets: this.scoreText, scale: 1.3, duration: 160, yoyo: true });
  }
  speakQuestion() {
    if (this.state !== 'ask') return;
    const { type, dir, letter, en, zh } = this.q;
    const [from, to] = dir === 'toUpper' ? ['小寫', '大寫'] : ['大寫', '小寫'];
    say({
      case: [[`這是${from}的`, 'zh-TW'], [letter, 'en-US'], [`，哪一個是${to}的`, 'zh-TW'], [letter, 'en-US']],
      wordToPic: [[en, 'en-US'], [en, 'en-US']],   // 純英文語音，聽了選圖；中文只留在畫面上輔助
      word: [[en, 'en-US'], [zh + '，是哪個字母開頭呢？', 'zh-TW']]
    }[type]);
  }
  // 公布答案時唸的內容與畫面文字
  answerParts() {
    const { type, letter, en, zh } = this.q;
    if (type === 'case') return [['大寫的', 'zh-TW'], [letter, 'en-US'], ['，小寫的', 'zh-TW'], [letter, 'en-US']];
    if (type === 'word') return [[`${letter}, ${letter}, ${en}!`, 'en-US'], [zh, 'zh-TW']];
    return [[en, 'en-US'], [zh, 'zh-TW']];   // 單字與圖片配對：直接唸英文與中文
  }
  announce() {
    const { type, letter, en, zh } = this.q;
    const text = type === 'case' ? `大寫 ${letter}　小寫 ${letter.toLowerCase()}`
      : type === 'word' ? `${letter} is for ${en}!
${zh}` : `${en}
${zh}`;
    this.question.setText(text).setColor('#f06a9b').setFontSize(40);
  }
  correct() {
    this.addScore(3 - this.wrong);
    beep([523, 659, 784]); confetti(this);
    this.hero.setTexture(tex('heroCheer'));
    this.tweens.add({ targets: this.hero, y: GROUND - 70, duration: 250, yoyo: true, repeat: 1, ease: 'Sine.out' });
    this.announce();
    say([...this.answerParts(), [pick(PRAISE), 'zh-TW']]).then(() => this.next());
  }
  miss(btn) {
    this.wrong++;
    beep([200]);
    btn.last.disableInteractive();   // 點錯的選項變淡，不能再點
    this.tweens.add({ targets: btn, x: btn.x + 12, duration: 60, yoyo: true, repeat: 3, onComplete: () => btn.setAlpha(0.3) });
    if (this.wrong < 2) { say([['再試試看喔', 'zh-TW']]); return; }
    // 錯兩次：公布答案，得 1 分，繼續往下一題
    this.state = 'reveal';
    this.addScore(3 - this.wrong);
    const right = this.choices.find(c => c.letter === this.answer).btn;
    this.tweens.add({ targets: right, scale: 1.2, duration: 250, yoyo: true, repeat: 2 });
    this.announce();
    say([...this.answerParts(), ['沒關係，下次再加油喔！', 'zh-TW']]).then(() => this.next());
  }
  next() {
    this.tweens.add({ targets: this.panel, y: -400, duration: 350, ease: 'Back.in', onComplete: () => {
      this.panel.destroy(); this.round++;
      this.hero.setY(GROUND).play(walkKey()); this.state = 'walk';
    } });
  }
  finish() {
    this.state = 'end'; this.hero.stop().setTexture(tex('heroCheer'));
    this.cameras.main.fadeOut(600, 255, 230, 245);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('End', { score: this.score, max: ROUNDS * 3 }));
  }
}

// ============ 場景：結束（統計總分）============
class EndScene extends Phaser.Scene {
  constructor() { super('End'); }
  create({ score, max }) {
    addBackdrop(this);
    const rate = score / max;
    const hero = this.add.sprite(W / 2, GROUND, tex('heroCheer')).setOrigin(0.5, 1).setScale(1.5);
    // 慶祝動畫：蹦蹦跳跳、左右搖擺
    this.tweens.add({ targets: hero, y: GROUND - 80, duration: 400, yoyo: true, repeat: -1, ease: 'Quad.out' });
    this.tweens.add({ targets: hero, angle: { from: -7, to: 7 }, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const title = txt(this, W / 2, 75, rate >= 0.8 ? '太棒了！🎉' : rate >= 0.5 ? '好棒喔！🎉' : '好努力喔！🌟', 64, '#ffffff').setStroke('#b99be0', 12);
    this.tweens.add({ targets: title, scale: 1.08, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    txt(this, W / 2, 150, '總分', 38).setStroke('#ffffff', 8);
    const num = txt(this, W / 2, 245, '0', 110, '#f06a9b').setStroke('#ffffff', 10);
    txt(this, W / 2, 325, `/ ${max} 分`, 40).setStroke('#ffffff', 8);
    this.tweens.addCounter({ from: 0, to: score, duration: 1400, onUpdate: tw => num.setText(String(Math.round(tw.getValue()))) });

    const full = Math.max(1, Math.round(rate * 5));   // 5 顆星裡亮幾顆
    for (let i = 0; i < 5; i++) {
      const s = txt(this, W / 2 + (i - 2) * 76, 385, '⭐', 52).setAlpha(i < full ? 1 : 0.2).setScale(0);
      this.tweens.add({ targets: s, scale: 1, duration: 350, delay: 1400 + i * 150, ease: 'Back.out' });
    }

    button(this, W / 2, 790, 320, 84, COLORS[1], '🔁 再玩一次', 40, () => { sayId++; rollLook(); this.scene.start('Walk'); });
    button(this, W / 2, 890, 320, 84, COLORS[4], '🏠 回首頁', 40, () => { sayId++; this.scene.start('Title'); });
    this.cameras.main.fadeIn(500, 255, 230, 245);
    beep([523, 659, 784, 1046]); confetti(this);
    this.time.addEvent({ delay: 1800, loop: true, callback: () => confetti(this) });
    say([['You did it!', 'en-US'], [`你得到 ${score} 分，真棒！`, 'zh-TW']]);
  }
}

new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: W, height: H, backgroundColor: '#d9f7e6',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [TitleScene, SelectScene, WalkScene, EndScene]
});
