<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import SzuruWrapper from "~/api";
import { Config } from "~/config";

let domain = ref("");
let username = ref("");
let authToken = ref("");
let autoSearchSimilar = ref(false);
let loadTagCounts = ref(false);
let addPageUrlToSource = ref(false);
let useContentTokens = ref(false);
let statusText = ref("");
let statusType = ref("");

type StatusType = "ok" | "error";

async function testConnection() {
  if (!domain.value || !username.value || !authToken.value) {
    setStatus("Domain, username and authentication token are all required.", "error");
    return;
  }

  const api = new SzuruWrapper(domain.value, username.value, authToken.value);
  try {
    const info = (await api.getInfo()) as any;
    const instanceName = info?.config.name;

    if (instanceName == undefined) {
      setStatus(`Connected to ${domain.value}, but it is not a szurubooru instance.`, "error");
    } else {
      setStatus(`Connected to ${info.config.name} at ${domain.value}`);
    }
  } catch (ex) {
    // TODO: This error message is not very descriptive.
    console.dir(ex);
    setStatus("Couldn't connect to " + domain.value + "\n\n" + ex, "error");
  }
}

async function saveSettings() {
  let config = await Config.load();

  // We currently only support one domain
  config.sites = [
    {
      domain: domain.value,
      username: username.value,
      authToken: authToken.value,
    },
  ];
  config.autoSearchSimilar = autoSearchSimilar.value;
  config.loadTagCounts = loadTagCounts.value;
  config.addPageUrlToSource = addPageUrlToSource.value;
  config.useContentTokens = useContentTokens.value;

  await config.save();

  setStatus("Settings successfully saved");
}

function setStatus(text: string, type: StatusType = "ok") {
  statusText.value = text;
  statusType.value = "status-" + type;
}

onMounted(async () => {
  let config = await Config.load();

  if (config.sites.length > 0) {
    domain.value = config.sites[0].domain;
    username.value = config.sites[0].username;
    authToken.value = config.sites[0].authToken;
  }

  autoSearchSimilar.value = config.autoSearchSimilar;
  loadTagCounts.value = config.loadTagCounts;
  addPageUrlToSource.value = config.addPageUrlToSource;
  useContentTokens.value = config.useContentTokens;
});

let mode = useColorMode({ emitAuto: true });
</script>

<template>
  <div class="content-holder">
    <div class="content-wrapper">
      <strong>SzuruChrome Settings</strong>

      <p>General settings which apply to all engines.</p>

      <ul class="input">
        <li class="full-width">
          <label>Szurubooru URL</label>
          <input text="Szurubooru URL" type="text" name="domain" v-model="domain" />
        </li>
        <li><label>Username</label><input text="Username" type="text" name="username" v-model="username" /></li>
        <li style="min-width: 320px">
          <label>Authentication token</label>
          <input text="Authentication token" type="text" name="token" v-model="authToken" />
        </li>
        <li>
          <label>Theme</label>
          <select v-model="mode">
            <option value="auto">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </li>
      </ul>

      <ul class="input">
        <li>
          <label>
            <input type="checkbox" v-model="autoSearchSimilar" />
            Automatically search for similar posts
          </label>
          <p class="hint">
            Automatically start searching for similar posts when opening the popup. Enabling this option will hide the
            "Find Similar" button.
          </p>
        </li>
        <li>
          <label>
            <input type="checkbox" v-model="addPageUrlToSource" />
            Add page URL to the source list
          </label>
          <p class="hint">
            This will add the current page URL (e.g. the booru link) to the source list in addition to the actual source
            (e.g. twitter/pixiv/artstation). Note: if the source is empty/not detected then the page URL will always be
            used as fallback source.
          </p>
        </li>
        <li>
          <label>
            <input type="checkbox" v-model="loadTagCounts" />
            Show how often a tag is used in the selected szurubooru instance
          </label>
          <p class="hint">
            Shows how often a given tag is used in the selected szurubooru instance. No number will be displayed when
            the tag does not yet exist.
          </p>
        </li>
      </ul>

      <div class="settings-footer">
        <span class="status" :class="statusType">{{ statusText }}</span>

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
    box-sizing: border-box;
    text-align: left;
    display: inline-block;
    flex: auto;
    max-width: 1000px;

    &:not(.transparent) {
      background: #f5f5f5;
      padding: 1.8em;
    }
  }
}

html.dark .content-holder > .content-wrapper:not(.transparent) {
  background: var(--section-header-bg-color);
}

.settings-footer {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;

  .status {
    flex-grow: 1;
  }

  > span.status-ok {
    color: green;
  }

  > span.status-error {
    color: red;
  }
}

.input {
  list-style-type: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  li {
    flex: 1 0 200px;
  }

  li.full-width {
    min-width: 100%;
  }

  label {
    display: block;
    padding: 0.3em 0;
  }
}

.hint {
  margin-top: 0.2em;
  margin-bottom: 0;
  color: var(--secondary-text);
  font-size: 80%;
  line-height: 120%;
}
</style>
