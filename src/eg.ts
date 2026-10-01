// Khách Equestria Girls (VRoid, Sketchfab bordiyan20035): có xương J_Bip_* nhưng KHÔNG có clip.
// Mọi động tác dựng bằng code theo tên xương: hạ tay từ T-pose, đi (đùi + gối + vung tay + nhún),
// đứng thở, vẫy tay phải, giơ hai tay mừng, đưa tay ra trước (nhận hàng), gật đầu khi nói, ngó nghiêng.
// Xoay theo trục của KHUNG NHÂN VẬT (x ngang, y lên, z trước) → độc lập với hướng xương local của FBX.
import * as THREE from 'three';
import { Actor, Cat } from './actors.ts';
import type { CustomerDef } from './data.ts';
import { instance, fitHeight, nameTag } from './assets.ts';
import { wait } from './tween.ts';

type Gesture = 'wave' | 'cheer' | 'interact' | 'think';
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const GESTURE_MS: Record<Gesture, number> = { wave: 1800, cheer: 1500, interact: 1100, think: 1400 };

interface Drive { bone: THREE.Object3D; base: THREE.Quaternion }

export class EGActor extends Actor {
  private bones = new Map<string, Drive>();
  /** dấu hướng trước của model (+1 nhìn +z) */
  private fwd = 1;
  /** bên x của tay/chân trái, phải (theo vị trí xương) */
  private sideL = 1;
  private sideR = -1;
  private walkK = 0;
  private walkPhase = 0;
  private gesture: Gesture | null = null;
  private gestureW = 0;
  private gestureT = 0;
  private readonly qa = new THREE.Quaternion();
  private readonly qp = new THREE.Quaternion();
  private readonly qi = new THREE.Quaternion();
  /** ôm thùng hàng: hai tay đưa ra trước (giữ suốt lúc đi) */
  carry = false;
  private carryW = 0;

  async load(): Promise<void> {
    const { obj } = await instance(this.def.model, { skinned: true });
    fitHeight(obj, this.def.height);
    this.body.add(obj);
    obj.updateMatrixWorld(true);
    const find = (re: RegExp) => { let f: THREE.Object3D | null = null; obj.traverse((o) => { if (!f && re.test(o.name)) f = o; }); return f as THREE.Object3D | null; };
    const names: Record<string, RegExp> = {
      hips: /^J_Bip_C_Hips/, spine: /^J_Bip_C_Spine/, chest: /^J_Bip_C_UpperChest/, neck: /^J_Bip_C_Neck/, head: /^J_Bip_C_Head/,
      armL: /^J_Bip_L_UpperArm/, foreL: /^J_Bip_L_LowerArm/, handL: /^J_Bip_L_Hand_/, armR: /^J_Bip_R_UpperArm/, foreR: /^J_Bip_R_LowerArm/, handR: /^J_Bip_R_Hand_/,
      legL: /^J_Bip_L_UpperLeg/, kneeL: /^J_Bip_L_LowerLeg/, legR: /^J_Bip_R_UpperLeg/, kneeR: /^J_Bip_R_LowerLeg/,
      footL: /^J_Bip_L_Foot/, toeL: /^J_Bip_L_ToeBase_\d+$/,
    };
    for (const [k, re] of Object.entries(names)) {
      const b = find(re);
      if (b) this.bones.set(k, { bone: b, base: b.quaternion.clone() });
    }
    const wp = (k: string) => this.bones.get(k)!.bone.getWorldPosition(new THREE.Vector3());
    if (this.bones.has('toeL') && this.bones.has('footL')) this.fwd = Math.sign(wp('toeL').z - wp('footL').z) || 1;
    if (this.bones.has('armL')) this.sideL = Math.sign(wp('foreL').x) || 1;
    this.sideR = -this.sideL;
    // T-pose → hạ hai tay xuôi theo người, khuỷu hơi cong (thành tư thế gốc)
    for (const [arm, fore, side] of [['armL', 'foreL', this.sideL], ['armR', 'foreR', this.sideR]] as const) {
      const a = this.bones.get(arm), f = this.bones.get(fore);
      if (!a || !f) continue;
      this.rotate(a.bone, a.base, Z, -side * 1.22);
      a.base.copy(a.bone.quaternion);
      this.rotate(f.bone, f.base, X, -this.fwd * 0.18);
      f.base.copy(f.bone.quaternion);
    }
    this.head = null; // đầu do rig này lo (không dùng applyHead của Actor)
    this.walkRef = 1.2;
    const [name, sub] = this.def.name.split('|');
    this.tag = nameTag(name, this.def.color, 0.3, sub ?? this.def.sub);
    this.tagHeight = this.def.height + 0.4;
    this.tag.position.y = this.tagHeight;
    this.root.add(this.tag);
  }

  /** Quaternion của o trong khung nhân vật (this.body), nhân dồn local từ o lên. */
  private modelQ(o: THREE.Object3D | null, out: THREE.Quaternion): THREE.Quaternion {
    out.identity();
    for (let n = o; n && n !== this.body; n = n.parent) out.premultiply(n.quaternion);
    return out;
  }

  /** Đặt xương = base rồi xoay thêm `angle` quanh trục `axis` của khung nhân vật. */
  private rotate(bone: THREE.Object3D, base: THREE.Quaternion, axis: THREE.Vector3, angle: number): void {
    this.modelQ(bone.parent, this.qp);
    this.qi.copy(this.qp).invert();
    this.qa.setFromAxisAngle(axis, angle);
    bone.quaternion.copy(this.qi).multiply(this.qa).multiply(this.qp).multiply(base);
  }
  /** Xoay thêm (cộng dồn lên quaternion hiện tại). */
  private add(bone: THREE.Object3D, axis: THREE.Vector3, angle: number): void {
    if (Math.abs(angle) < 1e-5) return;
    this.rotate(bone, bone.quaternion.clone(), axis, angle);
  }

  play(key: string): number {
    if (key === 'walk') return 0;
    if (key === 'wave' || key === 'cheer' || key === 'interact' || key === 'think') { void this.once(key); return GESTURE_MS[key] / 1000; }
    return 0;
  }

  async once(key: string): Promise<void> {
    const g: Gesture = key === 'cheer' || key === 'dance' || key === 'yes' ? 'cheer' : key === 'interact' ? 'interact' : key === 'think' || key === 'no' ? 'think' : 'wave';
    this.gesture = g;
    this.gestureT = 0;
    const my = g;
    await wait(GESTURE_MS[g]);
    if (this.gesture === my) this.gesture = null;
  }

  update(dt: number): void {
    super.update(dt);
    const t = this.t;
    const moving = this.walking ? 1 : 0;
    this.walkK += (moving - this.walkK) * Math.min(1, dt * 6);
    this.walkPhase += dt * 8.2 * (this.speed / 1.2);
    const target = this.gesture ? 1 : 0;
    this.gestureW += (target - this.gestureW) * Math.min(1, dt * 7);
    this.gestureT += dt;
    const k = this.walkK, w = this.walkPhase, f = this.fwd;
    const B = (n: string) => this.bones.get(n);
    // về tư thế gốc
    for (const d of this.bones.values()) d.bone.quaternion.copy(d.base);
    // đi: đùi vung, gối gập một chiều, tay vung ngược chân, người nhún
    const legL = B('legL'), legR = B('legR'), kneeL = B('kneeL'), kneeR = B('kneeR');
    if (legL && legR) {
      this.rotate(legL.bone, legL.base, X, -f * Math.sin(w) * 0.42 * k);
      this.rotate(legR.bone, legR.base, X, f * Math.sin(w) * 0.42 * k);
    }
    if (kneeL && kneeR) {
      this.rotate(kneeL.bone, kneeL.base, X, f * Math.max(0, Math.sin(w + 1.6)) * 0.7 * k);
      this.rotate(kneeR.bone, kneeR.base, X, f * Math.max(0, Math.sin(w + 1.6 + Math.PI)) * 0.7 * k);
    }
    this.body.position.y = Math.abs(Math.sin(w)) * 0.035 * k;
    // tay: vung khi đi + đung đưa khi đứng
    const armL = B('armL'), armR = B('armR'), foreL = B('foreL'), foreR = B('foreR');
    const sway = Math.sin(t * 1.3) * 0.04 * (1 - k);
    if (armL) this.rotate(armL.bone, armL.base, X, f * Math.sin(w) * 0.32 * k);
    if (armR) this.rotate(armR.bone, armR.base, X, -f * Math.sin(w) * 0.32 * k);
    if (armL) this.add(armL.bone, Z, this.sideL * sway);
    if (armR) this.add(armR.bone, Z, -this.sideR * sway);
    // thở + lắc người nhẹ
    const spine = B('spine'), chest = B('chest'), head = B('head'), neck = B('neck');
    if (spine) this.rotate(spine.bone, spine.base, X, -f * (0.02 + Math.sin(t * 1.6) * 0.018) * (1 - k) + f * 0.05 * k);
    if (chest) this.rotate(chest.bone, chest.base, Z, Math.sin(t * 0.7) * 0.03 * (1 - k));
    // cử chỉ
    const gw = this.gestureW, gt = this.gestureT, g = this.gesture;
    if (gw > 0.01 && armR && foreR) {
      if (g === 'wave' || (!g && this.lastGesture === 'wave')) {
        this.add(armR.bone, Z, this.sideR * 2.35 * gw);
        this.add(armR.bone, X, -f * 0.25 * gw);
        this.add(foreR.bone, Z, this.sideR * (0.35 + Math.sin(gt * 11) * 0.45) * gw);
      } else if (g === 'cheer' || (!g && this.lastGesture === 'cheer')) {
        const bounce = Math.sin(gt * 9) * 0.18;
        this.add(armR.bone, Z, this.sideR * (2.5 + bounce) * gw);
        if (armL && foreL) { this.add(armL.bone, Z, this.sideL * (2.5 - bounce) * gw); this.add(foreL.bone, Z, this.sideL * 0.3 * gw); }
        this.add(foreR.bone, Z, this.sideR * 0.3 * gw);
      } else if (g === 'interact' || (!g && this.lastGesture === 'interact')) {
        this.add(armR.bone, X, -f * 1.15 * gw);
        if (armL) this.add(armL.bone, X, -f * 1.05 * gw);
        this.add(foreR.bone, X, -f * 0.25 * gw);
      } else if (g === 'think' || (!g && this.lastGesture === 'think')) {
        // tay phải lên cằm, nghiêng đầu
        this.add(armR.bone, X, -f * 0.55 * gw);
        this.add(armR.bone, Z, this.sideR * 0.25 * gw);
        this.add(foreR.bone, X, -f * 1.9 * gw);
      }
    }
    if (g) this.lastGesture = g;
    this.carryW += ((this.carry ? 1 : 0) - this.carryW) * Math.min(1, dt * 6);
    if (this.carryW > 0.01 && armR && armL && foreR && foreL) {
      const cw = this.carryW;
      this.add(armR.bone, X, -f * 0.95 * cw); this.add(armL.bone, X, -f * 0.95 * cw);
      this.add(armR.bone, Z, -this.sideR * 0.25 * cw); this.add(armL.bone, Z, -this.sideL * 0.25 * cw);
      this.add(foreR.bone, X, -f * 0.5 * cw); this.add(foreL.bone, X, -f * 0.5 * cw);
    }
    // đầu: ngó nghiêng + gật khi nói + nghiêng khi nghĩ
    if (head) {
      const nod = this.talking ? Math.sin(t * 9) * 0.08 : 0;
      this.rotate(head.bone, head.base, X, f * (nod + Math.sin(t * 0.9) * 0.02));
      this.add(head.bone, Y, this.look + Math.sin(t * 0.5) * 0.06 * (1 - k));
      if (g === 'think') this.add(head.bone, Z, 0.18 * gw);
    }
    if (neck) this.rotate(neck.bone, neck.base, Y, this.look * 0.3);
  }
  private lastGesture: Gesture | null = null;
}

/** Dựng actor theo loại khách. */
export async function makeActor(def: CustomerDef): Promise<Actor> {
  const a = def.kind === 'cat' ? new Cat(def) : new EGActor(def);
  await a.load();
  return a;
}
