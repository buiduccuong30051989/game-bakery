// Lab soát ngoại hình khách: /lab.html?clip=wave (idle | walk | wave | interact) &id=ba_tuyet,ong_cuong &zoom=1 (soi đầu) – 5 người nhà + 2 mèo đứng cạnh nhau.
import * as THREE from 'three';
import { CUSTOMERS } from './data.ts';
import { makeActor, type Actor } from './actors.ts';

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
cam.position.set(0, 1.9, 9);
cam.lookAt(0, 1.1, 0);
if (zoom) { cam.position.set(0.8, 1.9, 2.4); cam.lookAt(0, 1.55, 0); }
const actors: Actor[] = [];
const list = only ? CUSTOMERS.filter((c) => only.split(',').includes(c.id)) : CUSTOMERS;
await Promise.all(list.map(async (c, i) => {
  const a = await makeActor(c);
  a.setPos(new THREE.Vector3((i - (list.length - 1) / 2) * 1.25, 0, 0));
  a.yaw = a.targetYaw = 0;
  if (clip !== 'idle') a.play(clip);
  a.tag && (a.tag.visible = true);
  scene.add(a.root);
  actors.push(a);
}));
const clock = new THREE.Timer();
r.setAnimationLoop(() => { clock.update(); const dt = clock.getDelta(); actors.forEach((a) => a.update(dt)); r.render(scene, cam); });
