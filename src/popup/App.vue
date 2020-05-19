<template>
    <div class="popup-container">
        <div class="popup-messages">
            <ul class="messages">
                <li
                    v-for="msg in messages"
                    :key="msg.name"
                    :class="getMessageClasses(msg)"
                    v-html="msg.content"
                ></li>
            </ul>
        </div>

        <div class="popup-left">
            <div class="popup-section">
                <div class="section-header">
                    <span>Basic info</span>
                    <i class="fas fa-cog" @click="openSettings"></i>
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

                <div class="section-row" style="display:flex;">
                    <input type="text" v-model="addTagInput" v-on:keyup.enter="addTag" />
                    <button
                        class="primary"
                        style="margin-left: 5px; height: auto;"
                        @click="addTag"
                    >Add</button>
                </div>

                <div class="section-row">
                    <ul class="compact-tags">
                        <li v-for="tag in selectedPost.tags" :key="tag.name">
                            <a class="remove-tag" @click="removeTag(tag)">x</a>
                            <span :class="getTagClasses(tag)">{{ tag.name }}</span>
                            <span class="tag-usages">0</span>
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
                    <option
                        v-for="post in posts"
                        v-bind:key="post"
                        v-bind:value="post"
                    >{{ post.name }}</option>
                </select>
            </div>

            <div class="popup-section">
                <img :src="selectedPost.imageUrl" />

                <div style="display: flex;">
                    <button class="primary" @click="findSimilar">Find similar</button>
                    <button class="primary full" style="margin-left: 5px;" @click="upload">Import</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import { browser, Runtime } from "webextension-polyfill-ts";
import { ScrapedPost, ScrapedTag, ScrapeResults } from "neo-scraper";
import SzuruWrapper from "../SzuruWrapper";
import { Post, SzuruError } from "../SzuruTypes";
import { Config, SzuruSiteConfig } from "../Config";
import { BrowserCommand, Message, getUrl } from "../Common";

class ScrapedPostViewModel extends ScrapedPost {
    name: string = "";
}

export default Vue.extend({
    data() {
        return {
            config: null as Config | null,
            activeSite: null as SzuruSiteConfig | null,
            szuru: null as SzuruWrapper | null,
            posts: [] as ScrapedPostViewModel[],
            selectedPost: new ScrapedPost(), // Shouldn't be null because VueJS gets a mental breakdown when it sees a null.
            messages: [] as Message[],
            addTagInput: ""
        };
    },
    watch: {
        selectedPost() {
            if (this.config && this.config.autoSearchSimilar) {
                // No need to check if any vars are unset, findSimilar does that internally
                this.findSimilar();
            }
        }
    },
    methods: {
        // Try to scrape the post from the page
        async grabPost() {
            // Get active tab
            const activeTab = (
                await browser.tabs.query({
                    active: true,
                    currentWindow: true
                })
            )[0];

            // Send 'grab_post' to the content script on the active tab
            const x = await browser.tabs.sendMessage(activeTab.id!, new BrowserCommand("grab_post"));
            // We need to create a new ScrapeResults object and fill it with our data, because the get_posts()
            // method gets 'lost' when sent from the contentscript to the popup (it gets JSON.stringified and any prototype defines are lost there)
            const res = Object.assign(new ScrapeResults(), x);

            // Clear current posts array
            this.posts = [];

            for (var result of res.results) {
                for (var i in result.posts) {
                    const vm = Object.assign(new ScrapedPostViewModel(), result.posts[i]);
                    vm.name = `[${result.engine}] Post ${parseInt(i) + 1}`; // parseInt() is required!
                    this.posts.push(vm);
                }
            }

            if (this.posts.length > 0) {
                this.selectedPost = this.posts[0];
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
            const url = browser.extension.getURL("options/options.html");
            window.open(url);
        },
        getTagClasses(tag: ScrapedTag): string[] {
            let classes: string[] = [];

            if (tag.category) {
                classes.push("tag-" + tag.category);
            } else {
                classes.push("tag-general");
            }

            return classes;
        },
        // Remove tag from post's taglist
        removeTag(tag: ScrapedTag) {
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
        clearMessages(category: string | null) {
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
        addTag() {
            if (this.selectedPost) {
                const tagName = this.addTagInput;
                this.addTagInput = "";
                if (this.selectedPost.tags.find(x => x.name == tagName) == undefined) {
                    this.selectedPost.tags.push(new ScrapedTag(tagName));
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
            const res = await this.szuru.reverseSearch(this.selectedPost.imageUrl);

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
        }
    },
    async mounted() {
        this.config = await Config.load();
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

        // Always call grabPost, even when there is no activeSite
        this.grabPost();
    }
});
</script>

<style scoped>
.popup-container {
    width: 700px;
    display: grid;
    grid-template-columns: 300px 400px;
}

.popup-messages {
    grid-column: 1 / 3;
    margin: 0 10px;
}

.popup-left {
    grid-column: 1;
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
</style>
