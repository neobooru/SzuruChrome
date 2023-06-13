<script setup lang="ts">
import byteSize from "byte-size";
import { PropType } from "vue";
import { ScrapedPostDetails } from "~/models";
import { resolutionToString } from "~/utils";

defineProps({
  modelValue: {
    required: true,
    type: Object as PropType<ScrapedPostDetails>,
  },
});
</script>

<template>
  <div class="basic-info-inline">
    <span v-if="modelValue.contentSize">{{ byteSize(modelValue.contentSize) }}</span>
    <span v-if="modelValue.contentSubType">{{ modelValue.contentSubType }}</span>
    <span v-if="modelValue.resolution">({{ resolutionToString(modelValue.resolution) }})</span>
  </div>
</template>

<style scoped lang="scss">
.basic-info-inline {
  display: flex;
  gap: 0 1ch;
  flex-wrap: wrap;
}
</style>
