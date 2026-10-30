// ABC 冒險：小暴龍走路原型（Phaser 3，直式）
const W = 540, H = 960, GROUND = 720, HERO_X = 150;
const GROUND_H = H - GROUND + 6;   // 地面素材高度（look.js 的背景會用到）
const FONT = '"Chalkboard SE","Comic Sans MS","Noto Sans TC","Microsoft JhengHei",sans-serif';
const INK = '#7a5c99';
const COLORS = [0xff9db8, 0x8fd0f5, 0x8fe0b4, 0xffc46b, 0xc3a4f2, 0xffa98a];
// 每關的題型分配（題數 = 總和，無論對錯都會出完）
// word 看圖選字母、wordToPic 聽英文選圖片、bubble 聽英文戳泡泡、toLower 看大寫選小寫、toUpper 看小寫選大寫、
// dragLower 把大寫拖到小寫、dragUpper 把小寫拖到大寫
const MIX = { word: 2, wordToPic: 2, bubble: 2, toLower: 1, toUpper: 1, dragLower: 1, dragUpper: 1 };
const ROUNDS = Object.values(MIX).reduce((a, b) => a + b, 0);
const SPEED = 170;         // 小暴龍走路速度（像素/秒）
const STOP_GAP = 590;      // 每題之間的距離（約 3.5 秒的路程）

const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);

// ---- 語音與音效 ----
const PRAISE = ['你好棒！', '答對了！', '好厲害！', '你好聰明！', '太棒了！',
  '真聰明！', '好棒喔！', '你真棒！', '好聰明喔！', '答對囉！', '讚讚讚！', '好優秀！', '漂亮！', '太厲害了！'];
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

// 拉炮的「砰」：一小段高頻雜訊
function pop() {
  try {
    const c = audioCtx(), n = c.sampleRate * .12, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const src = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
    hp.type = 'highpass'; hp.frequency.value = 900; g.gain.value = .35;
    src.buffer = buf; src.connect(hp); hp.connect(g); g.connect(c.destination); src.start();
  } catch (e) {}
}

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

// 答對的慶祝：畫面左右下角各「砰」一聲拉炮，噴出彩帶與紙花，主角周圍閃一圈星光
const PAPER = [0xff9db8, 0x8fd0f5, 0xffd96b, 0x8fe0b4, 0xc3a4f2, 0xffa98a];
function popper(scene, hero) {
  pop();
  const flash = scene.add.rectangle(W / 2, H / 2, W, H, 0xfff3b0, .45).setDepth(40);   // 一閃的暖光
  scene.tweens.add({ targets: flash, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
  // 紙花與彩帶沿拋物線飛出，再慢慢飄落
  const shoot = (x0, dir) => {
    for (let i = 0; i < 26; i++) {
      const streamer = i < 7, color = pick(PAPER);
      const o = scene.add.rectangle(x0, H - 20, streamer ? 6 : Phaser.Math.Between(8, 14), streamer ? 46 : Phaser.Math.Between(8, 14), color).setDepth(45);
      const vx = dir * Phaser.Math.Between(120, 420), vy = -Phaser.Math.Between(650, 1050), spin = Phaser.Math.Between(-540, 540);
      const life = Phaser.Math.Between(1300, 2000);
      scene.tweens.addCounter({
        from: 0, to: 1, duration: life, ease: 'Linear',
        onUpdate: tw => {
          const t = tw.getValue() * life / 1000;
          o.x = x0 + vx * t * .55; o.y = H - 20 + vy * t * .6 + 520 * t * t;   // 先往上衝再被重力拉下來
          o.angle = spin * t; if (streamer) o.scaleX = 1 + Math.sin(t * 14) * .5;
          o.alpha = Math.min(1, (1 - tw.getValue()) * 3);
        },
        onComplete: () => o.destroy()
      });
    }
  };
  shoot(20, 1); shoot(W - 20, -1);
  // 主角身邊的小星星
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, s = scene.add.text(hero.x, hero.y - 80, '✨', { fontSize: '30px' }).setOrigin(.5).setDepth(46);
    scene.tweens.add({ targets: s, x: hero.x + Math.cos(a) * 110, y: hero.y - 80 + Math.sin(a) * 90, alpha: 0, scale: 1.6, duration: 700, ease: 'Sine.out', onComplete: () => s.destroy() });
  }
}

// 隊伍站在畫面下方的地面上，最多同時站 6 隻
const PANEL_Y = 340;   // 題目面板停下來的高度
const TEAM_MAX = 6, TEAM_Y = GROUND + 125, TEAM_X = i => 60 + i * 70;

// 點到東西時冒出的小星星
function sparkle(scene, x, y, n = 6) {
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, s = scene.add.text(x, y, '✨', { fontSize: '26px' }).setOrigin(.5).setDepth(46);
    scene.tweens.add({ targets: s, x: x + Math.cos(a) * 70, y: y + Math.sin(a) * 70, alpha: 0, scale: 1.4, duration: 550, ease: 'Sine.out', onComplete: () => s.destroy() });
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
    const hero = this.add.sprite(W / 2, GROUND + 20, tex('heroIdle')).setOrigin(0.5, 1).setScale(1.7);
    this.tweens.add({ targets: hero, scaleY: 1.75, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const go = (scene, hello) => () => {
      say([[hello, 'en-US']]);        // 第一次點擊會解鎖語音
      this.cameras.main.fadeOut(400, 255, 230, 245);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(scene));
    };
    button(this, W / 2, 310, 380, 92, COLORS[0], '🦖 冒險之旅', 46, go('Walk', "Let's go!"));
    button(this, W / 2, 420, 380, 92, COLORS[3], '🍎 餵恐龍', 46, go('Feed', "I'm hungry!"));
    button(this, W / 2, 520, 300, 66, COLORS[1], `🔄 換主角（${CHARS[look.char].name}）`, 28, () => this.scene.start('Select'));
    const note = button(this, W - 50, 50, 64, 64, 0xc3a4f2, music.on ? '🎵' : '🔇', 30, () => {
      note.list[1].setText(music.toggle() ? '🎵' : '🔇');
    });
    this.cameras.main.fadeIn(400, 255, 230, 245);
  }
}

// ============ 場景：選擇主角 ============
// 2 欄 4 列的卡片（共 8 隻），點一下就選定（會記住），按「好了」回標題
const CARD_W = 230, CARD_H = 180;
const cardCenter = i => [145 + (i % 2) * 250, 205 + Math.floor(i / 2) * 192];
class SelectScene extends Phaser.Scene {
  constructor() { super('Select'); }
  create() {
    const ids = Object.keys(CHARS);
    ids.forEach(id => ensureChar(this, id));
    addBackdrop(this);
    txt(this, W / 2, 62, '選擇主角', 52, '#ffffff').setStroke('#b99be0', 10);

    this.frames = this.add.graphics();
    this.sprites = {};
    ids.forEach((id, i) => {
      const [cx, cy] = cardCenter(i);
      this.sprites[id] = this.add.sprite(cx, cy + 4, tex('heroIdle', id)).setOrigin(0.5, 1).setScale(0.6);
      txt(this, cx, cy + 34, CHARS[id].name, 28);
      txt(this, cx, cy + 62, CHARS[id].en, 15, '#a58bc7');
      this.add.rectangle(cx, cy, CARD_W, CARD_H, 0xffffff, 0.001).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.choose(id));
    });
    this.centers = ids.map((id, i) => cardCenter(i));
    this.ids = ids;
    this.drawFrames();

    button(this, W / 2, 910, 260, 70, COLORS[2], '✔ 好了', 38, () => {
      sayId++;
      this.scene.start('Title', { keep: true });
    });
    this.cameras.main.fadeIn(300, 255, 230, 245);
  }
  drawFrames() {
    const g = this.frames.clear();
    this.ids.forEach((id, i) => {
      const [cx, cy] = this.centers[i], on = id === look.char;
      const x = cx - CARD_W / 2, y = cy - CARD_H / 2;
      g.fillStyle(0xb99be0, 0.25).fillRoundedRect(x, y + 5, CARD_W, CARD_H, 26);
      g.fillStyle(on ? 0xfff6c8 : 0xffffff, on ? 0.95 : 0.75).fillRoundedRect(x, y, CARD_W, CARD_H, 26);
      g.lineStyle(on ? 7 : 3, on ? 0xff9db8 : 0xd4c1f5).strokeRoundedRect(x, y, CARD_W, CARD_H, 26);
      if (on) {
        g.fillStyle(0xff9db8).fillCircle(x + CARD_W - 16, y + 16, 16);
        g.lineStyle(4, 0xffffff).beginPath().moveTo(x + CARD_W - 23, y + 16).lineTo(x + CARD_W - 17, y + 23).lineTo(x + CARD_W - 8, y + 9).strokePath();
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
// word＝看圖選開頭字母；wordToPic／bubble＝聽英文語音選圖片（bubble 是選項飄成泡泡、用戳的；英文單字只是輔助，單字範圍見 words.js 的 PIC_WORDS）
// case／drag＝大小寫配對（case 用點選、drag 把字母卡拖到對的位置；toLower：大寫配小寫、toUpper：小寫配大寫）
// 每關的題型分配見最上方的 MIX
const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const CONFUSABLE = ['bdpq', 'nu', 'mw', 'gq'];    // 小寫長得像的字母，不放進同一題的選項
const isCaseType = t => ['toLower', 'toUpper', 'dragLower', 'dragUpper'].includes(t);
const isPicType = t => t === 'wordToPic' || t === 'bubble';   // 這兩種都要用 PIC_WORDS 的單字

function pickQuestions() {
  const seen = loadSeen();
  const types = Object.entries(MIX).flatMap(([t, n]) => Array(n).fill(t));
  const wordTypes = types.filter(t => !isCaseType(t));   // 這些題型都要用到單字
  const caseTypes = types.filter(isCaseType);
  // 單字配圖題只能用 PIC_WORDS 裡的單字，所以先替它們挑有這類單字的字母，其餘題型再從剩下的字母挑
  const picTypes = wordTypes.filter(isPicType), otherTypes = wordTypes.filter(t => !isPicType(t));
  const picLetters = shuffle(Object.keys(WORDS).filter(l => WORDS[l].some(w => PIC_WORDS.has(w[0])))).slice(0, picTypes.length);
  const otherLetters = shuffle(Object.keys(WORDS).filter(l => !picLetters.includes(l))).slice(0, otherTypes.length);
  const slots = [...picTypes.map((type, i) => ({ type, letter: picLetters[i] })), ...otherTypes.map((type, i) => ({ type, letter: otherLetters[i] }))];
  const caseLetters = shuffle(ALPHABET.filter(c => !slots.some(s => s.letter === c))).slice(0, caseTypes.length);
  const wordQs = slots.map(({ type, letter }) => {
    const pool = isPicType(type) ? WORDS[letter].filter(w => PIC_WORDS.has(w[0])) : WORDS[letter];
    let fresh = pool.filter(w => !seen.has(w[0]));
    if (!fresh.length) { pool.forEach(w => seen.delete(w[0])); fresh = pool; }   // 都玩過就重新輪一輪
    const [en, zh, emoji] = pick(fresh);
    seen.add(en);
    return { type, letter, en, zh, emoji };
  });
  saveSeen(seen);
  const caseQs = caseLetters.map((letter, i) => ({
    type: caseTypes[i].startsWith('drag') ? 'drag' : 'case', letter, dir: caseTypes[i].endsWith('Upper') ? 'toUpper' : 'toLower'
  }));
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
  if (q.type === 'drag') {   // 把字母卡拖到對的位置：big 是字母卡上的字
    const toUpper = q.dir === 'toUpper', shown = toUpper ? q.letter.toLowerCase() : q.letter;
    const answer = toUpper ? q.letter : q.letter.toLowerCase();
    return {
      drag: true, big: shown, answer, optSize: 62,
      text: `把這個字母\n拖到${toUpper ? '大寫' : '小寫'}的 ${q.letter}`,
      options: letters(shuffle([answer, ...caseOthers(q.letter, toUpper)]))
    };
  }
  if (q.type === 'case') {
    const toUpper = q.dir === 'toUpper', shown = toUpper ? q.letter.toLowerCase() : q.letter;   // q.letter 一律是大寫
    const answer = toUpper ? q.letter : q.letter.toLowerCase();
    return {
      big: shown, bigSize: 130, answer, optSize: 66,
      text: toUpper ? `這是小寫的 ${shown}\n哪一個是大寫的 ${q.letter}？` : `這是大寫的 ${shown}\n哪一個是小寫的 ${q.letter}？`,
      options: letters(shuffle([answer, ...caseOthers(q.letter, toUpper)]))
    };
  }
  if (isPicType(q.type)) {
    const ws = shuffle([[q.en, q.zh, q.emoji], ...wordOthers(q)]);
    return {
      big: q.en, bigSize: Math.min(110, Math.floor(420 / (q.en.length * 0.6))), answer: q.emoji, optSize: 64, pic: true, bubble: q.type === 'bubble',
      text: q.type === 'bubble' ? `${q.zh}\n戳一戳 ${q.en} 的泡泡！` : `${q.zh}\n哪一張圖片是 ${q.en}？`, options: ws.map(w => ({ value: w[2], label: w[2] }))
    };
  }
  const others = shuffle(Object.keys(WORDS).filter(c => c !== q.letter)).slice(0, 2);   // word：看圖選開頭字母
  return {
    big: q.emoji, bigIsEmoji: true, answer: q.letter, optSize: 66,
    text: `${q.zh}（${q.en}）\n是哪個字母開頭？`, options: letters(shuffle([q.letter, ...others]))
  };
}

// 路上的小事件：依目前的地形隨機冒出小東西，點一下會有反應（不影響答題與分數）
// ground＝待在地上隨地面移動，點了會跳一下；fly＝自己飛過，點了會飛走；float＝慢慢飄過的氣球
const CRITTERS = {
  meadow: [['🍄', 'ground'], ['🌼', 'ground'], ['🐞', 'ground'], ['🦋', 'fly'], ['🎈', 'float']],
  beach: [['🦀', 'ground'], ['🐚', 'ground'], ['🦋', 'fly'], ['🐦', 'fly'], ['🎈', 'float']],
  snow: [['🐧', 'ground'], ['🦌', 'ground'], ['❄️', 'fly'], ['🎈', 'float']],
  volcano: [['🦎', 'ground'], ['💎', 'ground'], ['🔥', 'ground'], ['🦇', 'fly'], ['🎈', 'float']]
};

// ============ 場景：走路與答題 ============
// 相機固定不動，小暴龍留在原地踏步，背景與路標往左移動，營造往右走的效果
// 每題 3 分：一次答對 3 分，答錯一次 2 分，答錯兩次就公布答案、得 1 分；共 ROUNDS 題，無論對錯都會進到下一題
class WalkScene extends Phaser.Scene {
  constructor() { super('Walk'); }
  create() {
    this.stops = Array.from({ length: ROUNDS }, (_, i) => 500 + i * STOP_GAP);
    this.finishX = this.stops[ROUNDS - 1] + 650;
    this.dist = 0; this.round = 0; this.state = 'walk'; this.score = 0;
    this.critters = []; this.nextCritter = 0; this.nowT = 0;
    this.streak = 0;                                        // 連續「一次就答對」的題數
    this.friends = []; this.team = []; this.worldFriends = []; this.waiting = null;   // 加入隊伍的朋友、隊伍中的圖、路上的朋友、正在等你的朋友
    this.questions = pickQuestions();

    ensureLook(this);
    this.layers = addBackdrop(this);
    // 地形：第 1～3 題在草原，第 4 題起換成海邊／火山／雪地其中一個，第 7 題起再換另一個
    this.terrains = ['meadow', ...shuffle(['beach', 'volcano', 'snow']).slice(0, 2)];
    this.terrains.forEach(t => ensureTerrain(this, t));
    this.scrollers = [['mountains', 0.2], ['hills', 0.4], ['trees', 0.75], ['ground', 1]].map(([k, f]) => ({ sp: this.layers[k], f }));

    this.signs = this.stops.map(x => ({ x: x + 150, obj: this.makeSign(false) }));
    this.signs.push({ x: this.finishX, obj: this.makeSign(true) });

    this.hero = this.add.sprite(HERO_X, GROUND, tex('heroIdle')).setOrigin(0.5, 1).setDepth(5);
    this.hero.play(walkKey());
    this.crown = this.add.text(0, 0, '👑', { fontSize: '40px' }).setOrigin(.5, 1).setAngle(-10).setDepth(7).setVisible(false);
    this.rainbow = this.makeRainbow().setVisible(false);
    this.cameras.main.fadeIn(500, 255, 230, 245);

    this.scoreText = txt(this, W / 2, 50, '', 40).setStroke('#ffffff', 8).setDepth(20);   // 上方置中：⭐ 目前得分/滿分
    this.addScore(0);
    this.progress = txt(this, W - 70, 50, '', 30).setStroke('#ffffff', 7).setDepth(20);
    this.teamText = txt(this, W / 2, 98, '', 30).setStroke('#ffffff', 7).setDepth(20);   // 隊伍人數
    this.spawnFriend();
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
    this.scrollers.forEach(s => s.sp.tilePositionX = this.dist * s.f);
    this.signs.forEach(s => s.obj.x = HERO_X + s.x - this.dist);
    this.updateCritters(time, dt);
    this.updateFriends();
    this.updateRewards();
    if (this.state !== 'walk') return;
    if (this.round < ROUNDS && this.dist >= this.stops[this.round]) this.ask();
    else if (this.round >= ROUNDS && this.dist >= this.finishX - 200) this.finish();
  }
  // ---- 朋友：每一題有一隻小恐龍朋友在路邊等你，答對就加入隊伍，跟著你一起走 ----
  spawnFriend() {
    const used = this.friends.map(f => `${f.char}_${f.color}`);
    let char, color, tries = 0;
    do { char = pick(Object.keys(CHARS).filter(c => c !== look.char)); color = pick(Object.keys(DINOS)); } while (used.includes(`${char}_${color}`) && ++tries < 30);
    const key = k => `${k}_${char}_${color}`;
    if (!this.textures.exists(key('heroIdle'))) makeDino(this, char, color);
    const c = this.add.container(HERO_X + 470, GROUND).setDepth(4);
    const sp = this.add.sprite(0, 0, key('heroIdle')).setOrigin(.5, 1).setScale(.6).setFlipX(true);   // 面向主角
    const bubble = txt(this, 0, -118, '❓', 34);
    c.add([sp, bubble]);
    this.tweens.add({ targets: bubble, y: -128, duration: 500, yoyo: true, repeat: -1 });
    const f = { c, sp, bubble, char, color, wx: this.stops[this.round] + 270 };
    this.waiting = f; this.worldFriends.push(f);
  }
  updateFriends() {
    this.worldFriends = this.worldFriends.filter(f => {
      f.c.x = HERO_X + f.wx - this.dist;
      if (f.c.x < -120) { f.c.destroy(); if (this.waiting === f) this.waiting = null; return false; }
      return true;
    });
  }
  // 朋友加入：跳起來、彈到隊伍的位置，之後跟著主角蹦蹦跳跳
  friendJoin() {
    const f = this.waiting;
    if (!f) return;
    this.waiting = null;
    this.worldFriends = this.worldFriends.filter(w => w !== f);
    this.friends.push({ char: f.char, color: f.color });
    f.bubble.destroy();
    f.sp.setTexture(`heroCheer_${f.char}_${f.color}`).setFlipX(false);
    if (this.team.length >= TEAM_MAX) {                          // 隊伍站不下時，最早的朋友回家
      const old = this.team.shift();
      this.tweens.add({ targets: old, alpha: 0, y: old.y - 40, duration: 400, onComplete: () => old.destroy() });
    }
    this.team.push(f.c);
    this.team.forEach((m, i) => { if (m !== f.c) this.tweens.add({ targets: m, x: TEAM_X(i), duration: 400 }); });
    const [x0, y0, tx, ty] = [f.c.x, f.c.y, TEAM_X(this.team.length - 1), TEAM_Y];
    this.tweens.addCounter({
      from: 0, to: 1, duration: 800, ease: 'Sine.inOut',
      onUpdate: tw => { const t = tw.getValue(); f.c.setPosition(x0 + (tx - x0) * t, y0 + (ty - y0) * t - Math.sin(Math.PI * t) * 110); f.c.setScale(1 - .17 * t); },
      onComplete: () => {
        f.sp.setTexture(`heroIdle_${f.char}_${f.color}`);
        this.tweens.add({ targets: f.sp, y: -8, duration: 260, yoyo: true, repeat: -1, delay: Math.random() * 200 });   // 一直蹦蹦跳跳
      }
    });
    this.teamText.setText(`👥 ${this.friends.length}`);
    this.tweens.add({ targets: this.teamText, scale: 1.3, duration: 160, yoyo: true });
  }

  // ---- 連續答對的獎勵：連對 3 題戴皇冠、連對 5 題出現彩虹（答錯就消失）----
  makeRainbow() {
    const g = this.add.graphics().setDepth(4);
    [0xff8fa8, 0xffb36b, 0xffe27a, 0x8fe0b4, 0x8fd0f5, 0xc3a4f2].forEach((c, i) => {
      g.lineStyle(10, c, .9).beginPath().arc(HERO_X, GROUND - 40, 132 + i * 9, Math.PI, Math.PI * 2).strokePath();
    });
    return g;
  }
  updateRewards() {
    const h = this.hero, [ax, ay] = CHARS[look.char].crown;
    this.crown.setPosition(h.x - 80 + ax, h.y - 150 + ay);
    this.rainbow.y = h.y - GROUND;
  }
  popBanner(text, y = 150) {
    const b = txt(this, W / 2, y, text, 56, '#ffffff').setStroke('#b99be0', 12).setDepth(25).setAlpha(0).setScale(.6);
    this.tweens.add({ targets: b, alpha: 1, scale: 1, duration: 450, ease: 'Back.out' });
    this.tweens.add({ targets: b, alpha: 0, y: y - 30, delay: 2000, duration: 600, onComplete: () => b.destroy() });
  }
  addStreak() {
    this.streak++;
    const msg = { 3: '👑 連對 3 題！', 5: '🌈 連對 5 題！', 7: '🔥 連對 7 題！', 9: '🏆 連對 9 題！' }[this.streak];
    if (this.streak >= 3 && !this.crown.visible) {
      this.crown.setVisible(true);
      this.tweens.add({ targets: this.crown, scale: { from: 2.2, to: 1 }, alpha: { from: 0, to: 1 }, duration: 400, ease: 'Back.out' });
    }
    if (this.streak >= 5 && !this.rainbow.visible) {
      this.rainbow.setVisible(true);
      this.tweens.add({ targets: this.rainbow, alpha: { from: 0, to: 1 }, duration: 600 });
    }
    if (msg) { this.popBanner(msg, 190); beep([784, 988, 1175]); }
  }
  loseStreak() {
    if (!this.streak) return;
    this.streak = 0;
    [this.crown, this.rainbow].forEach(o => { if (o.visible) { sparkle(this, this.hero.x, this.hero.y - 100, 5); o.setVisible(false); } });
  }

  spawnCritter() {
    const [emoji, kind] = pick(CRITTERS[this.terrains[Math.min(2, Math.floor(this.round / 3))]]);
    const o = this.add.text(W + 50, 0, emoji, { fontSize: '56px' }).setOrigin(.5).setPadding(12).setDepth(kind === 'ground' ? 3 : 6)
      .setInteractive({ useHandCursor: true });
    const c = { o, kind, wx: this.dist + W - HERO_X + 50, x: W + 50, y0: 0, vx: 0, t0: this.nowT, hop: false, gone: false };
    if (kind === 'ground') o.y = c.y0 = GROUND + Phaser.Math.Between(50, 170);
    else { c.y0 = kind === 'fly' ? Phaser.Math.Between(200, 520) : Phaser.Math.Between(160, 320); c.vx = kind === 'fly' ? Phaser.Math.Between(110, 190) : 35; }
    o.on('pointerdown', () => this.tapCritter(c));
    this.critters.push(c);
  }
  tapCritter(c) {
    if (c.gone || c.hop) return;
    beep([pick([523, 587, 659, 784, 880])]);
    sparkle(this, c.o.x, c.o.y);
    if (c.kind === 'ground') {
      c.hop = true;
      this.tweens.add({ targets: c.o, y: c.o.y - 80, angle: { from: -12, to: 12 }, duration: 220, yoyo: true, ease: 'Sine.out', onComplete: () => { c.o.setAngle(0); c.hop = false; } });
    } else {
      c.gone = true;
      this.tweens.add({ targets: c.o, scale: 2, alpha: 0, y: c.o.y - 140, angle: 180, duration: 500, onComplete: () => c.o.destroy() });
    }
  }
  updateCritters(time, dt) {
    this.nowT = time;
    if (!this.nextCritter) this.nextCritter = time + 1500;
    if (this.state === 'walk' && time > this.nextCritter) {
      this.nextCritter = time + Phaser.Math.Between(2500, 5000);
      if (this.round >= ROUNDS || this.stops[this.round] - this.dist > 320) this.spawnCritter();   // 快到問號路牌時不放，畫面才不會太雜
    }
    this.critters = this.critters.filter(c => {
      const o = c.o;
      if (!o.active) return false;
      if (c.kind === 'ground') o.x = HERO_X + c.wx - this.dist;
      else if (!c.gone) { c.x -= c.vx * dt / 1000; o.x = c.x; o.y = c.y0 + Math.sin((time - c.t0) / (c.kind === 'fly' ? 280 : 900)) * (c.kind === 'fly' ? 26 : 12); }
      if (o.x < -80) { o.destroy(); return false; }
      return true;
    });
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
    if (!spec.drag) p.add(spec.bigIsEmoji ? this.add.text(0, -120, spec.big, { fontSize: '110px' }).setOrigin(0.5) : txt(this, 0, -120, spec.big, spec.bigSize, '#f06a9b'));
    this.question = txt(this, 0, spec.drag ? 8 : -15, spec.text, 32, INK, 440);
    p.add(this.question);
    const bw = 125, gap = 155, rowY = spec.drag ? 140 : 125;
    spec.options.forEach(({ value, label }, i) => {
      const onPick = b => {
        if (this.state !== 'ask') return;
        if (spec.drag) { this.dropOn(value, b); return; }
        if (value === this.answer) { this.state = 'cheer'; if (spec.bubble) this.popBubble(b); this.correct(); }
        else this.miss(b);
      };
      const color = spec.pic ? 0xfff3d6 : COLORS[(i + this.round) % COLORS.length];
      const btn = spec.bubble ? this.makeBubble((i - 1) * gap, [135, 105, 140][i], label, i, onPick)
        : button(this, (i - 1) * gap, rowY, bw, spec.drag ? 110 : 125, color, label, spec.optSize, onPick, spec.pic);
      this.choices.push({ letter: value, btn });
      p.add(btn);
    });
    p.add(button(this, 195, -165, 70, 70, 0xffd96b, '🔊', 34, () => this.speakQuestion()));
    if (spec.drag) this.makeCard(spec.big);
    this.tweens.add({ targets: p, y: PANEL_Y, duration: 450, ease: 'Back.out' });
    this.speakQuestion();
  }
  // 戳泡泡：選項是會輕輕飄動的泡泡，hit 是點擊範圍（miss 會用它把點錯的泡泡停用）
  makeBubble(x, y, emoji, i, onPick) {
    const b = this.add.container(x, y), f = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(0xb8e4ff, .32).fillCircle(0, 0, 60);
    g.lineStyle(5, 0xffffff, .95).strokeCircle(0, 0, 60);
    g.lineStyle(3, 0x8fc9f5, .55).strokeCircle(0, 0, 54);
    g.fillStyle(0xffffff, .85).fillEllipse(-26, -32, 22, 12);
    const t = this.add.text(0, 3, emoji, { fontSize: '64px' }).setOrigin(.5);
    const hit = this.add.rectangle(0, 0, 130, 130, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => onPick(b));
    f.add([g, t, hit]); b.add(f); b.hit = hit;
    this.tweens.add({ targets: f, x: 10, duration: 1700 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: f, y: 14, duration: 1300 + i * 250, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return b;
  }
  popBubble(b) {
    sparkle(this, W / 2 + b.x, PANEL_Y + b.y, 8);
    this.tweens.add({ targets: b, scale: 1.6, alpha: 0, duration: 300 });
  }
  // 拖曳配對：字母卡放在世界座標（不放在面板容器裡，拖曳座標才不會被容器轉換搞亂），手指拖到選項上放開就算答案
  // 點一下選項也可以：字母卡會自己飛過去，年紀小的小朋友不一定拖得動
  makeCard(letter) {
    const home = this.cardHome = { x: W / 2, y: PANEL_Y - 98 }, startY = home.y - (PANEL_Y + 400);
    const card = this.card = button(this, home.x, startY, 130, 130, 0xff9db8, letter, 90, () => {}).setDepth(31);
    card.last.destroy();
    const handle = this.handle = this.add.rectangle(home.x, startY, 150, 150, 0xffffff, 0.001).setDepth(32).setInteractive({ draggable: true, useHandCursor: true });
    this.tweens.add({ targets: [card, handle], y: home.y, duration: 450, ease: 'Back.out' });
    handle.on('dragstart', () => { if (this.state === 'ask') card.setScale(1.12); });
    handle.on('drag', (pointer, dx, dy) => { if (this.state === 'ask') { handle.setPosition(dx, dy); card.setPosition(dx, dy); } });
    handle.on('dragend', () => {
      card.setScale(1);
      if (this.state !== 'ask') return;
      const hit = this.choices.find(c => Math.abs(handle.x - (W / 2 + c.btn.x)) < 80 && Math.abs(handle.y - (PANEL_Y + c.btn.y)) < 80);
      if (hit) this.dropOn(hit.letter, hit.btn); else this.moveCard(this.cardHome);
    });
  }
  moveCard({ x, y }) {
    if (!this.card) return;
    this.tweens.add({ targets: [this.card, this.handle], x, y, duration: 280, ease: 'Sine.inOut' });
  }
  dropOn(value, btn) {
    const slot = { x: W / 2 + btn.x, y: PANEL_Y + btn.y - 14 };
    if (value === this.answer) { this.state = 'cheer'; this.moveCard(slot); this.correct(); return; }
    this.miss(btn);
    this.moveCard(this.state === 'reveal' ? this.slotOf(this.answer) : this.cardHome);   // 答錯：字母卡飛回原位；公布答案：飛到正確的位置
  }
  slotOf(value) {
    const b = this.choices.find(c => c.letter === value).btn;
    return { x: W / 2 + b.x, y: PANEL_Y + b.y - 14 };
  }
  addScore(n) {
    this.score += n;
    this.scoreText.setText(`⭐ ${this.score}/${ROUNDS * 3}`);
    if (n) this.tweens.add({ targets: this.scoreText, scale: 1.3, duration: 160, yoyo: true });
  }
  speakQuestion() {
    if (this.state !== 'ask') return;
    const { type, dir, letter, en, zh } = this.q;
    const to = dir === 'toUpper' ? '大寫' : '小寫';
    say({
      case: [[`哪一個是${to}的`, 'zh-TW'], [letter, 'en-US']],
      drag: [[`把它拖到${to}的`, 'zh-TW'], [letter, 'en-US']],
      bubble: [[en, 'en-US'], [en, 'en-US']],
      wordToPic: [[en, 'en-US'], [en, 'en-US']],   // 純英文語音，聽了選圖；中文只留在畫面上輔助
      word: [[en, 'en-US'], [zh + '，是哪個字母開頭呢？', 'zh-TW']]
    }[type]);
  }
  // 公布答案時唸的內容與畫面文字
  answerParts() {
    const { type, letter, en, zh } = this.q;
    if (type === 'case' || type === 'drag') return [];   // 大小寫題答對或公布答案時不重唸字母，只唸稱讚／安慰
    if (type === 'word') return [[`${letter}, ${letter}, ${en}!`, 'en-US'], [zh, 'zh-TW']];
    return [[en, 'en-US'], [zh, 'zh-TW']];   // 單字與圖片配對：直接唸英文與中文
  }
  announce() {
    const { type, letter, en, zh } = this.q;
    const text = type === 'case' || type === 'drag' ? `大寫 ${letter}　小寫 ${letter.toLowerCase()}`
      : type === 'word' ? `${letter} is for ${en}!
${zh}` : `${en}
${zh}`;
    this.question.setText(text).setColor('#f06a9b').setFontSize(40);
  }
  correct() {
    this.addScore(3 - this.wrong);
    if (this.wrong === 0) this.addStreak();
    this.friendJoin();
    beep([523, 659, 784]); popper(this, this.hero);
    this.hero.setTexture(tex('heroCheer'));
    this.tweens.add({ targets: this.hero, y: GROUND - 70, duration: 250, yoyo: true, repeat: 1, ease: 'Sine.out' });
    this.announce();
    say([...this.answerParts(), [pick(PRAISE), 'zh-TW']]).then(() => this.next());
  }
  miss(btn) {
    this.wrong++;
    this.loseStreak();
    beep([200]);
    (btn.hit || btn.last).disableInteractive();   // 點錯的選項變淡，不能再點
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
    if (this.card) {
      const extra = [this.card, this.handle];
      this.handle.disableInteractive();
      this.tweens.add({ targets: extra, alpha: 0, duration: 250, onComplete: () => extra.forEach(o => o.destroy()) });
      this.card = this.handle = null;
    }
    this.tweens.add({ targets: this.panel, y: -400, duration: 350, ease: 'Back.in', onComplete: () => {
      this.panel.destroy(); this.round++;
      this.hero.setY(GROUND).play(walkKey()); this.state = 'walk';
      this.waiting = null;                                     // 沒有答對的話，等你的朋友就留在原地，隨背景走遠
      if (this.round < ROUNDS) this.spawnFriend();
      if (this.round === 3 || this.round === 6) this.enterTerrain(this.terrains[this.round / 3]);
    } });
  }
  // 走到第 4、7 題前換地形：背景淡入新的景色，上方跳出地名
  enterTerrain(terrain) {
    swapTerrain(this, this.layers, this.scrollers, terrain);
    const { name, icon } = TERRAINS[terrain];
    beep([659, 784, 988]);
    this.popBanner(`${icon} ${name}`);
  }
  finish() {
    this.state = 'end'; this.hero.stop().setTexture(tex('heroCheer'));
    this.cameras.main.fadeOut(600, 255, 230, 245);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Bonus', { score: this.score, max: ROUNDS * 3, friends: this.friends }));
  }
}

// ============ 場景：結尾寶箱（10 題結束後，點開寶箱，得到的星星就是剛剛的分數）============
// 主角和這局加入隊伍的朋友們一起在旁邊歡呼，打開後再進到總分畫面
class BonusScene extends Phaser.Scene {
  constructor() { super('Bonus'); }
  create({ score, max, friends }) {
    ensureLook(this);
    addBackdrop(this);
    const rate = score / max;
    const [color, dark] = rate >= 0.8 ? [0xffc94d, 0xd99a2b] : rate >= 0.5 ? [0xff9db8, 0xe57596] : [0x8fd0f5, 0x62b3e6];   // 分數越高寶箱越閃亮
    txt(this, W / 2, 80, '寶箱時間！', 58, '#ffffff').setStroke('#b99be0', 12);

    // 主角與朋友們
    const hero = this.add.sprite(W / 2, 690, tex('heroCheer')).setOrigin(0.5, 1).setScale(.9);
    this.tweens.add({ targets: hero, y: 660, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.out' });
    const n = friends.length, gap = Math.min(80, 440 / Math.max(n, 1));
    friends.forEach(({ char, color: c }, i) => {
      const key = k => `${k}_${char}_${c}`;
      if (!this.textures.exists(key('heroCheer'))) makeDino(this, char, c);
      const f = this.add.sprite(W / 2 + (i - (n - 1) / 2) * gap, 810, key('heroCheer')).setOrigin(0.5, 1).setScale(.5);
      this.tweens.add({ targets: f, y: 790, duration: 300, yoyo: true, repeat: -1, delay: i * 90, ease: 'Quad.out' });
    });

    // 寶箱：箱身加上可以掀開的箱蓋（以左邊為轉軸）
    const rays = this.add.graphics().setPosition(W / 2, 330).setAlpha(0);
    rays.fillStyle(0xfff3b0, .5);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; rays.fillTriangle(0, 0, Math.cos(a - .09) * 330, Math.sin(a - .09) * 330, Math.cos(a + .09) * 330, Math.sin(a + .09) * 330); }
    const chest = this.add.container(W / 2, 330);
    const body = this.add.graphics();
    body.fillStyle(0x6b4a3a, .35).fillRoundedRect(-100, 4, 200, 112, 16);
    body.fillStyle(dark).fillRoundedRect(-100, -10, 200, 112, 16);
    body.fillStyle(color).fillRoundedRect(-96, -10, 192, 100, 14);
    body.fillStyle(dark).fillRect(-62, -10, 16, 100).fillRect(46, -10, 16, 100);
    const inside = this.add.graphics().fillStyle(0x4a3040).fillEllipse(0, -10, 192, 30);
    const lid = this.add.container(-100, -10);
    const lg = this.add.graphics();
    lg.fillStyle(dark).fillRoundedRect(0, -64, 200, 76, { tl: 40, tr: 40, bl: 6, br: 6 });
    lg.fillStyle(color).fillRoundedRect(4, -60, 192, 66, { tl: 36, tr: 36, bl: 4, br: 4 });
    lg.fillStyle(dark).fillRect(38, -62, 16, 70).fillRect(146, -62, 16, 70);
    lid.add(lg);
    const lock = this.add.graphics().fillStyle(0xfff3b0).fillCircle(0, 6, 15).fillStyle(0xd99a2b).fillRect(-4, 0, 8, 14);
    chest.add([inside, body, lid, lock]);
    const shake = this.tweens.add({ targets: chest, angle: { from: -4, to: 4 }, duration: 160, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const prompt = txt(this, W / 2, 500, '點一下寶箱！', 52, '#f06a9b').setStroke('#ffffff', 10);
    this.tweens.add({ targets: prompt, scale: 1.12, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true; shake.stop(); chest.setAngle(0); prompt.destroy();
      sayId++;
      lock.setVisible(false);
      this.tweens.add({ targets: lid, angle: -115, duration: 450, ease: 'Back.out' });
      this.tweens.add({ targets: rays, alpha: 1, duration: 300 });
      this.tweens.add({ targets: rays, angle: 360, duration: 9000, repeat: -1 });
      beep([523, 659, 784, 1046]);
      popper(this, { x: W / 2, y: 420 });
      const total = txt(this, W / 2, 520, '⭐ × 0', 68, '#f06a9b').setStroke('#ffffff', 12);
      say([['Wow!', 'en-US'], [`${score} 顆星星！`, 'zh-TW']]);
      // 星星一顆一顆飛出來，落在寶箱四周
      const stars = Math.min(score, 30);
      for (let i = 0; i < stars; i++) {
        this.time.delayedCall(500 + i * 70, () => {
          const s = this.add.text(W / 2, 300, '⭐', { fontSize: '40px' }).setOrigin(.5).setDepth(10);
          const tx = Phaser.Math.Between(30, W - 30), ty = Phaser.Math.Between(150, 470);
          this.tweens.add({ targets: s, x: tx, y: { value: ty, ease: 'Bounce.out' }, angle: 360, duration: 700, ease: 'Sine.out' });
          total.setText(`⭐ × ${i + 1}`);
          if (i % 3 === 0) beep([pick([659, 784, 880, 1046])]);
        });
      }
      this.time.delayedCall(500 + stars * 70 + 900, () => {
        const b = button(this, W / 2, 900, 320, 84, COLORS[0], '▶ 看總分', 40, () => { sayId++; this.scene.start('End', { score, max }); });
        b.setScale(0); this.tweens.add({ targets: b, scale: 1, duration: 350, ease: 'Back.out' });
      });
    };
    this.add.rectangle(W / 2, 320, 260, 240, 0xffffff, 0.001).setInteractive({ useHandCursor: true }).on('pointerdown', open);
    this.cameras.main.fadeIn(500, 255, 230, 245);
    say([['點一下，打開寶箱！', 'zh-TW']]);
  }
}

// ============ 場景：結束（統計總分）============
class EndScene extends Phaser.Scene {
  constructor() { super('End'); }
  create({ score, max, again = 'Walk' }) {
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

    button(this, W / 2, 790, 320, 84, COLORS[1], '🔁 再玩一次', 40, () => { sayId++; rollLook(); this.scene.start(again); });
    button(this, W / 2, 890, 320, 84, COLORS[4], '🏠 回首頁', 40, () => { sayId++; this.scene.start('Title'); });
    this.cameras.main.fadeIn(500, 255, 230, 245);
    beep([523, 659, 784, 1046]); confetti(this);
    this.time.addEvent({ delay: 1800, loop: true, callback: () => confetti(this) });
    say([['You did it!', 'en-US'], [`你得到 ${score} 分，真棒！`, 'zh-TW']]);
  }
}

// ============ 場景：餵恐龍（恐龍說想吃的食物單字，把對的食物拖給牠）============
// 每局 8 隻食物、開頭字母不重複；三張卡的食物開頭字母都不同
const FEED_ROUNDS = 8;
const FEED_FOODS = ['Apple', 'Avocado', 'Banana', 'Bread', 'Broccoli', 'Candy', 'Carrot', 'Cherry', 'Cookie', 'Cheese', 'Coconut', 'Corn',
  'Cucumber', 'Donut', 'Egg', 'French fries', 'Grapes', 'Hamburger', 'Hot dog', 'Ice cream', 'Kiwi', 'Lemon', 'Lollipop', 'Milk', 'Melon',
  'Noodles', 'Orange', 'Pizza', 'Peach', 'Pear', 'Pineapple', 'Popcorn', 'Pancakes', 'Rice', 'Strawberry', 'Sandwich', 'Tomato', 'Watermelon'];
function pickFeedQuestions() {
  const byLetter = {};
  for (const L in WORDS) for (const [en, zh, emoji] of WORDS[L]) if (FEED_FOODS.includes(en)) (byLetter[L] = byLetter[L] || []).push({ en, zh, emoji });
  return shuffle(Object.keys(byLetter)).slice(0, FEED_ROUNDS).map(letter => {
    const answer = pick(byLetter[letter]);
    const others = shuffle(Object.keys(byLetter).filter(l => l !== letter)).slice(0, 2).map(l => pick(byLetter[l]));
    return { letter, answer, options: shuffle([answer, ...others]) };
  });
}

const FEED_DINO = { x: W / 2, y: 880, scale: 1.5 };
const FEED_MOUTH = { x: W / 2 + 40, y: 750 };   // 食物拖到這附近就算餵到嘴巴
const FEED_CARD_Y = 545;
class FeedScene extends Phaser.Scene {
  constructor() { super('Feed'); }
  create() {
    ensureLook(this);
    addBackdrop(this);
    this.round = -1; this.score = 0; this.wrong = 0; this.state = 'idle'; this.left = false; this.cards = [];
    this.qs = pickFeedQuestions();

    button(this, 50, 50, 64, 64, 0xc3a4f2, '🏠', 30, () => { this.left = true; sayId++; if (hasTTS) speechSynthesis.cancel(); this.scene.start('Title'); }).setDepth(20);
    // 肚子裡的食物：吃一個就多一格
    const slots = this.add.graphics();
    this.slotX = i => 130 + i * 50;
    for (let i = 0; i < FEED_ROUNDS; i++) slots.fillStyle(0xffffff, .7).fillCircle(this.slotX(i), 70, 22).lineStyle(3, 0xd4c1f5).strokeCircle(this.slotX(i), 70, 22);

    // 恐龍：吃得越多越胖一點
    this.dino = this.add.sprite(FEED_DINO.x, FEED_DINO.y, tex('heroIdle')).setOrigin(.5, 1).setScale(FEED_DINO.scale).setDepth(5);
    this.idleTween = this.tweens.add({ targets: this.dino, y: FEED_DINO.y - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // 恐龍的想法泡泡：大大的字母
    const b = this.bubble = this.add.container(W / 2, 235).setDepth(10);
    const g = this.add.graphics();
    g.fillStyle(0xb99be0, .3).fillRoundedRect(-205, -112, 420, 250, 40);
    g.fillStyle(0xffffff).fillRoundedRect(-210, -125, 420, 250, 40).fillTriangle(-20, 120, 20, 120, 0, 160);
    g.lineStyle(5, 0xd4c1f5).strokeRoundedRect(-210, -125, 420, 250, 40);
    this.letterText = txt(this, 0, -25, '', 110, '#f06a9b');
    this.hintText = txt(this, 0, 80, '', 30);
    const hit = this.add.rectangle(0, 0, 420, 250, 0xffffff, 0.001).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.speakQuestion());
    b.add([g, this.letterText, this.hintText, hit]);

    this.cameras.main.fadeIn(400, 255, 230, 245);
    this.time.delayedCall(500, () => this.next());
  }

  next() {
    if (this.left) return;
    this.round++;
    if (this.round >= FEED_ROUNDS) { this.finish(); return; }
    const q = this.q = this.qs[this.round];
    this.wrong = 0;
    this.dino.setTexture(tex('heroIdle')).setAngle(0);
    this.letterText.setText(q.answer.en).setFontSize(Math.min(110, Math.floor(380 / (q.answer.en.length * .6))));
    this.hintText.setText(`我想吃 ${q.answer.zh}`);
    this.bubble.setScale(.6);
    this.tweens.add({ targets: this.bubble, scale: 1, duration: 400, ease: 'Back.out' });
    this.makeCards(q);
    this.state = 'ask';
    this.speakQuestion();
  }
  speakQuestion() {
    if (this.state !== 'ask') return;
    say([['我想吃', 'zh-TW'], [this.q.answer.en, 'en-US']]);
  }

  // 三張食物卡：可以拖給恐龍，也可以直接點一下
  makeCards(q) {
    this.cards = q.options.map((food, i) => {
      const x = 95 + i * 175, y = FEED_CARD_Y;
      const c = this.add.container(x, y - 60).setDepth(30).setAlpha(0);
      const g = this.add.graphics();
      g.fillStyle(0xb99be0, .3).fillRoundedRect(-75, -85, 150, 190, 28);
      g.fillStyle(0xffffff).fillRoundedRect(-75, -95, 150, 190, 28).lineStyle(4, 0xd4c1f5).strokeRoundedRect(-75, -95, 150, 190, 28);
      c.add([g, txt(this, 0, 0, food.emoji, 100, '#000000')]);
      const handle = this.add.rectangle(x, y, 160, 200, 0xffffff, 0.001).setDepth(31).setInteractive({ draggable: true, useHandCursor: true });
      const card = { food, c, handle, home: { x, y }, dragged: false };
      this.tweens.add({ targets: c, y, alpha: 1, duration: 400, delay: i * 120, ease: 'Back.out' });
      handle.on('pointerdown', () => { card.dragged = false; if (this.state === 'ask') say([[food.en, 'en-US']]); });
      handle.on('dragstart', () => { card.dragged = true; if (this.state === 'ask') { c.setScale(1.1).setDepth(35); handle.setDepth(36); } });
      handle.on('drag', (pointer, dx, dy) => {
        if (this.state !== 'ask') return;
        handle.setPosition(dx, dy); c.setPosition(dx, dy);
        const near = Math.hypot(dx - FEED_MOUTH.x, dy - FEED_MOUTH.y) < 190;     // 靠近嘴巴時恐龍張開嘴「啊～」
        this.dino.setTexture(tex(near ? 'heroCheer' : 'heroIdle'));
      });
      handle.on('dragend', () => {
        c.setScale(1).setDepth(30); handle.setDepth(31);
        if (this.state !== 'ask') return;
        if (Math.hypot(handle.x - FEED_MOUTH.x, handle.y - FEED_MOUTH.y) < 190) this.feed(card);
        else { this.dino.setTexture(tex('heroIdle')); this.sendHome(card); }
      });
      handle.on('pointerup', () => { if (!card.dragged) this.feed(card); });
      return card;
    });
  }
  sendHome(card) { this.tweens.add({ targets: [card.c, card.handle], x: card.home.x, y: card.home.y, duration: 280, ease: 'Sine.inOut' }); }

  feed(card) {
    if (this.state !== 'ask') return;
    if (card.food === this.q.answer) { this.state = 'cheer'; this.eat(card, [[`${card.food.en}!`, 'en-US'], [pick(PRAISE), 'zh-TW']], true); return; }
    // 答錯：食物搖頭飛回去
    this.wrong++;
    this.sendHome(card);
    this.tweens.add({ targets: this.dino, angle: { from: -6, to: 6 }, duration: 110, yoyo: true, repeat: 2, onComplete: () => this.dino.setAngle(0) });
    this.dino.setTexture(tex('heroIdle'));
    beep([330, 262]);
    if (this.wrong === 1) {
      say([[card.food.en, 'en-US'], ['不是', 'zh-TW'], [this.q.answer.en, 'en-US'], ['喔', 'zh-TW']]);
      return;
    }
    // 第二次還是不對：安慰一下，直接把正確的食物餵給恐龍
    this.state = 'reveal';
    const right = this.cards.find(c => c.food === this.q.answer);
    this.tweens.add({ targets: right.c, scale: 1.18, duration: 220, yoyo: true, repeat: 1 });
    this.time.delayedCall(800, () => { if (!this.left) this.eat(right, [['沒關係，下次再加油喔！', 'zh-TW']], false); });
  }

  // 食物飛進嘴裡，恐龍開心地咀嚼；celebrate = 答對的慶祝（拉炮、加分）
  eat(card, parts, celebrate) {
    const idx = this.round, other = this.cards.filter(c => c !== card);
    other.forEach(o => { o.handle.disableInteractive(); this.tweens.add({ targets: o.c, alpha: 0, y: o.c.y + 40, duration: 300 }); });
    card.handle.disableInteractive();
    this.dino.setTexture(tex('heroCheer'));
    this.tweens.add({
      targets: [card.c, card.handle], x: FEED_MOUTH.x, y: FEED_MOUTH.y, scale: .25, duration: 380, ease: 'Sine.in',
      onComplete: () => {
        card.c.setAlpha(0);
        this.chomp(celebrate);
        const slot = txt(this, this.slotX(idx), 70, card.food.emoji, 34, '#000000').setDepth(21).setScale(0);
        this.tweens.add({ targets: slot, scale: 1, duration: 350, ease: 'Back.out' });
      }
    });
    if (celebrate) {
      this.score += Math.max(0, 3 - this.wrong);
      this.time.delayedCall(380, () => { beep([523, 659, 784]); popper(this, this.dino); });
    }
    const voice = parts.length ? say(parts) : Promise.resolve();
    Promise.all([voice, new Promise(r => this.time.delayedCall(1700, r))]).then(() => {
      this.cards.forEach(c => { c.c.destroy(); c.handle.destroy(); });
      this.cards = [];
      this.next();
    });
  }
  chomp(celebrate) {
    const s = this.dino.scaleX, grow = FEED_DINO.scale + (this.round + 1) * .035;
    this.tweens.add({ targets: this.dino, scaleX: s * 1.12, scaleY: s * .9, duration: 130, yoyo: true, repeat: 2, onComplete: () => this.dino.setScale(grow) });
    if (celebrate) sparkle(this, FEED_MOUTH.x, FEED_MOUTH.y - 60, 8);
  }

  finish() {
    this.state = 'end';
    this.bubble.destroy();
    this.cameras.main.fadeOut(600, 255, 230, 245);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('End', { score: this.score, max: FEED_ROUNDS * 3, again: 'Feed' }));
  }
}

new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: W, height: H, backgroundColor: '#d9f7e6',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [TitleScene, SelectScene, WalkScene, FeedScene, BonusScene, EndScene]
});
