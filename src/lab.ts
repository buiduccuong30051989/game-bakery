// Lab soát ngoại hình khách: /lab.html?clip=wave (idle | walk | wave | interact) &id=ba_tuyet,ong_cuong &zoom=1 (soi đầu) – 5 người nhà + 2 mèo đứng cạnh nhau.
import * as THREE from 'three';
import { CUSTOMERS, NHIM } from './data.ts';
import { type Actor } from './actors.ts';
import { makeActor } from './eg.ts';

const q = new URLSearchParams(location.search);
const clip = q.get('clip') ?? 'idle';
const only = q.get('id');
const zoom = q.get('zoom') === '1';
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(innerWidth, innerHeight);
r.setPixelRatio(devicePixelRatio);
document.body.appendChild(r.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffe9f0);
scene.add(new THREE.HemisphereLight(0xfff8ee, 0xf6c7b0, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(2, 6, 5);
scene.add(sun);
const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 50);
cam.position.set(0, 1.9, 13);
cam.lookAt(0, 1.1, 0);
if (zoom) { cam.position.set(0.8, 1.9, 2.4); cam.lookAt(0, 1.55, 0); }
const actors: Actor[] = [];
const all = [NHIM, ...CUSTOMERS];
const list = only ? all.filter((c) => only.split(',').includes(c.id)) : all;
await Promise.all(list.map(async (c, i) => {
  const a = await makeActor(c);
  a.setPos(new THREE.Vector3((i - (list.length - 1) / 2) * 1.05, 0, 0));
  a.yaw = a.targetYaw = 0;
  if (clip === 'walk') void a.walkTo([new THREE.Vector3(a.root.position.x, 0, 30)], 0.0001);
  else if (clip !== 'idle') { const loop = () => { void a.once(clip).then(() => setTimeout(loop, 300)); }; loop(); }
  a.tag && (a.tag.visible = true);
  scene.add(a.root);
  actors.push(a);
}));
const clock = new THREE.Timer();
r.setAnimationLoop(() => { clock.update(); const dt = clock.getDelta(); actors.forEach((a) => a.update(dt)); r.render(scene, cam); });
