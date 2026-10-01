// Nhân vật "sống": lớp Actor chung (đi theo đường, quay mượt, nhảy, gật khi nói) + mèo (Quaternius cat, đuôi dựng bằng code).
// Người (Equestria Girls, không có clip) ở src/eg.ts.
// Lớp clip + lớp code: đi theo đường (quay mượt), vẫy, nhún nhảy mừng, gật đầu khi nói, ngó nghiêng khi chờ,
// thở nhẹ khi đứng. Mọi chuyển clip crossfade, mọi xoay lerp → không giật.
import * as THREE from 'three';
import { instance, fitHeight, findClip, nameTag } from './assets.ts';
import { wait } from './tween.ts';
import type { CustomerDef } from './data.ts';

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

