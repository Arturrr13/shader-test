<template>
  <main class="shader">
    <div class="water-shader">
      <ShaderWater />
    </div>
    <div class="pixel-shader">
      <ShaderPixel />
    </div>
    <div class="text-pixel-shader">
      <ShaderTextPixel />
    </div>
  </main>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
.pixel-shader {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
.text-pixel-shader {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
.water-shader {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
