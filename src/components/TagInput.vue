<script setup lang="ts">
import axios, { CancelTokenSource } from "axios";
import { PropType } from "vue";
import SzurubooruApi from "~/api";
import { TagDetails } from "~/models";
import { encodeTagName, getTagClasses } from "~/utils";

const addTagInput = ref("");
const autocompleteShown = ref(false);
const autocompleteTags = ref<TagDetails[]>([]);
const cancelSource = ref<CancelTokenSource | undefined>(undefined);
const autocompleteIndex = ref(-1);

const props = defineProps({
  szuru: Object as PropType<SzurubooruApi>,
});
const emit = defineEmits(["addTag"]);

function addTag(tag: TagDetails) {
  emit("addTag", tag);
}

async function onAddTagKeyUp(e: KeyboardEvent) {
  await autocompletePopulator((<HTMLInputElement>e.target).value);
}

function addTagFromCurrentInput() {
  addTag(new TagDetails([addTagInput.value]));
  addTagInput.value = ""; // Reset input

  // Only needed when the button is clicked
  // When this is triggered by the enter key the `onAddTagKeyUp` will internally also hide the autocomplete.
  // Though hiding it twice doesn't hurt so we don't care.
  hideAutocomplete();

  // TODO: Do we also want to add the implications?
  // Answer: Probably not, because if the user wanted to have implications they should've clicked/selected the autocomplete entry.
}

function onAddTagKeyDown(e: KeyboardEvent) {
  if (e.code == "ArrowDown") {
    e.preventDefault();
    if (autocompleteIndex.value < autocompleteTags.value.length - 1) {
      autocompleteIndex.value++;
    }
  } else if (e.code == "ArrowUp") {
    e.preventDefault();
    if (autocompleteIndex.value >= 0) {
      autocompleteIndex.value--;
    }
  } else if (e.code == "Enter") {
    if (autocompleteIndex.value == -1) {
      addTagFromCurrentInput();
    } else {
      // Add auto completed tag
      const tagToAdd = autocompleteTags.value[autocompleteIndex.value];
      addTag(tagToAdd);
      addTagInput.value = ""; // Reset input
    }
  }
}

function onClickAutocompleteTagItem(tag: TagDetails) {
  addTag(tag);
  addTagInput.value = ""; // Reset input
  autocompleteShown.value = false; // Hide autocomplete list
}

function hideAutocomplete() {
  autocompleteIndex.value = -1;
  autocompleteShown.value = false;
}

async function autocompletePopulator(input: string) {
  // Based on https://www.w3schools.com/howto/howto_js_autocomplete.asp

  // Hide autocomplete when the input is empty, and don't do anything else.
  if (input.length == 0) {
    hideAutocomplete();
    return;
  }

  // Cancel previous request
  if (cancelSource.value) {
    cancelSource.value.cancel();
  }
  cancelSource.value = axios.CancelToken.source();

  const query = decodeURIComponent(`*${encodeTagName(input)}* sort:usages`);
  const res = await props.szuru?.getTags(
    query,
    0,
    100,
    ["names", "category", "usages", "implications"],
    cancelSource.value.token
  );

  if (res) {
    // TODO: Maybe search on hamming distance or something?
    autocompleteTags.value = res.results.map((x) => TagDetails.fromTag(x));
    if (autocompleteTags.value.length > 0) autocompleteShown.value = true;
  } else {
    autocompleteTags.value = [];
  }
}
</script>

<template>
  <div style="display: flex; flex-direction: column">
    <div style="display: flex">
      <input type="text" v-model="addTagInput" @keyup="onAddTagKeyUp" @keydown="onAddTagKeyDown" autocomplete="off" />
      <button class="primary" style="margin-left: 5px" @click="addTagFromCurrentInput">Add</button>
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
</template>

<style scoped lang="scss">
.autocomplete-items {
  position: absolute;
  z-index: 10;
  background-color: var(--bg-main-color);
  border: 2px solid var(--primary-color);
  margin-top: 34px;
  display: none;

  &.show {
    display: block;
  }

  > div {
    cursor: pointer;
    padding: 2px 4px;

    display: flex;
    align-items: center;
    gap: 0.5em;

    &:hover {
      background: var(--primary-color);
      > span {
        color: var(--text-color);
      }
    }
  }

  > div.active {
    background: var(--primary-color);
    > span {
      color: var(--text-color);
    }
  }
}
</style>
