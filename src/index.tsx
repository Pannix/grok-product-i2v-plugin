import { definePlugin, useMemo, useState } from "@infinite-canvas/plugin-sdk";
import type { CanvasNodeContentProps, CanvasNodeData, CanvasNodeMetadata } from "@infinite-canvas/plugin-sdk";

type Draft = {
    brief: string;
    productFacts: string;
    mustKeep: string;
    allowedChange: string;
    forbidden: string;
    sound: string;
    duration: string;
    ratio: string;
    lockMode: string;
    textModel: string;
    imageModel: string;
    videoModel: string;
    sceneCount: string;
    characterMode: string;
};

type PromptResult = {
    content: string;
    positivePrompt: string;
    negativePrompt: string;
};

type StoryboardScene = {
    id: string;
    title: string;
    purpose: string;
    duration: string;
    framePrompt: string;
    videoPrompt: string;
    negativePrompt: string;
    imageNodeId?: string;
};

type StoryboardPlan = {
    title: string;
    summary: string;
    productLock: string;
    characterLock: string;
    continuity: string;
    scenes: StoryboardScene[];
};

type InputImage = {
    node: CanvasNodeData;
    content: string;
    title: string;
};

const PLUGIN_ID = "grok-product-i2v";
const DEFAULT_DURATION = "6";
const DEFAULT_RATIO = "保持首帧画幅";
const DEFAULT_LOCK_MODE = "strict";
const DEFAULT_SOUND = "轻微真实环境声或材质摩擦声；不要旁白、不要台词、不要音乐抢主体。";
const DEFAULT_SCENE_COUNT = "3";
const DEFAULT_CHARACTER_MODE = "product-only";

const XAI_NATIVE_VIDEO_SCRIPT = `// 原生 xAI Grok Image-to-Video：必须把首帧放进 image 字段
const source = images[0];
if (!source) throw new Error("请先连接商品首帧图片");

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
if (!requestId) throw new Error("xAI 视频接口没有返回 request_id");

return await poll(
  () => request({
    method: "get",
    url: root + "/v1/videos/" + requestId,
    headers: { Authorization: "Bearer " + apiKey },
  }),
  (state) => {
    if (state.status === "done") {
      const url = state.video?.url || state.video_url || state.url;
      if (!url) throw new Error("xAI 视频任务完成但没有返回视频地址");
      return { url };
    }
    if (state.status === "failed" || state.status === "expired" || state.status === "cancelled") {
      throw new Error(state.error?.message || "xAI 视频任务 " + state.status);
    }
    return null;
  },
  { intervalMs: 5000, timeoutMs: 600000 },
);`;

const NEW_API_VIDEO_SCRIPT = `// New API / 分发网关版 Grok Image-to-Video：使用 image 字符串传入首帧
const source = images[0];
if (!source) throw new Error("请先连接商品首帧图片");

const trimmedBaseUrl = baseUrl.replace(/\\/+$/, "");
const apiRoot = trimmedBaseUrl.endsWith("/v1") ? trimmedBaseUrl : trimmedBaseUrl + "/v1";
const headers = { "Content-Type": "application/json", Authorization: "Bearer " + apiKey };
const sizeMatch = typeof params.size === "string" ? params.size.match(/^(\\d+)x(\\d+)$/) : null;
const width = sizeMatch ? Number(sizeMatch[1]) : undefined;
const height = sizeMatch ? Number(sizeMatch[2]) : undefined;

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
  },
});

const taskId = task.task_id || task.id || task.data?.task_id || task.data?.id;
if (!taskId) throw new Error("分发视频接口没有返回 task_id");

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
        throw new Error("分发视频任务完成但没有返回视频地址；返回字段：" + topLevelKeys + (dataKeys ? "；data 字段：" + dataKeys : ""));
      }
      let url = urlValue;
      try { url = new URL(urlValue, apiRoot).toString(); } catch {}
      return { url };
    }
    if (["failed", "error", "expired", "cancelled", "canceled"].includes(status)) {
      throw new Error(state.error?.message || state.data?.error?.message || state.message || "分发视频任务 " + status);
    }
    return null;
  },
  { intervalMs: 5000, timeoutMs: 600000 },
);`;

const AI_SYSTEM = `你是商品图生视频提示词编导。你只能依据用户提供的事实和“首帧商品图作为唯一商品事实基准”来写提示词，不要臆测品牌、型号、材质、背面、底部、内部结构或不可见文字。

必须遵守：
1. 商品身份、轮廓、比例、颜色、材质、包装、配件、可见文字和画面布局优先保持不变。
2. 每条视频只安排一个主动作，动作在前半段发生，后半段稳定收尾。
3. 明确写出时间轴、镜头运动、连续性约束、声音和后期限制。
4. 不要新增手、人物、道具、字幕、水印、品牌或装饰，不要让商品变形、漂浮、重复、闪烁或改款。
5. 如果输入事实不足，使用“以首帧可见内容为准”的约束，不要补写不存在的商品细节。

请只返回严格 JSON，不要 Markdown 代码围栏：
{"positivePrompt":"可直接给 Grok 图生视频模型的正向提示词","negativePrompt":"逗号分隔的动态负面提示词","scriptMarkdown":"完整中文脚本，包含目标、设置、首帧/商品锁定、时间轴、镜头、声音、正向提示词和动态负面提示词"}`;

const STORYBOARD_SYSTEM = `你是商品广告的分镜编导。请把用户的商品展示目标拆成 2 到 4 个短镜头，每个镜头只承担一个主要任务。

规则：
1. 商品参考图是商品身份、包装、轮廓、颜色、比例、logo、可见文字和材质的唯一事实基准；不得创造或改写商品事实。
2. 如果启用人物锁定，人物参考图只用于保持同一人的脸型、五官比例、发型和外观，不要凭空改变人物身份；人物参考图缺失时，不要声称脸型已锁定。
3. 每个镜头必须给出可生成的静态分镜首帧提示词，以及只描述后续变化的 Grok 图生视频动作提示词。静态图负责构图、光线和身份，视频提示词只负责动作、镜头变化和声音。
4. 每个镜头只安排一个主动作，尽量使用 2 到 6 秒的短镜头；明确手、人物、商品的接触关系，避免遮挡、穿模和不可能的物理关系。
5. 不要补写首帧没有展示的商品背面、底部、内部结构或不可读文字；不要生成字幕、水印、第二个商品或新的包装版式。

只返回严格 JSON，不要 Markdown 代码围栏：
{"title":"短片标题","summary":"整体叙事","productLock":"商品锁定规则","characterLock":"人物锁定规则","continuity":"镜头间连续性规则","scenes":[{"id":"s1","title":"镜头标题","purpose":"镜头任务","duration":"4","framePrompt":"分镜静帧提示词","videoPrompt":"只描述从该静帧开始发生的动作、镜头和声音","negativePrompt":"针对本镜头的动态负面提示词"}]}`;

function asString(value: unknown, fallback = "") {
    return typeof value === "string" ? value : fallback;
}

function metadataText(metadata: CanvasNodeMetadata | undefined, key: string, fallback = "") {
    return asString(metadata?.[key], fallback);
}

function readDraft(ctx: CanvasNodeContentProps["ctx"]): Draft {
    const metadata = ctx.node.metadata;
    const upstreamBrief = ctx
        .getUpstream()
        .filter((node) => node.type === "text" || node.type === "markdown:doc")
        .map((node) => asString(node.metadata?.content).trim())
        .filter(Boolean)
        .join("\n");

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
    };
}

function isImageNode(node: CanvasNodeData) {
    const mimeType = asString(node.metadata?.mimeType);
    const content = asString(node.metadata?.content);
    return node.type === "image" || mimeType.startsWith("image/") || content.startsWith("data:image/");
}

function findFirstImage(ctx: CanvasNodeContentProps["ctx"]) {
    return findInputImages(ctx)[0]?.node || null;
}

function findInputImages(ctx: CanvasNodeContentProps["ctx"]): InputImage[] {
    return ctx
        .getUpstream()
        .filter((node) => isImageNode(node))
        .map((node) => ({ node, content: asString(node.metadata?.content), title: node.title || "图片参考" }))
        .filter((item) => Boolean(item.content));
}

function normalizeDuration(value: string) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return DEFAULT_DURATION;
    return String(Math.min(15, Math.max(2, Math.round(parsed))));
}

function normalizeSceneCount(value: string) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_SCENE_COUNT;
    return String(Math.min(4, Math.max(2, parsed)));
}

function normalizeSceneDuration(value: string, fallback = "4") {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return fallback;
    return String(Math.min(10, Math.max(2, Math.round(parsed))));
}

function ratioInstruction(ratio: string) {
    if (ratio === "9:16 竖版") return "输出 9:16 竖版构图，主体完整不裁切，商品底部留安全边距。";
    if (ratio === "16:9 横版") return "输出 16:9 横版构图，保持商品主体完整并留出呼吸空间。";
    if (ratio === "1:1 方形") return "输出 1:1 方形构图，主体居中且不被裁切。";
    return "保持首帧商品图的画幅、构图和主体位置，不擅自改比例。";
}

function generationSize(ratio: string) {
    if (ratio === "9:16 竖版") return "720x1280";
    if (ratio === "16:9 横版") return "1280x720";
    if (ratio === "1:1 方形") return "1024x1024";
    return undefined;
}

function videoNodeSize(ratio: string) {
    if (ratio === "9:16 竖版") return { width: 360, height: 640 };
    if (ratio === "1:1 方形") return { width: 420, height: 420 };
    return { width: 420, height: 236 };
}

function primaryAction(brief: string) {
    const normalized = brief.replace(/\s+/g, " ").trim();
    if (!normalized) return "保持商品主体稳定，让一束柔和高光从左向右扫过商品表面，展示材质与轮廓。";
    const firstSentence = normalized.split(/[。！？!?；;\n]/)[0].trim();
    const firstClause = firstSentence.split(/(?:并且|同时|然后|再加上|以及)/)[0].trim();
    return firstClause || firstSentence || normalized;
}

function cameraInstruction(brief: string) {
    const text = brief.toLowerCase();
    if (/推近|推进|靠近|push.?in|zoom.?in/.test(text)) return "镜头做缓慢、连续、可控的推近，幅度约 3%–5%，焦点始终锁定商品主体。";
    if (/拉远|后退|pull.?back|zoom.?out/.test(text)) return "镜头做缓慢、连续、可控的拉远，保持商品主体完整和画面稳定。";
    if (/环绕|绕拍|arc|orbit/.test(text)) return "镜头只做小幅、平滑的弧线环绕，不越过首帧未展示的背面，不改变商品结构。";
    if (/摇镜|横移|pan|track/.test(text)) return "镜头做轻微、平滑的横向移动，商品主体保持在安全构图内，不突然变焦。";
    return "镜头保持稳定，并做极轻微的 2% 推近；不跳切、不突然变焦、不改变首帧构图关系。";
}

function splitLines(value: string) {
    return value
        .split(/[\n,，;；]/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function promptFingerprint(draft: Draft) {
    return [draft.brief, draft.productFacts, draft.mustKeep, draft.allowedChange, draft.forbidden, draft.sound, draft.duration, draft.ratio, draft.lockMode, draft.sceneCount, draft.characterMode].join("\u241f");
}

function storyboardFingerprint(draft: Draft) {
    return `${promptFingerprint(draft)}\u241f${draft.imageModel}`;
}

function characterLockText(draft: Draft, hasCharacterReference: boolean) {
    if (draft.characterMode === "product-only") return "本项目不安排人物；不要新增人物、手或人物道具。";
    if (draft.characterMode === "strict-person" && hasCharacterReference) return "使用第二张上游人物参考图锁定同一人物的脸型、五官比例、发型、肤色和整体身份；人物动作可以变化，脸部结构不要变化。";
    if (draft.characterMode === "strict-person") return "用户要求人物一致，但未连接第二张人物参考图；无法建立可靠的人物身份锁定，必须先补充人物参考图。";
    return "允许出现人物，但未启用人物身份锁定；不要把此模式描述为脸型一致保证。";
}

function sceneDuration(totalDuration: string, index: number, count: number) {
    const total = Number(totalDuration);
    if (!Number.isFinite(total)) return "4";
    const base = Math.max(2, Math.round(total / count));
    if (index === count - 1) return normalizeSceneDuration(String(Math.max(2, total - base * (count - 1))), String(base));
    return normalizeSceneDuration(String(base), "4");
}

function buildStoryboardFallback(draft: Draft, hasCharacterReference: boolean): StoryboardPlan {
    const count = Number(normalizeSceneCount(draft.sceneCount));
    const action = primaryAction(draft.brief);
    const characterLock = characterLockText(draft, hasCharacterReference);
    const usesPerson = draft.characterMode !== "product-only" && hasCharacterReference;
    const scenes: StoryboardScene[] = [
        {
            id: "s1",
            title: "商品建立镜头",
            purpose: "先让观众看清商品主体、包装和整体质感。",
            duration: sceneDuration(draft.duration, 0, count),
            framePrompt: "以商品参考图为唯一商品身份基准，保持原包装、轮廓、比例、颜色、可见文字和原有构图关系，建立干净的商业展示首帧；只添加与用户目标一致的环境光影，不改商品。",
            videoPrompt: "先保持首帧静止约 0.8 秒，然后让光线或极轻微镜头变化自然出现，商品边缘和包装文字持续稳定；最后回到稳定展示。",
            negativePrompt: "商品改款，包装重绘，文字乱码，新增第二个商品，镜头跳动，商品漂浮，边缘闪烁",
        },
        {
            id: "s2",
            title: "核心动作镜头",
            purpose: "用一个主动作表达用户想要的效果。",
            duration: sceneDuration(draft.duration, 1, count),
            framePrompt: `${usesPerson ? "人物参考图中的同一人物出现在画面中，脸型和五官比例保持一致；" : "不新增人物；"}商品参考图仍是商品身份唯一基准，安排一个明确、克制、可执行的展示场景。主动作目标：${action}。商品与人物/手的接触关系必须清楚、符合物理空间，不遮挡商品关键包装文字。`,
            videoPrompt: `${usesPerson ? "同一人物保持脸型、五官比例和发型稳定；" : "画面中不出现新增人物或手；"}只执行一个主动作：${action}。动作慢、连续、可观察，手与商品保持真实接触关系，不穿过商品，不让商品穿过手或人物；镜头只做轻微连续运动。`,
            negativePrompt: "脸型漂移，五官跳变，手指畸形，手穿过商品，商品穿过手，遮挡logo，商品变形，动作跳切",
        },
        {
            id: "s3",
            title: "稳定收尾镜头",
            purpose: "回到清晰的商品英雄画面，方便后期剪辑和转化。",
            duration: sceneDuration(draft.duration, 2, count),
            framePrompt: "商品参考图中的商品保持原样，形成清晰、稳定、可读的收尾英雄帧；保留商品原有包装正面和可见文字，不新增口号、字幕、水印或第二个商品。",
            videoPrompt: "主动作自然收尾，镜头停止在稳定的商品英雄画面；保持商品轮廓、包装文字、logo、材质纹理和光影连续，最后约 0.8 秒不要再引入新动作。",
            negativePrompt: "改包装，文字变形，logo变形，商品融化，商品重复，画面闪烁，突然变焦，字幕水印",
        },
        {
            id: "s4",
            title: "细节补充镜头",
            purpose: "用一个局部但仍可辨识的细节强化商品卖点，不改变商品身份。",
            duration: sceneDuration(draft.duration, 3, count),
            framePrompt: "保持商品参考图中可见的商品身份和包装事实，只选择原图已经展示的一个局部细节作为视觉重点；不要创造新的内部结构、背面或不可读文字，不要把局部变成另一个商品。",
            videoPrompt: "镜头做很小幅、平滑的推近或光影变化，展示原图可见的局部细节后回到稳定状态；商品表面纹理连续，包装文字和轮廓不漂移。",
            negativePrompt: "局部变成新商品，包装文字乱码，材质液化，结构穿模，过度微距，镜头跳动，突然变焦",
        },
    ];
    const selectedScenes = count === 2 ? [scenes[0], scenes[1]] : scenes.slice(0, count);
    return {
        title: "商品图生视频分镜",
        summary: draft.brief || "以商品主体稳定展示为主，先建立商品，再完成一个核心动作，最后稳定收尾。",
        productLock: draft.mustKeep || "商品身份、轮廓、比例、颜色、材质、包装、配件、logo、可见文字和原有画面关系必须保持。",
        characterLock,
        continuity: "每个镜头使用已确认的分镜静帧作为 Grok image-to-video 首帧；镜头之间只延续已确认的商品和人物外观，不凭空补全不可见结构。",
        scenes: selectedScenes,
    };
}

function buildStoryboardAiPrompt(draft: Draft, fallback: StoryboardPlan, hasCharacterReference: boolean) {
    return [
        `请生成 ${draft.sceneCount} 个商品广告短镜头的结构化分镜。`,
        `用户想要的效果：${draft.brief || "稳定展示商品材质与轮廓"}`,
        `商品事实：${draft.productFacts || "没有额外事实，只以商品参考图中实际可见内容为准"}`,
        `必须保留：${draft.mustKeep || "商品参考图中的身份、包装、轮廓、比例和可见文字"}`,
        `允许变化：${draft.allowedChange || "单一主动作、轻微镜头运动和自然光影变化"}`,
        `禁止内容：${draft.forbidden || "改包装、改文字、增加第二个商品、结构漂移、穿模"}`,
        `画幅：${draft.ratio}；总时长参考：${draft.duration} 秒。`,
        `人物模式：${draft.characterMode}；人物参考图是否已连接：${hasCharacterReference ? "是" : "否"}。`,
        `人物锁定规则：${characterLockText(draft, hasCharacterReference)}`,
        "请遵守：每个镜头只做一个主要任务；framePrompt 是静态分镜首帧，必须强调商品/人物身份和接触关系；videoPrompt 只描述从该静帧开始发生的动作、镜头和声音，不要重新发明构图或商品；negativePrompt 只写本镜头最可能出现的错误。",
        "以下是保守模板，若输入事实不足请沿用，不要补充未展示的商品细节：",
        JSON.stringify(fallback),
    ].join("\n");
}

function normalizeStoryboardScene(value: unknown, index: number, fallback: StoryboardScene): StoryboardScene {
    const item = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
    return {
        id: asString(item.id, fallback.id) || `s${index + 1}`,
        title: asString(item.title, fallback.title) || fallback.title,
        purpose: asString(item.purpose, fallback.purpose) || fallback.purpose,
        duration: normalizeSceneDuration(asString(item.duration, fallback.duration), fallback.duration),
        framePrompt: asString(item.framePrompt, fallback.framePrompt) || fallback.framePrompt,
        videoPrompt: asString(item.videoPrompt, fallback.videoPrompt) || fallback.videoPrompt,
        negativePrompt: asString(item.negativePrompt, fallback.negativePrompt) || fallback.negativePrompt,
    };
}

function parseStoryboardResponse(text: string, fallback: StoryboardPlan): StoryboardPlan {
    const trimmed = text.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return fallback;
    try {
        const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
        const rawScenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
        if (rawScenes.length < 2) return fallback;
        const scenes = rawScenes.slice(0, 4).map((scene, index) => normalizeStoryboardScene(scene, index, fallback.scenes[index] || fallback.scenes[fallback.scenes.length - 1]));
        return {
            title: asString(parsed.title, fallback.title) || fallback.title,
            summary: asString(parsed.summary, fallback.summary) || fallback.summary,
            productLock: asString(parsed.productLock, fallback.productLock) || fallback.productLock,
            characterLock: asString(parsed.characterLock, fallback.characterLock) || fallback.characterLock,
            continuity: asString(parsed.continuity, fallback.continuity) || fallback.continuity,
            scenes,
        };
    } catch {
        return fallback;
    }
}

function parseStoredStoryboard(value: unknown): StoryboardPlan | null {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
        const parsed = JSON.parse(value) as StoryboardPlan;
        if (!parsed || !Array.isArray(parsed.scenes) || parsed.scenes.length < 2) return null;
        return parsed;
    } catch {
        return null;
    }
}

function storyboardReferences(inputs: InputImage[], draft: Draft) {
    const refs = [inputs[0]?.content].filter(Boolean) as string[];
    if (draft.characterMode === "product-only") {
        if (inputs[1]?.content) refs.push(inputs[1].content);
    } else {
        if (inputs[1]?.content) refs.push(inputs[1].content);
        if (inputs[2]?.content) refs.push(inputs[2].content);
    }
    return refs;
}

function buildSceneFramePrompt(scene: StoryboardScene, draft: Draft, hasCharacterReference: boolean) {
    return [
        "生成一张商品广告分镜静帧，不要生成视频，不要拼贴多个镜头。",
        "第一张参考图是商品身份的唯一事实基准：必须保持商品原包装、logo、可见文字、轮廓、比例、颜色、材质、配件和关键细节，不改款、不换包装、不重新设计正面版式。",
        draft.characterMode === "strict-person" && hasCharacterReference
            ? "第二张参考图是人物身份基准：保持同一人物的脸型、五官比例、发型、肤色和整体身份；不要变脸、换人或改变头身比例。"
            : draft.characterMode === "product-only"
                ? "本镜头不新增人物、手或人物道具。"
                : "人物身份未被严格锁定；不要声称人物脸型已获得保证。",
        inputsRoleInstruction(draft),
        `镜头任务：${scene.purpose}`,
        `分镜首帧设计：${scene.framePrompt}`,
        `画幅：${draft.ratio}。商品主体完整，关键包装文字不被遮挡。若有人物/手与商品互动，接触点清晰、前后关系真实，不能穿模。`,
        "静态画面不要字幕、水印、贴纸、第二个商品、额外logo、虚构包装背面或不可见内部结构；文字只保留参考图中实际可见内容。",
    ].join("\n");
}

function inputsRoleInstruction(draft: Draft) {
    if (draft.characterMode === "product-only") return "连接顺序：第 1 张是商品图；第 2、3 张即使存在也只可作为风格参考，不能改变商品身份。";
    return "连接顺序：第 1 张是商品图，第 2 张是人物参考图，第 3 张可选为风格参考；不得把风格参考误当成商品或人物身份。";
}

function buildSceneVideoPrompt(scene: StoryboardScene, draft: Draft, hasCharacterReference: boolean) {
    return [
        "从这张已经确认的分镜静帧开始做 Grok image-to-video。静帧负责构图、光线、商品包装和人物外观；下面只描述发生什么变化，不要重新设计画面。",
        `前 0.6 秒保持首帧稳定；随后只执行一个主动作：${scene.videoPrompt}`,
        draft.characterMode === "strict-person" && hasCharacterReference ? "人物脸型、五官比例、发型和身份在整个镜头中保持一致。" : "不新增未被确认的人物、手或道具。",
        "商品主体、包装、logo、可见文字、比例和轮廓保持不变；手与商品接触时遵守真实遮挡和深度关系，不穿过、不融合、不漂浮。",
        `声音：${draft.sound || DEFAULT_SOUND}`,
        `本镜头动态负面约束：${scene.negativePrompt}`,
        "动作在前半段完成，后半段稳定收尾；不跳切、不突然变焦、不引入第二个动作。",
    ].join("\n");
}

function renderStoryboardMarkdown(plan: StoryboardPlan, sourceLabel: string, hasCharacterReference: boolean) {
    return [
        "# Grok 商品广告脚本与分镜",
        "",
        `- 标题：${plan.title}`,
        `- 商品首帧：${sourceLabel || "未连接"}`,
        `- 人物参考：${hasCharacterReference ? "已连接第二张上游人物图" : "未连接"}`,
        `- 整体目标：${plan.summary}`,
        `- 商品锁定：${plan.productLock}`,
        `- 人物锁定：${plan.characterLock}`,
        `- 连续性：${plan.continuity}`,
        "",
        ...plan.scenes.flatMap((scene, index) => [
            `## 镜头 ${index + 1}｜${scene.title}`,
            `- 时长：${scene.duration} 秒`,
            `- 任务：${scene.purpose}`,
            `- 分镜首帧提示词：${scene.framePrompt}`,
            `- Grok 动作提示词：${scene.videoPrompt}`,
            `- 动态负面提示词：${scene.negativePrompt}`,
            "",
        ]),
        "## 生成顺序",
        "1. 先生成并确认每个镜头的静态分镜图。",
        "2. 每张分镜图分别作为 Grok image-to-video 的唯一首帧。",
        "3. 视频生成后逐镜头检查商品身份、人物脸型、手与商品接触、遮挡和包装文字。",
    ].join("\n");
}

function buildNegativePrompt(draft: Draft) {
    const base = [
        "商品身份漂移",
        "改款、换色、换材质、改变轮廓或比例",
        "logo、品牌名、包装文字、标签文字变形或乱码",
        "把原包装改成纸盒、瓶子、罐子、礼盒或其他包装形态",
        "重新设计包装正面版式、logo、插画或文字层级",
        "新增人物、手、道具、配件、装饰或第二个商品",
        "商品融化、拉伸、折叠、断裂、重复、漂浮、穿模",
        "边缘抖动、局部闪烁、纹理爬动、细节跳变",
        "镜头突然跳动、快速变焦、跳切、过度运动模糊",
        "背景结构变化、透视突变、曝光忽明忽暗、色彩漂移",
        "未经首帧证据支持的背面、底部、内部结构或新视角",
        "字幕、贴纸、水印、UI、旁白字幕、音乐歌词",
    ];
    return [...base, ...splitLines(draft.forbidden)].join("，");
}

function buildPromptResult(draft: Draft, sourceLabel: string, hasImage: boolean): PromptResult {
    const action = primaryAction(draft.brief);
    const camera = cameraInstruction(draft.brief);
    const negativePrompt = buildNegativePrompt(draft);
    const imageStatus = hasImage ? `已接入上游商品图「${sourceLabel || "商品首帧"}」` : "尚未接入上游商品图";
    const productFacts = draft.productFacts || "未提供额外商品事实；只依据首帧图片中实际可见内容。";
    const mustKeep = draft.mustKeep || "首帧中可见的商品身份、轮廓、比例、颜色、材质、包装、配件、文字、光影关系和主体位置。";
    const allowedChange = draft.allowedChange || "只允许用户目标中的主动作、轻微镜头运动、自然光影变化和与动作一致的细小环境变化。";
    const strictFrame = draft.lockMode !== "creative";
    const positivePrompt = [
        strictFrame
            ? "严格首帧图生视频模式：附加首帧图片是商品身份和所有可见细节的唯一事实基准；它必须作为实际 image-to-video 起始帧使用，视频第 0 帧应与附加图片一致；不要把图片当成仅供灵感的参考图，也不要进行文字生图或重新设计包装。"
            : "生成一条基于附加商品图片的图生视频；附加图片是商品身份和所有可见细节的主要事实基准，但允许有限的创意重构。",
        `视频时长约 ${draft.duration} 秒。${ratioInstruction(draft.ratio)}`,
        "从首帧画面开始，前 0.0–1.0 秒保持构图稳定，让商品边缘、logo、包装文字和材质纹理清晰可辨。",
        `0.0–${Math.max(1, Number(draft.duration) * 0.18).toFixed(1)} 秒：稳定首帧，不新增动作。`,
        `1.0–${Math.max(1.2, Number(draft.duration) * 0.78).toFixed(1)} 秒：只执行一个主动作——${action}。动作慢、连续、克制，商品主体不改款。`,
        `${Math.max(1.2, Number(draft.duration) * 0.78).toFixed(1)}–${draft.duration} 秒：动作自然收尾，回到稳定展示状态，不引入第二个动作。`,
        camera,
        `商品事实：${productFacts}`,
        `商品锁定：${mustKeep}`,
        `允许变化：${allowedChange}`,
        "不要根据想象补全首帧未展示的背面、底部、内部结构或新视角；看不到的部分保持不可见或保持原构图。",
        `声音：${draft.sound || DEFAULT_SOUND}`,
        "整体要求：商业商品展示质感，运动稳定，光影连续，背景干净，保持首帧商品的真实比例与视觉身份。",
    ].join("\n");

    const content = [
        "# Grok 商品图生视频脚本",
        "",
        `- 首帧状态：${imageStatus}`,
        `- 目标：${draft.brief || "稳定展示商品材质与轮廓"}`,
        `- 时长：${draft.duration} 秒｜画幅：${draft.ratio}`,
        `- 锁定模式：${strictFrame ? "严格首帧（要求模型接口使用 image-to-video 的 image 字段）" : "创意参考（可能重构包装）"}`,
        "",
        "## 1. 商品事实与锁定",
        `- 商品事实：${productFacts}`,
        `- 必须保留：${mustKeep}`,
        `- 允许变化：${allowedChange}`,
        "- 证据边界：不补写首帧没有展示的背面、底部、内部结构或不可读文字。",
        "",
        "## 2. 动作与镜头时间轴",
        `- 0.0–1.0 秒：稳定首帧，商品主体和构图不变。`,
        `- 1.0–${Math.max(1.2, Number(draft.duration) * 0.78).toFixed(1)} 秒：唯一主动作——${action}。`,
        `- ${Math.max(1.2, Number(draft.duration) * 0.78).toFixed(1)}–${draft.duration} 秒：动作收尾并稳定展示。`,
        `- 镜头：${camera}`,
        `- 声音：${draft.sound || DEFAULT_SOUND}`,
        "",
        "## 3. Grok 正向提示词",
        "```text",
        positivePrompt,
        "```",
        "",
        "## 4. 动态负面提示词",
        "```text",
        negativePrompt,
        "```",
        "",
        hasImage ? "本节点会把上游商品图传入视频生成调用；严格首帧模式还要求所选模型脚本把 images[0] 映射到供应商的 image-to-video 字段。通用只发送 prompt 的视频脚本会忽略图片。" : "请先把商品图片节点连到本节点，再进行图生视频；当前没有首帧时只建议检查脚本，不建议直接生成。",
    ].join("\n");

    return { content, positivePrompt, negativePrompt };
}

function buildAiPrompt(draft: Draft, fallback: PromptResult, sourceLabel: string, hasImage: boolean) {
    return [
        "请根据以下输入生成一份商品图生视频提示词。当前节点不会把图片像素发送给文本模型，因此不得声称看到了图片细节；只把上游首帧图作为视频模型的参考图，并把用户明确提供的事实写入商品锁定。",
        `首帧状态：${hasImage ? `已接入「${sourceLabel || "商品首帧"}」` : "未接入"}`,
        `用户目标：${draft.brief || "稳定展示商品材质与轮廓"}`,
        `商品事实：${draft.productFacts || "无额外事实，只依据首帧可见内容"}`,
        `必须保留：${draft.mustKeep || "首帧可见商品身份与结构"}`,
        `允许变化：${draft.allowedChange || "单一主动作、轻微镜头和自然光影"}`,
        `禁止内容：${draft.forbidden || "新增人物、手、道具、文字、改款和结构漂移"}`,
        `声音：${draft.sound || DEFAULT_SOUND}`,
        `时长：${draft.duration} 秒；画幅：${draft.ratio}`,
        `首帧模式：${draft.lockMode === "creative" ? "创意参考" : "严格首帧 image-to-video"}`,
        "",
        "下面是模板基线。请在不引入未证实商品事实的前提下润色它：",
        fallback.content,
    ].join("\n");
}

function parseAiResponse(text: string, fallback: PromptResult): PromptResult {
    const trimmed = text.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
        try {
            const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
            const positivePrompt = asString(parsed.positivePrompt).trim();
            const negativePrompt = asString(parsed.negativePrompt).trim();
            const scriptMarkdown = asString(parsed.scriptMarkdown).trim();
            if (positivePrompt && negativePrompt && scriptMarkdown) return { positivePrompt, negativePrompt, content: scriptMarkdown };
        } catch {
            // If a provider adds extra text or malformed JSON, preserve the deterministic fallback.
        }
    }
    return fallback;
}

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

async function copyText(text: string) {
    if (!text) return false;
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

function buildQualityChecklist(plan: StoryboardPlan | null) {
    const sceneLines = plan?.scenes.map((scene, index) => `${index + 1}. 镜头 ${index + 1}「${scene.title}」：商品身份/包装文字、人物脸型、手与商品接触、遮挡关系、边缘闪烁、动作连续性。`) || [];
    return [
        "# Grok 商品图生视频质检清单",
        "",
        "以下项目不能靠提示词做到绝对保证，必须逐镜头观看，发现问题就只重生成对应镜头：",
        "",
        ...sceneLines,
        "",
        "## 判定标准",
        "- 商品：包装形状、比例、颜色、logo、可见文字和配件没有改款、乱码、重复或漂移。",
        "- 人物：同一人物的脸型、五官比例、发型和肤色稳定；没有突然换脸或年龄变化。",
        "- 物理：手指没有畸形，手与商品接触点真实，人物/手/商品没有相互穿过、融合或漂浮。",
        "- 连续性：镜头没有突然跳切、透视突变、曝光闪烁、纹理爬动和边缘抖动。",
        "- 画面：没有字幕、水印、虚构logo、第二个商品或未展示的背面/内部结构。",
        "",
        "失败处理：保留通过的分镜图，只重生成失败镜头；如果商品包装或脸型仍然不稳定，应改用真实商品图/人物合成或具备 IP-Adapter、FaceID、ControlNet 的图像工作流，再把合格静帧交给 Grok 做动画。",
    ].join("\n");
}

function GrokProductI2VContent({ ctx }: CanvasNodeContentProps) {
    const [busy, setBusy] = useState<"template" | "text" | "storyboard" | "video" | "videos" | null>(null);
    const draft = readDraft(ctx);
    const inputImages = findInputImages(ctx);
    const sourceImage = inputImages[0]?.node || null;
    const sourceLabel = inputImages[0]?.title || "商品首帧";
    const hasCharacterReference = Boolean(inputImages[1]?.content);
    const output = metadataText(ctx.node.metadata, "content");
    const storyboardMarkdown = metadataText(ctx.node.metadata, "storyboardMarkdown");
    const positivePrompt = metadataText(ctx.node.metadata, "positivePrompt");
    const error = metadataText(ctx.node.metadata, "errorDetails");
    const storyboardNotice = metadataText(ctx.node.metadata, "storyboardNotice");
    const copyStatus = metadataText(ctx.node.metadata, "copyStatus");
    const textModels = useMemo(() => ctx.ai.listModels("text"), [ctx.ai]);
    const imageModels = useMemo(() => ctx.ai.listModels("image"), [ctx.ai]);
    const videoModels = useMemo(() => ctx.ai.listModels("video"), [ctx.ai]);

    const promptFields = new Set(["brief", "productFacts", "mustKeep", "allowedChange", "forbidden", "sound", "duration", "ratio", "lockMode", "sceneCount", "characterMode", "imageModel"]);
    const setField = (key: string, value: string) => ctx.updateMetadata({ [key]: value, ...(promptFields.has(key) ? { content: "", positivePrompt: "", negativePrompt: "", promptFingerprint: "", storyboardPlan: "", storyboardMarkdown: "", storyboardFingerprint: "", storyboardNotice: "" } : {}) });
    const stopCanvas = (event: { stopPropagation: () => void }) => event.stopPropagation();
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
            const response = await ctx.ai.generateText(buildAiPrompt(draft, base, sourceLabel, Boolean(sourceImage)), { system: AI_SYSTEM, model: draft.textModel || undefined });
            const result = parseAiResponse(response.text, base);
            ctx.updateMetadata({ content: result.content, positivePrompt: result.positivePrompt, negativePrompt: result.negativePrompt, promptFingerprint: promptFingerprint(draft), status: "success", errorDetails: "" });
        } catch (error) {
            ctx.updateMetadata({ status: "error", errorDetails: errorMessage(error) });
        } finally {
            setBusy(null);
        }
    };

    const createStoryboard = async () => {
        if (!sourceImage) {
            ctx.updateMetadata({ status: "error", errorDetails: "请先把商品图片节点连接到本节点。" });
            return;
        }
        if (draft.characterMode === "strict-person" && !hasCharacterReference) {
            ctx.updateMetadata({ status: "error", errorDetails: "人物锁定模式需要第二张上游图片作为人物参考图。请按顺序连接：商品图 → 人物图 →（可选）风格图。" });
            return;
        }
        const fallbackPlan = buildStoryboardFallback(draft, hasCharacterReference);
        const references = storyboardReferences(inputImages, draft);
        let plan = fallbackPlan;
        let planningNotice = "";
        setBusy("storyboard");
        ctx.updateMetadata({ status: "loading", errorDetails: "", storyboardNotice: "" });
        try {
            if (textModels.length) {
                try {
                    const response = await ctx.ai.generateText(buildStoryboardAiPrompt(draft, fallbackPlan, hasCharacterReference), {
                        system: STORYBOARD_SYSTEM,
                        model: draft.textModel || undefined,
                    });
                    const parsedPlan = parseStoryboardResponse(response.text, fallbackPlan);
                    plan = { ...parsedPlan, scenes: parsedPlan.scenes.slice(0, Number(draft.sceneCount)) };
                } catch (error) {
                    planningNotice = `AI 分镜规划不可用，已使用保守模板继续生成：${errorMessage(error)}`;
                }
            } else {
                planningNotice = "未配置文本模型，已使用保守模板生成分镜。";
            }

            for (let index = 0; index < plan.scenes.length; index += 1) {
                const scene = plan.scenes[index];
                const generated = await ctx.ai.generateImage(buildSceneFramePrompt(scene, draft, hasCharacterReference), {
                    references,
                    size: generationSize(draft.ratio),
                    count: 1,
                    model: draft.imageModel || undefined,
                });
                const imageContent = generated.images[0];
                if (!imageContent) throw new Error(`镜头 ${index + 1} 没有返回分镜图。`);
                const imageNodeId = `${PLUGIN_ID}-storyboard-${ctx.node.id}-${scene.id}-${Date.now()}`;
                const frameSize = draft.ratio === "9:16 竖版" ? { width: 260, height: 462 } : draft.ratio === "1:1 方形" ? { width: 360, height: 360 } : { width: 420, height: 236 };
                const gridColumn = index % 3;
                const gridRow = Math.floor(index / 3);
                plan.scenes[index] = { ...scene, imageNodeId };
                ctx.applyOps([
                    {
                        type: "add_node",
                        id: imageNodeId,
                        nodeType: "image",
                        title: `分镜 ${index + 1}｜${scene.title}`,
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
                            prompt: buildSceneFramePrompt(scene, draft, hasCharacterReference),
                            storyboardOwnerId: ctx.node.id,
                            storyboardSceneId: scene.id,
                            storyboardSceneIndex: index,
                            storyboardFingerprint: storyboardFingerprint(draft),
                        },
                    },
                    { type: "connect_nodes", fromNodeId: ctx.node.id, toNodeId: imageNodeId },
                ]);
                ctx.updateMetadata({ storyboardPlan: JSON.stringify(plan) });
            }
            const markdown = renderStoryboardMarkdown(plan, sourceLabel, hasCharacterReference);
            ctx.updateMetadata({
                content: markdown,
                storyboardMarkdown: markdown,
                storyboardPlan: JSON.stringify(plan),
                storyboardFingerprint: storyboardFingerprint(draft),
                status: "success",
                errorDetails: "",
                storyboardNotice: planningNotice,
            });
        } catch (error) {
            ctx.updateMetadata({ status: "error", errorDetails: `分镜生成失败：${errorMessage(error)}`, storyboardPlan: JSON.stringify(plan), storyboardFingerprint: storyboardFingerprint(draft), storyboardNotice: planningNotice });
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
                title: "Grok 正向提示词",
                x: ctx.node.position.x + ctx.node.width + 80,
                y: ctx.node.position.y,
                width: 520,
                height: 360,
                metadata: { content: result.positivePrompt, status: "success", fontSize: 14 },
            },
            { type: "connect_nodes", fromNodeId: ctx.node.id, toNodeId: id },
        ]);
    };

    const generateVideo = async () => {
        if (!sourceImage) {
            ctx.updateMetadata({ status: "error", errorDetails: "请先把商品图片节点连接到本节点。" });
            return;
        }
        const result = currentPromptResult();
        setBusy("video");
        ctx.updateMetadata({ status: "loading", errorDetails: "" });
        try {
            const prompt = `${result.positivePrompt}\n\n动态负面提示词：${result.negativePrompt}`;
            const video = await ctx.ai.generateVideo(prompt, {
                references: [asString(sourceImage.metadata?.content)],
                seconds: draft.duration,
                size: generationSize(draft.ratio),
                model: draft.videoModel || undefined,
            });
            const size = videoNodeSize(draft.ratio);
            const id = `${PLUGIN_ID}-video-${Date.now()}`;
            ctx.applyOps([
                {
                    type: "add_node",
                    id,
                    nodeType: "video",
                    title: "Grok 图生视频结果",
                    x: ctx.node.position.x + ctx.node.width + 80,
                    y: ctx.node.position.y + 30,
                    width: size.width,
                    height: size.height,
                    metadata: { content: video.url, status: "success", mimeType: video.mimeType, naturalWidth: video.width, naturalHeight: video.height, durationMs: video.durationMs },
                },
                { type: "connect_nodes", fromNodeId: ctx.node.id, toNodeId: id },
            ]);
            ctx.updateMetadata({ status: "success", errorDetails: "" });
        } catch (error) {
            ctx.updateMetadata({ status: "error", errorDetails: errorMessage(error) });
        } finally {
            setBusy(null);
        }
    };

    const generateStoryboardVideos = async () => {
        const plan = parseStoredStoryboard(ctx.node.metadata?.storyboardPlan);
        if (!plan) {
            ctx.updateMetadata({ status: "error", errorDetails: "请先点击“一键生成脚本与分镜图”，并确认分镜图已经生成。" });
            return;
        }
        const imageNodes = ctx.getNodes().filter((node) => asString(node.metadata?.storyboardOwnerId) === ctx.node.id && Boolean(asString(node.metadata?.content)) && asString(node.metadata?.storyboardSceneId));
        const imageByScene = new Map(imageNodes.map((node) => [asString(node.metadata?.storyboardSceneId), node]));
        const missing = plan.scenes.filter((scene) => !imageByScene.get(scene.id));
        if (missing.length) {
            ctx.updateMetadata({ status: "error", errorDetails: `缺少 ${missing.length} 张分镜首帧，请重新生成分镜图。` });
            return;
        }
        setBusy("videos");
        ctx.updateMetadata({ status: "loading", errorDetails: "", videoBatchStatus: "生成中" });
        let completed = 0;
        const failures: string[] = [];
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
                        model: draft.videoModel || undefined,
                    });
                    const videoNodeId = `${PLUGIN_ID}-storyboard-video-${ctx.node.id}-${scene.id}-${Date.now()}`;
                    const frameWidth = imageNode.width || 420;
                    const videoSize = videoNodeSize(draft.ratio);
                    ctx.applyOps([
                        {
                            type: "add_node",
                            id: videoNodeId,
                            nodeType: "video",
                            title: `Grok 视频 ${index + 1}｜${scene.title}`,
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
                                prompt: buildSceneVideoPrompt(scene, draft, hasCharacterReference),
                            },
                        },
                        { type: "connect_nodes", fromNodeId: imageNode.id, toNodeId: videoNodeId },
                    ]);
                    completed += 1;
                    ctx.updateMetadata({ videoBatchStatus: `已完成 ${completed}/${plan.scenes.length}` });
                } catch (error) {
                    failures.push(`镜头 ${index + 1}「${scene.title}」：${errorMessage(error)}`);
                }
            }
            const statusText = `已完成 ${completed}/${plan.scenes.length}`;
            ctx.updateMetadata({
                status: failures.length ? "error" : "success",
                videoBatchStatus: statusText,
                errorDetails: failures.length ? `${statusText}；失败项：${failures.join("；")}` : "",
            });
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
                title: "Grok 视频质检清单",
                x: ctx.node.position.x + ctx.node.width + 80,
                y: ctx.node.position.y + 760,
                width: 620,
                height: 420,
                metadata: { content: buildQualityChecklist(plan), status: "success", fontSize: 14 },
            },
            { type: "connect_nodes", fromNodeId: ctx.node.id, toNodeId: id },
        ]);
    };

    const copy = async (value: string) => {
        const ok = await copyText(value);
        ctx.updateMetadata({ copyStatus: ok ? "已复制" : "复制失败，请手动选择文本复制" });
        window.setTimeout(() => ctx.updateMetadata({ copyStatus: "" }), 1800);
    };

    const copyNativeXaiScript = () => void copy(XAI_NATIVE_VIDEO_SCRIPT);
    const copyNewApiScript = () => void copy(NEW_API_VIDEO_SCRIPT);

    const buttonStyle = { border: `1px solid ${ctx.theme.node.stroke}`, borderRadius: 8, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, padding: "6px 9px", cursor: "pointer", fontSize: 12 };
    const primaryButtonStyle = { ...buttonStyle, border: "1px solid #7c3aed", background: "#7c3aed", color: "#fff" };
    const inputStyle = { width: "100%", boxSizing: "border-box" as const, border: `1px solid ${ctx.theme.node.stroke}`, borderRadius: 7, background: ctx.theme.node.panel, color: ctx.theme.node.text, padding: "7px 8px", fontSize: 12, outline: "none" };
    const labelStyle = { color: ctx.theme.node.muted, fontSize: 11, marginBottom: 3, display: "block" };

    return (
        <div data-canvas-no-zoom onWheel={stopCanvas} style={{ height: "100%", width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 8, padding: 12, color: ctx.theme.node.text, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Grok 商品图生视频</div>
                <span style={{ fontSize: 11, color: sourceImage ? "#16a34a" : "#d97706" }}>{sourceImage ? "首帧已接入" : "等待商品图"}</span>
            </div>

            {inputImages.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: 6, borderRadius: 8, background: ctx.theme.toolbar.panel }}>
                    {inputImages.slice(0, 3).map((input, index) => (
                        <div key={input.node.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <img src={input.content} alt={input.title} style={{ width: 42, height: 34, borderRadius: 5, objectFit: "contain", background: "#fff" }} />
                            <div style={{ minWidth: 0, fontSize: 11, color: ctx.theme.node.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {index === 0 ? "商品图" : index === 1 ? "人物参考" : "风格参考"}：{input.title}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ padding: 8, borderRadius: 8, background: "#f59e0b14", color: ctx.theme.node.muted, fontSize: 11, lineHeight: 1.45 }}>把画布里的商品图片节点连接到本节点。脚本可以先生成，但生成分镜图和视频都需要商品图。</div>
            )}

            <div style={{ padding: 7, borderRadius: 8, background: "#2563eb12", color: ctx.theme.node.muted, fontSize: 10, lineHeight: 1.45 }}>
                参考图连接顺序：第 1 张商品图；第 2 张人物图（要锁脸型时必接）；第 3 张可选风格图。人物和风格图不能替代商品图。
            </div>

            <div>
                <label style={labelStyle}>视频目标 / 主动作</label>
                <textarea value={draft.brief} placeholder="例如：让瓶身高光从左向右扫过，镜头轻微推近，商品保持稳定。" onChange={(event) => setField("brief", event.target.value)} onMouseDown={stopCanvas} onWheel={stopCanvas} style={{ ...inputStyle, minHeight: 54, resize: "vertical", lineHeight: 1.4 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                    <label style={labelStyle}>时长</label>
                    <select value={draft.duration} onChange={(event) => setField("duration", event.target.value)} onMouseDown={stopCanvas} style={inputStyle}>
                        {["4", "5", "6", "8", "10", "12", "15"].map((value) => <option key={value} value={value}>{value} 秒</option>)}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>画幅</label>
                    <select value={draft.ratio} onChange={(event) => setField("ratio", event.target.value)} onMouseDown={stopCanvas} style={inputStyle}>
                        {["保持首帧画幅", "9:16 竖版", "16:9 横版", "1:1 方形"].map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>分镜数</label>
                    <select value={draft.sceneCount} onChange={(event) => setField("sceneCount", event.target.value)} onMouseDown={stopCanvas} style={inputStyle}>
                        {["2", "3", "4"].map((value) => <option key={value} value={value}>{value} 个镜头</option>)}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>人物一致性</label>
                    <select value={draft.characterMode} onChange={(event) => setField("characterMode", event.target.value)} onMouseDown={stopCanvas} style={inputStyle}>
                        <option value="product-only">商品展示：不加人物</option>
                        <option value="strict-person">人物锁定：必须连接第二张人物图</option>
                        <option value="free-person">人物自由生成：不保证脸型</option>
                    </select>
                </div>
            </div>

            <details open onMouseDown={stopCanvas}>
                <summary style={{ cursor: "pointer", color: ctx.theme.node.muted, fontSize: 11 }}>商品锁定与声音（严格首帧模式）</summary>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 7 }}>
                    <select value={draft.lockMode} onChange={(event) => setField("lockMode", event.target.value)} onMouseDown={stopCanvas} style={inputStyle} aria-label="商品锁定模式">
                        <option value="strict">严格首帧：不改包装（推荐）</option>
                        <option value="creative">创意参考：允许有限重构</option>
                    </select>
                    <input value={draft.productFacts} placeholder="商品事实：名称、材质、颜色、包装等（只填确定事实）" onChange={(event) => setField("productFacts", event.target.value)} onMouseDown={stopCanvas} style={inputStyle} />
                    <input value={draft.mustKeep} placeholder="必须保留：轮廓、logo、文字、配件……" onChange={(event) => setField("mustKeep", event.target.value)} onMouseDown={stopCanvas} style={inputStyle} />
                    <input value={draft.allowedChange} placeholder="允许变化：高光、轻微镜头、蒸汽、液体等" onChange={(event) => setField("allowedChange", event.target.value)} onMouseDown={stopCanvas} style={inputStyle} />
                    <input value={draft.forbidden} placeholder="额外禁止：人物、手、道具、某种变形……" onChange={(event) => setField("forbidden", event.target.value)} onMouseDown={stopCanvas} style={inputStyle} />
                    <input value={draft.sound} placeholder={DEFAULT_SOUND} onChange={(event) => setField("sound", event.target.value)} onMouseDown={stopCanvas} style={inputStyle} />
                    <div style={{ color: ctx.theme.node.muted, fontSize: 10, lineHeight: 1.4 }}>严格首帧只在视频模型脚本真正使用 image-to-video 图片字段时生效；通用只发送 prompt 的视频脚本会忽略上游图片。</div>
                </div>
            </details>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button type="button" onMouseDown={stopCanvas} onClick={saveTemplate} style={primaryButtonStyle} disabled={busy !== null}>生成模板脚本</button>
                <button type="button" onMouseDown={stopCanvas} onClick={() => void polishWithAi()} style={buttonStyle} disabled={busy !== null}>{busy === "text" ? "AI润色中…" : "AI润色"}</button>
                <button type="button" onMouseDown={stopCanvas} onClick={() => void createStoryboard()} style={primaryButtonStyle} disabled={busy !== null || !sourceImage}>{busy === "storyboard" ? "脚本与分镜生成中…" : "一键生成脚本与分镜图"}</button>
                <button type="button" onMouseDown={stopCanvas} onClick={() => void generateStoryboardVideos()} style={buttonStyle} disabled={busy !== null || !storedStoryboard}>{busy === "videos" ? "逐镜头生成视频中…" : "一键生成视频（全部分镜）"}</button>
                <button type="button" onMouseDown={stopCanvas} onClick={createTextOutput} style={buttonStyle} disabled={busy !== null}>输出正向提示词</button>
                <button type="button" onMouseDown={stopCanvas} onClick={createQualityChecklist} style={buttonStyle} disabled={busy !== null}>输出质检清单</button>
                <button type="button" onMouseDown={stopCanvas} onClick={copyNativeXaiScript} style={buttonStyle} disabled={busy !== null}>复制原生 xAI 脚本</button>
                <button type="button" onMouseDown={stopCanvas} onClick={copyNewApiScript} style={buttonStyle} disabled={busy !== null}>复制 New API 分发脚本</button>
                <button type="button" onMouseDown={stopCanvas} onClick={() => void generateVideo()} style={buttonStyle} disabled={busy !== null || !sourceImage}>{busy === "video" ? "单镜头生成中…" : "生成单镜头视频（原商品首帧）"}</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <select value={draft.textModel} onChange={(event) => setField("textModel", event.target.value)} onMouseDown={stopCanvas} style={inputStyle} aria-label="文本模型">
                    <option value="">文本模型：当前默认</option>
                    {textModels.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}
                </select>
                <select value={draft.imageModel} onChange={(event) => setField("imageModel", event.target.value)} onMouseDown={stopCanvas} style={inputStyle} aria-label="分镜图模型">
                    <option value="">分镜图模型：当前默认</option>
                    {imageModels.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}
                </select>
                <select value={draft.videoModel} onChange={(event) => setField("videoModel", event.target.value)} onMouseDown={stopCanvas} style={inputStyle} aria-label="视频模型">
                    <option value="">视频模型：当前默认</option>
                    {videoModels.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}
                </select>
            </div>

            {error ? <div style={{ color: "#dc2626", fontSize: 11, lineHeight: 1.4 }}>{error}</div> : null}
            {storyboardNotice ? <div style={{ color: "#b45309", fontSize: 11, lineHeight: 1.4 }}>{storyboardNotice}</div> : null}
            {copyStatus ? <div style={{ color: "#16a34a", fontSize: 11 }}>{copyStatus}</div> : null}

            <div style={{ minHeight: 0, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ color: ctx.theme.node.muted, fontSize: 11 }}>脚本 / 分镜预览</span>
                    <div style={{ display: "flex", gap: 5 }}>
                        <button type="button" onMouseDown={stopCanvas} onClick={() => void copy(currentPromptResult().positivePrompt)} style={{ ...buttonStyle, padding: "3px 7px", fontSize: 11 }}>复制正向</button>
                        <button type="button" onMouseDown={stopCanvas} onClick={() => void copy(currentPromptContent())} style={{ ...buttonStyle, padding: "3px 7px", fontSize: 11 }}>复制完整</button>
                    </div>
                </div>
                <pre onWheel={stopCanvas} style={{ minHeight: 0, flex: 1, overflow: "auto", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", borderRadius: 8, padding: 9, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, fontSize: 10, lineHeight: 1.45, fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace" }}>{currentPromptContent()}</pre>
            </div>
        </div>
    );
}

export { buildPromptResult, buildNegativePrompt, normalizeDuration, normalizeSceneCount, promptFingerprint, storyboardFingerprint, buildStoryboardFallback, buildStoryboardAiPrompt, parseStoryboardResponse, buildSceneVideoPrompt, XAI_NATIVE_VIDEO_SCRIPT, NEW_API_VIDEO_SCRIPT };

export default definePlugin({
    id: PLUGIN_ID,
    name: "Grok 商品图生视频",
    version: "0.4.1",
    description: "把商品图和效果描述拆成脚本、分镜首帧与 Grok 逐镜头图生视频，并提供商品/人物一致性约束与质检清单。",
    nodes: [
        {
            type: `${PLUGIN_ID}:prompt`,
            title: "Grok 商品图生视频",
            icon: "🎬",
            description: "商品图 → 脚本与分镜首帧 → Grok 逐镜头视频 → 质检",
            defaultSize: { width: 520, height: 820 },
            defaultMetadata: { brief: "", productFacts: "", mustKeep: "", allowedChange: "", forbidden: "", sound: DEFAULT_SOUND, duration: DEFAULT_DURATION, ratio: DEFAULT_RATIO, lockMode: DEFAULT_LOCK_MODE, textModel: "", imageModel: "", videoModel: "", sceneCount: DEFAULT_SCENE_COUNT, characterMode: DEFAULT_CHARACTER_MODE, content: "", positivePrompt: "", negativePrompt: "", promptFingerprint: "", storyboardPlan: "", storyboardMarkdown: "", storyboardFingerprint: "", status: "idle" },
            minimapColor: "#7c3aed",
            hidePanel: true,
            resource: (node) => ({ kind: "text", text: asString(node.metadata?.storyboardMarkdown) || asString(node.metadata?.positivePrompt) || asString(node.metadata?.content) }),
            Content: GrokProductI2VContent,
        },
    ],
});
