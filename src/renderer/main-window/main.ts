import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { MotionPlugin } from '@vueuse/motion';
import 'diff2html/bundles/css/diff2html.min.css';
import App from './App.vue';

const app = createApp(App);
app.use(createPinia());
app.use(MotionPlugin);
app.mount('#app');
