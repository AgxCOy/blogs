<template>
  <div class="tech-grid">
    <div
      v-for="stack in stacks"
      :key="stack.name"
      class="tech-card"
      @mouseenter="handleMouseEnter"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
    >
      <div class="tech-inner">
        <img :src="stack.icon" alt="" class="tech-icon" />
        <span class="tech-name">{{ stack.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { globalConfig } from "#config";

const stacks = ref(globalConfig.homePage.stacks);

// 动态生成完整 URL
stacks.value = stacks.value.map((stack) => ({
  ...stack,
  icon: `https://jsd-proxy.ygxz.in/gh/devicons/devicon/icons/${stack.icon}/${stack.icon}-original.svg`,
}));

// 自动按首字母排序
stacks.value.sort((a, b) => a.name.localeCompare(b.name));

import { useCardHover } from "../../utils/useCardHover";
const { handleMouseMove, handleMouseEnter, handleMouseLeave } = useCardHover();
</script>

<style scoped>
.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr));
  gap: var(--vp-gap);
  width: 100%;
}

.tech-card {
  perspective: 1000px;
  transition: all var(--vp-transition-time);
  border-radius: var(--vp-border-radius-1);
  width: 100%; /* 保证占满分配到的网格宽度 */
}

.tech-inner {
  display: flex;
  transition: all var(--vp-transition-time);
  align-items: center;
  gap: var(--vp-gap);
  padding: 16px;
  background-color: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: inherit;
  box-shadow: var(--vp-shadow);
  will-change: transform;
  height: 100%; /* 保证同行卡片高度一致 */
  box-sizing: border-box; /* 防止 padding 撑破容器 */
}

.tech-card:hover .tech-inner {
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--vp-shadow-brand);
  transform: scale(1.03);
}

.tech-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0; /*  保证图标在极窄情况下不会被挤压变扁 */
}

.tech-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis; /* 核心防溢出：当文字太长导致无法在一行显示时，显示为省略号 */
}
</style>