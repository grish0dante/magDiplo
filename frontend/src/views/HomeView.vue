<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">◇</span>
        <div>
          <strong>Marching Cubes</strong>
          <small>DISTRIBUTED COMPUTING STUDIO</small>
        </div>
      </div>

      <div class="header-right">
        <nav class="page-nav" aria-label="Основна навігація">
          <RouterLink to="/">Лабораторія</RouterLink>
          <RouterLink to="/gallery">Галерея</RouterLink>
          <RouterLink to="/profile">Мої моделі</RouterLink>
          <RouterLink to="/about">Про розробника</RouterLink>
          <RouterLink v-if="!session.user" to="/login">Увійти</RouterLink>
        </nav>

        <span class="connection">
          <i :class="{ online: connected }"></i>
          {{ connected ? 'Connected' : 'Disconnected' }}
        </span>
        
      </div>
    </header>

    <main class="workspace">
      <Teleport to="body">
        <div
          v-show="settingsOpen"
          class="generation-overlay"
          @click.self="settingsOpen = false"
          @keydown.esc="settingsOpen = false"
        >
          <section
            class="generation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="generation-title"
            tabindex="-1"
          >
            <div class="generation-dialog-header">
              <div>
                <span class="eyebrow">DISTRIBUTED COMPUTING / SETUP</span>
                <h2 id="generation-title">Нова генерація</h2>
                <p>Створіть скалярне поле та налаштуйте обчислення на серверних Workers.</p>
              </div>
              <button
                class="dialog-close"
                type="button"
                aria-label="Закрити налаштування"
                @click="settingsOpen = false"
              >
                ✕
              </button>
            </div>

            <div class="generation-dialog-content">
              <ControlPanel
                ref="controlPanel"
                @progress="updateProgress"
                @status="updateStatus"
                @stats="handleStats"
                @worker-chunk="handleWorkerChunk"
                @job="handleJob"
              />
            </div>
          </section>
        </div>
      </Teleport>

      <section class="viewport">
        <div class="viewport-top">
          <div>
            <span class="eyebrow">3D-ПРОСТІР / ВІЗУАЛІЗАЦІЯ</span>
            <h1>Розподілена генерація</h1>
          </div>

          <div class="viewport-actions">
            <button type="button" class="new-generation-btn" @click="settingsOpen = true">
              ＋ Нова генерація
            </button>
            <button type="button" :disabled="!jobId" @click="controlPanel?.download()">↓ STL</button>
            <button type="button" :disabled="!jobId" @click="controlPanel?.saveModel()">Зберегти</button>

            <label class="lab-mode-label" for="lab-view-mode">Режим відображення</label>
            <select id="lab-view-mode" v-model="viewMode" @change="changeViewMode" class="lab-view-select">
              <option value="surface">Поверхня</option>
              <option value="chunks">Кольорові chunks</option>
              <option value="workers">За Worker-процесами</option>
              <option value="wireframe">Трикутна сітка</option>
            </select>

            <button type="button" @click="resetCamera" title="Скинути положення камери">↺ Камера</button>
          </div>
        </div>

        <div class="scene-wrap">
          <SceneCanvas />
          <div v-if="!jobId" class="lab-empty">
            Натисніть «Нова генерація», щоб налаштувати розподілене обчислення.
            <small>Геометрія надходить від Worker-процесів у реальному часі.</small>
          </div>
          <div class="scene-help">
            Обертання: ліва кнопка · Масштаб: колесо · Переміщення: права кнопка
          </div>
        </div>
      </section>

      <aside class="insights">
        <div class="panel-heading">
          <span class="eyebrow">LIVE / WORKER MONITOR</span>
          <h2>Моніторинг обчислень</h2>
          <p>Фактичні дані розподіленої генерації</p>
        </div>

        <div class="status-line">
          <span>Стан</span>
          <strong :class="status === 'Error' ? 'danger' : 'good'">{{ status }}</strong>
        </div>

        <div class="progress-head">
          <span>Завершено обчислень</span>
          <b>{{ Math.round(progress) }}%</b>
        </div>

        <div class="progress-track">
          <div :style="{ width: progress + '%' }"></div>
        </div>

        <div class="metric-grid">
          <div class="metric">
            <span>Трикутники</span>
            <strong>{{ stats.triangles.toLocaleString() }}</strong>
          </div>
          <div class="metric">
            <span>Оброблені chunks</span>
            <strong>{{ stats.chunks.toLocaleString() }}</strong>
          </div>
        </div>

        <div class="lab-runtime">
          <div>
            <span>Час генерації</span>
            <strong>{{ elapsedLabel }} <span v-if="finishedAt" class="timer-stopped">● Зупинено</span></strong>
          </div>
          <div>
            <span>Останній chunk</span>
            <strong>{{ lastChunk?.chunkId || '—' }}</strong>
          </div>
          <div>
            <span>Останній Worker</span>
            <strong :title="lastChunk?.workerId || ''">
              {{ lastChunk?.workerId ? workerLabel(lastChunk.workerId) : 'Очікування' }}
            </strong>
          </div>
          <div>
            <span>Обчислення chunk</span>
            <strong>{{ lastChunk?.durationMs == null ? '—' : `${lastChunk.durationMs} мс` }}</strong>
          </div>
        </div>

        <div class="worker-monitor-heading">
          <h3>Воркери цієї генерації</h3>
          <span>{{ workerSummary.length }} виявлено</span>
        </div>

        <p v-if="!workerSummary.length" class="lab-muted">
          Воркери з’являться тут після надходження перших результатів.
        </p>
        <div v-else class="worker-monitor-list">
          <div v-for="worker in workerSummary" :key="worker.id" class="worker-monitor-card">
            <div class="worker-monitor-top">
              <strong>{{ workerLabel(worker.id) }}</strong>
              <span>{{ worker.chunks }} chunks</span>
            </div>
            <code class="worker-pod-name" :title="worker.id">{{ worker.id }}</code>
            <small>
              Останній chunk: {{ worker.lastChunk }} ·
              {{ worker.durationMs == null ? '—' : `${worker.durationMs} мс` }}
            </small>
          </div>
        </div>

        <h3>Останні результати Worker-процесів</h3>
        <p v-if="!recentChunks.length" class="lab-muted">
          Після запуску тут з’являться реальні результати chunks.
        </p>
        <ol v-else class="lab-events">
          <li v-for="item in recentChunks" :key="item.key">
            <code>{{ item.chunkId }}</code>
            <span class="worker-event-identity" :title="item.workerId || ''">
              <strong>{{ item.workerId ? workerLabel(item.workerId) : 'Невідомий Worker' }}</strong>
              <small v-if="item.workerId">{{ item.workerId }}</small>
            </span>
            <b>{{ item.triangles }} △</b>
          </li>
        </ol>

        <div class="divider"></div>

        <p class="info">
          Усі трикутники обчислюються Worker-процесами. Браузер лише відображає отримані частини
          поверхні.
        </p>

        
      </aside>
    </main>

    <footer class="footer">
      <span>Marching Cubes · Distributed mesh generation</span>
      <span>Built with Vue & Three.js</span>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { RouterLink } from 'vue-router';
import SceneCanvas from '../components/SceneCanvas.vue';
import ControlPanel from '../components/ControlPanel.vue';
import { resetCamera, updateRenderSettings } from '../composables/useRealtimeMesh';
import socket from '../services/socket';
import { session } from '../services/session';

const settingsOpen = ref(false);
const controlPanel = ref(null);
const progress = ref(0);
const status = ref('Idle');
const stats = ref({ chunks: 0, triangles: 0 });
const jobId = ref('');
const connected = ref(socket.connected);
const viewMode = ref('surface');
const recentChunks = ref([]);
const lastChunk = ref(null);
const workers = ref([]);
const seenWorkerChunks = new Set();
const workerSummary = computed(() => workers.value);

function workerLabel(id) {
  const index = workers.value.findIndex((worker) => worker.id === id);
  return index < 0 ? 'Невідомий Worker' : `Worker №${index + 1}`;
}

function recordWorker(chunk) {
  if (!chunk?.workerId) return;

  const id = String(chunk.workerId);
  const chunkKey = `${jobId.value}:${chunk.chunkId}`;

  if (seenWorkerChunks.has(chunkKey)) return;
  seenWorkerChunks.add(chunkKey);

  const index = workers.value.findIndex((worker) => worker.id === id);
  const current = index < 0 ? { id, chunks: 0, lastChunk: '—', durationMs: null } : workers.value[index];
  const updated = {
    ...current,
    chunks: current.chunks + 1,
    lastChunk: chunk.chunkId || '—',
    durationMs: chunk.durationMs ?? null,
  };

  if (index < 0) {
    workers.value = [...workers.value, updated];
  } else {
    workers.value = workers.value.map((worker, workerIndex) => (workerIndex === index ? updated : worker));
  }
}

const startedAt = ref(null);
const now = ref(Date.now());
const finishedAt = ref(null);
let clock = null;
const terminalStatuses = new Set(['Completed', 'Failed', 'Cancelled', 'Error']);

function freezeTimer() {
  if (startedAt.value != null && finishedAt.value == null) {
    finishedAt.value = Date.now();
    now.value = finishedAt.value;
  }
}

function updateProgress(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return;

  if (finishedAt.value != null) return;

  progress.value = Math.max(progress.value, Math.min(100, Math.max(0, numeric)));
  if (progress.value >= 100) freezeTimer();
}

function updateStatus(value) {
  if (finishedAt.value != null && !terminalStatuses.has(value)) return;

  status.value = value;

  if (terminalStatuses.has(value)) {
    if (value === 'Completed') progress.value = 100;
    freezeTimer();
  }
}

watch(progress, (value) => {
  if (startedAt.value && Number(value) >= 100 && !finishedAt.value) {
    freezeTimer();
  }
});

watch(status, (nextStatus) => {
  if (startedAt.value && terminalStatuses.has(nextStatus) && !finishedAt.value) {
    freezeTimer();
  }
});

const elapsedLabel = computed(() => {
  if (!startedAt.value) return '—';

  const end =
    finishedAt.value != null || progress.value >= 100 || terminalStatuses.has(status.value)
      ? finishedAt.value ?? now.value
      : now.value;
  const seconds = Math.max(0, Math.floor((end - startedAt.value) / 1000));

  return `${Math.floor(seconds / 60)} хв ${seconds % 60} с`;
});

function changeViewMode() {
  updateRenderSettings({ viewMode: viewMode.value });
}

function handleStats(next) {
  stats.value = next;

  if (next.lastChunk) {
    lastChunk.value = next.lastChunk;
    recordWorker(next.lastChunk);

    const key = `${jobId.value}:${next.lastChunk.chunkId}`;
    if (!recentChunks.value.some((chunk) => chunk.key === key)) {
      recentChunks.value = [{ ...next.lastChunk, key }, ...recentChunks.value].slice(0, 8);
    }
  }
}

function handleJob(id) {
  settingsOpen.value = false;
  jobId.value = id;
  progress.value = 0;
  status.value = 'Running';
  startedAt.value = Date.now();
  now.value = startedAt.value;
  finishedAt.value = null;
  recentChunks.value = [];
  lastChunk.value = null;
  workers.value = [];
  seenWorkerChunks.clear();
}

function handleWorkerChunk(chunk) {
  if (!chunk?.chunkId) return;

  recordWorker(chunk);
  lastChunk.value = chunk;

  const key = `${jobId.value}:${chunk.chunkId}`;
  if (!recentChunks.value.some((item) => item.key === key)) {
    recentChunks.value = [{ ...chunk, key }, ...recentChunks.value].slice(0, 8);
  }
}

function handleConnect() {
  connected.value = true;
}

function handleDisconnect() {
  connected.value = false;
}

onMounted(() => {
  clock = setInterval(() => {
    if (startedAt.value != null && finishedAt.value == null) now.value = Date.now();
  }, 1000);

  socket.on('connect', handleConnect);
  socket.on('disconnect', handleDisconnect);
});

onBeforeUnmount(() => {
  clearInterval(clock);
  socket.off('connect', handleConnect);
  socket.off('disconnect', handleDisconnect);
});
</script>
