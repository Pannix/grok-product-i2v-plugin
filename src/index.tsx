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
    textModel: string;
    videoModel: string;
};

type PromptResult = {
    content: string;
    positivePrompt: string;
    negativePrompt: string;
};

const PLUGIN_ID = "grok-product-i2v";
const DEFAULT_DURATION = "6";
const DEFAULT_RATIO = "保持首帧画幅";
const DEFAULT_SOUND = "轻微真实环境声或材质摩擦声；不要旁白、不要台词、不要音乐抢主体。";

const AI_SYSTEM = `你是商品图生视频提示词编导。你只能依据用户提供的事实和“首帧商品图作为唯一商品事实基准”来写提示词，不要臆测品牌、型号、材质、背面、底部、内部结构或不可见文字。

必须遵守：
1. 商品身份、轮廓、比例、颜色、材质、包装、配件、可见文字和画面布局优先保持不变。
2. 每条视频只安排一个主动作，动作在前半段发生，后半段稳定收尾。
3. 明确写出时间轴、镜头运动、连续性约束、声音和后期限制。
4. 不要新增手、人物、道具、字幕、水印、品牌或装饰，不要让商品变形、漂浮、重复、闪烁或改款。
5. 如果输入事实不足，使用“以首帧可见内容为准”的约束，不要补写不存在的商品细节。

请只返回严格 JSON，不要 Markdown 代码围栏：
{"positivePrompt":"可直接给 Grok 图生视频模型的正向提示词","negativePrompt":"逗号分隔的动态负面提示词","scriptMarkdown":"完整中文脚本，包含目标、设置、首帧/商品锁定、时间轴、镜头、声音、正向提示词和动态负面提示词"}`;

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
        textModel: metadataText(metadata, "textModel"),
        videoModel: metadataText(metadata, "videoModel"),
    };
}

function isImageNode(node: CanvasNodeData) {
    const mimeType = asString(node.metadata?.mimeType);
    const content = asString(node.metadata?.content);
    return node.type === "image" || mimeType.startsWith("image/") || content.startsWith("data:image/");
}

function findFirstImage(ctx: CanvasNodeContentProps["ctx"]) {
    return ctx.getUpstream().find((node) => isImageNode(node) && Boolean(asString(node.metadata?.content))) || null;
}

function normalizeDuration(value: string) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return DEFAULT_DURATION;
    return String(Math.min(15, Math.max(2, Math.round(parsed))));
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

function buildNegativePrompt(draft: Draft) {
    const base = [
        "商品身份漂移",
        "改款、换色、换材质、改变轮廓或比例",
        "logo、品牌名、包装文字、标签文字变形或乱码",
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
    const positivePrompt = [
        "生成一条严格基于附加商品首帧图片的图生视频。附加首帧图片是商品身份和所有可见细节的唯一事实基准。",
        `视频时长约 ${draft.duration} 秒。${ratioInstruction(draft.ratio)}`,
        "从首帧画面开始，前 0.0–1.0 秒保持构图稳定，让商品边缘、logo、包装文字和材质纹理清晰可辨。",
        `0.0–${Math.max(1, Number(draft.duration) * 0.18).toFixed(1)} 秒：稳定首帧，不新增动作。`,
        `1.0–${Math.max(1.2, Number(draft.duration) * 0.78).toFixed(1)} 秒：只执行一个主动作——${action}。动作慢、连续、克制，商品主体不改款。`,
        `${Math.max(1.2, Number(draft.duration) * 0.78).toFixed(1)}–${draft.duration} 秒：动作自然收尾，回到稳定展示状态，不引入第二个动作。`,
        camera,
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
        hasImage ? "可直接把本节点的正向提示词输出连接到视频生成节点；本节点会把上游商品图作为首帧参考。" : "请先把商品图片节点连到本节点，再进行图生视频；当前没有首帧时只建议检查脚本，不建议直接生成。",
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

function GrokProductI2VContent({ ctx }: CanvasNodeContentProps) {
    const [busy, setBusy] = useState<"template" | "text" | "video" | null>(null);
    const draft = readDraft(ctx);
    const sourceImage = findFirstImage(ctx);
    const sourceLabel = sourceImage?.title || "商品首帧";
    const output = metadataText(ctx.node.metadata, "content");
    const positivePrompt = metadataText(ctx.node.metadata, "positivePrompt");
    const error = metadataText(ctx.node.metadata, "errorDetails");
    const copyStatus = metadataText(ctx.node.metadata, "copyStatus");
    const textModels = useMemo(() => ctx.ai.listModels("text"), [ctx.ai]);
    const videoModels = useMemo(() => ctx.ai.listModels("video"), [ctx.ai]);

    const setField = (key: string, value: string) => ctx.updateMetadata({ [key]: value });
    const stopCanvas = (event: { stopPropagation: () => void }) => event.stopPropagation();
    const fallback = () => buildPromptResult(draft, sourceLabel, Boolean(sourceImage));

    const saveTemplate = () => {
        const result = fallback();
        ctx.updateMetadata({ content: result.content, positivePrompt: result.positivePrompt, negativePrompt: result.negativePrompt, status: "success", errorDetails: "", copyStatus: "" });
    };

    const polishWithAi = async () => {
        const base = fallback();
        setBusy("text");
        ctx.updateMetadata({ status: "loading", errorDetails: "" });
        try {
            const response = await ctx.ai.generateText(buildAiPrompt(draft, base, sourceLabel, Boolean(sourceImage)), { system: AI_SYSTEM, model: draft.textModel || undefined });
            const result = parseAiResponse(response.text, base);
            ctx.updateMetadata({ content: result.content, positivePrompt: result.positivePrompt, negativePrompt: result.negativePrompt, status: "success", errorDetails: "" });
        } catch (error) {
            ctx.updateMetadata({ status: "error", errorDetails: errorMessage(error) });
        } finally {
            setBusy(null);
        }
    };

    const createTextOutput = () => {
        const result = positivePrompt ? { positivePrompt } : fallback();
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
        const result = positivePrompt ? { positivePrompt, negativePrompt: metadataText(ctx.node.metadata, "negativePrompt") } : fallback();
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

    const copy = async (value: string) => {
        const ok = await copyText(value);
        ctx.updateMetadata({ copyStatus: ok ? "已复制" : "复制失败，请手动选择文本复制" });
        window.setTimeout(() => ctx.updateMetadata({ copyStatus: "" }), 1800);
    };

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

            {sourceImage ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 6, borderRadius: 8, background: ctx.theme.toolbar.panel }}>
                    <img src={asString(sourceImage.metadata?.content)} alt={sourceLabel} style={{ width: 52, height: 42, borderRadius: 5, objectFit: "contain", background: "#fff" }} />
                    <div style={{ minWidth: 0, fontSize: 11, color: ctx.theme.node.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>参考首帧：{sourceLabel}</div>
                </div>
            ) : (
                <div style={{ padding: 8, borderRadius: 8, background: "#f59e0b14", color: ctx.theme.node.muted, fontSize: 11, lineHeight: 1.45 }}>把画布里的商品图片节点连接到本节点。脚本模板仍可先生成，但直接生成视频需要首帧。</div>
            )}

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
            </div>

            <details onMouseDown={stopCanvas}>
                <summary style={{ cursor: "pointer", color: ctx.theme.node.muted, fontSize: 11 }}>商品锁定与声音（可选）</summary>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 7 }}>
                    <input value={draft.productFacts} placeholder="商品事实：名称、材质、颜色、包装等（只填确定事实）" onChange={(event) => setField("productFacts", event.target.value)} onMouseDown={stopCanvas} style={inputStyle} />
                    <input value={draft.mustKeep} placeholder="必须保留：轮廓、logo、文字、配件……" onChange={(event) => setField("mustKeep", event.target.value)} onMouseDown={stopCanvas} style={inputStyle} />
                    <input value={draft.allowedChange} placeholder="允许变化：高光、轻微镜头、蒸汽、液体等" onChange={(event) => setField("allowedChange", event.target.value)} onMouseDown={stopCanvas} style={inputStyle} />
                    <input value={draft.forbidden} placeholder="额外禁止：人物、手、道具、某种变形……" onChange={(event) => setField("forbidden", event.target.value)} onMouseDown={stopCanvas} style={inputStyle} />
                    <input value={draft.sound} placeholder={DEFAULT_SOUND} onChange={(event) => setField("sound", event.target.value)} onMouseDown={stopCanvas} style={inputStyle} />
                </div>
            </details>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button type="button" onMouseDown={stopCanvas} onClick={saveTemplate} style={primaryButtonStyle} disabled={busy !== null}>生成模板脚本</button>
                <button type="button" onMouseDown={stopCanvas} onClick={() => void polishWithAi()} style={buttonStyle} disabled={busy !== null}>{busy === "text" ? "AI润色中…" : "AI润色"}</button>
                <button type="button" onMouseDown={stopCanvas} onClick={createTextOutput} style={buttonStyle} disabled={busy !== null}>输出正向提示词</button>
                <button type="button" onMouseDown={stopCanvas} onClick={() => void generateVideo()} style={buttonStyle} disabled={busy !== null || !sourceImage}>{busy === "video" ? "生成视频中…" : "生成视频（当前模型）"}</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <select value={draft.textModel} onChange={(event) => setField("textModel", event.target.value)} onMouseDown={stopCanvas} style={inputStyle} aria-label="文本模型">
                    <option value="">文本模型：当前默认</option>
                    {textModels.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}
                </select>
                <select value={draft.videoModel} onChange={(event) => setField("videoModel", event.target.value)} onMouseDown={stopCanvas} style={inputStyle} aria-label="视频模型">
                    <option value="">视频模型：当前默认</option>
                    {videoModels.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}
                </select>
            </div>

            {error ? <div style={{ color: "#dc2626", fontSize: 11, lineHeight: 1.4 }}>{error}</div> : null}
            {copyStatus ? <div style={{ color: "#16a34a", fontSize: 11 }}>{copyStatus}</div> : null}

            <div style={{ minHeight: 0, flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ color: ctx.theme.node.muted, fontSize: 11 }}>脚本预览（输出资源为正向提示词）</span>
                    <div style={{ display: "flex", gap: 5 }}>
                        <button type="button" onMouseDown={stopCanvas} onClick={() => void copy(positivePrompt || fallback().positivePrompt)} style={{ ...buttonStyle, padding: "3px 7px", fontSize: 11 }}>复制正向</button>
                        <button type="button" onMouseDown={stopCanvas} onClick={() => void copy(output || fallback().content)} style={{ ...buttonStyle, padding: "3px 7px", fontSize: 11 }}>复制完整</button>
                    </div>
                </div>
                <pre onWheel={stopCanvas} style={{ minHeight: 0, flex: 1, overflow: "auto", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", borderRadius: 8, padding: 9, background: ctx.theme.toolbar.panel, color: ctx.theme.node.text, fontSize: 10, lineHeight: 1.45, fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace" }}>{output || "点击“生成模板脚本”开始。\n\n提示：若要让下游视频节点拿到首帧，请同时把商品图片节点连到视频配置/生成节点。"}</pre>
            </div>
        </div>
    );
}

export { buildPromptResult, buildNegativePrompt, normalizeDuration };

export default definePlugin({
    id: PLUGIN_ID,
    name: "Grok 商品图生视频",
    version: "0.1.0",
    description: "把商品首帧、动作目标和商品锁定规则整理成 Grok 图生视频脚本。",
    nodes: [
        {
            type: `${PLUGIN_ID}:prompt`,
            title: "Grok 商品图生视频",
            icon: "🎬",
            description: "商品首帧 → 商品锁定 → 动作时间轴 → Grok 正负提示词",
            defaultSize: { width: 520, height: 640 },
            defaultMetadata: { brief: "", productFacts: "", mustKeep: "", allowedChange: "", forbidden: "", sound: DEFAULT_SOUND, duration: DEFAULT_DURATION, ratio: DEFAULT_RATIO, content: "", positivePrompt: "", negativePrompt: "", status: "idle" },
            minimapColor: "#7c3aed",
            hidePanel: true,
            resource: (node) => ({ kind: "text", text: asString(node.metadata?.positivePrompt) || asString(node.metadata?.content) }),
            Content: GrokProductI2VContent,
        },
    ],
});
