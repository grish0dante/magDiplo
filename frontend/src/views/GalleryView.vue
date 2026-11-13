<template>
  <main class="social-page gallery-page">
    <header class="social-header gallery-header">
      <div>
        <RouterLink class="back-link" to="/">← Повернутися до редактора</RouterLink>
        <div class="page-kicker">СПІЛЬНОТА · 3D МОДЕЛІ</div>
        <h1>Галерея моделей</h1>
        <p>Досліджуйте ізоповерхні, створені спільнотою.</p>
      </div>
      <RouterLink class="gallery-cta" to="/profile">Моя бібліотека <span aria-hidden="true">↗</span></RouterLink>
    </header>

    <div class="gallery-toolbar">
      <div class="gallery-count"><span class="count-dot"></span> {{ models.length }} моделей завантажено</div>
      <label class="gallery-search-label">
        <span aria-hidden="true">⌕</span>
        <input v-model.trim="search" type="search" placeholder="Пошук за назвою або автором" aria-label="Пошук моделей" />
      </label>
    </div>

    <p v-if="error" class="error gallery-message" role="alert">{{ error }}</p>
    <div v-if="loading" class="model-grid" aria-busy="true">
      <div v-for="n in 6" :key="n" class="gallery-skeleton" />
    </div>
    <div v-else-if="!filteredModels.length" class="gallery-empty">
      <div class="empty-symbol">◇</div>
      <h2>{{ models.length ? 'Нічого не знайдено' : 'Галерея поки порожня' }}</h2>
      <p>{{ models.length ? 'Спробуйте інший пошуковий запит.' : 'Опублікуйте першу модель у своїй бібліотеці.' }}</p>
      <button v-if="search" class="secondary" @click="search = ''">Очистити пошук</button>
      <RouterLink v-else class="gallery-cta" to="/">Створити модель</RouterLink>
    </div>
    <div v-else class="model-grid gallery-grid">
      <RouterLink
        v-for="(model, index) in filteredModels"
        :key="model._id"
        class="gallery-card"
        :to="`/models/${model._id}`"
      >
        <div class="gallery-card-art" :class="`art-variant-${index % 4}`">
          <span class="art-grid" aria-hidden="true"></span>
          <span class="art-object" aria-hidden="true">✧</span>
          <span class="art-note">Ілюстрація · не прев’ю моделі</span>
          <span class="card-open" aria-hidden="true">↗</span>
        </div>
        <div class="gallery-card-body">
          <div class="gallery-card-meta"><span class="public-pill">● Публічна</span><span>{{ formatDate(model.createdAt) }}</span></div>
          <h2>{{ model.title || 'Без назви' }}</h2>
          <p>{{ model.description || 'Ізоповерхня, створена алгоритмом Marching Cubes.' }}</p>
          <div class="gallery-card-footer">
            <span class="author-avatar">{{ (model.owner?.name || 'К').slice(0, 1).toUpperCase() }}</span>
            <span class="author-name">{{ model.owner?.name || 'Користувач' }}</span>
            <span class="triangle-stat">{{ formatCount(model.triangleCount) }} △</span>
          </div>
        </div>
      </RouterLink>
    </div>
    <div v-if="models.length >= page * 12" class="gallery-more">
      <button class="secondary" :disabled="loadingMore" @click="loadMore">
        {{ loadingMore ? 'Завантаження…' : 'Показати ще моделі' }}
      </button>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import api from '../services/api';

const models = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref('');
const search = ref('');
const page = ref(1);

const filteredModels = computed(() => {
  const query = search.value.toLocaleLowerCase('uk');
  if (!query) return models.value;
  return models.value.filter((model) =>
    [model.title, model.description, model.owner?.name]
      .some((value) => String(value || '').toLocaleLowerCase('uk').includes(query))
  );
});

function formatDate(value) {
  if (!value) return 'Нещодавно';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Нещодавно' : date.toLocaleDateString('uk-UA');
}

function formatCount(value) {
  return new Intl.NumberFormat('uk-UA', { notation: 'compact', maximumFractionDigits: 1 })
    .format(Number(value) || 0);
}

async function loadModels() {
  error.value = '';
  try {
    const { data } = await api.get('/models/gallery', { params: { page: page.value } });
    const incoming = Array.isArray(data.models) ? data.models : [];
    models.value = page.value === 1 ? incoming : [...models.value, ...incoming];
  } catch (requestError) {
    error.value = requestError.response?.data?.error || 'Не вдалося завантажити галерею.';
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

async function loadMore() {
  if (loadingMore.value) return;
  loadingMore.value = true;
  page.value += 1;
  await loadModels();
}

onMounted(loadModels);
</script>
