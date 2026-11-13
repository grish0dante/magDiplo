import {
  createRouter,
  createWebHistory
} from 'vue-router';

import HomeView from '../views/HomeView.vue';
import AboutView from '../views/AboutView.vue';
import AuthView from '../views/AuthView.vue';
import ProfileView from '../views/ProfileView.vue';
import GalleryView from '../views/GalleryView.vue';
import ModelView from '../views/ModelView.vue';
import {session} from '../services/session';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: HomeView
    },
    {path:'/login',component:AuthView},
    {path:'/profile',component:ProfileView,meta:{auth:true}},
    {path:'/gallery',component:GalleryView},
    {path:'/models/:id',component:ModelView},
    {
      path: '/about',
      name: 'about',
      component: AboutView
    }
  ]
});

router.beforeEach(to=>{if(to.meta.auth&&!session.token)return '/login'});
export default router;
