// 外觀：可選的主角（暴龍、三角龍、棘龍、滄龍）、六種顏色與四種時段的粉筆背景（早晨、白天、傍晚、夜晚）
// 素材都用程式畫，第一次用到某個顏色或時段時才產生，之後重複使用
// 依賴 game.js 的常數 W、H、GROUND 與 pick（只在函式執行時才用到）

const DINOS = {
  green:  { body: 0x86dba3, dark: 0x5fc08a, belly: 0xe8f8d8, spike: 0xffb3c7, smile: 0x3f8f68 },
  blue:   { body: 0x8fd0f5, dark: 0x62b3e6, belly: 0xe6f6ff, spike: 0xffd96b, smile: 0x3b86bd },
  pink:   { body: 0xffa8c5, dark: 0xf07aa3, belly: 0xfff0f5, spike: 0xb9e6ff, smile: 0xc2557b },
  orange: { body: 0xffc27a, dark: 0xf5a04c, belly: 0xfff1d6, spike: 0xff9db8, smile: 0xb5702a },
  purple: { body: 0xc3a4f2, dark: 0xa07fe0, belly: 0xf1e8ff, spike: 0xffe08a, smile: 0x7a58b8 },
  yellow: { body: 0xffe27a, dark: 0xf2c94c, belly: 0xfff8dc, spike: 0x8fd0f5, smile: 0xb08a1c }
};

// 每個時段的配色。sky 由上到下的漸層；sun / moon 是天上的主角；stars 是閃光數量
const SCENES = {
  morning: {
    sky: ['#ffe0d0', '#fff0c8', '#d6efff', '#dff7e8'], strokeA: 1, edge: 'rgba(255,255,255,.6)',
    sun: { x: 130, y: 420, r: 56, fill: '#ffd9a0', edge: 'rgba(255,190,120,.85)', glow: '255,214,160', rays: 'rgba(255,214,150,.75)' }, stars: 6,
    cloud: 'rgba(255,255,255,.93)', cloudEdge: 'rgba(255,190,170,.5)',
    mountains: ['#f7d9d4', '#e3d2ee'], hills: ['#fde3c8', '#c8ecc9'],
    canopy: ['#b5e6b8', '#ffd2c9'], bush: '#a8dcb0', trunk: '#d9b79a',
    ground: ['#c8efcb', '#b2e6bb'], blade: '#9be0ad', shade: 'rgba(80,170,120,.12)',
    flowers: ['#ffb3c7', '#ffd0a8', '#fff2a8', '#ffffff']
  },
  day: {
    sky: ['#ffd3e6', '#e6d9ff', '#c9ecff', '#d9f7e6'], strokeA: 1, edge: 'rgba(255,255,255,.6)',
    sun: { x: 430, y: 170, r: 50, fill: '#fff0b0', edge: 'rgba(255,225,140,.8)', glow: '255,244,190', rays: 'rgba(255,236,160,.75)' }, stars: 16,
    cloud: 'rgba(255,255,255,.93)', cloudEdge: 'rgba(190,160,230,.5)',
    mountains: ['#f0d5f0', '#d6cbf5'], hills: ['#ffdbe9', '#c5f0d8'],
    canopy: ['#a8e6bf', '#ffc6d9'], bush: '#9edcb0', trunk: '#d9b79a',
    ground: ['#bdeccb', '#a6e3b9'], blade: '#8fd9a6', shade: 'rgba(80,170,120,.12)',
    flowers: ['#ffb3c7', '#ffd0a8', '#d4c1f5', '#ffffff']
  },
  sunset: {
    sky: ['#9d8fe6', '#e59ad2', '#ffb09c', '#ffd9a8'], strokeA: 0.8, edge: 'rgba(255,235,225,.55)',
    sun: { x: 380, y: 470, r: 72, fill: '#ffc78a', edge: 'rgba(255,150,110,.85)', glow: '255,170,120', rays: 'rgba(255,190,130,.7)' }, stars: 8,
    cloud: 'rgba(255,226,232,.9)', cloudEdge: 'rgba(210,130,170,.55)',
    mountains: ['#e8b0cc', '#c79bd8'], hills: ['#e6aebf', '#bcd39c'],
    canopy: ['#9fc79a', '#e8a8b8'], bush: '#8fbf94', trunk: '#c79a86',
    ground: ['#c5dd9f', '#b3d28f'], blade: '#a6cf84', shade: 'rgba(120,130,60,.14)',
    flowers: ['#ffb3c7', '#ffd0a8', '#ffe08a', '#ffffff']
  },
  night: {
    sky: ['#2a2d6e', '#46479e', '#6d63b8', '#9487d0'], strokeA: 0.5, edge: 'rgba(220,220,255,.4)',
    moon: { x: 430, y: 170, r: 44 }, stars: 48,
    cloud: 'rgba(190,190,240,.55)', cloudEdge: 'rgba(120,110,200,.5)',
    mountains: ['#6e6bb8', '#524f9e'], hills: ['#7d86cc', '#6aa0b8'],
    canopy: ['#5e9c9a', '#8c7cc4'], bush: '#58908e', trunk: '#8a7a9a',
    ground: ['#6fb39f', '#5da58f'], blade: '#86c9b0', shade: 'rgba(20,60,80,.15)',
    flowers: ['#ffe98a', '#c9b8ff', '#ffb3c7', '#ffffff']
  }
};

// 可選的主角；draw 在 160x150 的畫布上畫出面向右邊的角色，腳底約在 y=145
// 參數 a / b：後腳 / 前腳抬起的高度；bob：身體上下彈跳；tail：尾巴擺動；cheer：歡呼姿勢
const CHARS = {
  trex:    { name: '暴龍',   en: 'Tyrannosaurus', draw: drawTrex },
  tricera: { name: '三角龍', en: 'Triceratops',   draw: drawTricera },
  spino:   { name: '棘龍',   en: 'Spinosaurus',   draw: drawSpino },
  mosa:    { name: '滄龍',   en: 'Mosasaurus',    draw: drawMosa }
};
const CHAR_KEY = 'abc-adventure-char';
function loadChar() {
  try { const c = localStorage.getItem(CHAR_KEY); return CHARS[c] ? c : 'trex'; } catch (e) { return 'trex'; }
}
function saveChar(c) {
  try { localStorage.setItem(CHAR_KEY, c); } catch (e) {}
}

// 目前這一輪的外觀：char＝主角（會記住）、dino＝顏色、scene＝時段（標題畫面與「再玩一次」時隨機）
const look = { char: loadChar(), dino: 'green', scene: 'day' };
const tex = (k, char = look.char) => `${k}_${char}_${look.dino}`;   // 主角貼圖名稱
const bgKey = (k, name = look.scene) => `${k}_${name}`;             // 背景貼圖名稱
const walkKey = () => `walk_${look.char}_${look.dino}`;
function rollLook() {
  look.dino = pick(Object.keys(DINOS));
  look.scene = pick(Object.keys(SCENES));
}
function ensureChar(scene, char) {
  if (!scene.textures.exists(tex('heroIdle', char))) makeDino(scene, char, look.dino);
}
function ensureLook(scene) {
  ensureChar(scene, look.char);
  if (!scene.textures.exists(bgKey('sky'))) makeBackground(scene, look.scene);
}

// 歡呼的手：從肩膀 (x0,y0) 伸向 (x1,y1)，畫在頭的前面；加一圈深色描邊，才不會和同色的頭、身體糊在一起
// 手肘往斜下方凸出一點，手臂就會彎成「く」形，不會像一根直棍子
function cheerArm(g, pal, x0, y0, x1, y1) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ex = (x0 + x1) / 2 - (y1 - y0) / len * 12, ey = (y0 + y1) / 2 + (x1 - x0) / len * 12;
  [[17, pal.dark], [11, pal.body]].forEach(([w, c]) => {
    g.lineStyle(w, c).lineBetween(x0, y0, ex, ey).lineBetween(ex, ey, x1, y1);
    g.fillStyle(c).fillCircle(x0, y0, w / 2).fillCircle(ex, ey, w / 2).fillCircle(x1, y1, w / 2);
  });
  g.fillStyle(pal.dark).fillCircle(x1, y1, 11);                       // 圓圓的小手掌
  g.fillStyle(pal.body).fillCircle(x1, y1, 8);
  g.fillStyle(0xffffff).fillCircle(x1 + 6, y1 - 5, 2.5).fillCircle(x1 + 8, y1 + 1, 2.5);   // 小爪子
}

// ---- 暴龍 ----
function drawTrex(g, pal, { a = 0, b = 0, bob = 0, tail = 0, cheer = false }) {
  const { body: GREEN, dark: DARK, belly: BELLY, spike: PINK } = pal, dy = bob;

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
  if (!cheer) g.fillStyle(GREEN).fillEllipse(100, 96 - dy, 22, 12);                             // 手：小短手
  g.fillStyle(GREEN).fillCircle(108, 54 - dy, 34).fillEllipse(128, 62 - dy, 38, 28);            // 頭與嘴
  if (cheer) cheerArm(g, pal, 100, 94 - dy, 134, 80 - dy);                                     // 手：往前上方高高伸出
  g.fillStyle(0xff9db8, 0.7).fillCircle(112, 71 - dy, 6);                                       // 腮紅
  g.fillStyle(0xffffff).fillCircle(114, 46 - dy, 9);                                            // 眼睛
  g.fillStyle(0x4a3a5e).fillCircle(117, 47 - dy, 5.5);
  g.fillStyle(0xffffff).fillCircle(119, 45 - dy, 2);
  g.fillStyle(DARK).fillCircle(142, 56 - dy, 2);                                                // 鼻孔
  g.lineStyle(2.5, pal.smile).beginPath().arc(129, 64 - dy, 9, 0.25, Math.PI - 0.25).strokePath(); // 微笑
}

// ---- 三角龍：四隻腳、頸盾與三根角 ----
function drawTricera(g, pal, { a = 0, b = 0, bob = 0, tail = 0, cheer = false }) {
  const { body: BODY, dark: DARK, belly: BELLY, spike: ACC } = pal, dy = bob, HORN = 0xfff4d6;

  g.fillStyle(BODY).fillTriangle(34, 84 - dy, 6, 102 - dy + tail, 38, 112 - dy);                // 尾巴
  g.fillCircle(6, 102 - dy + tail, 7);
  g.fillStyle(DARK).fillEllipse(72, 122, 24, 30).fillEllipse(76, 144 - b, 30, 14);              // 遠側的腳
  g.fillEllipse(114, 122, 24, 30).fillEllipse(118, 144 - a, 30, 14);
  g.fillStyle(BODY).fillEllipse(70, 92 - dy, 92, 64);                                           // 身體
  g.fillStyle(DARK).fillCircle(48, 80 - dy, 5).fillCircle(64, 70 - dy, 4).fillCircle(82, 72 - dy, 4);
  g.fillStyle(BELLY).fillEllipse(78, 106 - dy, 56, 38);                                         // 肚子
  g.fillStyle(BODY).fillEllipse(52, 122, 26, 32).fillEllipse(56, 144 - a, 32, 15);              // 近側的腳
  g.fillEllipse(94, 122, 26, 32).fillEllipse(98, 144 - (cheer ? 22 : b), 32, 15);
  g.fillStyle(ACC);                                                                             // 頸盾（邊緣一圈小圓）
  [200, 232, 264, 296, 328].forEach(d => {
    const r = d * Math.PI / 180;
    g.fillCircle(106 + Math.cos(r) * 36, 60 - dy + Math.sin(r) * 36, 7);
  });
  g.fillCircle(106, 60 - dy, 36);
  g.fillStyle(DARK).fillCircle(94, 48 - dy, 4).fillCircle(110, 40 - dy, 4).fillCircle(124, 52 - dy, 4);
  g.fillStyle(HORN).fillTriangle(114, 56 - dy, 122, 24 - dy, 130, 58 - dy);                     // 眉上的角
  g.fillStyle(BODY).fillCircle(120, 74 - dy, 27).fillEllipse(142, 82 - dy, 32, 24);             // 頭與嘴
  g.fillStyle(HORN).fillTriangle(132, 60 - dy, 146, 32 - dy, 142, 64 - dy);                     // 另一根眉角
  g.fillTriangle(140, 72 - dy, 150, 56 - dy, 152, 76 - dy);                                     // 鼻角
  g.fillStyle(0xff9db8, 0.7).fillCircle(126, 90 - dy, 5);                                       // 腮紅
  g.fillStyle(0xffffff).fillCircle(124, 70 - dy, 8);                                            // 眼睛
  g.fillStyle(0x4a3a5e).fillCircle(127, 71 - dy, 5);
  g.fillStyle(0xffffff).fillCircle(129, 69 - dy, 2);
  g.lineStyle(2.5, pal.smile).beginPath().arc(143, 84 - dy, 8, 0.2, Math.PI - 0.2).strokePath(); // 微笑
}

// ---- 棘龍：背上的大帆與長長的嘴巴 ----
function drawSpino(g, pal, { a = 0, b = 0, bob = 0, tail = 0, cheer = false }) {
  const { body: BODY, dark: DARK, belly: BELLY, spike: ACC } = pal, dy = bob;

  g.fillStyle(BODY).fillTriangle(40, 78 - dy, 8, 98 - dy + tail, 44, 112 - dy);                 // 尾巴
  g.fillCircle(8, 98 - dy + tail, 7);
  g.fillStyle(DARK).fillEllipse(56, 118, 30, 34).fillEllipse(62, 144 - a, 38, 18);              // 後腳
  g.fillStyle(ACC).fillEllipse(66, 60 - dy, 76, 78);                                            // 背上的大帆
  g.lineStyle(3, pal.dark);
  [150, 120, 90, 60, 30].forEach(d => {
    const r = d * Math.PI / 180;
    g.lineBetween(66 + Math.cos(r) * 10, 76 - dy, 66 + Math.cos(r) * 38, 60 - dy - Math.sin(r) * 39);
  });
  g.fillStyle(BODY).fillEllipse(68, 90 - dy, 86, 62);                                           // 身體
  g.fillStyle(DARK).fillCircle(46, 80 - dy, 5).fillCircle(58, 72 - dy, 4);
  g.fillStyle(BELLY).fillEllipse(78, 100 - dy, 52, 40);                                         // 肚子
  g.fillStyle(BODY).fillEllipse(88, 118, 30, 34).fillEllipse(94, 144 - b, 38, 18);              // 前腳
  g.fillStyle(0xffffff).fillCircle(108, 145 - b, 3).fillCircle(101, 148 - b, 3);
  if (!cheer) g.fillStyle(BODY).fillEllipse(98, 96 - dy, 24, 12);                               // 手
  g.fillStyle(BODY).fillCircle(100, 56 - dy, 28).fillEllipse(126, 64 - dy, 56, 22);             // 頭與長嘴
  if (cheer) cheerArm(g, pal, 96, 96 - dy, 128, 86 - dy);                                      // 手：往前上方高高伸出
  g.fillStyle(0xffffff);                                                                        // 小小的牙齒
  [118, 130, 142].forEach(x => g.fillTriangle(x - 3, 72 - dy, x + 3, 72 - dy, x, 78 - dy));
  g.fillStyle(0xff9db8, 0.7).fillCircle(108, 72 - dy, 5);                                       // 腮紅
  g.fillStyle(0xffffff).fillCircle(104, 48 - dy, 8);                                            // 眼睛
  g.fillStyle(0x4a3a5e).fillCircle(107, 49 - dy, 5);
  g.fillStyle(0xffffff).fillCircle(109, 47 - dy, 2);
  g.fillStyle(DARK).fillCircle(150, 58 - dy, 2);                                                // 鼻孔
  g.lineStyle(2.5, pal.smile).beginPath().arc(128, 62 - dy, 9, 0.25, Math.PI - 0.25).strokePath();
}

// ---- 滄龍：海裡的長身體、鰭狀的手腳和尾鰭 ----
function drawMosa(g, pal, { a = 0, b = 0, bob = 0, tail = 0, cheer = false }) {
  const { body: BODY, dark: DARK, belly: BELLY, spike: ACC } = pal, dy = bob;

  g.fillStyle(BODY).fillTriangle(40, 98 - dy, 8, 102 - dy + tail, 40, 124 - dy);                // 長長的尾巴
  g.fillStyle(ACC);                                                                             // 尾鰭
  g.fillTriangle(12, 102 - dy + tail, 2, 72 - dy + tail, 24, 100 - dy + tail);
  g.fillTriangle(12, 102 - dy + tail, 2, 130 - dy + tail, 24, 104 - dy + tail);
  g.fillStyle(DARK).fillEllipse(66, 136, 26, 18).fillEllipse(112, 136, 24, 16);                 // 遠側的鰭
  g.fillStyle(BODY).fillEllipse(72, 104 - dy, 100, 56);                                         // 身體
  g.fillStyle(ACC).fillTriangle(52, 80 - dy, 62, 60 - dy, 72, 80 - dy).fillTriangle(72, 78 - dy, 84, 58 - dy, 94, 78 - dy); // 背鰭
  g.fillStyle(DARK).fillCircle(44, 98 - dy, 4).fillCircle(58, 92 - dy, 4).fillCircle(36, 108 - dy, 3);
  g.fillStyle(BELLY).fillEllipse(80, 118 - dy, 76, 28);                                         // 肚子
  g.fillStyle(BODY).fillEllipse(50, 135 - (cheer ? 14 : a), 28, 20);                            // 近側的後鰭（和身體相連）
  g.fillEllipse(98, 135 - (cheer ? 14 : b), 30, 20);                                            // 近側的前鰭
  g.fillStyle(BODY).fillCircle(112, 84 - dy, 26).fillEllipse(134, 92 - dy, 40, 20);             // 頭與長嘴
  g.fillStyle(0xffffff);                                                                        // 牙齒
  [128, 138, 148].forEach(x => g.fillTriangle(x - 3, 99 - dy, x + 3, 99 - dy, x, 105 - dy));
  g.fillStyle(0xff9db8, 0.7).fillCircle(120, 98 - dy, 5);                                       // 腮紅
  g.fillStyle(0xffffff).fillCircle(116, 78 - dy, 8);                                            // 眼睛
  g.fillStyle(0x4a3a5e).fillCircle(119, 79 - dy, 5);
  g.fillStyle(0xffffff).fillCircle(121, 77 - dy, 2);
  g.fillStyle(DARK).fillCircle(150, 86 - dy, 2);                                                // 鼻孔
  g.lineStyle(2.5, pal.smile).beginPath().arc(138, 94 - dy, 8, 0.25, Math.PI - 0.25).strokePath();
}

function makeDinoFrame(scene, key, char, pal, opts = {}) {
  const g = scene.add.graphics();
  CHARS[char].draw(g, pal, opts);
  g.generateTexture(key, 160, 150);
  g.destroy();
}
function makeDino(scene, char, color) {
  const pal = DINOS[color], key = k => `${k}_${char}_${color}`;
  [{ a: 10, tail: -4 }, { bob: 3 }, { b: 10, tail: 4 }, { bob: 3 }].forEach((o, i) => makeDinoFrame(scene, key('hero' + i), char, pal, o));
  makeDinoFrame(scene, key('heroIdle'), char, pal);
  makeDinoFrame(scene, key('heroCheer'), char, pal, { cheer: true });
  scene.anims.create({ key: `walk_${char}_${color}`, frameRate: 8, repeat: -1, frames: [0, 1, 2, 3].map(i => ({ key: key('hero' + i) })) });
}

// ---- 粉筆質感背景：用 canvas 畫粗邊、排線、顆粒與缺口 ----
const rnd = (a, b) => a + Math.random() * (b - a);

function chalkTexture(scene, key, w, h, draw) {
  const t = scene.textures.createCanvas(key, w, h);
  draw(t.getContext());
  t.refresh();
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
function chalkShape(ctx, path, fill, edge, [x0, y0, x1, y1], rim = 'rgba(255,255,255,.55)') {
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
  ctx.beginPath(); path(); ctx.strokeStyle = rim; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

function makeBackground(scene, name) {
  const T = SCENES[name];
  makeSky(scene, name, T);
  makeClouds(scene, name, T);
  makeMountains(scene, name, T);
  makeHills(scene, name, T);
  makeTrees(scene, name, T);
  makeGround(scene, name, T);
}

function makeSky(scene, name, T) {
  chalkTexture(scene, bgKey('sky', name), W, H, ctx => {
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    T.sky.forEach((c, i) => gr.addColorStop(i / (T.sky.length - 1), c));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    ctx.lineCap = 'round';
    for (let i = 0; i < 170; i++) {                      // 大片橫向的粉筆筆觸
      ctx.strokeStyle = `rgba(255,255,255,${rnd(0.05, 0.14) * T.strokeA})`; ctx.lineWidth = rnd(14, 34);
      const x = rnd(-40, W), y = rnd(0, H * 0.85);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rnd(60, 170), y + rnd(-10, 10)); ctx.stroke();
    }
    const star = (x, y, s) => {                          // 閃閃發光的小星星
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
    };
    for (let i = 0; i < T.stars; i++) star(rnd(20, W - 20), rnd(20, H * (name === 'night' ? 0.62 : 0.5)), rnd(3, 9));

    const body = T.sun || T.moon;                        // 太陽或月亮
    const glow = ctx.createRadialGradient(body.x, body.y, 20, body.x, body.y, 150);
    glow.addColorStop(0, `rgba(${T.sun ? T.sun.glow : '255,248,200'},${T.sun ? 0.8 : 0.5})`);
    glow.addColorStop(1, `rgba(${T.sun ? T.sun.glow : '255,248,200'},0)`);
    ctx.fillStyle = glow; ctx.fillRect(body.x - 150, body.y - 150, 300, 300);
    if (T.sun) {
      const { x, y, r } = T.sun;
      ctx.strokeStyle = T.sun.rays; ctx.lineWidth = 4;
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2, r0 = r + 12, r1 = r + (i % 2 ? 28 : 40);
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); ctx.stroke();
      }
      chalkShape(ctx, () => ctx.arc(x, y, r, 0, Math.PI * 2), T.sun.fill, T.sun.edge, [x - r, y - r, x + r, y + r]);
    } else {
      const { x, y, r } = T.moon;
      chalkShape(ctx, () => ctx.arc(x, y, r, 0, Math.PI * 2), '#fff8d6', 'rgba(255,240,170,.8)', [x - r, y - r, x + r, y + r]);
      ctx.fillStyle = 'rgba(225,210,150,.5)';            // 月亮上的坑洞
      [[-14, -8, 9], [13, 10, 11], [-4, 20, 5], [16, -16, 5]].forEach(([ox, oy, cr]) => { ctx.beginPath(); ctx.arc(x + ox, y + oy, cr, 0, Math.PI * 2); ctx.fill(); });
    }
    chalkGrain(ctx, W, H, 9000, false);
  });
}
function makeClouds(scene, name, T) {
  chalkTexture(scene, bgKey('clouds', name), W, 260, ctx => {
    tiled(W, dx => [[90, 70, 1], [330, 150, 0.75], [470, 40, 0.8]].forEach(([x, y, s]) => {
      x += dx;
      chalkShape(ctx, () => {
        [[-30, 10, 26], [4, -6, 32], [38, 8, 24]].forEach(([ox, oy, r]) => {
          ctx.moveTo(x + ox * s + r * s, y + oy * s); ctx.arc(x + ox * s, y + oy * s, r * s, 0, Math.PI * 2);
        });
        ctx.moveTo(x + 66 * s, y + 22 * s); ctx.ellipse(x + 4 * s, y + 22 * s, 62 * s, 18 * s, 0, 0, Math.PI * 2);
      }, T.cloud, T.cloudEdge, [x - 70 * s, y - 40 * s, x + 75 * s, y + 42 * s], T.edge);
    }));
    chalkGrain(ctx, W, 260, 1500, true);
  });
}
function makeMountains(scene, name, T) {
  const range = (ctx, dx, peaks, base, fill) => chalkShape(ctx, () => {
    ctx.moveTo(dx, base); peaks.forEach(([x, y]) => ctx.lineTo(dx + x, y)); ctx.lineTo(dx + W, base); ctx.closePath();
  }, fill, T.edge, [dx, 70, dx + W, base], T.edge);
  chalkTexture(scene, bgKey('mountains', name), W, 300, ctx => {
    tiled(W, dx => range(ctx, dx, [[0, 170], [130, 110], [250, 180], [380, 90], [540, 170]], 300, T.mountains[0]));
    tiled(W, dx => range(ctx, dx, [[0, 215], [90, 100], [190, 205], [290, 120], [400, 215], [470, 140], [540, 215]], 300, T.mountains[1]));
    chalkGrain(ctx, W, 300, 2000, true);
  });
}
function makeHills(scene, name, T) {
  const hill = (ctx, dx, y0, a1, k1, p1, a2, k2, fill) => chalkShape(ctx, () => {
    ctx.moveTo(dx, 260);
    for (let x = 0; x <= W; x += 10) {   // 頻率都是整數，左右兩端剛好接得起來
      ctx.lineTo(dx + x, y0 + a1 * Math.sin(Math.PI * 2 * k1 * x / W + p1) + a2 * Math.sin(Math.PI * 2 * k2 * x / W));
    }
    ctx.lineTo(dx + W, 260); ctx.closePath();
  }, fill, T.edge, [dx, 60, dx + W, 260], T.edge);
  chalkTexture(scene, bgKey('hills', name), W, 260, ctx => {
    tiled(W, dx => hill(ctx, dx, 90, 24, 3, 2, 10, 2, T.hills[0]));
    tiled(W, dx => hill(ctx, dx, 140, 26, 2, 1, 12, 3, T.hills[1]));
    chalkGrain(ctx, W, 260, 2000, true);
  });
}
function makeTrees(scene, name, T) {
  const base = 196;
  const tree = (ctx, x, canopy) => {
    chalkShape(ctx, () => ctx.rect(x - 7, base - 74, 14, 74), T.trunk, T.edge, [x - 7, base - 74, x + 7, base], T.edge);
    chalkShape(ctx, () => {
      [[0, -102, 32], [-22, -82, 24], [22, -82, 24]].forEach(([ox, oy, r]) => { ctx.moveTo(x + ox + r, base + oy); ctx.arc(x + ox, base + oy, r, 0, Math.PI * 2); });
    }, canopy, T.edge, [x - 50, base - 140, x + 50, base - 55], T.edge);
  };
  const bush = (ctx, x) => chalkShape(ctx, () => {
    [[-18, -14, 18], [4, -22, 22], [26, -12, 16]].forEach(([ox, oy, r]) => { ctx.moveTo(x + ox + r, base + oy); ctx.arc(x + ox, base + oy, r, 0, Math.PI * 2); });
  }, T.bush, T.edge, [x - 40, base - 46, x + 45, base], T.edge);
  chalkTexture(scene, bgKey('trees', name), W, 200, ctx => {
    tiled(W, dx => {
      tree(ctx, dx + 70, T.canopy[0]);
      bush(ctx, dx + 195);
      tree(ctx, dx + 320, T.canopy[1]);
      bush(ctx, dx + 450);
    });
    chalkGrain(ctx, W, 200, 1500, true);
  });
}
function makeGround(scene, name, T) {
  const w = 256, flowers = Array.from({ length: 7 }, () => [rnd(10, w - 10), rnd(50, GROUND_H - 20), pick(T.flowers)]);
  chalkTexture(scene, bgKey('ground', name), w, GROUND_H, ctx => {
    ctx.fillStyle = T.ground[0]; ctx.fillRect(0, 0, w, GROUND_H);
    ctx.fillStyle = T.ground[1]; ctx.fillRect(0, 12, w, 14);
    ctx.lineCap = 'round';
    for (let i = 0; i < 260; i++) {                      // 斜線排線
      const x = rnd(0, w), y = rnd(0, GROUND_H);
      ctx.strokeStyle = Math.random() < 0.55 ? 'rgba(255,255,255,.22)' : T.shade;
      ctx.lineWidth = rnd(1.5, 3.5);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rnd(10, 26), y - rnd(5, 12)); ctx.stroke();
    }
    ctx.strokeStyle = T.blade; ctx.lineWidth = 3;        // 草尖
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
  scene.add.image(0, 0, bgKey('sky')).setOrigin(0);
  const layer = (y, h, key) => scene.add.tileSprite(0, y, W, h, bgKey(key)).setOrigin(0);
  return {
    clouds: layer(90, 260, 'clouds'),
    mountains: layer(GROUND - 300, 300, 'mountains'),
    hills: layer(GROUND - 260, 260, 'hills'),
    trees: layer(GROUND - 192, 200, 'trees'),
    ground: layer(GROUND - 6, GROUND_H, 'ground')
  };
}
