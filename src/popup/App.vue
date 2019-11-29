<template>
    <div class="popup-container">
        <div class="popup-row">
            <div class="popup-column1" style="margin: 0px 10px;">
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
                            <input type="radio" value="safe" v-model="post.rating" />
                            <span class="checkmark"></span>
                            Safe
                        </label>

                        <label class="container">
                            <input type="radio" value="sketchy" v-model="post.rating" />
                            <span class="checkmark"></span>
                            Sketchy
                        </label>

                        <label class="container">
                            <input type="radio" value="unsafe" v-model="post.rating" />
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
                    <div class="popup-block" style="display:flex;">
                        <input type="text" v-model="addTagInput" v-on:keyup.enter="addTag" />
                        <button
                            class="primary"
                            style="margin-left: 5px; height: auto;"
                            @click="addTag"
                        >Add</button>
                    </div>

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
                    <option>{{ activeSite != null ? activeSite.domain : "(no site available)" }}</option>
                </select>
            </div>

            <div class="popup-column2" style="display: flex;">
                <button class="primary" @click="findSimilar">Find similar</button>
                <button class="primary full" style="margin-left: 5px;" @click="upload">Import</button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import { browser } from "webextension-polyfill-ts";
import { ScrapedPost, ScrapedTag, ScrapeResults } from "neo-scraper";
import SzuruWrapper from "../SzuruWrapper";
import { Post, SzuruError } from "../SzuruTypes";
import { Config, SzuruSiteConfig } from "../Config";

type MessageType = "error" | "info" | "success";

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
            post: new ScrapedPost(),
            messages: [] as Message[],
            addTagInput: ""
        };
    },
    methods: {
        // Try to scrape the post from the page
        async grabPost() {
            // Get active tab
            const activeTab = (await browser.tabs.query({
                active: true,
                currentWindow: true
            }))[0];

            // Send 'grab_post' to the content script on the active tab
            const x = await browser.tabs.sendMessage(activeTab.id!, "grab_post");
            // We need to create a new ScrapeResults object and fill it with our data, because the get_posts()
            // method gets 'lost' when sent from the contentscript to the popup (it gets JSON.stringified and any prototype defines are lost there)
            const res = Object.assign(new ScrapeResults(), x);
            const post = res.posts.length > 0 ? res.posts[0] : null;

            if (post) {
                this.post = post;
                // console.dir(post);
            } else {
                this.pushError("Couldn't grab post");
            }
        },
        // Try to upload the post to the selected szurubooru instance
        async upload() {
            this.clearMessages();
            window.scrollTo(0, 0);

            if (!this.post || !this.post.imageUrl) {
                this.pushError("There is no post to upload!");
                return;
            }

            if (!this.szuru) {
                this.pushError("No szurubooru server configured!");
                return;
            }

            try {
                // Create and upload post
                let uploadMsg = new Message("Uploading...");
                this.messages.push(uploadMsg);
                const createdPost = await this.szuru.createPost(this.post);
                // TODO: Clicking a link doesn't actually open it in a new tab,
                // see https://stackoverflow.com/questions/8915845
                uploadMsg.content = `<a href='${this.getPostUrl(createdPost)}' target='_blank'>Uploaded post</a>`;
                uploadMsg.type = "success";

                // Find tags with "default" category and update it
                // TODO: Make all these categories configurable
                const tagsWithCategory = this.post.tags.filter(x => x.category);
                const unsetCategoryTags = createdPost.tags
                    .filter(x => x.category == "default")
                    .filter(x => tagsWithCategory.some(y => x.names.includes(y.name)));

                if (unsetCategoryTags.length != 0) {
                    let tagsMsg = new Message(`${unsetCategoryTags.length} tags need a different category`);
                    this.messages.push(tagsMsg);

                    // unsetCategoryTags is of type MicroTag[] and we need a Tag resource to update it, so let's get those
                    const query = "?query=" + unsetCategoryTags.map(x => this.encodeTagName(x.names[0]));
                    const tags = (await this.szuru.getTags(query)).results;

                    for (let i in tags) {
                        tagsMsg.content = `Updating tag ${i}/${unsetCategoryTags.length}`;
                        tags[i].category = tagsWithCategory.find(x => tags[i].names.includes(x.name))!.category!;
                        await this.szuru.updateTag(tags[i]);
                    }

                    tagsMsg.content = `Updated ${tags.length} tags`;
                    tagsMsg.type = "success";
                }
            } catch (ex) {
                const error = ex as SzuruError;

                if (error) {
                    this.clearMessages();
                    this.pushError(error.description);
                } else {
                    // Probably too long for a message
                    alert(ex);
                }
            }
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
                case "success":
                    classes.push("message-success");
                    break;
            }

            return classes;
        },
        // Add info message
        pushInfo(message: string): Message {
            let msg = new Message(message);
            this.messages.push(msg);
            return msg;
        },
        // Add error message
        pushError(message: string): Message {
            let msg = new Message(message, "error");
            this.messages.push(msg);
            return msg;
        },
        clearMessages() {
            this.messages = [];
        },
        removeMessage(message: Message) {
            const idx = this.messages.indexOf(message);
            if (idx != -1) this.messages.splice(idx, 1);
        },
        getPostUrl(post: Post): string {
            if (!this.activeSite) return "";
            return this.activeSite.domain + "/post/" + post.id;
        },
        encodeTagName(tagName: string) {
            // Searching for posts with re:zero will show an error message about unknown named token.
            // Searching for posts with re\:zero will show posts tagged with re:zero.
            return encodeURIComponent(tagName.replace(/\:/g, "\\:"));
        },
        // Add tag to the post's taglist
        addTag() {
            if (this.post) {
                const tagName = this.addTagInput;
                this.addTagInput = "";
                if (this.post.tags.find(x => x.name == tagName) == undefined) {
                    this.post.tags.push(new ScrapedTag(tagName));
                }
            }
        },
        // Find posts similar to the grabbed post (this.post)
        async findSimilar() {
            if (!this.post || !this.szuru) {
                return;
            }

            // Remove messages that contain "Post already uploaded" or "No similar posts found"
            // but keep the other messages.
            for (let i = 0; i < this.messages.length; i++) {
                if (
                    this.messages[i].content.indexOf("No similar posts found") != -1 ||
                    this.messages[i].content.indexOf("Post already uploaded") != -1
                ) {
                    // Decrement i to negate the i++, because if we remove one object the items
                    // shift one place to the left, aka index--
                    // If we don't do i-- we'll skip the next item in our for loop
                    this.messages.splice(i--, 1);
                }
            }

            const msgSearchSimilar = this.pushInfo("Searching for similar posts...");
            const res = await this.szuru.reverseSearch(this.post.imageUrl);
            this.removeMessage(msgSearchSimilar);

            if (!res.exactPost && res.similarPosts.length == 0) {
                this.pushInfo("No similar posts found");
            } else {
                if (res.exactPost) {
                    this.pushError(
                        `<a href='${this.getPostUrl(res.exactPost)}' target='_blank'>
                        Post already uploaded (${res.exactPost.id})</a>`
                    );
                }

                for (const similarPost of res.similarPosts) {
                    // Don't show this message for the exactPost (because we have a different message for that)
                    if (res.exactPost && res.exactPost.id == similarPost.post.id) {
                        continue;
                    }

                    this.pushInfo(
                        `<a href='${this.getPostUrl(similarPost.post)}' target='_blank'>Post ${similarPost.post.id}
                        looks ${Math.round(100 - similarPost.distance * 100)}% similar</a>`
                    );
                }
            }
        }
    },
    async mounted() {
        const cfg = await Config.load();
        this.activeSite = cfg.sites.length > 0 ? cfg.sites[0] : null;

        if (!this.activeSite) {
            this.pushError("No szurubooru server configured!");
        } else {
            this.szuru = await SzuruWrapper.createFromConfig(this.activeSite);
        }

        // Always call grabPost, even when there is no activeSite
        this.grabPost().then(() => {
            if (cfg.autoSearchSimilar) {
                // No need to check if any vars are unset, findSimilar does that internally
                this.findSimilar();
            }
        });
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
