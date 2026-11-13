<template>
<main class="social-page">
  <div class="social-card auth-card">
    <RouterLink to="/">
      ← До редактора
    </RouterLink>
    <h1>
      {{register?'Створити акаунт':'Вхід'}}
    </h1>
    <p>
      Зберігай моделі та керуй їхньою видимістю.
    </p>
    <form @submit.prevent="submit">
      <label v-if="register">
        Ім’я
        <input v-model="name" required minlength="2" maxlength="80" autocomplete="name"/>
      </label>
      <label>
        Email
        <input v-model="email" type="email" required autocomplete="email"/>
      </label>
      <label>
        Пароль
        <input v-model="password" type="password" required minlength="10" :autocomplete="register?'new-password':'current-password'"/>
      </label>
      <button class="primary" :disabled="busy">
        {{busy?'Зачекайте…':register?'Зареєструватися':'Увійти'}}
      </button>
    </form>
    <p v-if="error" class="error" role="alert">
      {{error}}
    </p>
    <button class="text-button" @click="register=!register;error=''">
      {{register?'Вже є акаунт? Увійти':'Немає акаунта? Зареєструватися'}}
    </button>
  </div>
</main>
</template>
<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import { setSession } from '../services/session';

const router = useRouter();
const register = ref(false);
const name = ref('');
const email = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  busy.value = true;
  error.value = '';

  try {
    const endpoint = register.value ? '/auth/register' : '/auth/login';
    const { data } = await api.post(endpoint, {
      name: name.value,
      email: email.value,
      password: password.value,
    });

    setSession(data);
    router.push('/profile');
  } catch (requestError) {
    error.value = requestError.response?.data?.error || 'Помилка з’єднання';
  } finally {
    busy.value = false;
  }
}
</script>
