<script setup lang="ts">
import axios, { CancelTokenSource } from "axios";

const inputText = ref("");
const autocompleteShown = ref(false);
const cancelSource = ref<CancelTokenSource | undefined>(undefined);
const autocompleteIndex = ref(-1);

const props = defineProps({
  autocompleteItems: {
    type: Array<any>,
    required: true,
  },
});
const emit = defineEmits(["addItem", "addFromCurrentInput", "autocompletePopulator"]);

function addItem(item: any) {
  emit("addItem", item);
}

async function onAddItemKeyUp(e: KeyboardEvent) {
  await autocompletePopulator((<HTMLInputElement>e.target).value);
}

function addItemFromCurrentInput() {
  emit("addFromCurrentInput", inputText.value);
  inputText.value = ""; // Reset input

  // Only needed when the button is clicked
  // When this is triggered by the enter key the `onAddItemKeyUp` will internally also hide the autocomplete.
  // Though hiding it twice doesn't hurt so we don't care.
  hideAutocomplete();
}

function onAddItemKeyDown(e: KeyboardEvent) {
  if (e.code == "ArrowDown") {
    e.preventDefault();
    if (autocompleteIndex.value < props.autocompleteItems.length - 1) {
      autocompleteIndex.value++;
    }
  } else if (e.code == "ArrowUp") {
    e.preventDefault();
    if (autocompleteIndex.value >= 0) {
      autocompleteIndex.value--;
    }
  } else if (e.code == "Enter") {
    if (autocompleteIndex.value == -1) {
      addItemFromCurrentInput();
    } else {
      // Add auto completed item
      const itemToAdd = props.autocompleteItems[autocompleteIndex.value];
      addItem(itemToAdd);
      inputText.value = ""; // Reset input
    }
  }
}

function onClickAutocompleteItem(item: any) {
  addItem(item);
  inputText.value = ""; // Reset input
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

  // Cancel previous request, not sure if this still works after the refactor.
  if (cancelSource.value) {
    cancelSource.value.cancel();
  }
  cancelSource.value = axios.CancelToken.source();

  emit("autocompletePopulator", inputText.value, cancelSource.value.token);
}

watch(props, (newValue) => {
  if (newValue.autocompleteItems.length > 0) {
    autocompleteShown.value = true;
  }
});
</script>

<template>
  <div style="display: flex; flex-direction: column">
    <div style="display: flex">
      <input type="text" v-model="inputText" @keyup="onAddItemKeyUp" @keydown="onAddItemKeyDown" autocomplete="off" />
      <button class="primary" style="margin-left: 5px" @click="addItemFromCurrentInput">Add</button>
    </div>

    <div class="autocomplete-items" v-bind:class="{ show: autocompleteShown }">
      <div
        v-for="(item, idx) in autocompleteItems"
        @click="onClickAutocompleteItem(item)"
        :key="item.name"
        :class="{
          active: idx == autocompleteIndex,
        }"
      >
        <slot :item="item"></slot>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
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
