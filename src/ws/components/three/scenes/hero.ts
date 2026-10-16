import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { SceneFactory } from "../types";

/*
 * Home hero (S0.10): parcels, coins and rings, a marketplace in motion, floating in a
 * gold-lit room. They ease out from the centre on the DS curve, bob on their own
 * clocks and lean towards the pointer. Shapes only, no drawn icons; colours from the
 * DS tokens. About 30 meshes and 400 points, one light setup, no post-processing.
 */

/** --cx-ease (.22, 1, .36, 1) is close to expo out. */
const easeOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const INTRO = 1.4; // seconds per piece
const STAGGER = 0.05;

export const hero: SceneFactory = ({ THREE, renderer, width, height, colors }) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
  camera.position.set(0, 0, 14);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const gold = new THREE.Color(colors.ember);
  const key = new THREE.DirectionalLight(gold, 2.2);
  key.position.set(4, 6, 6);
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.25));

  const materials = [
    new THREE.MeshStandardMaterial({ color: gold, metalness: 1, roughness: 0.28 }),
    new THREE.MeshStandardMaterial({ color: 0x1c1917, metalness: 0.4, roughness: 0.35 }),
    new THREE.MeshStandardMaterial({ color: 0x44403c, metalness: 0.2, roughness: 0.6 }),
  ];
  const geometries = [
    new RoundedBoxGeometry(1, 0.8, 0.8, 4, 0.12), // parcel
    new RoundedBoxGeometry(1.3, 0.5, 0.9, 4, 0.1), // flat parcel
    new THREE.CylinderGeometry(0.45, 0.45, 0.1, 40), // coin
    new THREE.TorusGeometry(0.42, 0.12, 20, 48), // ring
    new THREE.IcosahedronGeometry(0.45, 1), // gem
  ];

  // Seeded so the layout is the same on every visit.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  type Piece = { mesh: import("three").Mesh; home: import("three").Vector3; spin: import("three").Vector3; bob: number; phase: number; delay: number; size: number };
  const pieces: Piece[] = [];
  const group = new THREE.Group();
  scene.add(group);
  for (let i = 0; i < 28; i++) {
    const geometry = geometries[i % geometries.length];
    const material = materials[i % 3 === 0 ? 0 : rand() > 0.5 ? 1 : 2];
    const mesh = new THREE.Mesh(geometry, material);
    // A loose ring around the centre so headline text over the stage stays readable.
    // Depth is scaled into the radius so far pieces don't drift in behind the words.
    const angle = rand() * Math.PI * 2;
    const depth = rand() * 6;
    const radius = (4 + rand() * 3.4) * (1 + depth / 14);
    const home = new THREE.Vector3(Math.cos(angle) * radius * 1.45, Math.sin(angle) * radius * 0.62, -depth);
    const size = 0.6 + rand() * 0.8;
    mesh.rotation.set(rand() * Math.PI, rand() * Math.PI, 0);
    mesh.scale.setScalar(0);
    group.add(mesh);
    pieces.push({
      mesh,
      home,
      spin: new THREE.Vector3((rand() - 0.5) * 0.6, (rand() - 0.5) * 0.6, (rand() - 0.5) * 0.3),
      bob: 0.15 + rand() * 0.25,
      phase: rand() * Math.PI * 2,
      delay: i * STAGGER,
      size,
    });
  }

  // Gold dust.
  const dustCount = 400;
  const dust = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dust.set([(rand() - 0.5) * 30, (rand() - 0.5) * 16, -rand() * 12], i * 3);
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dust, 3));
  const dustMaterial = new THREE.PointsMaterial({ color: gold, size: 0.045, transparent: true, opacity: 0.55, depthWrite: false });
  const points = new THREE.Points(dustGeometry, dustMaterial);
  scene.add(points);

  const target = { x: 0, y: 0 };
  const lean = { x: 0, y: 0 };
  // Each carousel slide turns the ring a third of the way round its centre.
  let turnTarget = 0;
  let turn = 0;
  const origin = new THREE.Vector3();
  let start = -1;

  const api = {
    frame(time: number, delta: number) {
      if (start < 0) start = time;
      const t = time - start;
      for (const p of pieces) {
        const k = easeOut(Math.max(0, t - p.delay) / INTRO);
        p.mesh.position.lerpVectors(origin, p.home, k);
        p.mesh.position.y += Math.sin(t * 0.8 + p.phase) * p.bob;
        p.mesh.scale.setScalar(p.size * k);
        p.mesh.rotation.x += p.spin.x * delta;
        p.mesh.rotation.y += p.spin.y * delta;
        p.mesh.rotation.z += p.spin.z * delta;
      }
      // The scene leans towards the pointer, damped so it trails like a spring.
      const damp = 1 - Math.exp(-delta * 3);
      lean.x += (target.x - lean.x) * damp;
      lean.y += (target.y - lean.y) * damp;
      turn += (turnTarget - turn) * (1 - Math.exp(-delta * 2.4));
      group.rotation.y = lean.x * 0.25;
      group.rotation.x = -lean.y * 0.15;
      group.rotation.z = turn;
      points.rotation.y = t * 0.01 + lean.x * 0.08;
      points.rotation.z = turn * 0.3;
      renderer.render(scene, camera);
    },
    resize(w: number, h: number) {
      const aspect = w / h;
      camera.aspect = aspect;
      // Narrow screens pull back so the ring still frames the headline.
      camera.position.z = aspect < 1 ? 20 : 14;
      camera.updateProjectionMatrix();
      // Banners keep the copy on the left, so the ring sits right and a little smaller;
      // taller stages keep the copy at the bottom, so it rises.
      const visibleH = 2 * camera.position.z * Math.tan(((camera.fov / 2) * Math.PI) / 180);
      if (aspect > 1.4) {
        group.position.set(visibleH * aspect * 0.24, 0, 0);
        group.scale.setScalar(0.72);
      } else {
        group.position.set(0, visibleH * 0.16, 0);
        group.scale.setScalar(aspect < 1 ? 0.9 : 0.8);
      }
    },
    step(index: number) {
      turnTarget = (index * Math.PI * 2) / 3;
    },
    pointer(x: number, y: number) {
      target.x = x;
      target.y = y;
    },
    dispose() {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      dustGeometry.dispose();
      dustMaterial.dispose();
      env.dispose();
      pmrem.dispose();
    },
  };
  api.resize(width, height);
  return api;
};
