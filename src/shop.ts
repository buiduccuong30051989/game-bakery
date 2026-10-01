// Dựng tiệm bánh 3D: phòng (tường sọc pastel, sàn caro), cửa sổ nhìn ra phố nắng + mái hiên, cửa có chuông,
// kệ bánh mì trên tường, bảng giá phấn, quầy gỗ + khay, kệ bày món (tiền cảnh, chạm được), hũ xu, đèn treo đung đưa
// và 3 nấc trang trí (hoa + rèm + cờ → đèn nháy + bóng bay → bảng hiệu + tháp bánh + sao).
// Camera tele nhìn thẳng vào quầy: mọi thứ quan trọng nằm trong dải tường sau y 0..3.5, x −4.3..4.3.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { instance, fitSize, canvasTexture, emojiTexture } from './assets.ts';
import { tween, easeOutBack, easeOutQuad } from './tween.ts';
import type { ItemDef, DecorDef } from './data.ts';

const matCache = new Map<string, THREE.MeshStandardMaterial>();
export function mat(color: number, opts: { rough?: number; emissive?: number; ei?: number } = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${opts.rough ?? 0.85}|${opts.emissive ?? 0}|${opts.ei ?? 0}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.85, metalness: 0, emissive: opts.emissive ?? 0, emissiveIntensity: opts.ei ?? 0 });
    matCache.set(key, m);
  }
  return m;
}

function box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, r = 0): THREE.Mesh {
  const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export const PALETTE = {
  wains: 0xf7a8c4, wood: 0xe0a46e, woodDark: 0xb8794b, woodLight: 0xf3cf9f,
  mint: 0x9ee6cf, pink: 0xff8fb8, gold: 0xffc233,
};

/** Tường sau, chiều cao phòng, cửa ra vào, cửa sổ */
const BZ = -4.2;
const H = 5.2;
const DOOR = { x: -3.3, w: 1.4, h: 2.4 };
const WIN = { x0: -0.75, x1: 2.95, y0: 0.88, y1: 2.42 };
const WCX = (WIN.x0 + WIN.x1) / 2;
export const COUNTER_Y = 0.85;
/** chiều cao bậc sau của khay */
export const TRAY_STEP = 0.22;

/** Vị trí quan trọng (m). Camera ở +z nhìn về −z; khách đứng sau quầy nhìn ra camera. */
export const SPOT = {
  door: new THREE.Vector3(DOOR.x, 0, BZ - 0.2),
  outside: new THREE.Vector3(DOOR.x, 0, BZ - 2.6),
  inside: new THREE.Vector3(DOOR.x + 0.1, 0, BZ + 0.9),
  counter: new THREE.Vector3(0, 0, -0.82),
  /** mèo nhảy lên quầy */
  counterTop: new THREE.Vector3(0, COUNTER_Y + 0.01, -0.42),
  wait: new THREE.Vector3(-2.15, 0, -2.45),
  sill: new THREE.Vector3(2.25, WIN.y0 + 0.03, BZ + 0.27),
  tray: new THREE.Vector3(0, COUNTER_Y + 0.03, 0.22),
  jar: new THREE.Vector3(-2.2, COUNTER_Y + 0.01, 0.38),
};

export interface Slot {
  item: ItemDef;
  root: THREE.Group;
  hit: THREE.Mesh;
  /** điểm món bay ra */
  from: THREE.Vector3;
}

export class Shop {
  readonly root = new THREE.Group();
  readonly slots: Slot[] = [];
  readonly hits: THREE.Object3D[] = [];
  readonly doorHinge = new THREE.Group();
  readonly bell = new THREE.Group();
  readonly lamps: THREE.Group[] = [];
  readonly decor = new Map<DecorDef['id'], THREE.Group>();
  readonly jar = new THREE.Group();
  readonly board: THREE.Mesh;
  readonly closedSign: THREE.Mesh;
  private readonly twinkles: THREE.Mesh[] = [];
  private readonly balloons: THREE.Group[] = [];
  private readonly shelfGroup = new THREE.Group();
  private t = 0;
  private bellSwing = 0;
  private boardCtx: CanvasRenderingContext2D | null = null;
  private boardTex: THREE.CanvasTexture | null = null;

  constructor(scene: THREE.Scene) {
    scene.add(this.root);
    this.root.add(this.shelfGroup);
    this.buildRoom();
    this.buildStreet();
    this.buildDoor();
    this.buildCounter();
    this.buildDisplay();
    this.buildLamps();
    void this.buildBreadShelf();
    this.board = this.buildBoard();
    this.closedSign = this.buildClosedSign();
    this.buildDecor();
  }

  // ------------------------------------------------------------------ phòng
  private buildRoom(): void {
    const floorTex = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#fff6ea'; c.fillRect(0, 0, 256, 256);
      c.fillStyle = '#f9cfdc'; c.fillRect(0, 0, 128, 128); c.fillRect(128, 128, 128, 128);
    });
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(6, 7);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 14), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 2.8);
    floor.receiveShadow = true;
    this.root.add(floor);

    const wallTex = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#fff3e3'; c.fillRect(0, 0, 256, 256);
      c.fillStyle = '#ffe2ec';
      for (let i = 0; i < 4; i++) c.fillRect(i * 64, 0, 32, 256);
      c.fillStyle = 'rgba(255,255,255,.75)';
      for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(i * 64 + 48, 64, 5, 0, Math.PI * 2); c.arc(i * 64 + 48, 192, 5, 0, Math.PI * 2); c.fill(); }
    });
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    const mBack = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 });
    // tường sau ghép từ các tấm quanh lỗ cửa ra vào + cửa sổ; UV theo toạ độ thế giới để sọc liền mạch
    const piece = (x0: number, x1: number, y0: number, y1: number) => {
      const w = x1 - x0, h = y1 - y0;
      const g = new THREE.PlaneGeometry(w, h);
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (x0 + uv.getX(i) * w) / 1.1, (y0 + uv.getY(i) * h) / 1.1);
      const m = new THREE.Mesh(g, mBack);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, BZ);
      m.receiveShadow = true;
      this.root.add(m);
    };
    const dx0 = DOOR.x - DOOR.w / 2, dx1 = DOOR.x + DOOR.w / 2;
    piece(-6, dx0, 0, H); piece(dx0, dx1, DOOR.h, H); piece(dx1, WIN.x0, 0, H);
    piece(WIN.x0, WIN.x1, 0, WIN.y0); piece(WIN.x0, WIN.x1, WIN.y1, H); piece(WIN.x1, 6, 0, H);
    // trần hồng nhạt có dầm gỗ (chỉ thấy khi màn dọc)
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(12, 14), new THREE.MeshStandardMaterial({ color: 0xfff0f5, roughness: 1 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, H, 2.8);
    this.root.add(ceil);
    for (let z = BZ + 1; z < 9; z += 1.6) this.root.add(box(12, 0.16, 0.22, mat(PALETTE.woodLight), 0, H - 0.08, z));
    // tường hai bên (ngoài khung nhìn, chặn nền)
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(10, H), mBack);
      w.position.set(s * 5.6, H / 2, BZ + 5);
      w.rotation.y = -s * Math.PI / 2;
      this.root.add(w);
    }
    // ốp chân tường hồng + nẹp trắng (tránh lỗ cửa)
    const wains = mat(PALETTE.wains), trim = mat(0xffffff);
    for (const [x0, x1] of [[-6, dx0 - 0.1], [dx1 + 0.1, 6]] as const) {
      this.root.add(box(x1 - x0, 0.9, 0.06, wains, (x0 + x1) / 2, 0.45, BZ + 0.03));
      this.root.add(box(x1 - x0, 0.07, 0.1, trim, (x0 + x1) / 2, 0.92, BZ + 0.05));
    }
    // khung cửa sổ + bậu (mèo Mun nằm)
    const frame = mat(0xffffff, { rough: 0.6 });
    const ww = WIN.x1 - WIN.x0, wh = WIN.y1 - WIN.y0, wy = (WIN.y0 + WIN.y1) / 2;
    this.root.add(box(ww + 0.4, 0.12, 0.62, mat(PALETTE.woodLight), WCX, WIN.y0 - 0.04, BZ + 0.2, 0.04));
    this.root.add(box(ww + 0.3, 0.14, 0.22, frame, WCX, WIN.y1 + 0.06, BZ + 0.05));
    for (const x of [WIN.x0 - 0.07, WIN.x1 + 0.07]) this.root.add(box(0.14, wh + 0.2, 0.22, frame, x, wy, BZ + 0.05));
    this.root.add(box(0.07, wh, 0.08, frame, WCX, wy, BZ - 0.01), box(ww, 0.07, 0.08, frame, WCX, wy + 0.25, BZ - 0.01));
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, depthWrite: false }));
    glass.position.set(WCX, wy, BZ - 0.03);
    this.root.add(glass);
  }

  /** Phố nắng ngoài cửa sổ: tấm nền vẽ canvas + vỉa hè + mái hiên sọc. */
  private buildStreet(): void {
    const tex = canvasTexture(1024, 512, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, '#8fd8ff'); g.addColorStop(0.7, '#d7f3ff'); g.addColorStop(1, '#fff6d6');
      c.fillStyle = g; c.fillRect(0, 0, 1024, 512);
      c.fillStyle = '#fff3a0'; c.beginPath(); c.arc(700, 110, 50, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,240,150,.35)'; c.beginPath(); c.arc(700, 110, 80, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff';
      for (const [x, y, s] of [[300, 90, 1], [520, 60, 0.7], [820, 150, 0.6]] as const) {
        c.beginPath(); c.arc(x, y, 30 * s, 0, 7); c.arc(x + 34 * s, y - 14 * s, 36 * s, 0, 7); c.arc(x + 70 * s, y, 28 * s, 0, 7); c.fill();
      }
      const houses = ['#ffb3c7', '#ffe08a', '#a8e6cf', '#b5c7ff', '#ffc89e', '#d9b8ff', '#9fe2ff'];
      let x = -20, i = 0;
      while (x < 1024) {
        const w = 120 + ((i * 37) % 60), h = 150 + ((i * 53) % 100);
        c.fillStyle = houses[i % houses.length];
        c.fillRect(x, 430 - h, w, h);
        c.fillStyle = '#e8735a';
        c.beginPath(); c.moveTo(x - 8, 430 - h); c.lineTo(x + w / 2, 430 - h - 44); c.lineTo(x + w + 8, 430 - h); c.fill();
        c.fillStyle = '#fffbe8';
        for (let r = 0; r < Math.floor(h / 70); r++) for (let k = 0; k < 2; k++) c.fillRect(x + 18 + k * (w / 2), 430 - h + 24 + r * 66, w / 4, 36);
        x += w + 14; i++;
      }
      for (const tx of [380, 640, 900]) {
        c.fillStyle = '#9b6b43'; c.fillRect(tx - 8, 360, 16, 80);
        c.fillStyle = '#6fcf7c'; c.beginPath(); c.arc(tx, 335, 46, 0, 7); c.arc(tx - 32, 362, 32, 0, 7); c.arc(tx + 32, 362, 32, 0, 7); c.fill();
      }
      c.fillStyle = '#f2e3c9'; c.fillRect(0, 430, 1024, 82);
      c.fillStyle = '#e6d2b0'; for (let k = 0; k < 1024; k += 64) c.fillRect(k, 430, 4, 82);
    });
    const street = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshBasicMaterial({ map: tex }));
    street.position.set(0, 2.5, BZ - 4.5);
    this.root.add(street);
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(16, 5), new THREE.MeshBasicMaterial({ color: 0xf6e7cd }));
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(0, 0.01, BZ - 2.4);
    this.root.add(walk);
    // mái hiên sọc hồng trắng ngoài cửa sổ: diềm lượn sóng rủ xuống mép trên khung kính
    const scallop = canvasTexture(512, 96, (c) => {
      for (let i = 0; i < 16; i++) {
        c.fillStyle = i % 2 ? '#ffffff' : '#ff7fae';
        c.fillRect(i * 32, 0, 32, 48);
        c.beginPath(); c.arc(i * 32 + 16, 48, 16, 0, Math.PI); c.fill();
      }
    });
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(WIN.x1 - WIN.x0 + 0.6, 0.42), new THREE.MeshBasicMaterial({ map: scallop, transparent: true, side: THREE.DoubleSide }));
    sc.position.set(WCX, WIN.y1 - 0.12, BZ - 0.45);
    this.root.add(sc);
  }

  private buildDoor(): void {
    const frame = mat(0xffffff, { rough: 0.6 });
    const dx0 = DOOR.x - DOOR.w / 2, dx1 = DOOR.x + DOOR.w / 2;
    this.root.add(box(0.14, DOOR.h + 0.1, 0.24, frame, dx0 - 0.05, DOOR.h / 2, BZ), box(0.14, DOOR.h + 0.1, 0.24, frame, dx1 + 0.05, DOOR.h / 2, BZ), box(DOOR.w + 0.24, 0.14, 0.24, frame, DOOR.x, DOOR.h + 0.06, BZ));
    // cánh cửa: bản lề bên trái, mở vào trong
    this.doorHinge.position.set(dx0 + 0.02, 0, BZ + 0.02);
    const door = new THREE.Group();
    door.add(box(DOOR.w - 0.04, DOOR.h - 0.04, 0.07, mat(0x7cc8f2, { rough: 0.6 }), DOOR.w / 2, DOOR.h / 2, 0, 0.03));
    for (const y of [0.55, 1.05]) door.add(box(DOOR.w - 0.4, 0.34, 0.03, mat(0x9fd8f7), DOOR.w / 2, y, 0.045, 0.02));
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), new THREE.MeshBasicMaterial({ color: 0xdff6ff }));
    win.position.set(DOOR.w / 2, 1.85, 0.05);
    door.add(win);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), mat(PALETTE.gold, { rough: 0.35 }));
    knob.position.set(DOOR.w - 0.18, 1.1, 0.08);
    door.add(knob);
    this.doorHinge.add(door);
    this.root.add(this.doorHinge);
    // chuông cửa (lắc khi khách vào / ra)
    this.bell.position.set(DOOR.x, DOOR.h - 0.02, BZ + 0.28);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.2, 20, 1, true), mat(PALETTE.gold, { rough: 0.3, emissive: 0x553300, ei: 0.3 }));
    (cone.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    cone.position.y = -0.14;
    const clap = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mat(0xb98b2a));
    clap.position.y = -0.24;
    this.bell.add(cone, clap);
    this.root.add(this.bell);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(0.8, 40), mat(0xffd36e));
    rug.rotation.x = -Math.PI / 2; rug.scale.set(1, 0.6, 1);
    rug.position.set(DOOR.x, 0.012, BZ + 0.75);
    rug.receiveShadow = true;
    this.root.add(rug);
  }

  private buildCounter(): void {
    const top = box(6.2, 0.1, 1.5, mat(PALETTE.woodLight, { rough: 0.55 }), 0, COUNTER_Y - 0.05, 0, 0.04);
    const body = box(6.0, COUNTER_Y - 0.1, 1.3, mat(0xffc4d8), 0, (COUNTER_Y - 0.1) / 2, 0, 0.04);
    this.root.add(top, body);
    // khay gỗ viền hồng
    const tray = box(3.1, 0.05, 1.0, mat(0xf6e2bf, { rough: 0.6 }), SPOT.tray.x, COUNTER_Y + 0.025, SPOT.tray.z, 0.02);
    const rim = mat(0xff8fb8);
    tray.add(box(3.2, 0.09, 0.06, rim, 0, 0.045, 0.53), box(3.2, 0.09, 0.06, rim, 0, 0.045, -0.53), box(0.06, 0.09, 1.1, rim, 1.58, 0.045, 0), box(0.06, 0.09, 1.1, rim, -1.58, 0.045, 0));
    // bậc sau của khay (món thứ 6..10 đứng cao hơn, không bị hàng trước che)
    const step = box(3.0, TRAY_STEP, 0.42, mat(0xffe3ee, { rough: 0.6 }), 0, TRAY_STEP / 2 + 0.03, -0.3, 0.03);
    step.add(box(3.02, 0.04, 0.44, mat(0xff8fb8), 0, TRAY_STEP / 2, 0));
    tray.add(step);
    this.root.add(tray);
    // hũ xu thuỷ tinh
    this.jar.position.copy(SPOT.jar);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.46, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0xcff3ff, transparent: true, opacity: 0.35, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
    glass.position.y = 0.23;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.04, 28), mat(0xcff3ff));
    base.position.y = 0.02;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 28), mat(PALETTE.pink));
    lid.position.y = 0.49;
    const star = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: emojiTexture('⭐'), transparent: true, depthWrite: false }));
    star.position.set(0, 0.24, 0.31);
    this.jar.add(glass, base, lid, star);
    this.root.add(this.jar);
  }

  /** Kệ bày món ở tiền cảnh: 2 bậc × 4 ô (đĩa + 3 món). Ô chạm to (≥ 120 px). */
  private buildDisplay(): void {
    const wood = mat(PALETTE.wood, { rough: 0.7 });
    const front = mat(0xfff4e6);
    this.root.add(box(4.2, 0.34, 0.74, front, 0, 0.17, 2.05, 0.04), box(4.3, 0.07, 0.82, wood, 0, 0.37, 2.05, 0.03));
    this.root.add(box(4.2, 0.62, 0.7, front, 0, 0.31, 1.3, 0.04), box(4.3, 0.07, 0.78, wood, 0, 0.65, 1.3, 0.03));
    this.root.add(box(4.22, 0.08, 0.04, mat(PALETTE.pink), 0, 0.26, 2.43), box(4.22, 0.08, 0.04, mat(PALETTE.mint), 0, 0.52, 1.66));
  }

  /** Bày món của ngày lên kệ (8 ô). Xoá ô cũ. */
  async setShelf(items: ItemDef[]): Promise<void> {
    const plateMat = mat(0xffffff, { rough: 0.4 });
    const rimMats = [mat(0xff9ec4), mat(0x9ee6cf), mat(0xffd36e), mat(0xb9a8ff)];
    const rows = [{ y: 0.41, z: 2.05 }, { y: 0.69, z: 1.3 }];
    const slots = await Promise.all(items.map(async (item, i) => {
      const row = rows[i < 4 ? 0 : 1];
      const x = ((i % 4) - 1.5) * 0.98;
      const root = new THREE.Group();
      root.position.set(x, row.y, row.z);
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.37, 0.05, 36), plateMat);
      plate.position.y = 0.03;
      plate.receiveShadow = true;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 8, 40), rimMats[i % rimMats.length]);
      rim.rotation.x = Math.PI / 2; rim.position.y = 0.06;
      root.add(plate, rim);
      for (const [ox, oz] of [[-0.15, 0.09], [0.16, 0.07], [0, -0.13]] as const) {
        const m = await this.itemMesh(item, item.size * 0.66);
        m.position.set(ox, 0.06, oz);
        m.rotation.y += (Math.random() - 0.5) * 0.6;
        root.add(m);
      }
      const hit = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.8, 0.76), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = 0.35;
      hit.userData.slot = i;
      root.add(hit);
      return { item, root, hit, from: new THREE.Vector3(x, row.y + 0.3, row.z) } satisfies Slot;
    }));
    for (const s of this.slots) s.root.removeFromParent();
    this.slots.length = 0;
    this.hits.length = 0;
    for (const s of slots) this.shelfGroup.add(s.root);
    this.slots.push(...slots);
    this.hits.push(...slots.map((s) => s.hit));
  }

  /** 1 bản model món ăn, fit theo cạnh lớn nhất. */
  async itemMesh(item: Pick<ItemDef, 'model' | 'rotY' | 'color'>, size: number): Promise<THREE.Group> {
    const { obj } = await instance(item.model);
    if (item.color !== undefined) {
      // sơn 1 màu (vd trứng nâu → trắng kem cho khớp 🥚 trên thẻ)
      const m = mat(item.color, { rough: 0.5, emissive: item.color, ei: 0.18 });
      obj.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = m; });
    }
    const g = fitSize(obj, size);
    if (item.rotY) g.rotation.y = item.rotY;
    return g;
  }

  private async placeModel(parent: THREE.Object3D, name: string, size: number, x: number, y: number, z: number, rotY = 0, tint?: Record<string, number>): Promise<THREE.Group> {
    const { obj } = await instance(name, { tint });
    const g = fitSize(obj, size);
    const holder = new THREE.Group();
    holder.add(g);
    holder.position.set(x, y, z);
    holder.rotation.y = rotY;
    parent.add(holder);
    return holder;
  }

  /** Kệ bánh mì trên tường sau (giữa cửa ra vào và cửa sổ) + góc bàn trà bên phải. */
  private async buildBreadShelf(): Promise<void> {
    const g = new THREE.Group();
    const cx = (DOOR.x + DOOR.w / 2 + WIN.x0) / 2;
    g.position.set(cx, 0, BZ + 0.22);
    const wood = mat(PALETTE.wood, { rough: 0.7 });
    g.add(box(1.36, 1.8, 0.06, mat(0xffe4c4), 0, 1.6, -0.2));
    for (const y of [0.98, 1.52, 2.06]) g.add(box(1.4, 0.06, 0.42, wood, 0, y, 0));
    for (const x of [-0.7, 0.7]) g.add(box(0.06, 1.8, 0.42, wood, x, 1.6, 0));
    g.add(box(1.5, 0.1, 0.46, mat(PALETTE.pink), 0, 2.53, 0, 0.03));
    this.root.add(g);
    const goods: [string, number, number, number][] = [
      ['food/loaf-round.glb', 0.34, -0.32, 1.01], ['food/croissant.glb', 0.32, 0.3, 1.01],
      ['food/muffin.glb', 0.24, -0.38, 1.55], ['food/cake.glb', 0.34, 0.0, 1.55], ['food/pie.glb', 0.32, 0.38, 1.55],
      ['food/cupcake.glb', 0.22, -0.4, 2.09], ['food/cookie-chocolate.glb', 0.22, -0.05, 2.09], ['food/loaf-baguette.glb', 0.48, 0.33, 2.09],
    ];
    await Promise.all(goods.map(([m, s, x, y]) => this.placeModel(g, m, s, x, y, 0.02, (Math.random() - 0.5) * 0.8)));
    // góc phải: bàn tròn + ghế + cây (đời thường, khách ngồi chờ được)
    void this.placeModel(this.root, 'furniture/tableRound.glb', 0.9, 3.6, 0, -2.55, 0, { wood: 0xffb5cf });
    void this.placeModel(this.root, 'furniture/chair.glb', 0.95, 4.2, 0, -2.0, -1.9);
    void this.placeModel(this.root, 'food/cup-coffee.glb', 0.18, 3.55, 0.7, -2.55, 0.5);
    void this.placeModel(this.root, 'furniture/pottedPlant.glb', 1.4, 4.1, 0, BZ + 0.45);
    void this.placeModel(this.root, 'furniture/stoolBar.glb', 0.8, -1.8, 0, -1.4, 0.3);
  }

  private buildLamps(): void {
    const shadeMats = [mat(0xffd36e), mat(0xff9ec4), mat(0x9ee6cf)];
    [-2.0, 0, 2.0].forEach((x, i) => {
      const g = new THREE.Group();
      g.position.set(x, H, -1.6);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.3), mat(0x6b4a3a));
      cord.position.y = -0.65;
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.4, 28, 1, true), shadeMats[i]);
      (shade.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      shade.position.y = -1.4;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
      bulb.position.y = -1.56;
      g.add(cord, shade, bulb);
      g.userData.phase = i * 1.7;
      this.lamps.push(g);
      this.root.add(g);
    });
  }

  /** Bảng giá (bảng phấn) trên tường sau bên phải cửa sổ; bài A2 ghi chữ vào đây. */
  private buildBoard(): THREE.Mesh {
    const c = document.createElement('canvas');
    c.width = 384; c.height = 384;
    const ctx = c.getContext('2d')!;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.05), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    mesh.position.set(3.72, 1.72, BZ + 0.05);
    mesh.add(box(1.17, 1.17, 0.05, mat(PALETTE.wood), 0, 0, -0.035));
    this.root.add(mesh);
    this.boardCtx = ctx;
    this.boardTex = tex;
    this.drawBoard(null);
    return mesh;
  }

  /** Vẽ bảng giá: entry = 1 món to (bài A2), không thì liệt kê 3 món + 1⭐. */
  drawBoard(entry: { emoji: string; word: string } | null, items: Pick<ItemDef, 'emoji' | 'word'>[] = []): void {
    const ctx = this.boardCtx;
    if (!ctx) return;
    ctx.fillStyle = '#2f5d50'; ctx.fillRect(0, 0, 384, 384);
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 6; ctx.strokeRect(12, 12, 360, 360);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '800 44px "Baloo 2", system-ui, sans-serif';
    ctx.fillText('Bảng giá', 192, 52);
    if (entry) {
      ctx.font = '120px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      ctx.fillText(entry.emoji, 192, 160);
      ctx.font = '800 76px "Baloo 2", system-ui, sans-serif';
      ctx.fillText(entry.word, 192, 268);
      ctx.font = '800 44px "Baloo 2", system-ui, sans-serif';
      ctx.fillStyle = '#ffd36e';
      ctx.fillText('1 ⭐', 192, 336);
    } else {
      items.slice(0, 3).forEach((it, i) => {
        const y = 128 + i * 84;
        ctx.font = '60px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(it.emoji, 78, y);
        ctx.font = '800 54px "Baloo 2", system-ui, sans-serif';
        ctx.fillText(it.word, 200, y + 4);
        ctx.fillStyle = '#ffd36e';
        ctx.fillText('1⭐', 318, y + 4);
      });
    }
    if (this.boardTex) this.boardTex.needsUpdate = true;
  }

  private buildClosedSign(): THREE.Mesh {
    const tex = canvasTexture(256, 128, (c) => {
      c.fillStyle = '#ff7fae'; c.beginPath(); c.roundRect(4, 4, 248, 120, 24); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 6; c.stroke();
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '800 46px "Baloo 2", system-ui, sans-serif';
      c.fillText('Đóng cửa', 128, 66);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    m.position.set(DOOR.w / 2, 1.3, 0.06);
    m.visible = false;
    this.doorHinge.children[0].add(m);
    return m;
  }

  // ------------------------------------------------------------------ trang trí 3 nấc
  private buildDecor(): void {
    // nấc 1: rèm hồng hai bên cửa sổ + dây cờ đuôi nheo trên cửa sổ + chậu hoa trên quầy
    const flowers = new THREE.Group();
    const curtain = new THREE.MeshStandardMaterial({ color: 0xff9ec4, roughness: 0.9, side: THREE.DoubleSide });
    for (const x of [WIN.x0 - 0.32, WIN.x1 + 0.32]) {
      const geo = new THREE.PlaneGeometry(0.62, 1.8, 10, 1);
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 12) * 0.05);
      geo.computeVertexNormals();
      const c = new THREE.Mesh(geo, curtain);
      c.position.set(x, 1.6, BZ + 0.16);
      c.castShadow = true;
      flowers.add(c, box(0.4, 0.07, 0.09, mat(0xffffff), x, 1.35, BZ + 0.22));
    }
    const flagCols = [0xff7fae, 0xffd36e, 0x7fd7ff, 0x9ee6cf, 0xc3a5ff];
    const n = 13;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const tri = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 3), mat(flagCols[i % flagCols.length]));
      tri.rotation.set(0, Math.PI / 6, Math.PI);
      tri.scale.z = 0.2;
      tri.position.set(WIN.x0 - 0.2 + u * (WIN.x1 - WIN.x0 + 0.4), WIN.y1 + 0.02 - Math.sin(u * Math.PI) * 0.3, BZ + 0.2);
      flowers.add(tri);
    }
    for (const [x, z] of [[2.95, -0.45], [-2.85, 0.42]] as const) {
      void this.placeModel(flowers, x > 0 ? 'furniture/plantSmall2.glb' : 'furniture/plantSmall1.glb', 0.5, x, COUNTER_Y, z);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture('🌷'), transparent: true, depthWrite: false }));
      sp.scale.setScalar(0.4);
      sp.position.set(x, COUNTER_Y + 0.62, z);
      flowers.add(sp);
    }
    this.addDecor('flowers', flowers);

    // nấc 2: dây đèn nháy viền cửa sổ + viền kệ bày món, chùm bóng bay hai đầu quầy
    const lights = new THREE.Group();
    const bulbCols = [0xffe066, 0xff7fae, 0x7fd7ff, 0x9effa8, 0xffa94d];
    const string = (pts: THREE.Vector3[], count: number) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      lights.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.01, 4), mat(0x3f6b3a)));
      for (let i = 0; i < count; i++) {
        const p = curve.getPoint(i / (count - 1));
        const col = bulbCols[(this.twinkles.length) % bulbCols.length];
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: col }));
        b.position.copy(p).add(new THREE.Vector3(0, -0.05, 0));
        b.userData.phase = this.twinkles.length * 0.7;
        b.userData.base = new THREE.Color(col);
        this.twinkles.push(b);
        lights.add(b);
      }
    };
    const z1 = BZ + 0.18;
    string([new THREE.Vector3(WIN.x0 - 0.1, WIN.y0 + 0.3, z1), new THREE.Vector3(WIN.x0 - 0.12, WIN.y1 + 0.18, z1), new THREE.Vector3(WCX, WIN.y1 + 0.32, z1), new THREE.Vector3(WIN.x1 + 0.12, WIN.y1 + 0.18, z1), new THREE.Vector3(WIN.x1 + 0.1, WIN.y0 + 0.3, z1)], 22);
    string([new THREE.Vector3(-2.15, 0.62, 1.67), new THREE.Vector3(-1, 0.56, 1.69), new THREE.Vector3(0, 0.6, 1.69), new THREE.Vector3(1, 0.56, 1.69), new THREE.Vector3(2.15, 0.62, 1.67)], 16);
    const balloonCols = [0xff6fa5, 0x6fc8ff, 0xffd84d, 0xa58bff, 0x7fe0a6, 0xff9f5a];
    const tie = [new THREE.Vector3(-2.3, COUNTER_Y + 0.7, 0.05), new THREE.Vector3(3.35, 0.72, -2.55)];
    for (let i = 0; i < 6; i++) {
      const anchor = tie[i % 2];
      const k = Math.floor(i / 2);
      const base = anchor.clone().add(new THREE.Vector3((k - 1) * 0.3 + (i % 2 ? -0.25 : 0.1), (i % 2 ? 1.25 : 0.95) + k * 0.22 + (k === 1 ? 0.18 : 0), -0.12 * k));
      const g = new THREE.Group();
      g.position.copy(base);
      const ballMat = new THREE.MeshStandardMaterial({ color: balloonCols[i], roughness: 0.25, metalness: 0 });
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 18), ballMat);
      ball.scale.y = 1.18;
      ball.castShadow = true;
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.07, 8), ballMat);
      knot.position.y = -0.3; knot.rotation.x = Math.PI;
      const len = base.y - anchor.y - 0.3;
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, len), mat(0xffffff));
      str.position.set((anchor.x - base.x) / 2, -0.32 - len / 2, (anchor.z - base.z) / 2);
      str.rotation.z = Math.atan2(base.x - anchor.x, len);
      g.add(ball, knot, str);
      g.userData.base = base;
      g.userData.phase = i * 1.3;
      this.balloons.push(g);
      lights.add(g);
    }
    this.addDecor('lights', lights);

    // nấc 3: bảng hiệu "Tiệm bánh Nhím" trên cửa sổ + tháp bánh kem trên quầy + dây sao trên kệ bánh mì
    const sign = new THREE.Group();
    const signTex = canvasTexture(1024, 224, (c) => {
      const g = c.createLinearGradient(0, 0, 1024, 0);
      g.addColorStop(0, '#ff7fae'); g.addColorStop(0.5, '#ffb35c'); g.addColorStop(1, '#ff7fae');
      c.fillStyle = g; c.beginPath(); c.roundRect(8, 8, 1008, 208, 100); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 14; c.stroke();
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '800 118px "Baloo 2", system-ui, sans-serif';
      c.lineWidth = 16; c.strokeStyle = 'rgba(122,40,80,.55)';
      c.strokeText('Tiệm bánh Nhím', 512, 122);
      c.fillStyle = '#fff';
      c.fillText('Tiệm bánh Nhím', 512, 122);
      c.font = '100px "Apple Color Emoji", sans-serif';
      c.fillText('🧁', 92, 116); c.fillText('🍩', 932, 116);
    });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.7), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
    board.position.set(WCX, WIN.y1 + 0.5, BZ + 0.08);
    sign.add(board);
    const stand = new THREE.Group();
    stand.position.set(2.2, COUNTER_Y, -0.32);
    for (const [r, y] of [[0.42, 0.02], [0.3, 0.36], [0.2, 0.68]] as const) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 28), mat(0xffffff, { rough: 0.3 }));
      p.position.y = y;
      stand.add(p);
    }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7), mat(PALETTE.gold, { rough: 0.3 }));
    pole.position.y = 0.36;
    stand.add(pole);
    void (async () => {
      const top = await this.itemMesh({ model: 'food/cake-birthday.glb' }, 0.34);
      top.position.y = 0.7;
      stand.add(top);
      for (let i = 0; i < 4; i++) {
        const cc = await this.itemMesh({ model: 'food/cupcake.glb' }, 0.17);
        const a = (i / 4) * Math.PI * 2 + 0.4;
        cc.position.set(Math.cos(a) * 0.2, 0.38, Math.sin(a) * 0.2);
        stand.add(cc);
      }
      for (let i = 0; i < 5; i++) {
        const cc = await this.itemMesh({ model: 'food/donut-sprinkles.glb' }, 0.17);
        const a = (i / 5) * Math.PI * 2;
        cc.position.set(Math.cos(a) * 0.3, 0.04, Math.sin(a) * 0.3);
        stand.add(cc);
      }
    })();
    sign.add(stand);
    const shelfX = (DOOR.x + DOOR.w / 2 + WIN.x0) / 2;
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(i % 2 ? '✨' : '⭐'), transparent: true, depthWrite: false }));
      sp.scale.setScalar(0.3);
      const u = i / 6;
      sp.position.set(DOOR.x - 0.6 + u * (shelfX + 0.7 - DOOR.x + 0.6), 2.84 - Math.sin(u * Math.PI) * 0.14, BZ + 0.15);
      sp.userData.phase = i;
      sign.add(sp);
    }
    this.addDecor('sign', sign);
  }

  private addDecor(id: DecorDef['id'], g: THREE.Group): void {
    g.visible = false;
    this.decor.set(id, g);
    this.root.add(g);
  }

  /** Bật nấc trang trí: animate = từng món nảy vào. Trả điểm giữa để bắn hạt. */
  async showDecor(id: DecorDef['id'], animate: boolean): Promise<THREE.Vector3> {
    const g = this.decor.get(id)!;
    g.visible = true;
    const center = id === 'flowers' ? new THREE.Vector3(WCX, 2.0, BZ + 0.5) : id === 'lights' ? new THREE.Vector3(0, 1.6, 0) : new THREE.Vector3(WCX, 2.9, BZ + 0.5);
    if (animate) {
      const kids = g.children.slice();
      const scales = kids.map((k) => k.scale.clone());
      kids.forEach((k) => k.scale.setScalar(0.001));
      await Promise.all(kids.map((k, i) => new Promise<void>((res) => setTimeout(() => {
        void tween(520, (t) => k.scale.copy(scales[i]).multiplyScalar(Math.max(0.001, t)), easeOutBack).then(res);
      }, i * 22))));
    }
    return center;
  }

  /** Mở / đóng cửa ra vào. */
  async openDoor(open: boolean): Promise<void> {
    const from = this.doorHinge.rotation.y;
    const to = open ? -1.3 : 0;
    if (open) this.bellSwing = 1;
    await tween(open ? 420 : 520, (t) => { this.doorHinge.rotation.y = from + (to - from) * t; }, easeOutQuad);
  }

  ringBell(): void { this.bellSwing = 1; }

  update(dt: number): void {
    this.t += dt;
    const t = this.t;
    for (const l of this.lamps) l.rotation.z = Math.sin(t * 0.9 + l.userData.phase) * 0.035;
    if (this.bellSwing > 0.01) {
      this.bellSwing *= Math.exp(-dt * 1.6);
      this.bell.rotation.z = Math.sin(t * 16) * 0.5 * this.bellSwing;
    } else this.bell.rotation.z = 0;
    if (this.decor.get('lights')?.visible) {
      for (const b of this.twinkles) {
        const k = 0.55 + 0.45 * Math.max(0, Math.sin(t * 2.4 + b.userData.phase));
        (b.material as THREE.MeshBasicMaterial).color.copy(b.userData.base as THREE.Color).multiplyScalar(k + 0.25);
      }
      for (const g of this.balloons) {
        const base = g.userData.base as THREE.Vector3;
        g.position.y = base.y + Math.sin(t * 1.2 + g.userData.phase) * 0.06;
        g.rotation.z = Math.sin(t * 0.8 + g.userData.phase) * 0.05;
      }
    }
    const sign = this.decor.get('sign');
    if (sign?.visible) for (const k of sign.children) if ((k as THREE.Sprite).isSprite) k.scale.setScalar(0.28 + 0.06 * Math.sin(t * 3 + k.userData.phase));
  }
}
