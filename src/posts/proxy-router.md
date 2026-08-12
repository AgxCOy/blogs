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
- 客户端：带有线网口的桌面端主机，要静态 IP 的话姑且`192.168.1.129`吧（）

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

然后`网络—防火墙`里检查“常规设置”：出站、入站、转发均应设为“允许”。

> 有的教程会说检查`lan`区域。但……如果是指底下那个`lan => wan`，我这边默认都是“接受”来着。倒是常规设置里不允许入站、转发会甩一个`ERR_CONNECTION_REFUSED`。
> 也有一些教程（比如曾经的我）要求开 masquerade（IP 动态伪装），对此……也不用着急。如果看完本文、折腾了 DNS 和 TUN 也还是打不开网页，再开也不迟。

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

uci set firewall.@defaults[0].input='ACCEPT'
uci set firewall.@defaults[0].output='ACCEPT'
uci set firewall.@defaults[0].forward='ACCEPT'
uci commit firewall
/etc/init.d/firewall restart
```
:::

---

做好这些之后，将旁路由正式接入 FTTR 主路由。然后**马上备份当前做好的设置**！接入 FTTR 网络后，应能正常通过刚绑的 IP 访问到 LuCI 图形界面。登进去在`系统—备份与更新`中立即生成一个备份，它会把`/etc`打包下载到你的客户机上。

::: warning 注意备份，及时回滚
由于脱离了 OpenClash，许多原本由插件做的，对固件、防火墙之类所作的设置均**需要手动完成**。一旦失误，很容易导致客户机断网。如果你一直开着 SSH 会话、完整地记录了你操作的每一步，那相对还容易一些（但也很繁琐）；而若你中途关掉过 SSH、忘记了先前的设置步骤，**备份便可以在这种紧急情况救你一把**，不至于像我踩坑时一样反复从“头”开始。
:::

### 依赖

SSH 登进旁路由，安装接下来要用的组件：
```sh
apk update
apk upgrade
apk add curl ca-bundle ip-full kmod-tun unzip ca-certificates nano ss tcpdump
```
::: info why nano?
ImWrt 自带的`vi`无法处理中文字符，会导致保存出来的`config.yaml`也乱套。~~当然 nano 也会乱码就是了，但应付一下还是没问题的。~~
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
这算是极简配置了。如果可以的话还是找找别的教程，完善一下日志轮转比较好。毕竟一直挂着日志也是巨大多的。
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
unified-delay: true
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

#### 节点分流

可以直接抄 GeoX 配置的`proxy-providers` `proxy-groups` `proxies` `rules`。~~抄的时候记得用`nano`打开（~~ 篇幅和安全考虑，就不贴出来了。

> 我个人把`proxies`段删了，并且把`rules`里的所有“直连”都替换成了`DIRECT`。原因是 mihomo 本就自带 DIRECT 直连和 REJECT 拦截两个出站策略，甚至可以直接当节点使用。没必要重复。

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

事实上，如果只是简单地利用`mixed-port`端口，大可不必再往下折腾。甚至也没必要非得刷 ImWrt 来搭这个代理基建，普通 Linux 都能做到。

问题就在于：相当一部分软件和游戏它不吃这个代理。因此，我们要像本机部署 TUN 模式代理一样，把流量透明地交给旁路由去分流。

> 接下来的内容感谢 GPT 的帮助。

### DNS

前面用全局部分和节点分流部分姑且搭了个`config.yaml`骨架，接下来引入 mihomo DNS。对于 DNS 和后面讨论的 TUN，建议从**最小配置**开始：
```yaml
dns:
  enable: true
  listen: 0.0.0.0:53
  ipv6: false
  enhanced-mode: redir-host
  nameserver:
    - 223.5.5.5
    - 8.8.8.8
```
> ~~事实上这配置直到我确认跑通了都没变过。~~

和前面全局配置一样，不建议开 ipv6。后续确认能跑通之后，可以考虑扩展：换用`fake-ip`增强、DoH 域名服务器，等等。当然**前提是能跑通**。

#### 鸠占鹊巢

软路由自身会默认开启“DNS 重定向”（DNS 劫持），也就是`dnsmasq`服务。DNSMasq 监听 53 端口，也就会和 mihomo DNS 竞争。在 mihomo 服务还没开机启动的当下，不干掉 DNSMasq 去测试配置显然测不出结果。

> ~~也许你会说配置里把端口改了不就好了，评价是干脆也不要监听得了。~~ 加这个监听就是希望下游往 mihomo DNS 这里查，下游发 DNS 请求肯定往 53 端口发啊。所以还是干掉`dnsmasq`罢。

在 LuCI 的`网络—DNS—常规`里，把“DNS 重定向”的勾选给去掉。当然也可以改`dnsmasq`的端口，但这样会有一个残留问题：防火墙。

::: warning prerouting redirect
`/etc/init.d/dnsmasq`里有这么一行命令，大致推断是（开机）启动`dnsmasq`服务时执行：
```sh
nft add rule inet dnsmasq prerouting "meta nfproto { ipv4, ipv6 } udp dport 53 counter redirect to :$dns_port comment \"DNSMASQ HIJACK\""
```
其中`$dns_port`就是`网络—DNS—设置及端口`里的“DNS 服务器端口”。如果只改这个端口，即便`dnsmasq`进程会中止，防火墙规则仍在，下游发的 DNS 请求被重定向到 0 端口，监听个寂寞。
:::

然后 SSH 检查内核转发（理论上不应该有问题）：
```sh
sysctl net.ipv4.ip_forward  # 应为 1
```

#### 现象记录

在旁路由上同时运行 mihomo 和`ss`，确认 53 端口仅有 mihomo 监听后，开启`tcpdump`抓包：
```log
root@ImmortalWrt:~# ss -tunlp | grep :53
udp   UNCONN 0      0                  *:53               *:*    users:(("mihomo",pid=4039,fd=7))
tcp   LISTEN 0      0                  *:53               *:*    users:(("mihomo",pid=4039,fd=9))
```
```sh
tcpdump -ni eth0 port 53   # 没删网桥就是 br-lan
```
下游的网络设置中（比如 Win10 的`以太网—IP 设置—编辑`），手动做 IPv4 分配：IP 随意，前缀长度 24（即掩码`255.255.255.0`），网关和 DNS 均**只设为旁路由**`192.168.1.2`。

::: warning IPv6 网关
网卡有开 IPv6，且任务管理器能看到 v6 （公网）地址，此时在 Windows 终端里`ipconfig`应该能看到**两个默认网关**：
```log
   默认网关. . . . . . . . . . . . . : fe80::1%12
                                      192.168.1.2
```
这样的话需要去网卡那里（Windows 设置—网络状态：更改适配器选项）**把 IPv6 协议临时禁用掉**（或者永久）。

若网关不唯一指向旁路由，流量有可能**直接到 FTTR 主猫，代理失败**；若 DNS 不唯一指向旁路由，域名解析有可能**绕过旁路由，造成泄漏**（同时也无法确定 mihomo DNS 运作情况）。
:::

绑好路由后在命令行里解析百度和谷歌的域名：
```bat
nslookup www.baidu.com 192.168.1.2
nslookup google.com 192.168.1.2
```
鉴于上面是`redir-host`增强，这里两个域名**都应返回真实 IP**，且抓包**应显示下游访问旁路由 53 端口的往返记录**：
```log
03:29:39.090875 IP 192.168.1.129.56691 > 192.168.1.2.53: 2+ A? google.com. (28)
03:29:39.091043 IP 192.168.1.2.53 > 192.168.1.129.56691: 2* 6/0/0 A x1.y1.z1.w1, A x2.y2.z2.w2, A x3.y3.z3.w3, A x4.y4.z4.w4, A x5.y5.z5.w5, A x6.y6.z6.w6 (124)
```

### TUN

DNS 跑通之后加入`Meta`虚拟网卡，以下是最小配置：
```yaml
tun:
  enable: true
  stack: mixed
  auto-route: true
  auto-detect-interface: true
```

然后依旧手动开启 mihomo。下游保持刚刚在 DNS 那里的设置（静态 IPv4、单网关单 DNS），测试连通性：
```bash
ping -c 4 192.168.1.1
ping -c 4 1.1.1.1
curl -4 https://ifconfig.me
```
若直接能跑通（`curl`应返回客户机的公网 IP），说明流量正确进入 TUN，且正常出 LAN。——至是，工程已毕。

---

最后只剩对 procd 服务的收尾：
```sh
/etc/init.d/mihomo enable
/etc/init.d/mihomo start
```

## 局限性

到这里为止，我的初始目标已经达成：在客户机上通过**手动改绑网关和 DNS** 自动获得代理。由于我改写不了 FTTR 主猫的 DHCP 下发（没有超密最多只能关停），旁路由代理自然默认不会“污染现有网络环境”。

实地应用的结果也十分讨喜：原本不吃`mixed-port`的应用成功被接管——Google Play Games (on Windows) 终于装完了，蔚蓝档案（国际服）也不报网络不稳定了，Telegram Android 也能正常收发了。好事。

> 要验证 UDP 真的经过代理，可以接着抓包：`tcpdump -ni eth0 udp`。

但……一切的前提是纯 IPv4 网络。

前面我也特别指出了 IPv6 网关的潜在影响。只要在同一个广播域内，FTTR 主猫便可以通过 RA 直接下发 IPv6 默认网关。并且由于这个过程不可控（DHCP 关了不能保证 RA 广播也停止），本文介绍的旁路由代理某种程度上也就到此为止了：进一步折腾“曲线救国”显然要涉及全局下发——终端设备（尤其安卓机）通常只支持修改 IPv4 网关。即便真的要一刀切、砍掉 IPv6，也已经背离我“最小干预”的初衷了。

::: info Eason Yang
“但 SLAAC/DHCPv6 都没有提供网关下发能力，终端设备总是会以其所交互的主机作为网关，同时大多也不支持直接修改网关。此外，运营商不支持 DHCPv6-PD 、IPv6 子网限定范围等情况，**都使得旁路由支持 IPv6 非常困难，在不同场景、不同网络下要面临不同的配置，甚至无方案可配置**。”
:::

## 后记
在我折腾旁路由期间，群友们也提出了不同的意见：

> “……不在路由器上代理。可以有代理基建但也不要放路由器上。起码不能污染现有网络环境。”

倒是也理解。应该说，我非要这么搞也算是“要求环境适应我”的主观。结果也显而易见，不污染效果有限，污染吧影响别人正常上网。属于是不上不下了。

> “旁路由不好用，回路啥的搞起来麻烦得很。……那就直接把 FTTR 当中转设备，直接`[in] -> Openwrt -> AP`。配置简单，不会有任何潜在的坑。”

换言之就是再开一个子网。就像以前 ADSL 拨号一样：FTTR LAN 当做 WAN 使（上游子网），ImWrt 自己做主路由（下游子网），AP 再连上去当交换机。也就是双层 NAT。应该说比较接近主流的软路由玩法（当然最主流的还是改桥接了）。

拆分成上下游子网之后，上述 IPv6 的局限性也可以彻底解决：FTTR 下发的 IPv6 不会直接到终端设备手上，中间的 ImWrt 主路由可以自主决定 DHCP/RA 下发。mihomo 也可以更优雅地接管 IPv6。

```
FTTR 主 --wifi--> 家里人的终端设备
  ↓光缆
FTTR 从(192.168.1.0/24)
  ↓网线
ImWrt(192.168.2.0/24) --网线--> 路由器 --网线/wifi--> 需要代理的终端设备
```

缺点就是，这个方案会引入额外开支。我的小主机是单网口，做主路由需要另外买个网卡；此外家里也再没有闲置的路由器了。也许以后条件成熟了会多写一段附录吧，现阶段就还是不去操心那么多了。
