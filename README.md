# Grok 商品图生视频节点

这是一个用于 [canvas.best](https://canvas.best/) / Infinite Canvas 的远程节点插件：把商品首帧图片、动作目标和商品锁定规则整理为 Grok 图生视频脚本。

## 安装地址

在 canvas.best 打开「节点插件」→「第三方插件」，输入：

```text
https://raw.githubusercontent.com/Pannix/grok-product-i2v-plugin/main/grok-product-i2v.js
```

点击「安装」，再从节点创建菜单添加「Grok 商品图生视频」。

## 使用

1. 上传商品首帧图片。
2. 把商品图片节点连接到「Grok 商品图生视频」节点。
3. 填写视频目标，例如：`让瓶身高光从左向右扫过，镜头轻微推近，商品保持稳定。`
4. 点击「生成模板脚本」。
5. 点击「输出正向提示词」可生成右侧文本节点，也可以复制完整脚本。

节点输出包括：商品事实与锁定、允许变化、单一主动作时间轴、镜头运动、声音、Grok 正向提示词和动态负面提示词。

「AI 润色」和「生成视频（当前模型）」是显式按钮。前者使用 canvas.best 当前文本模型；后者使用当前配置的视频模型，并把上游商品图作为参考图。插件不会自动保证当前视频模型就是 Grok，需要在画布设置中选择你们实际配置的 Grok 兼容接口。

## 说明

- 模板生成不需要 API Key，也不连接 Codex 或 WorkBuddy。
- 当前公开插件 SDK 的文本生成接口没有图片输入，因此 AI 润色不会声称自己看到了图片像素；视频生成阶段才传入首帧参考图。
- 每台电脑/浏览器需要单独安装一次插件，但大家可以使用同一个 Raw URL。
- 插件代码会在当前网页中执行，请只安装你信任的地址。
- 源码位于 `src/index.tsx`；运行产物是根目录的 `grok-product-i2v.js`。

## 参考与许可

- 宿主项目：[Infinite Canvas](https://github.com/basketikun/infinite-canvas)
- 官方文档：[docs.canvas.best](https://docs.canvas.best/)
- SDK 运行时代码的许可说明见 [NOTICE.md](./NOTICE.md)。
