<template>
  <main class="social-page library-page">
    <header class="social-header gallery-header">
      <div>
        <RouterLink class="back-link" to="/">← Повернутися до редактора</RouterLink>
        <div class="page-kicker">ОСОБИСТИЙ ПРОСТІР</div>
        <h1>Моя бібліотека</h1>
        <p>Моделі користувача {{ session.user?.name || 'Користувач' }}</p>
      </div>
      <button class="secondary" @click="signOut">Вийти з акаунта</button>
    </header>

    <div class="library-summary">
      <div><span>Збережено моделей</span><strong>{{ models.length }}</strong></div>
      <div><span>Публічних</span><strong>{{ models.filter((model) => model.visibility === 'public').length }}</strong></div>
      <RouterLink class="gallery-cta" to="/">+ Створити модель</RouterLink>
    </div>

    <p v-if="error" class="error gallery-message" role="alert">{{ error }}</p>
    <div v-if="loading" class="gallery-empty">Завантаження бібліотеки…</div>
    <div v-else-if="!models.length" class="gallery-empty">
      <div class="empty-symbol">◇</div>
      <h2>Тут поки немає моделей</h2>
      <p>Створіть першу модель у редакторі та збережіть її.</p>
      <RouterLink class="gallery-cta" to="/">Перейти до редактора</RouterLink>
    </div>
    <div v-else class="model-grid gallery-grid">
      <article v-for="(model, index) in models" :key="model._id" class="gallery-card library-card">
        <RouterLink :to="`/models/${model._id}`" class="gallery-card-art" :class="`art-variant-${index % 4}`">
          <span class="art-grid" aria-hidden="true"></span>
          <span class="art-object" aria-hidden="true">✧</span>
          <span class="art-note">Ілюстрація · не прев’ю моделі</span>
          <span class="card-open" aria-hidden="true">↗</span>
        </RouterLink>
        <div class="gallery-card-body">
          <div class="gallery-card-meta"><span class="public-pill" :class="`visibility-${model.visibility}`">{{ visibilityLabel(model.visibility) }}</span><span>{{ formatDate(model.createdAt) }}</span></div>
          <h2>{{ model.title || 'Без назви' }}</h2>
          <p>{{ model.description || 'Без опису' }}</p>
          <label class="visibility-field">Видимість моделі
            <select :value="model.visibility" @change="updateVisibility(model, $event.target.value)">
              <option value="private">Приватна</option>
              <option value="unlisted">За посиланням</option>
              <option value="public">Публічна</option>
            </select>
          </label>
          <div class="library-actions">
            <RouterLink :to="`/models/${model._id}`">Переглянути ↗</RouterLink>
            <button type="button" @click="copyLink(model)">Копіювати</button>
            <button type="button" class="danger-text" @click="modelToDelete = model">Видалити</button>
          </div>
        </div>
      </article>
    </div>

    <div v-if="modelToDelete" class="modal-backdrop" @click.self="modelToDelete = null">
      <section class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" @keydown.esc="modelToDelete = null">
        <div class="dialog-icon">!</div>
        <h2 id="delete-title">Видалити модель?</h2>
        <p id="delete-description">«{{ modelToDelete.title }}» буде видалено назавжди. Цю дію неможливо скасувати.</p>
        <div class="dialog-actions">
          <button class="secondary" type="button" @click="modelToDelete = null">Скасувати</button>
          <button class="danger-button" type="button" :disabled="deleting" @click="confirmDelete">{{ deleting ? 'Видалення…' : 'Так, видалити' }}</button>
        </div>
      </section>
    </div>
    <div v-if="notice" class="ui-toast" role="status">{{ notice }} <button aria-label="Закрити сповіщення" @click="notice = ''">×</button></div>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import { logout, session } from '../services/session';

const router = useRouter();
const models = ref([]);
const loading = ref(true);
const deleting = ref(false);
const error = ref('');
const notice = ref('');
const modelToDelete = ref(null);

function visibilityLabel(value) {
  return { private: '● Приватна', unlisted: '● За посиланням', public: '● Публічна' }[value] || '● Приватна';
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('uk-UA');
}

async function loadModels() {
  try {
    const { data } = await api.get('/models/mine');
    models.value = Array.isArray(data.models) ? data.models : [];
  } catch (requestError) {
    error.value = requestError.response?.data?.error || requestError.message;
  } finally {
    loading.value = false;
  }
}

async function updateVisibility(model, visibility) {
  const previous = model.visibility;
  model.visibility = visibility;
  try {
    await api.patch(`/models/${model._id}`, { visibility });
    notice.value = 'Видимість оновлено';
  } catch (requestError) {
    model.visibility = previous;
    error.value = requestError.response?.data?.error || 'Не вдалося оновити видимість.';
  }
}

async function copyLink(model) {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/models/${model._id}`);
    notice.value = 'Посилання скопійовано';
  } catch {
    error.value = 'Не вдалося скопіювати посилання.';
  }
}

async function confirmDelete() {
  if (!modelToDelete.value || deleting.value) return;
  deleting.value = true;
  try {
    const id = modelToDelete.value._id;
    await api.delete(`/models/${id}`);
    models.value = models.value.filter((model) => model._id !== id);
    modelToDelete.value = null;
    notice.value = 'Модель видалено';
  } catch (requestError) {
    error.value = requestError.response?.data?.error || 'Не вдалося видалити модель.';
  } finally {
    deleting.value = false;
  }
}

function signOut() {
  logout();
  router.push('/login');
}

onMounted(loadModels);
</script>
