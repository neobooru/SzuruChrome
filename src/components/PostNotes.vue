<script setup lang="ts">
import { ScrapedNote } from "neo-scraper";

class Point {
  constructor(
    public x: any,
    public y: any,
  ) {}
}

// HACK: Copied from old client
function* range(start = 0, end: any = null, step = 1) {
  if (end === null) {
    end = start;
    start = 0;
  }

  for (let i = start; i < end; i += step) {
    yield i;
  }
}

// HACK: Copied from old client
function _getNoteCentroid(note: any) {
  const vertexCount = note.polygon.length;
  const centroid = new Point(0, 0);
  let signedArea = 0.0;
  for (let i of range(vertexCount)) {
    const x0 = note.polygon.at(i)[0];
    const y0 = note.polygon.at(i)[1];
    const x1 = note.polygon.at((i + 1) % vertexCount)[0];
    const y1 = note.polygon.at((i + 1) % vertexCount)[1];
    const a = x0 * y1 - x1 * y0;
    signedArea += a;
    centroid.x += (x0 + x1) * a;
    centroid.y += (y0 + y1) * a;
  }
  signedArea *= 0.5;
  centroid.x /= 6 * signedArea;
  centroid.y /= 6 * signedArea;
  return centroid;
}

defineProps(["notes"]);

const mouseOverNote = ref(false);
const mouseOverNoteText = ref(false);
const hoverNote = ref<ScrapedNote | undefined>(undefined);

const showHoverNote = computed(() => (!hoverNote.value ? false : mouseOverNote.value || mouseOverNoteText.value));
const hoverNoteStyle = computed(() => {
  if (!hoverNote.value) return "";
  const { x, y } = _getNoteCentroid(hoverNote.value);
  const top = y * 100;
  const left = x * 100;
  return `display: block; top: ${top}%; left: ${left}%`;
});
</script>

<template>
  <div>
    <div
      v-if="hoverNote && showHoverNote"
      class="note-text"
      :style="hoverNoteStyle"
      @mouseenter="mouseOverNoteText = true"
      @mouseleave="mouseOverNoteText = false"
    >
      <div class="wrapper">
        <Markdown :source="hoverNote.text" />
      </div>
    </div>

    <svg class="notes-overlay" preserveAspectRatio="none" viewBox="0 0 1 1">
      <g v-for="note in notes">
        <polygon
          vector-effect="non-scaling-stroke"
          stroke-alignment="inside"
          :points="note.polygon.join()"
          @mouseenter="
            hoverNote = note;
            mouseOverNote = true;
          "
          @mouseleave="mouseOverNote = false"
        />
      </g>
    </svg>
  </div>
</template>

<style lang="scss" scoped>
.notes-overlay {
  width: 100%;
  height: 100%;
  position: absolute;
}

.notes-overlay g {
  stroke-width: 1px;
}

.notes-overlay g polygon {
  fill: rgba(255, 255, 205, 0.3);
  stroke: rgba(0, 0, 0, 0.2);
}

.note-text {
  position: absolute;
  max-width: 22.5em;
  display: none;
  text-align: left;
  z-index: 20;
  transform: translate(-50%, -50%);

  > .wrapper {
    background: lemonchiffon;
    padding: 0.3em 0.6em;
    border: 1px solid black;
    color: black;
    box-sizing: border-box;
  }

  &:deep(p:last-of-type) {
    margin-bottom: 0;
  }

  &:deep(p:first-of-type) {
    margin-top: 0;
  }
}
</style>
