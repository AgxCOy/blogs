<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vitepress";
import { globalConfig } from "#config";

const envId = globalConfig.comments.twikoo.env;
const twikooJs = ref(null);
const router = useRouter();

function initTwikoo() {
  try {
    window.twikoo.init({
      envId,
      // onCommentLoaded: initLightGallery,
    });
  } catch (e) {}
}

function initJs() {
  if (twikooJs.value) {
    twikooJs.value.onload = initTwikoo;
    router.onAfterRouteChanged = onRoute;
  }
}

function onRoute(to) {
  if (to) setTimeout(initTwikoo, 1000);
}

onMounted(() => {
  initTwikoo();
  initJs();
});
</script>

<template>
  <div class="comment-container vp-raw">
    <!-- KaTeX -->
    <component
      :is="'script'"
      defer
      src="https://jsd-proxy.ygxz.in/npm/katex@0.6.0/dist/katex.min.js"
      crossorigin="anonymous"
    ></component>
    <component
      :is="'script'"
      defer
      src="https://jsd-proxy.ygxz.in/npm/katex@0.6.0/dist/contrib/auto-render.min.js"
      crossorigin="anonymous"
    ></component>

    <!-- Twikoo -->
    <div id="twikoo"></div>
    <component
      :is="'script'"
      src="https://cdn.jsdelivr.net/npm/twikoo@1.7.11/dist/twikoo.min.js"
      crossorigin="anonymous"
      ref="twikooJs"
    ></component>
  </div>
</template>
