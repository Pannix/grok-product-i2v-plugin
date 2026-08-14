# canvas.best / Infinite Canvas：Grok 商品图生视频节点

这是一个可通过 URL 安装到 `canvas.best` 的远程节点插件。它不是 WorkBuddy Skill，也不连接 Codex。

节点工作流：

```text
商品图 ──┐
人物图 ──┼─> Grok 商品图生视频节点 ──> 脚本与分镜首帧图 ──> Grok 逐镜头视频
风格图 ──┘                         └─> 质检清单
```

0.3.0 把流程扩展为“脚本规划 → 分镜图 → Grok 图生视频 → 质检”。第 1 张上游图片固定为商品图，第 2 张可作为人物身份参考，第 3 张可作为风格参考。分镜图先用图生图模型生成并落到画布，视频阶段再把每张分镜图作为 Grok image-to-video 的实际首帧，按镜头逐个生成。

插件不会把提示词效果说成绝对保证：Grok 仍可能改写包装文字、改变脸型或产生穿模，因此默认把镜头拆短、限制每镜头一个动作，并输出逐镜头质检清单。需要“像素级商品包装/人物身份”时，应使用真实商品层或具备 IP-Adapter / FaceID / ControlNet 的图像工作流先做合格静帧，再交给 Grok 动画。

## 0.5.0：总时长、竖版输出与自动合成

- 「总时长」支持 2–60 秒；「分镜数」改为可填写 1–20。
- 总时长是最终成片时长，不是每个分镜的时长。每个 Grok/渠道请求按最多 15 秒拆分，再在浏览器本地自动合成为一个视频。
- 例如：15 秒、2 个分镜会生成 8 秒 + 7 秒，最后输出一个约 15 秒的合成视频；如果要单段 15 秒，请把分镜数填为 1；60 秒、填写 2 个分镜时，系统会自动增加到至少 4 段。
- 9:16 会向渠道同时传递 `720x1280`、宽高和比例元数据；如果渠道仍返回横屏，插件会用 720×1280 合成画布重新录制成竖版结果。
- 合成结果通常是浏览器本地 `WebM` Blob URL。原始分镜视频会保留在画布上；如果浏览器不支持 `MediaRecorder`、渠道视频禁止跨域读取，插件会报出合成失败原因而不隐藏原始片段。声音会尽量通过浏览器音频轨合并，具体取决于渠道返回的视频是否带音轨。

## 在线 canvas.best 安装

canvas.best 的第三方插件入口需要一个可以被浏览器 `fetch` 到的 JavaScript URL，不能直接把本地 zip 路径粘贴进去。

1. 把 `dist/grok-product-i2v.js` 放到你们自己的 HTTPS 静态托管位置，例如公司的静态文件服务、GitHub Pages 或 Cloudflare Pages。
2. 打开 [canvas.best](https://canvas.best/)，进入「节点插件」→「第三方」→ 输入该 `.js` 文件的 HTTPS URL →「安装」。
3. 在节点创建菜单中找到「Grok 商品图生视频」。

### 先用本机临时托管测试

如果你只是想先试安装，不想先建 GitHub Pages：

```powershell
npm install
npm run build
npm run serve
```

然后在同一台电脑的 canvas.best 插件 URL 输入框里填：

```text
http://127.0.0.1:8787/grok-product-i2v.js
```

保持运行 `npm run serve` 的终端不要关闭。这个本机服务只托管插件 JS，不连接 Codex，也不会上传商品图；如果公司浏览器策略禁止网页访问 localhost，再改用 HTTPS 静态托管。

如果使用 GitHub Pages，最终 URL 形如：

```text
https://<你的账号>.github.io/<仓库名>/dist/grok-product-i2v.js
```

第一次测试建议固定一个 commit 或 release URL，避免 CDN 缓存让版本看起来没有更新。插件代码会在当前页面直接执行，并可能访问画布本地数据；只从你们信任的地址安装。

## 使用步骤

1. 把商品首帧图片上传到画布。
2. 创建本节点，把商品图片节点连到本节点。若需要锁定人物脸型，再按连接顺序把人物参考图接在第二张；第三张可选为风格图。
3. 在「视频目标 / 主动作」里写你想要的效果，例如：`25 岁亚洲女性拿起这包姜枣茶，面对镜头介绍，最后把包装正面展示清楚；动作自然，商品不变形。`
4. 选择时长、画幅、分镜数和「人物一致性」模式。要锁人物脸型，选择「人物锁定」并确保第二张上游图片确实是同一个人物；没有人物图时不要选择该模式。
5. 点击「一键生成脚本与分镜图」。插件会先调用文本模型规划镜头；文本模型不可用时会退回保守模板。随后每个镜头调用图生图模型，生成一张静态分镜首帧并放到画布右侧。
6. 逐张查看分镜图。商品包装、logo、文字、人物脸型或手与商品关系不对时，先修改目标/参考图后重新生成；不要直接把错误分镜送进视频。
7. 分镜确认后点击「一键生成视频（全部分镜）」。插件会按镜头逐个调用当前选中的视频模型，每张分镜图只作为对应镜头的首帧；生成结果会放在对应分镜图右侧。
8. 点击「输出质检清单」，逐镜头检查商品身份、人物脸型、手/商品接触、穿模、闪烁和文字。也可以使用「生成单镜头视频（原商品首帧）」只测试原始商品图的单镜头效果。

如果首帧图片节点上游还有文本节点，且本节点目标为空，插件会读取上游文本作为目标。生成图片和视频都会消耗画布当前配置的模型/API额度。

### 必须检查视频模型脚本

插件能够把首帧传给 canvas.best 宿主，但宿主最终使用哪个请求字段由「模型配置 → 视频请求脚本」决定。严格首帧模式只有在模型脚本使用 `images[0]` 时才有效。

如果你使用 xAI 原生接口，请点击节点里的「复制原生 xAI 脚本」，把脚本粘贴到 `grok-imagine-video-1.5-preview` 对应的视频模型脚本中。脚本的关键请求必须包含：

```js
image: { url: images[0] }
```

不能只发送：

```js
{ model, prompt, seconds }
```

后者会退化为文字生视频，模型可能知道“这是姜枣茶”，却自行重做成一个纸盒。xAI 官方 Image-to-Video 接口使用 `image` 字段作为源图起始帧：[官方文档](https://docs.x.ai/developers/model-capabilities/video/image-to-video)。

如果你的渠道是 `https://api.aicopy.top/v1` 这类 New API / 分发网关，请不要粘贴上面的原生 xAI 脚本。点击节点里的「复制 New API 分发脚本」，粘贴到该分发渠道对应的视频模型脚本中。这个脚本使用网关格式：

```text
POST /v1/video/generations
GET  /v1/video/generations/{task_id}
image: images[0]
```

画布模型配置里的 Base URL 保持为 `https://api.aicopy.top/v1`，模型名使用该分发渠道模型列表中显示的完整名称；不要把 `grok-imagine-video-1.5-fast`、`grok-imagine-video-1.5-preview` 等名称互相替换，除非它们确实出现在该渠道的模型列表中。New API 的公开视频接口文档见：[创建视频任务](https://docs.newapi.pro/zh/docs/api/ai-model/videos/createvideogeneration) 和 [查询视频任务](https://docs.newapi.pro/zh/docs/api/ai-model/videos/getvideogeneration)。

### 分镜图模型也要支持图生图

「一键生成脚本与分镜图」会把商品、人物和风格参考图传给画布的图像生成接口，因此当前选中的图像模型必须支持 image-to-image / image edit。若图像模型脚本只发送 `prompt` 而没有读取 `images`，分镜图也会退化为文字生图，商品包装可能被重画。

分镜阶段的参考图顺序由插件固定为：商品、人物（人物模式时）、风格。图像模型是否能理解多图语义仍取决于模型接口；提示词会重复写出角色分工，但不等于模型能力保证。

## 重要边界

- 当前公开 SDK 的 `generateText` 接口没有图片参数，因此脚本规划只读取用户目标和手填事实；真正的商品/人物参考图会在分镜图生成阶段传给图像模型。不要把文本模型的“看图分析”当成已发生的事实。
- 分镜图生成后，视频阶段只把对应分镜图作为 Grok image-to-video 的 `image` 首帧。这样比把商品图放进 `reference_images` 更适合锁定第 0 帧；xAI 官方说明 reference-to-video 会影响内容但不锁定首帧：[官方说明](https://docs.x.ai/developers/model-capabilities/video/reference-to-video)。
- 「一键生成视频（全部分镜）」调用的是 canvas.best 当前配置的视频模型，不会自动保证模型就是 Grok。若要实际调用 Grok，需要在画布设置里配置兼容 xAI 的视频模型/接口，并把原生脚本粘贴到对应模型配置。
- 分发网关能否真正调用 Grok，还取决于渠道是否为所选模型配置了可用的上游路由、余额和权限；插件只负责按网关协议传递首帧，不会把一个没有视频上游的模型变成可用模型。
- 商品包装文字、logo、人物脸型和穿模属于生成模型风险，不存在只靠提示词的 100% 保证。插件通过参考图分工、短镜头、单动作、首帧锁定和质检清单降低风险；失败镜头应单独重生成。
- 如果分镜图已经把商品包装或人物脸型画错，后续 Grok 只会把错误首帧动画化，不会自动把它修回真实商品；必须先重新生成/修正分镜图。
- 本节点仍保留「生成单镜头视频（原商品首帧）」作为最强商品身份测试。它适合没有人物或不需要复杂场景的镜头；要同时出现人物和商品，必须接受图生图首帧仍可能需要人工筛选。

## 研究借鉴

- [xAI Image-to-Video 官方文档](https://docs.x.ai/developers/model-capabilities/video/image-to-video)：源图是视频起始帧，因此插件把“先做合格静帧、再动画化”作为主路径。
- [xAI Reference-to-Video 官方文档](https://docs.x.ai/developers/model-capabilities/video/reference-to-video)：参考图能引导人物和商品，但不锁定首帧，所以不作为严格商品首帧的替代方案。
- [thoxakihiko/grok-imagine-prompt-1.5-guide](https://github.com/thoxakihiko/grok-imagine-prompt-1.5-guide)：借鉴“图片负责构图/光线/风格，提示词只描述变化”、动作前置和短镜头原则；这是社区实践，不是 xAI 硬保证。
- [livepeer/storyboard](https://github.com/livepeer/storyboard) 与 [cutagent](https://github.com/rishidandu/cutagent)：借鉴画布式分镜卡、逐镜头生成、最后一帧/参考图连续性和批量管线的产品结构。
- [Tencent IP-Adapter](https://github.com/tencent-ailab/IP-Adapter) 与 [Hugging Face Diffusers IP-Adapter 文档](https://github.com/huggingface/diffusers/blob/main/docs/source/en/using-diffusers/ip_adapter.md)：用于判断人物/商品身份一致性需要专门的参考图适配器，结构控制还要结合 ControlNet；这类能力不是 Grok 提示词本身提供的。

## 源码构建

压缩包已经包含可直接托管的 `dist/grok-product-i2v.js`。如果要改源码，把本目录复制到 [Infinite Canvas 源码](https://github.com/basketikun/infinite-canvas) 的 `plugins/canvas/grok-product-i2v/`，这样 `package.json` 中的 `file:../sdk` 会指向宿主仓库的 TypeScript SDK。

```powershell
npm install
npm run typecheck
npm run build
npm run smoke
```

构建产物仍是 `dist/grok-product-i2v.js`。

## 参考

- [canvas.best](https://canvas.best/)
- [Infinite Canvas 官方文档](https://docs.canvas.best/)
- [Infinite Canvas GitHub 仓库](https://github.com/basketikun/infinite-canvas)

本插件是针对公开插件 SDK 的测试实现；部署或二次分发时请同时遵守宿主项目的许可证、隐私和接口服务条款。

构建产物中的第三方运行时代码说明见 `NOTICE.md`。
