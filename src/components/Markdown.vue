<!-- Based on https://github.com/cloudacy/vue-markdown-render/blob/master/src/VueMarkdown.ts -->

<script setup lang="ts">
import MarkdownIt from "markdown-it";

const props = defineProps({
  source: {
    type: String,
    required: true,
  },
});

const md = new MarkdownIt({
  breaks: true,
});

let content = computed(() => md?.render(props.source));
</script>

<template>
  <div v-html="content"></div>
</template>
