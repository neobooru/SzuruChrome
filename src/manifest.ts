import fs from "fs-extra";
import type { Manifest } from "webextension-polyfill";
import type PkgType from "../package.json";
import { isDev, port, r } from "../scripts/utils";

export async function getManifest() {
  const pkg = (await fs.readJSON(r("package.json"))) as typeof PkgType;

  // update this file to update this manifest.json
  // can also be conditional based on your need
  const manifest: Manifest.WebExtensionManifest = {
    name: pkg.displayName,
    description: pkg.description,
    version: process.env.SZ_VERSION || pkg.version,
    manifest_version: 2,
    icons: {
      16: "./assets/icon-128.png",
      48: "./assets/icon-128.png",
      128: "./assets/icon-128.png",
    },
    browser_action: {
      default_title: pkg.displayName,
      default_popup: "./dist/popup/index.html",
    },
    options_ui: {
      page: "./dist/options/index.html",
      open_in_tab: true,
      chrome_style: false,
    },
    background: {
      page: "./dist/background/index.html",
      // persistent: false,
    },
    permissions: ["storage", "activeTab", "webRequest", "webRequestBlocking", "<all_urls>"],
    content_scripts: [
      {
        matches: ["http://*/*", "https://*/*"],
        js: ["./dist/contentScripts/index.global.js"],
      },
    ],
    browser_specific_settings: {
      gecko: {
        id: "{13372607-2257-4360-8f51-5ce66fa73350}",
      },
    },
  };

  if (isDev) {
    // for content script, as browsers will cache them for each reload,
    // we use a background script to always inject the latest version
    // see src/background/contentScriptHMR.ts
    delete manifest.content_scripts;
    manifest.permissions?.push("webNavigation");

    // this is required on dev for Vite script to load
    manifest.content_security_policy = `script-src 'self' http://localhost:${port}; object-src 'self'`;
  }

  return manifest;
}
