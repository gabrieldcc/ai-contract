"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeContract = void 0;
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
(0, firebase_functions_1.setGlobalOptions)({ maxInstances: 10 });
const openRouterApiKey = (0, params_1.defineSecret)("OPENROUTER_API_KEY");
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openai/gpt-4o-mini";
const CONTRACT_ANALYSIS_SYSTEM_PROMPT = `
You are a legal contract analysis assistant.
Read the attached PDF contract and return only valid JSON.

Rules:
- Reply with JSON only.
- Do not use markdown fences.
- Keep the response in Brazilian Portuguese.
- Be concise, practical, and business-oriented.
- If some information is missing, infer conservatively
  and mention uncertainty in the relevant field.

JSON shape:
{
  "summary": "string",
  "importantPoints": ["string"],
  "attentionPoints": ["string"],
  "risks": ["string"],
  "recommendations": ["string"]
}
`.trim();
exports.analyzeContract = (0, https_1.onCall)({
    region: "us-central1",
    secrets: [openRouterApiKey],
    cors: true,
}, async (request) => {
    var _a, _b, _c;
    const data = request.data;
    const fileName = typeof data.fileName === "string" ? data.fileName : "";
    const fileDataUrl = typeof data.fileDataUrl === "string" ? data.fileDataUrl : "";
    if (!fileName ||
        !fileDataUrl.startsWith("data:application/pdf;base64,")) {
        throw new https_1.HttpsError("invalid-argument", "Envie um PDF valido para analise.");
    }
    const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${openRouterApiKey.value()}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: OPENROUTER_MODEL,
            plugins: [
                {
                    id: "file-parser",
                    pdf: {
                        engine: "pdf-text",
                    },
                },
            ],
            response_format: {
                type: "json_object",
            },
            messages: [
                {
                    role: "system",
                    content: CONTRACT_ANALYSIS_SYSTEM_PROMPT,
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Analise este contrato em PDF e retorne o JSON solicitado.",
                        },
                        {
                            type: "file",
                            file: {
                                filename: fileName,
                                file_data: fileDataUrl,
                            },
                        },
                    ],
                },
            ],
        }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new https_1.HttpsError("internal", `OpenRouter error: ${response.status} ${errorText}`);
    }
    const payload = await response.json();
    const content = (_c = (_b = (_a = payload === null || payload === void 0 ? void 0 : payload.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content;
    return parseAnalysisContent(content);
});
/**
 * Normalizes the provider response into the app contract schema.
 * @param {unknown} content Raw OpenRouter message content.
 * @return {AnalyzeContractResponse} Structured contract analysis.
 */
function parseAnalysisContent(content) {
    const normalizedContent = Array.isArray(content) ?
        content.map((item) => {
            if (typeof item === "string") {
                return item;
            }
            if (item &&
                typeof item === "object" &&
                "text" in item &&
                typeof item.text === "string") {
                return item.text;
            }
            return "";
        }).join("\n") :
        typeof content === "string" ? content : "";
    const cleaned = normalizedContent
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    const parsed = JSON.parse(cleaned);
    return {
        summary: asString(parsed.summary),
        importantPoints: asStringArray(parsed.importantPoints),
        attentionPoints: asStringArray(parsed.attentionPoints),
        risks: asStringArray(parsed.risks),
        recommendations: asStringArray(parsed.recommendations),
    };
}
/**
 * Ensures a required string field exists in the model response.
 * @param {unknown} value Candidate field value.
 * @return {string} Non-empty string value.
 */
function asString(value) {
    if (typeof value !== "string" || !value.trim()) {
        throw new https_1.HttpsError("internal", "Resposta invalida do provedor de IA.");
    }
    return value.trim();
}
/**
 * Ensures a required list of strings exists in the model response.
 * @param {unknown} value Candidate field value.
 * @return {string[]} Non-empty list of strings.
 */
function asStringArray(value) {
    if (!Array.isArray(value)) {
        throw new https_1.HttpsError("internal", "Resposta invalida do provedor de IA.");
    }
    const normalized = value.filter((item) => typeof item === "string" && item.trim().length > 0);
    if (normalized.length === 0) {
        throw new https_1.HttpsError("internal", "Resposta invalida do provedor de IA.");
    }
    return normalized;
}
//# sourceMappingURL=index.js.map