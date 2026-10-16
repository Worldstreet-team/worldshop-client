import type { SceneFactory } from "../types";

/*
 * Listing 3D viewer (Phase 3 gallery): the listing's photos stand on a ring the buyer
 * spins with a drag. It carries momentum, then springs to face the nearest photo. The
 * front photo is full size and lit; the others recede and dim. The flat gallery stays
 * the accessible way through the photos; this is the expressive view of the same set.
 */

const SPRING = 60; // stiffness; with DAMPING below, settles in about half a second
const DAMPING = 14;

export function photoRing(urls: readonly string[], onFront?: (index: number) => void): SceneFactory {
  return ({ THREE, renderer, width, height }) => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 50);
    camera.position.set(0, 0.15, 6.2);

    const n = Math.max(urls.length, 3);
    const step = (Math.PI * 2) / n;
    // Neighbouring photos (2 units wide) sit a quarter-width apart along the ring.
    const radius = 1.25 / Math.sin(step / 2);

    const ring = new THREE.Group();
    ring.position.z = -radius;
    scene.add(ring);

    const loader = new THREE.TextureLoader();
    const geometry = new THREE.PlaneGeometry(2, 2);
    const textures: import("three").Texture[] = [];
    const materials: import("three").MeshBasicMaterial[] = [];
    urls.forEach((url, i) => {
      const texture = loader.load(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      const mesh = new THREE.Mesh(geometry, material);
      const a = i * step;
      mesh.position.set(Math.sin(a) * radius, 0, Math.cos(a) * radius);
      mesh.rotation.y = a;
      ring.add(mesh);
      textures.push(texture);
      materials.push(material);
    });

    let angle = 0;
    let velocity = 0;
    let dragging = false;
    let idle = 0;
    let front = 0;

    const api = {
      frame(_time: number, delta: number) {
        if (dragging) {
          idle = 0;
        } else {
          idle += delta;
          // Momentum first, then a spring to the nearest photo.
          const nearest = Math.round(angle / step) * step;
          const force = idle > 0.12 ? (nearest - angle) * SPRING - velocity * DAMPING : -velocity * 2.5;
          velocity += force * delta;
          angle += velocity * delta;
        }
        ring.rotation.y = -angle;

        const index = (((Math.round(angle / step) % urls.length) + urls.length) % urls.length) | 0;
        if (index !== front) {
          front = index;
          onFront?.(index);
        }
        // Photos dim and shrink as they turn away from the buyer.
        ring.children.forEach((mesh, i) => {
          const facing = Math.cos(i * step - angle);
          const k = (facing + 1) / 2;
          materials[i].color.setScalar(0.35 + 0.65 * k);
          mesh.scale.setScalar(0.82 + 0.18 * k);
        });
        renderer.render(scene, camera);
      },
      resize(w: number, h: number) {
        camera.aspect = w / h;
        camera.position.z = w / h < 1 ? 7.6 : 6.2;
        camera.updateProjectionMatrix();
      },
      drag(dx: number) {
        dragging = true;
        const d = dx * 0.006;
        angle -= d;
        velocity = -d * 60;
      },
      release() {
        dragging = false;
      },
      dispose() {
        geometry.dispose();
        textures.forEach((t) => t.dispose());
        materials.forEach((m) => m.dispose());
      },
    };
    api.resize(width, height);
    return api;
  };
}
