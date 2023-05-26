<script setup lang="ts">
defineProps({
  contentUrl: String,
  notes: {
    type: Array,
    default: () => [],
  },
  contentType: String,
});

const emit = defineEmits(["onResolutionLoaded"]);

const imgEl = ref<HTMLImageElement | undefined>(undefined);

// Get image width and height from the <img> element.
// This works because we load the full-resolution image in the <img> element.
// This code might stop showing correct resolutions if/when we implement a progressive image loading.
function onloadImage() {
  // I guess post/selectedPost could have a race condition here?
  // Seems very unlikely though, as the load event gets cancelled as soon as we change the :src attribute.
  // A race condition might even be impossible then.
  if (imgEl.value) {
    emit("onResolutionLoaded", [imgEl.value.naturalWidth, imgEl.value.naturalHeight]);
  }
}
</script>

<template>
  <div class="post-container">
    <img v-if="contentType == 'image'" ref="imgEl" :src="contentUrl" @load="onloadImage" />
    <video v-if="contentType == 'video'" controls>
      <source :src="contentUrl" />
    </video>
    <div class="post-overlay">
      <PostNotes :notes="notes" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.post-overlay {
  position: absolute;
  width: 100%;
  height: 100%;
}

.post-container {
  position: relative;
  display: flex;
}
</style>
