---
title: 自组服务：让老机器“物尽其用”
published: 2025-06-18
description: 
tags:
  - RDP
  - 串流
  - SSH
category: 灵机一动
# origin: https://github.com/silvaire-qwq/miracle
---

今年的 618 读者们都有过什么盘算呢？换机还是装新机？我嘛……显然是没有条件（米）去换代的，所以如何利用好现有的条件首先就是个问题。之前偶然借助 Hyper-V 得知了 RemoteApps 这项功能，但跑虚拟机[^vm]始终是我个人比较抵触的事情（问就是配置不够分），于是我将目光盯向了 17 年买的老华硕笔记本。这就是咱“自组服务”最初的尝试了。

[^vm]: 这里仅指传统意义的虚拟机，也就是 VMWare、VirtualBox 之类“模拟一套硬件”的硬件抽象层虚拟化。广义的虚拟机实际上就是虚拟化：Java 语言也有我们熟悉的 JVM 虚拟机，这是编程语言层的虚拟。此外还有 QEMU、Wine、Linux Docker 等在别的层级实现的虚拟化。

## 基础设施

首先除非你想要亲自呆在老机器旁边操作，否则肯定需要远程连接到那台老机器上的，也就需要保证**别的设备能和老机器互通**。

如果两台机同在一个内网（比如以 WiFi、有线等方式，设备间连接同一个路由器），那么通常来说需要**固定老机器的 IP**，否则刚搭的“自组服务”可能没几天就飘不知道哪去，得登进路由器里查咯。固定 IP 可以在老机器的系统里操作，等会具体到系统上再分别讨论；一些路由器也支持用户登录进去固定主机的 IP，但我家网关莫得这个功能。

若并非同一内网，则更麻烦亿些。我个人折腾过可行的最简方案是 Zerotier **虚拟组网**，毕竟当时对寄网了解有限，搜**内网穿透**也只能搜出来“喂我花生”之类的东西（我家网关也只支持某某壳子）。

:::: details 配置 Zerotier One
首先当然得有那么个内网。在 [Zerotier](https://my.zerotier.com/login) 上注册/登录账号（可能比较卡，毕竟国外平台），`Create A Network`创建虚拟内网。免费版（截至目前）至多允许同一网络 25 个设备，但对于我来说足够了。

接下来图省事的朋友点进新建的网络，记一下`Network ID`就可以直接安装 Zerotier 客户端了。

::: details 或者，进一步配置虚拟内网
主要关注以下项：

- `Basics` 网络基础设置
  - `Name` 给你的内网重新起个拟人的名字。
  - `Access Control`一般来说保持默认的`Private`（也就是必须你在账号上同意设备加入）即可。
  - `Advanced` 高级设置
    - `Manage Routes`相当于路由表了（左边是被访的内网网段，右边是 Zerotier 虚拟 IP）。  
    可以看看[这篇博客](https://stray.love/jiao-cheng/zerotier-zhong-jie-jiao-cheng)了解一下。
    - `IPv4 Auto-Assign`里挑一个容易记的 IP 池。比如我就选`10.147.17.*`。
    - `IPv6 Auto-Assign`就随意了。说来 IPv6 现阶段不就是公网吗（
    - `DNS`参见[英文文档](https://docs.zerotier.com/dns/)。

然后在设备加入虚拟内网之后，可以在`Members`里找到这个设备，手工给它分配个静态 IP。
:::

<!-- ::: tabs#zerotierInstall -->
::: tabs
== Windows
Windows 安装之后在开始菜单找到 ZeroTier，然后可以看到任务栏里出现了 ZeroTier 的图标。右键图标，在菜单里直接`Join Network`，粘贴刚刚的`Network ID`，回车即可。

顺带一提，记得在右键菜单里勾上`Start UI at Login`，也就是开机启动。

== Linux systemd
可以通过官网提供的[命令行](https://www.zerotier.com/download/#linux)、部分包管理器等方式安装 Zerotier One。

安装之后记得确认一下 Zerotier 服务是否开启：
```bash
sudo systemctl status zerotier-one.service
```
如`systemctl`显示该服务`disabled`、`inactive (dead)`，说明没有启动，启用并立即启动它：
```bash
sudo systemctl enable --now zerotier-one.service
```
于是就可以使用 Zerotier CLI 了。

我的场景比较简单，不考虑自建 moon 的情况下直接加入虚拟内网：
```sh
sudo zerotier-cli join Network_ID
sudo zerotier-cli listnetworks
```

== Docker
[官方文档](https://docs.zerotier.com/docker/)的做法是拉一个 centos 在里面用 systemd 方式安装，属于是脱裤子放屁。

网上有一些现成的镜像，像`zerotier`和`zerotier-synology`（群晖用的），这里摘录一下用`zerotier/zerotier`的流程：

> [!warning]
> **此方案尚未测试，谨慎复制**！建议在其他**有测试结果的**博客、专栏中获取适合的方案！

```sh
docker pull zerotier/zerotier
# 务必注意网络通信方式！
docker run -d --name zt --network host zerotier/zerotier
docker exec -it zerotier bash
zerotier-cli join Network_ID
zerotier-cli listnetworks
```
:::

在设备加入虚拟内网之后，需要再次登上账号同意设备加入（默认建立的是私有内网，需要号主同意加入），并且给它分配固定 IP。
::::

> [!warning]
> 在配置基础设施、远程连接的时候，还请**不要**断开老机器的屏幕——至少等能连上了再拔线。

## Windows——性能分摊

相信大多数人玩电脑接触最多的还是 Windows 系统，那么对于如何使用它，想必都是很有经验的罢。根据老机器配置的不同，它承担负载的多寡也自然各有参差。

### 固定 IP 

- Win11 参考[电脑屋](https://www.diannaowu.com/jc/212.html)的教程；
- Win8.1 及以下通常还是从控制面板固定，也参考[电脑屋](https://www.diannaowu.com/jc/231.html)。
- Win10 除了控制面板法，也可以直接在“设置—网络和 Internet—状态”中找到上网的网络（通常标以太网或者 WiFi），点进底下的属性，往下划拉到 IP 设置那边手动分配 IP。

### 远程连接

白嫖国产软件的免费服务也可以，最常见的当属向日葵了吧。但我是受不了手机端向日葵广告满天飞，所以还是折腾 Windows 自带的 RDP 吧。

欲使用 RDP 连接，需要启用 Windows 的远程控制功能。据微软称家庭版只能它控别人，不能别人控它。但我都 LTSC 2021 起手了，又有何惧。
远程控制选项可在以下两个入口找到（以 Win10、11 为准，不推荐“开发人员设置”）：

- 设置—系统—远程桌面，启用之（顺便根据指引把“睡眠”禁用掉、把“网络发现”打开）；
- 打开“系统属性”[^sysdm]的“远程”选项卡，允许远程连接、勾上“仅允许……”选项（恕我懒得打全称）。

[^sysdm]: 通常是在“控制面板—系统”（早期 Windows）或“设置—系统—关于”（Win10、11）里跳转。也可`Win+R`直接执行`%windir%\system32\sysdm.cpl`。

然后就可以使用 RDP 连接了。控制端可以用`mstsc`（Windows）、Windows App（Android，原“RD 桌面”）、FreeRDP 以及 Remmina（Linux），等等。

::: warning
微软账号现在推行免密登录，取而代之的是用 2FA 工具验证登录码，这种方式[**不适用于**](https://support.microsoft.com/zh-cn/account-billing/%E5%A6%82%E4%BD%95%E4%BD%BF%E7%94%A8-microsoft-%E5%B8%90%E6%88%B7%E8%BF%9B%E8%A1%8C%E6%97%A0%E5%AF%86%E7%A0%81%E8%AE%BF%E9%97%AE-674ce301-3574-4387-a93d-916751764c43) RDP 连接。  
此外，实测发现，微软文档所述的“应用密码”也无法作为凭据。**推荐用本地、带密码的账户托管老机器，密码留空进行远控需要额外做组策略配置，恕不展开。**
:::

然后该干嘛干嘛。顺带一提，*远控的鼠标一般是不记录位移、只改变坐标的*，也就是说《原神》这类游戏远程玩效果并不佳；但《剑网三》重制版则更建议远程玩，因为接下来讲的 Moonlight 串流没法向它传递键盘输入。

### 串流
这里的串流主要是指类似“云原神”那样的——服务端跑游戏，其他设备接收画面、回传操作的——类似看别人直播的模式。顺带一提，自己直播也是一种串流，只不过方向相反：是你这边把音画上传[^limited_upload]到直播平台。

串流自建云游戏的主要方式是 Moonlight+Sunshine 和 Parsec，其中前者结合 Zerotier 虚拟组网，甚至可以异地云玩。有关的配置方式可以参考[知乎专栏](https://zhuanlan.zhihu.com/p/718510054)或者 B 站搜索“自建云原神”之类的关键词（也可以看看“阿西西”这个 UP 主的魔改 Moonlight 客户端）。咱已经很久没搞了，讲出来也不一定对，就略过吧。

[^limited_upload]: 目前国内的 ISP（又或者运营商）对上传带宽限制得很死，个人通常不会允许大规模的上传（尤其 BT、PT、PCDN，其中以 PCDN 为甚——很多软件都会在运行时偷偷跑上传），否则容易吃传单（据说可以投诉，但我这人懒得扯皮）；企业商宽、专线通常会给多一点，但就极客湾的遭遇来看似乎也仅仅是“一点”，而且价格比较高昂。可能云游戏亏损就是亏损在这吧。

### 文件共享

最简单的就是 Windows 自带的 Samba（SMB）文件共享，也就是右键文件/文件夹属性里边的“共享”选项卡。

此外还有其他参考：

- 网络文件系统 NFS：参见[微软文档](https://learn.microsoft.com/zh-cn/windows-server/storage/nfs/nfs-overview)
- WebDav 服务器（需要 IIS）：参见[微软文档](https://learn.microsoft.com/zh-cn/iis/install/installing-publishing-technologies/installing-and-configuring-webdav-on-iis#enabling-webdav-publishing-by-using-iis-manager)，或参考[《Windows 开启 WebDAV》（少数派）](https://sspai.com/post/78540)

### 其他服务

- 推流机（挂着直播平台的直播软件，开第三方推流接收内网 OBS 推过来的 rtmp 串流）
- 挂下载（主要是各种限速客户端的下载，或者数据量大的下载）
- 自动化脚本
- RemoteApps（迫真“家庭”版 Office，当然还有 Adobe 全家桶，等等） 
- ……

## Linux——Web 接口

Linux 通常还是作为服务器而非日用的系统使用，所以相比费劲折腾 VNC 等远程桌面，不妨就让它挂一些长线运行的服务好了。而既然莫得远程桌面，这些长线服务很显然只剩 WebUI 这一种可视化的选择。当然如果你更偏好 CLI（命令行界面），那也不是不行。

### 固定 IP

不同的发行版主要用到的网络管理工具都不太一样。

- 像 Arch Linux 安装阶段会用`systemd-networkd`分配固定 IP；
- 而 Ubuntu 虽然也有上述服务，但更多在用`Netplan`（参见 [FreeCodeCamp](https://www.freecodecamp.org/chinese/news/setting-a-static-ip-in-ubuntu-linux-ip-address-tutorial/)）；
- 还可以用`ifconfig`做**临时**配置：

```bash
ifconfig  # 查看所有网卡的配置信息
ifconfig eth0  # 查看某网卡的配置信息，如 eth0
ifconfig eth0 172.16.129.108 netmask 255.255.255.0  # 配置网卡的临时生效的IP地址
route add default gw 172.16.129.254  # 配置网关
```

总之，具体问题（发行版）具体分析，像`/etc/sysconfig/network-scripts`这种上古教程还是不要无脑跟了。<del>我的 Ubuntu Server 24.04.2 LTS 连`sysconfig`都莫得。</del>

### SSH 远程连接

安装`openssh`包，并启用`sshd`服务。多数软件包管理器应该都支持 SSH。以咱的 Ubuntu Server 为例：

```bash
sudo apt update
sudo apt install openssh
sudo systemctl enable --now sshd
sudo systemctl status sshd
```

### 部署服务（分层讨论）

首先说一下分层怎么回事。有些服务可能是通过容器分发的，那么 Docker 就是这些服务的下层，为这些服务提供支持（有点绕口？）；而 Docker、npm 之类通常又依赖国外的源（像 DockerHub、npmjs），于是代理又是容器的下层。<del>当然正经分类起来这些都属于应用层。只是细化一下粒度便于讨论。</del>

::: details 代理层（以 Mihomo 为例）
Mihomo 可以理解为 Clash 的后继，所幸 Clash 的许多配置还是能兼容的（至少我的机场订阅可以直接覆盖使用）。但更好的办法还是编写配置文件了。

我参考了“虚空终端”[^yuanshen]文档的 GeoX [快捷配置](https://wiki.metacubex.one/example/conf/)：
```yaml
geox-url:
  geoip: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat"
  geosite: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat"
  mmdb: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.metadb"
  asn: "https://github.com/xishang0128/geoip/releases/download/latest/GeoLite2-ASN.mmdb"
```
但遗憾的是在代理尚未配置好的情况下，似乎哪怕是`jsdelivr`镜像都很难获取到 Geo 信息。那么还是手动下载吧。  
实际上只需下载`geoip.dat`并更名`GeoIP.dat`、`geosite.dat`更名`GeoSite.dat`（Linux 对文件名大小写敏感），丢进 mihomo 配置目录即可（也就是`config.yaml`所在位置）。

[^yuanshen]: 文档简介就是这么写的：“‘虚空终端’是一个基于开源项目‘原神’的二次开发版本”。或许是起名灵感，又或者是避嫌。
:::

<!-- ::: note 应用支持层 -->
> 应用支持层主要就是 Docker。Docker 的安装参见官方文档。出于一些原因，现行很多镜像源并不可靠也并不完整，不如直接配置代理（参见[《如何配置 docker 通过代理服务器拉取镜像》（博客园）](https://www.cnblogs.com/abc1069/p/17496240.html)）。
>
> `pnpm`或者说`node`直接上官网复制 Linux 安装脚本就彳亍，但**不建议去装 Docker 镜像**[^pnpm_docker_image]！
>
> [^pnpm_docker_image]: 个人理解吧……Docker 镜像通常是部署用的，比如 CI/CD runner 跑工作流，需要拉`node`容器生成我这博客的`dist`成品。直接拿来开发个人觉得不太妥。
<!-- ::: -->

::: details 应用层
这块不是重点，各种服务有它自己的参考文档。

- `webmin`：提供 WebUI 以配置服务器的系统，以及监测服务器的性能占用。
- `aria2`与`AriaNg`：提供直链、BT、PT 下载支持。参见[《手把手教你使用 Docker 搭建 aria2+AriaNg，打造自己的离线下载服务器》（博客园）](https://www.cnblogs.com/wqp001/p/14709997.html) [^ariang_baidupan]。
- `jellyfin` `emby`：影音服务器。个人觉得就*资源管理的便利性*而言，Jellyfin 并不算好；但 Emby 白嫖着用也不见得操作有多舒服。
- `vscode-server`：控制端可利用 VSCode 配合 Remote-SSH 插件连上服务器，做些跨平台开发……或者 Linux Native 开发。<del>真有人在 Linux 编译 MSVC x86-64 吗？有的话浇我。</del>
- `ssh`：Xshell 做些命令行活计，Xftp 做些文件交换活计。
- `nfs`：和前面 Windows 一样，可以挂共享文件系统。
- ……

[^ariang_baidupan]: 自从 !!Pandownload!! 被赐似之后，这种套取直链的油猴插件就多半是骗钱引流的“浑水”了，**不建议尝试**！但当年这玩意能火，或许也说明有些慢速下载获取到合适的直链、搭配代理，确实能提速吧。
:::

## 后记

通篇看下来，我的服务场景都挺简单的，不是吗？说实话……我并不熟悉寄网（哪怕为了跨考自学过 408），平时也没有太多 Web 编程的实践和需求。能简单搭这么一个自用的服务便已经方便我不少了。若是真正的大佬，或许还会利用反代、软路由等种种轮子实现更加 NB 的东西吧。

不过反正我这人也没什么水平，笔记也不过抛砖引玉。菜逼有菜逼的天马行空，简单点写，懂的都懂。
