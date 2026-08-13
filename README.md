# canvas.best / Infinite Canvas：Grok 商品图生视频节点

这是一个可通过 URL 安装到 `canvas.best` 的远程节点插件。它不是 WorkBuddy Skill，也不连接 Codex。

节点工作流：

```text
商品图片节点 ──┐
               ├─> Grok 商品图生视频节点 ──> 正向提示词文本节点 / 视频生成节点
动作说明文本 ──┘
```

它会把商品首帧、用户目标、商品锁定规则、动作时间轴、镜头、声音、Grok 正向提示词和动态负面提示词整理成一张脚本卡。0.2.0 默认使用“严格首帧”模式：禁止把原包装重构成纸盒、瓶子、罐子或其他包装形态。插件默认只做本地模板编排，不调用 API；“AI 润色”和“生成视频（当前模型）”是用户主动点击后才执行的可选操作。

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
2. 创建本节点，把商品图片节点连到本节点。
3. 在「视频目标 / 主动作」里写一个主动作，例如：`让瓶身高光从左向右扫过，镜头轻微推近，商品保持稳定。`
4. 点击「生成模板脚本」。如果首帧图片节点上游还有文本节点，且本节点目标为空，插件会读取上游文本作为目标。
5. 点击「输出正向提示词」，会在右侧生成一个普通文本节点；也可以直接复制正向提示词或完整脚本。
6. 默认先把时长设为 5–6 秒、画幅设为「保持首帧画幅」，再点击「生成模板脚本」。如果画布已配置文本模型，可点「AI 润色」；如果已配置视频模型，可点「生成视频（当前模型）」。生成视频会把上游商品图传入宿主接口，并会消耗当前模型/API额度。

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

## 重要边界

- 当前公开 SDK 的 `generateText` 接口没有图片参数，因此「AI 润色」不会自动看懂图片像素；它只依据你填写的商品事实和“首帧图作为唯一商品事实基准”的规则润色。真正生成视频时，首帧图会通过 `generateVideo(..., { references })` 传给画布当前的视频接口；模型脚本仍必须把 `images[0]` 映射到供应商的图生视频图片字段。
- 「生成视频（当前模型）」调用的是 canvas.best 当前配置的视频模型，不会自动保证模型就是 Grok。若要实际调用 Grok，需要先在画布设置里配置与你们服务兼容的视频模型/接口，并在模型下拉框选择它。
- 本节点的文本输出资源是“正向提示词”。若你把它接到普通视频配置节点，建议同时把原商品图片节点也连接到视频配置节点，以确保首帧参考图不会丢失。
- 正向提示词、负面提示词和商品锁定规则采用可编辑字段；没有证据的背面、底部、内部结构不会被插件自行补写。

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
