
<template>
<main class="social-page">
  <RouterLink to="/gallery">
    ← Галерея
  </RouterLink>
  <p v-if="error" class="error" role="alert">
    {{ error }}
  </p>
  <p v-if="loading">
    Завантаження моделі...
  </p>
  <section v-if="model" class="social-card">
    <h1>
      {{ model.title }}
    </h1>
    <p v-if="model.description">
      {{ model.description }}
    </p>
    <p>
      Автор: {{ model.owner?.name || 'Невідомий' }} ·
        {{ model.triangleCount ?? Math.floor((model.vertices?.length || 0) / 9) }} трикутників ·
        {{ visibilityLabel }}
    </p>
    <div
        ref="canvas"
        class="saved-preview"
        aria-label="Інтерактивний 3D-перегляд моделі"
      >
    </div>
    <p class="preview-hint">
      Перетягни для обертання · Колесо миші для масштабування ·
        Права кнопка миші для переміщення
    </p>
    <div class="model-actions">
      <button
          class="secondary small"
          type="button"
          @click="resetCamera"
        >
        Скинути камеру
      </button>
      <button
          class="secondary small"
          type="button"
          @click="download"
        >
        ↓ Завантажити STL
      </button>
    </div>
  </section>
</main>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick
} from 'vue';

import { useRoute } from 'vue-router';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import api from '../services/api';

const route = useRoute();

const model = ref(null);
const canvas = ref(null);
const error = ref('');
const loading = ref(true);

let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let mesh = null;
let frame = null;
let observer = null;
let disposed = false;

const visibilityLabel = computed(() => ({
  private: 'Приватна',
  unlisted: 'За посиланням',
  public: 'Публічна'
})[model.value?.visibility] || 'Невідома видимість');

onMounted(async () => {
  try {
    const response = await api.get(
      `/models/${encodeURIComponent(String(route.params.id))}`
    );

    if (disposed) return;

    model.value = response.data.model;

    await nextTick();

    if (!disposed) {
      initScene();
    }
  } catch (e) {
    if (!disposed) {
      error.value = e.response?.status === 404
        ? 'Модель не знайдена або доступ до неї обмежений.'
        : 'Не вдалося завантажити модель. Перевір з’єднання із сервером.';
    }
  } finally {
    loading.value = false;
  }
});

function initScene() {
  const el = canvas.value;

  if (!el || !model.value) return;

  const vertices = model.value.vertices || [];

  if (vertices.length < 9 || vertices.length % 9 !== 0) {
    error.value = 'Модель не містить коректної геометрії трикутників.';
    return;
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b1423');

  camera = new THREE.PerspectiveCamera(
    50,
    1,
    0.01,
    10000
  );

  renderer = new THREE.WebGLRenderer({
    antialias: true
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 2)
  );

  el.appendChild(renderer.domElement);

  controls = new OrbitControls(
    camera,
    renderer.domElement
  );

  controls.enableDamping = true;

  scene.add(
    new THREE.HemisphereLight(
      0xffffff,
      0x263a52,
      2
    )
  );

  const light = new THREE.DirectionalLight(
    0xffffff,
    2
  );

  light.position.set(10, 20, 15);
  scene.add(light);

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );

  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: model.value.color || '#22c5d6',
    side: THREE.DoubleSide
  });

  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  resetCamera();

  const resize = () => {
    if (!renderer || !camera || !el) return;

    const width = Math.max(1, el.clientWidth);
    const height = Math.max(1, el.clientHeight || 420);

    renderer.setSize(width, height);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  observer = new ResizeObserver(resize);
  observer.observe(el);

  resize();

  const animate = () => {
    if (disposed) return;

    frame = requestAnimationFrame(animate);

    controls.update();
    renderer.render(scene, camera);
  };

  animate();
}

function resetCamera() {
  if (!mesh || !camera || !controls) return;

  mesh.geometry.computeBoundingSphere();

  const sphere = mesh.geometry.boundingSphere;

  if (!sphere || !Number.isFinite(sphere.radius)) {
    return;
  }

  const radius = Math.max(sphere.radius, 0.1);

  controls.target.copy(sphere.center);

  camera.position.copy(sphere.center).add(
    new THREE.Vector3(1, 0.8, 1)
      .normalize()
      .multiplyScalar(radius * 3)
  );

  camera.near = Math.max(0.001, radius / 1000);
  camera.far = Math.max(1000, radius * 20);

  camera.updateProjectionMatrix();
  controls.update();
}

function download() {
  const vertices = model.value?.vertices || [];

  if (vertices.length < 9 || vertices.length % 9 !== 0) {
    return;
  }

  const lines = ['solid mesh'];

  for (let i = 0; i < vertices.length; i += 9) {
    const a = new THREE.Vector3(
      vertices[i],
      vertices[i + 1],
      vertices[i + 2]
    );

    const b = new THREE.Vector3(
      vertices[i + 3],
      vertices[i + 4],
      vertices[i + 5]
    );

    const c = new THREE.Vector3(
      vertices[i + 6],
      vertices[i + 7],
      vertices[i + 8]
    );

    const normal = new THREE.Vector3()
      .subVectors(b, a)
      .cross(
        new THREE.Vector3().subVectors(c, a)
      )
      .normalize();

    lines.push(
      `facet normal ${normal.x} ${normal.y} ${normal.z}`
    );

    lines.push('outer loop');

    lines.push(
      `vertex ${a.x} ${a.y} ${a.z}`
    );

    lines.push(
      `vertex ${b.x} ${b.y} ${b.z}`
    );

    lines.push(
      `vertex ${c.x} ${c.y} ${c.z}`
    );

    lines.push('endloop', 'endfacet');
  }

  lines.push('endsolid mesh');

  const blob = new Blob(
    [lines.join('\n') + '\n'],
    { type: 'model/stl' }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');

  link.href = url;

  link.download = `${
    String(model.value?.title || 'model')
      .replace(/[^\p{L}\p{N}_-]+/gu, '_')
  }.stl`;

  document.body.appendChild(link);

  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

onBeforeUnmount(() => {
  disposed = true;

  if (frame !== null) {
    cancelAnimationFrame(frame);
  }

  observer?.disconnect();
  controls?.dispose();

  mesh?.geometry.dispose();
  mesh?.material.dispose();

  renderer?.dispose();
  renderer?.domElement.remove();
});
</script>

<style scoped>
.model-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 14px;
}

.saved-preview {
  width: 100%;
  min-height: 420px;
  overflow: hidden;
  border-radius: 12px;
}

.preview-hint {
  opacity: 0.75;
  font-size: 0.9rem;
}
</style>
