import { createRouter, createWebHistory } from 'vue-router';
import Welcome from '@/views/Welcome.vue';
export function createAppRouter(base: string) {
  return createRouter({ history: createWebHistory(base), routes: [
    { path: '/', name: 'welcome', component: Welcome },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFound.vue') },
  ] });
}
