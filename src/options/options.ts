import "../css/style.css";

import Vue from "vue";
import App from "./App.vue";
import { applyTheme } from "../Common";

applyTheme();

new Vue({
  el: "#app",
  render: h => h(App)
});
