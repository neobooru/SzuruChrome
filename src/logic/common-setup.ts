import type { App } from "vue";
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faCog, faChevronDown, faChevronUp, faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { createPinia } from "pinia";

export function setupPinia(app: App) {
  const pinia = createPinia();
  app.use(pinia);
}

export function setupApp(app: App) {
  setupPinia(app);

  library.add(faCog);
  library.add(faChevronDown);
  library.add(faChevronUp);
  library.add(faChevronLeft);
  app.component("font-awesome-icon", FontAwesomeIcon);
}
