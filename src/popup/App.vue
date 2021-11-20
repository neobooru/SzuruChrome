<template>
  <div class="popup-container">
    <div class="popup-messages">
      <ul class="messages">
        <li
          v-for="msg in messages"
          :key="msg.content"
          :class="getMessageClasses(msg)"
          v-html="msg.content"
        ></li>
      </ul>
    </div>

    <div class="popup-left">
      <div class="popup-section">
        <div class="section-header">
          <span>Basic info</span>
          <i class="fas fa-cog cursor-pointer" @click="openSettings"></i>
        </div>

        <div class="section-row">
          <span class="section-label">Safety</span>

          <label class="container">
            <input type="radio" value="safe" v-model="selectedPost.rating" />
            <span class="checkmark"></span>
            Safe
          </label>

          <label class="container">
            <input type="radio" value="sketchy" v-model="selectedPost.rating" />
            <span class="checkmark"></span>
            Sketchy
          </label>

          <label class="container">
            <input type="radio" value="unsafe" v-model="selectedPost.rating" />
            <span class="checkmark"></span>
            Unsafe
          </label>
        </div>

        <div class="section-row">
          <span class="section-label">Source</span>
          <input type="text" v-model="selectedPost.source" />
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
            <button class="primary" style="margin-left: 5px" @click="addTag">Add</button>
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
              <span :class="getTagClasses(tag)">{{ tag.name }}</span>
              <span
                v-if="showTagUsages"
                class="tag-usages tag-usages-reserve-space"
              >{{ tag.usages ? tag.usages : "" }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="popup-section">
        <div class="section-row">
          <select disabled>
            <option>{{ activeSite != null ? activeSite.domain : "(no site available)" }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="popup-right">
      <div class="popup-section">
        <select v-model="selectedPost">
          <option v-for="post in posts" v-bind:key="post.name" v-bind:value="post">{{ post.name }}</option>
        </select>
      </div>

      <div class="popup-section">
        <div style="display: flex">
          <button class="primary" @click="findSimilar">Find similar</button>
          <button class="primary full" style="margin-left: 5px" @click="upload">Import</button>
        </div>
      </div>

      <div class="popup-section">
        <img :src="selectedPost.contentUrl" v-if="selectedPost.contentType == 'image'" />
        <video v-if="selectedPost.contentType == 'video'" controls>
          <source :src="selectedPost.contentUrl" />
        </video>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import axios, { CancelTokenSource } from "axios";
import { browser, Runtime, WebRequest } from "webextension-polyfill-ts";
import { ScrapedPost, ScrapeResults } from "neo-scraper";
import SzuruWrapper from "../SzuruWrapper";
import { Post, } from "../SzuruTypes";
import { Config, SzuruSiteConfig } from "../Config";
import { BrowserCommand, Message, getUrl, isChrome, encodeTagName } from "../Common";
import { PostViewModel, TagViewModel } from "../ViewModels";

export default Vue.extend({
  data() {
    return {
      config: null as Config | null,
      activeSite: null as SzuruSiteConfig | null,
      szuru: null as SzuruWrapper | null,
      posts: [] as PostViewModel[],
      selectedPost: new PostViewModel(new ScrapedPost()), // Shouldn't be null because VueJS gets a mental breakdown when it sees a null.
      messages: [] as Message[],
      addTagInput: "",
      autocompleteShown: false,
      autocompleteTags: [] as TagViewModel[],
      cancelSource: null as CancelTokenSource | null,
      autocompleteIndex: -1,
      showTagUsages: false,
    };
  },
  watch: {
    selectedPost() {
      if (this.config && this.config.autoSearchSimilar) {
        // No need to check if any vars are unset, findSimilar does that internally
        this.findSimilar();
      }
    },
  },
  methods: {
    async getActiveTabId() {
      const activeTabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (activeTabs.length > 0) return activeTabs[0].id!;
      throw new Error("No active tab.");
    },
    // Try to scrape the post from the page
    async grabPost() {
      // Get active tab
      const activeTabId = await this.getActiveTabId();

      // Send 'grab_post' to the content script on the active tab
      const x = await browser.tabs.sendMessage(activeTabId, new BrowserCommand("grab_post"));
      // We need to create a new ScrapeResults object and fill it with our data, because the get_posts()
      // method gets 'lost' when sent from the contentscript to the popup (it gets JSON.stringified and any prototype defines are lost there)
      const res = Object.assign(new ScrapeResults(), x);

      // Clear current posts array
      this.posts = [];

      for (var result of res.results) {
        for (var i in result.posts) {
          const vm = new PostViewModel(result.posts[i]);
          vm.name = `[${result.engine}] Post ${parseInt(i) + 1}`; // parseInt() is required!

          if (!this.config?.useOriginalSource || vm.source == undefined) {
            vm.source = vm.pageUrl;
          }

          this.posts.push(vm);
        }
      }

      if (this.posts.length > 0) {
        this.selectedPost = this.posts[0];
        if (this.config?.loadTagCounts) {
          this.loadTagCounts();
        }
      } else {
        this.pushInfo("No posts found.");
      }
    },
    // Try to upload the post to the selected szurubooru instance
    async upload() {
      window.scrollTo(0, 0);

      // Outsource to background.ts
      const cmd = new BrowserCommand("upload_post", this.selectedPost);
      await browser.runtime.sendMessage(cmd);
      // TODO: Handle errors/status update
    },
    // Open extension settings page in new tab
    async openSettings() {
      const url = browser.runtime.getURL("options/options.html");
      window.open(url);
    },
    getTagClasses(tag: TagViewModel): string[] {
      let classes: string[] = [];

      if (tag.category && <any>tag.category != "default") {
        classes.push("tag-" + tag.category);
      } else {
        classes.push("tag-general");
      }

      return classes;
    },
    // Remove tag from post's taglist
    removeTag(tag: TagViewModel) {
      if (this.selectedPost) {
        const idx = this.selectedPost.tags.indexOf(tag);
        if (idx != -1) {
          this.selectedPost.tags.splice(idx, 1);
        }
      }
    },
    getMessageClasses(message: Message) {
      let classes: string[] = [];

      switch (message.level) {
        case "error":
          classes.push("message-error");
          break;
        case "success":
          classes.push("message-success");
          break;
      }

      return classes;
    },
    // Add info message
    pushInfo(message: string, category: string | null = null): Message {
      let msg = new Message(message, "info", category);
      this.messages.push(msg);
      return msg;
    },
    // Add error message
    pushError(message: string, category: string | null = null): Message {
      let msg = new Message(message, "error", category);
      this.messages.push(msg);
      return msg;
    },
    // Clear messages of given category. When category is empty clear all messages.
    clearMessages(category: string | null = null) {
      if (category) {
        for (let i = 0; i < this.messages.length; i++) {
          if (this.messages[i].category == category) {
            // Decrement i to negate the i++, because if we remove one object the items
            // shift one place to the left, aka index--
            // If we don't do i-- we'll skip the next item in our for loop
            this.messages.splice(i--, 1);
          }
        }
      } else {
        this.messages = [];
      }
    },
    getPostUrl(post: Post): string {
      if (!this.activeSite) return "";
      return getUrl(this.activeSite.domain, "post", post.id.toString());
    },
    // Add tag to the post's taglist
    addTag(tag: TagViewModel) {
      if (this.selectedPost) {
        // Only add tag if it doesn't already exist
        if (tag.name.length > 0 && this.selectedPost.tags.find((x) => x.name == tag.name) == undefined) {
          this.selectedPost.tags.push(tag);

          // Add implications for the tag
          this.selectedPost.tags.push(...tag.implications);
        }
      }
    },
    // Find posts similar to the grabbed post (this.selectedPost)
    async findSimilar() {
      if (!this.selectedPost || !this.szuru) {
        return;
      }

      this.clearMessages("FIND_SIMILAR");

      const msg = this.pushInfo("Searching for similar posts...", "FIND_SIMILAR");

      try {
        const res = await this.szuru.reverseSearch(this.selectedPost.contentUrl);

        if (!res.exactPost && res.similarPosts.length == 0) {
          msg.content = "No similar posts found";
        } else {
          if (res.exactPost) {
            msg.content = `<a href='${this.getPostUrl(res.exactPost)}' target='_blank'>
                        Post already uploaded (${res.exactPost.id})</a>`;
            msg.level = "error";
          }

          for (const similarPost of res.similarPosts) {
            // Don't show this message for the exactPost (because we have a different message for that)
            if (res.exactPost && res.exactPost.id == similarPost.post.id) {
              continue;
            }

            this.pushInfo(
              `<a href='${this.getPostUrl(similarPost.post)}' target='_blank'>Post ${similarPost.post.id}
                        looks ${Math.round(100 - similarPost.distance * 100)}% similar</a>`,
              "FIND_SIMILAR"
            );
          }
        }
      } catch (ex) {
        this.clearMessages();
        this.pushError("Error: couldn't reverse search.");
      }
    },
    // Returns ScrapedPost for a contentUrl, or undefined if the given contentUrl does not belong to a ScrapedPost.
    getPostForUrl(contentUrl: string): PostViewModel | undefined {
      for (const post of this.posts) {
        if (post.contentUrl == contentUrl) return post;
      }
      return undefined;
    },
    async loadTagCounts() {
      const allTags = this.posts.flatMap((x) => x.tags);

      for (let i = 0; i < allTags.length; i += 100) {
        const query = allTags
          .slice(i, i + 101)
          .map((x) => encodeTagName(x.name))
          .join();
        const resp = await this.szuru?.getTags(query);

        // Not the best code, but it works I guess?
        if (resp) {
          for (let post of this.posts)
            for (let tag of resp.results)
              for (let postTag of post.tags)
                if (postTag.name == tag.names[0]) {
                  postTag.usages = tag.usages;
                  break;
                }
        }
      }
    },
    async onAddTagKeyUp(e: KeyboardEvent) {
      await this.autoCompletePopulator((<HTMLInputElement>e.target).value);
    },
    onAddTagKeyDown(e: KeyboardEvent) {
      if (e.code == "ArrowDown") {
        e.preventDefault();
        if (this.autocompleteIndex < this.autocompleteTags.length - 1) {
          this.autocompleteIndex++;
        }
      } else if (e.code == "ArrowUp") {
        e.preventDefault();
        if (this.autocompleteIndex >= 0) {
          this.autocompleteIndex--;
        }
      } else if (e.code == "Enter") {
        if (this.autocompleteIndex == -1) {
          this.addTag(new TagViewModel(this.addTagInput));
          this.addTagInput = ""; // Reset input

          // TODO: Do we also want to add the implications?
        } else {
          // Add auto completed tag
          const tagToAdd = this.autocompleteTags[this.autocompleteIndex];
          this.addTag(tagToAdd);
          this.addTagInput = ""; // Reset input
        }
      }
    },
    onClickAutocompleteTagItem(tag: TagViewModel) {
      this.addTag(tag);
      this.addTagInput = ""; // Reset input
      this.autocompleteShown = false; // Hide autocomplete list
    },
    async autoCompletePopulator(input: string) {
      // Based on https://www.w3schools.com/howto/howto_js_autocomplete.asp
      // TODO: Put this in a separate component

      // Hide autocomplete when the input is empty, and don't do anything else.
      if (input.length == 0) {
        this.autocompleteIndex = -1;
        this.autocompleteShown = false;
        return;
      }

      // Cancel previous request
      if (this.cancelSource) {
        this.cancelSource.cancel();
      }
      this.cancelSource = axios.CancelToken.source();

      const query = decodeURIComponent(`*${encodeTagName(input)}* sort:usages`);
      const resp = await this.szuru?.getTags(
        query,
        0,
        100,
        ["names", "category", "usages", "implications"],
        this.cancelSource.token
      );

      this.autocompleteTags = resp!.results.map((x) => TagViewModel.fromTag(x));
      if (this.autocompleteTags.length > 0) this.autocompleteShown = true;
    },
  },
  async mounted() {
    this.config = await Config.load();
    this.showTagUsages = this.config.loadTagCounts;
    this.activeSite = this.config.sites.length > 0 ? this.config.sites[0] : null;

    if (!this.activeSite) {
      this.pushError("No szurubooru server configured!");
    } else {
      this.szuru = await SzuruWrapper.createFromConfig(this.activeSite);
    }

    browser.runtime.onMessage.addListener((cmd: BrowserCommand, sender: Runtime.MessageSender) => {
      switch (cmd.name) {
        case "push_message":
          this.messages.push(cmd.data);
          break;
        case "remove_messages":
          for (let i = 0; i < cmd.data; i++) {
            if (this.messages.length == 0) break;
            this.messages.pop();
          }
          break;
      }
    });

    let extraInfoSpec: WebRequest.OnBeforeSendHeadersOptions[] = ["requestHeaders", "blocking"];
    if (isChrome()) {
      extraInfoSpec.push("extraHeaders" as any);
    }

    browser.webRequest.onBeforeSendHeaders.addListener(
      (details: WebRequest.OnBeforeSendHeadersDetailsType) => {
        let requestHeaders = details.requestHeaders ?? [];

        // Find which ScrapedPost this belongs to, if any.
        const post = this.getPostForUrl(details.url);
        if (post != undefined && post.referrer) {
          console.log(`Setting referrer to '${post.referrer}' for request to '${post.contentUrl}'.`);
          // TODO: If the headers already have a 'Referer' header this will _not_ override that.
          // Though as far as I am aware the 'img' tag doesn't set this header.
          requestHeaders.push({ name: "Referer", value: post.referrer });
        }

        return <WebRequest.BlockingResponse>{
          requestHeaders,
        };
      },
      { urls: ["<all_urls>"] },
      extraInfoSpec
    );

    // Always call grabPost, even when there is no activeSite
    await this.grabPost();
  },
});
</script>

<style scoped>
video {
  width: 100%;
}

.popup-container {
  width: 780px;
  display: grid;
}

/* 
  Override for firefox.
  This is needed because `width: 780px` shows horizontal scrollbars, where `width: auto` does not.
  Chrome(-likes) do need the explicit `width: 780px`, which is why we need to have different rules for each of them.

  TODO: Firefox shows the horizontal scrollbar for a split second. Setting `overflow-x: hidden` does NOT fix this.
 */
@supports (-moz-appearance: none) {
  .popup-container {
    width: auto;
  }
}

.popup-messages {
  grid-column: 1 / 3;
  margin: 0 10px;
}

.popup-left {
  grid-column: 1;
  max-width: 400px;
}

.popup-right {
  grid-column: 2;
}

.popup-section {
  margin: 10px;
}

.section-header {
  height: 30px;
  padding: 0 6px 0 10px;
  background-color: #eee;

  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header > span {
  font-size: 1.2em;
  vertical-align: middle;
}

.section-row {
  margin: 10px 5px 0;
}

.section-label {
  display: block;
  margin: 0 0 5px 0;
}

.cursor-pointer {
  cursor: pointer;
}

.autocomplete-items {
  position: absolute;
  z-index: 10;
  background-color: white;
  border: 2px solid #24aadd;
  margin-top: 34px;
  display: none;
}

.autocomplete-items.show {
  display: block;
}

.autocomplete-items > div {
  cursor: pointer;
  padding: 2px 4px;
}

.autocomplete-items > div:hover {
  background: #24aadd;
}

.autocomplete-items > div:hover > span {
  color: #fff;
}

.autocomplete-items > div.active {
  background: #24aadd;
}

.autocomplete-items > div.active > span {
  color: #fff;
}

/* Hacky way to stop the layout from resizing when we lazy load the usage count. */
.tag-usages-reserve-space {
  min-width: 5ch; /* 5 character width */
  display: inline-block;
}
</style>
