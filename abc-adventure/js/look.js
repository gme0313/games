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
// crown：連續答對時皇冠戴在貼圖上的位置（頭頂）
const CHARS = {
  trex:    { name: '暴龍',   en: 'Tyrannosaurus', draw: drawTrex, crown: [108, 16] },
  tricera: { name: '三角龍', en: 'Triceratops',   draw: drawTricera, crown: [112, 30] },
  spino:   { name: '棘龍',   en: 'Spinosaurus',   draw: drawSpino, crown: [100, 22] },
  mosa:    { name: '滄龍',   en: 'Mosasaurus',    draw: drawMosa, crown: [112, 54] },
  brachio: { name: '腕龍',   en: 'Brachiosaurus', draw: drawBrachio, crown: [118, 8] },
  stego:   { name: '劍龍',   en: 'Stegosaurus',   draw: drawStego, crown: [116, 74] },
  anky:    { name: '甲龍',   en: 'Ankylosaurus',  draw: drawAnky, crown: [118, 82] },
  ptero:   { name: '翼龍',   en: 'Pteranodon',    draw: drawPtero, crown: [100, 26] }
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
const bgKey = (k, name = look.scene, terrain = 'meadow') => terrain === 'meadow' ? `${k}_${name}` : `${k}_${name}_${terrain}`;   // 背景貼圖名稱（草原是原本的名稱）
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
// 臉：平常是圓眼睛＋微笑；歡呼時變成開心的瞇瞇眼＋張開的大笑嘴（含舌頭）
function eye(g, x, y, r, cheer) {
  if (cheer) {
    g.lineStyle(3.5, 0x4a3a5e).beginPath().arc(x, y + r * .5, r * .85, Math.PI * 1.1, Math.PI * 1.9).strokePath();
    return;
  }
  g.fillStyle(0xffffff).fillCircle(x, y, r);
  g.fillStyle(0x4a3a5e).fillCircle(x + 3, y + 1, r * .62);
  g.fillStyle(0xffffff).fillCircle(x + 5, y - 1, 2);
}
function smile(g, pal, x, y, r, cheer, a0 = .25) {
  if (cheer) {
    g.fillStyle(0xb5486b).beginPath().arc(x, y - 2, r + 1, 0, Math.PI).closePath().fillPath();
    g.fillStyle(0xff9db8).fillEllipse(x, y + r - 3, r, r * .6);
    return;
  }
  g.lineStyle(2.5, pal.smile).beginPath().arc(x, y, r, a0, Math.PI - a0).strokePath();
}

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
  eye(g, 114, 46 - dy, 9, cheer);                                                               // 眼睛
  g.fillStyle(DARK).fillCircle(142, 56 - dy, 2);                                                // 鼻孔
  smile(g, pal, 129, 64 - dy, 9, cheer);                                                        // 微笑
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
  eye(g, 124, 70 - dy, 8, cheer);                                                               // 眼睛
  smile(g, pal, 143, 84 - dy, 8, cheer, .2);                                                    // 微笑
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
  eye(g, 104, 48 - dy, 8, cheer);                                                               // 眼睛
  g.fillStyle(DARK).fillCircle(150, 58 - dy, 2);                                                // 鼻孔
  smile(g, pal, 128, 62 - dy, 9, cheer);
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
  eye(g, 116, 78 - dy, 8, cheer);                                                               // 眼睛
  g.fillStyle(DARK).fillCircle(150, 86 - dy, 2);                                                // 鼻孔
  smile(g, pal, 138, 94 - dy, 8, cheer);
}

// ---- 腕龍：長長的脖子、四隻粗腿 ----
function drawBrachio(g, pal, { a = 0, b = 0, bob = 0, tail = 0, cheer = false }) {
  const { body: BODY, dark: DARK, belly: BELLY, spike: ACC } = pal, dy = bob;

  g.fillStyle(BODY).fillTriangle(30, 88 - dy, 4, 114 - dy + tail, 34, 112 - dy);                // 尾巴
  g.fillCircle(4, 114 - dy + tail, 6);
  g.fillStyle(DARK).fillEllipse(50, 124, 22, 30).fillEllipse(52, 144 - b, 28, 13);              // 遠側的腳
  g.fillEllipse(92, 124, 22, 30).fillEllipse(94, 144 - a, 28, 13);
  g.fillStyle(BODY).fillEllipse(62, 100 - dy, 88, 56);                                          // 身體
  g.fillTriangle(78, 88 - dy, 104, 104 - dy, 126, 46 - dy);                                     // 長脖子
  g.fillTriangle(78, 88 - dy, 126, 46 - dy, 102, 34 - dy);
  g.fillStyle(ACC).fillCircle(46, 82 - dy, 6).fillCircle(62, 76 - dy, 6).fillCircle(78, 80 - dy, 5);   // 背上的圓點
  g.fillCircle(94, 62 - dy, 4).fillCircle(102, 46 - dy, 3.5);
  g.fillStyle(BELLY).fillEllipse(66, 114 - dy, 60, 30);                                         // 肚子
  g.fillStyle(BODY).fillEllipse(38, 124, 24, 30).fillEllipse(40, 144 - a, 30, 14);              // 近側的腳
  g.fillEllipse(80, 124, 24, 30).fillEllipse(82, 144 - (cheer ? 24 : b), 30, 14);
  g.fillStyle(BODY).fillCircle(118, 28 - dy, 15).fillEllipse(133, 33 - dy, 26, 17);             // 頭與嘴
  g.fillStyle(DARK).fillCircle(122, 17 - dy, 2.5);                                              // 頭頂的鼻孔
  g.fillStyle(0xff9db8, 0.7).fillCircle(124, 40 - dy, 5);                                       // 腮紅
  eye(g, 121, 26 - dy, 7, cheer);
  smile(g, pal, 135, 37 - dy, 6, cheer);
}

// ---- 劍龍：背上一排大骨板、尾巴有尖刺 ----
function drawStego(g, pal, { a = 0, b = 0, bob = 0, tail = 0, cheer = false }) {
  const { body: BODY, dark: DARK, belly: BELLY, spike: ACC } = pal, dy = bob;

  g.fillStyle(BODY).fillTriangle(26, 80 - dy, 6, 102 - dy + tail, 30, 108 - dy);                // 尾巴
  g.fillStyle(ACC).fillTriangle(16, 92 - dy + tail, 2, 72 - dy + tail, 22, 88 - dy + tail);     // 尾巴尖刺
  g.fillTriangle(10, 100 - dy + tail, 0, 126 - dy + tail, 20, 102 - dy + tail);
  g.fillStyle(DARK).fillEllipse(48, 124, 26, 30).fillEllipse(52, 144 - a, 32, 14);              // 遠側的腳
  g.fillEllipse(96, 124, 24, 28).fillEllipse(100, 144 - b, 30, 14);
  g.fillStyle(ACC);                                                                             // 背上的骨板
  [[40, 24], [58, 34], [76, 34], [94, 26]].forEach(([x, h]) => {
    const top = 90 - dy - 33 * Math.sqrt(1 - ((x - 66) / 46) ** 2);
    g.fillTriangle(x - 12, top + 8, x, top - h, x + 12, top + 8);
  });
  g.fillStyle(BODY).fillEllipse(66, 92 - dy, 92, 66);                                           // 身體
  g.fillStyle(DARK).fillCircle(44, 82 - dy, 5).fillCircle(60, 74 - dy, 4).fillCircle(78, 76 - dy, 4);
  g.fillStyle(BELLY).fillEllipse(72, 106 - dy, 56, 36);                                         // 肚子
  g.fillStyle(BODY).fillEllipse(40, 124, 28, 32).fillEllipse(44, 144 - a, 34, 15);              // 近側的腳
  g.fillEllipse(86, 124, 26, 30).fillEllipse(90, 144 - (cheer ? 22 : b), 32, 15);
  g.fillStyle(BODY).fillCircle(116, 98 - dy, 19).fillEllipse(136, 104 - dy, 32, 20);            // 小小的頭與嘴
  g.fillStyle(0xff9db8, 0.7).fillCircle(122, 110 - dy, 5);                                      // 腮紅
  eye(g, 118, 92 - dy, 7, cheer);
  g.fillStyle(DARK).fillCircle(148, 99 - dy, 2);                                                // 鼻孔
  smile(g, pal, 135, 108 - dy, 7, cheer);
}

// ---- 甲龍：矮矮胖胖的鎧甲與尾巴上的大錘 ----
function drawAnky(g, pal, { a = 0, b = 0, bob = 0, tail = 0, cheer = false }) {
  const { body: BODY, dark: DARK, belly: BELLY, spike: ACC } = pal, dy = bob;

  g.fillStyle(BODY).fillTriangle(30, 100 - dy, 14, 110 - dy + tail, 32, 118 - dy);              // 尾巴
  g.fillStyle(DARK).fillCircle(17, 112 - dy + tail, 13);                                        // 尾巴上的大錘
  g.fillStyle(ACC).fillTriangle(9, 106 - dy + tail, 17, 88 - dy + tail, 25, 104 - dy + tail);
  g.fillTriangle(9, 118 - dy + tail, 17, 136 - dy + tail, 25, 120 - dy + tail);
  g.fillStyle(DARK).fillEllipse(50, 128, 26, 24).fillEllipse(54, 144 - a, 32, 14);              // 遠側的腳
  g.fillEllipse(98, 128, 24, 24).fillEllipse(102, 144 - b, 30, 14);
  g.fillStyle(DARK).fillTriangle(34, 90 - dy, 28, 74 - dy, 44, 82 - dy);                        // 身側的尖刺
  g.fillTriangle(100, 92 - dy, 106, 76 - dy, 92, 84 - dy);
  g.fillStyle(BODY).fillEllipse(68, 106 - dy, 104, 58);                                         // 身體
  g.fillStyle(ACC);                                                                             // 背上的圓形裝甲
  [[40, 90], [56, 82], [72, 80], [88, 84]].forEach(([x, y]) => g.fillCircle(x, y - dy, 9));
  g.fillStyle(DARK).fillCircle(48, 100 - dy, 4).fillCircle(64, 94 - dy, 4).fillCircle(80, 96 - dy, 4);
  g.fillStyle(BELLY).fillEllipse(74, 120 - dy, 60, 26);                                         // 肚子
  g.fillStyle(BODY).fillEllipse(42, 128, 28, 26).fillEllipse(46, 144 - a, 34, 15);              // 近側的腳
  g.fillEllipse(90, 128, 26, 26).fillEllipse(94, 144 - (cheer ? 22 : b), 32, 15);
  g.fillStyle(BODY).fillCircle(118, 104 - dy, 20).fillEllipse(138, 110 - dy, 28, 20);           // 頭與嘴
  g.fillStyle(ACC).fillTriangle(104, 90 - dy, 100, 76 - dy, 114, 86 - dy);                      // 頭後的小角
  g.fillStyle(0xff9db8, 0.7).fillCircle(124, 116 - dy, 5);                                      // 腮紅
  eye(g, 122, 98 - dy, 7, cheer);
  g.fillStyle(DARK).fillCircle(148, 105 - dy, 2);                                               // 鼻孔
  smile(g, pal, 136, 114 - dy, 7, cheer);
}

// ---- 翼龍：大翅膀、長長的嘴與頭冠 ----
function drawPtero(g, pal, { a = 0, b = 0, bob = 0, tail = 0, cheer = false }) {
  const { body: BODY, dark: DARK, belly: BELLY, spike: ACC } = pal, dy = bob;
  const flap = cheer ? 16 : 62 + tail * 3;                                                      // 翅膀尖端的高度（歡呼時高高舉起）

  g.fillStyle(ACC).fillTriangle(70, 90 - dy, 8, flap - dy, 28, 116 - dy);                       // 後側的翅膀
  g.fillStyle(DARK).fillEllipse(60, 130, 12, 30).fillEllipse(62, 144 - a, 22, 10);              // 腳
  g.fillEllipse(80, 130, 12, 30).fillEllipse(82, 144 - b, 22, 10);
  g.fillStyle(BODY).fillEllipse(70, 100 - dy, 62, 54);                                          // 身體
  g.fillStyle(BELLY).fillEllipse(78, 108 - dy, 34, 34);                                         // 肚子
  g.fillStyle(BODY).fillCircle(92, 78 - dy, 14);                                                // 脖子
  if (cheer) g.fillStyle(ACC).fillTriangle(86, 86 - dy, 44, 6, 50, 124 - dy);                    // 前側的翅膀：歡呼時高舉
  else g.fillStyle(ACC).fillTriangle(86, 86 - dy, 34, 108 - dy, 90, 122 - dy);                  // 平常收在身側
  g.fillStyle(BODY).fillCircle(104, 58 - dy, 22);                                               // 頭
  g.fillStyle(DARK).fillTriangle(92, 42 - dy, 66, 28 - dy, 98, 58 - dy);                        // 頭冠
  g.fillStyle(0xff9db8, 0.7).fillCircle(110, 70 - dy, 5);                                       // 腮紅
  eye(g, 108, 52 - dy, 7, cheer);
  // 長長的嘴喙：平常上下喙閉著、中間一條嘴縫；歡呼時下喙張開，露出裡面
  if (cheer) {
    g.fillStyle(0xb04a6a).fillTriangle(114, 58 - dy, 154, 55 - dy, 148, 74 - dy).fillTriangle(114, 58 - dy, 148, 74 - dy, 114, 78 - dy);
    g.fillStyle(BODY).fillTriangle(114, 46 - dy, 160, 54 - dy, 114, 60 - dy);
    g.fillStyle(BODY).fillTriangle(114, 66 - dy, 148, 74 - dy, 114, 80 - dy);
    g.fillStyle(0xff9db8).fillEllipse(124, 70 - dy, 12, 6);
  } else {
    g.fillStyle(BODY).fillTriangle(116, 48 - dy, 160, 60 - dy, 116, 74 - dy);
    g.lineStyle(3, DARK).lineBetween(116, 62 - dy, 156, 60 - dy);
  }
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
  const capLine = (x, y) => y + 9 * Math.sin(Math.PI * 2 * 9 * x / W) + 6 * Math.sin(Math.PI * 2 * 14 * x / W);   // 雪線／岩漿線：整數頻率，左右能接起來
  // capFill：山頂另外蓋一層顏色（雪地的雪、火山的岩漿）
  const range = (ctx, dx, peaks, base, fill, capFill, capY = 150) => {
    const path = () => { ctx.moveTo(dx, base); peaks.forEach(([x, y]) => ctx.lineTo(dx + x, y)); ctx.lineTo(dx + W, base); ctx.closePath(); };
    chalkShape(ctx, path, fill, T.edge, [dx, 70, dx + W, base], T.edge);
    if (!capFill) return;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(dx, 0);
    for (let x = 0; x <= W; x += 15) ctx.lineTo(dx + x, capLine(x, capY));
    ctx.lineTo(dx + W, 0); ctx.closePath(); ctx.clip();
    chalkShape(ctx, path, capFill, T.edge, [dx, 70, dx + W, base], T.edge);
    ctx.restore();
  };
  const volcano = T.terrain === 'volcano', snow = T.terrain === 'snow';
  chalkTexture(scene, bgKey('mountains', name, T.terrain), W, 300, ctx => {
    tiled(W, dx => range(ctx, dx, [[0, 170], [130, 110], [250, 180], [380, 90], [540, 170]], 300, T.mountains[0], snow && T.capFill, 140));
    tiled(W, dx => volcano
      ? range(ctx, dx, [[0, 235], [110, 180], [250, 235], [315, 130], [345, 100], [385, 100], [415, 130], [480, 235], [540, 235]], 300, T.mountains[1], T.capFill, 150)
      : range(ctx, dx, [[0, 215], [90, 100], [190, 205], [290, 120], [400, 215], [470, 140], [540, 215]], 300, T.mountains[1], snow && T.capFill, 160));
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
  chalkTexture(scene, bgKey('hills', name, T.terrain), W, 260, ctx => {
    tiled(W, dx => hill(ctx, dx, 90, 24, 3, 2, 10, 2, T.hills[0]));
    tiled(W, dx => hill(ctx, dx, 140, 26, 2, 1, 12, 3, T.hills[1]));
    chalkGrain(ctx, W, 260, 2000, true);
  });
}
function makeTrees(scene, name, T) {
  const base = 196, kind = T.kind || 'meadow', SNOW_EDGE = '#b9cbec';
  const tree = (ctx, x, canopy) => {
    chalkShape(ctx, () => ctx.rect(x - 7, base - 74, 14, 74), T.trunk, T.edge, [x - 7, base - 74, x + 7, base], T.edge);
    chalkShape(ctx, () => {
      [[0, -102, 32], [-22, -82, 24], [22, -82, 24]].forEach(([ox, oy, r]) => { ctx.moveTo(x + ox + r, base + oy); ctx.arc(x + ox, base + oy, r, 0, Math.PI * 2); });
    }, canopy, T.edge, [x - 50, base - 140, x + 50, base - 55], T.edge);
  };
  const bush = (ctx, x, fill = T.bush) => chalkShape(ctx, () => {
    [[-18, -14, 18], [4, -22, 22], [26, -12, 16]].forEach(([ox, oy, r]) => { ctx.moveTo(x + ox + r, base + oy); ctx.arc(x + ox, base + oy, r, 0, Math.PI * 2); });
  }, fill, kind === 'snow' ? SNOW_EDGE : T.edge, [x - 40, base - 46, x + 45, base], T.edge);
  // 海邊：椰子樹、海灘傘
  const palm = (ctx, x) => {
    chalkShape(ctx, () => {
      ctx.moveTo(x - 7, base); ctx.quadraticCurveTo(x - 4, base - 46, x + 14, base - 88);
      ctx.lineTo(x + 26, base - 83); ctx.quadraticCurveTo(x + 8, base - 46, x + 7, base); ctx.closePath();
    }, T.trunk, T.edge, [x - 7, base - 90, x + 26, base], T.edge);
    const tx = x + 20, ty = base - 88;
    [T.canopy[0], T.canopy[1]].forEach((fill, pass) => chalkShape(ctx, () => {
      [-170, -125, -85, -45, -5, 25, 155].forEach((deg, i) => {
        if (i % 2 !== pass) return;
        const a = deg * Math.PI / 180, rot = a * 0.6;
        const cx = tx + Math.cos(a) * 26, cy = ty + Math.sin(a) * 16 + (Math.abs(deg) < 30 || Math.abs(deg) > 150 ? 8 : 0);
        ctx.moveTo(cx + 30 * Math.cos(rot), cy + 30 * Math.sin(rot)); ctx.ellipse(cx, cy, 30, 9, rot, 0, Math.PI * 2);
      });
    }, fill, T.edge, [tx - 60, ty - 40, tx + 60, ty + 30], T.edge));
    ctx.fillStyle = '#b98a6a'; [[tx - 4, ty + 6], [tx + 7, ty + 8]].forEach(([cx, cy]) => { ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill(); });
  };
  const umbrella = (ctx, x) => {
    chalkShape(ctx, () => ctx.rect(x - 3, base - 72, 6, 72), T.trunk, T.edge, [x - 3, base - 72, x + 3, base], T.edge);
    chalkShape(ctx, () => { ctx.moveTo(x - 46, base - 66); ctx.quadraticCurveTo(x, base - 132, x + 46, base - 66); ctx.closePath(); }, '#ffb3c7', T.edge, [x - 46, base - 100, x + 46, base - 66], T.edge);
    chalkShape(ctx, () => { ctx.moveTo(x - 14, base - 72); ctx.lineTo(x, base - 97); ctx.lineTo(x + 14, base - 72); ctx.closePath(); }, '#ffffff', T.edge, [x - 14, base - 97, x + 14, base - 72], T.edge);
  };
  // 雪地：松樹、雪人
  const pine = (ctx, x) => {
    chalkShape(ctx, () => ctx.rect(x - 6, base - 60, 12, 60), T.trunk, SNOW_EDGE, [x - 6, base - 60, x + 6, base], T.edge);
    [[150, 108, 30], [125, 80, 38], [98, 52, 46]].forEach(([yt, yb, hw]) => {
      yt = base - yt; yb = base - yb + 4;
      chalkShape(ctx, () => { ctx.moveTo(x, yt); ctx.lineTo(x + hw, yb); ctx.lineTo(x - hw, yb); ctx.closePath(); }, T.canopy[0], SNOW_EDGE, [x - hw, yt, x + hw, yb], T.edge);
      chalkShape(ctx, () => { ctx.moveTo(x, yt); ctx.lineTo(x + hw * .45, yt + (yb - yt) * .45); ctx.lineTo(x - hw * .45, yt + (yb - yt) * .45); ctx.closePath(); }, '#ffffff', SNOW_EDGE, [x - hw, yt, x + hw, yb], T.edge);
    });
  };
  const snowman = (ctx, x) => {
    [[24, 24], [62, 18], [90, 13]].forEach(([cy, r]) => chalkShape(ctx, () => ctx.arc(x, base - cy, r, 0, Math.PI * 2), '#ffffff', SNOW_EDGE, [x - r, base - cy - r, x + r, base - cy + r], T.edge));
    chalkShape(ctx, () => ctx.rect(x - 12, base - 116, 24, 14), '#8e74c4', T.edge, [x - 12, base - 116, x + 12, base - 102], T.edge);
    chalkShape(ctx, () => ctx.rect(x - 17, base - 104, 34, 5), '#8e74c4', T.edge, [x - 17, base - 104, x + 17, base - 99], T.edge);
    ctx.fillStyle = '#ff9a5c'; ctx.beginPath(); ctx.moveTo(x + 2, base - 91); ctx.lineTo(x + 20, base - 87); ctx.lineTo(x + 2, base - 84); ctx.fill();
    ctx.fillStyle = '#5a4a7a'; [[-5, -95], [6, -96]].forEach(([ox, oy]) => { ctx.beginPath(); ctx.arc(x + ox, base + oy, 1.8, 0, Math.PI * 2); ctx.fill(); });
  };
  // 火山：大石頭、發光水晶
  const boulder = (ctx, x) => {
    chalkShape(ctx, () => { ctx.moveTo(x + 42, base - 26); ctx.ellipse(x, base - 26, 42, 28, 0, 0, Math.PI * 2); }, T.bush, T.edge, [x - 42, base - 54, x + 42, base], T.edge);
    chalkShape(ctx, () => { ctx.moveTo(x + 56, base - 14); ctx.ellipse(x + 34, base - 14, 22, 16, 0, 0, Math.PI * 2); }, T.bush, T.edge, [x + 12, base - 30, x + 56, base], T.edge);
    ctx.strokeStyle = T.flowers[0]; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 14, base - 40); ctx.lineTo(x - 6, base - 30); ctx.lineTo(x - 14, base - 22); ctx.stroke();
  };
  const crystals = (ctx, x) => [[-20, 62, 0], [0, 94, 1], [20, 54, 0]].forEach(([ox, h, c]) =>
    chalkShape(ctx, () => { ctx.moveTo(x + ox - 11, base); ctx.lineTo(x + ox, base - h); ctx.lineTo(x + ox + 11, base); ctx.closePath(); }, T.canopy[c], T.edge, [x + ox - 11, base - h, x + ox + 11, base], T.edge));
  const sets = {
    meadow: (ctx, dx) => { tree(ctx, dx + 70, T.canopy[0]); bush(ctx, dx + 195); tree(ctx, dx + 320, T.canopy[1]); bush(ctx, dx + 450); },
    beach: (ctx, dx) => { palm(ctx, dx + 60); umbrella(ctx, dx + 190); palm(ctx, dx + 320); bush(ctx, dx + 450, T.canopy[0]); },
    snow: (ctx, dx) => { pine(ctx, dx + 70); snowman(ctx, dx + 190); pine(ctx, dx + 320); bush(ctx, dx + 450, '#ffffff'); },
    volcano: (ctx, dx) => { boulder(ctx, dx + 70); crystals(ctx, dx + 200); boulder(ctx, dx + 320); crystals(ctx, dx + 450); }
  };
  chalkTexture(scene, bgKey('trees', name, T.terrain), W, 200, ctx => {
    tiled(W, dx => sets[kind](ctx, dx));
    chalkGrain(ctx, W, 200, 1500, true);
  });
}
function makeGround(scene, name, T) {
  const w = 256, kind = T.kind || 'meadow', flowers = Array.from({ length: 7 }, () => [rnd(24, w - 24), rnd(50, GROUND_H - 20), pick(T.flowers)]);
  chalkTexture(scene, bgKey('ground', name, T.terrain), w, GROUND_H, ctx => {
    ctx.fillStyle = T.ground[0]; ctx.fillRect(0, 0, w, GROUND_H);
    ctx.fillStyle = T.ground[1]; ctx.fillRect(0, 12, w, 14);
    ctx.lineCap = 'round';
    for (let i = 0; i < 260; i++) {                      // 斜線排線
      const x = rnd(0, w), y = rnd(0, GROUND_H);
      ctx.strokeStyle = Math.random() < 0.55 ? 'rgba(255,255,255,.22)' : T.shade;
      ctx.lineWidth = rnd(1.5, 3.5);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rnd(10, 26), y - rnd(5, 12)); ctx.stroke();
    }
    if (kind === 'meadow') {
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
    } else if (kind === 'beach') {                         // 沙灘：波浪紋、貝殼與海星
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3;
      [[20, 50], [150, 78], [60, 100], [180, 118]].forEach(([x, y]) => {
        ctx.beginPath(); for (let i = 0; i <= 40; i += 4) ctx[i ? 'lineTo' : 'moveTo'](x + i, y + Math.sin(i / 6) * 3); ctx.stroke();
      });
      flowers.forEach(([x, y, c], i) => {
        ctx.fillStyle = c;
        if (i % 2) {                                       // 海星
          ctx.beginPath();
          for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 4 : 9; ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
          ctx.closePath(); ctx.fill();
        } else {                                           // 扇貝
          ctx.beginPath(); ctx.arc(x, y, 8, Math.PI, 0); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(150,100,120,.35)'; ctx.lineWidth = 1.5;
          [-4, 0, 4].forEach(o => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + o * 1.6, y - 7); ctx.stroke(); });
        }
      });
    } else if (kind === 'snow') {                          // 雪地：閃閃的雪花與小冰塊
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
      flowers.forEach(([x, y], i) => {
        const s = 5 + (i % 3) * 2, d = s * .7;
        ctx.beginPath();
        ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
        ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d); ctx.moveTo(x - d, y + d); ctx.lineTo(x + d, y - d);
        ctx.stroke();
      });
      ctx.fillStyle = 'rgba(190,215,245,.7)';
      [[40, GROUND_H - 40], [170, GROUND_H - 70], [230, GROUND_H - 25]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 11, 6, 0, 0, Math.PI * 2); ctx.fill(); });
    } else {                                               // 火山：發光的岩漿裂縫與火星
      [[30, 56], [140, 84], [60, 112]].forEach(([x, y]) => {
        const pts = [[0, 0], [14, 7], [26, -3], [42, 6], [56, 0]].map(([ox, oy]) => [x + ox, y + oy]);
        [[9, 'rgba(255,170,100,.3)'], [3.5, T.flowers[0]]].forEach(([lw, c]) => {
          ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([px, py], i) => ctx[i ? 'lineTo' : 'moveTo'](px, py)); ctx.stroke();
        });
      });
      flowers.forEach(([x, y, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); });
    }
    chalkGrain(ctx, w, GROUND_H, 3500, false);
  });
}

// ---- 地形：草原（原本的樣子）、海邊、火山、雪地 ----
// 只換山、丘陵、樹和地面，天空仍是目前的時段；顏色會跟著時段調暗或偏暖，才不會在夜晚突然變亮
const TERRAINS = {
  meadow: { name: '草原', icon: '🌳' },
  beach: { name: '海邊', icon: '🏖️', kind: 'beach', colors: {
    mountains: ['#bfe4f3', '#a3d3ee'], hills: ['#ffefc8', '#f9dfa8'], canopy: ['#8fdcaa', '#6fcb9c'], bush: '#8fdcaa', trunk: '#d9b48a',
    ground: ['#fbe8b6', '#f3d89c'], blade: '#f0d08e', shade: 'rgba(200,150,70,.12)', flowers: ['#ffb3c7', '#ffffff', '#ffd0a8', '#c9e8ff'] } },
  volcano: { name: '火山', icon: '🌋', kind: 'volcano', colors: {
    mountains: ['#c9a8bc', '#a98aa6'], hills: ['#b79cae', '#9c8296'], canopy: ['#e49ab8', '#8fc3e6'], bush: '#8a7488', trunk: '#6d5870',
    ground: ['#a68fa0', '#957d92'], blade: '#b59fb0', shade: 'rgba(70,40,70,.16)', flowers: ['#ff9a5c', '#ffd36b', '#ff7f7f', '#ffe9a8'], capFill: '#ffa86b' } },
  snow: { name: '雪地', icon: '⛄', kind: 'snow', colors: {
    mountains: ['#e5eefc', '#c8d9f2'], hills: ['#f6faff', '#dfeaf9'], canopy: ['#7fc9ae', '#6fb8a8'], bush: '#ffffff', trunk: '#b79a86',
    ground: ['#f4f9ff', '#e0ebfa'], blade: '#ffffff', shade: 'rgba(120,150,200,.14)', flowers: ['#ffffff', '#cfe6ff', '#e8f2ff', '#bfdcff'], capFill: '#ffffff' } }
};
const SCENE_TINT = { day: null, morning: ['#ffd9b0', 0.15], sunset: ['#ff9a7a', 0.25], night: ['#3a46a0', 0.5] };
function mixHex(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function terrainTheme(name, terrain) {
  const def = TERRAINS[terrain], tint = SCENE_TINT[name];
  const fix = v => Array.isArray(v) ? v.map(fix) : (tint && typeof v === 'string' && v[0] === '#') ? mixHex(v, tint[0], tint[1]) : v;
  const colors = {};
  Object.entries(def.colors).forEach(([k, v]) => colors[k] = fix(v));
  return { ...SCENES[name], ...colors, terrain, kind: def.kind };
}
function ensureTerrain(scene, terrain) {
  if (terrain === 'meadow' || scene.textures.exists(bgKey('ground', look.scene, terrain))) return;
  const T = terrainTheme(look.scene, terrain);
  makeMountains(scene, look.scene, T); makeHills(scene, look.scene, T); makeTrees(scene, look.scene, T); makeGround(scene, look.scene, T);
}

// 背景圖層（標題、結束、遊戲共用）；回傳各層，遊戲場景用來做視差捲動
// 圖層用負的 depth 固定先後順序，之後換地形時新圖層才能插在正確的位置
const LAYER_DEPTH = { sky: -10, clouds: -9, mountains: -8, hills: -7, trees: -6, ground: -5 };
function addBackdrop(scene) {
  scene.add.image(0, 0, bgKey('sky')).setOrigin(0).setDepth(LAYER_DEPTH.sky);
  const layer = (y, h, key) => scene.add.tileSprite(0, y, W, h, bgKey(key)).setOrigin(0).setDepth(LAYER_DEPTH[key]);
  return {
    clouds: layer(90, 260, 'clouds'),
    mountains: layer(GROUND - 300, 300, 'mountains'),
    hills: layer(GROUND - 260, 260, 'hills'),
    trees: layer(GROUND - 192, 200, 'trees'),
    ground: layer(GROUND - 6, GROUND_H, 'ground')
  };
}
// 換地形：新的山、丘陵、樹、地面疊在舊的上面，淡入的同時舊的淡出
// scrollers 是 [{sp, f}]（f 是視差倍率），新圖層會加進去繼續捲動，舊的淡出後移除
function swapTerrain(scene, layers, scrollers, terrain) {
  ensureTerrain(scene, terrain);
  ['mountains', 'hills', 'trees', 'ground'].forEach(k => {
    const old = layers[k];
    const sp = scene.add.tileSprite(old.x, old.y, old.width, old.height, bgKey(k, look.scene, terrain)).setOrigin(0).setDepth(LAYER_DEPTH[k] + 0.5).setAlpha(0);
    sp.tilePositionX = old.tilePositionX;
    scrollers.push({ sp, f: scrollers.find(s => s.sp === old).f });
    layers[k] = sp;
    scene.tweens.add({ targets: sp, alpha: 1, duration: 1600 });
    scene.tweens.add({ targets: old, alpha: 0, duration: 1600, onComplete: () => {
      const j = scrollers.findIndex(s => s.sp === old);
      if (j >= 0) scrollers.splice(j, 1);
      old.destroy(); sp.setDepth(LAYER_DEPTH[k]);
    } });
  });
}
