// Kho asset: tải GLB (cache), clone có xương, ép metalness 0 (glTF mặc định 1 → đen), đổi màu theo material,
// fit kích thước, texture emoji / chữ (bảng tên).
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export interface Instance { obj: THREE.Object3D; clips: THREE.AnimationClip[] }

const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();
const fixed = new Map<THREE.Material, THREE.Material>();

export function loadGLB(name: string): Promise<GLTF> {
  let p = cache.get(name);
  if (!p) {
    p = loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}`);
    p.catch(() => cache.delete(name)); // lỗi mạng: lần sau thử lại
    cache.set(name, p);
  }
  return p;
}

export function prefetch(names: string[]): Promise<unknown> {
  return Promise.all([...new Set(names)].map((n) => loadGLB(n).catch((e) => console.warn('[assets] lỗi tải', n, e))));
}

/** Kenney / Quaternius: metalness 0, roughness ≥ 0.55 cho màu pastel tươi. Material sửa dùng chung giữa các clone. */
export function fixMaterial(mat: THREE.Material): THREE.Material {
  let out = fixed.get(mat);
  if (!out) {
    const m = mat.clone() as THREE.MeshStandardMaterial;
    if ('metalness' in m) { m.metalness = 0; m.roughness = Math.max(0.6, m.roughness ?? 1); }
    out = m;
    fixed.set(mat, out);
    fixed.set(out, out);
  }
  return out;
}

export interface InstanceOpts {
  /** đổi màu theo tên material (riêng cho instance này) */
  tint?: Record<string, number>;
  castShadow?: boolean;
  /** skinned mesh: tắt frustum culling (bbox bind-pose sai khi chạy clip) */
  skinned?: boolean;
}

export async function instance(name: string, opts: InstanceOpts = {}): Promise<Instance> {
  const gltf = await loadGLB(name);
  const obj = opts.skinned ? SkeletonUtils.clone(gltf.scene) : gltf.scene.clone(true);
  const tinted = new Map<THREE.Material, THREE.Material>();
  const swap = (m0: THREE.Material): THREE.Material => {
    const m = fixMaterial(m0);
    const hex = opts.tint?.[m0.name];
    if (hex === undefined) return m;
    let c = tinted.get(m);
    if (!c) {
      c = m.clone();
      (c as THREE.MeshStandardMaterial).color.setHex(hex);
      tinted.set(m, c);
    }
    return c;
  };
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = opts.castShadow ?? true;
    mesh.receiveShadow = false;
    if (opts.skinned) mesh.frustumCulled = false;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
  });
  return { obj, clips: gltf.animations };
}

/** Scale để cạnh lớn nhất = size, đáy chạm y=0, tâm x/z về 0. Trả Group bọc ngoài. */
export function fitSize(obj: THREE.Object3D, size: number): THREE.Group {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj, true);
  const s = box.getSize(new THREE.Vector3());
  const k = size / Math.max(s.x, s.y, s.z, 1e-4);
  obj.scale.multiplyScalar(k);
  obj.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(obj, true);
  const c = b2.getCenter(new THREE.Vector3());
  obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= b2.min.y;
  const g = new THREE.Group();
  g.add(obj);
  return g;
}

/** Scale theo chiều cao, chân chạm y=0. Trả hệ số scale. */
export function fitHeight(obj: THREE.Object3D, height: number): number {
  obj.updateMatrixWorld(true);
  obj.traverse((o) => { const sm = o as THREE.SkinnedMesh; if (sm.isSkinnedMesh) sm.computeBoundingBox(); });
  const box = new THREE.Box3().setFromObject(obj, true);
  const k = height / Math.max(box.getSize(new THREE.Vector3()).y, 1e-4);
  obj.scale.multiplyScalar(k);
  obj.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(obj, true);
  const c = b2.getCenter(new THREE.Vector3());
  obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= b2.min.y;
  return k;
}

export function findClip(clips: THREE.AnimationClip[], name: string): THREE.AnimationClip | undefined {
  return clips.find((c) => c.name === name) ?? clips.find((c) => c.name.endsWith('|' + name)) ?? clips.find((c) => c.name.toLowerCase().includes(name.toLowerCase()));
}

const emojiTex = new Map<string, THREE.CanvasTexture>();
export function emojiTexture(emoji: string): THREE.CanvasTexture {
  let tex = emojiTex.get(emoji);
  if (!tex) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.font = '200px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 128, 140);
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    emojiTex.set(emoji, tex);
  }
  return tex;
}

export function emojiSprite(emoji: string, size = 1): THREE.Sprite {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji), transparent: true, depthWrite: false }));
  sp.scale.setScalar(size);
  return sp;
}

/** Bảng tên: viên thuốc màu + chữ trắng viền. Trả sprite (rộng theo chữ, cao = h mét). */
export function nameTag(text: string, color: string, h = 0.26): THREE.Sprite {
  const font = '800 64px "Baloo 2", "Nunito", system-ui, sans-serif';
  const c = document.createElement('canvas');
  const ctx0 = c.getContext('2d')!;
  ctx0.font = font;
  const w = Math.ceil(ctx0.measureText(text).width) + 72;
  c.width = w; c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  const r = 44;
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, 88, r);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(74,44,74,.55)';
  ctx.strokeText(text, w / 2, 52);
  ctx.fillText(text, w / 2, 52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sp.scale.set((h * w) / 96, h, 1);
  sp.renderOrder = 20;
  return sp;
}

/** Texture canvas tự vẽ (bảng hiệu, sọc mái hiên, cảnh phố). */
export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
