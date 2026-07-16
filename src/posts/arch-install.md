---
title: Arch Linux 个人安（折）装（腾）流程
published: 2024-06-15
description: 
tags:
  - Arch Linux
  - KDE
  - Wayland
  - X11
category: 折腾流程
# origin: https://github.com/silvaire-qwq/miracle
---

::: details 我选择 Arch 的理由
1. 比起“服务”，我还是更倾向于把操作系统当作纯正的工具。可能这就是旧信息时代遗老吧。
2. “缘，妙不可言”。
3. 具体工作具体分析吧。跨平台开发 Arch 也挺舒服的。但 Adobe 全家桶就显然不适合了。
:::

最近重新组织了下家里的设备，咱的笔记本也是先后经历了 Arch 转 Win11 再转 Arch 的路子。时至今日，我曾经跟着律回指南安装 Arch 的步骤有些不再适用，有些需要补充。总而言之，还是重新整理一下我的流程吧。

> [!important]
> 由于 Arch 更迭速度比较快，下面的参考链接以及这篇笔记本身的内容可能随时失效。  
> 在安装、使用过程中遇到的，这里没有提及的问题，还请自行 Google、Bing 或 Baidu。
>
> 如果你觉得 Arch 滚动更新很累、玩不太明白，不妨还是先上手`Pop!_OS`或者`Ubuntu`。
>
> 此外，也可以多多留意其他人总结的 Arch 折腾小技巧，说不定会有意外收获。

## 参考链接

本文有参考以下的安装教程：

1. [律回彼境：Arch Linux 折腾指南&记录](https://www.glowmem.com/archives/archlinux-note)（以下简称“律回指南”）
2. [Nakano Miku：Arch 简明指南](https://arch.icekylin.online/guide/)（以下简称“Miku 指南”）
3. [Arch Wiki：Installation Guide](https://wiki.archlinux.org/title/Installation_guide)

## I. 前期准备

- 下载安装镜像：[清华镜像 (最新版本)](https://mirrors.tuna.tsinghua.edu.cn/archlinux/iso/latest)、[官方下载](https://archlinux.org/download/)。

> 烧录过程不再赘述，推荐用 Ventoy 统一管理安装镜像。[参见 Ventoy 中文主页](https://www.ventoy.net/cn/)

- 固件^1^：启用 UEFI、禁用安全启动（Secure Boot）。

> 近十几年的主板大都支持 UEFI，我也懒得花篇幅去讲传统 BIOS 引导。对于 Arch Linux 的 UEFI 引导方式，我[另有一篇笔记](./arch-uefi.md)讨论，可供部署阶段参考。  
> 至于 Secure Boot，不用想了，给`.efi`启动文件签名着实是件麻烦事。~~对我而言折腾这个没有意义。~~

- 网络^2^：如需连接 WiFi，提前把 WiFi 名字（SSID）改成英文。

> 安装全程在命令行（CLI）环境进行，并且 LiveCD（维护环境，下同）**显示不出中文，也打不出中文**。

> [!tip]
> 如果只是迁移系统，那么进入维护环境之后只需`rsync`做全盘搬运即可（当然前提是目标**盘**要比原**系统**的实际占用空间要大）。可参见 [lin.moe](https://lin.moe/tutorial/2020/04/arch_migrate/)。

## II. LiveCD 基础配置

与[律回指南 Ch.1](https://glowmem.com/archives/archlinux-note#%E4%B8%80%E8%BF%9E%E6%8E%A5%E7%BD%91%E7%BB%9C%E5%92%8C%E6%97%B6%E5%8C%BA%E9%85%8D%E7%BD%AE) 相同，但省略了分配固定 IP 的一步（我完全可以`ip addr`猹询）。

## III. 分区
对于固态硬盘，**不提倡建立过多的分区**。那么在 UEFI 启动、GPT 分区表的系统盘上，至少可以这么分：

- EFI 启动分区[^esp]：挂载`/efi`或`/boot`[^esp_mountpoint]
- 系统分区：挂载根目录`/`

我个人在此基础上，倾向于*在硬盘（逻辑扇区的）末端*开多一个交换分区。

[^esp]: GPT 分区表有专门的“EFI System”分区类型（即 ESP），当然新款的主板也会*连带扫描 FAT 分区*；对于 MBR 分区表，则扫描**活动**的 FAT 分区。参见 [（译）UEFI 启动的实际工作原理](https://www.cnblogs.com/mahocon/p/5691348.html)。

[^esp_mountpoint]: ESP 装载`/boot`系经典分区法。后来有说法称“直接暴露 Linux 内核并不安全”，所以又有将 ESP 装入`/boot/efi`的分法（Ubuntu Server 24.04.2 即如此）。现在（至少在 Arch 里）则推荐直接挂载到`/efi`。

详细的分区步骤参见 Miku 指南。由于该指南假定保留 Windows 系统分区，其对分区方案的介绍实际上拆成了两部分：

- :new: [全新安装](https://arch.icekylin.online/guide/rookie/basic-install-detail#%F0%9F%86%95-%E5%85%A8%E6%96%B0%E5%AE%89%E8%A3%85)
- [7. 分区和格式化（使用 Btrfs 文件系统）](https://arch.icekylin.online/guide/rookie/basic-install.html#_7-%E5%88%86%E5%8C%BA%E5%92%8C%E6%A0%BC%E5%BC%8F%E5%8C%96-%E4%BD%BF%E7%94%A8-btrfs-%E6%96%87%E4%BB%B6%E7%B3%BB%E7%BB%9F)

然后是挂载。务必注意**先挂载`/`**！此外，**不要把不同分区、子卷挂到同一个挂载点上**；**有分交换分区的话记得`swapon`**。

## IV. pacman 配置

### i. 换源

Linux 的包管理器默认食用国外的软件源，`pacman`也一样。因此，非常建议先换用国内镜像，加快包下载速度。

然鹅在更换之前可能需要等待片刻：一经联网，`reflector`会自动筛选**最新**的 20 个镜像站，然后才从快到慢排序^3^。如果换源过早，很可能会被`reflector`摘桃子。

编辑`/etc/pacman.d/mirrorlist`（`vim`还是`nano`请自便）：
```ini
# 在文件开头起一空行，复制下列镜像源：
Server = https://mirrors.tuna.tsinghua.edu.cn/archlinux/$repo/os/$arch
Server = https://mirrors.ustc.edu.cn/archlinux/$repo/os/$arch
Server = https://mirrors.aliyun.com/archlinux/$repo/os/$arch
```
> [!tip]
> 变更后的`mirrorlist`会在 Arch 安装过程中被复制过去。这样后续就不需要再做一遍换源了。

### ii. 自身配置
默认`pacman`是逐个下载软件的。但哪怕是 1MB/s 小水管，并行下载四、五个软件包也绰绰有余了。

编辑`/etc/pacman.conf`：

1. 找到`# Misc options`，删掉`Color` `ParallelDownloads = 5`前面的注释`#`：
```ini
# Misc options
#UseSyslog
Color            # 输出彩色日志
#NoProgressBar
CheckSpace
#VerbosePkgLists
ParallelDownloads = 5   # 最大并行下载数（根据你的网速自行斟酌，不建议写太大）
```

2. 翻页到文件末尾，删掉`[multilib]`和底下`Include =`这两行的注释`#`。
> `multilib`是 32 位软件源。默认下载的包都是`x86_64`的，而有一些程序仍需要 32 位的库。

> [!note]
> 很遗憾，经实测 pacman 配置并不会复制过去。在安装完系统`arch-chroot`进去进一步配置时，你需要重复做一遍上述操作。

## V. 正式部署

参见 [Miku 指南—基础安装—9. 安装系统](https://arch.icekylin.online/guide/rookie/basic-install.html#_9-%E5%AE%89%E8%A3%85%E7%B3%BB%E7%BB%9F)。或者像律回指南那样顺手装一些工具也无何不可：

```sh
pacstrap -K /mnt base linux linux-firmware base-devel linux-headers \
  vi vim nano git wget tmux openssh networkmanager htop ntfs-3g \
  intel-ucode    # or `amd-ucode`
```

::: warning “密钥环不可写”报错
之前出现过`pacman-init.service`意外暴死，导致找不到密钥环的情况：
```log
(126/126) checking keys in keyring
warning: Public keyring not found; have you run `pacman-key --init`?
downloading required keys...
error: keyring is not writable
...
error: failed to commit transaction (unexpected error)
```
对此，[这篇讨论贴](https://bbs.archlinux.org/viewtopic.php?id=283075)中有人提供了个取巧的方案：
```sh
pacman-key --init
pacman-key --populate
```
实测可用。至于成因，贴中有人指出是系统时钟未校准导致，但我当时是来不及`timedatectl`就已经暴死了，具体原因不明。
:::

然后`genfstab -U /mnt > /mnt/etc/fstab`生成挂载表；  
再`arch-chroot /mnt`切换进新系统里，继续配置吧。

---

接下来在`chroot`环境里的配置我参考了[律回指南 Ch.4](https://glowmem.com/archives/archlinux-note#%E5%9B%9B%E7%B3%BB%E7%BB%9F%E5%9F%BA%E6%9C%AC%E9%85%8D%E7%BD%AE)，大体也符合官方文档的流程：调整时区、系统编码、设置主机名、root 密码、新建用户、配置 EFI 引导。

不过在`visudo`那一步我没有启用“免密`sudo`”（如下），律回本人也意识到免密`sudo`并不安全。
```
## Same thing without a password
#%wheel ALL=(ALL:ALL) NOPASSWD: ALL
```

> [!note]
> 除了上述标准流程之外，后续有些步骤也可以提前在`chroot`里完成。但**如果你是初次上手，还是一步一步慢慢来吧**。

## VI. 新系统的配置
跟着律回指南的三、四章装好系统之后，重启登入新系统的终端。  
首先通过`nmtui`连上 WiFi。

### i. CN 源和 AUR 助手
在**联好网的新系统**里配置`archlinuxcn`源：再次打开`/etc/pacman.conf`，末尾添加如下小节
```ini
[archlinuxcn]
Server = https://mirrors.cernet.edu.cn/archlinuxcn/$arch
```
并安装 CN 源的签名密钥和 AUR 助手：
```bash
sudo pacman -S archlinuxcn-keyring  # 安装密钥环
sudo pacman -S yay paru   # 安装 AUR 助手
```
::: warning 密钥环缺少信任
若 CN 源的包安装失败，遭遇`signature ... is marginal trust`报错，可本地信任那个人的 Key。之前`farseerfc`掉过一次，以他为例：
```sh
sudo pacman-key --lsign-key "farseerfc@archlinux.org"
```
然后重试即可。不过截至 25 年国庆为止，`farseerfc`的信任已经恢复，我安装时并未遭遇类似情况。
:::

### ii. 硬件（一）音频安装

音频分为固件（或者说驱动）和管理套件两部分：
```bash
# 音频固件
sudo pacman -S sof-firmware alsa-firmware alsa-ucm-conf
# pipewire 及其音频管理套件
sudo pacman -S pipewire gst-plugin-pipewire pipewire-alsa pipewire-jack pipewire-pulse wireplumber
```
::: details pulseaudio
除了 pipewire 音频方案之外另有`pulseaudio`可供选择。但务必注意：音频管理套件**只能二选一，不可以混装**。

另外，由于 pipewire 本身不单只负责音频管理的工作，如需装 pulseaudio 仍需安装`pipewire` `gst-plugin-pipewire`两个包。
相应地，其余的包可换用如下平替：

- `pipewire-alsa` → `pulseaudio-alsa`
- `pipewire-jack` → `jack2`
- `pipewire-pulse` → `pulseaudio`
- `wireplumber` → `pipewire-media-session`（pipewire 弃用）

> 由于 pipewire 那边有 wireplumber 代替，所以这个包被他们自行标记为“过时”。  
> 但 pulseaudio 仍需要这个包。
:::

显卡驱动等其他硬件设施需要等装好桌面环境再考虑，在只有字符色块滚过的纯终端环境里也没有折腾显卡驱动的必要。

### iii. KDE 桌面环境

跟完前面的内容之后，你便拥有了一个无 GUI 的终端 Arch 系统。但作为日常使用的话，图形桌面肯定必不可少。

本文与那两篇参考外链一样**采用 KDE 桌面环境**。当然除了 KDE 之外，你也可以考虑 GNOME 桌面环境 ~~（只是我用腻了）~~；
也可以考虑散装方案（比如`niri`，部分配置可参见 [aglab.dotfiles](https://git.liteyuki.org/AgxCOy/aglab.dotfiles)）。

```bash
# 分别安装 xorg 套件、sddm 登录管理器、KDE 桌面环境，以及配套软件
sudo pacman -S xorg
sudo pacman -S plasma sddm konsole dolphin kate okular spectacle partitionmanager ark filelight gwenview
# 启用 sddm 服务，重启进 SDDM 用户登录
sudo systemctl enable sddm
sudo reboot now
```

::: info KDE 6 vs KDE 5？
目前最新版本为 KDE 6。但律回指南发布于 23 年 11 月，介绍的是 KDE 5。
话虽如此，倒也不必惊慌。`pacman`以及`yay` `paru`之流均**默认安装最新版**，上述**安装 KDE 5 的步骤仍可用于安装 KDE 6**。
:::

重启后在用户登录界面输入密码回车，恭喜你，距离投入日常使用只剩几步之遥了。之后对 KDE
和系统的配置**大部分**仍可参考[律回指南 Ch.6](https://glowmem.com/archives/archlinux-note#%E5%85%AD%E6%A1%8C%E9%9D%A2%E7%8E%AF%E5%A2%83%E9%85%8D%E7%BD%AE)。

<!-- ::: note 关于 Wayland 和 X -->
> [!note] 关于 Wayland 和 X
> KDE 的图形实现默认已经是 Wayland 了。在开机后输入用户密码的界面处，找找屏幕边角，你可以看到默认选用`Plasma (Wayland)`。
> 点击它，你可以选择换用`Plasma (X11)`。  
> 尽管 X11 有个“锁屏黑屏”[^x11_lockscreen]的问题，但目前来说我还是推荐换回 X11。
>
> [^x11_lockscreen]: KDE 的默认 Breeze 主题锁屏时大概率会出现黑屏、惟有鼠标的现象。在 7 月中旬时已经发现该现象已经蔓延到自定义主题了。查了下 Google 以及 Arch、Manjaro、KDE 的一些讨论帖，尚没有有效的解决方案。  
> 当然有一些主题可能能够解除这个“病征”，像 Nordic Dark 以及 Lavanda。但这种 work around 可能还是因人而异。
<!-- ::: -->

### iv. 硬件（二）显卡驱动与蓝牙

> “so NVIDIA, F**K YOU! ”——Linus Torvalds

AMD 或 NVIDIA 显卡可参见[律回指南 &sect;6.4](https://glowmem.com/archives/archlinux-note#4%E6%98%BE%E5%8D%A1%E9%A9%B1%E5%8A%A8%E5%AE%89%E8%A3%85)
和 [Miku 指南—进阶安装—显卡驱动](https://arch.icekylin.online/guide/rookie/graphic-driver.html)篇。
但我是锐炬核显捏，只需要在 Konsole 终端里`sudo pacman -S`安装英特尔的驱动：

- `mesa` `lib32-mesa`（OpenGL）
- `vulkan-intel` `lib32-vulkan-intel`（Vulkan）
- `intel-media-driver`（VAAPI 解码器，OBS 需要）

如果有蓝牙的话，在 Konsole 里启用（并立即启动）蓝牙服务：
```bash
sudo systemctl enable --now bluetooth
```
> 之前误以为`bluetooth`是 Arch 本身就有的服务，结果发现是桌面环境依赖了蓝牙组件包`bluez`。

### v. 额外中文字体和输入法

律回指南安装的字体分别是 Noto 系列（Linux 常用的 Unicode 字体）和思源系列（也算是 Noto 系列的子集）。
其中 Noto 系列的汉字部分由于一些神秘的原因[^cjk_issues_ref]，不做额外配置的话，渲染出来只能说……能用。

[^cjk_issues_ref]: 参见 [Arch Wiki：关于中文字被异常渲染成日文异体字的说明](https://wiki.archlinux.org/title/Localization/Simplified_Chinese#Chinese_characters_displayed_as_variant_(Japanese)_glyphs)^2^以及 [Arch 中文论坛：noto-fonts-cjk 打包变化可能导致的回落字体选取问题](https://bbs.archlinuxcn.org/viewtopic.php?pid=60100)^2^。

<!-- ::: note fontconfig -->
> [!note] fontconfig
> `wqy-zenhei`^extra^（文泉驿）和`misans`^aur^会在安装过程中自动帮你配置 fontconfig，因此安装完这两款字体之后系统默认用这些字体显示。
> 如果你希望使用未经适配的字体，那么需要在 KDE 设置里装好字体后，额外做字体配置。
>
> 示例：[思源系列字体配置](/shared/01-prefer.conf) By [@Vescrity](https://github.com/Vescrity)  
> 注意：用户级字体配置需放在`~/.config/fontconfig/conf.d`目录中。  
> 另注：使用`fc-cache -vf`刷新字体缓存。
<!-- ::: -->

至于输入法，现阶段推荐直接安装`fcitx5`，参见 [Miku 指南—进阶安装—常用应用—10. 输入法](https://arch.icekylin.online/guide/rookie/desktop-env-and-app.html#_10-%E5%AE%89%E8%A3%85%E8%BE%93%E5%85%A5%E6%B3%95)。

至此，Arch 的安装告一段落，你可以像捣腾 Windows 那样玩转 Arch 了。

## 附录：系统美化

> “爱美之心，人皆有之。”

> [!tip]
> - **风格统一**是美观的必要条件。
> - 少搞“侵入性”美化。或者说，需要**修改系统文件、注入系统进程、破坏系统稳定的美化尽量少做**。
> - **谨遵发布页面附送的安装指引**（KDE、GNOME 主题可以参考项目 GitHub），否则可能安装不全。

### I. 主题
主题这边我也没啥好推荐的，虽然 KDE 6 现在也出现了一些比较好看的主题，但终究是因人而异吧。

我想说明的是，KDE 商店的多数主题在 **X11 会话、125% 甚至更高缩放率**下会出现“非常粗窗口边框，使我的窗口肥胖”的现象（至少我的笔记本如此）。  
我个人目前是直接修改主题 Aurorae 配置文件，利用二分法逐步找到四条边的最适 Padding。
网上貌似也有“把缩放调回 100%，但是更改字体 DPI”的做法，但个人觉得显示效果应该好不到哪去（

### II. 仿 Mac 上下双栏布局
KDE 原生的桌面 UI 就挺 Windows 的，但胜在自由度足够高。
我**个人觉得** Mac OS 那种双栏比较好看、比较方便，所以稍微按照如下配置调整了面板布局。

仅供参考咯。

::: details Dock 栏
即原本的任务栏。
- 位于底部、居中、适宜宽度、取消悬浮、避开窗口
- 除“图标任务管理器”外，其余组件全部移除。
:::

::: details Finder 栏
即“应用程序菜单栏”（可在 *编辑模式—添加面板* 处找到）
- 位于顶部、居中、填满宽度、取消悬浮、常驻显示
- 自左到右依次为：
  - 应用程序启动器（类比开始菜单）
  - 窗口列表
  - 全局菜单（默认提供）
  - “面板间距”留白
  - 数字时钟
    - 日期保持在时间旁边，而不是上下两行
    - 字号略小于菜单栏高度，凭感觉捏
  - “面板间距”留白
  - 系统监视传感器
    - 横向柱状图（平均 CPU 温度、最高 CPU 温度）
    - 仅文字（网络上行、下行速度；网络上传、下载的总流量）
  - 系统托盘
:::

除了 Finder 栏外，可以在系统设置里更改屏幕四周的鼠标表现。
比如，鼠标移动到左上角可以自动弹出“应用程序启动器”，移到右上角可以切换你的桌面，等等。

## 附录：GPG 密钥配置
主要讨论配置提交签名（Commit Signing）时遇到的问题。

### I. VSCode 提交签名
大体上跟着 [Commit Signing - VSCode Wiki](https://github.com/microsoft/vscode/wiki/Commit-Signing) 就可以了。唯一需要留意的是`pinentry`。

VSCode 的侧边栏“源代码管理”页提交时并不会走终端，也就莫得 pinentry 的 CUI；莫得 pinentry 输密码验证，提交就签不了名。
~~虽然有人好像搞了个`pinentry-extension`出来，但 6 月初我去看的时候它连说明书都莫得，也没有上架，那用集贸。~~
如今可以使用 [GPG Indicator](https://marketplace.visualstudio.com/items?itemName=wdhongtw.gpg-indicator) 插件**在提交之前**先行解锁了。它也支持调用远端的 gpg（算是对 Windows 友好）。

但还是建议稍微延长一下密钥缓存。编辑`~/.gnupg/gpg-agent.conf`：
```properties
default-cache-ttl 21600
```
保存后重启`gpg-agent`：`gpg-connect-agent reloadagent /bye`。

::: info 其他端 pinentry
理论上`pinentry`自身可以根据 XDG 后端选择适用的版本：
```sh
ls /usr/bin | grep 'pinentry'
echo GETPIN | pinentry
# 若 GETPIN 抛出错误，可以改用下面这条
echo "test" | gpg --clearsign
```
你可以用上述命令看看都支持什么后端，以及它会自动选择哪个。像 niri 通常会装 gnome 后端，测试结果也的确会出`pinentry-gnome3`的密码框。
:::

除此之外，`pinentry`需要指定 tty，否则找不到 IO 设备也会炸。解法：`export GPG_TTY=$(tty)`。

经测试，大部分终端均能在 SSH 连接中调出 CUI。若 VSCode Remote-SSH 打开的终端签不了名，检查一下是不是终端分割得太小了。

### II. GPG 密钥备份（导出导入）
之前并没有意识到备份 key 的重要性，结果重装 Arch 重新配置提交签名时，
我发现 GitHub 和腾讯 Coding 会重置提交验证（同一个邮箱只能上传一个公钥），届时就是我痛苦的 rebase 重签了。
~~不过好在受影响的多数只是我的个人项目，变基无伤大雅。~~

```bash
gpg --list-secret-keys --keyid-format LONG
# export
gpg -a -o public-file.key --export <keyid>
gpg -a -o private-file.key --export-secret-keys <keyid>
# import
gpg --import ~/public-file.key
gpg --allow-secret-key-import --import ~/private-file.key
```
重新导入 Key 之后，可能还需要`gpg --edit-key`更改密码（`passwd`）、重设信任（`trust`）。
