---
title: 自组服务：FTTR 网络旁路由和透明代理配置
published: 2026-07-10
tags:
  - ImmortalWrt
  - 旁路由
  - OpenClash
  - DHCP
category: 实验报告
description: “你是计科生嘛你就写实验报告？” “我觉得我是。”
outline: [1, 4]
---

::: left
**实验名称**：FTTR 网络旁路由和透明代理配置  
**指导教师**：~~Gemini、DeepSeek、~~□□  
**实验环境**：家庭 **FTTR** 网络
:::

> 满足一下我的幻想罢了，属于没活硬整。真科班生第一眼想必是：这什么玩意。

## 一、实验目的

0. ~~理解透明代理的基本原理。~~
1. 掌握 ImmortalWrt 的安装配置。
2. 实现各设备网络端口的静态配置（IP、网关、DNS）。
3. 学会使用`ping` `tracert`验证路由连通性。
4. 掌握 OpenClash 的安装配置。
5. ~~实现 DHCP 服务器迁移~~。

> 事实上，归根结底是因为：在不同终端之间来回辗转、修改代理软件的配置实在是痛苦。我希望减少一些重复劳动。

## 二、实验原理

~~TUN 模式通过虚拟网卡接管系统流量，实现系统级全局代理。~~[^ref_1]

[^ref_1]: [《通俗易懂：什么是 TUN 模式？Clash / V2RayN 全局代理开启指南》](https://sorabin.com/what-is-tun-mode-clash-v2rayn-guide/)

> 那么有没有一种可能，通过物理网卡来接管全屋（指定）设备的流量，为各个设备附加全局代理？我称之为：物理 TUN 模式。或者更标准一点的说法：透明代理。
>
> 为此，首先需要讨论一下现有的网络架构。

FTTR 由一个主设备和一个（或多个）从设备，以及连接主从的光分配网络等组成。[^ref_2]

> 鉴于咱家很大程度上依赖 FTTR 主从设备漫游的同一个 WiFi，这块“物理网卡”显然是没有办法干预太多。那么就把它当作旁路由吧。

[^ref_2]: [T/CAICI《FTTR 工程技术规范》](https://www.cace.org.cn/UpLoadFiles/File/20221229/6380790898646673157875142.pdf)

旁路由[^ref_3]：通俗地讲就是主路由跟客户端之间的一道“闸口”。

![图1](https://gmiimg.com/d247c8b3d92cd3990245b622d5e7aa56.png)

![图2](https://gmiimg.com/2d0c6641e3f951044153129b3176ab66.png)

[^ref_3]: 更详细的解释还是看[《旁路由的原理与配置一文通》](https://easonyang.com/posts/transparent-proxy-in-router-gateway/)吧。篇幅原因只得暂作如此比喻。

> 容易想到，在“闸口”上挂代理，可以同步分流后边的客户端发来的请求，在客户端看来代理也就“透明”了。

## 三、实验设备

1. FTTR 主设备
2. 锐捷 RGRain310W 瘦客户机
3. PC 终端 2 台
4. 其他必需的线缆
5. 软件：ImmortalWrt、OpenClash

> 我的实际环境如此，部分条件并不必需。  
> 瘦客户机可以随便找台旧电脑代替（当然最好还是有线千兆、x86 了，性能这一块）。  
> 只是测试、调教软路由的话一台 PC 终端足矣。

## 四、实验拓扑
ImmortalWrt 安装后默认 LAN IP 是 192.168.1.1。为避免挤占主猫，先做如此拓扑：
```
旁路由（ImmortalWrt） --网线--> PC 终端
```
在端口配置妥当后，转为如下拓扑：
```
FTTR 主猫 LAN 口 --网线--> 旁路由（ImmortalWrt）
    ↓光缆
FTTR 从猫 --网线（WiFi）--> PC 终端
```

其中：
- 主猫：192.168.1.1/24
- 旁路由：192.168.1.2/24

## 五、实验步骤

### 1. 刷入 ImmortalWrt 固件

x86 主机相对更推荐 ImmortalWrt 一些。从 [ImmortalWrt Firmware Selector](https://firmware-selector.immortalwrt.org/) 下载最新 Generic x86/64 型号系统镜像。

> 从这里开始，下文 ImmortalWrt 简写为 ImWrt。

> [!note]
> `ext4-combined(-efi).*`已经是开箱即用的系统了，这里不存在安装向导一说。
>
> 我刷入时比较偷懒：把瘦客户机的硬盘通过 USB 连到 PC 终端上，然后解压`ext4-combined-efi.img.gz`，通过 [balenaEtcher](https://etcher.balena.io/#download-etcher) 刷入`.img`镜像。

### 2. 配置旁路由

为了尽可能不影响主网，先令旁路由直连 PC 机，单独为 lan 分配静态路由（图形界面进`网络—接口—lan—编辑`）：
|IP (CIDR)|网关|DNS|DHCP 服务器|
|---------|----|---|----|
|`192.168.1.2/24`|`192.168.1.1`（即主猫）|`192.168.1.1` `8.8.8.8`|\*关闭\*（忽略此接口）|

> 上述 CIDR 写法同时指定了 IP 和子网掩码（`255.255.255.0`）。
>
> 在配置网关时，有可能出现“不能是本地 IP 地址”的错误（即：[网关绑到了 localhost 上](#为什么网关不能是自己)）。这时可以**先固定 LAN IP 后再设定网关 IP**。
>
> ImWrt 默认还会给 eth0 加个网桥，即`LAN <- br_lan <- eth0`，这种过滤在旁路由当中没什么意义（`eth0`本身就作为“闸口”了）。我个人选择删除网桥，并将 lan 直接绑到 eth0 上。

> [!note]
> 新手刚配通常都推荐关闭旁路由的 DHCP。这样**旁路由挂逼也不会影响到整个家庭网**。这样一来便有两条路径：
> 1. 要么主路由 DHCP 下发，把终端的默认网关、DNS 绑到旁路由上；
> 2. 要么终端设备自己改网关、DNS。
>
> 通常来说在 FTTR 主猫上面操作 DHCP 下发**需要超级管理员**。但我要讲一个悲伤的故事：  
> > “您好，我这边需要组网，能麻烦提供一下光猫超级管理员密码吗？”  
> > “很抱歉，我们这边不提供查询服务。……”  
> > □□：那很遭了。
>
> 值得庆幸的是，我只需要改绑手机跟电脑，相比智能电视跟无头嵌入式总归要好一点。

然后指定 lan 区域的防火墙（网络—防火墙—常规设置）：入站、出站、转发均设为“允许”；同时**开启 IP 动态伪装**。

配置好之后拔线，把旁路由接到 FTTR 主猫的 LAN 口上。

### 3. 检验连通性

此时 192.168.1.2 应已就绪。打开浏览器（或利用 ssh）登入旁路由，一者测试设备路由是否连通，一者检查设备固件是否正常（当然固件出问题的概率一般不大）。

> 也可以用最简单的方法：`ping 192.168.1.2`。

Windows 中还可以利用`tracert.exe`看看访问目标路由经过几跳。在 PC 终端上固定 IP 分配，把网关和 DNS 绑到旁路由上，然后检查百度`baidu.com`都经过哪些路由。若先过旁路由`.2`再经过 FTTR 主猫`.1`，说明终端上行（发出的请求）能够正常被旁路由干预（附加代理）。

### 4. OpenClash 安装与配置[^ref_docs]

[^ref_docs]: 参见 [ClashOfficial.com](https://clashofficial.com/zh-CN/blog/articles/openwrt-openclash-subscription-whole-home-proxy.html#subscription)

OpenClash 仓库[分发页](https://github.com/vernesong/OpenClash/releases)的`Latest`版本现已提供一条龙安装命令。在 ssh 里安装完成后，重新登入 WebUI，依次`服务—OpenClash`打开管理面板。

> 笔者装的 ImWrt 25.12.1 采用 nftables 作防火墙、apk 作包管理器。

#### 「运行状态」页签

初次进入 OpenClash 面板会自动提醒你下载 Clash 内核，**不必管他**（这时下载大概率很慢乃至断联）。先把基本的设置做了：

|运行模式|代理模式|区域绕过|域名嗅探|DNS 代理|流媒体解锁|
|-------|-------|-------|--------|--------|---------|
|Fake-IP (TUN)|规则|停用[^ref_blog1]|启用[^sniff]|停用|按需（我停用）|

> 运行模式具体设置位于“插件设置—模式设置”。

[^ref_blog1]: 按[这位](https://raspi.ronchy2000.top/m/docs/Openclash_Config/)的意见，在 OpenClash 里设置的地区流量绕过**先于** meta 内核之前，有可能导致部分网站分流异常。

[^sniff]: 或许并不必须。我是参考[快捷配置](https://wiki.metacubex.one/example/conf/)搭建的 Linux TUN 模式代理，所以相应的设置自然是照做了。

#### 「插件设置」页签

> 这页篇幅最多，我很多看不懂。但我改过什么还是可以拉出来说说的。

- 模式设置：**Fake-IP (TUN)、System 网络栈、Rule 策略代理模式**、延迟 5s 启动。其余不动。
- 流量控制、流媒体增强、黑白名单：没做修改。
- DNS 设置：**开启 Dnsmasq 转发**。
- 外部控制：**切换 Dashboard 至官版、更新 Metacubexd**、更新 Zashboard。
- IPv6 不开，Geo 数据库、大陆白名单、定时重启不用管。
- 版本更新：**先不着急更新**。
- 开发者选项、内核测试、oixCloud：雨我无瓜。

#### 「配置订阅」页签

把各机场的 Clash 订阅添加进去。注意不要开“在线订阅转换”。如有必要，把无效节点排除掉（比如用量、到期计时等）。

建议是每天自动更新一次，或者至少每周一次。

#### 「覆写设置」页签

首先在“常规设置”里修改 Github 地址（通常来说前两者比较快），保存应用后回去更新 Meta 内核。

然后讲讲通用设置：

- 上游 DNS：我**没有**用这里的 DNS 覆盖订阅里的 DNS，因为覆盖之后代理反而失效了。大概是解析出问题了。
- 认证信息：我给关了。一开始还没配置 DNS 和分流时，我的 PC 终端是用系统设置来附加代理的。懒得多输账密。

DNS 设置：

- 打开 Fake-IP-Filter（黑名单模式）。它给了模板，但我要稍作修改：
  把`*.lan` `*.local` `*.localdomain` `*.localhost`中的`*`替换为`+`[^local_addr]。

[^local_addr]: 文档说`*`只匹配一级，`+`匹配多级。设想这样一个主机：`aglab.nas`，其从 ImWrt DHCP 获得 IP 之后，软路由这边的域名就是`aglab.nas.lan`。一级显然不够。

Meta 设置和 Smart 设置没有动。规则设置打开自定义规则，并在“优先匹配”处新增以下分流：
```yaml
rules:
  - GEOIP,lan,DIRECT,no-resolve
  - GEOSITE,CN,DIRECT
  - GEOSITE,geolocation-!cn,PROXY

  - GEOIP,CN,DIRECT
  - MATCH,PROXY
```

> [!note]
> 由于订阅的 yaml 配置并不一定按地区分组，OpenClash 也不一定允许填具体的分组，所以像 dlsite 等锁区的网站我干脆也不管了。
> [ClashOfficial.com](https://clashofficial.com/zh-CN/blog/articles/openwrt-openclash-subscription-whole-home-proxy.html#subscription)也推荐旁路由与桌面端做互补，不妨就在桌面端做更细致的分流好了。

> 到这里为止，PC 机这边即便没有在系统（设置、环境变量）里显式指定代理，也应能正常访问谷歌了。和[第 3 步](#_3-检验连通性)一样，也推荐检查谷歌`google.com`经过哪些路由。

## 六、实验数据记录

到百度的 tracert 路径：192.168.1.2 -> 192.168.1.1 -> ...  
结论：国内访问正常经过旁路由分流。

```log
PS C:\Users\SilverAg> tracert.EXE baidu.com

通过最多 30 个跃点跟踪
到 baidu.com [110.242.74.102] 的路由:

  1     2 ms     1 ms     1 ms  192.168.1.2
  2     2 ms     2 ms     2 ms  REALTEK [192.168.1.1]
  3     4 ms     3 ms     4 ms  ...
```

到咕鸽的 tracert 路径：192.168.1.2 -> ...  
结论：国外访问正常从旁路由出站，并通过代理成功建立 HTTP 连接、取回 HTML 内容。

![透明代理 google](.img/proxy_router-google.avif)

> 然鹅，注意到图中经过`.2`之后，便无法再得知路由信息，不得不再借助现象加以推论。

## 七、实验结果分析

从数据至少可以得出：在上述实验过程中，PC 机发出的请求均**首先**经过旁路由`192.168.1.2`，这就允许旁路由的固件对请求做进一步分流。就硬件（旁路由）架设角度，成功让瘦客户机介入家庭 FTTR 网络。

然而，在嗅探`google.com`路由时，却出现“中间节点请求超时”的情况，甚至无法得知传出的请求是否经过 FTTR 主猫`192.168.1.1`。注意到在实验过程中，我们采取 Fake-IP 模式：

::: info 引用自 [openclash.net](https://openclash.net/14)
“Fake-IP 模式在客户端发起 DNS 请求时会立即返回一个保留地址（198.18.0.1/16），同时向上游 DNS 服务器查询结果，如果判定返回结果为污染或者命中代理规则，则直接发送域名至代理服务器进行远端解析。”
:::

那么在异步 DNS 查询过程中，旁路由`.2`收到请求后返回的下一跳**有可能**仍是保留地址，对保留地址发 ICMP **永远无法路由到真正的 IP**。

::: details 补充：在 PC-02(linux) 上 ping google.com 的日志
```log
PING google.com (198.18.0.7) 56(84) bytes of data.
64 bytes from 198.18.0.7: icmp_seq=1 ttl=62 time=2.49 ms
64 bytes from 198.18.0.7: icmp_seq=2 ttl=62 time=2.30 ms
64 bytes from 198.18.0.7: icmp_seq=3 ttl=62 time=2.28 ms
64 bytes from 198.18.0.7: icmp_seq=4 ttl=62 time=2.30 ms
64 bytes from 198.18.0.7: icmp_seq=5 ttl=62 time=2.62 ms
^C
--- google.com ping statistics ---
5 packets transmitted, 5 received, 0% packet loss, time 4008ms
rtt min/avg/max/mdev = 2.278/2.397/2.621/0.135 ms
```
:::

## 八、实验结论

1. 旁路由可最小程度上介入 FTTR 局域网中，正确配置旁路由、终端的网关和 DNS 分配是代理“透明”的核心条件。
2. 本实验验证了旁路由组网、代理配置、静态路由添加与连通性测试的完整流程，掌握了旁路由架设、故障排查方法，具备基础透明代理网关的部署与排错能力。

## 九、思考题

### 为什么网关不能是自己？

> 感谢蓝色大肥鱼。

::: info 答：
网关的定义是**去往其他网段的中转设备**。换言之，对任意网络设备，非内网\*网段\*的数据包均需要发往“网关”。若在 ImmortalWrt 里既把 ip 设为`192.168.1.1/24`（默认如此），又把网关也绑到自己，可以想见：旁路由接收到下游来的数据包，**本该转发给主猫**（毕竟 WAN 是主猫在连）**，最终却发回自己，形成路由环路**。后果也显而易见：在其下游的终端设备都将断网瘫痪。
:::

### 那么，FTTR 主猫的网关又是谁？

> 仍然感谢蓝色大肥鱼。

::: info 答：
不妨做个简单的递推：
- PC 终端有`localhost`内网，位于 LAN 子网。
  - 目标非子网也非回环网，那就是去 WAN，发向默认网关（旁路由或是主猫）；
  - 目标在子网，默认直接发 ARP 找到目标主机（若手动配置则先通过数据链路层发往旁路由，旁路由再自行 ARP），然后把数据包直接转发给主机。
- 旁路由的子网划分和 PC 终端无异。
  - 对于自身发起的流量，其路由与 PC 终端完全一致。[^ref_3]
  - 对于下游来的数据包，**在没有代理干预的前提下**，也是检查目标 IP 执行相应的转发。

本次实验 FTTR 主猫仍然拨号连入 WAN，即：自身有`localhost`内网，并维护`192.168.1.0/24`子网。那么：
- **非子网也非回环网**的数据包自然发向 WAN，**主猫到 WAN 的网关就是 ISP 侧设备（下一跳点）的 IP**（万一是城际大内网呢）；
- **属于子网的数据包**通过路由表发回 LAN，此时对路由器来说**不存在相对外网**，也就**没有外网网关**。
:::



<style scoped>
.VPDoc {
  img {
    padding: 0% 20%;
  }
}
</style>
