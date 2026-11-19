// AXEL - Scena 3D con Three.js
import * as THREE from "three";
let renderer, scene, camera, sphere, particles, mood = "idle";
export function initScene() {
  const canvas = document.getElementById("gl");
  if (!canvas) return;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 6;
    const geo = new THREE.SphereGeometry(1.6, 64, 64);
    const mat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0.55 });
    sphere = new THREE.Mesh(geo, mat);
    scene.add(sphere);
    const light = new THREE.PointLight(0xffffff, 2, 20);
    light.position.set(3, 3, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x334455, 1.2));
    const pGeo = new THREE.BufferGeometry();
    const count = 300;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 14;
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x00e5ff, size: 0.04, transparent: true, opacity: 0.6 }));
    scene.add(particles);
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    animate();
  } catch (e) { console.warn("Scene non avviata", e); }
}
function animate() {
  requestAnimationFrame(animate);
  if (!renderer || !sphere) return;
  const t = Date.now() * 0.001;
  sphere.rotation.y += 0.002;
  sphere.rotation.x = Math.sin(t * 0.3) * 0.1;
  const scale = mood === "thinking" ? 1.12 + Math.sin(t * 6) * 0.03 : 1 + Math.sin(t * 2) * 0.02;
  sphere.scale.setScalar(scale);
  if (particles) particles.rotation.y -= 0.0008;
  renderer.render(scene, camera);
}
export function setMood(m) { mood = m; }
export default { initScene, setMood };
