<div align="center">

[English](README.md) | **简体中文**

# grok-product-i2v-plugin

**把一张商品图变成 Grok 图生视频提示词，商品保持原样不被重做。**

[canvas.best](https://canvas.best/)（Infinite Canvas）的远程节点插件。填 URL 即装，不用构建。默认只做本地模板编排，点了按钮才调 API。

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version 0.2.0](https://img.shields.io/badge/version-0.2.0-informational)](CHANGELOG.md)
[![宿主 canvas.best](https://img.shields.io/badge/%E5%AE%BF%E4%B8%BB-canvas.best-8A2BE2)](https://canvas.best/)
[![模型 Grok Imagine Video](https://img.shields.io/badge/%E6%A8%A1%E5%9E%8B-grok--imagine--video--1.5-orange)](https://docs.x.ai/developers/model-capabilities/video/image-to-video)
[![GitHub stars](https://img.shields.io/github/stars/Pannix/grok-product-i2v-plugin?style=social)](https://github.com/Pannix/grok-product-i2v-plugin/stargazers)

</div>

---

```text
商品图片节点 ──┐
               ├─> Grok 商品图生视频节点 ──> 正向提示词文本节点 / 视频生成节点
动作说明文本 ──┘
```

节点把商品首帧、你的目标、商品锁定规则、动作时间轴、镜头、声音、Grok 正向提示词和动态负面提示词整理成一张脚本卡。0.2.0 起默认**严格首帧模式**：禁止模型把原包装重构成纸盒、瓶子、罐子或其他形态。

## 为什么做这个

普通「文字 + 图片」的视频提示词会让模型*认出*商品，然后*重新设计*它。一包姜枣茶生成出来变成一个纸盒。这个插件做两件事：

1. 商品事实进入真正发给视频模型的提示词，不只是出现在可读的脚本正文里。
2. 附带原生 xAI 脚本，用 `image: { url: images[0] }` 传首帧。只有这样 Grok 才把它当源帧，而不是灵感参考。

| | 本插件 | 普通提示词节点 |
|---|---|---|
| 首帧能到模型 | 能，走 `generateVideo(..., { references })` | 要自己接线 |
| 商品锁定规则 | 默认严格，可编辑 | 无 |
| 改了参数后的旧提示词 | 自动作废 | 静默复用 |
| API 调用 | 点「AI 润色」或「生成视频」前一次都不调 | 视情况 |

## 安装

canvas.best 的第三方插件入口接受任何浏览器能 `fetch` 到的 HTTPS JavaScript URL。构建产物已提交在仓库根目录，直接用 jsDelivr 即可：

```text
https://cdn.jsdelivr.net/gh/Pannix/grok-product-i2v-plugin@b2e70ce/grok-product-i2v.js
```

固定 commit（如上）或 tag，避免 CDN 缓存让你装到旧版本。

1. 打开 [canvas.best](https://canvas.best/) →「节点插件」→「第三方」→ 粘贴 URL →「安装」。
2. 在节点创建菜单里找「Grok 商品图生视频」。

想在本机测试，用任意静态文件服务托管 `grok-product-i2v.js`（例如 `npx serve .`），填 `http://127.0.0.1:<端口>/grok-product-i2v.js`。插件代码在画布页面内直接执行、能读画布数据，只从你信任的地址安装。

## 使用步骤

1. 把商品首帧图片上传到画布。
2. 创建本节点，把商品图片节点连过来。
3. 在「视频目标 / 主动作」里写一个主动作，例如 `让瓶身高光从左向右扫过，镜头轻微推近，商品保持稳定`。
4. 时长设 5–6 秒、画幅设「保持首帧画幅」，点「生成模板脚本」。如果图片节点上游还有文本节点且目标为空，插件会读上游文本当目标。
5. 点「输出正向提示词」在右侧生成文本节点，或直接复制提示词 / 完整脚本。
6. 可选：「AI 润色」（画布需配置文本模型）和「生成视频（当前模型）」（需配置视频模型；会把上游商品图传给宿主并消耗你的模型额度）。

## 必须检查的一件事

插件能把首帧交给宿主，但**宿主最终用哪个请求字段由你的视频模型脚本决定**（模型配置 → 视频请求脚本）。严格首帧模式只在脚本用了 `images[0]` 时有效。

用 xAI 原生接口的话，点节点里的「复制原生 xAI 脚本」，粘贴到 `grok-imagine-video-1.5-preview` 的模型脚本里。请求必须包含：

```js
image: { url: images[0] }
```

只发 `{ model, prompt, seconds }` 会退化成文生视频。见 [xAI Image-to-Video 文档](https://docs.x.ai/developers/model-capabilities/video/image-to-video)。

## 边界

- 公开 SDK 的 `generateText` 没有图片参数，所以**「AI 润色」看不到像素**，它只按你填的商品事实润色，并遵守「首帧是唯一事实基准」的规则。
- 「生成视频（当前模型）」用的是画布当前配置的视频模型，不会自动就是 Grok。
- 节点的文本输出是正向提示词。接到普通视频配置节点时，把原商品图片节点也一起连上，首帧才不会丢。
- 照片里没有证据的背面、底部、内部结构不会被自行补写。

## 源码构建

仓库自带构建好的 `grok-product-i2v.js`。要改源码，把本目录复制到 [Infinite Canvas 仓库](https://github.com/basketikun/infinite-canvas) 的 `plugins/canvas/grok-product-i2v/` 下，让 `file:../sdk` 能解析，然后：

```powershell
npm install
npm run typecheck
npm run build
npm run smoke
```

## 更新记录

见 [CHANGELOG.md](CHANGELOG.md)。构建产物内联的第三方运行时代码说明见 [NOTICE.md](NOTICE.md)。

## 参考

- [canvas.best](https://canvas.best/) · [Infinite Canvas 文档](https://docs.canvas.best/) · [Infinite Canvas GitHub](https://github.com/basketikun/infinite-canvas)

本插件是针对公开插件 SDK 的测试实现；部署或二次分发时请同时遵守宿主项目的许可证、隐私和接口服务条款。

## 许可

[MIT](LICENSE) © 2026 [Pannix](https://github.com/Pannix)
