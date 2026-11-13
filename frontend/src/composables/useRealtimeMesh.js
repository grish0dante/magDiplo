import * as THREE from 'three';
import socket from '../services/socket';
import { getThreeContext } from '../stores/threeStore';

let activeJobId = null;
const chunkMeshes = new Map();
let listeners = [];

let settings = {
  showSurface: true,
  showWireframe: false,
  modelColor: '#29c7c7',
  wireframeColor: '#a8e9f2',
  viewMode: 'surface',
};

const workerPalette = ['#2563eb', '#0d9488', '#d97706', '#9333ea', '#db2777', '#0891b2'];

function workerColor(id) {
  if (!id) return '#94a3b8';

  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;

  return workerPalette[hash % workerPalette.length];
}

function chunkColor(id) {
  let hash = 0;
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;

  return workerPalette[hash % workerPalette.length];
}

function removeChunk(group) {
  const scene = getThreeContext()?.scene;
  if (!scene) return;

  for (const mesh of [group.surface, group.wireframe]) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
}

export function clearMesh() {
  for (const listener of listeners) socket.off(listener.name, listener.fn);
  listeners = [];

  for (const group of chunkMeshes.values()) removeChunk(group);
  chunkMeshes.clear();
  activeJobId = null;
}

export function updateRenderSettings(next) {
  settings = { ...settings, ...next };

  for (const group of chunkMeshes.values()) {
    group.surface.visible = settings.showSurface;
    group.wireframe.visible = settings.showWireframe;
    group.surface.material.color.set(
      settings.viewMode === 'workers'
        ? workerColor(group.workerId)
        : settings.viewMode === 'chunks'
          ? chunkColor(group.chunkId)
          : settings.modelColor,
    );
    group.wireframe.material.color.set(settings.wireframeColor);
    group.wireframe.visible = settings.viewMode === 'wireframe' || settings.showWireframe;
  }
}

export function getMeshStats() {
  let vertices = 0;

  for (const group of chunkMeshes.values()) {
    vertices += group.surface.geometry.attributes.position.count;
  }

  return { chunks: chunkMeshes.size, triangles: Math.floor(vertices / 3) };
}

export function resetCamera() {
  getThreeContext()?.resetCamera?.();
}

export function exportSTL() {
  const triangles = [];

  for (const group of chunkMeshes.values()) {
    const positions = group.surface.geometry.attributes.position;
    for (let i = 0; i + 2 < positions.count; i += 3) {
      triangles.push(
        [0, 1, 2].map((j) => [positions.getX(i + j), positions.getY(i + j), positions.getZ(i + j)]),
      );
    }
  }

  if (!triangles.length) throw Error('Generate a mesh before exporting');

  let out = 'solid marching_cubes\n';

  for (const tri of triangles) {
    const a = new THREE.Vector3(...tri[0]);
    const b = new THREE.Vector3(...tri[1]);
    const c = new THREE.Vector3(...tri[2]);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();

    out += `facet normal ${normal.x} ${normal.y} ${normal.z}\n outer loop\n`;
    for (const v of tri) out += `  vertex ${v.join(' ')}\n`;
    out += ' endloop\nendfacet\n';
  }

  out += 'endsolid marching_cubes\n';

  const url = URL.createObjectURL(
    new Blob([out], {
      type: 'model/stl',
    }),
  );

  const link = document.createElement('a');
  link.href = url;
  link.download = 'marching-cubes.stl';
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function subscribeToJob(jobId, onProgress, onChunk, onWorkerChunk) {
  clearMesh();
  activeJobId = jobId;

  const scene = getThreeContext()?.scene;
  if (!scene) throw Error('3D scene is not ready');

  const chunkEvent = `job:${jobId}:chunk`;
  const progressEvent = `job:${jobId}:progress`;
  const workerEvent = `job:${jobId}:worker-chunk`;

  const chunkFn = ({ chunkId, vertices, workerId, durationMs }) => {
    if (activeJobId !== jobId || !chunkId || !Array.isArray(vertices) || vertices.length < 9) return;
    if (chunkMeshes.has(chunkId)) removeChunk(chunkMeshes.get(chunkId));

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    const surface = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: settings.modelColor,
        side: THREE.DoubleSide,
        roughness: 0.5,
        metalness: 0.12,
      }),
    );

    const wireframe = new THREE.Mesh(
      geometry.clone(),
      new THREE.MeshBasicMaterial({
        color: settings.wireframeColor,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      }),
    );

    surface.visible = settings.showSurface;
    wireframe.visible = settings.viewMode === 'wireframe' || settings.showWireframe;
    surface.material.color.set(
      settings.viewMode === 'workers'
        ? workerColor(workerId)
        : settings.viewMode === 'chunks'
          ? chunkColor(chunkId)
          : settings.modelColor,
    );

    chunkMeshes.set(chunkId, { surface, wireframe, chunkId, workerId });
    scene.add(surface, wireframe);

    onChunk?.({
      ...getMeshStats(),
      lastChunk: {
        chunkId,
        workerId: workerId || null,
        durationMs: durationMs ?? null,
        triangles: vertices.length / 9,
      },
    });
  };

  const progressFn = ({ progress }) => {
    if (activeJobId === jobId) onProgress?.(progress);
  };

  const workerFn = (chunk) => {
    if (activeJobId === jobId) onWorkerChunk?.(chunk);
  };

  socket.on(chunkEvent, chunkFn);
  socket.on(progressEvent, progressFn);
  socket.on(workerEvent, workerFn);

  listeners = [
    { name: chunkEvent, fn: chunkFn },
    { name: progressEvent, fn: progressFn },
    { name: workerEvent, fn: workerFn },
  ];
}

export async function recoverJobGeometry(jobId, onChunk) {
  if (activeJobId !== jobId) return;

  const api = (await import('../services/api')).default;
  let offset = 0;
  let hasMore = true;

  while (hasMore && activeJobId === jobId) {
    const { data } = await api.get(`/job/${jobId}/model`, { params: { offset, limit: 4 } });

    for (const chunk of data.chunks) {
      if (!chunkMeshes.has(chunk.chunkId)) {
        const event = listeners.find((listener) => listener.name === `job:${jobId}:chunk`);
        event?.fn(chunk);
      }
    }

    offset = data.nextOffset;
    hasMore = data.hasMore;
    onChunk?.(getMeshStats());
  }
}

export function getMeshVertices() {
  const result = [];

  for (const group of chunkMeshes.values()) {
    const array = group.surface.geometry.attributes.position.array;
    for (let i = 0; i < array.length; i += 1) {
      result.push(Number(array[i]));
    }
  }

  return result;
}

