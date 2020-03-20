<template>
    <div class="popup-container">
        <div class="popup-left">
            <div class="popup-section">
                <div class="section-header">
                    <span>Basic info</span>
                    <i class="fas fa-cog" @click="openSettings"></i>
                </div>

                <div class="section-row">
                    <span class="section-label">Safety</span>

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

                <div class="section-row">
                    <span class="section-label">Source</span>
                    <input type="text" v-model="post.source" />
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
                        <li v-for="tag in post.tags" :key="tag.name">
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
                <img :src="post.imageUrl" />

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
import { ScrapedPost, ScrapedTag, ScrapeResults } from "neo-scraper";

export default Vue.extend({
    data() {
        return {
            post: new ScrapedPost()
        };
    },
    methods: {},
    async mounted() {}
});
</script>

<style scoped>
.popup-container {
    width: 700px;
    display: grid;
    grid-template-columns: 400px 300px;
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
