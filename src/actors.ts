// Nhân vật "sống": người nhà (Quaternius CC0: Idle / Walk / Wave / Interact) và mèo (Quaternius cat, đuôi dựng bằng code).
// Lớp clip + lớp code: đi theo đường (quay mượt), vẫy, nhún nhảy mừng, gật đầu khi nói, ngó nghiêng khi chờ,
// thở nhẹ khi đứng. Mọi chuyển clip crossfade, mọi xoay lerp → không giật.
import * as THREE from 'three';
import { instance, fitHeight, findClip, nameTag } from './assets.ts';
import { wait } from './tween.ts';
import type { CustomerDef, Prop } from './data.ts';

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Yaw để nhìn từ `from` về `to` (mặt model = +z). */
export function yawTo(from: THREE.Vector3, to: THREE.Vector3): number {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

export abstract class Actor {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  protected mixer: THREE.AnimationMixer | null = null;
  protected actions = new Map<string, THREE.AnimationAction>();
  protected current: THREE.AnimationAction | null = null;
  yaw = 0;
  targetYaw = 0;
  /** đang đi: điểm đến + tốc độ */
  private path: THREE.Vector3[] = [];
  private walkResolve: (() => void) | null = null;
  speed = 1.1;
  /** nhảy / nảy (m) cộng vào y */
  hopY = 0;
  baseY = 0;
  protected t = Math.random() * 10;
  tag: THREE.Sprite | null = null;
  tagHeight = 2;
  /** đang nói: gật đầu nhẹ */
  talking = false;
  /** ngó nghiêng (rad, cộng vào đầu) */
  protected look = 0;
  protected lookTarget = 0;
  protected head: THREE.Object3D | null = null;
  protected headBase = new THREE.Quaternion();

  readonly def: CustomerDef;
  constructor(def: CustomerDef) {
    this.def = def;
    this.root.add(this.body);
  }

  abstract load(): Promise<void>;

  protected setupMixer(model: THREE.Object3D, clips: THREE.AnimationClip[], names: Record<string, string>): void {
    this.mixer = new THREE.AnimationMixer(model);
    for (const [key, name] of Object.entries(names)) {
      const c = findClip(clips, name);
      if (!c) continue;
      const a = this.mixer.clipAction(c);
      this.actions.set(key, a);
    }
  }

  /** Chạy clip lặp (idle/walk) hoặc 1 lần rồi về idle. Trả thời lượng (s). */
  play(key: string, opts: { once?: boolean; fade?: number; timeScale?: number } = {}): number {
    const a = this.actions.get(key);
    if (!a) return 0;
    const fade = opts.fade ?? 0.25;
    a.reset();
    a.timeScale = opts.timeScale ?? 1;
    a.setEffectiveWeight(1);
    if (opts.once) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } else a.setLoop(THREE.LoopRepeat, Infinity);
    if (this.current && this.current !== a) this.current.fadeOut(fade);
    a.fadeIn(fade).play();
    this.current = a;
    return a.getClip().duration / (opts.timeScale ?? 1);
  }

  /** Clip 1 lần rồi tự về idle. Resolve khi gần xong. */
  async once(key: string, timeScale = 1): Promise<void> {
    const d = this.play(key, { once: true, timeScale });
    if (!d) return;
    await wait(Math.max(200, d * 1000 - 250));
    if (this.current === this.actions.get(key)) this.play(this.path.length ? 'walk' : 'idle', { fade: 0.3 });
  }

  /** Đi qua các điểm (sàn), xong thì đứng idle. */
  walkTo(points: THREE.Vector3[], speed = this.speed): Promise<void> {
    this.walkResolve?.();
    this.path = points.map((p) => p.clone());
    this.speed = speed;
    this.play('walk', { fade: 0.2, timeScale: speed / this.walkRef });
    return new Promise((r) => { this.walkResolve = r; });
  }
  /** tốc độ đi chuẩn của clip walk (m/s) để chân không trượt */
  protected walkRef = 1.1;

  get walking(): boolean { return this.path.length > 0; }

  setPos(p: THREE.Vector3): void { this.root.position.copy(p); this.baseY = p.y; }

  face(yaw: number): void { this.targetYaw = yaw; }
  faceCamera(): void { this.targetYaw = 0; }

  /** Nhảy mừng n lần (code, cộng lên clip). */
  async hop(n = 2, h = 0.35): Promise<void> {
    for (let i = 0; i < n; i++) {
      const d = 0.42;
      const start = performance.now();
      await new Promise<void>((res) => {
        const tick = () => {
          const k = Math.min(1, (performance.now() - start) / (d * 1000));
          this.hopY = Math.sin(k * Math.PI) * h;
          if (k < 1) requestAnimationFrame(tick); else { this.hopY = 0; res(); }
        };
        tick();
      });
    }
  }

  setLook(rad: number): void { this.lookTarget = rad; }

  update(dt: number): void {
    this.t += dt;
    this.mixer?.update(dt);
    // đi theo đường
    if (this.path.length) {
      const target = this.path[0];
      const p = this.root.position;
      const dx = target.x - p.x, dz = target.z - p.z;
      const dist = Math.hypot(dx, dz);
      const step = this.speed * dt;
      if (dist <= step) {
        p.x = target.x; p.z = target.z;
        this.path.shift();
        if (!this.path.length) {
          this.play('idle', { fade: 0.3 });
          const r = this.walkResolve; this.walkResolve = null; r?.();
        }
      } else {
        p.x += (dx / dist) * step; p.z += (dz / dist) * step;
        this.targetYaw = Math.atan2(dx, dz);
      }
    }
    const turn = this.path.length ? 6 : 4;
    this.yaw += wrapAngle(this.targetYaw - this.yaw) * Math.min(1, dt * turn);
    this.root.rotation.y = this.yaw;
    this.root.position.y = this.baseY + this.hopY;
    this.look += (this.lookTarget - this.look) * Math.min(1, dt * 3);
    if (this.tag) this.tag.position.y = this.tagHeight + Math.sin(this.t * 2.2) * 0.03;
  }

  /** Lớp code đè lên xương đầu sau mixer: ngó nghiêng + gật khi nói. */
  protected applyHead(nodAxis: 'x' | 'z' = 'x'): void {
    if (!this.head) return;
    const nod = this.talking ? Math.sin(this.t * 9) * 0.07 : 0;
    const e = new THREE.Euler(nodAxis === 'x' ? nod : 0, this.look, nodAxis === 'z' ? nod : 0);
    this.head.quaternion.multiply(new THREE.Quaternion().setFromEuler(e));
  }

  dispose(): void {
    this.mixer?.stopAllAction();
    this.root.removeFromParent();
  }
}

// ------------------------------------------------------------------ người
export class Human extends Actor {
  private chest: THREE.Object3D | null = null;

  async load(): Promise<void> {
    const { obj, clips } = await instance(this.def.model, { tint: this.def.tint, skinned: true });
    fitHeight(obj, this.def.height);
    this.body.add(obj);
    this.setupMixer(obj, clips, { idle: 'Idle', walk: 'Walk', wave: 'Wave', interact: 'Interact', idle2: 'Idle_Neutral', run: 'Run' });
    this.walkRef = 1.25;
    obj.traverse((o) => {
      if (o.name === 'Head' && !this.head) this.head = o;
      if (o.name === 'Chest' && !this.chest) this.chest = o;
    });
    this.play('idle');
    this.mixer!.update(0);
    obj.updateMatrixWorld(true);
    this.addProps(obj, this.def.props);
    this.tag = nameTag(this.def.name, this.def.color, 0.3);
    this.tagHeight = this.def.height + 0.38;
    this.tag.position.y = this.tagHeight;
    this.root.add(this.tag);
  }

  /** Phụ kiện gắn vào xương đầu: kính, mũ, búi tóc, nơ, kẹp hoa. Đặt theo hộp bao lưới đầu ở tư thế idle. */
  private addProps(obj: THREE.Object3D, props: Prop[]): void {
    if (!this.head || !props.length) return;
    // lưới đầu bị tách theo material (Casual_Head_0.._4): gộp hộp bao của mọi mảnh
    const hb = new THREE.Box3();
    obj.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && (/head/i.test(o.name) || /head/i.test(o.parent?.name ?? ''))) hb.union(new THREE.Box3().setFromObject(o, true));
    });
    if (hb.isEmpty()) return;
    // khung toạ độ thế giới tạm thời (root ở gốc, quay 0): mặt nhìn +z
    const size = hb.getSize(new THREE.Vector3());
    const c = hb.getCenter(new THREE.Vector3());
    const W = size.x;
    const headWorld = this.head.matrixWorld.clone();
    const inv = headWorld.clone().invert();
    const attach = (m: THREE.Object3D, pos: THREE.Vector3) => {
      // world (vị trí + scale 1, hướng theo root) → hệ toạ độ xương đầu
      const world = new THREE.Matrix4().compose(pos, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      const local = inv.clone().multiply(world);
      local.decompose(m.position, m.quaternion, m.scale);
      this.head!.add(m);
    };
    for (const p of props) {
      if (p === 'glasses') {
        const g = new THREE.Group();
        const fm = new THREE.MeshStandardMaterial({ color: 0x5a3b2e, roughness: 0.4 });
        const lens = new THREE.MeshBasicMaterial({ color: 0xe8f7ff, transparent: true, opacity: 0.35 });
        const r = W * 0.125;
        for (const s of [-1, 1]) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.16, 8, 24), fm);
          ring.position.x = s * r * 1.15;
          const l = new THREE.Mesh(new THREE.CircleGeometry(r, 20), lens);
          l.position.x = s * r * 1.15;
          g.add(ring, l);
        }
        const bridge = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.12, r * 0.12, r * 0.5), fm);
        bridge.rotation.z = Math.PI / 2;
        g.add(bridge);
        attach(g, new THREE.Vector3(c.x, c.y - size.y * 0.02, hb.max.z + r * 0.15));
      } else if (p === 'cap') {
        const g = new THREE.Group();
        const cm = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 });
        const dome = new THREE.Mesh(new THREE.SphereGeometry(W * 0.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), cm);
        dome.scale.y = 0.55;
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(W * 0.36, W * 0.36, W * 0.04, 24, 1, false, -Math.PI / 2, Math.PI), cm);
        brim.position.set(0, 0, W * 0.38);
        brim.scale.z = 0.7;
        const band = new THREE.Mesh(new THREE.CylinderGeometry(W * 0.605, W * 0.605, W * 0.08, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.9 }));
        band.position.y = W * 0.04;
        g.add(dome, brim, band);
        g.traverse((o) => { (o as THREE.Mesh).castShadow = true; });
        attach(g, new THREE.Vector3(c.x, hb.max.y - size.y * 0.26, c.z - W * 0.04));
      } else if (p === 'bun') {
        const hair = this.def.tint.Red ?? this.def.tint.Hair ?? 0xdedae6;
        const bun = new THREE.Mesh(new THREE.SphereGeometry(W * 0.26, 18, 14), new THREE.MeshStandardMaterial({ color: hair, roughness: 0.9 }));
        bun.castShadow = true;
        attach(bun, new THREE.Vector3(c.x, hb.max.y - size.y * 0.12, hb.min.z + W * 0.12));
        const pin = new THREE.Mesh(new THREE.SphereGeometry(W * 0.07, 10, 8), new THREE.MeshStandardMaterial({ color: 0xb48cff, roughness: 0.4 }));
        attach(pin, new THREE.Vector3(c.x + W * 0.2, hb.max.y - size.y * 0.1, hb.min.z + W * 0.12));
      } else if (p === 'bow') {
        const g = new THREE.Group();
        const bm = new THREE.MeshStandardMaterial({ color: 0xff4f9a, roughness: 0.6 });
        for (const s of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.ConeGeometry(W * 0.18, W * 0.34, 12), bm);
          wing.rotation.z = s * Math.PI / 2;
          wing.position.x = s * W * 0.17;
          g.add(wing);
        }
        g.add(new THREE.Mesh(new THREE.SphereGeometry(W * 0.085, 10, 8), bm));
        g.rotation.z = 0.3;
        attach(g, new THREE.Vector3(c.x + W * 0.3, hb.max.y - size.y * 0.08, c.z + W * 0.05));
      } else if (p === 'headband') {
        const g = new THREE.Group();
        const pm = new THREE.MeshStandardMaterial({ color: 0xffe14d, roughness: 0.6 });
        for (let i = 0; i < 5; i++) {
          const petal = new THREE.Mesh(new THREE.SphereGeometry(W * 0.1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff6f91, roughness: 0.6 }));
          const a = (i / 5) * Math.PI * 2;
          petal.position.set(Math.cos(a) * W * 0.11, Math.sin(a) * W * 0.11, 0);
          g.add(petal);
        }
        g.add(new THREE.Mesh(new THREE.SphereGeometry(W * 0.08, 10, 8), pm));
        attach(g, new THREE.Vector3(c.x - W * 0.34, hb.max.y - size.y * 0.16, c.z + W * 0.12));
      }
    }
  }

  update(dt: number): void {
    super.update(dt);
    // thở + lắc nhẹ khi đứng (cộng lên idle cho đỡ "tượng")
    if (this.chest && !this.walking) this.chest.rotation.z += Math.sin(this.t * 1.3) * 0.02;
    this.applyHead('x');
  }
}

// ------------------------------------------------------------------ mèo
export class Cat extends Actor {
  private tail = new THREE.Group();
  private tailSegs: THREE.Mesh[] = [];
  /** ngủ (bậu cửa): thở chậm, đuôi phe phẩy chậm */
  sleeping = false;
  private zzz: THREE.Sprite | null = null;

  async load(): Promise<void> {
    const { obj, clips } = await instance(this.def.model, { tint: this.def.tint, skinned: true });
    fitHeight(obj, this.def.height);
    this.body.add(obj);
    this.setupMixer(obj, clips, { idle: 'Idle', walk: 'Walk', jump: 'Jump', dance: 'Dance', yes: 'Yes', no: 'No', bite: 'Bite_Front' });
    this.walkRef = 0.75;
    this.speed = 0.85;
    obj.traverse((o) => { if (o.name === 'Head' && !this.head) this.head = o; });
    this.play('idle');
    this.mixer!.update(0);
    obj.updateMatrixWorld(true);
    // đuôi: 6 đốt cầu thu nhỏ dần, cong lên; vẫy bằng code
    const box = new THREE.Box3().setFromObject(obj, true);
    const size = box.getSize(new THREE.Vector3());
    const col = this.def.tint.Cat_Main ?? 0x888888;
    const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 });
    this.tail.position.set(0, size.y * 0.3, box.min.z + size.z * 0.08);
    let parent: THREE.Object3D = this.tail;
    for (let i = 0; i < 6; i++) {
      const r = size.x * (0.11 - i * 0.011);
      const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), i === 5 ? new THREE.MeshStandardMaterial({ color: this.def.tint.Cat_Secondary ?? col, roughness: 0.85 }) : m);
      seg.scale.z = 1.5;
      seg.castShadow = true;
      const holder = new THREE.Group();
      holder.position.set(0, i === 0 ? 0 : r * 1.1, i === 0 ? 0 : -r * 1.4);
      holder.add(seg);
      parent.add(holder);
      parent = holder;
      this.tailSegs.push(seg);
    }
    this.body.add(this.tail);
    this.tag = nameTag(this.def.name, this.def.color, 0.24);
    this.tagHeight = this.def.height + 0.3;
    this.tag.position.y = this.tagHeight;
    this.tag.visible = false;
    this.root.add(this.tag);
  }

  showTag(on: boolean): void { if (this.tag) this.tag.visible = on; }

  setSleeping(on: boolean): void {
    this.sleeping = on;
    if (on) {
      this.play('idle', { timeScale: 0.35 });
      if (!this.zzz) {
        const c = document.createElement('canvas');
        c.width = 128; c.height = 128;
        const ctx = c.getContext('2d')!;
        ctx.font = '800 70px "Baloo 2", sans-serif';
        ctx.fillStyle = '#7b6cff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 8;
        ctx.strokeText('z', 20, 100); ctx.fillText('z', 20, 100);
        ctx.font = '800 48px "Baloo 2", sans-serif';
        ctx.strokeText('z', 74, 50); ctx.fillText('z', 74, 50);
        const tex = new THREE.CanvasTexture(c);
        this.zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
        this.zzz.scale.setScalar(0.3);
        this.root.add(this.zzz);
      }
      this.zzz.visible = true;
    } else {
      if (this.zzz) this.zzz.visible = false;
      this.play('idle');
    }
  }

  update(dt: number): void {
    super.update(dt);
    const sp = this.sleeping ? 1.6 : this.walking ? 7 : 3.2;
    const amp = this.sleeping ? 0.18 : this.walking ? 0.22 : 0.32;
    this.tail.rotation.x = -0.55;
    this.tailSegs.forEach((s, i) => {
      const h = s.parent!;
      h.rotation.y = Math.sin(this.t * sp - i * 0.6) * amp;
      h.rotation.x = -0.18;
    });
    if (this.sleeping) {
      this.body.scale.y = 1 + Math.sin(this.t * 1.6) * 0.025;
      if (this.zzz) {
        const k = (this.t * 0.5) % 1;
        this.zzz.position.set(0.15 + k * 0.1, this.def.height + 0.1 + k * 0.35, 0.1);
        (this.zzz.material as THREE.SpriteMaterial).opacity = Math.sin(k * Math.PI);
      }
    } else this.body.scale.y = 1;
    this.applyHead('z');
  }
}

export async function makeActor(def: CustomerDef): Promise<Actor> {
  const a = def.kind === 'cat' ? new Cat(def) : new Human(def);
  await a.load();
  return a;
}
