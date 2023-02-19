<script setup lang="ts">
import { useDark } from "@vueuse/core";
import axios, { CancelTokenSource } from "axios";
import { ScrapeResults } from "neo-scraper";
import { getUrl, encodeTagName, getErrorMessage } from "~/utils";
import {
  BrowserCommand,
  ScrapedPostDetails,
  TagDetails,
  PostUploadCommandData,
  SimilarPostInfo,
  SetPostUploadInfoData,
  SetExactPostId,
  SimpleSimilarPost,
  SimpleImageSearchResult,
} from "~/models";
import SzuruWrapper from "~/api";
import { ImageSearchResult } from "~/api/models";
import { isChrome, isMobile } from "~/env";
import { Runtime, WebRequest } from "webextension-polyfill";
import { Config } from "~/config";
import { DeepReadonly } from "vue";

let config = new Config();
let posts = reactive([] as ScrapedPostDetails[]);
let selectedPostId = ref<string | undefined>(undefined);
let addTagInput = ref("");
let autocompleteShown = ref(false);
let autocompleteTags = ref<TagDetails[]>([]);
let cancelSource = ref<CancelTokenSource | undefined>(undefined);
let autocompleteIndex = ref(-1);
let selectedSiteId = ref<string | undefined>(undefined);
let isSearchingForSimilarPosts = ref<number>(0);

const selectedInstance = computed(() => {
  if (selectedSiteId.value) {
    return config.sites.find((x) => x.id == selectedSiteId.value);
  }
});

const selectedPost = computed(() => {
  if (selectedPostId.value) {
    return posts.find((x) => x.id == selectedPostId.value);
  }
});

const szuru = computed(() => {
  return selectedInstance.value ? SzuruWrapper.createFromConfig(selectedInstance.value) : undefined;
});

// (Reactive) shorthand for `selectedPost.value.instanceSpecificData.get(selectedSiteId.value)`.
// This should only be used as if it were readonly, because the instanceId might change.
const instanceSpecificData = readonly(
  computed(() => {
    if (selectedPost.value && selectedSiteId.value) {
      return selectedPost.value.instanceSpecificData.get(selectedSiteId.value);
    }
  })
);

watch(selectedPostId, () => {
  // Call findSimilar if wanted.
  if (config.autoSearchSimilar) {
    let selectedPost = posts.find((x) => x.id == selectedPostId.value);
    if (selectedPost) findSimilar(selectedPost);
  }
});

watch(selectedSiteId, async (x) => {
  // If changed
  if (config.selectedSiteId != x) {
    // Update selectedSiteId in config
    config.selectedSiteId = x;
    await config.save();

    // Call findSimilar if wanted.
    if (config.autoSearchSimilar && selectedPost.value) {
      findSimilar(selectedPost.value);
    }
  }
});

function openOptionsPage() {
  browser.runtime.openOptionsPage();
}

async function getActiveTabId(): Promise<number> {
  const activeTabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (activeTabs.length > 0 && activeTabs[0].id) return activeTabs[0].id;
  throw new Error("No active tab.");
}

async function grabPost() {
  // Get active tab
  const activeTabId = await getActiveTabId();

  // Send 'grab_post' to the content script on the active tab
  const x = await browser.tabs.sendMessage(activeTabId, new BrowserCommand("grab_post"));
  // We need to create a new ScrapeResults object and fill it with our data, because the get_posts()
  // method gets 'lost' when sent from the contentscript to the popup (it gets JSON.stringified and any prototype defines are lost there)
  const res = Object.assign(new ScrapeResults(), x);

  console.dir(res);

  // Clear current posts array
  posts.splice(0);

  for (const result of res.results) {
    for (const i in result.posts) {
      const vm = new ScrapedPostDetails(result.posts[i]);
      vm.name = `[${result.engine}] Post ${parseInt(i) + 1}`; // parseInt() is required!

      // Add current pageUrl to the source if either
      // a. user has addPageUrlToSource set to true
      // b. source is empty
      if (config?.addPageUrlToSource || vm.source == "") {
        if (vm.source != "") vm.source += "\n";
        vm.source += vm.pageUrl;
      }

      // Initialize instanceSpecificData with an empty object.
      for (const site of config.sites) {
        vm.instanceSpecificData.set(site.id, {});
      }

      posts.push(vm);
    }
  }

  if (posts.length > 0) {
    selectedPostId.value = posts[0].id;
    if (config?.loadTagCounts) {
      loadTagCounts();
    }
  } else {
    // pushInfo("No posts found.");
  }
}

async function upload() {
  if (!selectedSiteId.value) return;

  // Don't try to upload if an exact copy is already on the server.
  if (instanceSpecificData.value?.reverseSearchResult?.exactPostId) return;

  // TODO: Terrible code.
  const post = JSON.parse(JSON.stringify(selectedPost.value));
  const cmdData = new PostUploadCommandData(post, selectedSiteId.value);
  const cmd = new BrowserCommand("upload_post", cmdData);
  await browser.runtime.sendMessage(cmd);
  // TODO: Handle errors/status update
}

function getTagClasses(tag: TagDetails): string[] {
  let classes: string[] = [];

  if (tag.category && tag.category != "default") {
    classes.push("tag-" + tag.category);
  } else {
    classes.push("tag-general");
  }

  return classes;
}

function breakTagName(tagName: string) {
  // Based on https://stackoverflow.com/a/6316913
  return tagName.replace(/_/g, "_<wbr>");
}

function resolutionToString(resolution: [number, number]) {
  if (resolution && resolution.length == 2) {
    return resolution[0] + "x" + resolution[1];
  }
  return "";
}

function removeTag(tag: TagDetails) {
  if (selectedPost.value) {
    const idx = selectedPost.value.tags.indexOf(tag);
    if (idx != -1) {
      selectedPost.value.tags.splice(idx, 1);
    }
  }
}

function getActiveSitePostUrl(postId: number): string {
  if (!selectedInstance.value) return "";
  return getUrl(selectedInstance.value.domain, "post", postId.toString());
}

function getSimilarPosts(data?: DeepReadonly<SimpleImageSearchResult>): SimilarPostInfo[] {
  if (!data) return [];

  const lst: SimilarPostInfo[] = [];

  for (const similarPost of data.similarPosts) {
    if (data.exactPostId == similarPost.postId) {
      continue;
    }

    lst.push(new SimilarPostInfo(similarPost.postId, Math.round(100 - similarPost.distance * 100)));
  }

  return lst;
}

function addTag(tag: TagDetails) {
  if (selectedPost.value) {
    // Only add tag if it doesn't already exist
    if (tag.name.length > 0 && selectedPost.value.tags.find((x) => x.name == tag.name) == undefined) {
      selectedPost.value.tags.push(tag);

      // Add implications for the tag
      selectedPost.value.tags.push(...tag.implications);
    }
  }
}

async function clickFindSimilar() {
  let selectedPost = posts.find((x) => x.id == selectedPostId.value);
  if (selectedPost) return await findSimilar(selectedPost);
}

async function findSimilar(post: ScrapedPostDetails | undefined) {
  if (!post || !szuru.value || !selectedSiteId.value) return;

  const selectedInstance = szuru.value;
  let instanceSpecificData = post.instanceSpecificData.get(selectedSiteId.value);

  if (!instanceSpecificData) {
    console.error("instanceSpecificData is undefined. This should never happen!");
    return;
  }

  // Don't load this again if it is already loaded.
  if (instanceSpecificData?.reverseSearchResult) return;

  isSearchingForSimilarPosts.value++;

  try {
    let res: ImageSearchResult | undefined;

    if (config.useContentTokens) {
      let tmpRes = await selectedInstance.uploadTempFile(post.contentUrl);
      // TODO: Error handling?
      // Save contentToken in PostViewModel so that we can reuse it when creating/uploading the post.
      post.contentToken = tmpRes.token;

      res = await selectedInstance.reverseSearchToken(tmpRes.token);
    } else {
      res = await selectedInstance.reverseSearch(post.contentUrl);
    }

    instanceSpecificData.reverseSearchResult = {
      exactPostId: res.exactPost?.id,
      similarPosts: res.similarPosts.map((x) => <SimpleSimilarPost>{ postId: x.post.id, distance: x.distance }),
    };
  } catch (ex: any) {
    instanceSpecificData.genericError = "Couldn't reverse search. " + getErrorMessage(ex);
  }

  isSearchingForSimilarPosts.value--;
}

function getPostForUrl(contentUrl: string): ScrapedPostDetails | undefined {
  return posts.find((x) => x.contentUrl == contentUrl);
}

async function loadTagCounts() {
  const allTags = posts.flatMap((x) => x.tags);

  for (let i = 0; i < allTags.length; i += 100) {
    const query = allTags
      .slice(i, i + 101)
      .map((x) => encodeTagName(x.name))
      .join();

    const resp = await szuru.value?.getTags(query);

    // Not the best code, but it works I guess?
    if (resp) {
      for (let post of posts)
        for (let tag of resp.results)
          for (let postTag of post.tags)
            if (postTag.name == tag.names[0]) {
              postTag.usages = tag.usages;
              break;
            }
    }
  }
}

async function onAddTagKeyUp(e: KeyboardEvent) {
  await autocompletePopulator((<HTMLInputElement>e.target).value);
}

function addTagFromCurrentInput() {
  addTag(new TagDetails(addTagInput.value));
  addTagInput.value = ""; // Reset input

  // Only needed when the button is clicked
  // When this is triggered by the enter key the `onAddTagKeyUp` will internally also hide the autocomplete.
  // Though hiding it twice doesn't hurt so we don't care.
  hideAutocomplete();

  // TODO: Do we also want to add the implications?
  // Answer: Probably not, because if the user wanted to have implications they should've clicked/selected the autocomplete entry.
}

function onAddTagKeyDown(e: KeyboardEvent) {
  if (e.code == "ArrowDown") {
    e.preventDefault();
    if (autocompleteIndex.value < autocompleteTags.value.length - 1) {
      autocompleteIndex.value++;
    }
  } else if (e.code == "ArrowUp") {
    e.preventDefault();
    if (autocompleteIndex.value >= 0) {
      autocompleteIndex.value--;
    }
  } else if (e.code == "Enter") {
    if (autocompleteIndex.value == -1) {
      addTagFromCurrentInput();
    } else {
      // Add auto completed tag
      const tagToAdd = autocompleteTags.value[autocompleteIndex.value];
      addTag(tagToAdd);
      addTagInput.value = ""; // Reset input
    }
  }
}

function onClickAutocompleteTagItem(tag: TagDetails) {
  addTag(tag);
  addTagInput.value = ""; // Reset input
  autocompleteShown.value = false; // Hide autocomplete list
}

function hideAutocomplete() {
  autocompleteIndex.value = -1;
  autocompleteShown.value = false;
}

async function autocompletePopulator(input: string) {
  // Based on https://www.w3schools.com/howto/howto_js_autocomplete.asp
  // TODO: Put this in a separate component

  // Hide autocomplete when the input is empty, and don't do anything else.
  if (input.length == 0) {
    hideAutocomplete();
    return;
  }

  // Cancel previous request
  if (cancelSource.value) {
    cancelSource.value.cancel();
  }
  cancelSource.value = axios.CancelToken.source();

  const query = decodeURIComponent(`*${encodeTagName(input)}* sort:usages`);
  const res = await szuru.value?.getTags(
    query,
    0,
    100,
    ["names", "category", "usages", "implications"],
    cancelSource.value.token
  );

  if (res) {
    autocompleteTags.value = res.results.map((x) => TagDetails.fromTag(x));
    if (autocompleteTags.value.length > 0) autocompleteShown.value = true;
  } else {
    autocompleteTags.value = [];
  }
}

// Could people would use https://kazupon.github.io/vue-i18n/guide/pluralization.html
function getUpdatedTagsText(count: number) {
  return `Updated ${count} tag${count > 1 ? "s" : ""}`;
}

onMounted(async () => {
  config = await Config.load();
  selectedSiteId.value = config.selectedSiteId;

  browser.runtime.onMessage.addListener((cmd: BrowserCommand, _sender: Runtime.MessageSender) => {
    console.log("Popup received message:");
    console.dir(cmd);

    switch (cmd.name) {
      case "set_post_upload_info":
        {
          const { postId, instanceId, info } = <SetPostUploadInfoData>cmd.data;
          let post = posts.find((x) => x.id == postId);
          if (post) {
            let instanceSpecificData = post.instanceSpecificData.get(instanceId);
            if (instanceSpecificData) {
              instanceSpecificData.uploadState = info;
            }
          }
        }
        break;
      case "set_exact_post_id":
        {
          const { postId, instanceId, exactPostId } = <SetExactPostId>cmd.data;
          let post = posts.find((x) => x.id == postId);
          if (post && selectedPostId.value) {
            let instanceSpecificData = post.instanceSpecificData.get(instanceId);
            if (instanceSpecificData) {
              if (instanceSpecificData?.reverseSearchResult) {
                instanceSpecificData.reverseSearchResult.exactPostId = exactPostId;
              } else {
                instanceSpecificData.reverseSearchResult = { exactPostId, similarPosts: [] };
              }
            }
          }
        }
        break;
    }
  });

  let extraInfoSpec: WebRequest.OnBeforeSendHeadersOptions[] = ["requestHeaders", "blocking"];
  if (isChrome) {
    extraInfoSpec.push("extraHeaders");
  }

  // Add "Referer" header to all requests if post.referrer is set.
  // This is needed in some rare cases where websites disallow hotlinking to images.
  // This will probably stop working in Chrome sometime in 2023 due to the Manifest V3 webRequestBlocking bullshit.
  // Firefox users should be fine.
  browser.webRequest.onBeforeSendHeaders.addListener(
    (details: WebRequest.OnBeforeSendHeadersDetailsType): WebRequest.BlockingResponse => {
      let requestHeaders = details.requestHeaders ?? [];

      // Find which ScrapedPost this belongs to, if any.
      const post = getPostForUrl(details.url);
      if (post != undefined && post.referrer) {
        console.log(`Setting referrer to '${post.referrer}' for request to '${post.contentUrl}'.`);
        // TODO: If the headers already have a 'Referer' header this will _not_ override that.
        // As far as I am aware the 'img' tag doesn't set this header, so it shouldn't be a problem.
        requestHeaders.push({ name: "Referer", value: post.referrer });
      }

      return {
        requestHeaders,
      };
    },
    { urls: ["<all_urls>"] },
    extraInfoSpec
  );

  grabPost();
});

useDark();
</script>

<template>
  <div class="popup-container">
    <div class="popup-messages">
      <ul class="messages">
        <!-- 
          Error messages
        -->

        <li v-if="config.sites.length == 0" class="bg-danger">No szurubooru server configured!</li>

        <li v-if="!selectedInstance" class="bg-danger">No target server selected!</li>

        <li v-if="instanceSpecificData?.reverseSearchResult?.exactPostId" class="bg-danger">
          <a :href="getActiveSitePostUrl(instanceSpecificData.reverseSearchResult?.exactPostId)"
            >Post already uploaded ({{ instanceSpecificData.reverseSearchResult.exactPostId }})</a
          >
        </li>

        <!-- Only show error when it's not undefined and not empty. -->
        <li v-if="instanceSpecificData?.uploadState?.error?.length" class="bg-danger">
          Couldn't upload post. {{ instanceSpecificData.uploadState.error }}
        </li>

        <li v-if="instanceSpecificData?.genericError" class="bg-danger">{{ instanceSpecificData.genericError }}</li>

        <!--
          Success messages
        -->

        <!-- TODO: Clicking a link doesn't actually open it in a new tab, see https://stackoverflow.com/questions/8915845 -->
        <li
          v-if="
            instanceSpecificData?.uploadState?.state == 'uploaded' && instanceSpecificData?.uploadState.instancePostId
          "
          class="bg-success"
        >
          <a :href="getActiveSitePostUrl(instanceSpecificData.uploadState.instancePostId)"
            >Uploaded post {{ instanceSpecificData.uploadState.instancePostId }}</a
          >
        </li>

        <li v-if="instanceSpecificData?.uploadState?.updateTagsState?.totalChanged" class="bg-success">
          {{ getUpdatedTagsText(instanceSpecificData.uploadState?.updateTagsState?.totalChanged) }}
        </li>

        <!--
          Info messages
        -->

        <li v-if="instanceSpecificData?.uploadState?.state == 'uploading'">Uploading...</li>

        <li
          v-if="
            instanceSpecificData?.uploadState?.updateTagsState?.total &&
            instanceSpecificData.uploadState?.updateTagsState?.current == undefined
          "
        >
          {{ instanceSpecificData.uploadState?.updateTagsState?.total }} tags need a different category
        </li>

        <li
          v-if="
            instanceSpecificData?.uploadState?.updateTagsState?.current &&
            instanceSpecificData?.uploadState?.updateTagsState?.totalChanged == undefined
          "
        >
          Updating tag {{ instanceSpecificData.uploadState?.updateTagsState?.current }}/{{
            instanceSpecificData.uploadState?.updateTagsState?.total
          }}
        </li>

        <li v-if="isSearchingForSimilarPosts > 0 && instanceSpecificData?.uploadState == undefined">
          Searching for similar posts...
        </li>

        <li
          v-if="
            instanceSpecificData?.reverseSearchResult?.similarPosts.length == 0 &&
            instanceSpecificData.uploadState == undefined
          "
        >
          No similar posts found
        </li>

        <li v-for="similarPost in getSimilarPosts(instanceSpecificData?.reverseSearchResult)" :key="similarPost.id">
          <a :href="getActiveSitePostUrl(similarPost.id)"
            >Post {{ similarPost.id }} looks {{ similarPost.percentage }}% similar</a
          >
        </li>
      </ul>
    </div>

    <div v-if="selectedPost" class="popup-columns" :class="{ mobile: isMobile }">
      <div class="popup-left">
        <div class="popup-section">
          <div class="section-header">
            <span>Basic info</span>
            <!-- <i class="fas fa-cog cursor-pointer" @click="openOptionsPage"></i> -->
            <font-awesome-icon icon="fa-solid fa-cog" class="cursor-pointer" @click="openOptionsPage" />
          </div>

          <div class="section-row" v-if="selectedPost?.resolution">
            <ul class="compact">
              <li>Resolution: {{ resolutionToString(selectedPost.resolution) }}</li>
            </ul>
          </div>

          <div class="section-row">
            <span class="section-label">Safety</span>

            <div style="display: flex; gap: 10px">
              <label>
                <input type="radio" value="safe" v-model="selectedPost.rating" />
                Safe
              </label>

              <label>
                <input type="radio" value="sketchy" v-model="selectedPost.rating" />
                Sketchy
              </label>

              <label>
                <input type="radio" value="unsafe" v-model="selectedPost.rating" />
                Unsafe
              </label>
            </div>
          </div>

          <div class="section-row">
            <span class="section-label">Source</span>
            <textarea v-model="selectedPost.source"></textarea>
          </div>
        </div>

        <div class="popup-section">
          <div class="section-header">
            <span>Tags</span>
          </div>

          <div class="section-row" style="display: flex; flex-direction: column">
            <div style="display: flex">
              <input
                type="text"
                v-model="addTagInput"
                @keyup="onAddTagKeyUp"
                @keydown="onAddTagKeyDown"
                autocomplete="off"
              />
              <button class="primary" style="margin-left: 5px" @click="addTagFromCurrentInput">Add</button>
            </div>

            <div class="autocomplete-items" v-bind:class="{ show: autocompleteShown }">
              <div
                v-for="(tag, idx) in autocompleteTags"
                @click="onClickAutocompleteTagItem(tag)"
                :key="tag.name"
                :class="{
                  active: idx == autocompleteIndex,
                }"
              >
                <span :class="getTagClasses(tag)">{{ tag.name }}</span>
                <span class="tag-usages">{{ tag.usages ? tag.usages : "" }}</span>
              </div>
            </div>
          </div>

          <div class="section-row">
            <ul class="compact-tags">
              <li v-for="tag in selectedPost.tags" :key="tag.name">
                <a class="remove-tag" @click="removeTag(tag)">x</a>
                <span :class="getTagClasses(tag)" v-html="breakTagName(tag.name)"></span>
                <span v-if="config.loadTagCounts" class="tag-usages tag-usages-reserve-space">{{
                  tag.usages ? tag.usages : ""
                }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="popup-section">
          <div class="section-row">
            <select v-model="selectedSiteId">
              <option v-for="site in config.sites" :key="site.id" :value="site.id">
                {{ site.domain }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="popup-right">
        <div class="popup-section">
          <select v-model="selectedPostId">
            <option v-for="post in posts" :key="post.id" :value="post.id">{{ post.name }}</option>
          </select>
        </div>

        <div class="popup-section">
          <div style="display: flex; gap: 5px">
            <button v-if="!config.autoSearchSimilar" class="primary" @click="clickFindSimilar">Find similar</button>
            <button class="primary full" @click="upload">Import</button>
          </div>
        </div>

        <div class="popup-section">
          <div class="post-container">
            <img :src="selectedPost.contentUrl" v-if="selectedPost.contentType == 'image'" />
            <video v-if="selectedPost.contentType == 'video'" controls>
              <source :src="selectedPost.contentUrl" />
            </video>
            <div class="post-overlay">
              <PostNotes :notes="selectedPost.notes" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="p3 flex items-center gap-3">
      <span>No content found</span>
      <font-awesome-icon icon="fa-solid fa-cog" class="cursor-pointer" @click="openOptionsPage" />
    </div>
  </div>
</template>

<style lang="scss">
@use "../styles/main.scss";

video {
  width: 100%;
}

textarea,
select {
  font-size: 90%;
}

label {
  flex: 1 0 auto;

  input[type="radio"] {
    margin: 3px 3px 0 0;
  }
}

.popup-container {
  display: flex;
  flex-direction: column;
}

.popup-messages {
  grid-column: 1 / 3;
  margin: 0 10px;
}

.popup-columns {
  display: flex;
  flex-direction: row;

  &.mobile {
    flex-direction: column-reverse;
  }
}

.popup-left {
  flex: 1 0 300px;
}

.popup-right {
  flex: 1 1 auto;
}

.popup-section {
  margin: 10px;
}

.section-header {
  height: 30px;
  padding: 0 6px 0 10px;
  background-color: var(--section-header-bg-color);
  display: flex;
  justify-content: space-between;
  align-items: center;

  > span {
    font-size: 1.2em;
    vertical-align: middle;
    color: var(--section-header-fg-color);
  }
}

.section-row {
  margin: 10px 5px 0;
}

.section-label {
  display: block;
  margin: 0 0 5px 0;
}

.section-block {
  display: block;
}

.cursor-pointer {
  cursor: pointer;
}

.autocomplete-items {
  position: absolute;
  z-index: 10;
  background-color: var(--bg-main-color);
  border: 2px solid var(--primary-color);
  margin-top: 34px;
  display: none;

  &.show {
    display: block;
  }

  > div {
    cursor: pointer;
    padding: 2px 4px;

    display: flex;
    align-items: center;
    gap: 0.5em;

    &:hover {
      background: var(--primary-color);
      > span {
        color: var(--text-color);
      }
    }
  }

  > div.active {
    background: var(--primary-color);
    > span {
      color: var(--text-color);
    }
  }
}

/* Hacky way to stop the layout from resizing when we lazy load the usage count. */
.tag-usages-reserve-space {
  min-width: 5ch; /* 5 character width */
  display: inline-block;
}

.post-container {
  position: relative;
  display: flex;
}

.post-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
}
</style>
