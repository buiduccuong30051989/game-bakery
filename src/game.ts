// Luồng chơi: 1 ngày = 6 khách (4 người nhà + 1 bạn + 1 mèo), bài cộng / trừ xen kẽ trên hàng thật của kệ, giữa ngày 1 lần nhập hàng.
// Bài cộng: khách vào cửa (chuông) → tới quầy,
// vẫy, gọi 2 phần ("3 quả táo và 2 quả táo nữa" / "2 cái bánh và 3 cây kem") → thẻ gọi món là phép cộng bằng hình
// (🍎🍎🍎 + 🍎🍎 = ?) → Nhím chạm món trên kệ, món bay vào 2 ngăn khay → 2 ngăn trượt lại gần → chọn tổng (3 số)
// → 🛎️ giao → khách nói cả câu "Ba cộng hai bằng năm!" → cấp 2: trả xu cũng là phép cộng (giá túi 1 + giá túi 2)
// + có khi điền chữ thiếu trên bảng giá (A2) → vui (nhảy, tim, ⭐) → chào, ra về.
// Không có thua: chọn sai tổng thì món trên khay tự đếm 1..N cho bé thấy; ngồi im 10 s khách nhắc + tay chỉ đúng chỗ.
import * as THREE from 'three';
import { Shop, SPOT, COUNTER_Y, TRAY_STEP } from './shop.ts';
import { Cat, type Actor, yawTo } from './actors.ts';
import { makeActor, EGActor } from './eg.ts';
import { Magic } from './magic.ts';
import { tween, updateTweens, wait, easeOutQuad, easeInOutSine, finishAllTweens } from './tween.ts';
import { play, sfx, speakSequence, stopSpeech, chime, musicBox, preload } from './audio.ts';
import { familyCheer, familyCheerAll, clearFamily, FAMILY_KEYS } from './family.ts';
import { prefetch, emojiSprite, emojiTexture } from './assets.ts';
import { els, renderWord, wobbleEl, bumpEl, toast, confetti, flyStar, showOptions, showPanel, pointAt } from './ui.ts';
import { ITEMS, CUSTOMERS, NHIM, LEVELS, DECOR, DAY_SIZE, itemByWord, type ItemDef, type CustomerDef, type LevelDef } from './data.ts';
import { keyName, keyQty, keyNum, keyXu, keyWord, wordInfo, ck } from './lines.ts';
import { letterAudio } from './spell.ts';
import { type Progress, saveProgress, level2Unlocked, PARAM } from './progress.ts';

const IDLE_MS = 10000;
const shuffle = <T>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

interface TrayItem { item: ItemDef; mesh: THREE.Group; hit: THREE.Mesh; busy: boolean; zone: 0 | 1 }
interface Coin { mesh: THREE.Group; zone: 0 | 1 }
/** 1 phần của đơn: món + số lượng */
interface Part { item: ItemDef; n: number }
/** add: khách mua a + b; sub: kệ có N (parts[0]), khách mua k (parts[1]) → còn lại mấy; restock: kệ còn a, bạn mang thêm b */
type RoundKind = 'add' | 'sub' | 'restock';
interface Visit { cust: CustomerDef; kind: RoundKind; parts: [Part, Part]; /** cấp 2: giá túi 1, túi 2 (xu) */ price: [number, number] }
interface Order extends Visit { actor: Actor; tries: number; wrongTaps: number; index: number; /** sub: đã đưa mấy món */ given: number }
/** order = đang lấy món; sum = chọn tổng; bell = chờ bấm chuông; pay = cộng xu; fill = bảng giá A2 */
type Phase = 'menu' | 'enter' | 'order' | 'give' | 'sum' | 'bell' | 'check' | 'pay' | 'fill' | 'busy' | 'end';
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
  /** Nhím (Twilight) đứng quầy */
  nhim: EGActor | null = null;
  /** dấu + giữa 2 ngăn khay */
  private plusSign!: THREE.Sprite;
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
  /** nút đáp án đang hiện (tự chơi bấm hộ) */
  private buttons: HTMLButtonElement[] = [];
  /** ô kệ đã nhận chạm (soát độ chính xác chạm, scripts/tap-matrix) */
  readonly tapLog: number[] = [];
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
    // chỉ tải trước mèo + Nhím + món ăn; khách của ngày tải ở startDay (mỗi model EG ~5 MB)
    await prefetch(['cat.glb', NHIM.model, ...ITEMS.map((i) => i.model)]);
    const nhim = await makeActor(NHIM) as EGActor;
    nhim.setPos(new THREE.Vector3(2.22, 0, 0.78));
    nhim.yaw = nhim.targetYaw = -0.45;
    this.addActor(nhim);
    this.nhim = nhim;
    this.addApron(nhim);
    this.plusSign = emojiSprite('➕', 0.36);
    this.plusSign.position.set(SPOT.tray.x, COUNTER_Y + 0.22, SPOT.tray.z + 0.42);
    this.plusSign.visible = false;
    this.scene.add(this.plusSign);
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
    // chuông 🛎️ đứng ở đầu trái quầy (đầu phải là chỗ Nhím đứng) (theo khung hình, mọi tỉ lệ màn)
    if (!els.bell.hidden) {
      const b = this.toScreen(new THREE.Vector3(-2.7, COUNTER_Y + 0.45, 0.2));
      const bw = els.bell.offsetWidth;
      const bx = Math.max(14, b.x - bw / 2);
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
    els.say.addEventListener('click', () => this.repeatFn?.());
  }

  onTap(ndc: THREE.Vector2): void {
    this.ray.setFromCamera(ndc, this.camera);
    const px = { x: (ndc.x * 0.5 + 0.5) * window.innerWidth, y: (-ndc.y * 0.5 + 0.5) * window.innerHeight };
    // chạm món trên khay / đĩa: chọn theo TOẠ ĐỘ MÀN HÌNH (không raycast vào món nhỏ, hộp chạm không che nhau)
    // đĩa kệ ở tiền cảnh che mép dưới khay → điểm nằm trong hình đĩa thì ưu tiên đĩa
    const inSlot = this.phase === 'order' ? this.pickSlot(px, true) : -1;
    if (inSlot >= 0) { this.tapSlot(inSlot); return; }
    if (this.trayTappable()) {
      const ti = this.pickTray(px);
      if (ti) { this.tapTrayItem(ti); return; }
    }
    if (this.phase === 'order') {
      const si = this.pickSlot(px);
      if (si >= 0) { this.tapSlot(si); return; }
    }
    // chạm nhân vật: khách cười, mèo kêu
    const people = [...this.actors];
    const ph = this.ray.intersectObjects(people.map((a) => a.body), true)[0];
    if (ph) {
      const a = people.find((x) => { let o: THREE.Object3D | null = ph.object; while (o) { if (o === x.body) return true; o = o.parent; } return false; });
      if (a) this.tapActor(a);
    }
  }

  /** Ô kệ dưới điểm chạm: hình chữ nhật màn hình của từng đĩa (chiếu hộp đĩa + món); trùng thì lấy tâm gần nhất;
   *  trượt ra ngoài một chút thì lấy đĩa gần nhất trong bán kính ~nửa đĩa. */
  pickSlot(p: { x: number; y: number }, strict = false): number {
    let best = -1, bestD = Infinity, near = -1, nearD = Infinity;
    this.shop.slots.forEach((s, i) => {
      const r = this.slotRect(i);
      const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
      const d = Math.hypot(p.x - cx, p.y - cy);
      const inside = p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
      if (inside && d < bestD) { best = i; bestD = d; }
      if (d < nearD && d < (r.x1 - r.x0) * 0.75) { near = i; nearD = d; }
    });
    return best >= 0 || strict ? best : near;
  }
  /** Hình chữ nhật màn hình của 1 đĩa (đĩa + chồng món phía trên), co 2% để 2 đĩa kề nhau không chồng lên. */
  slotRect(i: number): { x0: number; y0: number; x1: number; y1: number } {
    const s = this.shop.slots[i];
    const c = s.root.position;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const dx of [-0.46, 0.46]) for (const dy of [0, 0.62]) for (const dz of [-0.36, 0.36]) {
      const q = this.toScreen(new THREE.Vector3(c.x + dx, c.y + dy, c.z + dz));
      x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
    }
    const shrinkX = (x1 - x0) * 0.02;
    return { x0: x0 + shrinkX, x1: x1 - shrinkX, y0, y1 };
  }
  /** Món trên khay gần điểm chạm nhất (≤ ~1 bề rộng món). */
  private pickTray(p: { x: number; y: number }): TrayItem | null {
    let best: TrayItem | null = null, bestD = Infinity;
    for (const t of this.tray) {
      if (t.busy) continue;
      const c = this.toScreen(t.mesh.position.clone().add(new THREE.Vector3(0, 0.18, 0)));
      const edge = this.toScreen(t.mesh.position.clone().add(new THREE.Vector3(0.3, 0.18, 0)));
      const r = Math.max(60, Math.abs(edge.x - c.x));
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < r && d < bestD) { best = t; bestD = d; }
    }
    return best;
  }
  private trayTappable(): boolean { return this.phase === 'order' || this.phase === 'give'; }
  private tapTrayItem(t: TrayItem): void {
    if (this.phase === 'give') this.giveItem(t);
    else this.removeTrayItem(t);
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
    if (a === this.nhim) { if (!this.speaking) { void a.once('cheer'); void a.hop(1, 0.2); } return; }
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
    if (!['order', 'bell', 'give'].includes(this.phase)) return;
    if (performance.now() - this.lastTap < IDLE_MS) return;
    this.lastTap = performance.now();
    const o = this.order;
    if (!o) return;
    if (this.phase === 'bell') void this.talk(null, ['bell_hint']);
    else if (this.phase === 'give') void this.talk(o.actor, [ck('remind', o.cust), keyQty(o.parts[0].item, o.parts[1].n), 'give_hint']);
    else if (!this.tray.length && o.index === 0) { void o.actor.once('wave'); void this.talk(o.actor, [...this.orderKeys(o, 'remind'), 'tap_shelf']); }
    else this.repeatOrder();
    this.updateHint(true);
  }

  // ------------------------------------------------------------------ ngày
  async startDay(levelId: number, again = false): Promise<void> {
    const token = ++this.run;
    this.level = LEVELS.find((l) => l.id === levelId && l.enabled) ?? LEVELS[0];
    this.planDay();
    this.dayIndex = 0;
    this.dayStars = 0;
    this.restockedToday = false;
    this.jarCount = 0;
    this.clearJar();
    this.shop.closedSign.visible = false;
    els.hud.hidden = false;
    els.starsN.textContent = String(this.progress.stars);
    this.renderDayPips();
    // kệ 8 đĩa: mỗi khách có ít nhất 1–2 món mình thích, còn lại món ngẫu nhiên; hàng ban đầu theo cấp
    const shelf: ItemDef[] = [];
    for (let round = 0; round < 2; round++) {
      for (const v of this.visits) {
        const w = v.cust.likes.map(itemByWord).find((it) => !shelf.includes(it));
        if (w && shelf.length < this.level.shelf) shelf.push(w);
      }
    }
    shelf.push(...shuffle(ITEMS.filter((i) => !shelf.includes(i))).slice(0, this.level.shelf - shelf.length));
    const cap = this.level.sum[1];
    const ordered = shuffle(shelf);
    await this.shop.setShelf(ordered, ordered.map(() => (cap <= 5 ? 3 + Math.floor(Math.random() * 3) : 5 + Math.floor(Math.random() * 6))));
    this.shop.drawBoard(null, shelf);
    void prefetch([...new Set(this.visits.map((v) => v.cust.model))]);
    // tải trước tiếng (sau chạm đầu tiên: tạo AudioContext trước cử chỉ thì Chrome/iPad cảnh báo)
    void preload(['sfx_pop', 'sfx_soft', 'sfx_tap', 'sfx_win', 'cry_cat', 'right', 'retry', 'hint_last', 'cong', 'bang', 'bang_may', 'va', 'nua', 'count_hint', 'du_roi', 'dau_ne', 'tru', 'ke_co', 'ke_con', 'con_lai_may', 'bay_gio_may', 'give_hint', ...FAMILY_KEYS]);
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
        // nhập hàng giữa ngày (hoặc khi kệ không đủ hàng cho khách này)
        const v = this.visits[this.dayIndex];
        if (!this.planVisit(v) || (this.dayIndex === 3 && !this.restockedToday && !PARAM.day) || (this.dayIndex === 0 && PARAM.restock && !this.restockedToday)) {
          await this.restock(token, v);
          this.alive(token);
          this.planVisit(v);
        }
        await this.serve(token, this.dayIndex);
        this.alive(token);
      }
      await this.endDay(token);
    } catch (e) {
      if (!(e instanceof Aborted)) throw e;
    }
  }

  /** Chọn khách + đơn cho ngày: 4 người nhà + 1 bạn xáo trộn + 1 mèo chen giữa. */
  private planDay(): void {
    const family = shuffle(CUSTOMERS.filter((c) => c.kind === 'eg' && !c.friend));
    const friend = pick(CUSTOMERS.filter((c) => c.friend));
    const cat = pick(CUSTOMERS.filter((c) => c.kind === 'cat'));
    let queue: CustomerDef[] = shuffle([...family.slice(0, DAY_SIZE - 2), friend]);
    queue.splice(2 + Math.floor(Math.random() * (queue.length - 1)), 0, cat);
    const forced = PARAM.customer ? CUSTOMERS.find((c) => c.id === PARAM.customer) : undefined;
    if (forced) queue = [forced, ...queue.filter((c) => c.id !== forced.id && (forced.kind !== 'cat' || c.kind !== 'cat'))].slice(0, DAY_SIZE);
    if (PARAM.day) queue = queue.slice(0, PARAM.day);
    // xen kẽ cộng / trừ (bắt đầu ngẫu nhiên); số cụ thể chọn lúc khách tới theo hàng còn trên kệ (planVisit)
    const first: RoundKind = PARAM.round === 'sub' ? 'sub' : PARAM.round === 'add' ? 'add' : Math.random() < 0.5 ? 'add' : 'sub';
    this.visits = queue.map((cust, i) => ({ cust, kind: i % 2 === 0 ? first : first === 'add' ? 'sub' : 'add', parts: [{ item: ITEMS[0], n: 1 }, { item: ITEMS[0], n: 1 }], price: [1, 1] }));
  }

  private restockedToday = false;
  private lastPair = '';

  /** Chọn món + số cho khách theo hàng đang có. false = kệ không đủ hàng (cần nhập hàng trước). */
  private planVisit(v: Visit): boolean {
    const L = this.level;
    const rnd = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
    const liked = (it: ItemDef) => v.cust.likes.includes(it.word);
    const slots = shuffle(this.shop.slots).sort((a, b) => Number(liked(b.item)) - Number(liked(a.item)));
    const first = this.dayIndex === 0;
    if (v.kind === 'sub') {
      // kệ có N (đúng số trên đĩa), khách mua k < N
      const s = slots.find((x) => x.stock >= 2 && (!first || !PARAM.a || x.stock >= PARAM.a));
      if (!s) return false;
      const N = first && PARAM.a ? PARAM.a : s.stock;
      let k = rnd(N >= 4 ? 2 : 1, Math.min(N - 1, L.id === 1 ? 3 : 5));
      if (first && PARAM.b && PARAM.b < N) k = PARAM.b;
      v.parts = [{ item: s.item, n: N }, { item: s.item, n: k }];
      if (N !== s.stock) this.shop.setStock(s, N, false);
      return true;
    }
    let a = 1, b = 1, i0: ItemDef, i1: ItemDef;
    if (L.kinds === 1) {
      const s = slots.find((x) => x.stock >= 2);
      if (!s) return false;
      const max = Math.min(L.sum[1], s.stock);
      for (let t = 0; t < 20; t++) {
        const sum = rnd(Math.min(max, Math.max(L.sum[0], 2)), max);
        b = rnd(L.b[0], Math.min(L.b[1], sum - 1));
        a = sum - b;
        if (`${a}+${b}` !== this.lastPair) break;
      }
      i0 = i1 = s.item;
    } else {
      const s0 = slots.find((x) => x.stock >= 1);
      const s1 = slots.find((x) => x.stock >= 1 && x !== s0);
      if (!s0 || !s1) return false;
      for (let t = 0; t < 20; t++) {
        a = rnd(1, Math.min(5, s0.stock));
        b = rnd(1, Math.min(5, s1.stock, L.sum[1] - a));
        if (a + b >= Math.min(L.sum[0], s0.stock + s1.stock) && `${a}+${b}` !== this.lastPair) break;
      }
      i0 = s0.item; i1 = s1.item;
    }
    if (first && PARAM.a) a = PARAM.a;
    if (first && PARAM.b) b = PARAM.b;
    // ép số (debug) vượt hàng: bổ sung hàng cho đủ
    for (const [it, n] of [[i0, a + (i1 === i0 ? b : 0)], [i1, b]] as const) {
      const s = this.shop.slots.find((x) => x.item === it)!;
      if (s.stock < n) this.shop.setStock(s, n, false);
    }
    this.lastPair = `${a}+${b}`;
    let p: [number, number] = [1, 1];
    for (let t = 0; t < 20; t++) { p = [rnd(1, 5), rnd(1, 5)]; if (p[0] + p[1] <= 10 && (p[0] !== a || p[1] !== b)) break; }
    v.parts = [{ item: i0, n: a }, { item: i1, n: b }];
    v.price = p;
    return true;
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
  /** Câu gọi món: [mở đầu] + "ba quả táo" + "và" + "hai quả táo" + ("nữa" khi cùng món). */
  private orderKeys(o: Visit, lead: 'greet1' | 'greet2' | 'remind'): string[] {
    const [p0, p1] = o.parts;
    return [ck(lead, o.cust), keyQty(p0.item, p0.n), 'va', keyQty(p1.item, p1.n), ...(p0.item === p1.item ? ['nua'] : [])];
  }
  private sumKeys(o: Visit): string[] { return [keyNum(o.parts[0].n), o.kind === 'sub' ? 'tru' : 'cong', keyNum(o.parts[1].n), 'bang_may']; }
  private answer(o: Visit): number { return o.kind === 'sub' ? o.parts[0].n - o.parts[1].n : o.parts[0].n + o.parts[1].n; }

  private async serve(token: number, index: number): Promise<void> {
    const v = this.visits[index];
    this.phase = 'enter';
    this.repeatFn = null;
    const actor = await this.bringToCounter(token, v);
    this.alive(token);
    const o: Order = { ...v, actor, tries: 0, wrongTaps: 0, index, given: 0 };
    this.order = o;
    actor.faceCamera();
    this.nhim?.face(-0.9);
    void this.nhim?.once('wave');
    const wave = actor.once(actor instanceof Cat ? 'yes' : 'wave');
    if (actor instanceof Cat) sfx('cry_cat', 0.8);
    await wait(250);
    // khách sau bước vào chờ (không chờ mèo – mèo đã ở trong tiệm)
    const next = this.visits[index + 1];
    if (next && next.cust.kind === 'eg') setTimeout(() => { if (token === this.run && this.order?.index === index) this.preEnter(token, next); }, 6500);
    if (o.kind === 'sub') {
      // "Kệ có bảy quả táo" – N món từ đĩa bày ra khay; khách "mua ba quả táo"
      const [whole, buy] = o.parts;
      const slot = this.shop.slots.find((x) => x.item === whole.item)!;
      this.showSubCard(o);
      this.repeatFn = () => this.repeatOrder();
      const lay = this.layOut(slot, whole.n);
      await Promise.all([wave, this.talk(null, ['ke_co', keyQty(whole.item, whole.n)]), lay]);
      this.alive(token);
      await this.talk(actor, [ck('buy', o.cust), keyQty(buy.item, buy.n)]);
      this.alive(token);
      this.phase = 'give';
      this.refreshCard();
      this.lastTap = performance.now();
      if (!this.subIntroDone) { this.subIntroDone = true; await this.talk(null, ['give_hint']); this.alive(token); }
      this.nhim?.face(-0.45);
      if (this.auto) void this.autoGive(token, o);
    } else {
      this.showOrder(o);
      this.phase = 'order';
      this.lastTap = performance.now();
      this.repeatFn = () => this.repeatOrder();
      await Promise.all([wave, this.talk(actor, this.orderKeys(o, Math.random() < 0.5 ? 'greet1' : 'greet2'))]);
      this.alive(token);
      if (this.phase === 'order' && !this.tray.length) await this.talk(null, this.sumKeys(o));
      this.alive(token);
      this.nhim?.face(-0.45);
      if (this.auto) void this.autoOrder(token, o);
    }
    // chờ: đủ món → chọn kết quả đúng → bấm chuông
    await new Promise<void>((res) => { this.bellResolve = res; });
    this.alive(token);
    await this.success(token, o);
  }
  private subIntroDone = false;

  // ------------------------------------------------------------------ nhập hàng (phép cộng): bạn mang thùng hàng tới
  /** Kệ còn a món, bạn mang thêm b → bây giờ có mấy? (không tính vào 6 khách, không ⭐) */
  private async restock(token: number, nextVisit: Visit): Promise<void> {
    this.restockedToday = true;
    const L = this.level;
    const cap = L.sum[1];
    const rnd = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
    // đĩa: món khách sau thích, còn ≥ 1 và còn chỗ; không có thì đĩa vơi nhất
    const cand = shuffle(this.shop.slots.filter((x) => x.stock >= 1 && x.stock < cap))
      .sort((a, b) => Number(nextVisit.cust.likes.includes(b.item.word)) - Number(nextVisit.cust.likes.includes(a.item.word)) || a.stock - b.stock);
    let slot = cand[0];
    if (!slot) { slot = this.shop.slots.reduce((m, x) => (x.stock < m.stock ? x : m)); this.shop.setStock(slot, 1, false); }
    const a = Math.min(slot.stock, 5);
    if (slot.stock !== a) this.shop.setStock(slot, a, false);
    const b = rnd(1, Math.min(5, cap - a, L.b[1]));
    const inQueue = new Set(this.visits.map((v) => v.cust.id));
    const supplier = pick(CUSTOMERS.filter((c) => c.friend && !inQueue.has(c.id))) ?? pick(CUSTOMERS.filter((c) => c.friend));
    this.phase = 'enter';
    void this.talk(null, ['nhap_hang']);
    const actor = await makeActor(supplier) as EGActor;
    this.alive(token);
    this.addActor(actor);
    const box = this.makeBox(slot.item);
    box.position.set(0, supplier.height * 0.5, 0.3);
    actor.body.add(box);
    actor.carry = true;
    actor.setPos(SPOT.outside);
    actor.face(Math.PI);
    void this.shop.openDoor(true);
    this.doorBell();
    const walk = actor.walkTo([SPOT.door.clone(), SPOT.inside.clone(), new THREE.Vector3(-1.3, 0, -1.9), SPOT.counter.clone()], 1.2);
    setTimeout(() => void this.shop.openDoor(false), 2600);
    await walk;
    this.alive(token);
    actor.faceCamera();
    await wait(400);
    // đặt thùng lên ngăn phải của khay
    const wp = box.getWorldPosition(new THREE.Vector3());
    actor.body.remove(box);
    this.scene.add(box);
    box.position.copy(wp);
    actor.carry = false;
    const boxAt = new THREE.Vector3(SPOT.tray.x + 0.85, COUNTER_Y + 0.05, SPOT.tray.z - 0.05);
    await tween(500, (k) => { box.position.lerpVectors(wp, boxAt, k); box.position.y += Math.sin(k * Math.PI) * 0.3; }, easeInOutSine);
    this.alive(token);
    const o: Order = { cust: supplier, kind: 'restock', parts: [{ item: slot.item, n: a }, { item: slot.item, n: b }], price: [1, 1], actor, tries: 0, wrongTaps: 0, index: -1, given: 0 };
    this.order = o;
    this.showOrder(o);
    els.bell.hidden = true;
    this.phase = 'busy';
    void actor.once('wave');
    // "Kệ còn bốn quả táo" – a món từ đĩa ra ngăn trái
    const left = await Promise.all(Array.from({ length: a }, () => this.shop.itemMesh(slot.item, slot.item.size * 0.8)));
    const flyIn = (mesh: THREE.Group, from: THREE.Vector3, z: 0 | 1, i: number, n: number, delay: number) => new Promise<void>((res) => setTimeout(() => {
      const ti: TrayItem = { item: slot.item, mesh, hit: new THREE.Mesh(), busy: true, zone: z };
      this.tray.push(ti);
      mesh.position.copy(from);
      this.scene.add(mesh);
      const to = this.zonePos(z, i, n);
      const curve = new THREE.QuadraticBezierCurve3(from.clone(), from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 1.0, 0)), to);
      void tween(460, (k) => mesh.position.copy(curve.getPoint(k)), easeInOutSine).then(() => { ti.busy = false; sfx('sfx_pop', 0.3); this.refreshCard(); res(); });
    }, delay));
    await Promise.all([this.talk(null, ['ke_con', keyQty(slot.item, a)]), ...left.map((m, i) => flyIn(m, slot.from, 0, i, a, i * 120))]);
    this.alive(token);
    // bạn: "Chị mang thêm ba quả táo nữa" – b món nhảy từ thùng ra ngăn phải, thùng biến mất
    const right = await Promise.all(Array.from({ length: b }, () => this.shop.itemMesh(slot.item, slot.item.size * 0.8)));
    void actor.once('cheer');
    await Promise.all([this.talk(actor, [ck('bring', supplier), keyQty(slot.item, b), 'nua']), ...right.map((m, i) => flyIn(m, boxAt.clone().add(new THREE.Vector3(0, 0.3, 0)), 1, i, b, 300 + i * 160))]);
    this.alive(token);
    void tween(300, (k) => box.scale.setScalar(Math.max(0.001, 1 - k))).then(() => box.removeFromParent());
    this.magic.burst(boxAt.clone().add(new THREE.Vector3(0, 0.3, 0)), 20, 0xffd36e, 1.6, 0.2, 0.8, -1);
    // gộp + hỏi "Bây giờ có tất cả mấy?"
    await this.trayMerge();
    this.alive(token);
    await this.talk(null, ['bay_gio_may']);
    this.alive(token);
    await this.askAnswer(token, o, false);
    this.alive(token);
    await this.talk(actor, [keyNum(a), 'cong', keyNum(b), 'bang', keyNum(a + b)]);
    this.alive(token);
    // hàng lên đĩa
    const sum = a + b;
    await Promise.all(this.tray.map((t, i) => new Promise<void>((res) => setTimeout(() => {
      const f = t.mesh.position.clone();
      const curve = new THREE.QuadraticBezierCurve3(f, f.clone().lerp(slot.from, 0.5).add(new THREE.Vector3(0, 0.9, 0)), slot.from.clone());
      void tween(420, (k) => { t.mesh.position.copy(curve.getPoint(k)); t.mesh.scale.setScalar(1 - k * 0.6); }, easeInOutSine).then(() => { t.mesh.removeFromParent(); res(); });
    }, i * 80))));
    this.tray = [];
    this.shop.setStock(slot, sum);
    this.shop.pressSlot(slot);
    this.magic.burst(slot.from.clone().add(new THREE.Vector3(0, 0.3, 0)), 26, 0xff8fb8, 1.8, 0.22, 0.9, -1.5);
    els.order.hidden = true;
    void this.nhim?.once('cheer');
    await Promise.all([actor.once('wave'), this.talk(actor, [ck('bye', supplier)])]);
    this.alive(token);
    this.order = null;
    this.phase = 'busy';
    void (async () => {
      await actor.walkTo([new THREE.Vector3(-1.2, 0, -2.0), SPOT.inside.clone()], 1.25);
      void this.shop.openDoor(true);
      this.doorBell();
      await actor.walkTo([SPOT.door.clone(), SPOT.outside.clone()], 1.3);
      void this.shop.openDoor(false);
      this.removeActor(actor);
    })();
    await wait(1200);
  }

  /** Thùng carton có hình món ở mặt trước. */
  private makeBox(item: ItemDef): THREE.Group {
    const g = new THREE.Group();
    const card = new THREE.MeshStandardMaterial({ color: 0xd9a66b, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.36), card);
    body.castShadow = true;
    const tape = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.365, 0.365), new THREE.MeshStandardMaterial({ color: 0xff8fb8, roughness: 0.7 }));
    const label = emojiSprite(item.emoji, 0.26);
    label.position.set(0, 0.02, 0.2);
    g.add(body, tape, label);
    return g;
  }

  /** 2 ngăn trượt lại thành 1 hàng. */
  private async trayMerge(): Promise<void> {
    sfx('sfx_win', 0.35);
    chime('C6:0.4 E6:0.4 G6:0.8', 260, 0.16);
    this.plusSign.visible = false;
    const ordered = [...this.tray.filter((t) => t.zone === 0), ...this.tray.filter((t) => t.zone === 1)];
    this.tray = ordered;
    await Promise.all(ordered.map((t, i) => {
      const from = t.mesh.position.clone();
      const to = this.trayPos(i, ordered.length);
      return tween(650, (k) => { t.mesh.position.lerpVectors(from, to, k); t.mesh.position.y += Math.sin(k * Math.PI) * 0.15; }, easeInOutSine);
    }));
  }

  /** N món từ đĩa bay ra khay (bày cho khách xem); đĩa vẫn giữ số N. */
  private async layOut(slot: { item: ItemDef; from: THREE.Vector3 }, n: number): Promise<void> {
    const meshes = await Promise.all(Array.from({ length: n }, () => this.shop.itemMesh(slot.item, slot.item.size * 0.8)));
    await Promise.all(meshes.map((mesh, i) => new Promise<void>((res) => setTimeout(() => {
      const ti: TrayItem = { item: slot.item, mesh, hit: new THREE.Mesh(), busy: true, zone: 0 };
      this.tray.push(ti);
      mesh.position.copy(slot.from);
      this.scene.add(mesh);
      const to = this.trayPos(i, n);
      const curve = new THREE.QuadraticBezierCurve3(slot.from.clone(), slot.from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 1.1, 0)), to);
      void tween(480, (k) => { mesh.position.copy(curve.getPoint(k)); }, easeInOutSine).then(() => { ti.busy = false; sfx('sfx_pop', 0.3); res(); });
    }, i * 110))));
  }

  /** Bài trừ: Nhím chạm món trên khay để đưa cho khách (đếm to); đủ k món thì hỏi còn lại mấy. */
  private giveItem(t: TrayItem): void {
    const o = this.order;
    if (!o || o.kind !== 'sub' || this.phase !== 'give' || t.busy) return;
    this.hand = null;
    t.busy = true;
    this.tray.splice(this.tray.indexOf(t), 1);
    o.given++;
    const n = o.given;
    const slot = this.shop.slots.find((x) => x.item === t.item);
    if (slot) this.shop.setStock(slot, o.parts[0].n - n);
    sfx('sfx_tap', 0.5);
    void this.say1(keyNum(Math.min(n, 10)));
    const a = o.actor;
    const hands = a.root.position.clone().add(new THREE.Vector3(0, o.cust.kind === 'cat' ? 0.35 : o.cust.height * 0.5, 0.35));
    const from = t.mesh.position.clone();
    const curve = new THREE.QuadraticBezierCurve3(from, from.clone().lerp(hands, 0.5).add(new THREE.Vector3(0, 0.8, 0)), hands);
    void tween(450, (k) => { t.mesh.position.copy(curve.getPoint(k)); t.mesh.scale.setScalar(1 - k * 0.8); }, easeInOutSine).then(() => {
      t.mesh.removeFromParent();
      this.magic.twinkle(hands, 0xffd36e, 4, 0.3, 0.2);
    });
    a.talking = true; setTimeout(() => { if (!this.speaking) a.talking = false; }, 380);
    this.refreshCard();
    if (n >= o.parts[1].n) void this.afterGive(o);
  }

  private async afterGive(o: Order): Promise<void> {
    const token = this.run;
    this.phase = 'busy';
    void o.actor.once(o.actor instanceof Cat ? 'yes' : 'interact');
    await wait(700);
    if (token !== this.run || this.order !== o) return;
    // còn lại dồn về giữa khay
    const rest = this.tray;
    await Promise.all(rest.map((t, i) => { const f = t.mesh.position.clone(); const to = this.trayPos(i, rest.length); return tween(400, (k) => t.mesh.position.lerpVectors(f, to, k), easeOutQuad); }));
    if (token !== this.run || this.order !== o) return;
    await this.talk(null, ['con_lai_may']);
    await this.askAnswer(token, o, true);
  }

  /** Hỏi kết quả (3 nút số); sai → các món trên khay nảy đếm 1..N; đúng → ô ? thành số, bell = sẵn sàng bấm chuông. */
  private async askAnswer(token: number, o: Order, bell: boolean): Promise<void> {
    const ans = this.answer(o);
    this.phase = 'sum';
    showPanel(true);
    if (this.auto) void this.autoAnswer(token, String(ans), o.index === 0 || (o.kind === 'sub' && !this.autoSubWrongDone && (this.autoSubWrongDone = true)));
    await this.pickLoop(token, this.numberOptions(ans), String(ans), this.sumKeys(o), () => this.countUp(token, this.tray.map((t) => t.mesh)));
    if (token !== this.run || this.order !== o) return;
    showPanel(false);
    const el = document.getElementById('ord-ans');
    if (el) { el.textContent = String(ans); el.classList.add('done'); bumpEl(el); }
    void this.nhim?.once('cheer');
    void o.actor.once(o.actor instanceof Cat ? 'yes' : 'cheer');
    if (!bell) { this.phase = 'busy'; await this.talk(null, ['right', keyNum(ans)]); return; }
    this.phase = 'bell';
    els.bell.classList.add('ready');
    await this.talk(null, ['right', keyNum(ans), 'bell_hint']);
    if (this.auto && token === this.run && this.phase === 'bell') { await wait(700); this.onBell(); }
  }
  private autoSubWrongDone = false;

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

  // ------------------------------------------------------------------ Nhím đứng quầy
  /** Tạp dề hồng + tim trước bụng Nhím (gắn vào thân, không theo xương: tay vẫn vung tự do). */
  private addApron(a: EGActor): void {
    const h = a.def.height;
    const g = new THREE.Group();
    const cloth = new THREE.MeshStandardMaterial({ color: 0xff8fc0, roughness: 0.85, side: THREE.DoubleSide });
    const shape = new THREE.Shape();
    shape.moveTo(-0.13, 0); shape.lineTo(0.13, 0); shape.lineTo(0.17, -0.36); shape.quadraticCurveTo(0, -0.42, -0.17, -0.36); shape.lineTo(-0.13, 0);
    const skirt = new THREE.Mesh(new THREE.ShapeGeometry(shape), cloth);
    const bib = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.17), cloth);
    bib.position.set(0, 0.09, -0.012);
    const heart = emojiSprite('💗', 0.09);
    heart.position.set(0, -0.15, 0.01);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.025, 0.02), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
    g.add(skirt, bib, heart, tie);
    g.position.set(0, h * 0.56, 0.115);
    g.rotation.x = -0.05;
    a.body.add(g);
  }

  // ------------------------------------------------------------------ thẻ gọi món: phép cộng bằng hình
  private showOrder(o: Order): void {
    const [p0, p1] = o.parts;
    const same = p0.item === p1.item;
    els.order.innerHTML = '';
    if (same) {
      const head = document.createElement('div');
      head.className = 'ord-head';
      const pic = document.createElement('button');
      pic.className = 'ord-pic';
      pic.textContent = p0.item.emoji;
      pic.addEventListener('click', () => this.repeatOrder());
      head.append(pic, this.wordButton(p0.item, 'ord-word'));
      els.order.appendChild(head);
    }
    const eq = document.createElement('div');
    eq.className = 'eq';
    const group = (p: Part, z: 0 | 1) => {
      const g = document.createElement('div');
      g.className = 'grp';
      g.dataset.zone = String(z);
      if (!same) g.appendChild(this.wordButton(p.item, 'gword'));
      const pics = document.createElement('div');
      pics.className = 'pics';
      pics.style.gridTemplateColumns = `repeat(${Math.min(p.n, 3)}, auto)`;
      for (let i = 0; i < p.n; i++) { const e = document.createElement('i'); e.textContent = p.item.emoji; pics.appendChild(e); }
      const num = document.createElement('b');
      num.className = 'num';
      num.textContent = String(p.n);
      g.append(pics, num);
      return g;
    };
    const op = (t: string) => { const d = document.createElement('div'); d.className = 'op'; d.textContent = t; return d; };
    const ans = document.createElement('div');
    ans.className = 'ans';
    ans.id = 'ord-ans';
    ans.textContent = '?';
    eq.append(group(p0, 0), op('+'), group(p1, 1), op('='), ans);
    els.order.appendChild(eq);
    els.order.hidden = false;
    els.order.classList.remove('pop');
    void els.order.offsetWidth;
    els.order.classList.add('pop');
    sfx('sfx_pop', 0.5);
    els.bell.hidden = false;
    els.bell.classList.remove('ready');
    this.plusSign.visible = true;
    this.refreshCard();
  }

  /** Thẻ bài trừ: [🍎×N] − [🍎×k] = ? (món đưa khách bị gạch dần). */
  private showSubCard(o: Order): void {
    const [whole, buy] = o.parts;
    els.order.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'ord-head';
    const pic = document.createElement('button');
    pic.className = 'ord-pic';
    pic.textContent = whole.item.emoji;
    pic.addEventListener('click', () => this.repeatOrder());
    head.append(pic, this.wordButton(whole.item, 'ord-word'));
    const eq = document.createElement('div');
    eq.className = 'eq';
    const group = (n: number, z: 0 | 1, lit: boolean, tag: string) => {
      const g = document.createElement('div');
      g.className = 'grp';
      g.dataset.zone = String(z);
      const t = document.createElement('div');
      t.className = 'gtag';
      t.textContent = tag;
      const pics = document.createElement('div');
      pics.className = 'pics';
      pics.style.gridTemplateColumns = `repeat(${Math.min(n, n > 6 ? 4 : 3)}, auto)`;
      for (let i = 0; i < n; i++) { const e = document.createElement('i'); e.textContent = whole.item.emoji; if (lit) e.className = 'on'; pics.appendChild(e); }
      const num = document.createElement('b');
      num.className = 'num';
      num.textContent = String(n);
      g.append(t, pics, num);
      return g;
    };
    const op = (t: string) => { const d = document.createElement('div'); d.className = 'op'; d.textContent = t; return d; };
    const ans = document.createElement('div');
    ans.className = 'ans';
    ans.id = 'ord-ans';
    ans.textContent = '?';
    eq.append(group(whole.n, 0, true, '🧺'), op('−'), group(buy.n, 1, false, '🛍️'), op('='), ans);
    els.order.append(head, eq);
    els.order.hidden = false;
    els.order.classList.remove('pop');
    void els.order.offsetWidth;
    els.order.classList.add('pop');
    sfx('sfx_pop', 0.5);
    els.bell.hidden = false;
    els.bell.classList.remove('ready');
    this.plusSign.visible = false;
    this.refreshCard();
  }

  /** Nút chữ món: chạm = đánh vần GDPT, chữ sáng theo giọng. */
  private wordButton(item: ItemDef, cls: string): HTMLButtonElement {
    const b = document.createElement('button');
    b.className = cls;
    const w = wordInfo(item);
    renderWord(b, w.word);
    b.addEventListener('click', async () => {
      const all = Array.from(w.word).map((_, i) => i);
      this.speaking = true;
      const ok = await speakSequence(w.tokens.map((t) => t.audio), (i) => renderWord(b, w.word, w.tokens[i].lit), 200);
      this.speaking = false;
      this.lastTap = performance.now();
      if (ok) { renderWord(b, w.word, all, true); setTimeout(() => renderWord(b, w.word), 900); }
    });
    return b;
  }

  private repeatOrder(): void {
    const o = this.order;
    if (!o || !['order', 'give', 'sum', 'bell'].includes(this.phase)) return;
    if (this.phase === 'sum') { void this.talk(null, this.sumKeys(o)); return; }
    void o.actor.once(o.actor instanceof Cat ? 'yes' : 'wave');
    if (o.kind === 'sub') void this.talk(o.actor, ['ke_co', keyQty(o.parts[0].item, o.parts[0].n), ck('remind', o.cust), keyQty(o.parts[1].item, o.parts[1].n)]);
    else void this.talk(o.actor, this.orderKeys(o, 'remind'));
  }

  private zoneCount(z: 0 | 1): number { return this.tray.filter((t) => t.zone === z).length; }
  /** ngăn đang cần thêm món (ngăn trái trước) hoặc null khi đủ cả hai */
  private activeZone(o: Order): 0 | 1 | null {
    if (this.zoneCount(0) < o.parts[0].n) return 0;
    if (this.zoneCount(1) < o.parts[1].n) return 1;
    return null;
  }

  /** Thẻ: hình sáng dần theo món đã đặt, nhóm đang lấy nhấp nháy viền. */
  private refreshCard(): void {
    const o = this.order;
    if (!o) return;
    if (o.kind === 'sub') {
      // các món đã đưa khách bị gạch (từ cuối nhóm "kệ có")
      const pics = els.order.querySelectorAll('.grp[data-zone="0"] .pics i');
      pics.forEach((e, i) => e.classList.toggle('x', i >= o.parts[0].n - o.given));
      els.order.querySelectorAll('.grp[data-zone="1"] .pics i').forEach((e, i) => e.classList.toggle('on', i < o.given));
      els.order.querySelector('.grp[data-zone="1"]')?.classList.toggle('active', this.phase === 'give');
      return;
    }
    const active = this.phase === 'order' ? this.activeZone(o) : null;
    els.order.querySelectorAll<HTMLElement>('.grp').forEach((g) => {
      const z = Number(g.dataset.zone) as 0 | 1;
      const c = this.zoneCount(z);
      g.classList.toggle('active', active === z);
      g.querySelectorAll('.pics i').forEach((e, i) => e.classList.toggle('on', i < c));
    });
    const ans = document.getElementById('ord-ans');
    if (ans && this.phase !== 'bell') ans.textContent = '?';
  }

  // ------------------------------------------------------------------ khay 2 ngăn
  /** Chỗ món thứ i trong ngăn z (ngăn có n món): 3 món hàng trước, món 4–5 lên bậc sau so le. */
  private zonePos(z: 0 | 1, i: number, n: number): THREE.Vector3 {
    const cx = SPOT.tray.x + (z === 0 ? -0.78 : 0.78);
    const front = Math.min(n, 3);
    if (i < 3) return new THREE.Vector3(cx + (i - (front - 1) / 2) * 0.42, COUNTER_Y + 0.07, SPOT.tray.z + 0.2);
    const back = n - 3;
    return new THREE.Vector3(cx + (i - 3 - (back - 1) / 2) * 0.42 + (back % 2 === front % 2 ? 0.21 : 0), COUNTER_Y + TRAY_STEP + 0.06, SPOT.tray.z - 0.3);
  }
  /** Sau khi gộp: ≤ 5 món 1 hàng trước; món 6..10 lên bậc sau so le. */
  private trayPos(i: number, n: number): THREE.Vector3 {
    const back = i >= 5;
    const inRow = back ? n - 5 : Math.min(n, 5);
    let x = ((back ? i - 5 : i) - (inRow - 1) / 2) * 0.6;
    if (back && inRow % 2 === 1) x += 0.3;
    return back
      ? new THREE.Vector3(SPOT.tray.x + x, COUNTER_Y + TRAY_STEP + 0.06, SPOT.tray.z - 0.3)
      : new THREE.Vector3(SPOT.tray.x + x, COUNTER_Y + 0.07, SPOT.tray.z + 0.2);
  }

  private layoutZones(): void {
    for (const z of [0, 1] as const) {
      const items = this.tray.filter((t) => t.zone === z);
      items.forEach((t, i) => {
        if (t.busy) return;
        const to = this.zonePos(z, i, items.length);
        const from = t.mesh.position.clone();
        if (from.distanceTo(to) > 0.01) void tween(260, (k) => t.mesh.position.lerpVectors(from, to, k), easeOutQuad);
      });
    }
  }

  private tapSlot(i: number): void {
    this.tapLog.push(i);
    const o = this.order;
    const slot = this.shop.slots[i];
    if (!o || !slot || this.phase !== 'order') return;
    this.hand = null;
    this.shop.pressSlot(slot);
    const inOrder = o.parts.some((p) => p.item === slot.item);
    if (!inOrder) {
      // nhầm món: khách lắc nhẹ, nói tên món đó, không bay vào khay
      o.wrongTaps++;
      sfx('sfx_soft', 0.5);
      void o.actor.once(o.actor instanceof Cat ? 'no' : 'think');
      void this.nhim?.once('think');
      void this.talk(o.actor, [ck('wrong', o.cust), keyName(slot.item), 'dau_ne']).then(() => { if (o.wrongTaps >= 2) this.updateHint(true); });
      return;
    }
    const z = ([0, 1] as const).find((zz) => o.parts[zz].item === slot.item && this.zoneCount(zz) < o.parts[zz].n);
    if (z === undefined) { sfx('sfx_soft', 0.4); void this.talk(null, ['du_roi']); return; }
    if (slot.stock <= 0) { sfx('sfx_soft', 0.4); void this.talk(null, ['het_roi']); return; }
    sfx('sfx_tap', 0.5);
    this.shop.setStock(slot, slot.stock - 1);
    void this.addToTray(slot.item, slot.from.clone(), o, z);
  }

  private async addToTray(item: ItemDef, from: THREE.Vector3, o: Order, zone: 0 | 1): Promise<void> {
    const ti: TrayItem = { item, mesh: new THREE.Group(), hit: new THREE.Mesh(), busy: true, zone };
    this.tray.push(ti); // giữ chỗ ngay (chạm nhanh vẫn đúng số)
    const count = this.zoneCount(zone);
    this.refreshCard();
    const mesh = await this.shop.itemMesh(item, item.size * 0.8);
    if (this.order !== o || !this.tray.includes(ti)) return;
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.46, 0.4), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.2;
    mesh.add(hit);
    ti.mesh = mesh; ti.hit = hit;
    mesh.position.copy(from);
    this.scene.add(mesh);
    const zoneItems = () => this.tray.filter((t) => t.zone === zone);
    const to = this.zonePos(zone, zoneItems().indexOf(ti), zoneItems().length);
    this.layoutZones();
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
    mesh.position.copy(this.zonePos(zone, zoneItems().indexOf(ti), zoneItems().length));
    void tween(260, (k) => { const s = 1 + Math.sin(k * Math.PI) * 0.25; mesh.scale.set(s, 2 - s, s); });
    sfx('sfx_pop', 0.45);
    // khách + Nhím gật gù theo từng món
    for (const a of [o.actor, this.nhim]) if (a) { a.talking = true; setTimeout(() => { if (!this.speaking) a.talking = false; }, 380); }
    const pip = els.order.querySelector(`.grp[data-zone="${zone}"] .pics i:nth-child(${count})`);
    if (pip) bumpEl(pip);
    void this.say1(keyNum(Math.min(count, 10)));
    if (this.activeZone(o) === null && this.tray.every((t) => !t.busy) && this.phase === 'order') void this.trayFull(o);
  }

  /** 1 tiếng ngắn (đếm / tên món) – cắt câu đang nói. */
  private async say1(key: string): Promise<void> {
    if (this.speaking) { stopSpeech(); this.speaking = false; }
    await play(key);
  }

  private removeTrayItem(ti: TrayItem): void {
    const o = this.order;
    if (!o || ti.busy || this.phase !== 'order') return;
    this.hand = null;
    ti.busy = true;
    this.tray.splice(this.tray.indexOf(ti), 1);
    sfx('sfx_soft', 0.55);
    const slot = this.shop.slots.find((s) => s.item === ti.item);
    if (slot) this.shop.setStock(slot, slot.stock + 1);
    const from = ti.mesh.position.clone();
    const to = slot ? slot.from.clone() : from.clone().add(new THREE.Vector3(0, 0, 1.5));
    const curve = new THREE.QuadraticBezierCurve3(from, from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 1.0, 0)), to);
    void tween(420, (k) => { ti.mesh.position.copy(curve.getPoint(k)); ti.mesh.scale.setScalar(1 - k * 0.7); }, easeInOutSine).then(() => ti.mesh.removeFromParent());
    this.layoutZones();
    this.refreshCard();
    const left = this.zoneCount(ti.zone);
    if (left > 0) void this.say1(keyNum(left));
  }

  /** Đủ 2 ngăn: ngăn phải trượt sang gộp với ngăn trái → hỏi tổng. */
  private async trayFull(o: Order): Promise<void> {
    const token = this.run;
    this.phase = 'busy';
    this.hand = null;
    this.refreshCard();
    await wait(500);
    if (token !== this.run || this.order !== o) return;
    await this.trayMerge();
    if (token !== this.run || this.order !== o) return;
    await this.askAnswer(token, o, true);
  }

  /** 3 nút số quanh đáp án (1..10). */
  private numberOptions(n: number): { label: string; value: string; audio: string }[] {
    const opts = new Set<number>([n]);
    while (opts.size < 3) { const d = n + Math.floor(Math.random() * 5) - 2; if (d >= 1 && d <= 10) opts.add(d); }
    return shuffle([...opts]).map((v) => ({ label: String(v), value: String(v), audio: keyNum(v) }));
  }

  /** Gợi ý khi chọn sai tổng: từng món / xu nảy lên lần lượt, đọc 1..N. */
  private async countUp(token: number, objs: THREE.Object3D[]): Promise<void> {
    await this.talk(null, ['count_hint']);
    for (let i = 0; i < objs.length; i++) {
      if (token !== this.run) return;
      const m = objs[i];
      const y0 = m.position.y;
      void tween(380, (k) => { m.position.y = y0 + Math.sin(k * Math.PI) * 0.28; m.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.25); });
      this.magic.twinkle(m.position.clone().add(new THREE.Vector3(0, 0.3, 0)), 0xffd36e, 4, 0.2, 0.18);
      this.speaking = true;
      await play(keyNum(Math.min(i + 1, 10)));
      await wait(120);
    }
    this.speaking = false;
  }

  // ------------------------------------------------------------------ chuông
  onBell(): void {
    const o = this.order;
    if (!o) return;
    bumpEl(els.bell, 'ring');
    chime('G6:0.4 E6:0.6', 240, 0.22);
    this.hand = null;
    if (this.phase === 'bell') {
      this.phase = 'check';
      els.bell.classList.remove('ready');
      this.bellResolve?.();
      this.bellResolve = null;
      return;
    }
    if (this.phase === 'sum') { void this.talk(null, ['pick_sum', ...this.sumKeys(o)]); return; }
    if (this.phase === 'give') { void this.talk(null, ['give_hint']); this.updateHint(true); return; }
    if (this.phase !== 'order') return;
    o.tries++;
    if (!this.tray.length) { void this.talk(null, ['bell_empty']); this.updateHint(o.tries >= 2); return; }
    const z = this.activeZone(o);
    if (z === null) return;
    o.actor.setLook(0.25);
    void o.actor.once(o.actor instanceof Cat ? 'no' : 'think');
    void this.talk(o.actor, [ck('more', o.cust), keyQty(o.parts[z].item, o.parts[z].n - this.zoneCount(z)), 'more_end']).then(() => {
      o.actor.setLook(0);
      this.updateHint(o.tries >= 2);
    });
  }

  /** Tay chỉ vào việc nên làm tiếp. */
  private updateHint(force: boolean): void {
    const o = this.order;
    if (!o || !force) { this.hand = null; return; }
    if (this.phase === 'bell') { this.hand = { kind: 'el', el: els.bell }; return; }
    if (this.phase === 'give') { const t = this.tray.find((x) => !x.busy); this.hand = t ? { kind: '3d', at: t.mesh.position.clone().add(new THREE.Vector3(0, 0.25, 0)) } : null; return; }
    if (this.phase !== 'order') { this.hand = null; return; }
    const z = this.activeZone(o);
    if (z === null) { this.hand = null; return; }
    const slot = this.shop.slots.find((s) => s.item === o.parts[z].item);
    this.hand = slot ? { kind: '3d', at: slot.from.clone().add(new THREE.Vector3(0, 0.15, 0)) } : null;
  }

  // ------------------------------------------------------------------ giao hàng xong
  private async success(token: number, o: Order): Promise<void> {
    this.phase = 'busy';
    this.hand = null;
    els.bell.hidden = true;
    const a = o.actor;
    a.setLook(0);
    const [p0, p1] = o.parts;
    // khách nói cả câu: "Ba cộng hai bằng năm!" / "Bảy trừ ba bằng bốn!"
    await this.talk(a, [keyNum(p0.n), o.kind === 'sub' ? 'tru' : 'cong', keyNum(p1.n), 'bang', keyNum(this.answer(o))]);
    this.alive(token);
    sfx('sfx_win', 0.55);
    chime('C6:0.5 E6:0.5 G6:0.5 C7:1.5', 240, 0.2);
    confetti(50);
    void this.nhim?.once('cheer');
    void this.nhim?.hop(2, 0.22);
    // cộng: món bay vào tay khách; trừ: món còn lại về đĩa
    const slot = this.shop.slots.find((x) => x.item === p0.item);
    const hands = o.kind === 'sub' && slot ? slot.from.clone() : a.root.position.clone().add(new THREE.Vector3(0, o.cust.kind === 'cat' ? 0.35 : o.cust.height * 0.5, 0.35));
    void a.once(a instanceof Cat ? 'yes' : 'interact');
    await Promise.all(this.tray.map((t, i) => new Promise<void>((res) => setTimeout(() => {
      const from = t.mesh.position.clone();
      const curve = new THREE.QuadraticBezierCurve3(from, from.clone().lerp(hands, 0.5).add(new THREE.Vector3(0, 0.8, 0)), hands);
      void tween(450, (k) => { t.mesh.position.copy(curve.getPoint(k)); t.mesh.scale.setScalar(1 - k * 0.8); }, easeInOutSine).then(() => {
        t.mesh.removeFromParent();
        this.magic.twinkle(hands, 0xffd36e, 4, 0.3, 0.2);
        res();
      });
    }, i * 90))));
    this.tray = [];
    els.order.hidden = true;
    this.alive(token);
    if (this.level.pay === 'add' && o.kind === 'add') await this.pay(token, o);
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
    if (a instanceof Cat) sfx('cry_cat', 0.8);
    await Promise.all([a.once(a instanceof Cat ? 'dance' : 'cheer'), a.hop(2, 0.3), this.talk(a, [ck(Math.random() < 0.5 ? 'thanks1' : 'thanks2', o.cust)])]);
    this.alive(token);
    const s = this.toScreen(head);
    await flyStar(s.x, s.y);
    this.progress.stars++;
    this.dayStars++;
    els.starsN.textContent = String(this.progress.stars);
    bumpEl(els.stars);
    chime('E6:0.5 A6:1', 260, 0.18);
    saveProgress(this.progress);
    // thỉnh thoảng người nhà cổ vũ (ảnh / emoji + giọng)
    if (o.index === 1 || o.index === 3) { await familyCheer(o.cust.family); this.alive(token); }
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
    await Promise.all([a instanceof Cat ? Promise.resolve() : a.once('wave'), this.talk(a, [ck('bye', o.cust)])]);
    this.alive(token);
    void this.nhim?.once('wave');
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
    void (async () => {
      await a.walkTo([new THREE.Vector3(-1.2, 0, -2.0), SPOT.inside.clone()], 1.25);
      void this.shop.openDoor(true);
      this.doorBell();
      a.face(0);
      await a.once('wave');
      await a.walkTo([SPOT.door.clone(), SPOT.outside.clone()], 1.3);
      void this.shop.openDoor(false);
      this.removeActor(a);
    })();
    // khách sau tới quầy ngay khi khách này rời quầy
    await wait(1400);
  }

  // ------------------------------------------------------------------ cấp 2: trả xu = phép cộng (giá túi 1 + giá túi 2)
  private async pay(token: number, o: Order): Promise<void> {
    const a = o.actor;
    this.phase = 'pay';
    void a.once(a instanceof Cat ? 'yes' : 'interact');
    await this.talk(a, [ck('pay', o.cust)]);
    this.alive(token);
    const [p0, p1] = o.price;
    const src = a.root.position.clone().add(new THREE.Vector3(0, o.cust.kind === 'cat' ? 0.4 : o.cust.height * 0.55, 0.4));
    this.coins = [];
    this.plusSign.visible = true;
    for (const [z, n] of [[0, p0], [1, p1]] as const) {
      for (let i = 0; i < n; i++) {
        const c: Coin = { mesh: this.makeCoin(), zone: z };
        const to = this.zonePos(z, i, n).add(new THREE.Vector3(0, 0.22, 0));
        c.mesh.position.copy(src);
        this.scene.add(c.mesh);
        this.coins.push(c);
        const curve = new THREE.QuadraticBezierCurve3(src.clone(), src.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 0.9, 0)), to);
        void tween(480, (k) => { c.mesh.position.copy(curve.getPoint(k)); c.mesh.rotation.y = (1 - k) * 6; }, easeInOutSine).then(() => chime('A6:0.3', 300, 0.1));
        await wait(130);
      }
      await wait(250);
    }
    await wait(400);
    this.alive(token);
    // thẻ giá trên bong bóng khách: [🍩 bánh ⭐⭐ 2] + [🍦 kem ⭐⭐⭐ 3] = ? xu
    const [i0, i1] = [o.parts[0].item, o.parts[1].item];
    this.showPriceCard(o);
    showPanel(true);
    const sum = p0 + p1;
    if (this.auto) void this.autoAnswer(token, String(sum), o.index === 0);
    await this.pickLoop(token, this.numberOptions(sum), String(sum), [keyWord(i0), keyXu(p0), 'cong', keyWord(i1), keyXu(p1), 'bang_may_xu'], () => this.countUp(token, this.coins.map((c) => c.mesh)));
    this.alive(token);
    showPanel(false);
    const ans = document.getElementById('ord-ans');
    if (ans) { ans.textContent = String(sum); ans.classList.add('done'); bumpEl(ans); }
    this.plusSign.visible = false;
    setTimeout(() => { if (this.order === o) els.order.hidden = true; }, 1600);
    // xu bay vào hũ, nằm chồng lên nhau
    const coins = this.coins;
    this.coins = [];
    void this.talk(null, ['right', keyXu(sum)]);
    for (const [k, c] of coins.entries()) {
      const from = c.mesh.position.clone();
      const jarTop = SPOT.jar.clone().add(new THREE.Vector3(0, 0.6, 0));
      const inJar = SPOT.jar.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.14, 0.07 + Math.min(this.jarCount, 11) * 0.035, (Math.random() - 0.5) * 0.14));
      this.jarCount++;
      const curve = new THREE.QuadraticBezierCurve3(from, from.clone().lerp(jarTop, 0.5).add(new THREE.Vector3(0, 0.9, 0)), jarTop);
      chime(['C6', 'D6', 'E6', 'F6', 'G6', 'A6', 'B6', 'C7', 'D7', 'E7'][Math.min(k, 9)] + ':0.5', 300, 0.14);
      void tween(420, (t) => { c.mesh.position.copy(curve.getPoint(t)); c.mesh.rotation.y = t * 8; }, easeInOutSine).then(() => {
        const top = c.mesh.position.clone();
        return tween(220, (t) => { c.mesh.position.lerpVectors(top, inJar, t); c.mesh.rotation.x = -Math.PI / 2 * t; c.mesh.scale.setScalar(1 - t * 0.35); }, easeOutQuad);
      }).then(() => { c.mesh.userData.jar = true; this.magic.twinkle(jarTop, 0xffd36e, 4, 0.3, 0.18); });
      await wait(160);
    }
    await wait(900);
    this.alive(token);
  }

  /** Bong bóng giá (cấp 2): mỗi túi = hình món + chữ + xu ⭐ theo giá; "= ? xu". */
  private showPriceCard(o: Order): void {
    els.order.innerHTML = '';
    const eq = document.createElement('div');
    eq.className = 'eq';
    const group = (z: 0 | 1) => {
      const it = o.parts[z].item, n = o.price[z];
      const g = document.createElement('div');
      g.className = 'grp';
      const pic = document.createElement('div');
      pic.className = 'gpic';
      pic.textContent = it.emoji;
      const pics = document.createElement('div');
      pics.className = 'pics';
      pics.style.gridTemplateColumns = `repeat(${Math.min(n, 3)}, auto)`;
      for (let i = 0; i < n; i++) { const e = document.createElement('i'); e.className = 'on'; e.textContent = '⭐'; pics.appendChild(e); }
      const num = document.createElement('b');
      num.className = 'num';
      num.textContent = `${n} xu`;
      g.append(pic, this.wordButton(it, 'gword'), pics, num);
      return g;
    };
    const op = (t: string) => { const d = document.createElement('div'); d.className = 'op'; d.textContent = t; return d; };
    const ans = document.createElement('div');
    ans.className = 'ans';
    ans.id = 'ord-ans';
    ans.textContent = '?';
    eq.append(group(0), op('+'), group(1), op('='), ans);
    els.order.appendChild(eq);
    els.order.hidden = false;
    els.order.classList.remove('pop');
    void els.order.offsetWidth;
    els.order.classList.add('pop');
  }

  private makeCoin(): THREE.Group {
    const g = new THREE.Group();
    const geo = new THREE.CylinderGeometry(0.19, 0.19, 0.05, 32);
    geo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffc233, roughness: 0.35, metalness: 0, emissive: 0x7a4a00, emissiveIntensity: 0.25 }));
    body.castShadow = true;
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.155, 24), new THREE.MeshBasicMaterial({ map: emojiTexture('⭐'), transparent: true }));
    face.position.z = 0.027;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.016, 8, 32), new THREE.MeshStandardMaterial({ color: 0xffe08a, roughness: 0.3 }));
    rim.position.z = 0.02;
    g.add(body, face, rim);
    return g;
  }

  private clearJar(): void {
    const drop: THREE.Object3D[] = [];
    this.scene.traverse((o) => { if (o.userData.jar) drop.push(o); });
    drop.forEach((o) => o.removeFromParent());
  }

  /**
   * Chọn đáp án: sai lần 1 bỏ nút + đọc số vừa chọn + gợi ý (đếm từng vật) + hỏi lại;
   * sai lần 2 nút đúng nhấp nháy + gợi ý. Ngồi im 10 s: hỏi lại.
   */
  private pickLoop(token: number, items: { label: string; value: string; audio?: string }[], target: string, askKeys: string[], hint?: () => Promise<void>): Promise<void> {
    let wrong = 0, busy = false, solved = false;
    const ask = () => void this.talk(null, askKeys);
    this.repeatFn = ask;
    return new Promise((resolve) => {
      let idle = 0;
      const kick = () => { clearTimeout(idle); idle = window.setTimeout(() => { if (solved || token !== this.run) return; if (!busy) { ask(); buttons.forEach((b) => { if (!b.classList.contains('gone')) wobbleEl(b); }); } kick(); }, IDLE_MS); };
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
          void this.nhim?.once('think');
          const said = items.find((it) => it.value === value)?.audio;
          await this.talk(null, [...(said ? [said] : []), wrong === 1 ? 'retry' : 'hint_last']);
          if (wrong >= 2) buttons.find((b) => b.dataset.value === target)?.classList.add('hint');
          if (hint && token === this.run) await hint();
          if (wrong === 1 && token === this.run) await this.talk(null, askKeys);
          busy = false;
          return;
        }
        if (busy) return;
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
    const item = o.parts[0].item;
    const w = wordInfo(item);
    const chars = Array.from(w.word);
    const correct = chars[item.fill.index];
    this.shop.drawBoard({ emoji: item.emoji, word: chars.map((c, i) => (i === item.fill.index ? '_' : c)).join('') });
    showPanel(true, true, true);
    els.panelEmoji.textContent = item.emoji;
    els.panelEmoji.hidden = false;
    renderWord(els.panelWord, w.word, [], false, item.fill.index);
    els.panelWord.hidden = false;
    const letters = shuffle([correct, ...item.fill.distractors]);
    const items = letters.map((l) => ({ label: l, value: l, audio: w.fillLetterKeys[l] ?? letterAudio(l)?.[0] }));
    await this.talk(null, ['fill_intro']);
    this.alive(token);
    if (this.auto) void this.autoAnswer(token, correct, true);
    await this.pickLoop(token, items, correct, [w.nameKey, 'fill_ask']);
    this.alive(token);
    els.options.innerHTML = '';
    renderWord(els.panelWord, w.word, [item.fill.index]);
    this.shop.drawBoard({ emoji: item.emoji, word: w.word });
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
    const pending = [this.bellResolve];
    this.bellResolve = null;
    pending.forEach((r) => r?.());
    this.phase = 'menu';
    this.order = null;
    this.hand = null;
    this.repeatFn = null;
    for (const t of this.tray) t.mesh.removeFromParent();
    this.tray = [];
    for (const c of this.coins) c.mesh.removeFromParent();
    this.coins = [];
    for (const a of [...this.actors]) if (!(a instanceof Cat) && a !== this.nhim) this.removeActor(a);
    if (this.plusSign) this.plusSign.visible = false;
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
    const live = () => token === this.run && this.order === o && this.phase === 'order';
    const step = async () => { await wait(650); while (this.speaking && live()) await wait(150); return live(); };
    if (o.index === 0) {
      // khách đầu: thử chạm nhầm món + bấm chuông sớm để soát lời nhắc
      const other = this.shop.slots.find((s) => !o.parts.some((p) => p.item === s.item));
      if (other && await step()) this.tapSlot(this.shop.slots.indexOf(other));
      await wait(2500);
    }
    for (const z of [0, 1] as const) {
      for (let i = 0; i < o.parts[z].n; i++) { if (!await step()) return; this.tapSlot(slotOf(o.parts[z].item)); }
      if (o.index === 0 && z === 0) { await wait(900); if (live()) { this.onBell(); await wait(4500); } }
    }
  }
  private async autoGive(token: number, o: Order): Promise<void> {
    while (token === this.run && this.order === o && this.phase === 'give') {
      await wait(700);
      while (this.speaking && token === this.run) await wait(150);
      const t = this.tray.find((x) => !x.busy);
      if (t && this.phase === 'give') this.giveItem(t);
    }
  }
  /** bấm đáp án (lần đầu chọn sai 1 lần nếu wrongFirst) */
  private async autoAnswer(token: number, correct: string, wrongFirst: boolean): Promise<void> {
    await wait(2600);
    while (this.speaking && token === this.run) await wait(200);
    if (token !== this.run) return;
    const wrong = this.buttons.find((b) => b.dataset.value !== correct && !b.classList.contains('gone'));
    if (wrongFirst && wrong) {
      wrong.click();
      await wait(1500);
      while (this.speaking && token === this.run) await wait(200);
      await wait(600);
    }
    if (token === this.run) this.buttons.find((b) => b.dataset.value === correct)?.click();
  }
}
