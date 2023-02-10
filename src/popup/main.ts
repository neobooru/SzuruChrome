import { createApp } from "vue";
import App from "./App.vue";
import { setupApp } from "~/logic/common-setup";
import { isChrome, isMobile } from "~/env";

// Firefox automatically makes the popup as large as can be, Chrome doesn't.
// However setting the width to 780px gives us horizontal scrollbars on Firefox.
if (isChrome && !isMobile) {
  document.documentElement.style.width = "780px";
}

const app = createApp(App);
setupApp(app);
app.mount("#app");
