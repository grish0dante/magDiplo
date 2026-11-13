<template>
<div class="about-shell">
  <header class="topbar about-topbar">
    <RouterLink class="brand brand-link" to="/">
      <span class="brand-mark">
        ◈
      </span>
      <span>
        <strong>
          Marching Cubes
          <span class="accent">
            Studio
          </span>
        </strong>
        <small>
          DISTRIBUTED SURFACE COMPUTING
        </small>
      </span>
    </RouterLink>
    <nav class="page-nav" aria-label="Основна навігація">
      <RouterLink to="/">
        3D-редактор
      </RouterLink>
      <RouterLink to="/about">
        Про розробника
      </RouterLink>
    </nav>
  </header>
  <main class="about-main">
    <RouterLink class="back-link" to="/">
      ← Повернутися до 3D-редактора
    </RouterLink>
    <div class="about-heading">
      <span class="eyebrow">
        ПРО ПРОЄКТ ТА АВТОРА
      </span>
      <h1>
        Про розробника
      </h1>
      <p>
        Інформація про автора та технології розподіленої реалізації алгоритму Marching Cubes.
      </p>
    </div>
    <div class="about-layout">
      <section class="about-card developer-card" aria-labelledby="developer-title">
        <div class="avatar" aria-hidden="true">
          {{ initials }}
        </div>
        <span class="eyebrow">
          РОЗРОБНИК
        </span>
        <h2 id="developer-title">
          {{ developer.fullName }}
        </h2>
        <div class="developer-meta">
          <span>
            Академічна група
          </span>
          <strong>
            {{ developer.group }}
          </strong>
        </div>
        <p class="developer-note">
          {{ developer.description }}
        </p>
      </section>
      <section class="about-card" aria-labelledby="project-title">
        <span class="eyebrow">
          ПРО РОБОТУ
        </span>
        <h2 id="project-title">
          Розподілений Marching Cubes
        </h2>
        <p>
          Вебзастосунок для генерації та інтерактивної візуалізації ізоповерхонь тривимірних скалярних полів. Завдання обробляються окремими обчислювальними вузлами, а результат відображається у 3D-сцені.
        </p>
        <div class="about-features">
          <span>
            ◈ 3D-візуалізація
          </span>
          <span>
            ◈ Паралельні обчислення
          </span>
          <span>
            ◈ Моніторинг прогресу
          </span>
          <span>
            ◈ Контейнерне масштабування
          </span>
        </div>
      </section>
    </div>
    <section class="about-card tech-section" aria-labelledby="tech-title">
      <span class="eyebrow">
        ТЕХНОЛОГІЧНИЙ СТЕК
      </span>
      <h2 id="tech-title">
        Використані технології
      </h2>
      <div class="tech-grid">
        <article v-for="tech in technologies" :key="tech.name" class="tech-item">
          <span class="tech-icon" aria-hidden="true">
            {{ tech.icon }}
          </span>
          <div>
            <h3>
              {{ tech.name }}
            </h3>
            <p>
              {{ tech.description }}
            </p>
          </div>
        </article>
      </div>
    </section>
  </main>
  <footer class="footer">
    <span>
      Marching Cubes · Distributed mesh generation
    </span>
    <RouterLink to="/">
      Відкрити редактор →
    </RouterLink>
  </footer>
</div>
</template>
<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import developer from '../config/developer.js';
const initials = computed(() => developer.fullName === 'Грішанов Данило Євгенович' ? 'DEV' : developer.fullName.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase());
const technologies = [
  { name: 'Vue 3', icon: 'V', description: 'Інтерфейс користувача та реактивні компоненти' },
  { name: 'Three.js / WebGL', icon: '◈', description: 'Тривимірна сцена й інтерактивна візуалізація' },
  { name: 'Web Workers', icon: '⚙', description: 'Технологія паралельних обчислень у браузері (запланована)' },
  { name: 'Node.js', icon: '⬡', description: 'Серверне API та координація завдань' },
  { name: 'Redis / BullMQ', icon: '▤', description: 'Черга завдань і розподіл роботи між workers' },
  { name: 'MongoDB', icon: '◉', description: 'Зберігання даних про задачі та моделі' },
  { name: 'Docker', icon: '▣', description: 'Контейнеризація компонентів системи' },
  { name: 'Kubernetes', icon: '☸', description: 'Оркестрація та масштабування контейнерів' }
];
</script>
