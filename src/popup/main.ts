import { createApp } from "vue";
import App from "./Popup.vue";
import { setupApp } from "~/logic/common-setup";
import { isChrome } from "~/env";

import "../styles";

// Firefox automatically makes the popup as large as can be, Chrome doesn't.
// However setting the width to 780px gives us horizontal scrollbars on Firefox.
if (isChrome) {
  document.documentElement.style.width = "780px";
}

const app = createApp(App);
setupApp(app);
app.mount("#app");
