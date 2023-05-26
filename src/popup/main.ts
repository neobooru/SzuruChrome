import { createApp } from "vue";
import { setupApp } from "~/logic/common-setup";
import { isChrome, isMobile } from "~/env";
import { createRouter, createWebHashHistory } from "vue-router";

import App from "./App.vue";
import PopupMain from "./pages/PopupMain.vue";
import MergePost from "./pages/MergePost.vue";

// Firefox automatically makes the popup as large as can be, Chrome doesn't.
// However setting the width to 780px gives us horizontal scrollbars on Firefox.
if (isChrome && !isMobile) {
  document.documentElement.style.width = "780px";
}

const routes = [
  { path: "/", component: PopupMain },
  { name: "merge", path: "/merge/:siteId/:postId", component: MergePost, props: true },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

const app = createApp(App);
setupApp(app);
app.use(router);
app.mount("#app");
