<script setup lang="ts">
import type { PropType } from "vue";
import type { PoolDetails } from "~/models";
import { breakTagName } from "~/utils";

defineProps({
  pools: Array as PropType<PoolDetails[]>,
  showPostCount: Boolean,
  showRemovePool: Boolean,
});
defineEmits(["removePool"]);
</script>

<template>
  <ul class="compact-pools">
    <li v-for="pool in pools" :key="pool.name">
      <a v-if="showRemovePool" class="remove-tag" @click="$emit('removePool', pool)">x</a>
      <span class="tag-general" v-html="breakTagName(pool.name)"></span>
      <span v-if="showPostCount" class="tag-usages tag-usages-reserve-space">{{
        pool.postCount ? pool.postCount : ""
      }}</span>
    </li>
  </ul>
</template>

<style scoped lang="scss">
/* Hacky way to stop the layout from resizing when we lazy load the usage count. */
.tag-usages-reserve-space {
  min-width: 5ch;
  /* 5 character width */
  display: inline-block;
}
</style>
