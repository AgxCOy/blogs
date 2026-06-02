// DO NOT EDIT THESE LINES!!!!! ---------------------------------------------------
import { data as momentList } from "#theme/data/moments.data";
import { data as friendList } from "#theme/data/friends.data";
import { data as iconList } from "#theme/configs/iconList";
import { data as photoList } from "#theme/data/photos.data";

// experimental: i18n
import { languageFile as zh } from "#theme/lang/zh_CN";
import { languageFile as en } from "#theme/lang/en_US";

const languageMap: Record<string, any> = { zh, en };

// LANGUAGES ----------------------------------------------------------------------
// hey !!! you !!!
// change it to "zh" if you want to use Chinese
// website language (zh / en)
const defaultLanguage = "zh";
const languageFile = languageMap[defaultLanguage] || en; // do not edit it
// CONFIGS ----------------------------------------------------------------------
export const globalConfig = {
  title: "Ag's Playground", // title
  description: "Silver=Ag, L is Lin.", // description
  author: "SilverAg.L", // your name
  favicon:
    "https://wsrv.nl/?url=github.com/AgxCOy.png?s=400&u=0a370792ba6bbb95a04d309171b562bcd7283a0f&v=4&mask=circle", // favicon (suggest: circle mask)
  url: "https://agxcoy.shimakaze.org", // main url (https://xxxx.xxx)
  blogBase: {
    type: "github", // github / gitea
    giteaUrl: "https://git.liteyuki.org", // if the type is gitea, fill in the gitea url like: https://gitea.com
    repo: "AgxCOy/blogs", // the repo of ur blog
  },
  dateCreated: "2026-05-06", // date created (YYYY-MM-DD)
  deepHideNegative: true, // enable press "s" 1s to show negative button

  // theme setting
  styles: {
    color: {
      hue: 350,
      globalHue: true, // if true, the hue will be applied to all colors; if false, only the hue of brand color will be changed, the others is calculated based on catppuccin latte & macchiato palette.
      rainbow: {
        enabled: false, // hue will be cycled
        speed: 10, // hue is (getCurrentHue() + x) % 360......(updateHue, 100);
      }, // copied from 2nd easter egg updated in 2026. (just for fun).
    },
    visual: {
      transition: 10, // x[s(second(s))] / 100 | e.g. 10 -> 0.1s (default)
      gap: 12, // x[px]
      radius: 13, // x[px]
      enableCardTitle: true, // show title in custom card (warning, danger...)
      transparent: false, // transparent? (for year & artist)
      uppercase: false, // CATEGORIES / Categories
      mono: false, // use monospace font for title
      cardHover: {
        enabled: true, // enable card hover effect
        scale: 1.03,
        maxMove: 8,
        maxRotate: 5, // 3d effect |  set 0 to disable 3D
        easing: 0.5,
      },
    },
  },

  // homepage setting (when globalConfig.modules.banner is a url)
  homePage: {
    avatar: "https://github.com/AgxCOy.png",
    // "https://wsrv.nl/?url=avatars.githubusercontent.com/u/184231508?s=400&u=0a370792ba6bbb95a04d309171b562bcd7283a0f&v=3", // your avatar

    // modules
    modules: {
      banner: {
        imgurl: "https://www.loliapi.com/acg/", // only work when type is image, e.g. "https://cdn.jsdelivr.net/gh/Miralous/Miracle@main/src/assets/banner.png"
        image: "100vh", // only work when type is "image", e.g. "65vh"
      },
      pictures: false, // show pictures
      lastMoment: true, // last moment
      recentPosts: true, // recent posts
      projects: true, // projects (may be very sloooooow)
      musics: true, // music list
      techStack: true, // tech stack
      friends: true, // friends
    },

    // stacks (https://cdn.jsdelivr.us/gh/devicons/devicon/icons/${stack.icon}/${stack.icon}-original.svg)
    stacks: [
      { name: "Arch Linux", icon: "archlinux" },
      { name: "CSS", icon: "css3" },
      { name: "HTML", icon: "html5" },
      { name: "Linux", icon: "linux" },
      // { name: "Vue", icon: "vuejs" },
      // { name: "JSON", icon: "json" },
      // { name: "JavaScript", icon: "javascript" },
      // { name: "PNPM", icon: "pnpm" },
      { name: "Visual Studio Code", icon: "vscode" },
      // { name: "VSCodium", icon: "vscodium" },
      // { name: "TypeScript", icon: "typescript" },
      // { name: "Node.js", icon: "nodejs" },
      // { name: "Vite", icon: "vitejs" },
      // { name: "Vim", icon: "vim" },
      // { name: "Neovim", icon: "neovim" },
      { name: "Windows", icon: "windows11" },
      { name: "Git", icon: "git" },
      // { name: "NPM", icon: "npm" },
      // { name: "Yarn", icon: "yarn" },
      // { name: "Tailwind CSS", icon: "tailwindcss" },
      { name: "Docker", icon: "docker" },
      { name: "C#", icon: "csharp" },
      { name: "Python", icon: "python" },
      { name: "FastAPI", icon: "fastapi" },
      { name: "MySQL", icon: "mysql" },
      { name: "Nginx", icon: "nginx" },
      { name: "PowerShell", icon: "powershell" },
    ],
  },

  github: "Miralous", // your github username

  // navigation items
  nav: [
    { text: languageFile.dashboard, link: "/" },
    {
      text: languageFile.articles,
      items: [
        { text: languageFile.archives, link: "/archives" },
        { text: languageFile.moments, link: "/moments" },
        { text: languageFile.timeline, link: "/timeline" },
        { text: languageFile.about, link: "/about" },
      ],
    },
    {
      text: languageFile.others,
      items: [
        { text: languageFile.friends, link: "/friends" },
        // enable / disable music list
        { text: languageFile.musics, link: "/musics" },
        { text: languageFile.photos, link: "/photos" },
        // { text: languageFile.manager, link: "/manager" },
        // enable / disable comments
        { text: languageFile.whiteboard, link: "/whiteboard" },
      ],
    },
  ],

  // abouts
  about: {
    desc: "(ᗜ ˰ ᗜ)",
    tags: [
      {
        icon: "ph:city-duotone",
        title: "城市",
        content: "Canton, Guangdong",
      },
      {
        icon: "ph:cake-duotone",
        title: "生日",
        content: "May 22",
      },
      {
        icon: "ph:graduation-cap-duotone",
        title: "知识水平",
        content: "Bachelor, Management",
      },
      {
        icon: "ph:laptop-duotone",
        title: "终端",
        content: "Acer Swift SF314-511",
      },
      {
        icon: "ph:sparkle-duotone",
        title: "擅长之物",
        content: "English, Desktop Maintenance, Scripting",
      },
      {
        icon: "ph:translate-duotone",
        title: "语种",
        content: "Chinese, English, Cantonese",
      },
    ],
    todo: [
      { complete: true, text: "女装" },
      { complete: false, text: "学车" },
      { complete: false, text: "揾点嘢做" },
      { complete: false, text: "搭一套持续可用的自组服务" },
    ],
    schedule: {
      enabled: false,
    },
  },

  // comments
  comments: {
    enabled: true,
    type: "twikoo",
    giscus: {
      repo: "AgxCOy/AgxCOy",
      repoId: "R_kgDOLMGphQ",
      categoryId: "DIC_kwDOLMGphc4CradT",
      themes: {
        light: "https://giscus.catppuccin.com/themes/latte.css",
        dark: "https://giscus.catppuccin.com/themes/mocha.css",
      },
    },
    twikoo: {
      env: "https://twikoo.agxcoy.shimakaze.org",
    },
  },

  // waterfall
  waterfall: {
    oneColumnMax: 700,
    twoColumnMax: 1050,
  },

  // friend weight (default: 0)
  // the higher the weight, the lower the friend will be displayed
  friendWeights: {
    // example: -99, // "example" will be displayed at the top
    "=ᗜωᗜ=": -99,
    uwU: -98,
    friends: -1,
    unable: 0, // "unable" will be displayed at the bottom
  },

  // netease music list
  netease: {
    musicList: "98465691",
    metingApi: "https://api.qijieya.cn/meting",
    demoMode: true, // if false, it will hide control buttons
    showTranslation: true, // show translation of lyrics (default: false, set true to show)
    showRoman: false, // show romanization of lyrics (default: false, set true to show)
    autoplay: true, // auto play music when page loaded
    visualizer: false, // show visualizer at the bottom of player (default: false, set true to show)
    musicSlice: 20, // how many singer to display in music list (default: 20, set 0 to display all)
    QQMusicLyricsSource: true, // use QQ Music API to get lyrics (default: true, set true to enable), Can greatly increase the coverage of songs with word-by-word lyrics,But there is also a small probability of matching the wrong song
  },

  // DO NOT EDIT THESE VALUES!!!!!
  friends: friendList,
  moments: momentList,
  photos: photoList,
  lang: languageFile,
  icon: iconList,
};
