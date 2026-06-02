---
layout: home
footer: false
---

<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount } from "vue";
import { generateGrid } from "#theme/utils/generateGrid";
import {globalConfig} from "#config"
import { columnCount, updateColumns } from "#theme/utils/dynamicColumns";
import { useCardHover } from "#theme/utils/useCardHover";
import { data as photos } from "#theme/data/photos.data";

const { handleMouseMove, handleMouseEnter, handleMouseLeave } = useCardHover();

const selectedCategory = ref<string | null>(null);

onMounted(() => {
  // 初始化选中标签（刷新页面时保持状态）
  const urlParams = new URLSearchParams(window.location.search);
  const categoryFromUrl = urlParams.get("category")?.trim();

  if (categoryFromUrl) {
    selectedCategory.value = categoryFromUrl;
  }

  updateColumns();
  window.addEventListener("resize", updateColumns);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateColumns);
});

// 分类标签列表（不限制数量）
const categories = computed(() => {
  const set = new Set<string>();

  photos.forEach((photo) => {
    set.add(photo.category || "Uncategorized");
  });

  return Array.from(set).sort((a, b) => a.localeCompare(b));
});

// 按分类分组
const groupedByCategory = computed(() => {
  const filterCategory = selectedCategory.value?.trim().toLowerCase();

  const processedItems = photos.filter((photo) => {
    const category = (photo.category || "Uncategorized").toLowerCase();

    if (!filterCategory) return true;
    return category === filterCategory;
  });

  return generateGrid(
    processedItems,
    undefined,
    (item) => item.category || "Uncategorized",
    columnCount.value
  );
});

// 点击标签
const handleCategoryClick = (category: string) => {
  selectedCategory.value = category || null;

  const url = new URL(window.location.href);

  if (category) {
    url.searchParams.set("category", category);
  } else {
    url.searchParams.delete("category");
  }

  window.history.pushState({}, "", url);
};

const activeImg = ref()

const showImg = (url: string) => { activeImg.value = url }
const closeImg = () => { activeImg.value = null }
</script>

<h1 class="artist">{{globalConfig.lang.photos}}</h1>

<div class="tags">
  <TagChip
    @click="handleCategoryClick('')"
    :active="!selectedCategory"
    @mouseenter="handleMouseEnter"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    :label="globalConfig.lang.allPhotos"
  />

  <TagChip
    v-for="category in categories"
    :key="category"
    @click="handleCategoryClick(category)"
    :active="selectedCategory === category"
    @mouseenter="handleMouseEnter"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    :label="category"
  />
</div>

<div class="allPhotos">
  <ClientOnly>
    <div
      v-for="group in groupedByCategory"
      :key="group.key"
      style="margin-bottom: 32px;"
    >
      <h1 class="artist">{{ group.key }}</h1>
      <div class="songs-grid">
        <div
          v-for="(col, colIndex) in group.columns"
          :key="colIndex"
          class="column"
        >
          <div
            v-for="photo in col"
            :key="photo.path"
            class="photo-card"
          >
            <PostCard
              :image="photo.path"
              :description="photo.fileName"
              meta=false
              @click="showImg(photo.path)"
            />
          </div>
        </div>
      </div>
    </div>
  </ClientOnly>

  <Transition name="fade">
    <div v-if="activeImg" class="lightbox-overlay" @click="closeImg">
      <div class="close-btn">&times;</div>
      <img :src="activeImg" class="lightbox-img" @click.stop />
    </div>
  </Transition>
</div>

<style scoped>
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--vp-gap);
  margin-bottom: 30px;
}

.songs-grid {
  display: flex;
  gap: var(--vp-gap);
}

.column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--vp-gap);
}

.artist {
  margin-top: 30px;
  line-height: 110px;
  font-size: 100px;
  position: relative;
  top: 30px;
  font-weight: bold;
  color: var(--vp-c-gutter);
  opacity: 0.7;
  z-index: -1;
  mask-image: linear-gradient(var(--vp-c-gutter) 20%, transparent);
  text-transform: var(--vp-title-uppercase);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999; /* 确保在 VitePress 导航栏之上 */
  cursor: zoom-out;
}

.lightbox-img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
  cursor: default;
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 30px;
  color: #fff;
  font-size: 40px;
  cursor: pointer;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>