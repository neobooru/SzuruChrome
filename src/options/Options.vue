<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import SzuruWrapper from "~/api";
import { Config, SzuruSiteConfig } from "~/config";

let autoSearchSimilar = ref(false);
let loadTagCounts = ref(false);
let addPageUrlToSource = ref(false);
let useContentTokens = ref(false);
let statusText = ref("");
let statusType = ref("");
let sites = reactive<SzuruSiteConfig[]>([]);
let selectedSiteId = ref<string | undefined>(undefined);
const selectedSite = computed(() => {
  if (selectedSiteId.value) {
    return sites.find((x) => x.id == selectedSiteId.value);
  }
});

type StatusType = "ok" | "error";

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
    const info = (await api.getInfo()) as any;
    const instanceName = info?.config.name;

    if (instanceName == undefined) {
      setStatus(`Connected to ${selectedSite.value.domain}, but it is not a szurubooru instance.`, "error");
    } else {
      setStatus(`Connected to ${info.config.name} at ${selectedSite.value.domain}`);
    }
  } catch (ex) {
    // TODO: This error message is not very descriptive.
    console.dir(ex);
    setStatus("Couldn't connect to " + selectedSite.value.domain + "\n\n" + ex, "error");
  }
}

async function saveSettings() {
  let config = await Config.load();

  config.sites = sites;
  config.autoSearchSimilar = autoSearchSimilar.value;
  config.loadTagCounts = loadTagCounts.value;
  config.addPageUrlToSource = addPageUrlToSource.value;
  config.useContentTokens = useContentTokens.value;
  config.selectedSiteId = selectedSiteId.value;

  await config.save();

  setStatus("Settings successfully saved");
}

function setStatus(text: string, type: StatusType = "ok") {
  statusText.value = text;
  statusType.value = "status-" + type;
}

function addSite() {
  const site = new SzuruSiteConfig();
  sites.push(site);
  selectedSiteId.value = site.id;
}

function removeSelectedSite() {
  if (selectedSite.value) {
    const idx = sites.indexOf(selectedSite.value);
    sites.splice(idx, 1);
  }
}

onMounted(async () => {
  let config = await Config.load();

  for (let site of config.sites) {
    // Generate IDs for sites which are missing them.
    // This is needed to correctly import old configs.
    if (!site.id) {
      site.id = window.crypto.randomUUID();
    }

    // This somehow makes `site` reactive.
    sites.push(site);
  }

  autoSearchSimilar.value = config.autoSearchSimilar;
  loadTagCounts.value = config.loadTagCounts;
  addPageUrlToSource.value = config.addPageUrlToSource;
  useContentTokens.value = config.useContentTokens;
  selectedSiteId.value = config.selectedSiteId;
});

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
            <div class="fit flex gapx-1 flex-fit">
              <select v-model="selectedSiteId">
                <option v-for="site in sites" :key="site.id" :value="site.id">
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
            <input type="checkbox" v-model="autoSearchSimilar" />
            Automatically search for similar posts
          </label>
          <p class="hint">
            Automatically start searching for similar posts when opening the popup. Enabling this option will hide the
            "Find Similar" button.
          </p>
        </div>

        <div class="settings-block">
          <label>
            <input type="checkbox" v-model="addPageUrlToSource" />
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
            <input type="checkbox" v-model="loadTagCounts" />
            Show how often a tag is used in the selected szurubooru instance
          </label>
          <p class="hint">
            Shows how often a given tag is used in the selected szurubooru instance. No number will be displayed when
            the tag does not yet exist.
          </p>
        </div>
      </div>

      <div class="flex-fit flex justify-end gap-1">
        <button @click="testConnection">Test connection</button>
        <button @click="saveSettings" class="primary">Save settings</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
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

label {
  display: block;
  padding: 0.3em 0;
}

input[type="checkbox"] {
  margin: 0 3px 0 0;
}
</style>
