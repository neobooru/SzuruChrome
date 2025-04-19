<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import SzuruWrapper from "~/api";
import { cfg } from "~/stores";
import { getErrorMessage } from "~/utils";

import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import { TagDetails, SzuruSiteConfig, TagCategoryColor, getDefaultTagCategories } from "~/models";
import SzurubooruApi from "~/api";

type StatusType = "success" | "error" | "quiet";

const statusText = ref("");
const statusType = ref("status-quiet");
const versionInfo = "Version: " + (import.meta.env.VITE_SZ_VERSION ?? browser.runtime.getManifest().version);

const columns = ref([
  { field: "name", header: "Category name" },
  { field: "color", header: "CSS color" },
]);

const selectedSite = computed(() => {
  if (cfg.value.selectedSiteId) {
    return cfg.value.sites.find((x) => x.id == cfg.value.selectedSiteId);
  }
});

const mode = useColorMode({ emitAuto: true });

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

function resetTagCategories() {
  cfg.value.tagCategories.splice(0);
  cfg.value.tagCategories.push(...getDefaultTagCategories());
}

function addTagCategory() {
  cfg.value.tagCategories.push(new TagCategoryColor("category", "#abcdef"));
}

async function importTagCategoriesFromInstance() {
  const szuruConfig = cfg.value.sites.find((x) => x.id == cfg.value.selectedSiteId)!;
  const szuru = SzurubooruApi.createFromConfig(szuruConfig);
  const cats = (await szuru.getTagCategories()).results;

  for (const cat of cats) {
    if (cat.name == "default") continue;

    if (!cfg.value.tagCategories.find((x) => x.name == cat.name)) {
      cfg.value.tagCategories.push(new TagCategoryColor(cat.name, cat.color));
    }
  }
}

function addTagIgnore() {
  cfg.value.tagIgnores.push(new TagDetails([""]))
}

function resetTagIgnores() {
  cfg.value.tagIgnores.splice(0);
}

// For debugging
const wnd = window as any;
wnd.szc_get_config = () => JSON.parse(JSON.stringify(cfg.value));
wnd.szc_set_config_version = (v = 0) => (cfg.value.version = v);
</script>

<template>
  <div class="content-holder">
    <div class="content-wrapper flex flex-auto flex-column gap-3">
      <div><strong>SzuruChrome Settings</strong></div>

      <TabView>
        <TabPanel header="General">
          <div class="grid">
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
                <input type="checkbox" v-model="cfg.alwaysUploadAsContent" />
                Always upload as content
              </label>
              <p class="hint">
                This will always upload the image content directly, instead of
                as an URL
              </p>
            </div>

            <span class="col-12 status-quiet">{{ versionInfo }}</span>
          </div>
        </TabPanel>

        <TabPanel header="Interface">
          <div class="grid">
            <div class="col-12 md:col-6 mb-2">
              <label>Theme</label>
              <select v-model="mode">
                <option value="auto">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>

          <div class="grid">
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
                <input type="checkbox" v-model="cfg.loadTagCounts" />
                Show how often a tag is used in the selected szurubooru instance
              </label>
              <p class="hint">
                Shows how often a given tag is used in the selected szurubooru instance. No number will be displayed
                when the tag does not yet exist.
              </p>
            </div>

            <div class="col-12 md:col-6">
              <label>
                <input type="checkbox" v-model="cfg.popup.showSource" />
                Show source textbox in popup
              </label>
            </div>

            <div class="col-12 md:col-6">
              <label>
                <input type="checkbox" v-model="cfg.popup.showPools" />
                Show pools in popup
              </label>
            </div>

            <div class="col-12 md:col-6">
              <label>
                <input type="checkbox" v-model="cfg.popup.showInstancePicker" />
                Show instance picker in popup
              </label>
            </div>
          </div>
        </TabPanel>

        <TabPanel header="Instances">
          <div class="formgrid grid">
            <div class="field col-12">
              <label>Selected Szurubooru Instance</label>

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
          <div class="grid">
            <DataTable :value="cfg.tagCategories" table-class="col-12" style="width: 100%">
              <Column v-for="col of columns" :key="col.field" :field="col.field" :header="col.header">
                <template #body="{ data, field }">
                  <template v-if="field == 'color'">
                    <div class="color-preview">
                      <input type="text" class="color" v-model="data[field]" />
                      <div
                        class="preview background-preview"
                        :style="{ 'border-color': data[field], 'background-color': data[field] }"
                      ></div>
                      <div
                        class="preview text-preview"
                        :style="{ 'border-color': data[field], color: data[field] }"
                      ></div>
                    </div>
                  </template>

                  <template v-else>
                    <input type="text" :name="field" v-model="data[field]" />
                  </template>
                </template>
              </Column>

              <Column field="name">
                <template #body="{ index }">
                  <a class="color-primary cursor-pointer" @click="() => cfg.tagCategories.splice(index, 1)">Remove</a>
                </template>
              </Column>
            </DataTable>

            <div class="col-12 flex flex-wrap grid grid-nogutter gap-1">
              <button class="primary" @click="addTagCategory">Add new category</button>
              <button @click="importTagCategoriesFromInstance">Import from active instance</button>
              <button class="bg-danger sm:ml-auto" @click="resetTagCategories">Reset to default</button>
            </div>
          </div>

          <!-- TODO: Tag category colors -->

          <div class="grid">
            <DataTable :value="cfg.tagIgnores" table-class="col-12" style="width: 100%">
              <Column field="names" :header="'Names'">
                <template #body="{ data, field }">
                  <input type="text" :name="field" v-model="data[field][0]" />
                </template>
              </Column>

              <Column field="remove">
                <template #body="{ index }">
                  <a class="color-primary cursor-pointer" @click="() => cfg.tagIgnores.splice(index, 1)">Remove</a>
                </template>
              </Column>
            </DataTable>

            <div class="col-12 flex flex-wrap grid grid-nogutter gap-1">
              <button class="primary" @click="addTagIgnore">Add tag</button>
              <button class="bg-danger sm:ml-auto" @click="resetTagIgnores">Clear</button>
            </div>
          </div>

          <!-- TODO: Category ignore list -->
        </TabPanel>

        <!-- <TabPanel header="About">
          <div class="grid">
            <div v-for="engine in scraper.engines" :key="engine.name" class="col-12 md:col-4 flex flex-column">
              <span class="font-bold">{{ engine.name }}</span>
              <span>Features: {{ engine.features.join(", ") }}</span>
              <span>Hosts: {{ engine.supportedHosts.join(", ") }}</span>
            </div>
          </div>
        </TabPanel> -->

        <!--
        <TabPanel header="Developer">
          <div class="flex flex-column gap-2">
            <b>Config</b>
            <Textarea v-model="configText" autoResize rows="16" />

            <div class="flex flex-wrap gap-1">
              <button class="primary" @click="showConfig">Show config</button>
              <button class="bg-danger" @click="importConfig">Import config</button>
            </div>
          </div>
        </TabPanel>
        -->
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
    // box-sizing: border-box;
    text-align: left;
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

div.color-preview {
  white-space: nowrap;
  position: relative;
  display: flex;

  input {
    margin-right: 0.5em;
  }

  .preview {
    display: inline-block;
    text-align: center;
    padding: 0 0.5em;
    border: 2px solid #000;

    &::after {
      content: "A";
    }
  }

  .background-preview {
    border-right: 0;
    border-right-color: currentcolor;
    color: transparent;
  }
}
</style>
