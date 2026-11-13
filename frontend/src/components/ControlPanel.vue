<template>
  <section class="control-panel">
    <div class="panel-heading">
      <span class="eyebrow">01 / СКАЛЯРНЕ ПОЛЕ</span>
      <h2>Налаштування генерації</h2>
      <p>Задайте скалярне поле. Обчислення виконають лише серверні Worker-процеси.</p>
    </div>

    <div class="builder-section">
      <label for="preset">Початкова форма</label>
      <select id="preset" v-model="preset" @change="applyPreset">
        <option value="sphere">Сфера</option>
        <option value="torus">Тор</option>
        <option value="waves">Хвилі</option>
        <option value="custom">Власна формула</option>
      </select>

      <label for="formula">Математичний вираз</label>
      <textarea
        id="formula"
        v-model="formula"
        rows="3"
        spellcheck="false"
        placeholder="x*x + y*y + z*z - 64"
      />
      <small>Підтримуються: + − * / ^, sin, cos, sqrt, pow, exp, min, max, PI</small>
    </div>

    <div class="lab-helper">
      Алгоритм: розбиття об’єму → черга BullMQ → Worker-процеси → трикутники → 3D-сцена.
    </div>

    <div class="two">
      <div>
        <label for="iso">Рівень ізоповерхні</label>
        <input id="iso" v-model.number="isoValue" type="number" step="0.1" />
      </div>
      <div>
        <label for="resolution">Роздільність</label>
        <input id="resolution" v-model.number="resolution" type="number" min="16" max="512" step="1" />
      </div>
    </div>

    <div class="two">
      <div>
        <label for="chunk">Розмір chunk</label>
        <input id="chunk" v-model.number="chunkSize" type="number" min="2" max="64" step="1" />
      </div>
      <div>
        <label for="volume">Розмір області</label>
        <input id="volume" v-model.number="volumeSize" type="number" min="1" max="1000" step="1" />
      </div>
    </div>

    <details class="advanced-help">
      <summary>Що означають параметри?</summary>
      <p>
        Роздільність — кількість комірок по кожній осі. Chunk — кількість комірок в одному
        завданні BullMQ. Область — фізичний розмір куба, який обробляється. Кількість Workers
        задається у Docker/Kubernetes, а не в цій формі.
      </p>
    </details>

    <div class="section-title">02 / ВІДОБРАЖЕННЯ</div>

    <label class="toggle">
      <input v-model="showSurface" type="checkbox" @change="applyRenderSettings" />
      Показувати поверхню
    </label>
    <label class="toggle">
      <input v-model="showWireframe" type="checkbox" @change="applyRenderSettings" />
      Накласти трикутну сітку
    </label>

    <div class="two">
      <div>
        <label for="color">Surface</label>
        <input id="color" v-model="modelColor" type="color" @input="applyRenderSettings" />
      </div>
      <div>
        <label for="wirecolor">Wireframe</label>
        <input id="wirecolor" v-model="wireframeColor" type="color" @input="applyRenderSettings" />
      </div>
    </div>

    <div class="generation-estimate" role="status">
      <div>
        <span>Комірок</span>
        <strong>{{ Number.isFinite(cellCount) ? cellCount.toLocaleString('uk-UA') : '—' }}</strong>
      </div>
      <div>
        <span>Завдань BullMQ</span>
        <strong>{{ Number.isFinite(plannedChunks) ? plannedChunks.toLocaleString('uk-UA') : '—' }}</strong>
      </div>
      <p v-if="plannedChunks > 8192" class="estimate-error">
        Забагато chunks. Максимум 8192 — збільште розмір chunk.
      </p>
      <p v-else-if="resolution >= 256 || plannedChunks > 2048" class="estimate-warning">
        Високе навантаження: перевірте RAM, CPU, Redis і продуктивність браузера. Kubernetes не
        усуває обмежень пам'яті.
      </p>
      <p v-else class="estimate-info">
        Геометрію обчислюють тільки серверні Workers. Кількість реплік визначає Kubernetes/KEDA.
      </p>
    </div>

    <button class="primary lab-run" :disabled="running || !canSubmit" @click="generate">
      {{ running ? 'Worker-процеси обчислюють…' : 'Запустити розподілену генерацію' }}
    </button>
    <button v-if="running" class="secondary" @click="cancelGeneration">Скасувати генерацію</button>
    <button class="secondary" @click="download">Експортувати STL</button>
    <button class="secondary" @click="saveModel">Зберегти в галерею</button>

    <div v-if="saving" class="modal-backdrop" @click.self="saving = false">
      <div class="save-form save-dialog" role="dialog" aria-modal="true" aria-label="Зберегти модель">
        <h3>Зберегти модель</h3>
        <label>
          Назва моделі
          <input v-model="modelTitle" maxlength="100" placeholder="Моя ізоповерхня" />
        </label>
        <label>
          Опис
          <textarea v-model="modelDescription" maxlength="1200" rows="2" />
        </label>
        <label>
          Видимість
          <select v-model="visibility">
            <option value="private">Приватна — тільки мені</option>
            <option value="unlisted">За посиланням</option>
            <option value="public">Публічна — у галереї</option>
          </select>
        </label>
        <button class="primary" :disabled="savingBusy" @click="confirmSave">
          {{ savingBusy ? 'Зберігаємо…' : 'Підтвердити збереження' }}
        </button>
        <button class="secondary" type="button" @click="saving = false">Закрити</button>
      </div>
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </section>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import { session } from '../services/session';
import { createJob, startJob, getJob } from '../composables/useJobApi';
import {
  subscribeToJob,
  recoverJobGeometry,
  clearMesh,
  updateRenderSettings,
  exportSTL,
  getMeshVertices,
} from '../composables/useRealtimeMesh';

const router = useRouter();
const saving = ref(false);
const savingBusy = ref(false);
const modelTitle = ref('');
const modelDescription = ref('');
const visibility = ref('private');

function saveModel() {
  error.value = '';

  if (!session.token) {
    router.push('/login');
    return;
  }

  if (!getMeshVertices().length) {
    error.value = 'Спочатку згенеруйте модель';
    return;
  }

  saving.value = !saving.value;
}

async function confirmSave() {
  savingBusy.value = true;
  error.value = '';

  try {
    const vertices = getMeshVertices();
    if (vertices.length > 150000) {
      throw Error('Модель завелика для збереження. Зменште роздільність (ліміт 50 000 трикутників).');
    }

    await api.post('/models', {
      title: modelTitle.value || 'Без назви',
      description: modelDescription.value,
      visibility: visibility.value,
      formula: formula.value,
      isoValue: isoValue.value,
      resolution: resolution.value,
      chunkSize: chunkSize.value,
      volumeSize: volumeSize.value,
      color: modelColor.value,
      vertices,
    });

    saving.value = false;
    router.push('/profile');
  } catch (e) {
    error.value = e.response?.data?.error || e.message;
  } finally {
    savingBusy.value = false;
  }
}

const activeGenerationId = ref(null);
const cellCount = computed(() => Number(resolution.value) ** 3);
const plannedChunks = computed(() => Math.ceil(Number(resolution.value) / Number(chunkSize.value)) ** 3);
const canSubmit = computed(
  () =>
    Number.isInteger(Number(resolution.value)) &&
    Number(resolution.value) >= 16 &&
    Number(resolution.value) <= 512 &&
    Number.isInteger(Number(chunkSize.value)) &&
    Number(chunkSize.value) >= 2 &&
    Number(chunkSize.value) <= 64 &&
    plannedChunks.value <= 8192 &&
    plannedChunks.value > 0,
);

const emit = defineEmits(['progress', 'status', 'stats', 'job', 'worker-chunk']);
const preset = ref('sphere');
const formula = ref('x*x + y*y + z*z - 64');
const isoValue = ref(0);
const resolution = ref(32);
const chunkSize = ref(8);
const volumeSize = ref(32);
const showSurface = ref(true);
const showWireframe = ref(false);
const modelColor = ref('#29c7c7');
const wireframeColor = ref('#a8e9f2');
const running = ref(false);
const error = ref('');
let interval = null;

const presets = {
  sphere: 'x*x + y*y + z*z - 64',
  torus: 'pow(sqrt(x*x + z*z) - 9, 2) + y*y - 9',
  waves: 'y - 3*sin(x/4)*cos(z/4)',
};

function applyPreset() {
  if (presets[preset.value]) {
    formula.value = presets[preset.value];
  }
}

function applyRenderSettings() {
  updateRenderSettings({
    showSurface: showSurface.value,
    showWireframe: showWireframe.value,
    modelColor: modelColor.value,
    wireframeColor: wireframeColor.value,
  });
}

function stopPolling() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

async function generate() {
  if (running.value) return;

  stopPolling();
  error.value = '';
  running.value = true;
  emit('status', 'Running');
  emit('progress', 0);
  emit('stats', { chunks: 0, triangles: 0 });

  try {
    const generationFormula = formula.value;

    if (!generationFormula.trim() || generationFormula.length > 240) {
      throw Error('Enter a formula of up to 240 characters');
    }

    if (!Number.isFinite(Number(isoValue.value))) {
      throw Error('Ізорівень має бути числом');
    }

    if (!Number.isInteger(Number(resolution.value)) || resolution.value < 16 || resolution.value > 512) {
      throw Error('Роздільність: ціле число від 16 до 512');
    }

    if (!Number.isInteger(Number(chunkSize.value)) || chunkSize.value < 2 || chunkSize.value > 64) {
      throw Error('Chunk: ціле число від 2 до 64');
    }

    if (plannedChunks.value > 8192) {
      throw Error('Максимум 8192 chunks. Збільште розмір chunk');
    }

    if (!Number.isFinite(Number(volumeSize.value)) || volumeSize.value <= 0 || volumeSize.value > 1000) {
      throw Error('Область: число від 0 до 1000');
    }

    clearMesh();
    applyRenderSettings();

    const response = await createJob({
      formula: formula.value,
      isoValue: Number(isoValue.value),
      resolution: Number(resolution.value),
      chunkSize: Number(chunkSize.value),
      volumeSize: Number(volumeSize.value),
    });

    const id = response.job._id;
    activeGenerationId.value = id;
    emit('job', id);

    subscribeToJob(
      id,
      (progressValue) => emit('progress', progressValue),
      (statsValue) => emit('stats', statsValue),
      (chunk) => emit('worker-chunk', chunk),
    );

    await startJob(id);

    interval = setInterval(async () => {
      try {
        const job = await getJob(id);
        emit('progress', job.progress || 0);
        emit('status', job.status);

        if (['Completed', 'Failed', 'Cancelled'].includes(job.status)) {
          stopPolling();

          if (job.status === 'Completed') {
            await recoverJobGeometry(id, (statsValue) => emit('stats', statsValue));
          } else {
            error.value = job.error || `Job ${job.status.toLowerCase()}`;
          }

          running.value = false;
        }
      } catch (e) {
        stopPolling();
        running.value = false;
        emit('status', 'Error');
        error.value = e.response?.data?.error || e.message;
      }
    }, 1200);
  } catch (e) {
    stopPolling();
    running.value = false;
    emit('status', 'Error');
    error.value = e.response?.data?.error || e.message;
  }
}

async function cancelGeneration() {
  try {
    const id = activeGenerationId.value;
    if (!id) return;

    await api.post(`/job/${id}/cancel`);
    stopPolling();
    running.value = false;
    emit('status', 'Cancelled');
  } catch (e) {
    error.value = e.response?.data?.error || e.message;
  }
}

function download() {
  try {
    error.value = '';
    exportSTL();
  } catch (e) {
    error.value = e.message;
  }
}

defineExpose({ download, saveModel });

onBeforeUnmount(() => {
  stopPolling();
  clearMesh();
});
</script>

<style scoped>
.generation-estimate {
  border: 1px solid #d8e0ef;
  background: #f8faff;
  border-radius: 16px;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 12px 0;
  color: #26344d;
}

.generation-estimate > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.generation-estimate span {
  font-size: 13px;
  color: #66758c;
}

.generation-estimate strong {
  font-size: 20px;
  overflow-wrap: anywhere;
}

.generation-estimate p {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.estimate-warning {
  color: #965d00;
}

.estimate-error {
  color: #ba2c38;
}

.estimate-info {
  color: #53657f;
}
</style>

