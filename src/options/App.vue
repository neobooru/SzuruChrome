<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import SzuruWrapper from "~/api";
import { SzuruSiteConfig } from "~/config";
import { cfg } from "~/stores";
import { getErrorMessage } from "~/utils";

import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";

const statusText = ref("");
const statusType = ref("status-quiet");
const versionInfo = "Version: " + (import.meta.env.VITE_SZ_VERSION_INFO ?? browser.runtime.getManifest().version);

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
    <div class="content-wrapper flex flex-column gap-3">
      <div><strong>SzuruChrome Settings</strong></div>

      <TabView>
        <TabPanel header="General">
          <div class="grid grid-nogutter gap-3">
            <div class="col-12 md:col-6">
              <label>Theme</label>
              <select v-model="mode">
                <option value="auto">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <p class="hint">This setting auto-saves.</p>
            </div>

            <div class="col-12 md:col-6">
              <label>
                <input type="checkbox" v-model="cfg.autoSearchSimilar" />
                Automatically search for similar posts
              </label>
              <p class="hint">
                Automatically start searching for similar posts when opening the popup. Enabling this option will hide
                the "Find Similar" button.
              </p>
            </div>

            <div class="col-12 md:col-6">
              <label>
                <input type="checkbox" v-model="cfg.addPageUrlToSource" />
                Add page URL to the source list
              </label>
              <p class="hint">
                This will add the current page URL (e.g. the booru link) to the source list in addition to the actual
                source (e.g. twitter/pixiv/artstation). Note: if the source is empty/not detected then the page URL will
                always be used as fallback source.
              </p>
            </div>

            <div class="col-12 md:col-6">
              <label>
                <input type="checkbox" v-model="cfg.addAllParsedTags" />
                Automatically import all tags on supported pages
              </label>
              <p class="hint">
                This will automatically import all tags, including their categories, on supported pages such as Danbooru
                and Zerochan.
              </p>
            </div>

            <div class="col-12 md:col-6">
              <label>
                <input type="checkbox" v-model="cfg.loadTagCounts" />
                Show how often a tag is used in the selected szurubooru instance
              </label>
              <p class="hint">
                Shows how often a given tag is used in the selected szurubooru instance. No number will be displayed
                when the tag does not yet exist.
              </p>
            </div>

            <span class="col-12 status-quiet">{{ versionInfo }}</span>
          </div>
        </TabPanel>

        <TabPanel header="Instances">
          <div class="formgrid grid">
            <div class="field col-12">
              <label>Szurubooru Instances</label>

              <div class="flex gap-1">
                <select v-model="cfg.selectedSiteId">
                  <option v-for="site in cfg.sites" :key="site.id" :value="site.id">
                    {{ site.username }} @ {{ site.domain }}
                  </option>
                </select>

                <button class="primary" @click="addSite">Add</button>
                <button class="bg-danger" @click="removeSelectedSite">Remove</button>
              </div>
            </div>

            <template v-if="selectedSite">
              <div class="field col-12">
                <label>URL</label>
                <input
                  v-if="selectedSite"
                  text="Szurubooru URL"
                  type="text"
                  name="domain"
                  v-model="selectedSite.domain"
                />
              </div>

              <div class="field col-12 md:col-6">
                <label>Username</label>
                <input text="Username" type="text" name="username" v-model="selectedSite.username" />
              </div>

              <div class="field col-12 md:col-6">
                <label>Authentication token</label>
                <input text="Authentication token" type="text" name="token" v-model="selectedSite.authToken" />
              </div>

              <div class="col-12 flex flex-wrap justify-content-between gap-3">
                <span class="status" :class="statusType">{{ statusText }}</span>
                <button @click="testConnection">Test connection</button>
              </div>
            </template>
          </div>
        </TabPanel>

        <TabPanel header="Tags">
          <!-- TODO: Tag category colors -->

          <!-- TODO: Tag ignore list -->

          <!-- TODO: Category ignore list -->
        </TabPanel>

        <!-- TODO: Settings import/export? -->
      </TabView>
    </div>
  </div>
</template>

<style lang="scss">
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
