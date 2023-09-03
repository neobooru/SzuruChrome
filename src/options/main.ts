import { createApp } from "vue";
import PrimeVue from "primevue/config";
import App from "./App.vue";
import { setupApp } from "~/logic/common-setup";

import "../styles/main.scss";

const app = createApp(App);
setupApp(app);
app.use(PrimeVue);
app.mount("#app");
