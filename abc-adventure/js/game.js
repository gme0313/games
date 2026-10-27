// ABC 冒險：小暴龍走路原型（Phaser 3，直式）
const W = 540, H = 960, GROUND = 720, HERO_X = 150;
const FONT = '"Chalkboard SE","Comic Sans MS","Noto Sans TC","Microsoft JhengHei",sans-serif';
const INK = '#7a5c99';
const COLORS = [0xff9db8, 0x8fd0f5, 0x8fe0b4, 0xffc46b, 0xc3a4f2, 0xffa98a];
const POOL = 'ABCDE';      // 本關出題的字母範圍
const ROUNDS = 5;          // 本關題數
const SPEED = 170;         // 小暴龍走路速度（像素/秒）
const STOP_GAP = 590;      // 每題之間的距離（約 3.5 秒的路程）

const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);

// ---- 語音與音效 ----
const PRAISE = ['你好棒！', '答對了，好厲害！', '哇，你好聰明喔！', '太棒了，答對囉！'];
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
function beep(freqs) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * .12;
      o.frequency.value = f; o.type = 'triangle';
      g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.001, t + .2);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + .22);
    });
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
function button(scene, x, y, w, h, color, label, size, cb) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0xb99be0, .35).fillRoundedRect(-w / 2, -h / 2 + 7, w, h, 26);
  g.fillStyle(0xffffff).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 28);
  g.fillStyle(color).fillRoundedRect(-w / 2, -h / 2, w, h, 24);
  const t = txt(scene, 0, 0, label, size, '#ffffff').setStroke('#9b7cc9', 6);
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

// ---- 以程式繪製素材（原型階段不需要圖檔）----
// 可愛小暴龍，面向右邊。a / b：後腳 / 前腳抬起的高度；bob：身體上下彈跳；tail：尾巴擺動
function makeDinoFrame(scene, key, { a = 0, b = 0, bob = 0, tail = 0, cheer = false } = {}) {
  const GREEN = 0x86dba3, DARK = 0x5fc08a, BELLY = 0xe8f8d8, PINK = 0xffb3c7;
  const g = scene.add.graphics(), dy = bob;

  g.fillStyle(GREEN).fillTriangle(40, 78 - dy, 8, 96 - dy + tail, 44, 110 - dy);                // 尾巴
  g.fillCircle(8, 96 - dy + tail, 7);
  g.fillStyle(DARK).fillEllipse(56, 118, 30, 34).fillEllipse(62, 144 - a, 38, 18);              // 後腳
  g.fillStyle(PINK);                                                                            // 背上的小尖刺
  [48, 66, 84].forEach(x => g.fillTriangle(x - 9, 64 - dy, x, 44 - dy, x + 9, 64 - dy));
  g.fillTriangle(92, 26 - dy, 100, 10 - dy, 108, 26 - dy);
  g.fillStyle(GREEN).fillEllipse(68, 88 - dy, 86, 66);                                          // 身體
  g.fillStyle(DARK).fillCircle(46, 78 - dy, 5).fillCircle(60, 68 - dy, 4).fillCircle(40, 94 - dy, 4);
  g.fillStyle(BELLY).fillEllipse(78, 98 - dy, 52, 44);                                          // 肚子
  g.fillStyle(GREEN).fillEllipse(88, 118, 30, 34).fillEllipse(94, 144 - b, 38, 18);             // 前腳
  g.fillStyle(0xffffff).fillCircle(108, 145 - b, 3).fillCircle(101, 148 - b, 3);               // 腳趾
  if (cheer) g.fillStyle(GREEN).fillEllipse(104, 66 - dy, 13, 24);                              // 手：舉高
  else g.fillStyle(GREEN).fillEllipse(100, 96 - dy, 22, 12);                                    // 手：小短手
  g.fillStyle(GREEN).fillCircle(108, 54 - dy, 34).fillEllipse(128, 62 - dy, 38, 28);            // 頭與嘴
  g.fillStyle(0xff9db8, 0.7).fillCircle(112, 71 - dy, 6);                                       // 腮紅
  g.fillStyle(0xffffff).fillCircle(114, 46 - dy, 9);                                            // 眼睛
  g.fillStyle(0x4a3a5e).fillCircle(117, 47 - dy, 5.5);
  g.fillStyle(0xffffff).fillCircle(119, 45 - dy, 2);
  g.fillStyle(DARK).fillCircle(142, 56 - dy, 2);                                                // 鼻孔
  g.lineStyle(2.5, 0x3f8f68).beginPath().arc(129, 64 - dy, 9, 0.25, Math.PI - 0.25).strokePath(); // 微笑
  g.generateTexture(key, 160, 150);
  g.destroy();
}
function makeTextures(scene) {
  [{ a: 10, tail: -4 }, { bob: 3 }, { b: 10, tail: 4 }, { bob: 3 }].forEach((o, i) => makeDinoFrame(scene, 'hero' + i, o));
  makeDinoFrame(scene, 'heroIdle');
  makeDinoFrame(scene, 'heroCheer', { cheer: true });

  makeSky(scene);
  makeClouds(scene);
  makeMountains(scene);
  makeHills(scene);
  makeTrees(scene);
  makeGround(scene);
}

// ---- 粉筆質感背景：用 canvas 畫粗邊、排線、顆粒與缺口 ----
const rnd = (a, b) => a + Math.random() * (b - a);
const GROUND_H = H - GROUND + 6;   // 地面素材高度

function chalkTexture(scene, key, w, h, draw) {
  const tex = scene.textures.createCanvas(key, w, h);
  draw(tex.getContext());
  tex.refresh();
}
const tiled = (w, fn) => [-w, 0, w].forEach(fn);   // 左右各多畫一份，讓素材可以無縫重複

// 撒粉筆顆粒；erase 時在形狀上擦出小缺口，露出後面的圖層
function chalkGrain(ctx, w, h, n, erase) {
  ctx.save();
  if (erase) ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = erase ? 'rgba(0,0,0,.4)' : (Math.random() < 0.5 ? 'rgba(255,255,255,.3)' : 'rgba(150,110,200,.1)');
    const s = rnd(0.6, 2.2);
    ctx.fillRect(rnd(0, w), rnd(0, h), s, s);
  }
  ctx.restore();
}
// 一個粉筆形狀：先描粗邊、再填色、塗上斜線排線，最後抖動地描一圈亮邊
function chalkShape(ctx, path, fill, edge, [x0, y0, x1, y1]) {
  ctx.lineJoin = ctx.lineCap = 'round';
  ctx.beginPath(); path(); ctx.strokeStyle = edge; ctx.lineWidth = 7; ctx.stroke();
  ctx.beginPath(); path(); ctx.fillStyle = fill; ctx.fill();
  ctx.save();
  ctx.beginPath(); path(); ctx.clip();
  for (let y = y0; y < y1 + 20; y += 5) {
    for (let x = x0 - 20; x < x1; x += rnd(10, 22)) {
      ctx.strokeStyle = Math.random() < 0.55 ? 'rgba(255,255,255,.22)' : 'rgba(150,110,200,.1)';
      ctx.lineWidth = rnd(1.5, 3.5);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rnd(10, 28), y - rnd(5, 13)); ctx.stroke();
    }
  }
  ctx.restore();
  ctx.save();
  ctx.translate(rnd(-1.5, 1.5), rnd(-1.5, 1.5));
  ctx.beginPath(); path(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

function makeSky(scene) {
  chalkTexture(scene, 'sky', W, H, ctx => {
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#ffd3e6'); gr.addColorStop(0.35, '#e6d9ff'); gr.addColorStop(0.68, '#c9ecff'); gr.addColorStop(1, '#d9f7e6');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    ctx.lineCap = 'round';
    for (let i = 0; i < 170; i++) {                      // 大片橫向的粉筆筆觸
      ctx.strokeStyle = `rgba(255,255,255,${rnd(0.05, 0.14)})`; ctx.lineWidth = rnd(14, 34);
      const x = rnd(-40, W), y = rnd(0, H * 0.85);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rnd(60, 170), y + rnd(-10, 10)); ctx.stroke();
    }
    const glow = ctx.createRadialGradient(430, 170, 20, 430, 170, 150);   // 太陽與光暈
    glow.addColorStop(0, 'rgba(255,244,190,.8)'); glow.addColorStop(1, 'rgba(255,244,190,0)');
    ctx.fillStyle = glow; ctx.fillRect(250, 0, 290, 340);
    ctx.strokeStyle = 'rgba(255,236,160,.75)'; ctx.lineWidth = 4;
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2, r0 = 62, r1 = i % 2 ? 78 : 90;
      ctx.beginPath(); ctx.moveTo(430 + Math.cos(a) * r0, 170 + Math.sin(a) * r0); ctx.lineTo(430 + Math.cos(a) * r1, 170 + Math.sin(a) * r1); ctx.stroke();
    }
    chalkShape(ctx, () => ctx.arc(430, 170, 50, 0, Math.PI * 2), '#fff0b0', 'rgba(255,225,140,.8)', [380, 120, 480, 220]);
    for (let i = 0; i < 16; i++) {                       // 閃閃發光的小星星
      const x = rnd(20, W - 20), y = rnd(20, H * 0.5), s = rnd(4, 9);
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
    }
    chalkGrain(ctx, W, H, 9000, false);
  });
}
function makeClouds(scene) {
  chalkTexture(scene, 'clouds', W, 260, ctx => {
    tiled(W, dx => [[90, 70, 1], [330, 150, 0.75], [470, 40, 0.8]].forEach(([x, y, s]) => {
      x += dx;
      chalkShape(ctx, () => {
        [[-30, 10, 26], [4, -6, 32], [38, 8, 24]].forEach(([ox, oy, r]) => {
          ctx.moveTo(x + ox * s + r * s, y + oy * s); ctx.arc(x + ox * s, y + oy * s, r * s, 0, Math.PI * 2);
        });
        ctx.moveTo(x + 66 * s, y + 22 * s); ctx.ellipse(x + 4 * s, y + 22 * s, 62 * s, 18 * s, 0, 0, Math.PI * 2);
      }, 'rgba(255,255,255,.93)', 'rgba(190,160,230,.5)', [x - 70 * s, y - 40 * s, x + 75 * s, y + 42 * s]);
    }));
    chalkGrain(ctx, W, 260, 1500, true);
  });
}
function makeMountains(scene) {
  const range = (ctx, dx, peaks, base, fill) => chalkShape(ctx, () => {
    ctx.moveTo(dx, base); peaks.forEach(([x, y]) => ctx.lineTo(dx + x, y)); ctx.lineTo(dx + W, base); ctx.closePath();
  }, fill, 'rgba(255,255,255,.6)', [dx, 70, dx + W, base]);
  chalkTexture(scene, 'mountains', W, 300, ctx => {
    tiled(W, dx => range(ctx, dx, [[0, 170], [130, 110], [250, 180], [380, 90], [540, 170]], 300, '#f0d5f0'));
    tiled(W, dx => range(ctx, dx, [[0, 215], [90, 100], [190, 205], [290, 120], [400, 215], [470, 140], [540, 215]], 300, '#d6cbf5'));
    chalkGrain(ctx, W, 300, 2000, true);
  });
}
function makeHills(scene) {
  const hill = (ctx, dx, y0, a1, k1, p1, a2, k2, fill) => chalkShape(ctx, () => {
    ctx.moveTo(dx, 260);
    for (let x = 0; x <= W; x += 10) {   // 頻率都是整數，左右兩端剛好接得起來
      ctx.lineTo(dx + x, y0 + a1 * Math.sin(Math.PI * 2 * k1 * x / W + p1) + a2 * Math.sin(Math.PI * 2 * k2 * x / W));
    }
    ctx.lineTo(dx + W, 260); ctx.closePath();
  }, fill, 'rgba(255,255,255,.6)', [dx, 60, dx + W, 260]);
  chalkTexture(scene, 'hills', W, 260, ctx => {
    tiled(W, dx => hill(ctx, dx, 90, 24, 3, 2, 10, 2, '#ffdbe9'));
    tiled(W, dx => hill(ctx, dx, 140, 26, 2, 1, 12, 3, '#c5f0d8'));
    chalkGrain(ctx, W, 260, 2000, true);
  });
}
function makeTrees(scene) {
  const base = 196;
  const tree = (ctx, x, canopy) => {
    chalkShape(ctx, () => ctx.rect(x - 7, base - 74, 14, 74), '#d9b79a', 'rgba(255,255,255,.5)', [x - 7, base - 74, x + 7, base]);
    chalkShape(ctx, () => {
      [[0, -102, 32], [-22, -82, 24], [22, -82, 24]].forEach(([ox, oy, r]) => { ctx.moveTo(x + ox + r, base + oy); ctx.arc(x + ox, base + oy, r, 0, Math.PI * 2); });
    }, canopy, 'rgba(255,255,255,.6)', [x - 50, base - 140, x + 50, base - 55]);
  };
  const bush = (ctx, x) => chalkShape(ctx, () => {
    [[-18, -14, 18], [4, -22, 22], [26, -12, 16]].forEach(([ox, oy, r]) => { ctx.moveTo(x + ox + r, base + oy); ctx.arc(x + ox, base + oy, r, 0, Math.PI * 2); });
  }, '#9edcb0', 'rgba(255,255,255,.6)', [x - 40, base - 46, x + 45, base]);
  chalkTexture(scene, 'trees', W, 200, ctx => {
    tiled(W, dx => {
      tree(ctx, dx + 70, '#a8e6bf');
      bush(ctx, dx + 195);
      tree(ctx, dx + 320, '#ffc6d9');
      bush(ctx, dx + 450);
    });
    chalkGrain(ctx, W, 200, 1500, true);
  });
}
function makeGround(scene) {
  const w = 256, flowers = Array.from({ length: 7 }, () => [rnd(10, w - 10), rnd(50, GROUND_H - 20), pick(['#ffb3c7', '#ffd0a8', '#d4c1f5', '#ffffff'])]);
  chalkTexture(scene, 'ground', w, GROUND_H, ctx => {
    ctx.fillStyle = '#bdeccb'; ctx.fillRect(0, 0, w, GROUND_H);
    ctx.fillStyle = '#a6e3b9'; ctx.fillRect(0, 12, w, 14);
    ctx.lineCap = 'round';
    for (let i = 0; i < 260; i++) {                      // 斜線排線
      const x = rnd(0, w), y = rnd(0, GROUND_H);
      ctx.strokeStyle = Math.random() < 0.55 ? 'rgba(255,255,255,.22)' : 'rgba(80,170,120,.12)';
      ctx.lineWidth = rnd(1.5, 3.5);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rnd(10, 26), y - rnd(5, 12)); ctx.stroke();
    }
    ctx.strokeStyle = '#8fd9a6'; ctx.lineWidth = 3;      // 草尖
    for (let x = 3; x < w; x += 6) { ctx.beginPath(); ctx.moveTo(x, 16); ctx.lineTo(x + rnd(-4, 4), rnd(0, 8)); ctx.stroke(); }
    flowers.forEach(([x, y, c]) => {
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2;
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 5.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ffe98a'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = 'rgba(230,220,245,.9)';              // 小石頭
    [[40, GROUND_H - 40], [170, GROUND_H - 70], [230, GROUND_H - 25]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 9, 6, 0, 0, Math.PI * 2); ctx.fill(); });
    chalkGrain(ctx, w, GROUND_H, 3500, false);
  });
}

// 背景圖層（標題、結束、遊戲共用）；回傳各層，遊戲場景用來做視差捲動
function addBackdrop(scene) {
  scene.add.image(0, 0, 'sky').setOrigin(0);
  const layer = (y, h, key) => scene.add.tileSprite(0, y, W, h, key).setOrigin(0);
  return {
    clouds: layer(90, 260, 'clouds'),
    mountains: layer(GROUND - 300, 300, 'mountains'),
    hills: layer(GROUND - 260, 260, 'hills'),
    trees: layer(GROUND - 192, 200, 'trees'),
    ground: layer(GROUND - 6, GROUND_H, 'ground')
  };
}

// ============ 場景：標題 ============
class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    if (!this.textures.exists('hero0')) makeTextures(this);
    addBackdrop(this);
    txt(this, W / 2, 190, 'ABC 冒險', 76, '#ffffff').setStroke('#b99be0', 12);
    const hero = this.add.sprite(W / 2, GROUND, 'heroIdle').setOrigin(0.5, 1).setScale(1.9);
    this.tweens.add({ targets: hero, scaleY: 1.96, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    button(this, W / 2, 360, 300, 100, COLORS[0], '▶ 開始', 52, () => {
      say([["Let's go!", 'en-US']]);        // 第一次點擊會解鎖語音
      this.cameras.main.fadeOut(400, 255, 230, 245);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Walk'));
    });
    this.cameras.main.fadeIn(400, 255, 230, 245);
  }
}

// ============ 場景：走路與答題 ============
// 相機固定不動，小暴龍留在原地踏步，背景與路標往左移動，營造往右走的效果
class WalkScene extends Phaser.Scene {
  constructor() { super('Walk'); }
  create() {
    this.stops = Array.from({ length: ROUNDS }, (_, i) => 500 + i * STOP_GAP);
    this.finishX = this.stops[ROUNDS - 1] + 650;
    this.dist = 0; this.round = 0; this.state = 'walk'; this.score = 0;
    this.letters = shuffle([...POOL].filter(c => WORDS[c]));   // 每關每個字母只考一次

    this.layers = addBackdrop(this);

    this.signs = this.stops.map(x => ({ x: x + 150, obj: this.makeSign(false) }));
    this.signs.push({ x: this.finishX, obj: this.makeSign(true) });

    if (!this.anims.exists('walk')) {
      this.anims.create({ key: 'walk', frameRate: 8, repeat: -1, frames: [0, 1, 2, 3].map(i => ({ key: 'hero' + i })) });
    }
    this.hero = this.add.sprite(HERO_X, GROUND, 'heroIdle').setOrigin(0.5, 1).setDepth(5);
    this.hero.play('walk');
    this.cameras.main.fadeIn(500, 255, 230, 245);

    this.scoreText = txt(this, W - 80, 50, '⭐ 0', 36).setDepth(20);
    button(this, 50, 50, 64, 64, 0xc3a4f2, '🏠', 30, () => { speechSynthesis.cancel(); this.scene.start('Title'); }).setDepth(20);
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
    this.state = 'ask';
    this.hero.stop().setTexture('heroIdle');
    const t = this.letters[this.round % this.letters.length];
    const [en, zh, emoji] = pick(WORDS[t]);
    const others = shuffle([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter(c => c !== t)).slice(0, 2);
    const letters = shuffle([t, ...others]);

    const p = this.panel = this.add.container(W / 2, -400).setDepth(30);
    const bg = this.add.graphics();
    bg.fillStyle(0xb99be0, 0.3).fillRoundedRect(-250, -205, 500, 430, 40);
    bg.fillStyle(0xffffff, 0.94).fillRoundedRect(-250, -215, 500, 430, 40);
    p.add(bg);
    p.add(this.add.text(0, -120, emoji, { fontSize: '110px' }).setOrigin(0.5));
    this.question = txt(this, 0, -15, `${zh}（${en}）\n是哪個字母開頭？`, 32, INK, 440);
    p.add(this.question);
    letters.forEach((c, i) => {
      p.add(button(this, (i - 1) * 155, 125, 125, 125, COLORS[(i + this.round) % COLORS.length], c, 66, btn => {
        if (this.state !== 'ask') return;
        if (c === t) { this.state = 'cheer'; this.correct(t, en); }
        else {
          beep([200]);
          this.tweens.add({ targets: btn, x: btn.x + 12, duration: 60, yoyo: true, repeat: 3 });
          say([['再試試看喔', 'zh-TW']]);
        }
      }));
    });
    p.add(button(this, 195, -165, 70, 70, 0xffd96b, '🔊', 34, () => this.speakQuestion(en, zh)));
    this.tweens.add({ targets: p, y: 340, duration: 450, ease: 'Back.out' });
    this.speakQuestion(en, zh);
  }
  speakQuestion(en, zh) { if (this.state === 'ask') say([[en, 'en-US'], [zh + '，是哪個字母開頭呢？', 'zh-TW']]); }
  correct(t, en) {
    this.score++; this.scoreText.setText('⭐ ' + this.score);
    beep([523, 659, 784]); confetti(this);
    this.hero.setTexture('heroCheer');
    this.tweens.add({ targets: this.hero, y: GROUND - 70, duration: 250, yoyo: true, repeat: 1, ease: 'Sine.out' });
    this.question.setText(`${t} is for ${en}!`).setColor('#f06a9b').setFontSize(40);
    say([[`${t}, ${t}, ${en}!`, 'en-US'], ['Great job!', 'en-US'], [pick(PRAISE), 'zh-TW']])
      .then(() => this.next());
  }
  next() {
    this.tweens.add({ targets: this.panel, y: -400, duration: 350, ease: 'Back.in', onComplete: () => {
      this.panel.destroy(); this.round++;
      this.hero.setY(GROUND).play('walk'); this.state = 'walk';
    } });
  }
  finish() {
    this.state = 'end'; this.hero.stop().setTexture('heroCheer');
    this.cameras.main.fadeOut(600, 255, 230, 245);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('End', { score: this.score }));
  }
}

// ============ 場景：結束 ============
class EndScene extends Phaser.Scene {
  constructor() { super('End'); }
  create(data) {
    addBackdrop(this);
    this.add.sprite(W / 2, GROUND, 'heroCheer').setOrigin(0.5, 1).setScale(1.9);
    txt(this, W / 2, 170, '太棒了！🎉', 72, '#ffffff').setStroke('#b99be0', 12);
    txt(this, W / 2, 270, '⭐'.repeat(data.score), 56);
    button(this, W / 2, 400, 340, 100, COLORS[1], '🔁 再玩一次', 44, () => this.scene.start('Walk'));
    this.cameras.main.fadeIn(500, 255, 230, 245);
    beep([523, 659, 784, 1046]); confetti(this);
    say([['You did it!', 'en-US'], ['你完成了，太棒了！', 'zh-TW']]);
  }
}

new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: W, height: H, backgroundColor: '#d9f7e6',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [TitleScene, WalkScene, EndScene]
});
