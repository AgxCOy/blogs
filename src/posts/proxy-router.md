---
title: 自组服务：FTTR 网络旁路由和透明代理配置
published: 2026-07-10
updated: 2026-08-07
tags:
  - ImmortalWrt
  - 旁路由
category: 折腾流程
description: 我想我还是专注于讲好“我的”经验吧。毕竟我没法保证它一定普适。
outline: [1, 4]
---

::: info 基于 OpenClash……
此前我曾用 OpenClash 简单尝试过，但效果实在是一般。此外，OpenClash 本身对于`config.yaml`的覆写也不算彻底。按它的模式去订阅配置，会受制于机场的节点分组及其自带的分流规则，无法做进一步自定义。

出于这些原因，我重写了本文，直接基于 Meta 内核架设代理基建。原有的 OpenClash 流程可以**参见这个提交：[009b3a0e](https://github.com/AgxCOy/blogs/blob/009b3a0e7adbebb29402fd4eacee5740d821a0ee/src/posts/proxy-router.md)**。
:::

## 背景
今年的代理提供商堪称哀鸿遍野，我目前在用的机场也是经常重置订阅链接。我手边有三台设备：Android、Linux、Windows 10。每次辗转这些设备，给它们更新订阅也实在是繁琐。

注意到我在 Linux 上是 mihomo 容器 TUN 模式代理。TUN 通过虚拟网卡将流量“吸过去”给 mihomo 分流，最后走物理网卡发给上游网关。有没有可能实际架设这么一个网卡，**下游设备的流量流入这块“网卡”做分流，再从“网卡”流出、发向上游网关（即光猫）**？我称其为“物理 TUN”，后来在网上查，有个更泛用的说法：旁路由。

::: info Eason Yang：
“由于流量（至少上行流量）总会流经旁路由，所以旁路由实质上就是一层透明代理。……既然数据必然经过网关，那么我们只要强制把旁路由作为终端设备对外数据交互的第一层网关即可。”[^ref_easonyang]

[^ref_easonyang]: 出自其撰写的[《旁路由的原理与配置一文通》](https://easonyang.com/posts/transparent-proxy-in-router-gateway/)。
:::

考虑到家庭里其他人还是需要享受 FTTR 漫游的同一个 WiFi、正常地访问国内 App 服务，我的预期自然是对现有网络的干预**尽可能小**。像主流玩法那样刷 Openwrt 当主路由拨号显然不可能。综上，旁路由就成了本文要讨论的玩法了。

> 另一个悲伤的事实是：我打人工客服也**要不到超密**。让主猫桥接也好，操作主猫的 DHCP 之类也好，tan90° 辣。

- FTTR 网络：主设备`192.168.1.1`，有 2.5G LAN 口和若干千兆口。
- 软路由：RG-Rain310W x86 瘦客户机`192.168.1.2/24`，i3-6100U，4GB RAM，64GB SSD，千兆有线网口。
- 客户端：带有线网口的桌面端主机。

## 从头开始……

对我这种小白来说，“头”自然是刚做好前置准备、连固件都还没刷的，整个流程的起点。第一步自然就是刷固件辣。x86 主机相对更推荐 ImmortalWrt 一些。从 [ImmortalWrt Firmware Selector](https://firmware-selector.immortalwrt.org/) 下载最新 Generic x86/64 型号系统镜像。一开始我下载的是 ext4 镜像，但如今为了翻车时回滚方便，我会建议下载 squashfs。

::: info
值得一提的是，COMBINED(-EFI) 镜像和早年的 Ghost 差不多：只需要**把镜像直接烧录进软路由的硬盘**，固件就算刷好了。
:::

下载好后解压`squashfs-combined-efi.img.gz`，用 [balenaEtcher](https://etcher.balena.io/#download-etcher) 等工具刷入`.img`固件。至此第一步结束。

> 为方便起见，从这里开始 ImmortalWrt 将简写为 ImWrt。

### 接口

第二步需要配置旁路由。默认 ImWrt 指定的软路由 IP 为`192.168.1.1`，与 FTTR 主设备相斥。为了尽可能不影响主网，先令旁路由直连客户机，单独为 lan 分配静态路由（图形界面进`网络—接口—lan—编辑`）：

|IP (CIDR)|网关|DNS|DHCP 服务器|
|---------|----|---|----------|
|`192.168.1.2/24`|`192.168.1.1`（即主猫）|`192.168.1.1`|关闭（忽略此接口）|

::: warning 不要一步到位
我建议分步来做：`IP -> 网关、DNS -> DHCP`，一步到位地保存、应用很容易断线无法重连（客户端丢失 IP），整个拓扑崩掉。此外，改绑 IP 的过程中也没办法同时更改网关（此时更改 IP 的操作还没保存，固件发现 IP 和网关均指向自己，明显的路由环路）。
:::

::: info 网桥
默认 lan 口与`br-lan`网桥相连，而非物理的`eth0`。我个人是觉得在旁路由场景下加多一个网桥没什么意义（反正是单网口），也选择在设 IP 之前把网桥删掉。
:::

然后`网络—防火墙`里检查 lan 区域：出站、入站、转发均应设为“允许”。

::: details 等价的终端命令
如果实在没有办法形成`软路由 -> 客户机`的直连拓扑（比如客户机实在没有有线网卡），那就只好给软路由接上屏幕和键盘，直接在终端里敲命令来完成配置了：
```sh
uci set network.lan.ipaddr='192.168.1.2/24'
uci set network.lan.gateway='192.168.1.1'
uci set network.lan.dns='192.168.1.1'  # 未配置 mihomo 前暂作如此
uci commit network
/etc/init.d/network restart

uci set dhcp.lan.ignore='1'
uci commit dhcp
/etc/init.d/dnsmasq restart

uci set firewall.@zone[0].forward='ACCEPT'
uci commit firewall
/etc/init.d/firewall restart
```
:::

顺便在 SSH 里确认是否 IPv4 转发：
```sh
sysctl net.ipv4.ip_forward
```
若值为 0，编辑`/etc/sysctl.conf`打开它：
```conf
net.ipv4.ip_forward=1
```
重载`sysctl`：
```sh
sysctl -p
sysctl net.ipv4.ip_forward
```
<!--有些教程会要求开启 masquerade（Eason Yang 也对此做了分类讨论），我之前的 OpenClash “实验报告”也提出要开 IP 动态伪装。由于旁路由这边 mihomo DNS 的设置没法一步到位（否则很容易环路），因此到这里为止先不着急开。

 - 若不考虑 mihomo DNS，或是配置为`redir-host`增强，则不伪装亦可；
- 若`dns.enhanced-mode`设为`fake-ip`，则**必须开启 IP 伪装**。

蓝色大肥鱼（DeepSeek）的意见是：若客户机能上 QQ 但打不开网页，或者部分（甚至全部）网站超时，可以尝试开启 IP 伪装。

```sh
uci set firewall.@zone[0].masq='1'
uci commit firewall
/etc/init.d/firewall restart
``` -->

---

做好这些之后，将旁路由正式接入 FTTR 主路由。然后**马上备份当前做好的设置**！接入 FTTR 网络后，应能正常通过刚绑的 IP 访问到 LuCI 图形界面。登进去在`系统—备份与更新`中立即生成一个备份，它会把`/etc`打包下载到你的客户机上。

::: warning 注意备份，及时回滚
由于脱离了 OpenClash，许多原本由插件做的，对固件、防火墙之类所作的设置均**需要手动完成**。一旦失误，很容易导致客户机断网。如果你一直开着 SSH 会话、完整地记录了你操作的每一步，那相对还容易一些（但也很繁琐）；而若你中途关掉过 SSH、忘记了先前的设置步骤，**备份便可以在这种紧急情况救你一把**，不至于像我踩坑时一样反复从“头”开始。
:::

<!-- ### 入网

SSH 登入旁路由，先看看刚刚配置的拓扑是否正确：
```sh
ip addr
ip route
```
然后检验能否正常通网。若是连正常上网都做不到，也别叫旁路由了，连客户机都不如。
```sh
ping 192.168.1.1  # to gateway
ping 223.5.5.5    # to aliDNS
nslookup www.baidu.com
``` -->

### 依赖

依旧 SSH，安装接下来要用的组件：
```sh
apk update
apk upgrade
apk add curl ca-bundle ip-full kmod-tun unzip ca-certificates nano ss
```
::: info why nano?
ImWrt 自带的`vi`无法处理中文字符，会导致保存出来的`config.yaml`也乱套。~~当然 nano 也会乱码就是了，但应付直接复制过去的文本还是没问题的。~~
:::

然后检查 TUN 设备：
```sh
if [ $(ls /dev/net/tun) != '/dev/net/tun' ]; then
  modprobe tun
fi
```

### 安装

同时开启三个 SSH 会话。先创建 mihomo 目录：
```sh
mkdir -p /etc/mihomo
```
然后在各自的会话里并行地执行以下命令：
::: code-group

```sh [1-本体]
cd /etc/mihomo
wget -O mihomo.gz https://github.com/MetaCubeX/mihomo/releases/download/v1.19.29/mihomo-linux-amd64-v1.19.29.gz
gzip -d mihomo.gz
mv mihomo /usr/bin/mihomo
chmod +x /usr/bin/mihomo
```

```sh [2-WebUI]
cd /etc/mihomo
wget -O metacubexd.zip https://codeload.github.com/MetaCubeX/metacubexd/zip/refs/heads/gh-pages
unzip -o metacubexd.zip
mv metacubexd-gh-pages ui/
rm -f metacubexd.zip    # 删不删都行
```

```sh [3-Geo 数据库]
cd /etc/mihomo
wget -O GeoIP.dat https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat
wget -O GeoSite.dat https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat
```

:::

然后把 mihomo 注册为 procd 服务：

::: details /etc/init.d/mihomo
```sh
#!/bin/sh /etc/rc.common
USE_PROCD=1
START=99
STOP=01
PROG=/usr/bin/mihomo
CONF_DIR=/etc/mihomo

start_service() {
  procd_open_instance
  procd_set_param command $PROG -d $CONF_DIR
  procd_set_param respawn
  procd_set_param stdout 1
  procd_set_param stderr 1
  procd_close_instance
}
```
:::

先不着急设开机启动，因为接下来就是痛苦的配置和排错了。在确认基建搭好之前我更建议直接跑`mihomo -d /etc/mihomo`来实时观测日志。

### 手撕

我个人将`config.yaml`分为若干部分处理。事实上你会发现`sniffer` `dns` `tun`段分别就是 OpenClash 里的“域名嗅探”、DNS 覆写（也包括“模式选择”）、TUN 模式。只是在插件中这些段不完全由用户操作，插件自身也干了。

用文档里的 [Geo 快捷配置](https://wiki.metacubex.one/example/conf/)作为蓝本，先保证基础运行：

#### 全局配置
```yaml{2,17}
mixed-port: 7890
ipv6: false  # 在旁路由里挂 IPv6 会极大增加配置复杂度
allow-lan: true
unified-delay: false
tcp-concurrent: true
external-controller: 0.0.0.0:9090
external-ui: ui
external-ui-url: https://codeload.github.com/MetaCubeX/metacubexd/zip/refs/heads/gh-pages

geodata-mode: true
geox-url:
  geoip: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat"
  geosite: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat"
  mmdb: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.metadb"
  asn: "https://github.com/xishang0128/geoip/releases/download/latest/GeoLite2-ASN.mmdb"

find-process-mode: off  # 软路由不应该匹配进程：需求端在下游而非自身

profile:
  store-selected: true
  store-fake-ip: true
```

> 更多类目参见：[全局配置 - 虚空终端 Docs](https://wiki.metacubex.one/config/general/)。

#### 节点分流

可以直接抄 GeoX 配置的`proxy-providers` `proxy-groups` `proxies` `rules`。篇幅和安全考虑，就不贴出来了。

> 我个人把`proxies`段删了，并且把`rules`里的所有“直连”都替换成了`DIRECT`。原因是 mihomo 本就自带 DIRECT 直连和 REJECT 拦截两个出战策略，甚至可以直接当节点使用。没必要重复。

#### 现象记录

```log
PS C:\Users\SilverAg> curl -x http://192.168.1.2:7890 https://www.google.com
<HTML><HEAD><meta http-equiv="content-type" content="text/html;charset=utf-8">
<TITLE>302 Moved</TITLE></HEAD><BODY>
<H1>302 Moved</H1>
The document has moved
<A HREF="https://www.google.com.hk/url?sa=p&amp;hl=zh-CN&amp;pref=hkredirect&amp;pval=yes&amp;q=https://www.google.com.hk/&amp;ust=1786208443307556&amp;usg=AOvVaw1UvlPL1wBUBnPJsRTcy3vB">here</A>.
</BODY></HTML>
```
---

事实上，如果只是简单地利用这个端口，那么本文到这里就可以结束了，后面也大可不必费心折腾。甚至也没必要非得 ImWrt，普通 Linux 都能做到。

问题就在于：相当一部分软件和游戏它不吃这个代理。因此，我们要像本机部署 TUN 模式代理一样，把流量透明地交给旁路由去分流。

~~但我是真不知道枕么往下整啊。先放着好了。~~

## 后记
在我折腾旁路由期间，群友们也提出了不同的意见：

> “……不在路由器上代理。可以有代理基建但也不要放路由器上。起码不能污染现有网络环境。”

很遗憾 Ta 的做法和我的需求本就相斥。但最后一句我是同意的，符合我“最小干预”的预期。所以我折中了一下，“不主动”污染这个局域网，也就是按需改绑。

> “旁路由不好用，回路啥的搞起来麻烦得很。……那就直接把 FTTR 当中转设备，直接`[in] -> Openwrt -> AP`。配置简单，不会有任何潜在的坑。”

换言之就是再开一个子网。就像以前 ADSL 拨号一样：FTTR LAN 当做 WAN 使，Openwrt 自己做主路由，AP 再连上去当交换机。应该说比较接近主流的软路由玩法，但……太抽象了。

除此之外，这个方案还需要额外添置新的设备。我的小主机是单网口，做主路由需要另外买个网卡；此外家里也再没有闲置的路由器了。我是比较抗拒“破财”，需要爆米的方案自然不是首选。
