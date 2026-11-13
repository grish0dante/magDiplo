<template>
<div class="progress-container">
  <div
      class="progress-fill"
      :style="{ width: `${progress}%` }"
    >
  </div>
  <span>
    {{ progress }}%
  </span>
</div>
</template>

<script setup>
defineProps({
  progress: {
    type: Number,
    default: 0
  }
});
</script>

<style scoped>
.progress-container {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 320px;
  height: 26px;
  background: #1f2937;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
}

.progress-fill {
  height: 100%;
  background: #14b8a6;
  transition: width 0.3s;
}

span {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
</style>
