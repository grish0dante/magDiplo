<template>
<canvas ref="canvas" class="scene-canvas" aria-label="Interactive 3D model viewport">
</canvas>
</template>
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { createScene } from '../composables/useThreeScene';
import { setThreeContext } from '../stores/threeStore';

const canvas = ref(null);
let context;

onMounted(() => {
  context = createScene(canvas.value);
  setThreeContext(context);
});

onBeforeUnmount(() => {
  context?.dispose();
  setThreeContext(null);
});
</script>
<style scoped>.scene-canvas{display:block;width:100%;height:100%;min-height:320px;outline:none}</style>
