import { defineUserConfig } from "vuepress";
import theme from "./src/theme.hope.js";

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "SilverAg.L",
  description: "his personal blogs",

  temp: ".temp",
  cache: ".cache",
  public: "public",
  dest: "dist",

  theme,

  // 和 PWA 一起启用
  shouldPrefetch: false,

  head: [
    // 导入相应链接
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    [
      "link",
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    ],
    [
      "link",
      {
        href: "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400..700&display=swap",
        as: "font",
        crossorigin: "",
      },
    ],
    [
      "link",
      {
        href: "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400..700&display=swap",
        rel: "stylesheet",
        as: "font",
        crossorigin: "",
        media: "print",
        onload: "this.media='all'",
      },
    ],
  ],
});
