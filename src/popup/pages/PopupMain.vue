<script setup lang="ts">
import { useDark } from "@vueuse/core";
import { cloneDeep } from "lodash";
import { ScrapeResults } from "neo-scraper";
import { getUrl, encodeTagName, getErrorMessage, getPostInfoSummary } from "~/utils";
import {
  BrowserCommand,
  ScrapedPostDetails,
  TagDetails,
  SimilarPostInfo,
  SimpleSimilarPost,
  SimpleImageSearchResult,
  PostUploadCommandData,
  SzuruSiteConfig,
  PoolDetails,
} from "~/models";
import { isMobile } from "~/env";
import { DeepReadonly } from "vue";
import { cfg, usePopupStore } from "~/stores";
import SzurubooruApi from "~/api";

const pop = usePopupStore();
const isSearchingForSimilarPosts = ref<number>(0);
const enableAutoSearch = ref(true);

const selectedSite = computed(() => {
  if (cfg.value.selectedSiteId) {
    return cfg.value.sites.find((x) => x.id == cfg.value.selectedSiteId);
  }
});

const szuru = computed(() => {
  return selectedSite.value ? SzurubooruApi.createFromConfig(selectedSite.value) : undefined;
});

// (Reactive) shorthand for `main.selectedPost.instanceSpecificData.get(config.selectedSiteId)`.
// This should only be used as if it were readonly, because the instanceId might change.
const instanceSpecificData = readonly(
  computed(() => {
    if (pop.selectedPost && cfg.value.selectedSiteId) {
      return pop.selectedPost.instanceSpecificData[cfg.value.selectedSiteId];
    }
  }),
);

watch(
  () => pop.selectedPostId,
  (value) => {
    // Call findSimilar if wanted.
    if (cfg.value.autoSearchSimilar && enableAutoSearch.value) {
      let selectedPost = pop.posts.find((x) => x.id == value);
      if (selectedPost) findSimilar(selectedPost);
    }
  },
);

watch(
  () => cfg.value.selectedSiteId,
  async (value, oldValue) => {
    // If changed
    if (value != oldValue) {
      // Update selectedSiteId in config
      cfg.value.selectedSiteId = value;
      // Call findSimilar if wanted.
      if (cfg.value.autoSearchSimilar && pop.selectedPost) {
        findSimilar(pop.selectedPost);
      }
    }
  },
);

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
  const res: ScrapeResults = Object.assign(new ScrapeResults(), x);

  console.dir(res);

  // Clear current posts array
  pop.posts.splice(0);

  for (const result of res.results) {
    for (const i in result.posts) {
      const vm = new ScrapedPostDetails(result.posts[i]);
      const name = result.posts[i].name ?? `Post ${parseInt(i) + 1}`; // parseInt() is required!
      vm.name = `[${result.engine}] ${name}`;

      if (!cfg.value.addAllParsedTags) {
        vm.tags.splice(0);
      }

      // Add current pageUrl to the source if either
      // a. user has addPageUrlToSource set to true
      // b. source is empty
      if (cfg.value.addPageUrlToSource || vm.source == "") {
        if (vm.source != "") vm.source += "\n";
        vm.source += vm.pageUrl;
      }

      // Initialize instanceSpecificData with an empty object.
      for (const site of cfg.value.sites) {
        vm.instanceSpecificData[site.id] = {};
      }

      pop.posts.push(vm);
    }
  }

  if (pop.posts.length > 0) {
    // Hack so that findSimilar does not trigger when we set selectedPostId, due to the watch(...).
    // This because we might change the contentUrl in fetchPostInfo, after which we'd need to call findSimilar again.
    // In which case it would be better to just call it once.
    enableAutoSearch.value = false;
    pop.selectedPostId = pop.posts[0].id;

    if (cfg.value.loadTagCounts) {
      loadTagCounts();
    }

    if (cfg.value.fetchPostInfo) {
      await fetchPostsInfo();
    }

    // Delayed call to findSimilar, as fetchPostInfo might change the post's contentUrl.
    enableAutoSearch.value = true;
    if (cfg.value.autoSearchSimilar) {
      findSimilar(pop.selectedPost);
    }
  }
}

async function upload() {
  if (!cfg.value.selectedSiteId) return;
  let instanceSpecificData = pop.selectedPost?.instanceSpecificData[cfg.value.selectedSiteId];

  // Don't try to upload if an exact copy is already on the server.
  if (instanceSpecificData?.reverseSearchResult?.exactPostId) return;

  if (instanceSpecificData) {
    instanceSpecificData.uploadState = { state: "uploading" };
  }

  try {
    const post: ScrapedPostDetails = cloneDeep(pop.selectedPost)!;

    // uploadMode "content" requires a content token to work. So ensure it is set.
    if (post.uploadMode == "content") {
      await ensurePostHasContentToken(post);
    }

    const cmdData = new PostUploadCommandData(post, <SzuruSiteConfig>cloneDeep(selectedSite.value));
    const cmd = new BrowserCommand("upload_post", cmdData);
    await browser.runtime.sendMessage(cmd);
  } catch (ex: any) {
    if (instanceSpecificData?.uploadState) {
      instanceSpecificData.uploadState.state = "error";
      instanceSpecificData.uploadState.error = ex.toString();
    }
    throw ex;
  }
}

function removeTag(tag: TagDetails) {
  if (pop.selectedPost) {
    const idx = pop.selectedPost.tags.indexOf(tag);
    if (idx != -1) {
      pop.selectedPost.tags.splice(idx, 1);
    }
  }
}

function removePool(pool: PoolDetails) {
  if (pop.selectedPost) {
    const idx = pop.selectedPost.pools.indexOf(pool);
    if (idx != -1) {
      pop.selectedPost.pools.splice(idx, 1);
    }
  }
}

function getActiveSitePostUrl(postId: number): string {
  if (!selectedSite.value) return "";
  return getUrl(selectedSite.value.domain, "post", postId.toString());
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
  if (pop.selectedPost) {
    // Only add tag if it doesn't already exist
    if (tag.name.length > 0 && pop.selectedPost.tags.find((x) => x.name == tag.name) == undefined) {
      pop.selectedPost.tags.push(tag);

      // Add implications for the tag
      if (cfg.value.addTagImplications) {
        pop.selectedPost.tags.push(...tag.implications);
      }
    }
  }
}

function addPool(pool: PoolDetails) {
  if (pop.selectedPost) {
    // Only add pool if it doesn't already exist
    if (pool.name.length > 0 && pop.selectedPost.pools.find((x) => x.name == pool.name) == undefined) {
      pop.selectedPost.pools.push(pool);
    }
  }
}

async function clickFindSimilar() {
  if (pop.selectedPost) return await findSimilar(pop.selectedPost);
}

async function ensurePostHasContentToken(post: ScrapedPostDetails) {
  if (!szuru.value || !cfg.value.selectedSiteId) return;

  const selectedInstance = toRaw(szuru.value); // Get current object, and not reactive.
  let instanceSpecificData = post.instanceSpecificData[cfg.value.selectedSiteId];

  if (!instanceSpecificData) {
    console.error("instanceSpecificData is undefined. This should never happen!");
    return;
  }

  try {
    let tmpRes = await selectedInstance.uploadTempFile(post.contentUrl, post.uploadMode);
    // Save contentToken in PostViewModel so that we can reuse it when creating/uploading the post.
    instanceSpecificData.contentToken = tmpRes.token;
  } catch (ex) {
    instanceSpecificData.genericError = "Couldn't upload content. " + getErrorMessage(ex);
    throw ex;
  }
}

async function findSimilar(post: ScrapedPostDetails | undefined) {
  if (!post || !szuru.value || !cfg.value.selectedSiteId) return;

  // TODO: This code might not work.
  const selectedInstance = toRaw(szuru.value); // Get current object, and not reactive.
  let instanceSpecificData = post.instanceSpecificData[cfg.value.selectedSiteId];

  if (!instanceSpecificData) {
    console.error("instanceSpecificData is undefined. This should never happen!");
    return;
  }

  // Don't load this again if it is already loaded.
  if (instanceSpecificData.reverseSearchResult) return;

  isSearchingForSimilarPosts.value++;

  try {
    await ensurePostHasContentToken(post);

    const res = await selectedInstance.reverseSearchToken(instanceSpecificData.contentToken!);

    instanceSpecificData.reverseSearchResult = {
      exactPostId: res.exactPost?.id,
      similarPosts: res.similarPosts.map((x) => <SimpleSimilarPost>{ postId: x.post.id, distance: x.distance }),
    };
  } catch (ex: any) {
    instanceSpecificData.genericError = "Couldn't reverse search. " + getErrorMessage(ex);
  }

  isSearchingForSimilarPosts.value--;
}

async function loadTagCounts() {
  const allTags = pop.posts.flatMap((x) => x.tags);

  for (let i = 0; i < allTags.length; i += 100) {
    const query = allTags
      .slice(i, i + 101)
      .map((x) => encodeTagName(x.name))
      .join();

    const resp = await szuru.value?.getTags(query);

    // Not the best code, but it works I guess?
    if (resp) {
      for (let post of pop.posts)
        for (let tag of resp.results) {
          post.tags
            .find(postTag => tag.names.includes(postTag.name))
            .usages = tag.usages;
        }
    }
  }
}

async function updatePostWithRemoteInfo(post: ScrapedPostDetails, contentUrl: string) {
  // We are missing cookies/etc which means that the request might fail.
  // If you want access to the cookies/session/etc then you need to execute this code inside the content script.
  try {
    // This request follows redirects.
    const res = await fetch(contentUrl, { method: "HEAD" });
    const size = res.headers.get("Content-Length");
    const type = res.headers.get("Content-Type");

    if (type) {
      if (type.indexOf("text/html") != -1) {
        // If we get a HTML page back it usually means that the request failed.
        // Not all sites (e.g. e-hentai) reply with a 403.
        throw new Error(
          "Received a text/html content type. This probably means that we don't have permission to access the resource.",
        );
      }

      const [_main, sub] = type.split("/");
      if (sub) post.contentSubType = sub.toUpperCase();
    }

    // This should be after the type check, because the type check also checks whether the response we get is valid/unsable.
    if (size) post.contentSize = parseInt(size);

    // Update url if it changes. The url can change when:
    // a. the extraContentUrl was successfully loaded
    // b. because of redirects
    if (res.url != post.contentUrl) {
      // The developer needs to make sure that the remote server can load this URL if `post.uploadMode == 'url'`!
      console.log(`Updating post.contentUrl to '${res.url}'`);
      post.contentUrl = res.url;
    }

    return true;
  } catch (ex) {
    console.error(ex);
    return false;
  }
}

async function fetchPostsInfo() {
  for (const post of pop.posts) {
    if (!post.contentSize || post.extraContentUrl) {
      let ok = false;
      if (post.extraContentUrl) {
        // Prioritize info from extraContentUrl.
        ok = await updatePostWithRemoteInfo(post, post.extraContentUrl);
      }
      if (!ok) {
        // Fall back to normal contentUrl if we can't get the data from the extraContentUrl.
        await updatePostWithRemoteInfo(post, post.contentUrl);
      }
    }
  }
}

// Cool people would use https://kazupon.github.io/vue-i18n/guide/pluralization.html
function getUpdatedTagsText(count: number) {
  return `Updated ${count} tag${count > 1 ? "s" : ""}`;
}

function onResolutionLoaded(res: any) {
  // This no longer checks for `!pop.selectedPost.resolution` because the resolution can change if the contentUrl is updated.
  if (pop.selectedPost) {
    pop.selectedPost.resolution = res;
  }
}

onMounted(() => {
  if (pop.posts.length == 0) {
    grabPost();
  }
});

useDark();
</script>

<template>
  <div class="popup-messages">
    <div class="messages">
      <!-- 
        Error messages
      -->

      <div v-if="cfg.sites.length == 0" class="bg-danger">
        <span>No szurubooru servers configured!</span>
      </div>

      <div v-if="!szuru && cfg.sites.length != 0" class="bg-danger">
        <span>No target server selected!</span>
      </div>

      <div v-if="instanceSpecificData?.reverseSearchResult?.exactPostId" class="bg-danger has-merge-button">
        <a :href="getActiveSitePostUrl(instanceSpecificData.reverseSearchResult?.exactPostId)">
          Post already uploaded ({{ instanceSpecificData.reverseSearchResult.exactPostId }})
        </a>

        <!-- TODO: Maybe a 5px gap here? -->

        <div style="display: flex; background: purple; border-radius: 0 2px 2px 0">
          <router-link
            :to="{
              name: 'merge',
              params: {
                siteId: cfg.selectedSiteId,
                postId: instanceSpecificData?.reverseSearchResult?.exactPostId,
              },
            }"
            style="padding: 5px 20px"
            >Merge</router-link
          >
        </div>
      </div>

      <!--
        Only show error when it's not undefined and not empty.
        TODO: Maybe remove this in favor of genericError?
      -->
      <div v-if="instanceSpecificData?.uploadState?.error?.length" class="bg-danger">
        <span>Couldn't upload post. {{ instanceSpecificData.uploadState.error }}</span>
      </div>

      <div v-if="instanceSpecificData?.genericError" class="bg-danger">
        <span>{{ instanceSpecificData.genericError }}</span>
      </div>

      <!--
        Success messages
      -->

      <!-- TODO: Clicking a link doesn't actually open it in a new tab, see https://stackoverflow.com/questions/8915845 -->
      <div
        v-if="
          instanceSpecificData?.uploadState?.state == 'uploaded' && instanceSpecificData?.uploadState.instancePostId
        "
        class="bg-success"
      >
        <a :href="getActiveSitePostUrl(instanceSpecificData.uploadState.instancePostId)"
          >Uploaded post {{ instanceSpecificData.uploadState.instancePostId }}</a
        >
      </div>

      <div v-if="instanceSpecificData?.uploadState?.updateTagsState?.totalChanged" class="bg-success">
        <span>{{ getUpdatedTagsText(instanceSpecificData.uploadState?.updateTagsState?.totalChanged) }}</span>
      </div>

      <!--
        Info messages
      -->

      <div v-if="instanceSpecificData?.uploadState?.state == 'uploading'"><span>Uploading...</span></div>

      <div
        v-if="
          instanceSpecificData?.uploadState?.updateTagsState?.total &&
          instanceSpecificData.uploadState?.updateTagsState?.current == undefined
        "
      >
        <span>{{ instanceSpecificData.uploadState?.updateTagsState?.total }} tags need a different category</span>
      </div>

      <div
        v-if="
          instanceSpecificData?.uploadState?.updateTagsState?.current &&
          instanceSpecificData?.uploadState?.updateTagsState?.totalChanged == undefined
        "
      >
        <span
          >Updating tag {{ instanceSpecificData.uploadState?.updateTagsState?.current }}/{{
            instanceSpecificData.uploadState?.updateTagsState?.total
          }}</span
        >
      </div>

      <div v-if="isSearchingForSimilarPosts > 0 && instanceSpecificData?.uploadState == undefined">
        <span>Searching for similar posts...</span>
      </div>

      <div
        v-if="
          instanceSpecificData?.reverseSearchResult?.similarPosts.length == 0 &&
          instanceSpecificData.uploadState == undefined
        "
      >
        <span>No similar posts found</span>
      </div>

      <div
        v-for="similarPost in getSimilarPosts(instanceSpecificData?.reverseSearchResult)"
        :key="similarPost.id"
        class="has-merge-button"
      >
        <a :href="getActiveSitePostUrl(similarPost.id)"
          >Post {{ similarPost.id }} looks {{ similarPost.percentage }}% similar</a
        >

        <!-- TODO: Maybe a 5px gap here? -->

        <div style="display: flex; background: purple; border-radius: 0 2px 2px 0">
          <router-link
            :to="{
              name: 'merge',
              params: {
                siteId: cfg.selectedSiteId,
                postId: similarPost.id,
              },
            }"
            style="padding: 5px 20px"
            >Merge</router-link
          >
        </div>
      </div>
    </div>
  </div>

  <div v-if="pop.selectedPost" class="popup-columns" :class="{ mobile: isMobile }">
    <div class="popup-left">
      <PopupSection>
        <template #header>
          <span>Basic info</span>
          <font-awesome-icon icon="fa-solid fa-cog" class="cursor-pointer" @click="openOptionsPage" />
        </template>

        <div class="section-row" v-if="pop.selectedPost?.resolution || pop.selectedPost?.contentSize">
          <PostInfoSummary v-model="pop.selectedPost" />
        </div>

        <div class="section-row">
          <span class="section-label">Safety</span>

          <div style="display: flex; gap: 10px">
            <label>
              <input type="radio" value="safe" v-model="pop.selectedPost.rating" />
              Safe
            </label>

            <label>
              <input type="radio" value="sketchy" v-model="pop.selectedPost.rating" />
              Sketchy
            </label>

            <label>
              <input type="radio" value="unsafe" v-model="pop.selectedPost.rating" />
              Unsafe
            </label>
          </div>
        </div>

        <div v-if="cfg.popup.showSource" class="section-row">
          <span class="section-label">Source</span>
          <textarea v-model="pop.selectedPost.source"></textarea>
        </div>
      </PopupSection>

      <PopupSection header="Tags" toggleable v-model="cfg.popup.expandTags">
        <div class="section-row">
          <TagInput :szuru="szuru" @add-tag="addTag" />
        </div>

        <div class="section-row">
          <CompactTags
            :tags="pop.selectedPost.tags"
            :show-remove-tag="true"
            :show-usages="cfg.loadTagCounts"
            @remove-tag="removeTag"
          />
        </div>
      </PopupSection>

      <PopupSection v-if="cfg.popup.showPools" header="Pools" toggleable v-model="cfg.popup.expandPools">
        <div class="section-row">
          <PoolInput :szuru="szuru" @add-pool="addPool" />
        </div>

        <div class="section-row">
          <CompactPools
            :pools="pop.selectedPost.pools"
            :show-remove-pool="true"
            show-post-count
            @remove-pool="removePool"
          />
        </div>
      </PopupSection>

      <div v-if="cfg.popup.showInstancePicker" class="popup-section">
        <div class="section-row">
          <select v-model="cfg.selectedSiteId">
            <option v-for="site in cfg.sites" :key="site.id" :value="site.id">
              {{ site.domain }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="popup-right">
      <div class="popup-section">
        <select v-model="pop.selectedPostId">
          <!-- &#160;&#160; is used because duplicate space characters are usually removed by the browser. -->
          <option v-for="post in pop.posts" :key="post.id" :value="post.id">
            {{ post.name }} &#160;-&#160; {{ getPostInfoSummary(post) }}
          </option>
        </select>
      </div>

      <div class="popup-section">
        <div style="display: flex; gap: 5px">
          <button v-if="!cfg.autoSearchSimilar" class="primary" @click="clickFindSimilar">Find similar</button>
          <button class="primary full" @click="upload">Import</button>
          <!-- TODO: Add button to open this popup in fullscreen. -->
        </div>
      </div>

      <div class="popup-section">
        <PostContentDisplay
          :content-url="pop.selectedPost.contentUrl"
          :content-type="pop.selectedPost.contentType"
          @on-resolution-loaded="onResolutionLoaded"
        />
      </div>
    </div>
  </div>

  <div v-else class="p-3 flex items-center gap-3">
    <span>No content found</span>
    <font-awesome-icon icon="fa-solid fa-cog" class="cursor-pointer" @click="openOptionsPage" />
  </div>
</template>

<style scoped lang="scss">
.popup-left {
  flex: 1 0 300px;
}

.popup-right {
  flex: 1 1 auto;
}

.has-merge-button {
  display: flex;
  justify-content: space-between;
}
</style>
