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
var DEFAULT_DURATION = "15";
var MAX_TOTAL_DURATION = 60;
var MAX_SCENE_SECONDS = 15;
var MIN_SCENE_SECONDS = 2;
var DEFAULT_RATIO = "9:16 \u7AD6\u7248";
var DEFAULT_LOCK_MODE = "strict";
var DEFAULT_SOUND = "\u8F7B\u5FAE\u771F\u5B9E\u73AF\u5883\u58F0\u6216\u6750\u8D28\u6469\u64E6\u58F0\uFF1B\u4E0D\u8981\u65C1\u767D\u3001\u4E0D\u8981\u53F0\u8BCD\u3001\u4E0D\u8981\u97F3\u4E50\u62A2\u4E3B\u4F53\u3002";
var DEFAULT_SCENE_COUNT = "3";
var MAX_SCENE_COUNT = 20;
var DEFAULT_CHARACTER_MODE = "product-only";
var MAX_REFERENCE_IMAGES_PER_GROUP = 3;
var DEFAULT_PRODUCT_REF_COUNT = "1";
var DEFAULT_CONTENT_REF_COUNT = "0";
var DEFAULT_PERSON_REF_COUNT = "0";
var DEFAULT_STYLE_REF_COUNT = "0";
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
var NEW_API_VIDEO_SCRIPT = `// New API / \u5206\u53D1\u7F51\u5173\u7248 Grok Image-to-Video\uFF1A\u4F7F\u7528 image \u5B57\u7B26\u4E32\u4F20\u5165\u9996\u5E27
const source = images[0];
if (!source) throw new Error("\u8BF7\u5148\u8FDE\u63A5\u5546\u54C1\u9996\u5E27\u56FE\u7247");

const trimmedBaseUrl = baseUrl.replace(/\\/+$/, "");
const apiRoot = trimmedBaseUrl.endsWith("/v1") ? trimmedBaseUrl : trimmedBaseUrl + "/v1";
const headers = { "Content-Type": "application/json", Authorization: "Bearer " + apiKey };
const sizeMatch = typeof params.size === "string" ? params.size.match(/^(\\d+)x(\\d+)$/) : null;
const width = sizeMatch ? Number(sizeMatch[1]) : undefined;
const height = sizeMatch ? Number(sizeMatch[2]) : undefined;
const size = typeof params.size === "string" ? params.size : undefined;
const aspectRatio = size === "720x1280"
  ? "9:16"
  : size === "1280x720"
    ? "16:9"
    : size === "1024x1024"
      ? "1:1"
      : (typeof params.ratio === "string" && params.ratio.includes(":") ? params.ratio : undefined);
const resolution = typeof params.resolution === "string" ? params.resolution : undefined;

const task = await request({
  method: "post",
  url: apiRoot + "/video/generations",
  headers,
  data: {
    model,
    prompt,
    image: source,
    duration: Number(params.seconds),
    ...(Number.isFinite(width) ? { width } : {}),
    ...(Number.isFinite(height) ? { height } : {}),
    ...(size ? { size } : {}),
    ...(aspectRatio ? { aspect_ratio: aspectRatio, aspectRatio, ratio: aspectRatio } : {}),
    ...(resolution ? { resolution } : {}),
    metadata: {
      ...(size ? { size } : {}),
      ...(aspectRatio ? { aspect_ratio: aspectRatio, aspectRatio, ratio: aspectRatio } : {}),
      ...(resolution ? { resolution } : {}),
    },
  },
});

const taskId = task.task_id || task.id || task.data?.task_id || task.data?.id;
if (!taskId) throw new Error("\u5206\u53D1\u89C6\u9891\u63A5\u53E3\u6CA1\u6709\u8FD4\u56DE task_id");

return await poll(
  () => request({
    method: "get",
    url: apiRoot + "/video/generations/" + taskId,
    headers: { Authorization: "Bearer " + apiKey },
  }),
  (state) => {
    const status = String(state.status || state.data?.status || state.data?.data?.status || "").toLowerCase();
    if (["completed", "complete", "done", "success", "succeeded"].includes(status)) {
      const firstUrl = (...values) => values.find((value) => typeof value === "string" && value.trim())?.trim();
      const urlValue = firstUrl(
        state.url,
        state.video_url,
        state.result_url,
        state.content_url,
        state.content,
        state.video?.url,
        state.content?.video_url,
        state.content?.url,
        state.metadata?.url,
        state.metadata?.result_url,
        state.metadata?.result_urls?.[0],
        state.data?.url,
        state.data?.video_url,
        state.data?.result_url,
        state.data?.content_url,
        state.data?.content,
        state.data?.content?.video_url,
        state.data?.content?.url,
        state.data?.data?.url,
        state.data?.data?.video_url,
        state.data?.data?.result_url,
        state.data?.data?.content?.video_url,
        state.data?.data?.content?.url,
      );
      if (!urlValue) {
        const topLevelKeys = state && typeof state === "object" ? Object.keys(state).join(", ") : "";
        const dataKeys = state?.data && typeof state.data === "object" ? Object.keys(state.data).join(", ") : "";
        throw new Error("\u5206\u53D1\u89C6\u9891\u4EFB\u52A1\u5B8C\u6210\u4F46\u6CA1\u6709\u8FD4\u56DE\u89C6\u9891\u5730\u5740\uFF1B\u8FD4\u56DE\u5B57\u6BB5\uFF1A" + topLevelKeys + (dataKeys ? "\uFF1Bdata \u5B57\u6BB5\uFF1A" + dataKeys : ""));
      }
      let url = urlValue;
      try { url = new URL(urlValue, apiRoot).toString(); } catch {}
      return { url };
    }
    if (["failed", "error", "expired", "cancelled", "canceled"].includes(status)) {
      throw new Error(state.error?.message || state.data?.error?.message || state.message || "\u5206\u53D1\u89C6\u9891\u4EFB\u52A1 " + status);
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
var STORYBOARD_SYSTEM = `\u4F60\u662F\u5546\u54C1\u5E7F\u544A\u7684\u5206\u955C\u7F16\u5BFC\u3002\u8BF7\u628A\u7528\u6237\u7684\u5546\u54C1\u5C55\u793A\u76EE\u6807\u62C6\u6210 2 \u5230 4 \u4E2A\u77ED\u955C\u5934\uFF0C\u6BCF\u4E2A\u955C\u5934\u53EA\u627F\u62C5\u4E00\u4E2A\u4E3B\u8981\u4EFB\u52A1\u3002

\u89C4\u5219\uFF1A
1. \u5546\u54C1\u53C2\u8003\u56FE\u662F\u5546\u54C1\u8EAB\u4EFD\u3001\u5305\u88C5\u3001\u8F6E\u5ED3\u3001\u989C\u8272\u3001\u6BD4\u4F8B\u3001logo\u3001\u53EF\u89C1\u6587\u5B57\u548C\u6750\u8D28\u7684\u552F\u4E00\u4E8B\u5B9E\u57FA\u51C6\uFF1B\u4E0D\u5F97\u521B\u9020\u6216\u6539\u5199\u5546\u54C1\u4E8B\u5B9E\u3002
2. \u5982\u679C\u542F\u7528\u4EBA\u7269\u9501\u5B9A\uFF0C\u4EBA\u7269\u53C2\u8003\u56FE\u53EA\u7528\u4E8E\u4FDD\u6301\u540C\u4E00\u4EBA\u7684\u8138\u578B\u3001\u4E94\u5B98\u6BD4\u4F8B\u3001\u53D1\u578B\u548C\u5916\u89C2\uFF0C\u4E0D\u8981\u51ED\u7A7A\u6539\u53D8\u4EBA\u7269\u8EAB\u4EFD\uFF1B\u4EBA\u7269\u53C2\u8003\u56FE\u7F3A\u5931\u65F6\uFF0C\u4E0D\u8981\u58F0\u79F0\u8138\u578B\u5DF2\u9501\u5B9A\u3002
3. \u6BCF\u4E2A\u955C\u5934\u5FC5\u987B\u7ED9\u51FA\u53EF\u751F\u6210\u7684\u9759\u6001\u5206\u955C\u9996\u5E27\u63D0\u793A\u8BCD\uFF0C\u4EE5\u53CA\u53EA\u63CF\u8FF0\u540E\u7EED\u53D8\u5316\u7684 Grok \u56FE\u751F\u89C6\u9891\u52A8\u4F5C\u63D0\u793A\u8BCD\u3002\u9759\u6001\u56FE\u8D1F\u8D23\u6784\u56FE\u3001\u5149\u7EBF\u548C\u8EAB\u4EFD\uFF0C\u89C6\u9891\u63D0\u793A\u8BCD\u53EA\u8D1F\u8D23\u52A8\u4F5C\u3001\u955C\u5934\u53D8\u5316\u548C\u58F0\u97F3\u3002
4. \u6BCF\u4E2A\u955C\u5934\u53EA\u5B89\u6392\u4E00\u4E2A\u4E3B\u52A8\u4F5C\uFF0C\u5C3D\u91CF\u4F7F\u7528 2 \u5230 6 \u79D2\u7684\u77ED\u955C\u5934\uFF1B\u660E\u786E\u624B\u3001\u4EBA\u7269\u3001\u5546\u54C1\u7684\u63A5\u89E6\u5173\u7CFB\uFF0C\u907F\u514D\u906E\u6321\u3001\u7A7F\u6A21\u548C\u4E0D\u53EF\u80FD\u7684\u7269\u7406\u5173\u7CFB\u3002
5. \u4E0D\u8981\u8865\u5199\u9996\u5E27\u6CA1\u6709\u5C55\u793A\u7684\u5546\u54C1\u80CC\u9762\u3001\u5E95\u90E8\u3001\u5185\u90E8\u7ED3\u6784\u6216\u4E0D\u53EF\u8BFB\u6587\u5B57\uFF1B\u4E0D\u8981\u751F\u6210\u5B57\u5E55\u3001\u6C34\u5370\u3001\u7B2C\u4E8C\u4E2A\u5546\u54C1\u6216\u65B0\u7684\u5305\u88C5\u7248\u5F0F\u3002

\u53EA\u8FD4\u56DE\u4E25\u683C JSON\uFF0C\u4E0D\u8981 Markdown \u4EE3\u7801\u56F4\u680F\uFF1A
{"title":"\u77ED\u7247\u6807\u9898","summary":"\u6574\u4F53\u53D9\u4E8B","productLock":"\u5546\u54C1\u9501\u5B9A\u89C4\u5219","characterLock":"\u4EBA\u7269\u9501\u5B9A\u89C4\u5219","continuity":"\u955C\u5934\u95F4\u8FDE\u7EED\u6027\u89C4\u5219","scenes":[{"id":"s1","title":"\u955C\u5934\u6807\u9898","purpose":"\u955C\u5934\u4EFB\u52A1","duration":"4","framePrompt":"\u5206\u955C\u9759\u5E27\u63D0\u793A\u8BCD","videoPrompt":"\u53EA\u63CF\u8FF0\u4ECE\u8BE5\u9759\u5E27\u5F00\u59CB\u53D1\u751F\u7684\u52A8\u4F5C\u3001\u955C\u5934\u548C\u58F0\u97F3","negativePrompt":"\u9488\u5BF9\u672C\u955C\u5934\u7684\u52A8\u6001\u8D1F\u9762\u63D0\u793A\u8BCD"}]}`;
function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
function metadataText(metadata, key, fallback = "") {
  return asString(metadata?.[key], fallback);
}
function readDraft(ctx) {
  const metadata = ctx.node.metadata;
  const referenceCountsConfigured = ["productRefCount", "contentRefCount", "personRefCount", "styleRefCount"].some((key) => metadata?.[key] !== void 0);
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
    imageModel: metadataText(metadata, "imageModel"),
    videoModel: metadataText(metadata, "videoModel"),
    sceneCount: normalizeSceneCount(metadataText(metadata, "sceneCount", DEFAULT_SCENE_COUNT)),
    characterMode: metadataText(metadata, "characterMode", DEFAULT_CHARACTER_MODE),
    productRefCount: normalizeReferenceCount(metadataText(metadata, "productRefCount", DEFAULT_PRODUCT_REF_COUNT), DEFAULT_PRODUCT_REF_COUNT),
    contentRefCount: normalizeReferenceCount(metadataText(metadata, "contentRefCount", DEFAULT_CONTENT_REF_COUNT), DEFAULT_CONTENT_REF_COUNT),
    personRefCount: normalizeReferenceCount(metadataText(metadata, "personRefCount", DEFAULT_PERSON_REF_COUNT), DEFAULT_PERSON_REF_COUNT),
    styleRefCount: normalizeReferenceCount(metadataText(metadata, "styleRefCount", DEFAULT_STYLE_REF_COUNT), DEFAULT_STYLE_REF_COUNT),
    referenceCountsConfigured
  };
}
function isImageNode(node) {
  const mimeType = asString(node.metadata?.mimeType);
  const content = asString(node.metadata?.content);
  return node.type === "image" || mimeType.startsWith("image/") || content.startsWith("data:image/");
}
function findInputImages(ctx) {
  return ctx.getUpstream().filter((node) => isImageNode(node)).map((node) => ({ node, content: asString(node.metadata?.content), title: node.title || "\u56FE\u7247\u53C2\u8003" })).filter((item) => Boolean(item.content));
}
function normalizeReferenceCount(value, fallback = "0") {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return String(Math.min(MAX_REFERENCE_IMAGES_PER_GROUP, Math.max(0, parsed)));
}
function referenceRoleHint(input) {
  const metadata = input.node.metadata;
  const explicit = `${asString(metadata?.referenceRole)} ${asString(metadata?.referenceType)} ${input.title}`.toLowerCase();
  if (/(内容物|内装|内含|成分|原料|配料|瓶内|盒内|随附|配件|content|ingredient|inside)/i.test(explicit)) return "content";
  if (/(人物|人像|模特|脸型|肖像|女生|男生|person|portrait|model|face)/i.test(explicit)) return "person";
  if (/(风格|场景|背景|氛围|光影|style|scene|background|mood)/i.test(explicit)) return "style";
  if (/(商品|产品|主图|包装|sku|product|package)/i.test(explicit)) return "product";
  return null;
}
function emptyReferenceGroups() {
  return { product: [], content: [], person: [], style: [], unassigned: [] };
}
function referenceTargets(draft) {
  return {
    product: Math.max(1, Number(normalizeReferenceCount(draft.productRefCount, DEFAULT_PRODUCT_REF_COUNT))),
    content: Number(normalizeReferenceCount(draft.contentRefCount, DEFAULT_CONTENT_REF_COUNT)),
    person: Number(normalizeReferenceCount(draft.personRefCount, DEFAULT_PERSON_REF_COUNT)),
    style: Number(normalizeReferenceCount(draft.styleRefCount, DEFAULT_STYLE_REF_COUNT))
  };
}
function groupInputImages(inputs, draft) {
  const groups = emptyReferenceGroups();
  const targets = referenceTargets(draft);
  const used = /* @__PURE__ */ new Set();
  const roleOrder = ["product", "content", "person", "style"];
  const add = (role, input) => {
    if (used.has(input.node.id) || groups[role].length >= MAX_REFERENCE_IMAGES_PER_GROUP) return false;
    groups[role].push(input);
    used.add(input.node.id);
    return true;
  };
  for (const input of inputs) {
    const hint = referenceRoleHint(input);
    if (hint) add(hint, input);
  }
  const unclassified = inputs.filter((input) => !used.has(input.node.id));
  if (draft.referenceCountsConfigured) {
    for (const role of roleOrder) {
      while (groups[role].length < targets[role] && unclassified.length) {
        add(role, unclassified.shift());
      }
    }
  } else {
    if (!groups.product.length && unclassified.length) add("product", unclassified.shift());
    if (draft.characterMode === "strict-person" && !groups.person.length && unclassified.length) add("person", unclassified.shift());
    while (unclassified.length) add("style", unclassified.shift());
  }
  groups.unassigned = inputs.filter((input) => !used.has(input.node.id));
  return groups;
}
function referenceGroupEntries(groups) {
  return ["product", "content", "person", "style"].flatMap((role) => groups[role].map((input) => ({ input, role })));
}
function referenceRoleLabel(role) {
  if (role === "product") return "\u5546\u54C1";
  if (role === "content") return "\u5185\u5BB9\u7269";
  if (role === "person") return "\u4EBA\u7269";
  return "\u98CE\u683C";
}
function normalizeDuration(value) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return DEFAULT_DURATION;
  return String(Math.min(MAX_TOTAL_DURATION, Math.max(MIN_SCENE_SECONDS, Math.round(parsed))));
}
function normalizeSceneCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_SCENE_COUNT;
  return String(Math.min(MAX_SCENE_COUNT, Math.max(1, parsed)));
}
function normalizeSceneDuration(value, fallback = "4") {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return String(Math.min(MAX_SCENE_SECONDS, Math.max(MIN_SCENE_SECONDS, Math.round(parsed))));
}
function effectiveSceneCount(totalDuration, requestedCount) {
  const total = Number(normalizeDuration(totalDuration));
  const requested = Number(normalizeSceneCount(requestedCount));
  const minimumCount = Math.ceil(total / MAX_SCENE_SECONDS);
  const maximumCount = Math.max(1, Math.floor(total / MIN_SCENE_SECONDS));
  return Math.min(MAX_SCENE_COUNT, Math.max(minimumCount, Math.min(requested, maximumCount)));
}
function distributeSceneDurations(totalDuration, count) {
  const total = Number(normalizeDuration(totalDuration));
  const safeCount = Math.max(1, Math.min(count, Math.floor(total / MIN_SCENE_SECONDS)));
  const base = Math.floor(total / safeCount);
  const remainder = total % safeCount;
  return Array.from({ length: safeCount }, (_, index) => String(base + (index < remainder ? 1 : 0)));
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
function compositionDimensions(ratio) {
  if (ratio === "9:16 \u7AD6\u7248") return { width: 720, height: 1280 };
  if (ratio === "1:1 \u65B9\u5F62") return { width: 1024, height: 1024 };
  return { width: 1280, height: 720 };
}
function waitForVideoReady(video) {
  if (video.readyState >= 2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("\u6D4F\u89C8\u5668\u65E0\u6CD5\u8BFB\u53D6\u89C6\u9891\u6E90\uFF0C\u53EF\u80FD\u662F\u6E20\u9053\u89C6\u9891\u5730\u5740\u4E0D\u5141\u8BB8\u8DE8\u57DF\u8BFB\u53D6\u3002"));
    };
    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}
function drawVideoCover(context, video, width, height) {
  const sourceWidth = video.videoWidth || width;
  const sourceHeight = video.videoHeight || height;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;
  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
    sx = (sourceWidth - sw) / 2;
  } else if (sourceRatio < targetRatio) {
    sh = sourceWidth / targetRatio;
    sy = (sourceHeight - sh) / 2;
  }
  context.fillStyle = "#000";
  context.fillRect(0, 0, width, height);
  context.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
}
function recordVideoFrames(video, context, width, height) {
  return new Promise((resolve, reject) => {
    let frameId = 0;
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      window.cancelAnimationFrame(frameId);
      if (error) reject(error);
      else resolve();
    };
    const draw = () => {
      try {
        drawVideoCover(context, video, width, height);
      } catch {
        finish(new Error("\u89C6\u9891\u8DE8\u57DF\u7B56\u7565\u963B\u6B62\u4E86\u81EA\u52A8\u5408\u6210\uFF0C\u8BF7\u4FDD\u7559\u4F7F\u7528\u4E0B\u65B9\u5206\u955C\u89C6\u9891\u3002"));
        return;
      }
      if (video.ended) {
        finish();
        return;
      }
      frameId = window.requestAnimationFrame(draw);
    };
    video.addEventListener("ended", () => finish(), { once: true });
    video.addEventListener("error", () => finish(new Error("\u89C6\u9891\u64AD\u653E\u5931\u8D25\uFF0C\u65E0\u6CD5\u5B8C\u6210\u81EA\u52A8\u5408\u6210\u3002")), { once: true });
    draw();
  });
}
async function composeVideoUrls(urls, ratio) {
  if (!urls.length) throw new Error("\u6CA1\u6709\u53EF\u5408\u6210\u7684\u89C6\u9891\u7247\u6BB5\u3002");
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement === "undefined" || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error("\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301\u81EA\u52A8\u5408\u6210\uFF1B\u8BF7\u4F7F\u7528\u65B0\u7248 Chrome\uFF0C\u6216\u624B\u52A8\u4F7F\u7528\u4E0B\u65B9\u5206\u955C\u89C6\u9891\u3002");
  }
  const { width, height } = compositionDimensions(ratio);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("\u6D4F\u89C8\u5668\u65E0\u6CD5\u521B\u5EFA\u89C6\u9891\u5408\u6210\u753B\u5E03\u3002");
  const stream = canvas.captureStream(30);
  const mimeTypes = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  const mimeType = mimeTypes.find((value) => MediaRecorder.isTypeSupported(value)) || "";
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8e6 }) : new MediaRecorder(stream);
  const chunks = [];
  const stopped = new Promise((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error("\u6D4F\u89C8\u5668\u5F55\u5236\u5408\u6210\u89C6\u9891\u5931\u8D25\u3002"));
  });
  let audioContext = null;
  let audioDestination = null;
  if (typeof AudioContext !== "undefined") {
    try {
      audioContext = new AudioContext();
      await audioContext.resume();
      audioDestination = audioContext.createMediaStreamDestination();
      const audioTrack = audioDestination.stream.getAudioTracks()[0];
      if (audioTrack) stream.addTrack(audioTrack);
    } catch {
      audioContext = null;
      audioDestination = null;
    }
  }
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  recorder.start(500);
  const startedAt = performance.now();
  try {
    for (const url of urls) {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.playsInline = true;
      video.preload = "auto";
      video.muted = false;
      video.style.position = "fixed";
      video.style.left = "-10000px";
      video.style.top = "0";
      video.style.width = "1px";
      video.style.height = "1px";
      video.style.opacity = "0";
      video.style.pointerEvents = "none";
      document.body.appendChild(video);
      let audioSource = null;
      try {
        video.src = url;
        video.load();
        await waitForVideoReady(video);
        if (audioContext && audioDestination) {
          try {
            audioSource = audioContext.createMediaElementSource(video);
            audioSource.connect(audioDestination);
          } catch {
            audioSource = null;
          }
        }
        try {
          await video.play();
        } catch {
          video.muted = true;
          await video.play();
        }
        await recordVideoFrames(video, context, width, height);
      } finally {
        audioSource?.disconnect();
        video.pause();
        video.removeAttribute("src");
        video.load();
        video.remove();
      }
    }
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
    if (audioContext) await audioContext.close().catch(() => void 0);
  }
  await stopped;
  const blob = new Blob(chunks, { type: mimeType || "video/webm" });
  if (!blob.size) throw new Error("\u81EA\u52A8\u5408\u6210\u6CA1\u6709\u751F\u6210\u6709\u6548\u7684\u89C6\u9891\u6587\u4EF6\u3002");
  return {
    url: URL.createObjectURL(blob),
    mimeType: blob.type || "video/webm",
    width,
    height,
    durationMs: Math.round(performance.now() - startedAt)
  };
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
  return [draft.brief, draft.productFacts, draft.mustKeep, draft.allowedChange, draft.forbidden, draft.sound, draft.duration, draft.ratio, draft.lockMode, draft.sceneCount, draft.characterMode, draft.productRefCount, draft.contentRefCount, draft.personRefCount, draft.styleRefCount].join("\u241F");
}
function storyboardFingerprint(draft) {
  return `${promptFingerprint(draft)}\u241F${draft.imageModel}`;
}
function characterLockText(draft, hasCharacterReference) {
  if (draft.characterMode === "product-only") return "\u672C\u9879\u76EE\u4E0D\u5B89\u6392\u4EBA\u7269\uFF1B\u4E0D\u8981\u65B0\u589E\u4EBA\u7269\u3001\u624B\u6216\u4EBA\u7269\u9053\u5177\u3002";
  if (draft.characterMode === "strict-person" && hasCharacterReference) return "\u4F7F\u7528\u4EBA\u7269\u53C2\u8003\u56FE\u7EC4\u9501\u5B9A\u540C\u4E00\u4EBA\u7269\u7684\u8138\u578B\u3001\u4E94\u5B98\u6BD4\u4F8B\u3001\u53D1\u578B\u3001\u80A4\u8272\u548C\u6574\u4F53\u8EAB\u4EFD\uFF1B\u4EBA\u7269\u52A8\u4F5C\u53EF\u4EE5\u53D8\u5316\uFF0C\u8138\u90E8\u7ED3\u6784\u4E0D\u8981\u53D8\u5316\u3002";
  if (draft.characterMode === "strict-person") return "\u7528\u6237\u8981\u6C42\u4EBA\u7269\u4E00\u81F4\uFF0C\u4F46\u672A\u8FDE\u63A5\u4EBA\u7269\u53C2\u8003\u56FE\uFF1B\u65E0\u6CD5\u5EFA\u7ACB\u53EF\u9760\u7684\u4EBA\u7269\u8EAB\u4EFD\u9501\u5B9A\uFF0C\u5FC5\u987B\u5148\u8865\u5145\u4EBA\u7269\u53C2\u8003\u56FE\u3002";
  return "\u5141\u8BB8\u51FA\u73B0\u4EBA\u7269\uFF0C\u4F46\u672A\u542F\u7528\u4EBA\u7269\u8EAB\u4EFD\u9501\u5B9A\uFF1B\u4E0D\u8981\u628A\u6B64\u6A21\u5F0F\u63CF\u8FF0\u4E3A\u8138\u578B\u4E00\u81F4\u4FDD\u8BC1\u3002";
}
function sceneDuration(totalDuration, index, count) {
  return distributeSceneDurations(totalDuration, count)[index] || String(MIN_SCENE_SECONDS);
}
function buildStoryboardFallback(draft, hasCharacterReference) {
  const count = effectiveSceneCount(draft.duration, draft.sceneCount);
  const action = primaryAction(draft.brief);
  const characterLock = characterLockText(draft, hasCharacterReference);
  const usesPerson = draft.characterMode !== "product-only" && hasCharacterReference;
  const scenes = [
    {
      id: "s1",
      title: "\u5546\u54C1\u5EFA\u7ACB\u955C\u5934",
      purpose: "\u5148\u8BA9\u89C2\u4F17\u770B\u6E05\u5546\u54C1\u4E3B\u4F53\u3001\u5305\u88C5\u548C\u6574\u4F53\u8D28\u611F\u3002",
      duration: sceneDuration(draft.duration, 0, count),
      framePrompt: "\u4EE5\u5546\u54C1\u53C2\u8003\u56FE\u4E3A\u552F\u4E00\u5546\u54C1\u8EAB\u4EFD\u57FA\u51C6\uFF0C\u4FDD\u6301\u539F\u5305\u88C5\u3001\u8F6E\u5ED3\u3001\u6BD4\u4F8B\u3001\u989C\u8272\u3001\u53EF\u89C1\u6587\u5B57\u548C\u539F\u6709\u6784\u56FE\u5173\u7CFB\uFF0C\u5EFA\u7ACB\u5E72\u51C0\u7684\u5546\u4E1A\u5C55\u793A\u9996\u5E27\uFF1B\u53EA\u6DFB\u52A0\u4E0E\u7528\u6237\u76EE\u6807\u4E00\u81F4\u7684\u73AF\u5883\u5149\u5F71\uFF0C\u4E0D\u6539\u5546\u54C1\u3002",
      videoPrompt: "\u5148\u4FDD\u6301\u9996\u5E27\u9759\u6B62\u7EA6 0.8 \u79D2\uFF0C\u7136\u540E\u8BA9\u5149\u7EBF\u6216\u6781\u8F7B\u5FAE\u955C\u5934\u53D8\u5316\u81EA\u7136\u51FA\u73B0\uFF0C\u5546\u54C1\u8FB9\u7F18\u548C\u5305\u88C5\u6587\u5B57\u6301\u7EED\u7A33\u5B9A\uFF1B\u6700\u540E\u56DE\u5230\u7A33\u5B9A\u5C55\u793A\u3002",
      negativePrompt: "\u5546\u54C1\u6539\u6B3E\uFF0C\u5305\u88C5\u91CD\u7ED8\uFF0C\u6587\u5B57\u4E71\u7801\uFF0C\u65B0\u589E\u7B2C\u4E8C\u4E2A\u5546\u54C1\uFF0C\u955C\u5934\u8DF3\u52A8\uFF0C\u5546\u54C1\u6F02\u6D6E\uFF0C\u8FB9\u7F18\u95EA\u70C1"
    },
    {
      id: "s2",
      title: "\u6838\u5FC3\u52A8\u4F5C\u955C\u5934",
      purpose: "\u7528\u4E00\u4E2A\u4E3B\u52A8\u4F5C\u8868\u8FBE\u7528\u6237\u60F3\u8981\u7684\u6548\u679C\u3002",
      duration: sceneDuration(draft.duration, 1, count),
      framePrompt: `${usesPerson ? "\u4EBA\u7269\u53C2\u8003\u56FE\u4E2D\u7684\u540C\u4E00\u4EBA\u7269\u51FA\u73B0\u5728\u753B\u9762\u4E2D\uFF0C\u8138\u578B\u548C\u4E94\u5B98\u6BD4\u4F8B\u4FDD\u6301\u4E00\u81F4\uFF1B" : "\u4E0D\u65B0\u589E\u4EBA\u7269\uFF1B"}\u5546\u54C1\u53C2\u8003\u56FE\u4ECD\u662F\u5546\u54C1\u8EAB\u4EFD\u552F\u4E00\u57FA\u51C6\uFF0C\u5B89\u6392\u4E00\u4E2A\u660E\u786E\u3001\u514B\u5236\u3001\u53EF\u6267\u884C\u7684\u5C55\u793A\u573A\u666F\u3002\u4E3B\u52A8\u4F5C\u76EE\u6807\uFF1A${action}\u3002\u5546\u54C1\u4E0E\u4EBA\u7269/\u624B\u7684\u63A5\u89E6\u5173\u7CFB\u5FC5\u987B\u6E05\u695A\u3001\u7B26\u5408\u7269\u7406\u7A7A\u95F4\uFF0C\u4E0D\u906E\u6321\u5546\u54C1\u5173\u952E\u5305\u88C5\u6587\u5B57\u3002`,
      videoPrompt: `${usesPerson ? "\u540C\u4E00\u4EBA\u7269\u4FDD\u6301\u8138\u578B\u3001\u4E94\u5B98\u6BD4\u4F8B\u548C\u53D1\u578B\u7A33\u5B9A\uFF1B" : "\u753B\u9762\u4E2D\u4E0D\u51FA\u73B0\u65B0\u589E\u4EBA\u7269\u6216\u624B\uFF1B"}\u53EA\u6267\u884C\u4E00\u4E2A\u4E3B\u52A8\u4F5C\uFF1A${action}\u3002\u52A8\u4F5C\u6162\u3001\u8FDE\u7EED\u3001\u53EF\u89C2\u5BDF\uFF0C\u624B\u4E0E\u5546\u54C1\u4FDD\u6301\u771F\u5B9E\u63A5\u89E6\u5173\u7CFB\uFF0C\u4E0D\u7A7F\u8FC7\u5546\u54C1\uFF0C\u4E0D\u8BA9\u5546\u54C1\u7A7F\u8FC7\u624B\u6216\u4EBA\u7269\uFF1B\u955C\u5934\u53EA\u505A\u8F7B\u5FAE\u8FDE\u7EED\u8FD0\u52A8\u3002`,
      negativePrompt: "\u8138\u578B\u6F02\u79FB\uFF0C\u4E94\u5B98\u8DF3\u53D8\uFF0C\u624B\u6307\u7578\u5F62\uFF0C\u624B\u7A7F\u8FC7\u5546\u54C1\uFF0C\u5546\u54C1\u7A7F\u8FC7\u624B\uFF0C\u906E\u6321logo\uFF0C\u5546\u54C1\u53D8\u5F62\uFF0C\u52A8\u4F5C\u8DF3\u5207"
    },
    {
      id: "s3",
      title: "\u7A33\u5B9A\u6536\u5C3E\u955C\u5934",
      purpose: "\u56DE\u5230\u6E05\u6670\u7684\u5546\u54C1\u82F1\u96C4\u753B\u9762\uFF0C\u65B9\u4FBF\u540E\u671F\u526A\u8F91\u548C\u8F6C\u5316\u3002",
      duration: sceneDuration(draft.duration, 2, count),
      framePrompt: "\u5546\u54C1\u53C2\u8003\u56FE\u4E2D\u7684\u5546\u54C1\u4FDD\u6301\u539F\u6837\uFF0C\u5F62\u6210\u6E05\u6670\u3001\u7A33\u5B9A\u3001\u53EF\u8BFB\u7684\u6536\u5C3E\u82F1\u96C4\u5E27\uFF1B\u4FDD\u7559\u5546\u54C1\u539F\u6709\u5305\u88C5\u6B63\u9762\u548C\u53EF\u89C1\u6587\u5B57\uFF0C\u4E0D\u65B0\u589E\u53E3\u53F7\u3001\u5B57\u5E55\u3001\u6C34\u5370\u6216\u7B2C\u4E8C\u4E2A\u5546\u54C1\u3002",
      videoPrompt: "\u4E3B\u52A8\u4F5C\u81EA\u7136\u6536\u5C3E\uFF0C\u955C\u5934\u505C\u6B62\u5728\u7A33\u5B9A\u7684\u5546\u54C1\u82F1\u96C4\u753B\u9762\uFF1B\u4FDD\u6301\u5546\u54C1\u8F6E\u5ED3\u3001\u5305\u88C5\u6587\u5B57\u3001logo\u3001\u6750\u8D28\u7EB9\u7406\u548C\u5149\u5F71\u8FDE\u7EED\uFF0C\u6700\u540E\u7EA6 0.8 \u79D2\u4E0D\u8981\u518D\u5F15\u5165\u65B0\u52A8\u4F5C\u3002",
      negativePrompt: "\u6539\u5305\u88C5\uFF0C\u6587\u5B57\u53D8\u5F62\uFF0Clogo\u53D8\u5F62\uFF0C\u5546\u54C1\u878D\u5316\uFF0C\u5546\u54C1\u91CD\u590D\uFF0C\u753B\u9762\u95EA\u70C1\uFF0C\u7A81\u7136\u53D8\u7126\uFF0C\u5B57\u5E55\u6C34\u5370"
    },
    {
      id: "s4",
      title: "\u7EC6\u8282\u8865\u5145\u955C\u5934",
      purpose: "\u7528\u4E00\u4E2A\u5C40\u90E8\u4F46\u4ECD\u53EF\u8FA8\u8BC6\u7684\u7EC6\u8282\u5F3A\u5316\u5546\u54C1\u5356\u70B9\uFF0C\u4E0D\u6539\u53D8\u5546\u54C1\u8EAB\u4EFD\u3002",
      duration: sceneDuration(draft.duration, 3, count),
      framePrompt: "\u4FDD\u6301\u5546\u54C1\u53C2\u8003\u56FE\u4E2D\u53EF\u89C1\u7684\u5546\u54C1\u8EAB\u4EFD\u548C\u5305\u88C5\u4E8B\u5B9E\uFF0C\u53EA\u9009\u62E9\u539F\u56FE\u5DF2\u7ECF\u5C55\u793A\u7684\u4E00\u4E2A\u5C40\u90E8\u7EC6\u8282\u4F5C\u4E3A\u89C6\u89C9\u91CD\u70B9\uFF1B\u4E0D\u8981\u521B\u9020\u65B0\u7684\u5185\u90E8\u7ED3\u6784\u3001\u80CC\u9762\u6216\u4E0D\u53EF\u8BFB\u6587\u5B57\uFF0C\u4E0D\u8981\u628A\u5C40\u90E8\u53D8\u6210\u53E6\u4E00\u4E2A\u5546\u54C1\u3002",
      videoPrompt: "\u955C\u5934\u505A\u5F88\u5C0F\u5E45\u3001\u5E73\u6ED1\u7684\u63A8\u8FD1\u6216\u5149\u5F71\u53D8\u5316\uFF0C\u5C55\u793A\u539F\u56FE\u53EF\u89C1\u7684\u5C40\u90E8\u7EC6\u8282\u540E\u56DE\u5230\u7A33\u5B9A\u72B6\u6001\uFF1B\u5546\u54C1\u8868\u9762\u7EB9\u7406\u8FDE\u7EED\uFF0C\u5305\u88C5\u6587\u5B57\u548C\u8F6E\u5ED3\u4E0D\u6F02\u79FB\u3002",
      negativePrompt: "\u5C40\u90E8\u53D8\u6210\u65B0\u5546\u54C1\uFF0C\u5305\u88C5\u6587\u5B57\u4E71\u7801\uFF0C\u6750\u8D28\u6DB2\u5316\uFF0C\u7ED3\u6784\u7A7F\u6A21\uFF0C\u8FC7\u5EA6\u5FAE\u8DDD\uFF0C\u955C\u5934\u8DF3\u52A8\uFF0C\u7A81\u7136\u53D8\u7126"
    }
  ];
  const durations = distributeSceneDurations(draft.duration, count);
  const selectedScenes = Array.from({ length: count }, (_, index) => {
    const base = scenes[index] || scenes[scenes.length - 1];
    return {
      ...base,
      id: `s${index + 1}`,
      title: index < scenes.length ? base.title : `${base.title} ${index + 1}`,
      duration: durations[index] || base.duration
    };
  });
  return {
    title: "\u5546\u54C1\u56FE\u751F\u89C6\u9891\u5206\u955C",
    summary: draft.brief || "\u4EE5\u5546\u54C1\u4E3B\u4F53\u7A33\u5B9A\u5C55\u793A\u4E3A\u4E3B\uFF0C\u5148\u5EFA\u7ACB\u5546\u54C1\uFF0C\u518D\u5B8C\u6210\u4E00\u4E2A\u6838\u5FC3\u52A8\u4F5C\uFF0C\u6700\u540E\u7A33\u5B9A\u6536\u5C3E\u3002",
    productLock: draft.mustKeep || "\u5546\u54C1\u8EAB\u4EFD\u3001\u8F6E\u5ED3\u3001\u6BD4\u4F8B\u3001\u989C\u8272\u3001\u6750\u8D28\u3001\u5305\u88C5\u3001\u914D\u4EF6\u3001logo\u3001\u53EF\u89C1\u6587\u5B57\u548C\u539F\u6709\u753B\u9762\u5173\u7CFB\u5FC5\u987B\u4FDD\u6301\u3002",
    characterLock,
    continuity: "\u6BCF\u4E2A\u955C\u5934\u4F7F\u7528\u5DF2\u786E\u8BA4\u7684\u5206\u955C\u9759\u5E27\u4F5C\u4E3A Grok image-to-video \u9996\u5E27\uFF1B\u955C\u5934\u4E4B\u95F4\u53EA\u5EF6\u7EED\u5DF2\u786E\u8BA4\u7684\u5546\u54C1\u548C\u4EBA\u7269\u5916\u89C2\uFF0C\u4E0D\u51ED\u7A7A\u8865\u5168\u4E0D\u53EF\u89C1\u7ED3\u6784\u3002",
    scenes: selectedScenes
  };
}
function referenceRoleInstruction(draft, groups) {
  const counts = groups ? { product: groups.product.length, content: groups.content.length, person: groups.person.length, style: groups.style.length } : referenceTargets(draft);
  const lines = [
    "\u53C2\u8003\u56FE\u5206\u7EC4\u987A\u5E8F\uFF1A\u5546\u54C1 " + counts.product + " \u5F20\uFF1B\u5185\u5BB9\u7269 " + counts.content + " \u5F20\uFF1B\u4EBA\u7269 " + counts.person + " \u5F20\uFF1B\u98CE\u683C " + counts.style + " \u5F20\u3002",
    "\u5546\u54C1\u53C2\u8003\u56FE\u7EC4\u53EA\u7528\u4E8E\u9501\u5B9A\u5546\u54C1\u8EAB\u4EFD\u3001\u5305\u88C5\u3001\u8F6E\u5ED3\u3001\u6BD4\u4F8B\u3001\u989C\u8272\u3001\u6750\u8D28\u3001\u914D\u4EF6\u548C\u53EF\u89C1\u6587\u5B57\u3002",
    "\u5185\u5BB9\u7269\u53C2\u8003\u56FE\u7EC4\u53EA\u7528\u4E8E\u786E\u8BA4\u5546\u54C1\u5185\u90E8\u6216\u968F\u9644\u5185\u5BB9\u7269\u7684\u53EF\u89C1\u4E8B\u5B9E\uFF0C\u4E0D\u5F97\u628A\u5185\u5BB9\u7269\u66FF\u6362\u6210\u53E6\u4E00\u4E2A\u5546\u54C1\uFF0C\u4E0D\u5F97\u51ED\u7A7A\u8865\u5168\u672A\u5C55\u793A\u7684\u5185\u90E8\u7ED3\u6784\u3002",
    "\u4EBA\u7269\u53C2\u8003\u56FE\u7EC4\u53EA\u7528\u4E8E\u9501\u5B9A\u540C\u4E00\u4EBA\u7269\u7684\u8138\u578B\u3001\u4E94\u5B98\u6BD4\u4F8B\u3001\u53D1\u578B\u3001\u80A4\u8272\u548C\u8EAB\u4EFD\uFF1B\u98CE\u683C\u53C2\u8003\u56FE\u7EC4\u53EA\u7528\u4E8E\u501F\u9274\u573A\u666F\u3001\u5149\u5F71\u3001\u8272\u8C03\u548C\u6784\u56FE\u6C1B\u56F4\uFF0C\u4E0D\u80FD\u6539\u53D8\u5546\u54C1\u6216\u4EBA\u7269\u8EAB\u4EFD\u3002"
  ];
  if (groups?.unassigned.length) lines.push("\u53E6\u6709 " + groups.unassigned.length + " \u5F20\u672A\u5206\u7EC4\u53C2\u8003\u56FE\uFF0C\u53EA\u80FD\u4F5C\u4E3A\u8865\u5145\u89C6\u89C9\u53C2\u8003\uFF0C\u4E0D\u5F97\u8986\u76D6\u5546\u54C1\u53C2\u8003\u56FE\u7EC4\u7684\u8EAB\u4EFD\u4E8B\u5B9E\u3002");
  return lines.join(" ");
}
function buildStoryboardAiPrompt(draft, fallback, hasCharacterReference, groups) {
  const roleInstruction = referenceRoleInstruction(draft, groups);
  return [
    roleInstruction,
    `\u8BF7\u751F\u6210 ${draft.sceneCount} \u4E2A\u5546\u54C1\u5E7F\u544A\u77ED\u955C\u5934\u7684\u7ED3\u6784\u5316\u5206\u955C\u3002`,
    `\u7528\u6237\u60F3\u8981\u7684\u6548\u679C\uFF1A${draft.brief || "\u7A33\u5B9A\u5C55\u793A\u5546\u54C1\u6750\u8D28\u4E0E\u8F6E\u5ED3"}`,
    `\u5546\u54C1\u4E8B\u5B9E\uFF1A${draft.productFacts || "\u6CA1\u6709\u989D\u5916\u4E8B\u5B9E\uFF0C\u53EA\u4EE5\u5546\u54C1\u53C2\u8003\u56FE\u4E2D\u5B9E\u9645\u53EF\u89C1\u5185\u5BB9\u4E3A\u51C6"}`,
    `\u5FC5\u987B\u4FDD\u7559\uFF1A${draft.mustKeep || "\u5546\u54C1\u53C2\u8003\u56FE\u4E2D\u7684\u8EAB\u4EFD\u3001\u5305\u88C5\u3001\u8F6E\u5ED3\u3001\u6BD4\u4F8B\u548C\u53EF\u89C1\u6587\u5B57"}`,
    `\u5141\u8BB8\u53D8\u5316\uFF1A${draft.allowedChange || "\u5355\u4E00\u4E3B\u52A8\u4F5C\u3001\u8F7B\u5FAE\u955C\u5934\u8FD0\u52A8\u548C\u81EA\u7136\u5149\u5F71\u53D8\u5316"}`,
    `\u7981\u6B62\u5185\u5BB9\uFF1A${draft.forbidden || "\u6539\u5305\u88C5\u3001\u6539\u6587\u5B57\u3001\u589E\u52A0\u7B2C\u4E8C\u4E2A\u5546\u54C1\u3001\u7ED3\u6784\u6F02\u79FB\u3001\u7A7F\u6A21"}`,
    `\u753B\u5E45\uFF1A${draft.ratio}\uFF1B\u603B\u65F6\u957F\u53C2\u8003\uFF1A${draft.duration} \u79D2\u3002`,
    `\u4EBA\u7269\u6A21\u5F0F\uFF1A${draft.characterMode}\uFF1B\u4EBA\u7269\u53C2\u8003\u56FE\u662F\u5426\u5DF2\u8FDE\u63A5\uFF1A${hasCharacterReference ? "\u662F" : "\u5426"}\u3002`,
    `\u4EBA\u7269\u9501\u5B9A\u89C4\u5219\uFF1A${characterLockText(draft, hasCharacterReference)}`,
    "\u8BF7\u9075\u5B88\uFF1A\u6BCF\u4E2A\u955C\u5934\u53EA\u505A\u4E00\u4E2A\u4E3B\u8981\u4EFB\u52A1\uFF1BframePrompt \u662F\u9759\u6001\u5206\u955C\u9996\u5E27\uFF0C\u5FC5\u987B\u5F3A\u8C03\u5546\u54C1/\u4EBA\u7269\u8EAB\u4EFD\u548C\u63A5\u89E6\u5173\u7CFB\uFF1BvideoPrompt \u53EA\u63CF\u8FF0\u4ECE\u8BE5\u9759\u5E27\u5F00\u59CB\u53D1\u751F\u7684\u52A8\u4F5C\u3001\u955C\u5934\u548C\u58F0\u97F3\uFF0C\u4E0D\u8981\u91CD\u65B0\u53D1\u660E\u6784\u56FE\u6216\u5546\u54C1\uFF1BnegativePrompt \u53EA\u5199\u672C\u955C\u5934\u6700\u53EF\u80FD\u51FA\u73B0\u7684\u9519\u8BEF\u3002",
    "\u4EE5\u4E0B\u662F\u4FDD\u5B88\u6A21\u677F\uFF0C\u82E5\u8F93\u5165\u4E8B\u5B9E\u4E0D\u8DB3\u8BF7\u6CBF\u7528\uFF0C\u4E0D\u8981\u8865\u5145\u672A\u5C55\u793A\u7684\u5546\u54C1\u7EC6\u8282\uFF1A",
    `\u7CFB\u7EDF\u5B9E\u9645\u9700\u8981\u8F93\u51FA ${fallback.scenes.length} \u4E2A\u955C\u5934\uFF1B\u7528\u6237\u586B\u5199\u7684\u662F ${draft.sceneCount} \u4E2A\u3002\u6BCF\u955C\u5934\u6700\u591A\u6309 ${MAX_SCENE_SECONDS} \u79D2\u751F\u6210\uFF0C\u5FC5\u8981\u65F6\u4FDD\u6301\u603B\u65F6\u957F\u5E76\u81EA\u52A8\u5206\u6BB5\u3002`,
    JSON.stringify(fallback)
  ].join("\n");
}
function normalizeStoryboardScene(value, index, fallback) {
  const item = value && typeof value === "object" ? value : {};
  return {
    id: asString(item.id, fallback.id) || `s${index + 1}`,
    title: asString(item.title, fallback.title) || fallback.title,
    purpose: asString(item.purpose, fallback.purpose) || fallback.purpose,
    duration: normalizeSceneDuration(asString(item.duration, fallback.duration), fallback.duration),
    framePrompt: asString(item.framePrompt, fallback.framePrompt) || fallback.framePrompt,
    videoPrompt: asString(item.videoPrompt, fallback.videoPrompt) || fallback.videoPrompt,
    negativePrompt: asString(item.negativePrompt, fallback.negativePrompt) || fallback.negativePrompt
  };
}
function parseStoryboardResponse(text, fallback) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return fallback;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1));
    const rawScenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
    if (rawScenes.length < 1) return fallback;
    const scenes = rawScenes.slice(0, MAX_SCENE_COUNT).map((scene, index) => normalizeStoryboardScene(scene, index, fallback.scenes[index] || fallback.scenes[fallback.scenes.length - 1]));
    return {
      title: asString(parsed.title, fallback.title) || fallback.title,
      summary: asString(parsed.summary, fallback.summary) || fallback.summary,
      productLock: asString(parsed.productLock, fallback.productLock) || fallback.productLock,
      characterLock: asString(parsed.characterLock, fallback.characterLock) || fallback.characterLock,
      continuity: asString(parsed.continuity, fallback.continuity) || fallback.continuity,
      scenes
    };
  } catch {
    return fallback;
  }
}
function normalizeStoryboardPlan(plan, draft, fallback) {
  const count = effectiveSceneCount(draft.duration, draft.sceneCount);
  const durations = distributeSceneDurations(draft.duration, count);
  const sourceScenes = plan.scenes.length ? plan.scenes : fallback.scenes;
  const scenes = Array.from({ length: count }, (_, index) => {
    const source = sourceScenes[index] || sourceScenes[sourceScenes.length - 1] || fallback.scenes[fallback.scenes.length - 1];
    const fallbackScene = fallback.scenes[index] || fallback.scenes[fallback.scenes.length - 1];
    const normalized = normalizeStoryboardScene(source, index, fallbackScene);
    return {
      ...normalized,
      id: `s${index + 1}`,
      duration: durations[index] || fallbackScene.duration
    };
  });
  return { ...plan, scenes };
}
function parseStoredStoryboard(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || !Array.isArray(parsed.scenes) || parsed.scenes.length < 1) return null;
    return parsed;
  } catch {
    return null;
  }
}
function storyboardReferences(inputs, draft) {
  const groups = groupInputImages(inputs, draft);
  return [
    ...referenceGroupEntries(groups).map(({ input }) => input.content),
    ...groups.unassigned.map((input) => input.content)
  ].filter(Boolean);
}
function buildSceneFramePrompt(scene, draft, hasCharacterReference, groups) {
  const roleInstruction = referenceRoleInstruction(draft, groups);
  return [
    "\u751F\u6210\u4E00\u5F20\u5546\u54C1\u5E7F\u544A\u5206\u955C\u9759\u5E27\uFF0C\u4E0D\u8981\u751F\u6210\u89C6\u9891\uFF0C\u4E0D\u8981\u62FC\u8D34\u591A\u4E2A\u955C\u5934\u3002",
    "\u7B2C\u4E00\u5F20\u53C2\u8003\u56FE\u662F\u5546\u54C1\u8EAB\u4EFD\u7684\u552F\u4E00\u4E8B\u5B9E\u57FA\u51C6\uFF1A\u5FC5\u987B\u4FDD\u6301\u5546\u54C1\u539F\u5305\u88C5\u3001logo\u3001\u53EF\u89C1\u6587\u5B57\u3001\u8F6E\u5ED3\u3001\u6BD4\u4F8B\u3001\u989C\u8272\u3001\u6750\u8D28\u3001\u914D\u4EF6\u548C\u5173\u952E\u7EC6\u8282\uFF0C\u4E0D\u6539\u6B3E\u3001\u4E0D\u6362\u5305\u88C5\u3001\u4E0D\u91CD\u65B0\u8BBE\u8BA1\u6B63\u9762\u7248\u5F0F\u3002",
    roleInstruction,
    draft.characterMode === "strict-person" && hasCharacterReference ? "\u4EBA\u7269\u53C2\u8003\u56FE\u7EC4\u662F\u4EBA\u7269\u8EAB\u4EFD\u57FA\u51C6\uFF1A\u4FDD\u6301\u540C\u4E00\u4EBA\u7269\u7684\u8138\u578B\u3001\u4E94\u5B98\u6BD4\u4F8B\u3001\u53D1\u578B\u3001\u80A4\u8272\u548C\u6574\u4F53\u8EAB\u4EFD\uFF1B\u4E0D\u8981\u53D8\u8138\u3001\u6362\u4EBA\u6216\u6539\u53D8\u5934\u8EAB\u6BD4\u4F8B\u3002" : draft.characterMode === "product-only" ? "\u672C\u955C\u5934\u4E0D\u65B0\u589E\u4EBA\u7269\u3001\u624B\u6216\u4EBA\u7269\u9053\u5177\u3002" : "\u4EBA\u7269\u8EAB\u4EFD\u672A\u88AB\u4E25\u683C\u9501\u5B9A\uFF1B\u4E0D\u8981\u58F0\u79F0\u4EBA\u7269\u8138\u578B\u5DF2\u83B7\u5F97\u4FDD\u8BC1\u3002",
    inputsRoleInstruction(draft, groups),
    `\u955C\u5934\u4EFB\u52A1\uFF1A${scene.purpose}`,
    `\u5206\u955C\u9996\u5E27\u8BBE\u8BA1\uFF1A${scene.framePrompt}`,
    `\u753B\u5E45\uFF1A${draft.ratio}\u3002\u5546\u54C1\u4E3B\u4F53\u5B8C\u6574\uFF0C\u5173\u952E\u5305\u88C5\u6587\u5B57\u4E0D\u88AB\u906E\u6321\u3002\u82E5\u6709\u4EBA\u7269/\u624B\u4E0E\u5546\u54C1\u4E92\u52A8\uFF0C\u63A5\u89E6\u70B9\u6E05\u6670\u3001\u524D\u540E\u5173\u7CFB\u771F\u5B9E\uFF0C\u4E0D\u80FD\u7A7F\u6A21\u3002`,
    "\u9759\u6001\u753B\u9762\u4E0D\u8981\u5B57\u5E55\u3001\u6C34\u5370\u3001\u8D34\u7EB8\u3001\u7B2C\u4E8C\u4E2A\u5546\u54C1\u3001\u989D\u5916logo\u3001\u865A\u6784\u5305\u88C5\u80CC\u9762\u6216\u4E0D\u53EF\u89C1\u5185\u90E8\u7ED3\u6784\uFF1B\u6587\u5B57\u53EA\u4FDD\u7559\u53C2\u8003\u56FE\u4E2D\u5B9E\u9645\u53EF\u89C1\u5185\u5BB9\u3002"
  ].join("\n");
}
function inputsRoleInstruction(draft, groups) {
  return referenceRoleInstruction(draft, groups);
}
function buildSceneVideoPrompt(scene, draft, hasCharacterReference) {
  return [
    "\u4ECE\u8FD9\u5F20\u5DF2\u7ECF\u786E\u8BA4\u7684\u5206\u955C\u9759\u5E27\u5F00\u59CB\u505A Grok image-to-video\u3002\u9759\u5E27\u8D1F\u8D23\u6784\u56FE\u3001\u5149\u7EBF\u3001\u5546\u54C1\u5305\u88C5\u548C\u4EBA\u7269\u5916\u89C2\uFF1B\u4E0B\u9762\u53EA\u63CF\u8FF0\u53D1\u751F\u4EC0\u4E48\u53D8\u5316\uFF0C\u4E0D\u8981\u91CD\u65B0\u8BBE\u8BA1\u753B\u9762\u3002",
    `\u672C\u955C\u5934\u65F6\u957F\u7EA6 ${scene.duration} \u79D2\uFF1B\u603B\u6210\u7247\u65F6\u957F\u7531\u6240\u6709\u955C\u5934\u5408\u5E76\u540E\u8BA1\u7B97\u3002`,
    `\u524D 0.6 \u79D2\u4FDD\u6301\u9996\u5E27\u7A33\u5B9A\uFF1B\u968F\u540E\u53EA\u6267\u884C\u4E00\u4E2A\u4E3B\u52A8\u4F5C\uFF1A${scene.videoPrompt}`,
    draft.characterMode === "strict-person" && hasCharacterReference ? "\u4EBA\u7269\u8138\u578B\u3001\u4E94\u5B98\u6BD4\u4F8B\u3001\u53D1\u578B\u548C\u8EAB\u4EFD\u5728\u6574\u4E2A\u955C\u5934\u4E2D\u4FDD\u6301\u4E00\u81F4\u3002" : "\u4E0D\u65B0\u589E\u672A\u88AB\u786E\u8BA4\u7684\u4EBA\u7269\u3001\u624B\u6216\u9053\u5177\u3002",
    "\u5546\u54C1\u4E3B\u4F53\u3001\u5305\u88C5\u3001logo\u3001\u53EF\u89C1\u6587\u5B57\u3001\u6BD4\u4F8B\u548C\u8F6E\u5ED3\u4FDD\u6301\u4E0D\u53D8\uFF1B\u624B\u4E0E\u5546\u54C1\u63A5\u89E6\u65F6\u9075\u5B88\u771F\u5B9E\u906E\u6321\u548C\u6DF1\u5EA6\u5173\u7CFB\uFF0C\u4E0D\u7A7F\u8FC7\u3001\u4E0D\u878D\u5408\u3001\u4E0D\u6F02\u6D6E\u3002",
    `\u58F0\u97F3\uFF1A${draft.sound || DEFAULT_SOUND}`,
    `\u672C\u955C\u5934\u52A8\u6001\u8D1F\u9762\u7EA6\u675F\uFF1A${scene.negativePrompt}`,
    "\u52A8\u4F5C\u5728\u524D\u534A\u6BB5\u5B8C\u6210\uFF0C\u540E\u534A\u6BB5\u7A33\u5B9A\u6536\u5C3E\uFF1B\u4E0D\u8DF3\u5207\u3001\u4E0D\u7A81\u7136\u53D8\u7126\u3001\u4E0D\u5F15\u5165\u7B2C\u4E8C\u4E2A\u52A8\u4F5C\u3002"
  ].join("\n");
}
function renderStoryboardMarkdown(plan, sourceLabel, hasCharacterReference, draft, groups) {
  const roleInstruction = referenceRoleInstruction(draft, groups);
  return [
    "# Grok \u5546\u54C1\u5E7F\u544A\u811A\u672C\u4E0E\u5206\u955C",
    "",
    `- \u6807\u9898\uFF1A${plan.title}`,
    `- \u5546\u54C1\u9996\u5E27\uFF1A${sourceLabel || "\u672A\u8FDE\u63A5"}`,
    `- \u4EBA\u7269\u53C2\u8003\uFF1A${hasCharacterReference ? "\u5DF2\u8FDE\u63A5\u4EBA\u7269\u53C2\u8003\u56FE\u7EC4" : "\u672A\u8FDE\u63A5"}`,
    `- \u53C2\u8003\u56FE\u5206\u7EC4\uFF1A${roleInstruction}`,
    `- \u6574\u4F53\u76EE\u6807\uFF1A${plan.summary}`,
    `- \u5546\u54C1\u9501\u5B9A\uFF1A${plan.productLock}`,
    `- \u4EBA\u7269\u9501\u5B9A\uFF1A${plan.characterLock}`,
    `- \u8FDE\u7EED\u6027\uFF1A${plan.continuity}`,
    "",
    ...plan.scenes.flatMap((scene, index) => [
      `## \u955C\u5934 ${index + 1}\uFF5C${scene.title}`,
      `- \u65F6\u957F\uFF1A${scene.duration} \u79D2`,
      `- \u4EFB\u52A1\uFF1A${scene.purpose}`,
      `- \u5206\u955C\u9996\u5E27\u63D0\u793A\u8BCD\uFF1A${scene.framePrompt}`,
      `- Grok \u52A8\u4F5C\u63D0\u793A\u8BCD\uFF1A${scene.videoPrompt}`,
      `- \u52A8\u6001\u8D1F\u9762\u63D0\u793A\u8BCD\uFF1A${scene.negativePrompt}`,
      ""
    ]),
    "## \u751F\u6210\u987A\u5E8F",
    "1. \u5148\u751F\u6210\u5E76\u786E\u8BA4\u6BCF\u4E2A\u955C\u5934\u7684\u9759\u6001\u5206\u955C\u56FE\u3002",
    "2. \u6BCF\u5F20\u5206\u955C\u56FE\u5206\u522B\u4F5C\u4E3A Grok image-to-video \u7684\u552F\u4E00\u9996\u5E27\u3002",
    "3. \u89C6\u9891\u751F\u6210\u540E\u9010\u955C\u5934\u68C0\u67E5\u5546\u54C1\u8EAB\u4EFD\u3001\u4EBA\u7269\u8138\u578B\u3001\u624B\u4E0E\u5546\u54C1\u63A5\u89E6\u3001\u906E\u6321\u548C\u5305\u88C5\u6587\u5B57\u3002"
  ].join("\n");
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
function buildQualityChecklist(plan) {
  const sceneLines = plan?.scenes.map((scene, index) => `${index + 1}. \u955C\u5934 ${index + 1}\u300C${scene.title}\u300D\uFF1A\u5546\u54C1\u8EAB\u4EFD/\u5305\u88C5\u6587\u5B57\u3001\u4EBA\u7269\u8138\u578B\u3001\u624B\u4E0E\u5546\u54C1\u63A5\u89E6\u3001\u906E\u6321\u5173\u7CFB\u3001\u8FB9\u7F18\u95EA\u70C1\u3001\u52A8\u4F5C\u8FDE\u7EED\u6027\u3002`) || [];
  return [
    "# Grok \u5546\u54C1\u56FE\u751F\u89C6\u9891\u8D28\u68C0\u6E05\u5355",
    "",
    "\u4EE5\u4E0B\u9879\u76EE\u4E0D\u80FD\u9760\u63D0\u793A\u8BCD\u505A\u5230\u7EDD\u5BF9\u4FDD\u8BC1\uFF0C\u5FC5\u987B\u9010\u955C\u5934\u89C2\u770B\uFF0C\u53D1\u73B0\u95EE\u9898\u5C31\u53EA\u91CD\u751F\u6210\u5BF9\u5E94\u955C\u5934\uFF1A",
    "",
    ...sceneLines,
    "",
    "## \u5224\u5B9A\u6807\u51C6",
    "- \u5546\u54C1\uFF1A\u5305\u88C5\u5F62\u72B6\u3001\u6BD4\u4F8B\u3001\u989C\u8272\u3001logo\u3001\u53EF\u89C1\u6587\u5B57\u548C\u914D\u4EF6\u6CA1\u6709\u6539\u6B3E\u3001\u4E71\u7801\u3001\u91CD\u590D\u6216\u6F02\u79FB\u3002",
    "- \u4EBA\u7269\uFF1A\u540C\u4E00\u4EBA\u7269\u7684\u8138\u578B\u3001\u4E94\u5B98\u6BD4\u4F8B\u3001\u53D1\u578B\u548C\u80A4\u8272\u7A33\u5B9A\uFF1B\u6CA1\u6709\u7A81\u7136\u6362\u8138\u6216\u5E74\u9F84\u53D8\u5316\u3002",
    "- \u7269\u7406\uFF1A\u624B\u6307\u6CA1\u6709\u7578\u5F62\uFF0C\u624B\u4E0E\u5546\u54C1\u63A5\u89E6\u70B9\u771F\u5B9E\uFF0C\u4EBA\u7269/\u624B/\u5546\u54C1\u6CA1\u6709\u76F8\u4E92\u7A7F\u8FC7\u3001\u878D\u5408\u6216\u6F02\u6D6E\u3002",
    "- \u8FDE\u7EED\u6027\uFF1A\u955C\u5934\u6CA1\u6709\u7A81\u7136\u8DF3\u5207\u3001\u900F\u89C6\u7A81\u53D8\u3001\u66DD\u5149\u95EA\u70C1\u3001\u7EB9\u7406\u722C\u52A8\u548C\u8FB9\u7F18\u6296\u52A8\u3002",
    "- \u753B\u9762\uFF1A\u6CA1\u6709\u5B57\u5E55\u3001\u6C34\u5370\u3001\u865A\u6784logo\u3001\u7B2C\u4E8C\u4E2A\u5546\u54C1\u6216\u672A\u5C55\u793A\u7684\u80CC\u9762/\u5185\u90E8\u7ED3\u6784\u3002",
    "",
    "\u5931\u8D25\u5904\u7406\uFF1A\u4FDD\u7559\u901A\u8FC7\u7684\u5206\u955C\u56FE\uFF0C\u53EA\u91CD\u751F\u6210\u5931\u8D25\u955C\u5934\uFF1B\u5982\u679C\u5546\u54C1\u5305\u88C5\u6216\u8138\u578B\u4ECD\u7136\u4E0D\u7A33\u5B9A\uFF0C\u5E94\u6539\u7528\u771F\u5B9E\u5546\u54C1\u56FE/\u4EBA\u7269\u5408\u6210\u6216\u5177\u5907 IP-Adapter\u3001FaceID\u3001ControlNet \u7684\u56FE\u50CF\u5DE5\u4F5C\u6D41\uFF0C\u518D\u628A\u5408\u683C\u9759\u5E27\u4EA4\u7ED9 Grok \u505A\u52A8\u753B\u3002"
  ].join("\n");
}
function GrokProductI2VContent({ ctx }) {
  const [busy, setBusy] = useState(null);
  const draft = readDraft(ctx);
  const inputImages = findInputImages(ctx);
  const referenceGroups = groupInputImages(inputImages, draft);
  const sourceImage = referenceGroups.product[0]?.node || null;
  const sourceLabel = referenceGroups.product[0]?.title || "\u5546\u54C1\u9996\u5E27";
  const hasCharacterReference = referenceGroups.person.length > 0;
  const output = metadataText(ctx.node.metadata, "content");
  const storyboardMarkdown = metadataText(ctx.node.metadata, "storyboardMarkdown");
  const positivePrompt = metadataText(ctx.node.metadata, "positivePrompt");
  const error = metadataText(ctx.node.metadata, "errorDetails");
  const storyboardNotice = metadataText(ctx.node.metadata, "storyboardNotice");
  const copyStatus = metadataText(ctx.node.metadata, "copyStatus");
  const textModels = useMemo(() => ctx.ai.listModels("text"), [ctx.ai]);
  const imageModels = useMemo(() => ctx.ai.listModels("image"), [ctx.ai]);
  const videoModels = useMemo(() => ctx.ai.listModels("video"), [ctx.ai]);
  const promptFields = /* @__PURE__ */ new Set(["brief", "productFacts", "mustKeep", "allowedChange", "forbidden", "sound", "duration", "ratio", "lockMode", "sceneCount", "characterMode", "imageModel", "productRefCount", "contentRefCount", "personRefCount", "styleRefCount"]);
  const setField = (key, value) => ctx.updateMetadata({ [key]: value, ...promptFields.has(key) ? { content: "", positivePrompt: "", negativePrompt: "", promptFingerprint: "", storyboardPlan: "", storyboardMarkdown: "", storyboardFingerprint: "", storyboardNotice: "" } : {} });
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
    const storedStoryboardFingerprint = metadataText(ctx.node.metadata, "storyboardFingerprint");
    if (storyboardMarkdown && storedStoryboardFingerprint && storedStoryboardFingerprint === storyboardFingerprint(draft)) return storyboardMarkdown;
    const storedFingerprint = metadataText(ctx.node.metadata, "promptFingerprint");
    return output && storedFingerprint && storedFingerprint === promptFingerprint(draft) ? output : fallback().content;
  };
  const storedStoryboard = parseStoredStoryboard(ctx.node.metadata?.storyboardPlan);
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
  const createStoryboard = async () => {
    if (!sourceImage) {
      ctx.updateMetadata({ status: "error", errorDetails: "\u8BF7\u5148\u628A\u5546\u54C1\u56FE\u7247\u8282\u70B9\u8FDE\u63A5\u5230\u672C\u8282\u70B9\u3002" });
      return;
    }
    if (draft.characterMode === "strict-person" && !hasCharacterReference) {
      ctx.updateMetadata({ status: "error", errorDetails: "\u4EBA\u7269\u9501\u5B9A\u6A21\u5F0F\u9700\u8981\u4EBA\u7269\u53C2\u8003\u56FE\u3002\u8BF7\u8BBE\u7F6E\u4EBA\u7269\u53C2\u8003\u56FE\u6570\u91CF\uFF0C\u6216\u7ED9\u4EBA\u7269\u56FE\u7247\u8282\u70B9\u6807\u9898\u52A0\u4E0A\u201C\u4EBA\u7269/\u6A21\u7279/\u4EBA\u50CF\u201D\u7B49\u5173\u952E\u8BCD\uFF1B\u8FDE\u63A5\u987A\u5E8F\u4E3A\u5546\u54C1 \u2192 \u5185\u5BB9\u7269 \u2192 \u4EBA\u7269 \u2192 \u98CE\u683C\u3002" });
      return;
    }
    const fallbackPlan = buildStoryboardFallback(draft, hasCharacterReference);
    const references = storyboardReferences(inputImages, draft);
    const storyboardGroups = groupInputImages(inputImages, draft);
    let plan = fallbackPlan;
    let planningNotice = "";
    setBusy("storyboard");
    ctx.updateMetadata({ status: "loading", errorDetails: "", storyboardNotice: "" });
    try {
      if (textModels.length) {
        try {
          const response = await ctx.ai.generateText(buildStoryboardAiPrompt(draft, fallbackPlan, hasCharacterReference, storyboardGroups), {
            system: STORYBOARD_SYSTEM,
            model: draft.textModel || void 0
          });
          const parsedPlan = parseStoryboardResponse(response.text, fallbackPlan);
          plan = normalizeStoryboardPlan(parsedPlan, draft, fallbackPlan);
        } catch (error2) {
          planningNotice = `AI \u5206\u955C\u89C4\u5212\u4E0D\u53EF\u7528\uFF0C\u5DF2\u4F7F\u7528\u4FDD\u5B88\u6A21\u677F\u7EE7\u7EED\u751F\u6210\uFF1A${errorMessage(error2)}`;
        }
      } else {
        planningNotice = "\u672A\u914D\u7F6E\u6587\u672C\u6A21\u578B\uFF0C\u5DF2\u4F7F\u7528\u4FDD\u5B88\u6A21\u677F\u751F\u6210\u5206\u955C\u3002";
      }
      for (let index = 0; index < plan.scenes.length; index += 1) {
        const scene = plan.scenes[index];
        const generated = await ctx.ai.generateImage(buildSceneFramePrompt(scene, draft, hasCharacterReference, storyboardGroups), {
          references,
          size: generationSize(draft.ratio),
          count: 1,
          model: draft.imageModel || void 0
        });
        const imageContent = generated.images[0];
        if (!imageContent) throw new Error(`\u955C\u5934 ${index + 1} \u6CA1\u6709\u8FD4\u56DE\u5206\u955C\u56FE\u3002`);
        const imageNodeId = `${PLUGIN_ID}-storyboard-${ctx.node.id}-${scene.id}-${Date.now()}`;
        const frameSize = draft.ratio === "9:16 \u7AD6\u7248" ? { width: 260, height: 462 } : draft.ratio === "1:1 \u65B9\u5F62" ? { width: 360, height: 360 } : { width: 420, height: 236 };
        const gridColumn = index % 3;
        const gridRow = Math.floor(index / 3);
        plan.scenes[index] = { ...scene, imageNodeId };
        ctx.applyOps([
          {
            type: "add_node",
            id: imageNodeId,
            nodeType: "image",
            title: `\u5206\u955C ${index + 1}\uFF5C${scene.title}`,
            x: ctx.node.position.x + ctx.node.width + 80 + gridColumn * (frameSize.width + 60),
            y: ctx.node.position.y + gridRow * (frameSize.height + 100),
            width: frameSize.width,
            height: frameSize.height,
            metadata: {
              content: imageContent,
              status: "success",
              mimeType: imageContent.match(/^data:([^;]+);/)?.[1] || "image/png",
              generationMode: "image",
              generationType: "edit",
              prompt: buildSceneFramePrompt(scene, draft, hasCharacterReference, storyboardGroups),
              storyboardOwnerId: ctx.node.id,
              storyboardSceneId: scene.id,
              storyboardSceneIndex: index,
              storyboardFingerprint: storyboardFingerprint(draft)
            }
          },
          { type: "connect_nodes", fromNodeId: ctx.node.id, toNodeId: imageNodeId }
        ]);
        ctx.updateMetadata({ storyboardPlan: JSON.stringify(plan) });
      }
      const markdown = renderStoryboardMarkdown(plan, sourceLabel, hasCharacterReference, draft, storyboardGroups);
      ctx.updateMetadata({
        content: markdown,
        storyboardMarkdown: markdown,
        storyboardPlan: JSON.stringify(plan),
        storyboardFingerprint: storyboardFingerprint(draft),
        status: "success",
        errorDetails: "",
        storyboardNotice: planningNotice
      });
    } catch (error2) {
      ctx.updateMetadata({ status: "error", errorDetails: `\u5206\u955C\u751F\u6210\u5931\u8D25\uFF1A${errorMessage(error2)}`, storyboardPlan: JSON.stringify(plan), storyboardFingerprint: storyboardFingerprint(draft), storyboardNotice: planningNotice });
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
      const generatedVideo = await ctx.ai.generateVideo(prompt, {
        references: [asString(sourceImage.metadata?.content)],
        seconds: normalizeSceneDuration(draft.duration, String(MAX_SCENE_SECONDS)),
        size: generationSize(draft.ratio),
        model: draft.videoModel || void 0
      });
      const composedVideo = await composeVideoUrls([generatedVideo.url], draft.ratio);
      const video = { ...generatedVideo, ...composedVideo };
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
          metadata: { content: video.url, status: "success", mimeType: video.mimeType, naturalWidth: video.width, naturalHeight: video.height, durationMs: video.durationMs, generationMode: "video", compositionMode: "local-canvas", sourceVideoUrl: generatedVideo.url }
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
  const generateStoryboardVideos = async () => {
    const plan = parseStoredStoryboard(ctx.node.metadata?.storyboardPlan);
    if (!plan) {
      ctx.updateMetadata({ status: "error", errorDetails: "\u8BF7\u5148\u70B9\u51FB\u201C\u4E00\u952E\u751F\u6210\u811A\u672C\u4E0E\u5206\u955C\u56FE\u201D\uFF0C\u5E76\u786E\u8BA4\u5206\u955C\u56FE\u5DF2\u7ECF\u751F\u6210\u3002" });
      return;
    }
    const imageNodes = ctx.getNodes().filter((node) => asString(node.metadata?.storyboardOwnerId) === ctx.node.id && Boolean(asString(node.metadata?.content)) && asString(node.metadata?.storyboardSceneId));
    const imageByScene = new Map(imageNodes.map((node) => [asString(node.metadata?.storyboardSceneId), node]));
    const missing = plan.scenes.filter((scene) => !imageByScene.get(scene.id));
    if (missing.length) {
      ctx.updateMetadata({ status: "error", errorDetails: `\u7F3A\u5C11 ${missing.length} \u5F20\u5206\u955C\u9996\u5E27\uFF0C\u8BF7\u91CD\u65B0\u751F\u6210\u5206\u955C\u56FE\u3002` });
      return;
    }
    setBusy("videos");
    ctx.updateMetadata({ status: "loading", errorDetails: "", videoBatchStatus: "\u751F\u6210\u4E2D" });
    let completed = 0;
    const failures = [];
    const clips = [];
    try {
      for (let index = 0; index < plan.scenes.length; index += 1) {
        const scene = plan.scenes[index];
        const imageNode = imageByScene.get(scene.id);
        if (!imageNode) continue;
        try {
          const video = await ctx.ai.generateVideo(buildSceneVideoPrompt(scene, draft, hasCharacterReference), {
            references: [asString(imageNode.metadata?.content)],
            seconds: normalizeSceneDuration(scene.duration, draft.duration),
            size: generationSize(draft.ratio),
            model: draft.videoModel || void 0
          });
          const videoNodeId = `${PLUGIN_ID}-storyboard-video-${ctx.node.id}-${scene.id}-${Date.now()}`;
          const frameWidth = imageNode.width || 420;
          const videoSize = videoNodeSize(draft.ratio);
          ctx.applyOps([
            {
              type: "add_node",
              id: videoNodeId,
              nodeType: "video",
              title: `Grok \u89C6\u9891 ${index + 1}\uFF5C${scene.title}`,
              x: imageNode.position.x + frameWidth + 60,
              y: imageNode.position.y,
              width: videoSize.width,
              height: videoSize.height,
              metadata: {
                content: video.url,
                status: "success",
                mimeType: video.mimeType,
                naturalWidth: video.width,
                naturalHeight: video.height,
                durationMs: video.durationMs,
                storyboardOwnerId: ctx.node.id,
                storyboardSceneId: scene.id,
                storyboardSceneIndex: index,
                storyboardImageNodeId: imageNode.id,
                generationMode: "video",
                prompt: buildSceneVideoPrompt(scene, draft, hasCharacterReference)
              }
            },
            { type: "connect_nodes", fromNodeId: imageNode.id, toNodeId: videoNodeId }
          ]);
          clips.push({
            nodeId: videoNodeId,
            url: video.url,
            sceneId: scene.id,
            sceneTitle: scene.title,
            mimeType: video.mimeType,
            width: video.width,
            height: video.height,
            durationMs: video.durationMs
          });
          completed += 1;
          ctx.updateMetadata({ videoBatchStatus: `\u5DF2\u5B8C\u6210 ${completed}/${plan.scenes.length}` });
        } catch (error2) {
          failures.push(`\u955C\u5934 ${index + 1}\u300C${scene.title}\u300D\uFF1A${errorMessage(error2)}`);
        }
      }
      let finalVideoNodeId = "";
      if (!failures.length && clips.length) {
        ctx.updateMetadata({ videoBatchStatus: `\u5DF2\u5B8C\u6210 ${completed}/${plan.scenes.length}\uFF0C\u6B63\u5728\u5408\u6210\u6700\u7EC8 ${draft.ratio} \u89C6\u9891\u2026`, videoCompositionStatus: "composing" });
        try {
          const composed = await composeVideoUrls(clips.map((clip) => clip.url), draft.ratio);
          const finalSize = videoNodeSize(draft.ratio);
          finalVideoNodeId = `${PLUGIN_ID}-storyboard-final-${ctx.node.id}-${Date.now()}`;
          ctx.applyOps([
            {
              type: "add_node",
              id: finalVideoNodeId,
              nodeType: "video",
              title: "Grok \u6700\u7EC8\u5408\u6210\u89C6\u9891\uFF08" + draft.duration + " \u79D2\uFF09",
              x: ctx.node.position.x + ctx.node.width + 80 + finalSize.width + 80,
              y: ctx.node.position.y + 760,
              width: finalSize.width,
              height: finalSize.height,
              metadata: {
                content: composed.url,
                status: "success",
                mimeType: composed.mimeType,
                naturalWidth: composed.width,
                naturalHeight: composed.height,
                durationMs: composed.durationMs,
                generationMode: "video",
                compositionMode: "local-canvas",
                compositionRatio: draft.ratio,
                totalDurationSeconds: Number(draft.duration),
                sourceVideoNodeIds: clips.map((clip) => clip.nodeId)
              }
            },
            { type: "connect_nodes", fromNodeId: ctx.node.id, toNodeId: finalVideoNodeId },
            ...clips.map((clip) => ({ type: "connect_nodes", fromNodeId: clip.nodeId, toNodeId: finalVideoNodeId }))
          ]);
          ctx.updateMetadata({ videoCompositionStatus: "success", finalVideoNodeId, videoCompositionMimeType: composed.mimeType });
        } catch (error2) {
          failures.push("\u81EA\u52A8\u5408\u6210\u6700\u7EC8\u89C6\u9891\uFF1A" + errorMessage(error2));
          ctx.updateMetadata({ videoCompositionStatus: "error", videoCompositionError: errorMessage(error2) });
        }
      }
      const statusText = `\u5DF2\u5B8C\u6210 ${completed}/${plan.scenes.length}`;
      ctx.updateMetadata({
        status: failures.length ? "error" : "success",
        videoBatchStatus: statusText,
        errorDetails: failures.length ? `${statusText}\uFF1B\u5931\u8D25\u9879\uFF1A${failures.join("\uFF1B")}` : ""
      });
      if (finalVideoNodeId) ctx.updateMetadata({ videoBatchStatus: statusText + "\uFF0C\u5DF2\u5408\u6210\u6700\u7EC8\u89C6\u9891", finalVideoNodeId });
    } finally {
      setBusy(null);
    }
  };
  const createQualityChecklist = () => {
    const plan = parseStoredStoryboard(ctx.node.metadata?.storyboardPlan);
    const id = `${PLUGIN_ID}-qa-${Date.now()}`;
    ctx.applyOps([
      {
        type: "add_node",
        id,
        nodeType: "text",
        title: "Grok \u89C6\u9891\u8D28\u68C0\u6E05\u5355",
        x: ctx.node.position.x + ctx.node.width + 80,
        y: ctx.node.position.y + 760,
        width: 620,
        height: 420,
        metadata: { content: buildQualityChecklist(plan), status: "success", fontSize: 14 }
      },
      { type: "connect_nodes", fromNodeId: ctx.node.id, toNodeId: id }
    ]);
  };
  const copy = async (value) => {
    const ok = await copyText(value);
    ctx.updateMetadata({ copyStatus: ok ? "\u5DF2\u590D\u5236" : "\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9\u6587\u672C\u590D\u5236" });
    window.setTimeout(() => ctx.updateMetadata({ copyStatus: "" }), 1800);
  };
  const copyNativeXaiScript = () => void copy(XAI_NATIVE_VIDEO_SCRIPT);
  const copyNewApiScript = () => void copy(NEW_API_VIDEO_SCRIPT);
  const buttonStyle = { border: `1px solid ${ctx.theme.node.stroke}`, borderRadius: 8, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, padding: "6px 9px", cursor: "pointer", fontSize: 12 };
  const primaryButtonStyle = { ...buttonStyle, border: "1px solid #7c3aed", background: "#7c3aed", color: "#fff" };
  const inputStyle = { width: "100%", boxSizing: "border-box", border: `1px solid ${ctx.theme.node.stroke}`, borderRadius: 7, background: ctx.theme.node.panel, color: ctx.theme.node.text, padding: "7px 8px", fontSize: 12, outline: "none" };
  const labelStyle = { color: ctx.theme.node.muted, fontSize: 11, marginBottom: 3, display: "block" };
  return /* @__PURE__ */ jsxs("div", { "data-canvas-no-zoom": true, onWheel: stopCanvas, style: { height: "100%", width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 8, padding: 12, color: ctx.theme.node.text, overflow: "hidden" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: 14 }, children: "Grok \u5546\u54C1\u56FE\u751F\u89C6\u9891" }),
      /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: sourceImage ? "#16a34a" : "#d97706" }, children: sourceImage ? "\u9996\u5E27\u5DF2\u63A5\u5165" : "\u7B49\u5F85\u5546\u54C1\u56FE" })
    ] }),
    inputImages.length ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 5, padding: 6, borderRadius: 8, background: ctx.theme.toolbar.panel }, children: [
      referenceGroupEntries(referenceGroups).map(({ input, role }) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
        /* @__PURE__ */ jsx("img", { src: input.content, alt: input.title, style: { width: 42, height: 34, borderRadius: 5, objectFit: "contain", background: "#fff" } }),
        /* @__PURE__ */ jsxs("div", { style: { minWidth: 0, fontSize: 11, color: ctx.theme.node.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
          referenceRoleLabel(role),
          "\u53C2\u8003\u56FE\uFF1A",
          input.title
        ] })
      ] }, input.node.id)),
      referenceGroups.unassigned.map((input) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
        /* @__PURE__ */ jsx("img", { src: input.content, alt: input.title, style: { width: 42, height: 34, borderRadius: 5, objectFit: "contain", background: "#fff" } }),
        /* @__PURE__ */ jsxs("div", { style: { minWidth: 0, fontSize: 11, color: "#d97706", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: [
          "\u672A\u5206\u7EC4\u53C2\u8003\u56FE\uFF1A",
          input.title
        ] })
      ] }, input.node.id)),
      referenceGroups.unassigned.length ? /* @__PURE__ */ jsx("div", { style: { color: "#d97706", fontSize: 10, lineHeight: 1.35 }, children: "\u6709\u56FE\u7247\u672A\u843D\u5165\u56DB\u7EC4\uFF0C\u4ECD\u4F1A\u4F20\u7ED9\u5206\u955C\u6A21\u578B\uFF0C\u4F46\u5EFA\u8BAE\u586B\u5199\u5404\u7EC4\u6570\u91CF\u6216\u7ED9\u56FE\u7247\u8282\u70B9\u6807\u9898\u52A0\u4E0A\u89D2\u8272\u5173\u952E\u8BCD\u3002" }) : null
    ] }) : /* @__PURE__ */ jsx("div", { style: { padding: 8, borderRadius: 8, background: "#f59e0b14", color: ctx.theme.node.muted, fontSize: 11, lineHeight: 1.45 }, children: "\u628A\u753B\u5E03\u91CC\u7684\u5546\u54C1\u56FE\u7247\u8282\u70B9\u8FDE\u63A5\u5230\u672C\u8282\u70B9\u3002\u811A\u672C\u53EF\u4EE5\u5148\u751F\u6210\uFF0C\u4F46\u751F\u6210\u5206\u955C\u56FE\u548C\u89C6\u9891\u90FD\u9700\u8981\u5546\u54C1\u56FE\u3002" }),
    /* @__PURE__ */ jsx("div", { style: { padding: 7, borderRadius: 8, background: "#2563eb12", color: ctx.theme.node.muted, fontSize: 10, lineHeight: 1.45 }, children: "\u53C2\u8003\u56FE\u6309\u56DB\u7EC4\u8FDE\u63A5\uFF1A\u5546\u54C1 \u2192 \u5185\u5BB9\u7269 \u2192 \u4EBA\u7269 \u2192 \u98CE\u683C\uFF1B\u6BCF\u7EC4\u6700\u591A 3 \u5F20\u3002\u586B\u5199\u4E0B\u9762\u7684\u6570\u91CF\u540E\uFF0C\u672A\u6807\u6CE8\u56FE\u7247\u6309\u7EC4\u987A\u5E8F\u5F52\u7C7B\uFF1B\u56FE\u7247\u6807\u9898\u542B\u201C\u5185\u5BB9\u7269/\u4EBA\u7269/\u98CE\u683C\u201D\u7B49\u5173\u952E\u8BCD\u65F6\u4F1A\u81EA\u52A8\u8BC6\u522B\u3002\u4EBA\u7269\u548C\u98CE\u683C\u56FE\u4E0D\u80FD\u66FF\u4EE3\u5546\u54C1\u56FE\u3002" }),
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }, children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { style: labelStyle, children: "\u5546\u54C1\u53C2\u8003\u56FE\uFF081\u20133 \u5F20\uFF09" }),
        /* @__PURE__ */ jsx("input", { type: "number", min: 1, max: 3, step: 1, value: draft.productRefCount, onChange: (event) => setField("productRefCount", event.target.value), onMouseDown: stopCanvas, style: inputStyle })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { style: labelStyle, children: "\u5185\u5BB9\u7269\u53C2\u8003\u56FE\uFF080\u20133 \u5F20\uFF09" }),
        /* @__PURE__ */ jsx("input", { type: "number", min: 0, max: 3, step: 1, value: draft.contentRefCount, onChange: (event) => setField("contentRefCount", event.target.value), onMouseDown: stopCanvas, style: inputStyle })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { style: labelStyle, children: "\u4EBA\u7269\u53C2\u8003\u56FE\uFF080\u20133 \u5F20\uFF09" }),
        /* @__PURE__ */ jsx("input", { type: "number", min: 0, max: 3, step: 1, value: draft.personRefCount, onChange: (event) => setField("personRefCount", event.target.value), onMouseDown: stopCanvas, style: inputStyle })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { style: labelStyle, children: "\u98CE\u683C\u53C2\u8003\u56FE\uFF080\u20133 \u5F20\uFF09" }),
        /* @__PURE__ */ jsx("input", { type: "number", min: 0, max: 3, step: 1, value: draft.styleRefCount, onChange: (event) => setField("styleRefCount", event.target.value), onMouseDown: stopCanvas, style: inputStyle })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { color: ctx.theme.node.muted, fontSize: 10, lineHeight: 1.4 }, children: "\u672A\u4FEE\u6539\u6570\u91CF\u65F6\u517C\u5BB9\u65E7\u8282\u70B9\u987A\u5E8F\uFF1A\u5546\u54C1 \u2192\uFF08\u4E25\u683C\u4EBA\u7269\u6A21\u5F0F\u65F6\u4EBA\u7269\uFF09\u2192 \u98CE\u683C\uFF1B\u4FEE\u6539\u4EFB\u610F\u4E00\u9879\u6570\u91CF\u540E\u542F\u7528\u56DB\u7EC4\u7CBE\u786E\u5206\u914D\u3002\u6BCF\u7EC4\u6700\u591A 3 \u5F20\uFF0C\u8D85\u51FA\u7684\u56FE\u7247\u4F1A\u6807\u8BB0\u4E3A\u672A\u5206\u7EC4\u5E76\u7EE7\u7EED\u4F5C\u4E3A\u8865\u5145\u53C2\u8003\u4F20\u5165\u3002" }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("label", { style: labelStyle, children: "\u89C6\u9891\u76EE\u6807 / \u4E3B\u52A8\u4F5C" }),
      /* @__PURE__ */ jsx("textarea", { value: draft.brief, placeholder: "\u4F8B\u5982\uFF1A\u8BA9\u74F6\u8EAB\u9AD8\u5149\u4ECE\u5DE6\u5411\u53F3\u626B\u8FC7\uFF0C\u955C\u5934\u8F7B\u5FAE\u63A8\u8FD1\uFF0C\u5546\u54C1\u4FDD\u6301\u7A33\u5B9A\u3002", onChange: (event) => setField("brief", event.target.value), onMouseDown: stopCanvas, onWheel: stopCanvas, style: { ...inputStyle, minHeight: 54, resize: "vertical", lineHeight: 1.4 } })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }, children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { style: labelStyle, children: "\u603B\u65F6\u957F\uFF082\u201360 \u79D2\uFF09" }),
        /* @__PURE__ */ jsx("input", { type: "number", min: 2, max: 60, step: 1, value: draft.duration, onChange: (event) => setField("duration", event.target.value), onMouseDown: stopCanvas, style: inputStyle })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { style: labelStyle, children: "\u753B\u5E45" }),
        /* @__PURE__ */ jsx("select", { value: draft.ratio, onChange: (event) => setField("ratio", event.target.value), onMouseDown: stopCanvas, style: inputStyle, children: ["\u4FDD\u6301\u9996\u5E27\u753B\u5E45", "9:16 \u7AD6\u7248", "16:9 \u6A2A\u7248", "1:1 \u65B9\u5F62"].map((value) => /* @__PURE__ */ jsx("option", { value, children: value }, value)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { style: labelStyle, children: "\u5206\u955C\u6570\uFF08\u81EA\u586B\uFF0C1\u201320\uFF09" }),
        /* @__PURE__ */ jsx("input", { type: "number", min: 1, max: 20, step: 1, value: draft.sceneCount, onChange: (event) => setField("sceneCount", event.target.value), onMouseDown: stopCanvas, style: inputStyle })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { style: labelStyle, children: "\u4EBA\u7269\u4E00\u81F4\u6027" }),
        /* @__PURE__ */ jsxs("select", { value: draft.characterMode, onChange: (event) => setField("characterMode", event.target.value), onMouseDown: stopCanvas, style: inputStyle, children: [
          /* @__PURE__ */ jsx("option", { value: "product-only", children: "\u5546\u54C1\u5C55\u793A\uFF1A\u4E0D\u52A0\u4EBA\u7269" }),
          /* @__PURE__ */ jsx("option", { value: "strict-person", children: "\u4EBA\u7269\u9501\u5B9A\uFF1A\u5FC5\u987B\u8FDE\u63A5\u4EBA\u7269\u53C2\u8003\u56FE\u7EC4" }),
          /* @__PURE__ */ jsx("option", { value: "free-person", children: "\u4EBA\u7269\u81EA\u7531\u751F\u6210\uFF1A\u4E0D\u4FDD\u8BC1\u8138\u578B" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { color: ctx.theme.node.muted, fontSize: 10, lineHeight: 1.4 }, children: "\u603B\u65F6\u957F\u662F\u6700\u7EC8\u6210\u7247\u65F6\u957F\uFF1BGrok/\u6E20\u9053\u5355\u6BB5\u6700\u591A\u6309 15 \u79D2\u8BF7\u6C42\uFF0C\u63D2\u4EF6\u4F1A\u81EA\u52A8\u5206\u6BB5\u5E76\u5728\u6D4F\u89C8\u5668\u672C\u5730\u5408\u6210\u4E3A\u4E00\u4E2A\u89C6\u9891\u3002\u82E5\u8981\u6C42\u5355\u6BB5 15 \u79D2\uFF0C\u8BF7\u5C06\u5206\u955C\u6570\u586B\u4E3A 1\u3002" }),
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
      /* @__PURE__ */ jsx("button", { type: "button", onMouseDown: stopCanvas, onClick: () => void createStoryboard(), style: primaryButtonStyle, disabled: busy !== null || !sourceImage, children: busy === "storyboard" ? "\u811A\u672C\u4E0E\u5206\u955C\u751F\u6210\u4E2D\u2026" : "\u4E00\u952E\u751F\u6210\u811A\u672C\u4E0E\u5206\u955C\u56FE" }),
      /* @__PURE__ */ jsx("button", { type: "button", onMouseDown: stopCanvas, onClick: () => void generateStoryboardVideos(), style: buttonStyle, disabled: busy !== null || !storedStoryboard, children: busy === "videos" ? "\u751F\u6210\u5E76\u5408\u6210\u89C6\u9891\u4E2D\u2026" : "\u4E00\u952E\u751F\u6210\u89C6\u9891\uFF08\u5206\u955C+\u81EA\u52A8\u5408\u6210\uFF09" }),
      /* @__PURE__ */ jsx("button", { type: "button", onMouseDown: stopCanvas, onClick: createTextOutput, style: buttonStyle, disabled: busy !== null, children: "\u8F93\u51FA\u6B63\u5411\u63D0\u793A\u8BCD" }),
      /* @__PURE__ */ jsx("button", { type: "button", onMouseDown: stopCanvas, onClick: createQualityChecklist, style: buttonStyle, disabled: busy !== null, children: "\u8F93\u51FA\u8D28\u68C0\u6E05\u5355" }),
      /* @__PURE__ */ jsx("button", { type: "button", onMouseDown: stopCanvas, onClick: copyNativeXaiScript, style: buttonStyle, disabled: busy !== null, children: "\u590D\u5236\u539F\u751F xAI \u811A\u672C" }),
      /* @__PURE__ */ jsx("button", { type: "button", onMouseDown: stopCanvas, onClick: copyNewApiScript, style: buttonStyle, disabled: busy !== null, children: "\u590D\u5236 New API \u5206\u53D1\u811A\u672C" }),
      /* @__PURE__ */ jsx("button", { type: "button", onMouseDown: stopCanvas, onClick: () => void generateVideo(), style: buttonStyle, disabled: busy !== null || !sourceImage, children: busy === "video" ? "\u5355\u955C\u5934\u751F\u6210\u4E2D\u2026" : "\u751F\u6210\u5355\u955C\u5934\u89C6\u9891\uFF08\u539F\u5546\u54C1\u9996\u5E27\uFF09" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }, children: [
      /* @__PURE__ */ jsxs("select", { value: draft.textModel, onChange: (event) => setField("textModel", event.target.value), onMouseDown: stopCanvas, style: inputStyle, "aria-label": "\u6587\u672C\u6A21\u578B", children: [
        /* @__PURE__ */ jsx("option", { value: "", children: "\u6587\u672C\u6A21\u578B\uFF1A\u5F53\u524D\u9ED8\u8BA4" }),
        textModels.map((model) => /* @__PURE__ */ jsx("option", { value: model.value, children: model.label }, model.value))
      ] }),
      /* @__PURE__ */ jsxs("select", { value: draft.imageModel, onChange: (event) => setField("imageModel", event.target.value), onMouseDown: stopCanvas, style: inputStyle, "aria-label": "\u5206\u955C\u56FE\u6A21\u578B", children: [
        /* @__PURE__ */ jsx("option", { value: "", children: "\u5206\u955C\u56FE\u6A21\u578B\uFF1A\u5F53\u524D\u9ED8\u8BA4" }),
        imageModels.map((model) => /* @__PURE__ */ jsx("option", { value: model.value, children: model.label }, model.value))
      ] }),
      /* @__PURE__ */ jsxs("select", { value: draft.videoModel, onChange: (event) => setField("videoModel", event.target.value), onMouseDown: stopCanvas, style: inputStyle, "aria-label": "\u89C6\u9891\u6A21\u578B", children: [
        /* @__PURE__ */ jsx("option", { value: "", children: "\u89C6\u9891\u6A21\u578B\uFF1A\u5F53\u524D\u9ED8\u8BA4" }),
        videoModels.map((model) => /* @__PURE__ */ jsx("option", { value: model.value, children: model.label }, model.value))
      ] })
    ] }),
    error ? /* @__PURE__ */ jsx("div", { style: { color: "#dc2626", fontSize: 11, lineHeight: 1.4 }, children: error }) : null,
    storyboardNotice ? /* @__PURE__ */ jsx("div", { style: { color: "#b45309", fontSize: 11, lineHeight: 1.4 }, children: storyboardNotice }) : null,
    copyStatus ? /* @__PURE__ */ jsx("div", { style: { color: "#16a34a", fontSize: 11 }, children: copyStatus }) : null,
    /* @__PURE__ */ jsxs("div", { style: { minHeight: 0, flex: 1, display: "flex", flexDirection: "column", gap: 6 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }, children: [
        /* @__PURE__ */ jsx("span", { style: { color: ctx.theme.node.muted, fontSize: 11 }, children: "\u811A\u672C / \u5206\u955C\u9884\u89C8" }),
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
  version: "0.6.0",
  description: "\u628A\u5546\u54C1\u56FE\u548C\u6548\u679C\u63CF\u8FF0\u62C6\u6210\u811A\u672C\u3001\u5206\u955C\u9996\u5E27\u4E0E Grok \u9010\u955C\u5934\u56FE\u751F\u89C6\u9891\uFF0C\u5E76\u63D0\u4F9B\u5546\u54C1/\u4EBA\u7269\u4E00\u81F4\u6027\u7EA6\u675F\u4E0E\u8D28\u68C0\u6E05\u5355\u3002",
  nodes: [
    {
      type: `${PLUGIN_ID}:prompt`,
      title: "Grok \u5546\u54C1\u56FE\u751F\u89C6\u9891",
      icon: "\u{1F3AC}",
      description: "\u5546\u54C1\u56FE \u2192 \u811A\u672C\u4E0E\u5206\u955C\u9996\u5E27 \u2192 Grok \u9010\u955C\u5934\u89C6\u9891 \u2192 \u8D28\u68C0",
      defaultSize: { width: 520, height: 820 },
      defaultMetadata: { brief: "", productFacts: "", mustKeep: "", allowedChange: "", forbidden: "", sound: DEFAULT_SOUND, duration: DEFAULT_DURATION, ratio: DEFAULT_RATIO, lockMode: DEFAULT_LOCK_MODE, textModel: "", imageModel: "", videoModel: "", sceneCount: DEFAULT_SCENE_COUNT, characterMode: DEFAULT_CHARACTER_MODE, content: "", positivePrompt: "", negativePrompt: "", promptFingerprint: "", storyboardPlan: "", storyboardMarkdown: "", storyboardFingerprint: "", status: "idle" },
      minimapColor: "#7c3aed",
      hidePanel: true,
      resource: (node) => ({ kind: "text", text: asString(node.metadata?.storyboardMarkdown) || asString(node.metadata?.positivePrompt) || asString(node.metadata?.content) }),
      Content: GrokProductI2VContent
    }
  ]
});
export {
  NEW_API_VIDEO_SCRIPT,
  XAI_NATIVE_VIDEO_SCRIPT,
  buildNegativePrompt,
  buildPromptResult,
  buildSceneVideoPrompt,
  buildStoryboardAiPrompt,
  buildStoryboardFallback,
  index_default as default,
  distributeSceneDurations,
  effectiveSceneCount,
  groupInputImages,
  normalizeDuration,
  normalizeReferenceCount,
  normalizeSceneCount,
  parseStoryboardResponse,
  promptFingerprint,
  referenceRoleHint,
  storyboardFingerprint
};
