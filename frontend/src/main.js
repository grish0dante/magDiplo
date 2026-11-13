import {restoreSession} from './services/session';
restoreSession();
import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';

import './layout.css';
import './style.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
import './studio-redesign.css';
import './responsive-fix.css';
