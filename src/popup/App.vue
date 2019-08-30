<template>
    <div class="popup-container">
        <div class="popup-row">
            <div class="popup-column1" style="margin: 10px 10px 0px 10px;">
                <ul class="messages">
                    <li
                        v-for="msg in messages"
                        :key="msg.name"
                        :class="getMessageClasses(msg)"
                        v-html="msg.content"
                    ></li>
                </ul>
            </div>
        </div>

        <div class="popup-row">
            <div class="popup-column2">
                <div class="popup-header">
                    <span>Basic info</span>
                    <i class="fas fa-cog" @click="openSettings"></i>
                </div>

                <div class="popup-content">
                    <div class="popup-block">
                        <span class="block-title">Safety</span>

                        <label class="container">
                            <input type="radio" value="safe" v-model="post.safety" />
                            <span class="checkmark"></span>
                            Safe
                        </label>

                        <label class="container">
                            <input type="radio" value="sketchy" v-model="post.safety" />
                            <span class="checkmark"></span>
                            Sketchy
                        </label>

                        <label class="container">
                            <input type="radio" value="unsafe" v-model="post.safety" />
                            <span class="checkmark"></span>
                            Unsafe
                        </label>
                    </div>

                    <div class="popup-block">
                        <span class="block-title">Source</span>
                        <input type="text" v-model="post.source" />
                    </div>
                </div>

                <div class="popup-header">
                    <span>Tags</span>
                </div>

                <div class="popup-content">
                    <div class="popup-block">
                        <ul class="compact-tags">
                            <li v-for="tag in post.tags" :key="tag.name">
                                <a class="remove-tag" @click="removeTag(tag)">x</a>
                                <span :class="getTagClasses(tag)">{{ tag.name }}</span>
                                <span class="tag-usages">0</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="popup-column2">
                <img :src="post.imageUrl" />
            </div>
        </div>

        <div class="popup-row">
            <div class="popup-column2">
                <select disabled>
                    <option>https://szuru.example.com</option>
                </select>
            </div>

            <div class="popup-column2">
                <button class="primary full" @click="upload">Import</button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import { browser } from "webextension-polyfill-ts";
import { LocalPost, LocalTag, LocalError } from "../LocalTypes";
import SzuruWrapper from "../SzuruWrapper";
import { Post } from "../SzuruTypes";
import { Config, SzuruSiteConfig } from "../Config";

type MessageType = "error" | "info";

class Message {
    content: string;
    type: MessageType;

    constructor(content: string, type: MessageType = "info") {
        this.content = content;
        this.type = type;
    }
}

export default Vue.extend({
    data() {
        return {
            activeSite: null as SzuruSiteConfig | null,
            szuru: null as SzuruWrapper | null,
            post: new LocalPost(),
            messages: [] as Message[]
        };
    },
    methods: {
        async grabPost() {
            // Get active tab
            const activeTab = (await browser.tabs.query({
                active: true,
                currentWindow: true
            }))[0];

            // Send 'grab_post' to the content script on the active tab
            const post = (await browser.tabs.sendMessage(activeTab.id!, "grab_post")) as LocalPost;

            if (post) {
                this.post = post;
                // console.dir(post);
            } else {
                this.pushError("Couldn't grab post");
            }
        },
        async upload() {
            this.clearMessages();

            if (!this.post || !this.post.imageUrl) {
                this.pushError("There is no post to upload!");
                return;
            }

            if (!this.szuru) {
                this.pushError("No szurubooru server configured!");
                return;
            }

            try {
                this.pushInfo("Uploading...");
                window.scrollTo(0, 0);
                const createdPost = await this.szuru.createPost(this.post);
                this.clearMessages();
                // TODO: Clicking a link doesn't actually open it in a new tab,
                // see https://stackoverflow.com/questions/8915845
                this.pushInfo(`<a href='${this.getPostUrl(createdPost)}'>Uploaded post</a>`);
            } catch (ex) {
                const error = ex as LocalError;

                if (error) {
                    this.clearMessages();
                    this.pushError(error.description);
                } else {
                    // Probably too long for a message
                    alert(ex);
                }
            }

            if (this.messages.length > 0) {
                window.scrollTo(0, 0);
            }
        },
        async openSettings() {
            const url = browser.extension.getURL("options/options.html");
            window.open(url);
        },
        getTagClasses(tag: LocalTag): string[] {
            let classes: string[] = [];

            if (tag.category) {
                classes.push("tag-" + tag.category);
            } else {
                classes.push("tag-general");
            }

            return classes;
        },
        removeTag(tag: LocalTag) {
            if (this.post) {
                const idx = this.post.tags.indexOf(tag);
                if (idx != -1) {
                    this.post.tags.splice(idx, 1);
                }
            }
        },
        getMessageClasses(message: Message) {
            let classes: string[] = [];

            switch (message.type) {
                case "error":
                    classes.push("message-error");
                    break;
            }

            return classes;
        },
        pushInfo(message: string) {
            this.messages.push(new Message(message));
        },
        pushError(message: string) {
            this.messages.push(new Message(message, "error"));
        },
        clearMessages() {
            this.messages = [];
        },
        getPostUrl(post: Post): string {
            if (!this.activeSite) return "";
            return this.activeSite.domain + "/post/" + post.id;
        }
    },
    async mounted() {
        const cfg = await Config.load();
        this.activeSite = cfg.sites.length > 0 ? cfg.sites[0] : null;

        if (this.activeSite == null) {
            this.pushError("No szurubooru server configured!");
        } else {
            this.szuru = await SzuruWrapper.createFromConfig(this.activeSite);
        }

        this.grabPost();
    }
});
</script>

<style scoped>
.popup-container {
    width: 700px;
}

.popup-row {
    display: flex;
}

.popup-column1 {
    flex: 100%;
    margin: 10px;
}

.popup-column2 {
    flex: 50%;
    margin: 10px;
}

.popup-header {
    height: 30px;
    padding: 0 0 0 10px;
    background-color: #eee;
    margin: 0 0 10px 0;
}

.popup-content {
    margin: 5px;
}

.popup-header > span {
    vertical-align: middle;
}

/* Horrible hack + guesswork */
.popup-header > i {
    float: right;
    margin: 8px 5px;
    cursor: pointer;
}

.popup-block {
    margin: 0 0 10px 0;
}

.block-title {
    display: block;
    margin: 0 0 5px 0;
}
</style>
