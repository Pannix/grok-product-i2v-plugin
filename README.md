<div align="center">

**English** | [简体中文](README.zh-CN.md)

# grok-product-i2v-plugin

**Turn a product photo into a Grok image-to-video prompt that keeps the product exactly as shot.**

A remote node plugin for [canvas.best](https://canvas.best/) (Infinite Canvas). Install from a URL, no build step. Local template orchestration by default; API calls only when you click.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version 0.2.0](https://img.shields.io/badge/version-0.2.0-informational)](CHANGELOG.md)
[![Host: canvas.best](https://img.shields.io/badge/host-canvas.best-8A2BE2)](https://canvas.best/)
[![Model: Grok Imagine Video](https://img.shields.io/badge/model-grok--imagine--video--1.5-orange)](https://docs.x.ai/developers/model-capabilities/video/image-to-video)
[![GitHub stars](https://img.shields.io/github/stars/Pannix/grok-product-i2v-plugin?style=social)](https://github.com/Pannix/grok-product-i2v-plugin/stargazers)

</div>

---

```text
product image node ─┐
                    ├─> Grok Product I2V node ─> positive-prompt text node / video generation node
motion brief text ──┘
```

The node assembles one script card from: the product first frame, your goal, product-lock rules, a motion timeline, camera, sound, the Grok positive prompt and a dynamic negative prompt. Since 0.2.0 the default is **strict first-frame mode**: the model is forbidden from rebuilding your packaging into a box, bottle, can or any other form.

## Why this exists

Generic "text + image" video prompts let the model *recognise* the product and then *redesign* it. A tea sachet comes back as a carton. This plugin does two things about that:

1. Puts the product facts into the prompt actually sent to the video model, not just into the readable script.
2. Ships a native xAI script that passes the first frame as `image: { url: images[0] }`, which is the only way Grok treats it as a source frame rather than inspiration.

| | this plugin | plain prompt node |
|---|---|---|
| First frame reaches the model | yes, via `generateVideo(..., { references })` | only if you wire it yourself |
| Product-lock rules | strict by default, editable | none |
| Stale prompt after edits | auto-invalidated | reused silently |
| API calls | none until you click "AI polish" or "Generate video" | varies |

## Install

canvas.best installs third-party plugins from any HTTPS JavaScript URL the browser can `fetch`. The built file is committed at the repo root, so you can use it directly through jsDelivr:

```text
https://cdn.jsdelivr.net/gh/Pannix/grok-product-i2v-plugin@b2e70ce/grok-product-i2v.js
```

Pin a commit (as above) or a tag so CDN caching never serves you a stale build.

1. Open [canvas.best](https://canvas.best/) → **Node plugins** → **Third-party** → paste the URL → **Install**.
2. Find **Grok Product I2V** in the node creation menu.

To test from your own machine instead, serve `grok-product-i2v.js` with any static file server (for example `npx serve .`) and paste `http://127.0.0.1:<port>/grok-product-i2v.js`. Plugin code runs inside the canvas page and can read canvas data — only install from URLs you trust.

## Usage

1. Upload the product first frame to the canvas.
2. Create this node and connect the image node to it.
3. Write one main motion in **Goal / main motion**, e.g. `sweep a highlight across the bottle left to right, slight push-in, product stays still`.
4. Set duration to 5–6 s and ratio to **keep first-frame ratio**, then click **Generate template script**. If the image node has an upstream text node and your goal is empty, that text is used as the goal.
5. Click **Output positive prompt** to create a text node on the right, or copy the prompt / full script.
6. Optional: **AI polish** (needs a text model configured in the canvas) and **Generate video (current model)** (needs a video model; sends the upstream image to the host and spends your model quota).

## The one thing you must check

The plugin hands the first frame to the host, but **which request field the host uses is decided by your video model script** (Model config → video request script). Strict first-frame mode only works when that script uses `images[0]`.

For the native xAI endpoint click **Copy native xAI script** in the node and paste it into the model script for `grok-imagine-video-1.5-preview`. The request must contain:

```js
image: { url: images[0] }
```

Sending only `{ model, prompt, seconds }` degrades to text-to-video. See the [xAI Image-to-Video docs](https://docs.x.ai/developers/model-capabilities/video/image-to-video).

## Scope

- The public SDK's `generateText` has no image parameter, so **AI polish never sees pixels**; it only polishes the product facts you typed, under the rule that the first frame is the sole source of truth.
- **Generate video (current model)** uses whatever video model the canvas has configured. It is not automatically Grok.
- The node's text output is the positive prompt. If you connect it to a generic video config node, also connect the original image node so the first frame is not lost.
- Back, bottom and interior details with no evidence in the photo are never invented.

## Build from source

The repo ships the built `grok-product-i2v.js`. To change the source, copy this directory into `plugins/canvas/grok-product-i2v/` of the [Infinite Canvas repo](https://github.com/basketikun/infinite-canvas) so `file:../sdk` resolves, then:

```powershell
npm install
npm run typecheck
npm run build
npm run smoke
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md). Third-party runtime code inlined in the build is described in [NOTICE.md](NOTICE.md).

## References

- [canvas.best](https://canvas.best/) · [Infinite Canvas docs](https://docs.canvas.best/) · [Infinite Canvas on GitHub](https://github.com/basketikun/infinite-canvas)

This is a test implementation against the public plugin SDK. When deploying or redistributing, also follow the host project's licence, privacy and API terms.

## License

[MIT](LICENSE) © 2026 [Pannix](https://github.com/Pannix)
