<!-- Based on https://github.com/cloudacy/vue-markdown-render/blob/master/src/VueMarkdown.ts -->

<script lang="ts">
import Vue from "vue";
import MarkdownIt, { Options } from "markdown-it";

export default Vue.extend({
  name: "VueMarkdown",
  props: {
    source: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      md: null as MarkdownIt | null
    };
  },
  computed: {
    content(): string | undefined {
      console.log(this.source);
      return this.md?.render(this.source);
    }
  },
  created() {
    const options: Options = {
      breaks: true
    };

    this.md = new MarkdownIt(options);
  }
});
</script>

<template>
  <div v-html="content" />
</template>
