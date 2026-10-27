// ABC 冒險：主角走路原型（Phaser 3）
const W = 960, H = 540, GROUND = 450;
const FONT = '"Chalkboard SE","Comic Sans MS","Noto Sans TC","Microsoft JhengHei",sans-serif';
const INK = '#7a5c99';
const COLORS = [0xff9db8, 0x8fd0f5, 0x8fe0b4, 0xffc46b, 0xc3a4f2, 0xffa98a];
const WORDS = {
  A:['Apple','蘋果','🍎'], B:['Ball','球','⚽'], C:['Cat','貓咪','🐱'], D:['Dog','小狗','🐶'],
  E:['Egg','雞蛋','🥚'], F:['Fish','魚','🐟'], G:['Grapes','葡萄','🍇'], H:['Hat','帽子','🎩'],
  I:['Ice cream','冰淇淋','🍦'], J:['Juice','果汁','🧃'], K:['Kite','風箏','🪁'], L:['Lion','獅子','🦁'],
  M:['Moon','月亮','🌙'], N:['Nose','鼻子','👃'], O:['Orange','柳橙','🍊'], P:['Pig','小豬','🐷'],
  Q:['Queen','皇后','👸'], R:['Rabbit','兔子','🐰'], S:['Sun','太陽','☀️'], T:['Tiger','老虎','🐯'],
  U:['Umbrella','雨傘','☂️'], V:['Violin','小提琴','🎻'], W:['Whale','鯨魚','🐳'], X:['Xylophone','木琴','🎶'],
  Y:['Yo-yo','溜溜球','🪀'], Z:['Zebra','斑馬','🦓']
};
const POOL = 'ABCDE';      // 本關出題的字母範圍
const ROUNDS = 5;          // 本關題數
const SPEED = 170;         // 主角走路速度（像素/秒）
const STOP_GAP = 820;      // 每題之間的距離

const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);

// ---- 語音與音效 ----
function say(parts) {
  if (!('speechSynthesis' in window)) return Promise.resolve();
  speechSynthesis.cancel();
  return Promise.all(parts.map(([t, l]) => new Promise(res => {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = l; u.rate = 0.85; u.pitch = 1.2;
    u.onend = u.onerror = res;
    speechSynthesis.speak(u);
  })));
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
function txt(scene, x, y, s, size, color = INK) {
  return scene.add.text(x, y, s, {
    fontFamily: FONT, fontSize: size + 'px', fontStyle: 'bold', color, align: 'center',
    resolution: window.devicePixelRatio || 1
  }).setOrigin(0.5);
}
function button(scene, x, y, w, h, color, label, size, cb) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0xb99be0, .35).fillRoundedRect(-w / 2, -h / 2 + 7, w, h, 26);
  g.fillStyle(0xffffff).fillRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 28);
  g.fillStyle(color).fillRoundedRect(-w / 2, -h / 2, w, h, 24);
  const t = txt(scene, 0, 0, label, size, '#ffffff').setStroke('#9b7cc9', 6);
  c.add([g, t]).setSize(w, h).setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => cb(c));
  return c;
}
function confetti(scene) {
  for (let i = 0; i < 16; i++) {
    const t = scene.add.text(Phaser.Math.Between(20, W - 20), -30, pick(['🎉', '⭐', '✨', '🎈', '💖']), { fontSize: '34px' })
      .setScrollFactor(0).setDepth(50);
    scene.tweens.add({ targets: t, y: H + 40, angle: 360, duration: Phaser.Math.Between(1100, 1900), delay: Phaser.Math.Between(0, 400), onComplete: () => t.destroy() });
  }
}

// ---- 以程式繪製素材（原型階段不需要圖檔）----
function makeHeroFrame(scene, key, legA, bob, armsUp) {
  const g = scene.add.graphics(), cx = 50, hipY = 92, shY = 58 - bob, headY = 34 - bob;
  const limb = (x0, y0, a, len, w, col) => {
    const x1 = x0 + Math.sin(a) * len, y1 = y0 + Math.cos(a) * len;
    g.lineStyle(w, col).lineBetween(x0, y0, x1, y1);
    g.fillStyle(col).fillCircle(x1, y1, w / 2);
  };
  // 手臂：雙手舉高時朝上（角度接近 π），否則依步伐前後擺動
  const arm = a => limb(cx, shY, armsUp ? Math.PI + (a >= 0 ? 0.6 : -0.6) : a, 30, 12, 0xffd7b8);

  limb(cx, hipY, -legA, 36, 14, 0x9a85d6);                                            // 後腿
  arm(legA * 1.2);                                                                    // 後手
  g.fillStyle(0xff8fb3).fillRoundedRect(cx - 20, shY - 8, 40, 46, 16);                // 身體
  g.fillStyle(0xb39ddb).fillRoundedRect(cx - 20, hipY - 8, 40, 16, 8);                // 短褲
  limb(cx, hipY, legA, 36, 14, 0xffd7b8);                                             // 前腿
  g.fillStyle(0xffffff).fillEllipse(cx + legA * 20 + 4, hipY + 38, 22, 10);           // 鞋
  arm(-legA * 1.2);                                                                   // 前手
  g.fillStyle(0xffd7b8).fillCircle(cx, headY, 25);                                    // 頭
  g.fillStyle(0x8a5a44).slice(cx, headY, 26, Math.PI, Math.PI * 2, false).fillPath(); // 頭髮
  g.fillStyle(0x8a5a44).fillCircle(cx - 22, headY - 4, 8);
  g.fillStyle(0x4a3a5e).fillCircle(cx + 11, headY + 2, 3.5).fillCircle(cx - 3, headY + 2, 3.5); // 眼睛
  g.fillStyle(0xffa8b8, 0.8).fillCircle(cx + 17, headY + 10, 5);                      // 臉頰
  g.lineStyle(2.5, 0xd96b8a).beginPath().arc(cx + 7, headY + 8, 7, 0.2, Math.PI - 0.2).strokePath(); // 微笑
  g.generateTexture(key, 100, 150);
  g.destroy();
}
function makeTextures(scene) {
  [[0.55, 0], [0, 4], [-0.55, 0], [0, 4]].forEach(([a, b], i) => makeHeroFrame(scene, 'hero' + i, a, b, false));
  makeHeroFrame(scene, 'heroIdle', 0, 0, false);
  makeHeroFrame(scene, 'heroCheer', 0.2, 0, true);

  const sky = scene.textures.createCanvas('sky', 4, H), ctx = sky.getContext();
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#ffd9e8'); gr.addColorStop(0.45, '#e6d9ff'); gr.addColorStop(0.8, '#cdeeff'); gr.addColorStop(1, '#d9f7e6');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, 4, H); sky.refresh();

  const wrap = (key, w, h, draw) => {   // 左右可無縫重複的素材
    const g = scene.add.graphics();
    [-w, 0, w].forEach(dx => draw(g, dx));
    g.generateTexture(key, w, h); g.destroy();
  };
  wrap('clouds', W, 200, (g, dx) => {
    [[120, 60, 1], [420, 110, 0.7], [700, 50, 0.9]].forEach(([x, y, s]) => {
      g.fillStyle(0xffffff, 0.85);
      g.fillRoundedRect(dx + x - 60 * s, y, 120 * s, 36 * s, 18 * s);
      g.fillCircle(dx + x - 18 * s, y, 26 * s).fillCircle(dx + x + 24 * s, y + 4 * s, 20 * s);
    });
  });
  wrap('hills', W, 260, (g, dx) => {
    g.fillStyle(0xd8ccf7).fillEllipse(dx + 220, 260, 620, 260);
    g.fillStyle(0xffe3ef).fillEllipse(dx + 700, 260, 640, 200);
    g.fillStyle(0xc5f0d8).fillEllipse(dx + 470, 260, 520, 150);
  });
  const gd = scene.add.graphics();
  gd.fillStyle(0xbdeccb).fillRect(0, 0, 128, 100);
  gd.fillStyle(0xa6e3b9).fillRect(0, 0, 128, 14);
  gd.fillStyle(0xffffff, 0.8).fillCircle(30, 50, 5).fillCircle(90, 76, 5);
  gd.fillStyle(0xffb3c7).fillCircle(90, 40, 5).fillCircle(20, 80, 5);
  gd.generateTexture('ground', 128, 100); gd.destroy();
}

// ============ 場景：標題 ============
class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    if (!this.textures.exists('hero0')) makeTextures(this);
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(W, H);
    this.add.tileSprite(0, 40, W, 200, 'clouds').setOrigin(0);
    this.add.tileSprite(0, GROUND - 230, W, 260, 'hills').setOrigin(0);
    this.add.tileSprite(0, GROUND - 6, W, 100, 'ground').setOrigin(0);
    txt(this, W / 2, 110, 'ABC 冒險', 84, '#ffffff').setStroke('#b99be0', 12);
    const hero = this.add.sprite(W / 2, GROUND, 'heroIdle').setOrigin(0.5, 1).setScale(1.5);
    this.tweens.add({ targets: hero, scaleY: 1.56, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    button(this, W / 2, 300, 300, 90, COLORS[0], '▶ 開始', 52, () => {
      say([["Let's go!", 'en-US']]);        // 第一次點擊會解鎖語音
      this.cameras.main.fadeOut(400, 255, 230, 245);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Walk'));
    });
    this.cameras.main.fadeIn(400, 255, 230, 245);
  }
}

// ============ 場景：走路與答題 ============
class WalkScene extends Phaser.Scene {
  constructor() { super('Walk'); }
  create() {
    this.stops = Array.from({ length: ROUNDS }, (_, i) => 600 + i * STOP_GAP);
    this.worldW = this.stops[ROUNDS - 1] + 700;
    this.round = 0; this.state = 'walk'; this.score = 0; this.last = null;

    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(W, H).setScrollFactor(0);
    this.clouds = this.add.tileSprite(0, 40, W, 200, 'clouds').setOrigin(0).setScrollFactor(0);
    this.hills = this.add.tileSprite(0, GROUND - 230, W, 260, 'hills').setOrigin(0).setScrollFactor(0);
    this.add.tileSprite(0, GROUND - 6, this.worldW, 100, 'ground').setOrigin(0);

    this.stops.forEach(x => this.addSign(x + 150));
    this.addSign(this.worldW - 150, true);

    if (!this.anims.exists('walk')) {
      this.anims.create({ key: 'walk', frameRate: 8, repeat: -1, frames: [0, 1, 2, 3].map(i => ({ key: 'hero' + i })) });
    }
    this.hero = this.add.sprite(120, GROUND, 'heroIdle').setOrigin(0.5, 1).setDepth(5);
    this.hero.play('walk');

    this.cameras.main.setBounds(0, 0, this.worldW, H);
    this.cameras.main.startFollow(this.hero, true, 1, 1, -200, 0);
    this.cameras.main.fadeIn(500, 255, 230, 245);

    this.scoreText = txt(this, W - 90, 40, '⭐ 0', 36).setScrollFactor(0).setDepth(20);
    button(this, 50, 50, 64, 64, 0xc3a4f2, '🏠', 30, () => { speechSynthesis.cancel(); this.scene.start('Title'); })
      .setScrollFactor(0).setDepth(20);
  }
  addSign(x, flag) {
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0xc9a27a).fillRect(x - 6, GROUND - 130, 12, 130);
    g.fillStyle(flag ? 0xff9db8 : 0xffd96b).fillCircle(x, GROUND - 150, 40);
    g.lineStyle(5, 0xffffff).strokeCircle(x, GROUND - 150, 40);
    txt(this, x, GROUND - 150, flag ? '🏁' : '?', flag ? 40 : 54, '#ffffff').setStroke('#c98f2b', 6).setDepth(3);
  }
  update(time, dt) {
    const cam = this.cameras.main;
    this.clouds.tilePositionX = cam.scrollX * 0.2 + time * 0.01;
    this.hills.tilePositionX = cam.scrollX * 0.5;
    if (this.state !== 'walk') return;
    this.hero.x += SPEED * dt / 1000;
    if (this.round < ROUNDS && this.hero.x >= this.stops[this.round]) this.ask();
    else if (this.round >= ROUNDS && this.hero.x >= this.worldW - 200) this.finish();
  }
  ask() {
    this.state = 'ask';
    this.hero.stop().setTexture('heroIdle');
    const t = pick([...POOL].filter(c => c !== this.last)); this.last = t;
    const [en, zh, emoji] = WORDS[t];
    const others = shuffle([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter(c => c !== t)).slice(0, 2);
    const letters = shuffle([t, ...others]);

    const p = this.panel = this.add.container(W / 2, -400).setScrollFactor(0).setDepth(30);
    const bg = this.add.graphics();
    bg.fillStyle(0xb99be0, 0.3).fillRoundedRect(-340, -165, 680, 340, 40);
    bg.fillStyle(0xffffff, 0.94).fillRoundedRect(-340, -170, 680, 340, 40);
    p.add(bg);
    p.add(this.add.text(0, -105, emoji, { fontSize: '90px' }).setOrigin(0.5));
    this.question = txt(this, 0, -30, `${zh}（${en}）是哪個字母開頭？`, 30);
    p.add(this.question);
    letters.forEach((c, i) => {
      p.add(button(this, (i - 1) * 190, 75, 130, 100, COLORS[(i + this.round) % COLORS.length], c, 60, btn => {
        if (this.state !== 'ask') return;
        if (c === t) { this.state = 'cheer'; this.correct(t, en); }
        else {
          beep([200]);
          this.tweens.add({ targets: btn, x: btn.x + 12, duration: 60, yoyo: true, repeat: 3 });
          say([['再試試看喔', 'zh-TW']]);
        }
      }));
    });
    p.add(button(this, 295, -125, 70, 70, 0xffd96b, '🔊', 34, () => this.speakQuestion(en, zh)));
    this.tweens.add({ targets: p, y: 200, duration: 450, ease: 'Back.out' });
    this.speakQuestion(en, zh);
  }
  speakQuestion(en, zh) { say([[en, 'en-US'], [zh + '，是哪個字母開頭呢？', 'zh-TW']]); }
  correct(t, en) {
    this.score++; this.scoreText.setText('⭐ ' + this.score);
    beep([523, 659, 784]); confetti(this);
    this.hero.setTexture('heroCheer');
    this.tweens.add({ targets: this.hero, y: GROUND - 70, duration: 250, yoyo: true, repeat: 1, ease: 'Sine.out' });
    this.question.setText(`${t} is for ${en}!`).setColor('#f06a9b').setFontSize(40);
    say([[`${t}, ${t}, ${en}!`, 'en-US']])
      .then(() => say([['Great job! 你好棒！', 'en-US']]))
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
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(W, H);
    this.add.tileSprite(0, GROUND - 230, W, 260, 'hills').setOrigin(0);
    this.add.tileSprite(0, GROUND - 6, W, 100, 'ground').setOrigin(0);
    this.add.sprite(W / 2, GROUND, 'heroCheer').setOrigin(0.5, 1).setScale(1.5);
    txt(this, W / 2, 90, '太棒了！🎉', 80, '#ffffff').setStroke('#b99be0', 12);
    txt(this, W / 2, 175, '⭐'.repeat(data.score), 56);
    button(this, W / 2, 270, 320, 90, COLORS[1], '🔁 再玩一次', 44, () => this.scene.start('Walk'));
    this.cameras.main.fadeIn(500, 255, 230, 245);
    beep([523, 659, 784, 1046]); confetti(this);
    say([['You did it! 你完成了！', 'en-US']]);
  }
}

new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: W, height: H, backgroundColor: '#e6d9ff',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [TitleScene, WalkScene, EndScene]
});
