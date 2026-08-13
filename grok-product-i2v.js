// ../infinite-canvas-upstream/plugins/canvas/sdk/src/define-plugin.ts
function definePlugin(input) {
  return input;
}

// ../infinite-canvas-upstream/plugins/canvas/sdk/src/runtime.ts
function getRuntime() {
  const runtime = globalThis.InfiniteCanvasRuntime;
  if (!runtime) {
    throw new Error("[plugin-sdk] Infinite Canvas \u8FD0\u884C\u65F6\u672A\u5C31\u7EEA:\u8BF7\u5728\u753B\u5E03\u5BBF\u4E3B\u4E2D\u52A0\u8F7D\u672C\u63D2\u4EF6");
  }
  return runtime;
}
function getReact() {
  return getRuntime().React;
}
var useState = ((...args) => getReact().useState(...args));
var useMemo = ((...args) => getReact().useMemo(...args));

// ../infinite-canvas-upstream/plugins/canvas/sdk/src/jsx-runtime.ts
var Fragment = Symbol.for("infinite-canvas.jsx.fragment");
function createElement(type, props, key) {
  const react = getReact();
  const resolvedType = type === Fragment ? react.Fragment : type;
  const config = key === void 0 ? props : { ...props ?? {}, key };
  return react.createElement(resolvedType, config);
}
function jsx(type, props, key) {
  return createElement(type, props, key);
}
var jsxs = jsx;

// src/index.tsx
var PLUGIN_ID = "grok-product-i2v";
var DEFAULT_DURATION = "6";
var DEFAULT_RATIO = "\u4FDD\u6301\u9996\u5E27\u753B\u5E45";
var DEFAULT_LOCK_MODE = "strict";
var DEFAULT_SOUND = "\u8F7B\u5FAE\u771F\u5B9E\u73AF\u5883\u58F0\u6216\u6750\u8D28\u6469\u64E6\u58F0\uFF1B\u4E0D\u8981\u65C1\u767D\u3001\u4E0D\u8981\u53F0\u8BCD\u3001\u4E0D\u8981\u97F3\u4E50\u62A2\u4E3B\u4F53\u3002";
var XAI_NATIVE_VIDEO_SCRIPT = `// \u539F\u751F xAI Grok Image-to-Video\uFF1A\u5FC5\u987B\u628A\u9996\u5E27\u653E\u8FDB image \u5B57\u6BB5
const source = images[0];
if (!source) throw new Error("\u8BF7\u5148\u8FDE\u63A5\u5546\u54C1\u9996\u5E27\u56FE\u7247");

const rootWithSlash = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
const root = rootWithSlash.endsWith("/v1") ? rootWithSlash.slice(0, -3) : rootWithSlash;
const headers = { "Content-Type": "application/json", Authorization: "Bearer " + apiKey };
const aspectRatio = params.size === "720x1280"
  ? "9:16"
  : params.size === "1280x720"
    ? "16:9"
    : params.size === "1024x1024"
      ? "1:1"
      : undefined;
const resolution = params.resolution
  ? (/^[0-9]+$/.test(params.resolution) ? params.resolution + "p" : params.resolution)
  : undefined;

const task = await request({
  method: "post",
  url: root + "/v1/videos/generations",
  headers,
  data: {
    model,
    prompt,
    image: { url: source },
    duration: Number(params.seconds),
    ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
    ...(resolution ? { resolution } : {}),
  },
});

const requestId = task.request_id || task.id;
if (!requestId) throw new Error("xAI \u89C6\u9891\u63A5\u53E3\u6CA1\u6709\u8FD4\u56DE request_id");

return await poll(
  () => request({
    method: "get",
    url: root + "/v1/videos/" + requestId,
    headers: { Authorization: "Bearer " + apiKey },
  }),
  (state) => {
    if (state.status === "done") {
      const url = state.video?.url || state.video_url || state.url;
      if (!url) throw new Error("xAI \u89C6\u9891\u4EFB\u52A1\u5B8C\u6210\u4F46\u6CA1\u6709\u8FD4\u56DE\u89C6\u9891\u5730\u5740");
      return { url };
    }
    if (state.status === "failed" || state.status === "expired" || state.status === "cancelled") {
      throw new Error(state.error?.message || "xAI \u89C6\u9891\u4EFB\u52A1 " + state.status);
    }
    return null;
  },
  { intervalMs: 5000, timeoutMs: 600000 },
);`;
var AI_SYSTEM = `\u4F60\u662F\u5546\u54C1\u56FE\u751F\u89C6\u9891\u63D0\u793A\u8BCD\u7F16\u5BFC\u3002\u4F60\u53EA\u80FD\u4F9D\u636E\u7528\u6237\u63D0\u4F9B\u7684\u4E8B\u5B9E\u548C\u201C\u9996\u5E27\u5546\u54C1\u56FE\u4F5C\u4E3A\u552F\u4E00\u5546\u54C1\u4E8B\u5B9E\u57FA\u51C6\u201D\u6765\u5199\u63D0\u793A\u8BCD\uFF0C\u4E0D\u8981\u81C6\u6D4B\u54C1\u724C\u3001\u578B\u53F7\u3001\u6750\u8D28\u3001\u80CC\u9762\u3001\u5E95\u90E8\u3001\u5185\u90E8\u7ED3\u6784\u6216\u4E0D\u53EF\u89C1\u6587\u5B57\u3002

\u5FC5\u987B\u9075\u5B88\uFF1A
1. \u5546\u54C1\u8EAB\u4EFD\u3001\u8F6E\u5ED3\u3001\u6BD4\u4F8B\u3001\u989C\u8272\u3001\u6750\u8D28\u3001\u5305\u88C5\u3001\u914D\u4EF6\u3001\u53EF\u89C1\u6587\u5B57\u548C\u753B\u9762\u5E03\u5C40\u4F18\u5148\u4FDD\u6301\u4E0D\u53D8\u3002
2. \u6BCF\u6761\u89C6\u9891\u53EA\u5B89\u6392\u4E00\u4E2A\u4E3B\u52A8\u4F5C\uFF0C\u52A8\u4F5C\u5728\u524D\u534A\u6BB5\u53D1\u751F\uFF0C\u540E\u534A\u6BB5\u7A33\u5B9A\u6536\u5C3E\u3002
3. \u660E\u786E\u5199\u51FA\u65F6\u95F4\u8F74\u3001\u955C\u5934\u8FD0\u52A8\u3001\u8FDE\u7EED\u6027\u7EA6\u675F\u3001\u58F0\u97F3\u548C\u540E\u671F\u9650\u5236\u3002
4. \u4E0D\u8981\u65B0\u589E\u624B\u3001\u4EBA\u7269\u3001\u9053\u5177\u3001\u5B57\u5E55\u3001\u6C34\u5370\u3001\u54C1\u724C\u6216\u88C5\u9970\uFF0C\u4E0D\u8981\u8BA9\u5546\u54C1\u53D8\u5F62\u3001\u6F02\u6D6E\u3001\u91CD\u590D\u3001\u95EA\u70C1\u6216\u6539\u6B3E\u3002
5. \u5982\u679C\u8F93\u5165\u4E8B\u5B9E\u4E0D\u8DB3\uFF0C\u4F7F\u7528\u201C\u4EE5\u9996\u5E27\u53EF\u89C1\u5185\u5BB9\u4E3A\u51C6\u201D\u7684\u7EA6\u675F\uFF0C\u4E0D\u8981\u8865\u5199\u4E0D\u5B58\u5728\u7684\u5546\u54C1\u7EC6\u8282\u3002

\u8BF7\u53EA\u8FD4\u56DE\u4E25\u683C JSON\uFF0C\u4E0D\u8981 Markdown \u4EE3\u7801\u56F4\u680F\uFF1A
{"positivePrompt":"\u53EF\u76F4\u63A5\u7ED9 Grok \u56FE\u751F\u89C6\u9891\u6A21\u578B\u7684\u6B63\u5411\u63D0\u793A\u8BCD","negativePrompt":"\u9017\u53F7\u5206\u9694\u7684\u52A8\u6001\u8D1F\u9762\u63D0\u793A\u8BCD","scriptMarkdown":"\u5B8C\u6574\u4E2D\u6587\u811A\u672C\uFF0C\u5305\u542B\u76EE\u6807\u3001\u8BBE\u7F6E\u3001\u9996\u5E27/\u5546\u54C1\u9501\u5B9A\u3001\u65F6\u95F4\u8F74\u3001\u955C\u5934\u3001\u58F0\u97F3\u3001\u6B63\u5411\u63D0\u793A\u8BCD\u548C\u52A8\u6001\u8D1F\u9762\u63D0\u793A\u8BCD"}`;
function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
function metadataText(metadata, key, fallback = "") {
  return asString(metadata?.[key], fallback);
}
function readDraft(ctx) {
  const metadata = ctx.node.metadata;
  const upstreamBrief = ctx.getUpstream().filter((node) => node.type === "text" || node.type === "markdown:doc").map((node) => asString(node.metadata?.content).trim()).filter(Boolean).join("\n");
  return {
    brief: metadataText(metadata, "brief", upstreamBrief),
    productFacts: metadataText(metadata, "productFacts"),
    mustKeep: metadataText(metadata, "mustKeep"),
    allowedChange: metadataText(metadata, "allowedChange"),
    forbidden: metadataText(metadata, "forbidden"),
    sound: metadataText(metadata, "sound", DEFAULT_SOUND),
    duration: normalizeDuration(metadataText(metadata, "duration", DEFAULT_DURATION)),
    ratio: metadataText(metadata, "ratio", DEFAULT_RATIO),
    lockMode: metadataText(metadata, "lockMode", DEFAULT_LOCK_MODE),
    textModel: metadataText(metadata, "textModel"),
    videoModel: metadataText(metadata, "videoModel")
  };
}
function isImageNode(node) {
  const mimeType = asString(node.metadata?.mimeType);
  const content = asString(node.metadata?.content);
  return node.type === "image" || mimeType.startsWith("image/") || content.startsWith("data:image/");
}
function findFirstImage(ctx) {
  return ctx.getUpstream().find((node) => isImageNode(node) && Boolean(asString(node.metadata?.content))) || null;
}
function normalizeDuration(value) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return DEFAULT_DURATION;
  return String(Math.min(15, Math.max(2, Math.round(parsed))));
}
function ratioInstruction(ratio) {
  if (ratio === "9:16 \u7AD6\u7248") return "\u8F93\u51FA 9:16 \u7AD6\u7248\u6784\u56FE\uFF0C\u4E3B\u4F53\u5B8C\u6574\u4E0D\u88C1\u5207\uFF0C\u5546\u54C1\u5E95\u90E8\u7559\u5B89\u5168\u8FB9\u8DDD\u3002";
  if (ratio === "16:9 \u6A2A\u7248") return "\u8F93\u51FA 16:9 \u6A2A\u7248\u6784\u56FE\uFF0C\u4FDD\u6301\u5546\u54C1\u4E3B\u4F53\u5B8C\u6574\u5E76\u7559\u51FA\u547C\u5438\u7A7A\u95F4\u3002";
  if (ratio === "1:1 \u65B9\u5F62") return "\u8F93\u51FA 1:1 \u65B9\u5F62\u6784\u56FE\uFF0C\u4E3B\u4F53\u5C45\u4E2D\u4E14\u4E0D\u88AB\u88C1\u5207\u3002";
  return "\u4FDD\u6301\u9996\u5E27\u5546\u54C1\u56FE\u7684\u753B\u5E45\u3001\u6784\u56FE\u548C\u4E3B\u4F53\u4F4D\u7F6E\uFF0C\u4E0D\u64C5\u81EA\u6539\u6BD4\u4F8B\u3002";
}
function generationSize(ratio) {
  if (ratio === "9:16 \u7AD6\u7248") return "720x1280";
  if (ratio === "16:9 \u6A2A\u7248") return "1280x720";
  if (ratio === "1:1 \u65B9\u5F62") return "1024x1024";
  return void 0;
}
function videoNodeSize(ratio) {
  if (ratio === "9:16 \u7AD6\u7248") return { width: 360, height: 640 };
  if (ratio === "1:1 \u65B9\u5F62") return { width: 420, height: 420 };
  return { width: 420, height: 236 };
}
function primaryAction(brief) {
  const normalized = brief.replace(/\s+/g, " ").trim();
  if (!normalized) return "\u4FDD\u6301\u5546\u54C1\u4E3B\u4F53\u7A33\u5B9A\uFF0C\u8BA9\u4E00\u675F\u67D4\u548C\u9AD8\u5149\u4ECE\u5DE6\u5411\u53F3\u626B\u8FC7\u5546\u54C1\u8868\u9762\uFF0C\u5C55\u793A\u6750\u8D28\u4E0E\u8F6E\u5ED3\u3002";
  const firstSentence = normalized.split(/[。！？!?；;\n]/)[0].trim();
  const firstClause = firstSentence.split(/(?:并且|同时|然后|再加上|以及)/)[0].trim();
  return firstClause || firstSentence || normalized;
}
function cameraInstruction(brief) {
  const text = brief.toLowerCase();
  if (/推近|推进|靠近|push.?in|zoom.?in/.test(text)) return "\u955C\u5934\u505A\u7F13\u6162\u3001\u8FDE\u7EED\u3001\u53EF\u63A7\u7684\u63A8\u8FD1\uFF0C\u5E45\u5EA6\u7EA6 3%\u20135%\uFF0C\u7126\u70B9\u59CB\u7EC8\u9501\u5B9A\u5546\u54C1\u4E3B\u4F53\u3002";
  if (/拉远|后退|pull.?back|zoom.?out/.test(text)) return "\u955C\u5934\u505A\u7F13\u6162\u3001\u8FDE\u7EED\u3001\u53EF\u63A7\u7684\u62C9\u8FDC\uFF0C\u4FDD\u6301\u5546\u54C1\u4E3B\u4F53\u5B8C\u6574\u548C\u753B\u9762\u7A33\u5B9A\u3002";
  if (/环绕|绕拍|arc|orbit/.test(text)) return "\u955C\u5934\u53EA\u505A\u5C0F\u5E45\u3001\u5E73\u6ED1\u7684\u5F27\u7EBF\u73AF\u7ED5\uFF0C\u4E0D\u8D8A\u8FC7\u9996\u5E27\u672A\u5C55\u793A\u7684\u80CC\u9762\uFF0C\u4E0D\u6539\u53D8\u5546\u54C1\u7ED3\u6784\u3002";
  if (/摇镜|横移|pan|track/.test(text)) return "\u955C\u5934\u505A\u8F7B\u5FAE\u3001\u5E73\u6ED1\u7684\u6A2A\u5411\u79FB\u52A8\uFF0C\u5546\u54C1\u4E3B\u4F53\u4FDD\u6301\u5728\u5B89\u5168\u6784\u56FE\u5185\uFF0C\u4E0D\u7A81\u7136\u53D8\u7126\u3002";
  return "\u955C\u5934\u4FDD\u6301\u7A33\u5B9A\uFF0C\u5E76\u505A\u6781\u8F7B\u5FAE\u7684 2% \u63A8\u8FD1\uFF1B\u4E0D\u8DF3\u5207\u3001\u4E0D\u7A81\u7136\u53D8\u7126\u3001\u4E0D\u6539\u53D8\u9996\u5E27\u6784\u56FE\u5173\u7CFB\u3002";
}
function splitLines(value) {
  return value.split(/[\n,，;；]/).map((item) => item.trim()).filter(Boolean);
}
function promptFingerprint(draft) {
  return [draft.brief, draft.productFacts, draft.mustKeep, draft.allowedChange, draft.forbidden, draft.sound, draft.duration, draft.ratio, draft.lockMode].join("\u241F");
}
function buildNegativePrompt(draft) {
  const base = [
    "\u5546\u54C1\u8EAB\u4EFD\u6F02\u79FB",
    "\u6539\u6B3E\u3001\u6362\u8272\u3001\u6362\u6750\u8D28\u3001\u6539\u53D8\u8F6E\u5ED3\u6216\u6BD4\u4F8B",
    "logo\u3001\u54C1\u724C\u540D\u3001\u5305\u88C5\u6587\u5B57\u3001\u6807\u7B7E\u6587\u5B57\u53D8\u5F62\u6216\u4E71\u7801",
    "\u628A\u539F\u5305\u88C5\u6539\u6210\u7EB8\u76D2\u3001\u74F6\u5B50\u3001\u7F50\u5B50\u3001\u793C\u76D2\u6216\u5176\u4ED6\u5305\u88C5\u5F62\u6001",
    "\u91CD\u65B0\u8BBE\u8BA1\u5305\u88C5\u6B63\u9762\u7248\u5F0F\u3001logo\u3001\u63D2\u753B\u6216\u6587\u5B57\u5C42\u7EA7",
    "\u65B0\u589E\u4EBA\u7269\u3001\u624B\u3001\u9053\u5177\u3001\u914D\u4EF6\u3001\u88C5\u9970\u6216\u7B2C\u4E8C\u4E2A\u5546\u54C1",
    "\u5546\u54C1\u878D\u5316\u3001\u62C9\u4F38\u3001\u6298\u53E0\u3001\u65AD\u88C2\u3001\u91CD\u590D\u3001\u6F02\u6D6E\u3001\u7A7F\u6A21",
    "\u8FB9\u7F18\u6296\u52A8\u3001\u5C40\u90E8\u95EA\u70C1\u3001\u7EB9\u7406\u722C\u52A8\u3001\u7EC6\u8282\u8DF3\u53D8",
    "\u955C\u5934\u7A81\u7136\u8DF3\u52A8\u3001\u5FEB\u901F\u53D8\u7126\u3001\u8DF3\u5207\u3001\u8FC7\u5EA6\u8FD0\u52A8\u6A21\u7CCA",
    "\u80CC\u666F\u7ED3\u6784\u53D8\u5316\u3001\u900F\u89C6\u7A81\u53D8\u3001\u66DD\u5149\u5FFD\u660E\u5FFD\u6697\u3001\u8272\u5F69\u6F02\u79FB",
    "\u672A\u7ECF\u9996\u5E27\u8BC1\u636E\u652F\u6301\u7684\u80CC\u9762\u3001\u5E95\u90E8\u3001\u5185\u90E8\u7ED3\u6784\u6216\u65B0\u89C6\u89D2",
    "\u5B57\u5E55\u3001\u8D34\u7EB8\u3001\u6C34\u5370\u3001UI\u3001\u65C1\u767D\u5B57\u5E55\u3001\u97F3\u4E50\u6B4C\u8BCD"
  ];
  return [...base, ...splitLines(draft.forbidden)].join("\uFF0C");
}
function buildPromptResult(draft, sourceLabel, hasImage) {
  const action = primaryAction(draft.brief);
  const camera = cameraInstruction(draft.brief);
  const negativePrompt = buildNegativePrompt(draft);
  const imageStatus = hasImage ? `\u5DF2\u63A5\u5165\u4E0A\u6E38\u5546\u54C1\u56FE\u300C${sourceLabel || "\u5546\u54C1\u9996\u5E27"}\u300D` : "\u5C1A\u672A\u63A5\u5165\u4E0A\u6E38\u5546\u54C1\u56FE";
  const productFacts = draft.productFacts || "\u672A\u63D0\u4F9B\u989D\u5916\u5546\u54C1\u4E8B\u5B9E\uFF1B\u53EA\u4F9D\u636E\u9996\u5E27\u56FE\u7247\u4E2D\u5B9E\u9645\u53EF\u89C1\u5185\u5BB9\u3002";
  const mustKeep = draft.mustKeep || "\u9996\u5E27\u4E2D\u53EF\u89C1\u7684\u5546\u54C1\u8EAB\u4EFD\u3001\u8F6E\u5ED3\u3001\u6BD4\u4F8B\u3001\u989C\u8272\u3001\u6750\u8D28\u3001\u5305\u88C5\u3001\u914D\u4EF6\u3001\u6587\u5B57\u3001\u5149\u5F71\u5173\u7CFB\u548C\u4E3B\u4F53\u4F4D\u7F6E\u3002";
  const allowedChange = draft.allowedChange || "\u53EA\u5141\u8BB8\u7528\u6237\u76EE\u6807\u4E2D\u7684\u4E3B\u52A8\u4F5C\u3001\u8F7B\u5FAE\u955C\u5934\u8FD0\u52A8\u3001\u81EA\u7136\u5149\u5F71\u53D8\u5316\u548C\u4E0E\u52A8\u4F5C\u4E00\u81F4\u7684\u7EC6\u5C0F\u73AF\u5883\u53D8\u5316\u3002";
  const strictFrame = draft.lockMode !== "creative";
  const positivePrompt = [
    strictFrame ? "\u4E25\u683C\u9996\u5E27\u56FE\u751F\u89C6\u9891\u6A21\u5F0F\uFF1A\u9644\u52A0\u9996\u5E27\u56FE\u7247\u662F\u5546\u54C1\u8EAB\u4EFD\u548C\u6240\u6709\u53EF\u89C1\u7EC6\u8282\u7684\u552F\u4E00\u4E8B\u5B9E\u57FA\u51C6\uFF1B\u5B83\u5FC5\u987B\u4F5C\u4E3A\u5B9E\u9645 image-to-video \u8D77\u59CB\u5E27\u4F7F\u7528\uFF0C\u89C6\u9891\u7B2C 0 \u5E27\u5E94\u4E0E\u9644\u52A0\u56FE\u7247\u4E00\u81F4\uFF1B\u4E0D\u8981\u628A\u56FE\u7247\u5F53\u6210\u4EC5\u4F9B\u7075\u611F\u7684\u53C2\u8003\u56FE\uFF0C\u4E5F\u4E0D\u8981\u8FDB\u884C\u6587\u5B57\u751F\u56FE\u6216\u91CD\u65B0\u8BBE\u8BA1\u5305\u88C5\u3002" : "\u751F\u6210\u4E00\u6761\u57FA\u4E8E\u9644\u52A0\u5546\u54C1\u56FE\u7247\u7684\u56FE\u751F\u89C6\u9891\uFF1B\u9644\u52A0\u56FE\u7247\u662F\u5546\u54C1\u8EAB\u4EFD\u548C\u6240\u6709\u53EF\u89C1\u7EC6\u8282\u7684\u4E3B\u8981\u4E8B\u5B9E\u57FA\u51C6\uFF0C\u4F46\u5141\u8BB8\u6709\u9650\u7684\u521B\u610F\u91CD\u6784\u3002",
    `\u89C6\u9891\u65F6\u957F\u7EA6 ${draft.duration} \u79D2\u3002${ratioInstruction(draft.ratio)}`,
    "\u4ECE\u9996\u5E27\u753B\u9762\u5F00\u59CB\uFF0C\u524D 0.0\u20131.0 \u79D2\u4FDD\u6301\u6784\u56FE\u7A33\u5B9A\uFF0C\u8BA9\u5546\u54C1\u8FB9\u7F18\u3001logo\u3001\u5305\u88C5\u6587\u5B57\u548C\u6750\u8D28\u7EB9\u7406\u6E05\u6670\u53EF\u8FA8\u3002",
    `0.0\u2013${Math.max(1, Number(draft.duration) * 0.18).toFixed(1)} \u79D2\uFF1A\u7A33\u5B9A\u9996\u5E27\uFF0C\u4E0D\u65B0\u589E\u52A8\u4F5C\u3002`,
    `1.0\u2013${Math.max(1.2, Number(draft.duration) * 0.78).toFixed(1)} \u79D2\uFF1A\u53EA\u6267\u884C\u4E00\u4E2A\u4E3B\u52A8\u4F5C\u2014\u2014${action}\u3002\u52A8\u4F5C\u6162\u3001\u8FDE\u7EED\u3001\u514B\u5236\uFF0C\u5546\u54C1\u4E3B\u4F53\u4E0D\u6539\u6B3E\u3002`,
    `${Math.max(1.2, Number(draft.duration) * 0.78).toFixed(1)}\u2013${draft.duration} \u79D2\uFF1A\u52A8\u4F5C\u81EA\u7136\u6536\u5C3E\uFF0C\u56DE\u5230\u7A33\u5B9A\u5C55\u793A\u72B6\u6001\uFF0C\u4E0D\u5F15\u5165\u7B2C\u4E8C\u4E2A\u52A8\u4F5C\u3002`,
    camera,
    `\u5546\u54C1\u4E8B\u5B9E\uFF1A${productFacts}`,
    `\u5546\u54C1\u9501\u5B9A\uFF1A${mustKeep}`,
    `\u5141\u8BB8\u53D8\u5316\uFF1A${allowedChange}`,
    "\u4E0D\u8981\u6839\u636E\u60F3\u8C61\u8865\u5168\u9996\u5E27\u672A\u5C55\u793A\u7684\u80CC\u9762\u3001\u5E95\u90E8\u3001\u5185\u90E8\u7ED3\u6784\u6216\u65B0\u89C6\u89D2\uFF1B\u770B\u4E0D\u5230\u7684\u90E8\u5206\u4FDD\u6301\u4E0D\u53EF\u89C1\u6216\u4FDD\u6301\u539F\u6784\u56FE\u3002",
    `\u58F0\u97F3\uFF1A${draft.sound || DEFAULT_SOUND}`,
    "\u6574\u4F53\u8981\u6C42\uFF1A\u5546\u4E1A\u5546\u54C1\u5C55\u793A\u8D28\u611F\uFF0C\u8FD0\u52A8\u7A33\u5B9A\uFF0C\u5149\u5F71\u8FDE\u7EED\uFF0C\u80CC\u666F\u5E72\u51C0\uFF0C\u4FDD\u6301\u9996\u5E27\u5546\u54C1\u7684\u771F\u5B9E\u6BD4\u4F8B\u4E0E\u89C6\u89C9\u8EAB\u4EFD\u3002"
  ].join("\n");
  const content = [
    "# Grok \u5546\u54C1\u56FE\u751F\u89C6\u9891\u811A\u672C",
    "",
    `- \u9996\u5E27\u72B6\u6001\uFF1A${imageStatus}`,
    `- \u76EE\u6807\uFF1A${draft.brief || "\u7A33\u5B9A\u5C55\u793A\u5546\u54C1\u6750\u8D28\u4E0E\u8F6E\u5ED3"}`,
    `- \u65F6\u957F\uFF1A${draft.duration} \u79D2\uFF5C\u753B\u5E45\uFF1A${draft.ratio}`,
    `- \u9501\u5B9A\u6A21\u5F0F\uFF1A${strictFrame ? "\u4E25\u683C\u9996\u5E27\uFF08\u8981\u6C42\u6A21\u578B\u63A5\u53E3\u4F7F\u7528 image-to-video \u7684 image \u5B57\u6BB5\uFF09" : "\u521B\u610F\u53C2\u8003\uFF08\u53EF\u80FD\u91CD\u6784\u5305\u88C5\uFF09"}`,
    "",
    "## 1. \u5546\u54C1\u4E8B\u5B9E\u4E0E\u9501\u5B9A",
    `- \u5546\u54C1\u4E8B\u5B9E\uFF1A${productFacts}`,
    `- \u5FC5\u987B\u4FDD\u7559\uFF1A${mustKeep}`,
    `- \u5141\u8BB8\u53D8\u5316\uFF1A${allowedChange}`,
    "- \u8BC1\u636E\u8FB9\u754C\uFF1A\u4E0D\u8865\u5199\u9996\u5E27\u6CA1\u6709\u5C55\u793A\u7684\u80CC\u9762\u3001\u5E95\u90E8\u3001\u5185\u90E8\u7ED3\u6784\u6216\u4E0D\u53EF\u8BFB\u6587\u5B57\u3002",
    "",
    "## 2. \u52A8\u4F5C\u4E0E\u955C\u5934\u65F6\u95F4\u8F74",
    `- 0.0\u20131.0 \u79D2\uFF1A\u7A33\u5B9A\u9996\u5E27\uFF0C\u5546\u54C1\u4E3B\u4F53\u548C\u6784\u56FE\u4E0D\u53D8\u3002`,
    `- 1.0\u2013${Math.max(1.2, Number(draft.duration) * 0.78).toFixed(1)} \u79D2\uFF1A\u552F\u4E00\u4E3B\u52A8\u4F5C\u2014\u2014${action}\u3002`,
    `- ${Math.max(1.2, Number(draft.duration) * 0.78).toFixed(1)}\u2013${draft.duration} \u79D2\uFF1A\u52A8\u4F5C\u6536\u5C3E\u5E76\u7A33\u5B9A\u5C55\u793A\u3002`,
    `- \u955C\u5934\uFF1A${camera}`,
    `- \u58F0\u97F3\uFF1A${draft.sound || DEFAULT_SOUND}`,
    "",
    "## 3. Grok \u6B63\u5411\u63D0\u793A\u8BCD",
    "```text",
    positivePrompt,
    "```",
    "",
    "## 4. \u52A8\u6001\u8D1F\u9762\u63D0\u793A\u8BCD",
    "```text",
    negativePrompt,
    "```",
    "",
    hasImage ? "\u672C\u8282\u70B9\u4F1A\u628A\u4E0A\u6E38\u5546\u54C1\u56FE\u4F20\u5165\u89C6\u9891\u751F\u6210\u8C03\u7528\uFF1B\u4E25\u683C\u9996\u5E27\u6A21\u5F0F\u8FD8\u8981\u6C42\u6240\u9009\u6A21\u578B\u811A\u672C\u628A images[0] \u6620\u5C04\u5230\u4F9B\u5E94\u5546\u7684 image-to-video \u5B57\u6BB5\u3002\u901A\u7528\u53EA\u53D1\u9001 prompt \u7684\u89C6\u9891\u811A\u672C\u4F1A\u5FFD\u7565\u56FE\u7247\u3002" : "\u8BF7\u5148\u628A\u5546\u54C1\u56FE\u7247\u8282\u70B9\u8FDE\u5230\u672C\u8282\u70B9\uFF0C\u518D\u8FDB\u884C\u56FE\u751F\u89C6\u9891\uFF1B\u5F53\u524D\u6CA1\u6709\u9996\u5E27\u65F6\u53EA\u5EFA\u8BAE\u68C0\u67E5\u811A\u672C\uFF0C\u4E0D\u5EFA\u8BAE\u76F4\u63A5\u751F\u6210\u3002"
  ].join("\n");
  return { content, positivePrompt, negativePrompt };
}
function buildAiPrompt(draft, fallback, sourceLabel, hasImage) {
  return [
    "\u8BF7\u6839\u636E\u4EE5\u4E0B\u8F93\u5165\u751F\u6210\u4E00\u4EFD\u5546\u54C1\u56FE\u751F\u89C6\u9891\u63D0\u793A\u8BCD\u3002\u5F53\u524D\u8282\u70B9\u4E0D\u4F1A\u628A\u56FE\u7247\u50CF\u7D20\u53D1\u9001\u7ED9\u6587\u672C\u6A21\u578B\uFF0C\u56E0\u6B64\u4E0D\u5F97\u58F0\u79F0\u770B\u5230\u4E86\u56FE\u7247\u7EC6\u8282\uFF1B\u53EA\u628A\u4E0A\u6E38\u9996\u5E27\u56FE\u4F5C\u4E3A\u89C6\u9891\u6A21\u578B\u7684\u53C2\u8003\u56FE\uFF0C\u5E76\u628A\u7528\u6237\u660E\u786E\u63D0\u4F9B\u7684\u4E8B\u5B9E\u5199\u5165\u5546\u54C1\u9501\u5B9A\u3002",
    `\u9996\u5E27\u72B6\u6001\uFF1A${hasImage ? `\u5DF2\u63A5\u5165\u300C${sourceLabel || "\u5546\u54C1\u9996\u5E27"}\u300D` : "\u672A\u63A5\u5165"}`,
    `\u7528\u6237\u76EE\u6807\uFF1A${draft.brief || "\u7A33\u5B9A\u5C55\u793A\u5546\u54C1\u6750\u8D28\u4E0E\u8F6E\u5ED3"}`,
    `\u5546\u54C1\u4E8B\u5B9E\uFF1A${draft.productFacts || "\u65E0\u989D\u5916\u4E8B\u5B9E\uFF0C\u53EA\u4F9D\u636E\u9996\u5E27\u53EF\u89C1\u5185\u5BB9"}`,
    `\u5FC5\u987B\u4FDD\u7559\uFF1A${draft.mustKeep || "\u9996\u5E27\u53EF\u89C1\u5546\u54C1\u8EAB\u4EFD\u4E0E\u7ED3\u6784"}`,
    `\u5141\u8BB8\u53D8\u5316\uFF1A${draft.allowedChange || "\u5355\u4E00\u4E3B\u52A8\u4F5C\u3001\u8F7B\u5FAE\u955C\u5934\u548C\u81EA\u7136\u5149\u5F71"}`,
    `\u7981\u6B62\u5185\u5BB9\uFF1A${draft.forbidden || "\u65B0\u589E\u4EBA\u7269\u3001\u624B\u3001\u9053\u5177\u3001\u6587\u5B57\u3001\u6539\u6B3E\u548C\u7ED3\u6784\u6F02\u79FB"}`,
    `\u58F0\u97F3\uFF1A${draft.sound || DEFAULT_SOUND}`,
    `\u65F6\u957F\uFF1A${draft.duration} \u79D2\uFF1B\u753B\u5E45\uFF1A${draft.ratio}`,
    `\u9996\u5E27\u6A21\u5F0F\uFF1A${draft.lockMode === "creative" ? "\u521B\u610F\u53C2\u8003" : "\u4E25\u683C\u9996\u5E27 image-to-video"}`,
    "",
    "\u4E0B\u9762\u662F\u6A21\u677F\u57FA\u7EBF\u3002\u8BF7\u5728\u4E0D\u5F15\u5165\u672A\u8BC1\u5B9E\u5546\u54C1\u4E8B\u5B9E\u7684\u524D\u63D0\u4E0B\u6DA6\u8272\u5B83\uFF1A",
    fallback.content
  ].join("\n");
}
function parseAiResponse(text, fallback) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      const positivePrompt = asString(parsed.positivePrompt).trim();
      const negativePrompt = asString(parsed.negativePrompt).trim();
      const scriptMarkdown = asString(parsed.scriptMarkdown).trim();
      if (positivePrompt && negativePrompt && scriptMarkdown) return { positivePrompt, negativePrompt, content: scriptMarkdown };
    } catch {
    }
  }
  return fallback;
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
async function copyText(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
function GrokProductI2VContent({ ctx }) {
  const [busy, setBusy] = useState(null);
  const draft = readDraft(ctx);
  const sourceImage = findFirstImage(ctx);
  const sourceLabel = sourceImage?.title || "\u5546\u54C1\u9996\u5E27";
  const output = metadataText(ctx.node.metadata, "content");
  const positivePrompt = metadataText(ctx.node.metadata, "positivePrompt");
  const error = metadataText(ctx.node.metadata, "errorDetails");
  const copyStatus = metadataText(ctx.node.metadata, "copyStatus");
  const textModels = useMemo(() => ctx.ai.listModels("text"), [ctx.ai]);
  const videoModels = useMemo(() => ctx.ai.listModels("video"), [ctx.ai]);
  const promptFields = /* @__PURE__ */ new Set(["brief", "productFacts", "mustKeep", "allowedChange", "forbidden", "sound", "duration", "ratio", "lockMode"]);
  const setField = (key, value) => ctx.updateMetadata({ [key]: value, ...promptFields.has(key) ? { content: "", positivePrompt: "", negativePrompt: "", promptFingerprint: "" } : {} });
  const stopCanvas = (event) => event.stopPropagation();
  const fallback = () => buildPromptResult(draft, sourceLabel, Boolean(sourceImage));
  const currentPromptResult = () => {
    const storedFingerprint = metadataText(ctx.node.metadata, "promptFingerprint");
    if (positivePrompt && storedFingerprint && storedFingerprint === promptFingerprint(draft)) {
      return { positivePrompt, negativePrompt: metadataText(ctx.node.metadata, "negativePrompt") };
    }
    return fallback();
  };
  const currentPromptContent = () => {
    const storedFingerprint = metadataText(ctx.node.metadata, "promptFingerprint");
    return output && storedFingerprint && storedFingerprint === promptFingerprint(draft) ? output : fallback().content;
  };
  const saveTemplate = () => {
    const result = fallback();
    ctx.updateMetadata({ content: result.content, positivePrompt: result.positivePrompt, negativePrompt: result.negativePrompt, promptFingerprint: promptFingerprint(draft), status: "success", errorDetails: "", copyStatus: "" });
  };
  const polishWithAi = async () => {
    const base = fallback();
    setBusy("text");
    ctx.updateMetadata({ status: "loading", errorDetails: "" });
    try {
      const response = await ctx.ai.generateText(buildAiPrompt(draft, base, sourceLabel, Boolean(sourceImage)), { system: AI_SYSTEM, model: draft.textModel || void 0 });
      const result = parseAiResponse(response.text, base);
      ctx.updateMetadata({ content: result.content, positivePrompt: result.positivePrompt, negativePrompt: result.negativePrompt, promptFingerprint: promptFingerprint(draft), status: "success", errorDetails: "" });
    } catch (error2) {
      ctx.updateMetadata({ status: "error", errorDetails: errorMessage(error2) });
    } finally {
      setBusy(null);
    }
  };
  const createTextOutput = () => {
    const result = currentPromptResult();
    const id = `${PLUGIN_ID}-text-${Date.now()}`;
    ctx.applyOps([
      {
        type: "add_node",
        id,
        nodeType: "text",
        title: "Grok \u6B63\u5411\u63D0\u793A\u8BCD",
        x: ctx.node.position.x + ctx.node.width + 80,
        y: ctx.node.position.y,
        width: 520,
        height: 360,
        metadata: { content: result.positivePrompt, status: "success", fontSize: 14 }
      },
      { type: "connect_nodes", fromNodeId: ctx.node.id, toNodeId: id }
    ]);
  };
  const generateVideo = async () => {
    if (!sourceImage) {
      ctx.updateMetadata({ status: "error", errorDetails: "\u8BF7\u5148\u628A\u5546\u54C1\u56FE\u7247\u8282\u70B9\u8FDE\u63A5\u5230\u672C\u8282\u70B9\u3002" });
      return;
    }
    const result = currentPromptResult();
    setBusy("video");
    ctx.updateMetadata({ status: "loading", errorDetails: "" });
    try {
      const prompt = `${result.positivePrompt}

\u52A8\u6001\u8D1F\u9762\u63D0\u793A\u8BCD\uFF1A${result.negativePrompt}`;
      const video = await ctx.ai.generateVideo(prompt, {
        references: [asString(sourceImage.metadata?.content)],
        seconds: draft.duration,
        size: generationSize(draft.ratio),
        model: draft.videoModel || void 0
      });
      const size = videoNodeSize(draft.ratio);
      const id = `${PLUGIN_ID}-video-${Date.now()}`;
      ctx.applyOps([
        {
          type: "add_node",
          id,
          nodeType: "video",
          title: "Grok \u56FE\u751F\u89C6\u9891\u7ED3\u679C",
          x: ctx.node.position.x + ctx.node.width + 80,
          y: ctx.node.position.y + 30,
          width: size.width,
          height: size.height,
          metadata: { content: video.url, status: "success", mimeType: video.mimeType, naturalWidth: video.width, naturalHeight: video.height, durationMs: video.durationMs }
        },
        { type: "connect_nodes", fromNodeId: ctx.node.id, toNodeId: id }
      ]);
      ctx.updateMetadata({ status: "success", errorDetails: "" });
    } catch (error2) {
      ctx.updateMetadata({ status: "error", errorDetails: errorMessage(error2) });
    } finally {
      setBusy(null);
    }
  };
  const copy = async (value) => {
    const ok = await copyText(value);
    ctx.updateMetadata({ copyStatus: ok ? "\u5DF2\u590D\u5236" : "\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9\u6587\u672C\u590D\u5236" });
    window.setTimeout(() => ctx.updateMetadata({ copyStatus: "" }), 1800);
  };
  const copyNativeXaiScript = () => void copy(XAI_NATIVE_VIDEO_SCRIPT);
  const buttonStyle = { border: `1px solid ${ctx.theme.node.stroke}`, borderRadius: 8, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, padding: "6px 9px", cursor: "pointer", fontSize: 12 };
  const primaryButtonStyle = { ...buttonStyle, border: "1px solid #7c3aed", background: "#7c3aed", color: "#fff" };
  const inputStyle = { width: "100%", boxSizing: "border-box", border: `1px solid ${ctx.theme.node.stroke}`, borderRadius: 7, background: ctx.theme.node.panel, color: ctx.theme.node.text, padding: "7px 8px", fontSize: 12, outline: "none" };
  const labelStyle = { color: ctx.theme.node.muted, fontSize: 11, marginBottom: 3, display: "block" };
  return /* @__PURE__ */ jsxs("div", { "data-canvas-no-zoom": true, onWheel: stopCanvas, style: { height: "100%", width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 8, padding: 12, color: ctx.theme.node.text, overflow: "hidden" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: 14 }, children: "Grok \u5546\u54C1\u56FE\u751F\u89C6\u9891" }),
      /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: sourceImage ? "#16a34a" : "#d97706" }, children: sourceImage ? "\u9996\u5E27\u5DF2\u63A5\u5165" : "\u7B49\u5F85\u5546\u54C1\u56FE" })
    ] }),
    sourceImage ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", padding: 6, borderRadius: 8, background: ctx.theme.toolbar.panel }, children: [
      /* @__PURE__ */ jsx("img", { src: asString(sourceImage.metadata?.content), alt: sourceLabel, style: { width: 52, height: 42, borderRadius: 5, objectFit: "contain", background: "#fff" } }),
      /* @__PURE__ */ jsxs("div", { style: { minWidth: 0, fontSize: 11, color: ctx.theme.node.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
        "\u53C2\u8003\u9996\u5E27\uFF1A",
        sourceLabel
      ] })
    ] }) : /* @__PURE__ */ jsx("div", { style: { padding: 8, borderRadius: 8, background: "#f59e0b14", color: ctx.theme.node.muted, fontSize: 11, lineHeight: 1.45 }, children: "\u628A\u753B\u5E03\u91CC\u7684\u5546\u54C1\u56FE\u7247\u8282\u70B9\u8FDE\u63A5\u5230\u672C\u8282\u70B9\u3002\u811A\u672C\u6A21\u677F\u4ECD\u53EF\u5148\u751F\u6210\uFF0C\u4F46\u76F4\u63A5\u751F\u6210\u89C6\u9891\u9700\u8981\u9996\u5E27\u3002" }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("label", { style: labelStyle, children: "\u89C6\u9891\u76EE\u6807 / \u4E3B\u52A8\u4F5C" }),
      /* @__PURE__ */ jsx("textarea", { value: draft.brief, placeholder: "\u4F8B\u5982\uFF1A\u8BA9\u74F6\u8EAB\u9AD8\u5149\u4ECE\u5DE6\u5411\u53F3\u626B\u8FC7\uFF0C\u955C\u5934\u8F7B\u5FAE\u63A8\u8FD1\uFF0C\u5546\u54C1\u4FDD\u6301\u7A33\u5B9A\u3002", onChange: (event) => setField("brief", event.target.value), onMouseDown: stopCanvas, onWheel: stopCanvas, style: { ...inputStyle, minHeight: 54, resize: "vertical", lineHeight: 1.4 } })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }, children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { style: labelStyle, children: "\u65F6\u957F" }),
        /* @__PURE__ */ jsx("select", { value: draft.duration, onChange: (event) => setField("duration", event.target.value), onMouseDown: stopCanvas, style: inputStyle, children: ["4", "5", "6", "8", "10", "12", "15"].map((value) => /* @__PURE__ */ jsxs("option", { value, children: [
          value,
          " \u79D2"
        ] }, value)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { style: labelStyle, children: "\u753B\u5E45" }),
        /* @__PURE__ */ jsx("select", { value: draft.ratio, onChange: (event) => setField("ratio", event.target.value), onMouseDown: stopCanvas, style: inputStyle, children: ["\u4FDD\u6301\u9996\u5E27\u753B\u5E45", "9:16 \u7AD6\u7248", "16:9 \u6A2A\u7248", "1:1 \u65B9\u5F62"].map((value) => /* @__PURE__ */ jsx("option", { value, children: value }, value)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("details", { open: true, onMouseDown: stopCanvas, children: [
      /* @__PURE__ */ jsx("summary", { style: { cursor: "pointer", color: ctx.theme.node.muted, fontSize: 11 }, children: "\u5546\u54C1\u9501\u5B9A\u4E0E\u58F0\u97F3\uFF08\u4E25\u683C\u9996\u5E27\u6A21\u5F0F\uFF09" }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6, paddingTop: 7 }, children: [
        /* @__PURE__ */ jsxs("select", { value: draft.lockMode, onChange: (event) => setField("lockMode", event.target.value), onMouseDown: stopCanvas, style: inputStyle, "aria-label": "\u5546\u54C1\u9501\u5B9A\u6A21\u5F0F", children: [
          /* @__PURE__ */ jsx("option", { value: "strict", children: "\u4E25\u683C\u9996\u5E27\uFF1A\u4E0D\u6539\u5305\u88C5\uFF08\u63A8\u8350\uFF09" }),
          /* @__PURE__ */ jsx("option", { value: "creative", children: "\u521B\u610F\u53C2\u8003\uFF1A\u5141\u8BB8\u6709\u9650\u91CD\u6784" })
        ] }),
        /* @__PURE__ */ jsx("input", { value: draft.productFacts, placeholder: "\u5546\u54C1\u4E8B\u5B9E\uFF1A\u540D\u79F0\u3001\u6750\u8D28\u3001\u989C\u8272\u3001\u5305\u88C5\u7B49\uFF08\u53EA\u586B\u786E\u5B9A\u4E8B\u5B9E\uFF09", onChange: (event) => setField("productFacts", event.target.value), onMouseDown: stopCanvas, style: inputStyle }),
        /* @__PURE__ */ jsx("input", { value: draft.mustKeep, placeholder: "\u5FC5\u987B\u4FDD\u7559\uFF1A\u8F6E\u5ED3\u3001logo\u3001\u6587\u5B57\u3001\u914D\u4EF6\u2026\u2026", onChange: (event) => setField("mustKeep", event.target.value), onMouseDown: stopCanvas, style: inputStyle }),
        /* @__PURE__ */ jsx("input", { value: draft.allowedChange, placeholder: "\u5141\u8BB8\u53D8\u5316\uFF1A\u9AD8\u5149\u3001\u8F7B\u5FAE\u955C\u5934\u3001\u84B8\u6C7D\u3001\u6DB2\u4F53\u7B49", onChange: (event) => setField("allowedChange", event.target.value), onMouseDown: stopCanvas, style: inputStyle }),
        /* @__PURE__ */ jsx("input", { value: draft.forbidden, placeholder: "\u989D\u5916\u7981\u6B62\uFF1A\u4EBA\u7269\u3001\u624B\u3001\u9053\u5177\u3001\u67D0\u79CD\u53D8\u5F62\u2026\u2026", onChange: (event) => setField("forbidden", event.target.value), onMouseDown: stopCanvas, style: inputStyle }),
        /* @__PURE__ */ jsx("input", { value: draft.sound, placeholder: DEFAULT_SOUND, onChange: (event) => setField("sound", event.target.value), onMouseDown: stopCanvas, style: inputStyle }),
        /* @__PURE__ */ jsx("div", { style: { color: ctx.theme.node.muted, fontSize: 10, lineHeight: 1.4 }, children: "\u4E25\u683C\u9996\u5E27\u53EA\u5728\u89C6\u9891\u6A21\u578B\u811A\u672C\u771F\u6B63\u4F7F\u7528 image-to-video \u56FE\u7247\u5B57\u6BB5\u65F6\u751F\u6548\uFF1B\u901A\u7528\u53EA\u53D1\u9001 prompt \u7684\u89C6\u9891\u811A\u672C\u4F1A\u5FFD\u7565\u4E0A\u6E38\u56FE\u7247\u3002" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: [
      /* @__PURE__ */ jsx("button", { type: "button", onMouseDown: stopCanvas, onClick: saveTemplate, style: primaryButtonStyle, disabled: busy !== null, children: "\u751F\u6210\u6A21\u677F\u811A\u672C" }),
      /* @__PURE__ */ jsx("button", { type: "button", onMouseDown: stopCanvas, onClick: () => void polishWithAi(), style: buttonStyle, disabled: busy !== null, children: busy === "text" ? "AI\u6DA6\u8272\u4E2D\u2026" : "AI\u6DA6\u8272" }),
      /* @__PURE__ */ jsx("button", { type: "button", onMouseDown: stopCanvas, onClick: createTextOutput, style: buttonStyle, disabled: busy !== null, children: "\u8F93\u51FA\u6B63\u5411\u63D0\u793A\u8BCD" }),
      /* @__PURE__ */ jsx("button", { type: "button", onMouseDown: stopCanvas, onClick: copyNativeXaiScript, style: buttonStyle, disabled: busy !== null, children: "\u590D\u5236\u539F\u751F xAI \u811A\u672C" }),
      /* @__PURE__ */ jsx("button", { type: "button", onMouseDown: stopCanvas, onClick: () => void generateVideo(), style: buttonStyle, disabled: busy !== null || !sourceImage, children: busy === "video" ? "\u751F\u6210\u89C6\u9891\u4E2D\u2026" : "\u751F\u6210\u89C6\u9891\uFF08\u5F53\u524D\u6A21\u578B\uFF09" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }, children: [
      /* @__PURE__ */ jsxs("select", { value: draft.textModel, onChange: (event) => setField("textModel", event.target.value), onMouseDown: stopCanvas, style: inputStyle, "aria-label": "\u6587\u672C\u6A21\u578B", children: [
        /* @__PURE__ */ jsx("option", { value: "", children: "\u6587\u672C\u6A21\u578B\uFF1A\u5F53\u524D\u9ED8\u8BA4" }),
        textModels.map((model) => /* @__PURE__ */ jsx("option", { value: model.value, children: model.label }, model.value))
      ] }),
      /* @__PURE__ */ jsxs("select", { value: draft.videoModel, onChange: (event) => setField("videoModel", event.target.value), onMouseDown: stopCanvas, style: inputStyle, "aria-label": "\u89C6\u9891\u6A21\u578B", children: [
        /* @__PURE__ */ jsx("option", { value: "", children: "\u89C6\u9891\u6A21\u578B\uFF1A\u5F53\u524D\u9ED8\u8BA4" }),
        videoModels.map((model) => /* @__PURE__ */ jsx("option", { value: model.value, children: model.label }, model.value))
      ] })
    ] }),
    error ? /* @__PURE__ */ jsx("div", { style: { color: "#dc2626", fontSize: 11, lineHeight: 1.4 }, children: error }) : null,
    copyStatus ? /* @__PURE__ */ jsx("div", { style: { color: "#16a34a", fontSize: 11 }, children: copyStatus }) : null,
    /* @__PURE__ */ jsxs("div", { style: { minHeight: 0, flex: 1, display: "flex", flexDirection: "column", gap: 6 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }, children: [
        /* @__PURE__ */ jsx("span", { style: { color: ctx.theme.node.muted, fontSize: 11 }, children: "\u811A\u672C\u9884\u89C8\uFF08\u8F93\u51FA\u8D44\u6E90\u4E3A\u6B63\u5411\u63D0\u793A\u8BCD\uFF09" }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 5 }, children: [
          /* @__PURE__ */ jsx("button", { type: "button", onMouseDown: stopCanvas, onClick: () => void copy(currentPromptResult().positivePrompt), style: { ...buttonStyle, padding: "3px 7px", fontSize: 11 }, children: "\u590D\u5236\u6B63\u5411" }),
          /* @__PURE__ */ jsx("button", { type: "button", onMouseDown: stopCanvas, onClick: () => void copy(currentPromptContent()), style: { ...buttonStyle, padding: "3px 7px", fontSize: 11 }, children: "\u590D\u5236\u5B8C\u6574" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("pre", { onWheel: stopCanvas, style: { minHeight: 0, flex: 1, overflow: "auto", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", borderRadius: 8, padding: 9, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, fontSize: 10, lineHeight: 1.45, fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace" }, children: currentPromptContent() })
    ] })
  ] });
}
var index_default = definePlugin({
  id: PLUGIN_ID,
  name: "Grok \u5546\u54C1\u56FE\u751F\u89C6\u9891",
  version: "0.2.0",
  description: "\u628A\u5546\u54C1\u9996\u5E27\u3001\u52A8\u4F5C\u76EE\u6807\u548C\u5546\u54C1\u9501\u5B9A\u89C4\u5219\u6574\u7406\u6210\u4E25\u683C\u9996\u5E27 Grok \u56FE\u751F\u89C6\u9891\u811A\u672C\uFF0C\u5E76\u63D0\u4F9B\u539F\u751F xAI \u6A21\u578B\u811A\u672C\u3002",
  nodes: [
    {
      type: `${PLUGIN_ID}:prompt`,
      title: "Grok \u5546\u54C1\u56FE\u751F\u89C6\u9891",
      icon: "\u{1F3AC}",
      description: "\u5546\u54C1\u9996\u5E27 \u2192 \u5546\u54C1\u9501\u5B9A \u2192 \u52A8\u4F5C\u65F6\u95F4\u8F74 \u2192 Grok \u6B63\u8D1F\u63D0\u793A\u8BCD",
      defaultSize: { width: 520, height: 720 },
      defaultMetadata: { brief: "", productFacts: "", mustKeep: "", allowedChange: "", forbidden: "", sound: DEFAULT_SOUND, duration: DEFAULT_DURATION, ratio: DEFAULT_RATIO, lockMode: DEFAULT_LOCK_MODE, content: "", positivePrompt: "", negativePrompt: "", promptFingerprint: "", status: "idle" },
      minimapColor: "#7c3aed",
      hidePanel: true,
      resource: (node) => ({ kind: "text", text: asString(node.metadata?.positivePrompt) || asString(node.metadata?.content) }),
      Content: GrokProductI2VContent
    }
  ]
});
export {
  XAI_NATIVE_VIDEO_SCRIPT,
  buildNegativePrompt,
  buildPromptResult,
  index_default as default,
  normalizeDuration,
  promptFingerprint
};
