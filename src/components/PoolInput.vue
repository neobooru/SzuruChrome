<script setup lang="ts">
import { PropType } from "vue";
import { PoolDetails } from "~/models";
import { encodeTagName, getTagClasses } from "~/utils";
import SzurubooruApi from "~/api";
import { CancelToken } from "axios";

const autocompleteItems = ref<PoolDetails[]>([]);

const props = defineProps({
  szuru: Object as PropType<SzurubooruApi>,
});
const emit = defineEmits(["addPool"]);

function addPool(tag: PoolDetails) {
  emit("addPool", tag);
}

function addPoolFromCurrentInput(input: string) {
  addPool(new PoolDetails([input]));
}

async function autocompletePopulator(input: string, ct: CancelToken) {
  const query = decodeURIComponent(`*${encodeTagName(input)}*`);
  const res = await props.szuru?.getPools(query, 0, 100, ["id", "names", "category", "description", "postCount"], ct);

  if (res) {
    // TODO: Maybe search on hamming distance or something?
    autocompleteItems.value = res.results.map((x) => PoolDetails.fromPool(x));
  } else {
    autocompleteItems.value = [];
  }
}
</script>

<template>
  <AutocompleteInput
    :autocomplete-items="autocompleteItems"
    @add-item="addPool"
    @add-from-current-input="addPoolFromCurrentInput"
    @autocomplete-populator="autocompletePopulator"
    v-slot="slotProps"
  >
    <span :class="getTagClasses(slotProps.item)">{{ slotProps.item.name }}</span>
    <span class="tag-usages">{{ slotProps.item.usages ? slotProps.item.usages : "" }}</span>
  </AutocompleteInput>
</template>
