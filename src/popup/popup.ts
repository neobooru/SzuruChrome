import "../css/style.css";
import "../css/fontawesome.css";
import "../css/solid.css";

import Vue from "vue";
import App from "./App.vue";
import { applyTheme } from "../Common";

applyTheme();

new Vue({
  el: "#app",
  render: (h) => h(App),
});
