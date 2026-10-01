// Luồng chơi: 1 ngày = 6 khách. Mỗi khách: vào cửa (chuông) → tới quầy, vẫy, gọi món (bong bóng hình + chữ + ×N)
// → Nhím chạm món trên kệ (bay vào khay, đếm to) → 🛎️ giao → khách kiểm (thiếu / dư / nhầm: nhắc nhẹ)
// → cấp 2: trả xu (đếm xu, chọn số) + có khi điền chữ thiếu trên bảng giá (A2) → vui (nhảy, tim, ⭐) → chào, ra về.
// Không có thua: sai chỉ nhận gợi ý; ngồi im 10 s khách nhắc lại món + tay chỉ đúng chỗ.
import * as THREE from 'three';
import { Shop, SPOT, COUNTER_Y, TRAY_STEP } from './shop.ts';
import { makeActor, Cat, Human, type Actor, yawTo } from './actors.ts';
import { Magic } from './magic.ts';
import { tween, updateTweens, wait, easeOutQuad, easeInOutSine, finishAllTweens } from './tween.ts';
import { play, sfx, speakSequence, stopSpeech, chime, musicBox, preload } from './audio.ts';
import { familyCheer, familyCheerAll, clearFamily, FAMILY_KEYS } from './family.ts';
import { prefetch, emojiSprite, emojiTexture } from './assets.ts';
import { els, renderWord, wobbleEl, bumpEl, toast, confetti, flyStar, showOptions, showPanel, pointAt } from './ui.ts';
import { ITEMS, CUSTOMERS, LEVELS, DECOR, DAY_SIZE, TRAY_MAX, itemByWord, type ItemDef, type CustomerDef, type LevelDef } from './data.ts';
import { keyName, keyQty, keyEach, keyNum, keyXu, wordInfo, ck } from './lines.ts';
import { letterAudio } from './spell.ts';
import { type Progress, saveProgress, level2Unlocked, PARAM } from './progress.ts';

const IDLE_MS = 10000;
const shuffle = <T>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

interface TrayItem { item: ItemDef; mesh: THREE.Group; hit: THREE.Mesh; busy: boolean }
interface Coin { mesh: THREE.Group; hit: THREE.Mesh; counted: boolean }
interface Visit { cust: CustomerDef; item: ItemDef; n: number }
interface Order extends Visit { actor: Actor; tries: number; index: number }
type Phase = 'menu' | 'enter' | 'order' | 'check' | 'coins' | 'choose' | 'fill' | 'busy' | 'end';
type HandTarget = { kind: '3d'; at: THREE.Vector3 } | { kind: 'el'; el: HTMLElement } | null;

class Aborted extends Error {}

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
  readonly magic: Magic;
  readonly shop: Shop;
  private readonly timer = new THREE.Timer();
  private readonly ray = new THREE.Raycaster();
  private readonly actors = new Set<Actor>();
  mun!: Cat;
  rom!: Cat;
  private catBusy = new Set<Cat>();
  private wanderT = 3;
  private munT = 20;
  level: LevelDef = LEVELS[0];
  phase: Phase = 'menu';
  order: Order | null = null;
  tray: TrayItem[] = [];
  coins: Coin[] = [];
  private jarCount = 0;
  private visits: Visit[] = [];
  private dayIndex = 0;
  private dayStars = 0;
  private waiting: Actor | null = null;
  /** id khách sau đang vào chờ (đặt ngay khi bắt đầu, trước khi model tải xong) */
  private waitingFor: string | null = null;
  private waitingPromise: Promise<void> | null = null;
  private run = 0;
  private lastTap = performance.now();
  private speaking = false;
  private hand: HandTarget = null;
  private bellResolve: (() => void) | null = null;
  private repeatFn: (() => void) | null = null;
  private fps = 60;
  private orderSide: 1 | -1 = 1;
  private bellRect: { x: number; y: number; w: number } | null = null;
  /** đang tự chơi (?auto=1) */
  readonly auto = PARAM.auto;

  readonly progress: Progress;
  constructor(container: HTMLElement, progress: Progress) {
    this.progress = progress;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: import.meta.env.DEV });
    const touch = matchMedia('(pointer: coarse)').matches;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, touch ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;
    container.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(0xffe9f0);
    this.magic = new Magic(this.scene, 620, THREE.NormalBlending);

    const hemi = new THREE.HemisphereLight(0xfff8ee, 0xf6c7b0, 1.55);
    const sun = new THREE.DirectionalLight(0xfff1dc, 1.65);
    sun.position.set(3.5, 9, 6);
    sun.target.position.set(0, 0, -1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -8; sun.shadow.camera.right = 8; sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 25;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.02;
    const fill = new THREE.DirectionalLight(0xffe0f0, 0.45);
    fill.position.set(-5, 4, 4);
    // nắng chiếu qua cửa sổ
    const window_ = new THREE.PointLight(0xfff2c0, 5, 6, 1.6);
    window_.position.set(1.1, 2.2, -3.4);
    this.scene.add(hemi, sun, sun.target, fill, window_);

    this.shop = new Shop(this.scene);
    for (let i = 0; i < this.progress.decor; i++) void this.shop.showDecor(DECOR[i].id, false);

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.bindInput();
  }

  // ------------------------------------------------------------------ dựng
  async init(): Promise<void> {
    await prefetch([...new Set([...CUSTOMERS.map((c) => c.model), ...ITEMS.map((i) => i.model)])]);
    const [mun, rom] = await Promise.all([makeActor(CUSTOMERS.find((c) => c.id === 'mun')!), makeActor(CUSTOMERS.find((c) => c.id === 'rom')!)]) as [Cat, Cat];
    this.mun = mun; this.rom = rom;
    mun.setPos(SPOT.sill);
    mun.yaw = mun.targetYaw = 0.5;
    mun.setSleeping(true);
    rom.setPos(new THREE.Vector3(2.4, 0, -3.0));
    rom.yaw = rom.targetYaw = -0.6;
    this.addActor(mun); this.addActor(rom);
    await this.shop.setShelf(shuffle(ITEMS).slice(0, 8));
    this.shop.drawBoard(null, ITEMS.slice(0, 3));
  }

  private addActor(a: Actor): void { this.actors.add(a); this.scene.add(a.root); }
  private removeActor(a: Actor): void { this.actors.delete(a); a.dispose(); }

  private resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // giữ bề ngang kệ (≈ 4.3 m) luôn lọt khung: màn hẹp / dọc thì mở fov dọc
    const halfW = 0.335; // tan(nửa fov ngang) mục tiêu: kệ 4 ô vừa khít bề ngang
    const vfov = 2 * Math.atan(Math.max(Math.tan(THREE.MathUtils.degToRad(12.5)), halfW / aspect));
    this.camera.fov = Math.min(80, THREE.MathUtils.radToDeg(vfov));
    // mép dưới khung luôn ở ngay dưới hàng kệ trước (nhìn xuống 24.4°): màn dọc thì ngẩng lên thấy tường + trần
    const pitch = THREE.MathUtils.degToRad(24.4) - vfov / 2;
    this.camera.position.set(0, 3.15, 8.6);
    this.camera.lookAt(0, 3.15 - Math.tan(pitch) * 9.4, -0.8);
    this.camera.updateProjectionMatrix();
    this.magic.setPointScale(this.renderer.getDrawingBufferSize(new THREE.Vector2()).y * 0.39);
  }

  toScreen(v: THREE.Vector3): { x: number; y: number } {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight };
  }

  // ------------------------------------------------------------------ vòng lặp
  start(): void {
    let frames = 0, acc = 0;
    this.renderer.setAnimationLoop(() => {
      this.timer.update();
      const dt = Math.min(this.timer.getDelta(), 0.05);
      frames++; acc += dt;
      if (acc >= 1) { this.fps = frames / acc; frames = 0; acc = 0; }
      updateTweens(dt);
      for (const a of this.actors) a.update(dt);
      this.shop.update(dt);
      this.updateCats(dt);
      this.magic.update(dt);
      this.updateDom();
      this.checkIdle();
      this.renderer.render(this.scene, this.camera);
    });
  }

  private updateDom(): void {
    // chuông 🛎️ đứng ở đầu phải quầy (theo khung hình, mọi tỉ lệ màn)
    if (!els.bell.hidden) {
      const b = this.toScreen(new THREE.Vector3(2.75, COUNTER_Y + 0.45, 0.2));
      const bw = els.bell.offsetWidth;
      const bx = Math.min(window.innerWidth - bw - 14, b.x - bw / 2);
      const by = Math.max(130, b.y - bw / 2);
      els.bell.style.translate = `${bx}px ${by}px`;
      this.bellRect = { x: bx, y: by, w: bw };
    }
    const o = this.order;
    if (o && !els.order.hidden) {
      const isCat = o.cust.kind === 'cat';
      const head = o.actor.root.position.clone().add(new THREE.Vector3(0, isCat ? o.cust.height + 0.15 : o.cust.height * 0.95, 0));
      const s = this.toScreen(head);
      const w = els.order.offsetWidth, h = els.order.offsetHeight;
      const W = window.innerWidth, H = window.innerHeight;
      const gap = isCat ? 70 : 90;
      let side = this.orderSide;
      if (side === 1 && s.x + gap + w > W - 10) side = -1;
      else if (side === -1 && s.x - gap - w < 10) side = 1;
      this.orderSide = side;
      let x = side === 1 ? s.x + gap : s.x - gap - w;
      x = Math.max(10, Math.min(W - w - 10, x));
      let y = s.y - h * 0.75;
      y = Math.max(124, Math.min(H * 0.6 - h, y));
      // không đè lên chuông
      const br = this.bellRect;
      if (br && x + w > br.x && x < br.x + br.w && y + h > br.y - 8) y = Math.max(124, br.y - 8 - h);
      els.order.classList.toggle('flip', side === -1);
      els.order.style.transform = `translate(${x}px, ${y}px)`;
    }
    const hd = this.hand;
    if (!hd) pointAt(null);
    else if (hd.kind === '3d') { const s = this.toScreen(hd.at); pointAt(s.x, s.y); }
    else { const r = hd.el.getBoundingClientRect(); pointAt(r.left + r.width / 2, r.top + r.height * 0.6); }
    if (PARAM.debug) els.debug.textContent = `fps ${this.fps.toFixed(0)}  phase ${this.phase}  lvl ${this.level.id}  khách ${this.dayIndex + 1}/${this.visits.length}  khay ${this.tray.length}  ⭐${this.progress.stars}`;
  }

  // ------------------------------------------------------------------ mèo sống
  private updateCats(dt: number): void {
    if (!this.rom || !this.mun) return;
    // Rơm đi lang thang khu khách (trước tường sau), thỉnh thoảng múa / nhảy
    if (!this.catBusy.has(this.rom) && !this.rom.walking) {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = 4 + Math.random() * 6;
        const r = Math.random();
        if (r < 0.25) void this.rom.once(pick(['dance', 'yes', 'jump']));
        else if (r < 0.35) this.rom.face(0);
        else {
          const to = new THREE.Vector3(-0.8 + Math.random() * 3.6, 0, -3.7 + Math.random() * 1.6);
          if (to.distanceTo(this.rom.root.position) > 0.8) void this.rom.walkTo([to], 0.8);
        }
      }
    }
    // Mun ngủ trên bậu cửa sổ, thỉnh thoảng thức dậy ngó ra phố / vẫy đuôi rồi ngủ tiếp
    if (!this.catBusy.has(this.mun)) {
      this.munT -= dt;
      if (this.munT <= 0) {
        if (this.mun.sleeping) {
          this.mun.setSleeping(false);
          this.mun.face(pick([-2.6, 0, 0.6]));
          void this.mun.once('yes');
          this.munT = 5 + Math.random() * 4;
        } else {
          this.mun.face(0.5);
          this.mun.setSleeping(true);
          this.munT = 18 + Math.random() * 20;
        }
      }
    }
  }

  // ------------------------------------------------------------------ chạm
  private bindInput(): void {
    const el = this.renderer.domElement;
    let down: { x: number; y: number } | null = null;
    window.addEventListener('pointerdown', () => { this.lastTap = performance.now(); }, { capture: true });
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 30) return;
      down = null;
      const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      this.onTap(ndc);
    });
    els.bell.addEventListener('click', () => this.onBell());
    els.ordWord.addEventListener('click', () => void this.spellOrder());
    els.ordPic.addEventListener('click', () => this.repeatOrder());
    els.say.addEventListener('click', () => this.repeatFn?.());
  }

  onTap(ndc: THREE.Vector2): void {
    this.ray.setFromCamera(ndc, this.camera);
    const targets: THREE.Object3D[] = [];
    if (this.phase === 'order') targets.push(...this.shop.hits, ...this.tray.map((t) => t.hit));
    if (this.phase === 'coins') targets.push(...this.coins.filter((c) => !c.counted).map((c) => c.hit));
    const hit = this.ray.intersectObjects(targets, false)[0];
    if (hit) {
      const obj = hit.object;
      if (obj.userData.slot !== undefined) { this.tapSlot(obj.userData.slot as number); return; }
      const ti = this.tray.find((t) => t.hit === obj);
      if (ti) { this.removeTrayItem(ti); return; }
      const coin = this.coins.find((c) => c.hit === obj);
      if (coin) { void this.tapCoin(coin); return; }
    }
    // chạm nhân vật: khách cười, mèo kêu
    const people = [...this.actors];
    const ph = this.ray.intersectObjects(people.map((a) => a.body), true)[0];
    if (ph) {
      const a = people.find((x) => { let o: THREE.Object3D | null = ph.object; while (o) { if (o === x.body) return true; o = o.parent; } return false; });
      if (a) this.tapActor(a);
    }
  }

  private tapActor(a: Actor): void {
    if (a instanceof Cat) {
      sfx('cry_cat', 0.8);
      if (!this.catBusy.has(a)) {
        if (a.sleeping) { a.setSleeping(false); this.munT = 6; }
        if (!a.walking) { a.face(0); void a.once(pick(['yes', 'dance', 'jump'])); }
      }
      this.magic.burst(a.root.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 14, 0xff8fb8, 1.6, 0.18, 0.7, -1);
      return;
    }
    if (this.speaking || this.phase !== 'order' || a !== this.order?.actor) {
      if (a !== this.order?.actor && !a.walking) void a.once('wave');
      return;
    }
    void this.talk(a, [ck('tap', a.def)]);
    void a.hop(1, 0.2);
  }

  // ------------------------------------------------------------------ nói
  private alive(token: number): void { if (token !== this.run) throw new Aborted(); }

  /** Khách nói (gật đầu theo giọng). Trả false nếu bị cắt. */
  private async talk(a: Actor | null, keys: string[], gap = 140): Promise<boolean> {
    this.speaking = true;
    if (a) a.talking = true;
    try { return await speakSequence(keys, undefined, gap); }
    finally { if (a) a.talking = false; this.speaking = false; this.lastTap = performance.now(); }
  }

  private checkIdle(): void {
    if (this.speaking) return;
    if (!['order', 'coins'].includes(this.phase)) return;
    if (performance.now() - this.lastTap < IDLE_MS) return;
    this.lastTap = performance.now();
    if (this.phase === 'order') {
      const o = this.order;
      const done = o && this.tray.length === o.n && this.tray.every((t) => t.item === o.item);
      if (done) void this.talk(null, ['bell_hint']);
      else if (o && !this.tray.length && o.index === 0) { void o.actor.once(o.actor instanceof Human ? 'wave' : 'yes'); void this.talk(o.actor, [ck('remind', o.cust), keyQty(o.item, o.n), 'tap_shelf']); }
      else this.repeatOrder();
      this.updateHint(true);
    }
    else if (this.phase === 'coins') { void this.talk(null, ['coin_intro']); this.updateHint(true); }
  }

  // ------------------------------------------------------------------ ngày
  async startDay(levelId: number, again = false): Promise<void> {
    const token = ++this.run;
    this.level = LEVELS.find((l) => l.id === levelId && l.enabled) ?? LEVELS[0];
    this.planDay();
    this.dayIndex = 0;
    this.dayStars = 0;
    this.jarCount = 0;
    this.clearJar();
    this.shop.closedSign.visible = false;
    els.hud.hidden = false;
    els.starsN.textContent = String(this.progress.stars);
    this.renderDayPips();
    // kệ: món của khách hôm nay + thêm cho đủ 8
    const need = [...new Set(this.visits.map((v) => v.item))];
    const extra = shuffle(ITEMS.filter((i) => !need.includes(i))).slice(0, Math.max(0, this.level.shelf - need.length));
    const shelf = shuffle([...need, ...extra]).slice(0, this.level.shelf);
    await this.shop.setShelf(shelf);
    this.shop.drawBoard(null, shelf);
    void prefetch([...new Set(this.visits.map((v) => v.cust.model))]);
    // tải trước tiếng (sau chạm đầu tiên: tạo AudioContext trước cử chỉ thì Chrome/iPad cảnh báo)
    void preload(['sfx_pop', 'sfx_soft', 'sfx_tap', 'sfx_win', 'cry_cat', 'right', 'retry', 'hint_last', ...FAMILY_KEYS]);
    try {
      this.phase = 'busy';
      void musicBox('C5:0.5 E5:0.5 G5:0.5 C6:1 G5:0.5 C6:1.5', 200, 0.16);
      const intro: string[] = [this.level.id === 2 ? 'level2_name' : 'level1_name'];
      if (!this.progress.introDone) intro.push('intro_first'); else intro.push(again ? 'new_day' : 'intro_day');
      if (this.level.id === 2 && !this.progress.intro2Done) intro.push('intro_l2');
      this.repeatFn = () => void this.talk(null, intro);
      await this.talk(null, intro);
      this.alive(token);
      this.progress.introDone = true;
      if (this.level.id === 2) this.progress.intro2Done = true;
      saveProgress(this.progress);
      for (this.dayIndex = 0; this.dayIndex < this.visits.length; this.dayIndex++) {
        this.renderDayPips();
        await this.serve(token, this.dayIndex);
        this.alive(token);
      }
      await this.endDay(token);
    } catch (e) {
      if (!(e instanceof Aborted)) throw e;
    }
  }

  /** Chọn khách + món cho ngày: 5 người nhà xáo trộn + 1 mèo chen giữa. */
  private planDay(): void {
    const humans = shuffle(CUSTOMERS.filter((c) => c.kind === 'human'));
    const cat = pick(CUSTOMERS.filter((c) => c.kind === 'cat'));
    let queue: CustomerDef[] = humans.slice(0, DAY_SIZE - 1);
    queue.splice(2 + Math.floor(Math.random() * (queue.length - 1)), 0, cat);
    const forced = PARAM.customer ? CUSTOMERS.find((c) => c.id === PARAM.customer) : undefined;
    if (forced) queue = [forced, ...queue.filter((c) => c.id !== forced.id && (forced.kind !== 'cat' || c.kind !== 'cat'))].slice(0, DAY_SIZE);
    if (PARAM.day) queue = queue.slice(0, PARAM.day);
    const used = new Set<string>();
    let lastN = 0;
    this.visits = queue.map((cust) => {
      const fresh = cust.likes.filter((w) => !used.has(w));
      const word = pick(fresh.length ? fresh : cust.likes);
      used.add(word);
      const [lo, hi] = this.level.count;
      let n = lo + Math.floor(Math.random() * (hi - lo + 1));
      if (n === lastN) n = n < hi ? n + 1 : lo;
      lastN = n;
      return { cust, item: itemByWord(word), n };
    });
    if (PARAM.n && this.visits[0]) this.visits[0].n = PARAM.n;
  }

  /** Chấm khách trong ngày: done = số khách đã xong. */
  private renderDayPips(done = this.dayIndex): void {
    els.daypips.innerHTML = '';
    this.visits.forEach((v, i) => {
      const p = document.createElement('i');
      if (i < done) { p.className = 'done'; p.textContent = v.cust.emoji; }
      else if (i === done && this.phase !== 'end') p.className = 'now';
      els.daypips.appendChild(p);
    });
  }

  // ------------------------------------------------------------------ 1 khách
  private async serve(token: number, index: number): Promise<void> {
    const v = this.visits[index];
    this.phase = 'enter';
    this.repeatFn = null;
    const actor = await this.bringToCounter(token, v);
    this.alive(token);
    const o: Order = { ...v, actor, tries: 0, index };
    this.order = o;
    // vẫy + chào + gọi món
    actor.faceCamera();
    const wave = actor instanceof Human ? actor.once('wave') : actor.once('yes');
    if (actor instanceof Cat) sfx('cry_cat', 0.8);
    await wait(250);
    this.showOrder(o);
    this.phase = 'order';
    this.lastTap = performance.now();
    this.repeatFn = () => this.repeatOrder();
    // khách sau bước vào chờ (không chờ mèo – mèo đã ở trong tiệm)
    const next = this.visits[index + 1];
    if (next && next.cust.kind === 'human') setTimeout(() => { if (token === this.run && this.order?.index === index) this.preEnter(token, next); }, 6500);
    await Promise.all([wave, this.talk(actor, [ck(Math.random() < 0.5 ? 'greet1' : 'greet2', o.cust), keyQty(o.item, o.n)])]);
    this.alive(token);
    if (this.auto) void this.autoOrder(token, o);
    // chờ giao đúng
    await new Promise<void>((res) => { this.bellResolve = res; });
    this.alive(token);
    await this.success(token, o);
  }

  /** Đưa khách tới quầy: người vào từ cửa (hoặc từ chỗ chờ), mèo đi từ chỗ của mình rồi nhảy lên quầy. */
  private async bringToCounter(token: number, v: Visit): Promise<Actor> {
    if (v.cust.kind === 'cat') {
      const cat = v.cust.id === 'mun' ? this.mun : this.rom;
      this.catBusy.add(cat);
      cat.showTag(true);
      if (cat.sleeping) { cat.setSleeping(false); await cat.once('yes'); }
      if (cat.root.position.y > 0.5) await this.jumpTo(cat, new THREE.Vector3(cat.root.position.x, 0, cat.root.position.z + 0.75), 0.6);
      sfx('cry_cat', 0.7);
      await cat.walkTo([SPOT.counter.clone()], 1.0);
      this.alive(token);
      cat.faceCamera();
      await this.jumpTo(cat, SPOT.counterTop, 0.55);
      return cat;
    }
    let a: Actor | null = null;
    if (this.waitingFor === v.cust.id) {
      // khách này đã vào đứng chờ (hoặc đang bước vào): đợi tới chỗ chờ rồi đi tới quầy
      await this.waitingPromise;
      this.alive(token);
      a = this.waiting;
      this.waiting = null;
      this.waitingFor = null;
    }
    if (a) {
      await a.walkTo([SPOT.counter.clone()], 1.15);
    } else {
      a = await makeActor(v.cust);
      this.alive(token);
      this.addActor(a);
      a.setPos(SPOT.outside);
      a.yaw = a.targetYaw = 0;
      a.face(Math.PI);
      void this.shop.openDoor(true);
      this.doorBell();
      const walk = a.walkTo([SPOT.door.clone(), SPOT.inside.clone(), new THREE.Vector3(-1.3, 0, -1.9), SPOT.counter.clone()], 1.2);
      setTimeout(() => void this.shop.openDoor(false), 2600);
      await walk;
    }
    this.alive(token);
    return a;
  }

  /** Khách sau vào trước, đứng chờ cạnh cửa sổ, ngó nghiêng + vẫy Nhím. */
  private preEnter(token: number, v: Visit): void {
    if (this.waitingFor) return;
    this.waitingFor = v.cust.id;
    this.waitingPromise = (async () => {
      const a = await makeActor(v.cust);
      if (token !== this.run) { a.dispose(); return; }
      this.addActor(a);
      this.waiting = a;
      a.setPos(SPOT.outside);
      void this.shop.openDoor(true);
      this.doorBell();
      const walk = a.walkTo([SPOT.door.clone(), SPOT.inside.clone(), SPOT.wait.clone()], 1.1);
      setTimeout(() => void this.shop.openDoor(false), 2600);
      await walk;
      if (token !== this.run) return;
      a.face(yawTo(a.root.position, this.camera.position));
      void a.once('wave');
      // ngó nghiêng trong lúc chờ
      const look = async () => {
        while (this.waiting === a && token === this.run) {
          a.setLook(pick([-0.5, 0, 0.45, 0.2]));
          await wait(1800 + Math.random() * 1800);
          if (this.waiting === a && Math.random() < 0.25 && !a.walking) void a.once('wave');
        }
        a.setLook(0);
      };
      void look();
    })();
  }

  private doorBell(): void {
    this.shop.ringBell();
    chime('E6:0.5 C6:0.5 E6:0.5 C6:1', 260, 0.2);
  }

  /** Nhảy theo cung parabol tới điểm (mèo lên / xuống quầy, bậu cửa). */
  private async jumpTo(a: Actor, to: THREE.Vector3, h: number): Promise<void> {
    const from = a.root.position.clone();
    a.face(yawTo(from, to));
    void a.once('jump');
    await wait(120);
    const dur = 520;
    await tween(dur, (t) => {
      const p = from.clone().lerp(to, t);
      a.baseY = p.y + Math.sin(t * Math.PI) * h;
      a.root.position.x = p.x; a.root.position.z = p.z;
    }, easeInOutSine);
    a.baseY = to.y;
    a.root.position.copy(to);
  }

  // ------------------------------------------------------------------ thẻ gọi món
  private showOrder(o: Order): void {
    els.ordPic.textContent = o.item.emoji;
    renderWord(els.ordWord, wordInfo(o.item).word);
    els.ordQty.textContent = `×${o.n}`;
    els.order.hidden = false;
    els.order.classList.remove('pop');
    void els.order.offsetWidth;
    els.order.classList.add('pop');
    sfx('sfx_pop', 0.5);
    els.bell.hidden = false;
    this.refreshTray();
  }

  private repeatOrder(): void {
    const o = this.order;
    if (!o || this.phase !== 'order') return;
    void o.actor.once(o.actor instanceof Human ? 'wave' : 'yes');
    void this.talk(o.actor, [ck('remind', o.cust), keyQty(o.item, o.n)]);
  }

  /** Chạm chữ trên thẻ: đánh vần GDPT, chữ sáng theo giọng. */
  private async spellOrder(): Promise<void> {
    const o = this.order;
    if (!o) return;
    const w = wordInfo(o.item);
    const all = Array.from(w.word).map((_, i) => i);
    this.speaking = true;
    const ok = await speakSequence(w.tokens.map((t) => t.audio), (i) => renderWord(els.ordWord, w.word, w.tokens[i].lit), 200);
    this.speaking = false;
    this.lastTap = performance.now();
    if (ok) {
      renderWord(els.ordWord, w.word, all, true);
      setTimeout(() => { if (this.order === o) renderWord(els.ordWord, w.word); }, 900);
    }
  }

  /** Cập nhật chấm hình, số trên khay, chuông sẵn sàng. */
  private refreshTray(): void {
    const o = this.order;
    if (!o) return;
    const match = this.tray.filter((t) => t.item === o.item).length;
    const wrong = this.tray.length - match;
    if (this.level.pips) {
      els.ordPips.innerHTML = '';
      for (let i = 0; i < Math.max(o.n, match); i++) {
        const p = document.createElement('i');
        p.textContent = o.item.emoji;
        if (i < match) p.className = i < o.n ? 'on' : 'extra';
        els.ordPips.appendChild(p);
      }
    }
    else {
      // cấp 2: bỏ chấm hình, chỉ hiện số đã đặt lên khay (bé tự so với ×N)
      els.ordPips.innerHTML = `<b class="cnt">🧺 ${match}</b>`;
    }
    els.bell.classList.toggle('ready', match === o.n && wrong === 0);
  }

  // ------------------------------------------------------------------ kệ → khay
  /** Chỗ món thứ i trên khay 2 bậc: ≤ 5 món 1 hàng ở bậc trước; món 6..10 lên bậc sau (cao hơn, so le) để không che nhau. */
  private trayPos(i: number, n: number): THREE.Vector3 {
    const back = i >= 5;
    const inRow = back ? n - 5 : Math.min(n, 5);
    const col = back ? i - 5 : i;
    let x = (col - (inRow - 1) / 2) * 0.6;
    if (back && inRow % 2 === 1) x += 0.3; // so le với hàng trước
    return back
      ? new THREE.Vector3(SPOT.tray.x + x, COUNTER_Y + TRAY_STEP + 0.06, SPOT.tray.z - 0.3)
      : new THREE.Vector3(SPOT.tray.x + x, COUNTER_Y + 0.07, SPOT.tray.z + 0.2);
  }

  private layoutTray(): void {
    const n = this.tray.length;
    this.tray.forEach((t, i) => {
      if (t.busy) return;
      const to = this.trayPos(i, n);
      const from = t.mesh.position.clone();
      if (from.distanceTo(to) < 0.01) return;
      void tween(260, (k) => t.mesh.position.lerpVectors(from, to, k), easeOutQuad);
    });
  }

  private tapSlot(i: number): void {
    const o = this.order;
    const slot = this.shop.slots[i];
    if (!o || !slot || this.phase !== 'order') return;
    if (this.tray.length >= TRAY_MAX) { void this.talk(null, ['tray_full']); wobbleEl(els.bell); return; }
    this.hand = null;
    sfx('sfx_tap', 0.5);
    // ô kệ nảy
    const r = slot.root;
    void tween(240, (k) => r.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.12));
    void this.addToTray(slot.item, slot.from.clone(), o);
  }

  private async addToTray(item: ItemDef, from: THREE.Vector3, o: Order): Promise<void> {
    const mesh = await this.shop.itemMesh(item, item.size * 0.9);
    if (this.order !== o) return;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.5, 0.44), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.22;
    mesh.add(hit);
    mesh.position.copy(from);
    this.scene.add(mesh);
    const ti: TrayItem = { item, mesh, hit, busy: true };
    this.tray.push(ti);
    const index = this.tray.length - 1;
    const to = this.trayPos(index, this.tray.length);
    this.layoutTray();
    // số đếm tại lúc chạm (chạm nhanh vẫn đếm đúng thứ tự)
    const count = this.tray.filter((t) => t.item === item).length;
    const isOrder = item === o.item;
    const ctrl = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 1.3, 0));
    const curve = new THREE.QuadraticBezierCurve3(from, ctrl, to);
    const spin = (Math.random() - 0.5) * 6;
    await tween(520, (k) => {
      mesh.position.copy(curve.getPoint(k));
      mesh.rotation.y = spin * k;
      if (k > 0.3 && Math.random() < 0.5) this.magic.twinkle(mesh.position, 0xffd36e, 1, 0.15, 0.12);
    }, easeInOutSine);
    if (!this.tray.includes(ti)) return;
    ti.busy = false;
    mesh.position.copy(this.trayPos(this.tray.indexOf(ti), this.tray.length));
    void tween(260, (k) => { const s = 1 + Math.sin(k * Math.PI) * 0.25; mesh.scale.set(s, 2 - s, s); });
    sfx('sfx_pop', 0.45);
    this.refreshTray();
    if (isOrder) {
      // khách gật gù theo từng món đúng
      o.actor.talking = true;
      setTimeout(() => { if (!this.speaking) o.actor.talking = false; }, 380);
      if (this.level.pips) { const pip = els.ordPips.children[count - 1]; if (pip) bumpEl(pip); }
      else { const c = els.ordPips.querySelector('.cnt'); if (c) bumpEl(c); }
      void this.say1(keyNum(Math.min(count, 10)));
      if (count === o.n && this.tray.length === count) setTimeout(() => { if (this.order === o && this.phase === 'order' && els.bell.classList.contains('ready')) this.hand = { kind: 'el', el: els.bell }; }, 900);
    } else void this.say1(keyName(item));
  }

  /** 1 tiếng ngắn (đếm / tên món) – không đè khi khách đang nói câu dài. */
  private async say1(key: string): Promise<void> {
    if (this.speaking) { stopSpeech(); this.speaking = false; }
    await play(key);
  }

  private removeTrayItem(ti: TrayItem): void {
    const o = this.order;
    if (!o || ti.busy || this.phase !== 'order') return;
    this.hand = null;
    ti.busy = true;
    const idx = this.tray.indexOf(ti);
    this.tray.splice(idx, 1);
    sfx('sfx_soft', 0.55);
    const slot = this.shop.slots.find((s) => s.item === ti.item);
    const from = ti.mesh.position.clone();
    const to = slot ? slot.from.clone() : from.clone().add(new THREE.Vector3(0, 0, 1.5));
    const ctrl = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 1.0, 0));
    const curve = new THREE.QuadraticBezierCurve3(from, ctrl, to);
    void tween(420, (k) => { ti.mesh.position.copy(curve.getPoint(k)); ti.mesh.scale.setScalar(1 - k * 0.7); }, easeInOutSine).then(() => ti.mesh.removeFromParent());
    this.layoutTray();
    this.refreshTray();
    const left = this.tray.filter((t) => t.item === ti.item).length;
    if (ti.item === o.item && left > 0) void this.say1(keyNum(Math.min(left, 10)));
  }

  // ------------------------------------------------------------------ giao hàng
  onBell(): void {
    const o = this.order;
    if (!o || this.phase !== 'order') return;
    if (this.tray.some((t) => t.busy)) return;
    bumpEl(els.bell, 'ring');
    chime('G6:0.4 E6:0.6', 240, 0.22);
    this.hand = null;
    const match = this.tray.filter((t) => t.item === o.item).length;
    const wrongs = this.tray.filter((t) => t.item !== o.item);
    if (!this.tray.length) { void this.talk(null, ['bell_empty']); this.updateHint(false); return; }
    if (!wrongs.length && match === o.n) {
      this.phase = 'check';
      this.bellResolve?.();
      this.bellResolve = null;
      return;
    }
    o.tries++;
    this.phase = 'check';
    void (async () => {
      const a = o.actor;
      // khách nghiêng đầu nhìn khay rồi nhắc nhẹ (không phạt)
      a.setLook(0.25);
      if (a instanceof Cat) void a.once('no');
      let keys: string[];
      if (wrongs.length) {
        wrongs.forEach((w) => void tween(420, (k) => { w.mesh.rotation.z = Math.sin(k * Math.PI * 4) * 0.35 * (1 - k); }));
        keys = [ck('wrong', o.cust), keyName(wrongs[0].item), 'wrong_end'];
      } else if (match < o.n) keys = [ck('more', o.cust), keyQty(o.item, o.n - match), 'more_end'];
      else keys = [ck('over', o.cust), keyQty(o.item, o.n), 'over_end'];
      await this.talk(a, keys);
      a.setLook(0);
      if (this.order !== o) return;
      this.phase = 'order';
      this.updateHint(o.tries >= 2);
    })();
  }

  /** Tay chỉ vào việc nên làm tiếp. force = luôn hiện (đã nhắc ≥ 2 lần hoặc ngồi im). */
  private updateHint(force: boolean): void {
    const o = this.order;
    if (!o || !force) { if (!force) this.hand = null; if (!force) return; }
    if (!o) return;
    const match = this.tray.filter((t) => t.item === o.item).length;
    const wrong = this.tray.find((t) => t.item !== o.item);
    if (this.phase === 'coins') {
      const c = this.coins.find((x) => !x.counted);
      this.hand = c ? { kind: '3d', at: c.mesh.position.clone().add(new THREE.Vector3(0, 0.1, 0)) } : null;
      return;
    }
    if (wrong) this.hand = { kind: '3d', at: wrong.mesh.position.clone().add(new THREE.Vector3(0, 0.25, 0)) };
    else if (match < o.n) {
      const slot = this.shop.slots.find((s) => s.item === o.item);
      this.hand = slot ? { kind: '3d', at: slot.from.clone().add(new THREE.Vector3(0, 0.15, 0)) } : null;
    } else if (match > o.n) {
      const last = [...this.tray].reverse().find((t) => t.item === o.item);
      this.hand = last ? { kind: '3d', at: last.mesh.position.clone().add(new THREE.Vector3(0, 0.25, 0)) } : null;
    } else this.hand = { kind: 'el', el: els.bell };
  }

  // ------------------------------------------------------------------ thành công
  private async success(token: number, o: Order): Promise<void> {
    this.phase = 'busy';
    this.hand = null;
    els.bell.classList.remove('ready');
    els.bell.hidden = true;
    sfx('sfx_win', 0.55);
    chime('C6:0.5 E6:0.5 G6:0.5 C7:1.5', 240, 0.2);
    confetti(50);
    const a = o.actor;
    a.setLook(0);
    // món bay vào tay khách
    const hands = a.root.position.clone().add(new THREE.Vector3(0, o.cust.kind === 'cat' ? 0.35 : o.cust.height * 0.5, 0.35));
    void (a instanceof Human ? a.once('interact') : a.once('yes'));
    await Promise.all(this.tray.map((t, i) => new Promise<void>((res) => setTimeout(() => {
      const from = t.mesh.position.clone();
      const ctrl = from.clone().lerp(hands, 0.5).add(new THREE.Vector3(0, 0.8, 0));
      const curve = new THREE.QuadraticBezierCurve3(from, ctrl, hands);
      void tween(450, (k) => { t.mesh.position.copy(curve.getPoint(k)); t.mesh.scale.setScalar(1 - k * 0.8); }, easeInOutSine).then(() => {
        t.mesh.removeFromParent();
        this.magic.twinkle(hands, 0xffd36e, 4, 0.3, 0.2);
        res();
      });
    }, i * 90))));
    this.tray = [];
    els.order.hidden = true;
    this.alive(token);
    if (this.level.pay === 'count') await this.pay(token, o);
    if (this.level.fillAt.includes(o.index)) await this.fillBoard(token, o);
    await this.happy(token, o);
    await this.leave(token, o);
  }

  private async happy(token: number, o: Order): Promise<void> {
    const a = o.actor;
    a.faceCamera();
    const head = a.root.position.clone().add(new THREE.Vector3(0, o.cust.kind === 'cat' ? 0.6 : o.cust.height * 0.85, 0.2));
    this.magic.burst(head, 40, 0xff6fa5, 2.6, 0.32, 1.1, -2);
    this.magic.burst(head, 24, 0xffd36e, 2.2, 0.26, 1.0, -2);
    this.floatHearts(head);
    const jump = a instanceof Human ? Promise.all([a.once('wave'), a.hop(2, 0.32)]) : Promise.all([a.once('dance'), a.hop(2, 0.25)]);
    if (a instanceof Cat) sfx('cry_cat', 0.8);
    await Promise.all([jump, this.talk(a, [ck(Math.random() < 0.5 ? 'thanks1' : 'thanks2', o.cust)])]);
    this.alive(token);
    // ⭐ bay lên HUD
    const s = this.toScreen(head);
    await flyStar(s.x, s.y);
    this.progress.stars++;
    this.dayStars++;
    els.starsN.textContent = String(this.progress.stars);
    bumpEl(els.stars);
    chime('E6:0.5 A6:1', 260, 0.18);
    saveProgress(this.progress);
    // thỉnh thoảng người nhà cổ vũ (ảnh / emoji + giọng)
    if (o.index === 1 || o.index === 3) { await familyCheer(); this.alive(token); }
  }

  private floatHearts(at: THREE.Vector3): void {
    for (let i = 0; i < 6; i++) {
      const sp = emojiSprite(pick(['💖', '💕', '💗', '⭐']), 0.34);
      const start = at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.3, 0.2));
      sp.position.copy(start);
      this.scene.add(sp);
      const drift = (Math.random() - 0.5) * 0.6;
      setTimeout(() => void tween(1400, (k) => {
        sp.position.set(start.x + drift * k + Math.sin(k * 8) * 0.06, start.y + k * 1.4, start.z);
        sp.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      }).then(() => { sp.removeFromParent(); sp.material.dispose(); }), i * 120);
    }
  }

  private async leave(token: number, o: Order): Promise<void> {
    const a = o.actor;
    this.phase = 'busy';
    this.order = null;
    this.repeatFn = null;
    await Promise.all([a instanceof Human ? a.once('wave') : Promise.resolve(), this.talk(a, [ck('bye', o.cust)])]);
    this.alive(token);
    this.renderDayPips(this.dayIndex + 1);
    if (a instanceof Cat) {
      // mèo nhảy xuống, về chỗ (Mun: lên bậu cửa ngủ tiếp)
      void (async () => {
        await this.jumpTo(a, SPOT.counter.clone().add(new THREE.Vector3(0.6, 0, -0.3)), 0.5);
        a.showTag(false);
        if (a === this.mun) {
          await a.walkTo([new THREE.Vector3(SPOT.sill.x, 0, SPOT.sill.z + 0.8)], 0.9);
          await this.jumpTo(a, SPOT.sill, 0.6);
          a.face(0.5);
          a.setSleeping(true);
          this.munT = 20;
        }
        this.catBusy.delete(a);
      })();
      await wait(900);
      return;
    }
    // người: đi ra cửa, vẫy ở cửa rồi khuất
    const out = (async () => {
      await a.walkTo([new THREE.Vector3(-1.2, 0, -2.0), SPOT.inside.clone()], 1.25);
      void this.shop.openDoor(true);
      this.doorBell();
      a.face(0);
      await a.once('wave');
      await a.walkTo([SPOT.door.clone(), SPOT.outside.clone()], 1.3);
      void this.shop.openDoor(false);
      this.removeActor(a);
    })();
    // khách sau tới quầy ngay khi khách này rời quầy (không chờ ra khỏi cửa)
    await wait(1400);
    void out;
  }

  // ------------------------------------------------------------------ cấp 2: đếm xu
  private async pay(token: number, o: Order): Promise<void> {
    const a = o.actor;
    void (a instanceof Human ? a.once('interact') : a.once('yes'));
    await this.talk(a, [ck('pay', o.cust)]);
    this.alive(token);
    // xu ngôi sao rơi xuống khay, đứng thẳng quay mặt ra Nhím
    const n = o.n;
    const src = a.root.position.clone().add(new THREE.Vector3(0, o.cust.kind === 'cat' ? 0.4 : o.cust.height * 0.55, 0.4));
    this.coins = [];
    for (let i = 0; i < n; i++) {
      const c = this.makeCoin();
      const to = this.trayPos(i, n).add(new THREE.Vector3(0, 0.22, 0));
      c.mesh.position.copy(src);
      this.scene.add(c.mesh);
      this.coins.push(c);
      const ctrl = src.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 0.9, 0));
      const curve = new THREE.QuadraticBezierCurve3(src.clone(), ctrl, to);
      void tween(480, (k) => { c.mesh.position.copy(curve.getPoint(k)); c.mesh.rotation.y = (1 - k) * 6; }, easeInOutSine).then(() => chime('A6:0.3', 300, 0.1));
      await wait(130);
    }
    await wait(450);
    this.alive(token);
    this.phase = 'coins';
    this.repeatFn = () => void this.talk(null, ['coin_intro']);
    this.lastTap = performance.now();
    await this.talk(null, [keyEach(o.item.cls), 'coin_intro']);
    this.alive(token);
    if (this.auto) void this.autoCoins(token);
    await new Promise<void>((res) => { this.coinsDone = res; if (this.coins.every((c) => c.counted)) res(); });
    this.coinsDone = null;
    this.alive(token);
    // chọn số xu
    this.phase = 'choose';
    this.hand = null;
    const opts = new Set<number>([n]);
    while (opts.size < 3) { const d = n + Math.floor(Math.random() * 5) - 2; if (d >= 1 && d <= 10) opts.add(d); }
    showPanel(true);
    els.panelEmoji.textContent = '⭐';
    els.panelEmoji.hidden = false;
    els.panelWord.textContent = '= ?';
    els.panelWord.classList.remove('whole');
    els.panelWord.hidden = false;
    const list = shuffle([...opts]).map((v) => ({ label: String(v), value: String(v), audio: keyNum(v) }));
    await this.pickLoop(token, list, String(n), ['coin_ask']);
    this.alive(token);
    await this.talk(null, ['right', keyXu(n)]);
    showPanel(false);
    this.alive(token);
  }

  private coinsDone: (() => void) | null = null;
  /** nút đáp án đang hiện (tự chơi bấm hộ) */
  private buttons: HTMLButtonElement[] = [];

  private makeCoin(): Coin {
    const g = new THREE.Group();
    const geo = new THREE.CylinderGeometry(0.21, 0.21, 0.05, 32);
    geo.rotateX(Math.PI / 2);
    const gold = new THREE.MeshStandardMaterial({ color: 0xffc233, roughness: 0.35, metalness: 0, emissive: 0x7a4a00, emissiveIntensity: 0.25 });
    const body = new THREE.Mesh(geo, gold);
    body.castShadow = true;
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), new THREE.MeshBasicMaterial({ map: emojiTexture('⭐'), transparent: true }));
    face.position.z = 0.027;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 32), new THREE.MeshStandardMaterial({ color: 0xffe08a, roughness: 0.3 }));
    rim.position.z = 0.02;
    g.add(body, face, rim);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.62, 0.4), new THREE.MeshBasicMaterial({ visible: false }));
    g.add(hit);
    return { mesh: g, hit, counted: false };
  }

  private async tapCoin(c: Coin): Promise<void> {
    if (c.counted || this.phase !== 'coins') return;
    c.counted = true;
    this.hand = null;
    const k = this.coins.filter((x) => x.counted).length;
    sfx('sfx_tap', 0.4);
    chime(['C6', 'D6', 'E6', 'F6', 'G6', 'A6', 'B6', 'C7', 'D7', 'E7'][Math.min(k, 10) - 1] + ':0.6', 300, 0.16);
    void play(keyNum(Math.min(k, 10)));
    const from = c.mesh.position.clone();
    const jar = SPOT.jar.clone().add(new THREE.Vector3(0, 0.6, 0));
    const ctrl = from.clone().lerp(jar, 0.5).add(new THREE.Vector3(0, 1.0, 0));
    const curve = new THREE.QuadraticBezierCurve3(from, ctrl, jar);
    await tween(460, (t) => { c.mesh.position.copy(curve.getPoint(t)); c.mesh.rotation.y = t * 8; }, easeInOutSine);
    // rơi vào hũ, nằm chồng lên nhau
    const slotY = 0.07 + Math.min(this.jarCount, 11) * 0.035;
    this.jarCount++;
    const inJar = SPOT.jar.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.14, slotY, (Math.random() - 0.5) * 0.14));
    const top = c.mesh.position.clone();
    await tween(240, (t) => { c.mesh.position.lerpVectors(top, inJar, t); c.mesh.rotation.x = -Math.PI / 2 * t; c.mesh.scale.setScalar(1 - t * 0.35); }, easeOutQuad);
    c.mesh.userData.jar = true;
    this.magic.twinkle(jar, 0xffd36e, 5, 0.3, 0.18);
    bumpEl(els.stars);
    if (this.coins.every((x) => x.counted)) { this.coins = []; setTimeout(() => this.coinsDone?.(), 350); }
  }

  private clearJar(): void {
    const drop: THREE.Object3D[] = [];
    this.scene.traverse((o) => { if (o.userData.jar) drop.push(o); });
    drop.forEach((o) => o.removeFromParent());
  }

  /** Chọn đáp án: sai lần 1 bỏ nút + nhắc, sai lần 2 nút đúng nhấp nháy. Ngồi im 10 s: hỏi lại. */
  private pickLoop(token: number, items: { label: string; value: string; audio?: string }[], target: string, askKeys: string[]): Promise<void> {
    let wrong = 0, busy = false, solved = false;
    const ask = () => void this.talk(null, askKeys);
    this.repeatFn = ask;
    return new Promise((resolve) => {
      let idle = 0;
      const kick = () => { clearTimeout(idle); idle = window.setTimeout(() => { if (solved || token !== this.run) return; ask(); buttons.forEach((b) => { if (!b.classList.contains('gone')) wobbleEl(b); }); kick(); }, IDLE_MS); };
      const buttons = showOptions(items, async (value, btn) => {
        if (solved || token !== this.run) return;
        kick();
        if (value !== target) {
          if (busy) return;
          busy = true;
          wrong++;
          sfx('sfx_soft', 0.5);
          wobbleEl(btn);
          btn.classList.add('gone');
          const said = items.find((it) => it.value === value)?.audio;
          if (wrong === 1) await this.talk(null, [...(said ? [said] : []), 'retry', ...askKeys]);
          else {
            buttons.find((b) => b.dataset.value === target)?.classList.add('hint');
            await this.talk(null, [...(said ? [said] : []), 'hint_last']);
          }
          busy = false;
          return;
        }
        solved = true;
        clearTimeout(idle);
        stopSpeech();
        buttons.forEach((b) => { b.classList.remove('hint'); if (b !== btn) b.classList.add('gone'); });
        btn.classList.add('correct');
        sfx('sfx_win', 0.5);
        await wait(450);
        resolve();
      });
      this.buttons = buttons;
      kick();
      ask();
    });
  }

  // ------------------------------------------------------------------ cấp 2: điền chữ thiếu trên bảng giá (A2)
  private async fillBoard(token: number, o: Order): Promise<void> {
    this.phase = 'fill';
    const w = wordInfo(o.item);
    const chars = Array.from(w.word);
    const correct = chars[o.item.fill.index];
    // bảng phấn 3D cũng mất chữ
    this.shop.drawBoard({ emoji: o.item.emoji, word: chars.map((c, i) => (i === o.item.fill.index ? '_' : c)).join('') });
    showPanel(true, true);
    els.panelEmoji.textContent = o.item.emoji;
    els.panelEmoji.hidden = false;
    renderWord(els.panelWord, w.word, [], false, o.item.fill.index);
    els.panelWord.hidden = false;
    els.panelPrice.textContent = '1 ⭐';
    els.panelPrice.hidden = false;
    const letters = shuffle([correct, ...o.item.fill.distractors]);
    const items = letters.map((l) => ({ label: l, value: l, audio: w.fillLetterKeys[l] ?? letterAudio(l)?.[0] }));
    await this.talk(null, ['fill_intro']);
    this.alive(token);
    if (this.auto) void this.autoPick(token, correct);
    await this.pickLoop(token, items, correct, [w.nameKey, 'fill_ask']);
    this.alive(token);
    els.options.innerHTML = '';
    // đánh vần cả từ, chữ sáng theo giọng
    renderWord(els.panelWord, w.word, [o.item.fill.index]);
    this.shop.drawBoard({ emoji: o.item.emoji, word: w.word });
    this.magic.burst(this.shop.board.position.clone().add(new THREE.Vector3(0, 0, 0.3)), 30, 0xffd36e, 2, 0.26, 0.9, -1.5);
    await this.talk(null, ['right']);
    this.speaking = true;
    await speakSequence(w.tokens.map((t) => t.audio), (i) => renderWord(els.panelWord, w.word, w.tokens[i].lit), 200);
    this.speaking = false;
    renderWord(els.panelWord, w.word, chars.map((_, i) => i), true);
    await wait(700);
    showPanel(false);
    this.alive(token);
  }

  // ------------------------------------------------------------------ cuối ngày
  private async endDay(token: number): Promise<void> {
    this.phase = 'end';
    this.renderDayPips(this.visits.length);
    this.repeatFn = null;
    this.shop.closedSign.visible = true;
    const lvl = String(this.level.id);
    this.progress.days[lvl] = (this.progress.days[lvl] ?? 0) + 1;
    const before = this.progress.decor;
    const unlocked = DECOR.filter((d) => this.progress.stars >= d.stars).length;
    saveProgress(this.progress);
    await wait(900);
    this.alive(token);
    // bảng tổng kết
    els.dayendFaces.innerHTML = this.visits.map((v) => `<span>${v.cust.emoji}</span>`).join('');
    els.dayendStars.innerHTML = '';
    els.dayendNext.innerHTML = '';
    els.btnLevel2.hidden = !(this.level.id === 1 && level2Unlocked(this.progress));
    els.dayendActions.hidden = true;
    els.dayend.classList.remove('hide');
    void musicBox('C5:0.5 E5:0.5 G5:0.5 E5:0.5 G5:0.5 C6:1 -:0.5 A5:0.5 C6:0.5 E6:1.5', 190, 0.16);
    const sayDone = this.talk(null, ['day_end']);
    for (let i = 0; i < this.dayStars; i++) {
      await wait(380);
      const s = document.createElement('i');
      s.textContent = '⭐';
      els.dayendStars.appendChild(s);
      chime(['C6', 'D6', 'E6', 'G6', 'A6', 'C7'][i % 6] + ':0.6', 280, 0.14);
    }
    await sayDone;
    this.alive(token);
    confetti(80);
    await familyCheerAll(() => token === this.run);
    this.alive(token);
    // mở nấc trang trí mới: ẩn bảng để bé thấy tiệm đổi
    if (unlocked > before) {
      for (let i = before; i < unlocked; i++) {
        els.dayend.classList.add('hide');
        await wait(500);
        const d = DECOR[i];
        const center = await this.shop.showDecor(d.id, true);
        this.magic.burst(center, 60, 0xff6fa5, 3, 0.34, 1.2, -1.5);
        this.magic.burst(center, 40, 0xffd36e, 2.6, 0.3, 1.1, -1.5);
        toast(`${d.emoji} Tiệm mới!`, 2200);
        confetti(60);
        await this.talk(null, [d.audio]);
        this.alive(token);
        await wait(900);
      }
      this.progress.decor = unlocked;
      saveProgress(this.progress);
      els.dayend.classList.remove('hide');
    }
    const next = DECOR.find((d) => this.progress.stars < d.stars);
    if (next) els.dayendNext.innerHTML = `<b>${next.emoji}</b> còn ${next.stars - this.progress.stars} ⭐`;
    els.dayendActions.hidden = false;
    if (this.auto) return;
    if (next) { await this.talk(null, ['decor_next']); }
  }

  /** Về màn đầu: dừng mọi thứ, dọn khách / khay / xu. */
  stopDay(): void {
    this.run++;
    stopSpeech();
    finishAllTweens();
    // nhả các chờ đang treo: luồng cũ chạy tiếp tới alive() rồi thoát (token đã đổi)
    const pending = [this.bellResolve, this.coinsDone];
    this.bellResolve = null;
    this.coinsDone = null;
    pending.forEach((r) => r?.());
    this.phase = 'menu';
    this.order = null;
    this.hand = null;
    this.repeatFn = null;
    for (const t of this.tray) t.mesh.removeFromParent();
    this.tray = [];
    for (const c of this.coins) c.mesh.removeFromParent();
    this.coins = [];
    for (const a of [...this.actors]) if (a instanceof Human) this.removeActor(a);
    this.waiting = null;
    this.waitingFor = null;
    for (const cat of [this.mun, this.rom]) {
      if (!cat) continue;
      this.catBusy.delete(cat);
      cat.showTag(false);
    }
    if (this.mun) { this.mun.setPos(SPOT.sill); this.mun.setSleeping(true); }
    if (this.rom && this.rom.root.position.y > 0.1) this.rom.setPos(new THREE.Vector3(2.4, 0, -3.0));
    els.order.hidden = true;
    els.bell.hidden = true;
    els.hud.hidden = true;
    showPanel(false);
    clearFamily();
    els.dayend.classList.add('hide');
    void this.shop.openDoor(false);
  }

  // ------------------------------------------------------------------ tự chơi (?auto=1): soát luồng / chụp màn
  private async autoOrder(token: number, o: Order): Promise<void> {
    const slotOf = (it: ItemDef) => this.shop.slots.findIndex((s) => s.item === it);
    const step = 650;
    const tapN = async (it: ItemDef, n: number) => { for (let i = 0; i < n; i++) { await wait(step); if (token !== this.run || this.order !== o) return; this.tapSlot(slotOf(it)); } };
    const ring = async () => { await wait(900); this.onBell(); while (this.phase === 'check' && this.order === o) await wait(200); };
    if (o.index === 0) {
      // khách đầu: thử đủ đường sai (nhầm món → thiếu → dư) để soát lời nhắc
      const other = this.shop.slots.find((s) => s.item !== o.item)!.item;
      await tapN(other, 1); await ring();
      await wait(600); const w = this.tray.find((t) => t.item !== o.item); if (w) this.removeTrayItem(w);
      await tapN(o.item, Math.max(0, o.n - 1)); await ring();
      await tapN(o.item, 2); await ring();
      await wait(600); const last = [...this.tray].reverse()[0]; if (last) this.removeTrayItem(last);
      await wait(600);
    } else await tapN(o.item, o.n);
    if (token === this.run && this.order === o) await ring();
  }
  private async autoCoins(token: number): Promise<void> {
    while (token === this.run && this.phase === 'coins') {
      await wait(700);
      const c = this.coins.find((x) => !x.counted);
      if (!c) break;
      void this.tapCoin(c);
    }
    if (token !== this.run) return;
    await wait(1600);
    const btns = this.buttons;
    const target = String(this.order?.n ?? 0);
    const wrong = btns.find((b) => b.dataset.value !== target);
    if (this.order?.index === 0 && wrong) { wrong.click(); await wait(3500); }
    btns.find((b) => b.dataset.value === target)?.click();
  }
  private async autoPick(token: number, correct: string): Promise<void> {
    await wait(2500);
    if (token !== this.run) return;
    const btns = this.buttons;
    const wrong = btns.find((b) => b.dataset.value !== correct);
    if (wrong) { wrong.click(); await wait(3500); }
    btns.find((b) => b.dataset.value === correct)?.click();
  }
}

