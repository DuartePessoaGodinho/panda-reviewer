import { createApp } from 'vue';
import { createPinia } from 'pinia';
import 'diff2html/bundles/css/diff2html.min.css';
import App from './App.vue';

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
