import type { App } from "vue";
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";

export function setupApp(app: App) {
  library.add(faCog);
  app.component("font-awesome-icon", FontAwesomeIcon);
}
