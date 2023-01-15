import "normalize.css";
import "../css/style.scss";
import "../css/fontawesome.css";
import "../css/solid.css";

import Vue from "vue";
import App from "./App.vue";
import { applyTheme } from "../Common";

applyTheme();

// Firefox automatically makes the popup as large as can be, Chrome doesn't.
// However setting the width to 780px gives us horizontal scrollbars on Firefox.
if (navigator.userAgent.match(/chrome|chromium|crios/i)) {
  document.documentElement.style.width = "780px";
}

new Vue({
  el: "#app",
  render: (h) => h(App),
});
