<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import SzuruWrapper from "~/api";
import { SzuruSiteConfig } from "~/config";
import { cfg } from "~/stores";
import { getErrorMessage } from "~/utils";

let statusText = ref("Version " + browser.runtime.getManifest().version);
let statusType = ref("status-quiet");

const selectedSite = computed(() => {
  if (cfg.value.selectedSiteId) {
    return cfg.value.sites.find((x) => x.id == cfg.value.selectedSiteId);
  }
});

type StatusType = "success" | "error" | "quiet";

async function testConnection() {
  if (
    !selectedSite.value ||
    !selectedSite.value.domain ||
    !selectedSite.value.username ||
    !selectedSite.value.authToken
  ) {
    setStatus("Domain, username and authentication token are all required.", "error");
    return;
  }

  const api = new SzuruWrapper(selectedSite.value.domain, selectedSite.value.username, selectedSite.value.authToken);
  try {
    const info = await api.getInfo();
    const instanceName = info?.config.name;

    if (instanceName == undefined) {
      setStatus(`Connected to ${selectedSite.value.domain}, but it is not a szurubooru instance.`, "error");
    } else {
      setStatus(`Connected to ${info.config.name} at ${selectedSite.value.domain}`);
    }
  } catch (ex) {
    setStatus(`Couldn't connect to ${selectedSite.value.domain}. ${getErrorMessage(ex)}`, "error");
  }
}

function setStatus(text: string, type: StatusType = "success") {
  statusText.value = text;
  statusType.value = "status-" + type;
}

function addSite() {
  const site = new SzuruSiteConfig();
  cfg.value.sites.push(site);
  cfg.value.selectedSiteId = site.id;
}

function removeSelectedSite() {
  if (selectedSite.value) {
    const idx = cfg.value.sites.indexOf(selectedSite.value);
    cfg.value.sites.splice(idx, 1);
  }

  // Select first site in list, if it exists.
  if (cfg.value.sites.length > 0) {
    cfg.value.selectedSiteId = cfg.value.sites[0].id;
  }
}

let mode = useColorMode({ emitAuto: true });
</script>

<template>
  <div class="content-holder">
    <div class="content-wrapper flex flex-wrap gap-3">
      <div class="flex-fit"><strong>SzuruChrome Settings</strong></div>

      <div class="flex-fit">
        <div class="fit flex flex-wrap">
          <div class="flex-fit">
            <label>Szurubooru Instances</label>

            <!-- This isn't perfectly responsive for very small devices. -->
            <div class="fit flex gap-1 flex-fit">
              <select v-model="cfg.selectedSiteId">
                <option v-for="site in cfg.sites" :key="site.id" :value="site.id">
                  {{ site.username }} @ {{ site.domain }}
                </option>
              </select>

              <button class="primary" @click="addSite">Add</button>
              <button class="bg-danger" @click="removeSelectedSite">Remove</button>
            </div>
          </div>

          <div v-if="selectedSite" class="flex-fit flex flex-wrap gap-1 border-box pb2">
            <div style="flex: 1 1 20ch">
              <label>URL</label>
              <input
                v-if="selectedSite"
                text="Szurubooru URL"
                type="text"
                name="domain"
                v-model.lazy="selectedSite.domain"
              />
            </div>

            <div style="flex: 1 1 12ch">
              <label>Username</label>
              <input text="Username" type="text" name="username" v-model="selectedSite.username" />
            </div>

            <div style="flex: 1 1 28ch">
              <label>Authentication token</label>
              <input text="Authentication token" type="text" name="token" v-model="selectedSite.authToken" />
            </div>
          </div>
        </div>
      </div>

      <div class="flex-fit flex flex-wrap gap-3">
        <div class="settings-block" style="flex: 1 0 10ch">
          <label>Theme</label>
          <select v-model="mode">
            <option value="auto">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <p class="hint">This setting auto-saves.</p>
        </div>

        <div class="settings-block">
          <label>
            <input type="checkbox" v-model="cfg.autoSearchSimilar" />
            Automatically search for similar posts
          </label>
          <p class="hint">
            Automatically start searching for similar posts when opening the popup. Enabling this option will hide the
            "Find Similar" button.
          </p>
        </div>

        <div class="settings-block">
          <label>
            <input type="checkbox" v-model="cfg.addPageUrlToSource" />
            Add page URL to the source list
          </label>
          <p class="hint">
            This will add the current page URL (e.g. the booru link) to the source list in addition to the actual source
            (e.g. twitter/pixiv/artstation). Note: if the source is empty/not detected then the page URL will always be
            used as fallback source.
          </p>
        </div>

        <div class="settings-block">
          <label>
            <input type="checkbox" v-model="cfg.loadTagCounts" />
            Show how often a tag is used in the selected szurubooru instance
          </label>
          <p class="hint">
            Shows how often a given tag is used in the selected szurubooru instance. No number will be displayed when
            the tag does not yet exist.
          </p>
        </div>
      </div>

      <div class="flex-fit flex flex-wrap justify-between gap-3">
        <span class="status" :class="statusType">{{ statusText }}</span>

        <div class="flex gap-1">
          <button @click="testConnection">Test connection</button>
          <!-- <button @click="saveSettings" class="primary">Save settings</button> -->
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@use "~/styles/main.scss";

.content-holder {
  padding: 1.5em;
  display: flex;
  justify-content: center;

  > .content-wrapper {
    //   box-sizing: border-box;
    // text-align: left;
    // display: inline-block;
    // flex: auto;
    max-width: 1000px;
    // gap: 1rem;
    padding: 1.8em;
    background: #f5f5f5;
  }
}

html.dark .content-wrapper {
  background: var(--section-header-bg-color);
}

.settings-block {
  flex: 1 0 200px;

  label {
    padding: 0;
    margin-bottom: 0.3em;
  }
}

.hint {
  margin-top: 0.4em;
  margin-bottom: 0;
  color: var(--secondary-text);
  font-size: 80%;
  line-height: 120%;
}

.status {
  align-self: center;
}

.status-error {
  color: red;
}

.status-success {
  color: green;
}

.status-quiet {
  opacity: 0.6;
}

label {
  display: block;
  padding: 0.3em 0;
}

input[type="checkbox"] {
  margin: 0 3px 0 0;
}

@media only screen and (max-width: 600px) {
  .content-holder {
    padding: 0;
  }

  .status {
    flex: 0 0 100%;
  }
}
</style>
