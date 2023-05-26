<script setup lang="ts">
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: true,
  },
  toggleable: {
    type: Boolean,
  },
  header: {
    type: String,
  },
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="popup-section">
    <div
      class="section-header"
      :class="{
        toggleable: props.toggleable,
      }"
      @click="$emit('update:modelValue', !props.modelValue)"
    >
      <slot name="header">
        <span>{{ props.header }}</span>
        <template v-if="props.toggleable">
          <font-awesome-icon v-show="props.modelValue" icon="fa-solid fa-chevron-up" class="cursor-pointer" />
          <font-awesome-icon v-show="!props.modelValue" icon="fa-solid fa-chevron-down" class="cursor-pointer" />
        </template>
      </slot>
    </div>

    <slot v-if="props.modelValue"></slot>
  </div>
</template>

<style lang="scss" scoped></style>
