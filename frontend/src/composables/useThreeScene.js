import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createScene(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f5f7fb');

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
  camera.position.set(42, 30, 42);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const light = new THREE.DirectionalLight(0xffffff, 2.5);
  light.position.set(40, 80, 50);
  scene.add(light);

  const grid = new THREE.GridHelper(100, 40, 0xcbd5e1, 0xe5eaf2);
  grid.position.y = -17;
  scene.add(grid);

  const axes = new THREE.AxesHelper(12);
  axes.position.set(-20, -16, -20);
  scene.add(axes);

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (width && height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let frame = 0;
  let disposed = false;

  function animate() {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  function resetCamera() {
    camera.position.set(42, 30, 42);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  function dispose() {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    controls.dispose();
    renderer.dispose();
  }

  return { scene, camera, renderer, controls, resetCamera, dispose };
}

