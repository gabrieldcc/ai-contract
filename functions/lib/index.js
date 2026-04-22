"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeContract = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const openRouterApiKey = (0, params_1.defineSecret)("OPENROUTER_API_KEY");
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";
const AI_CONFIG_DOCUMENT_PATH = "config/ai";
const AI_CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_CONTRACT_ANALYSIS_SYSTEM_PROMPT = `
You are a legal contract analysis assistant.
Read the attached PDF contract and return only valid JSON.

Rules:
- Reply with JSON only.
- Do not use markdown fences.
- Keep the response in Brazilian Portuguese.
- Be concise, practical, and business-oriented.
- If some information is missing, infer conservatively and mention uncertainty in the relevant field.

JSON shape:
{
  "summary": "string",
  "importantPoints": ["string"],
  "attentionPoints": ["string"],
  "risks": ["string"],
  "recommendations": ["string"]
}
`.trim();
const adminApp = (0, app_1.getApps)().length ? (0, app_1.getApp)() : (0, app_1.initializeApp)();
const firestore = (0, firestore_1.getFirestore)(adminApp);
let aiConfigCache = null;
exports.analyzeContract = (0, https_1.onRequest)({
    region: "us-central1",
    secrets: [openRouterApiKey],
    cors: true,
    invoker: "public",
}, async (request, response) => {
    const requestId = request.headers["x-cloud-trace-context"] ?? `http-${Date.now()}`;
    if (request.method === "OPTIONS") {
        response.status(204).send("");
        return;
    }
    if (request.method !== "POST") {
        logger.warn("Invalid HTTP method for analyzeContract", {
            requestId,
            method: request.method,
        });
        response.status(405).json({
            error: {
                code: "method-not-allowed",
                message: "Use POST para chamar analyzeContract.",
            },
        });
        return;
    }
    try {
        const data = extractRequestPayload(request.body);
        const fileName = typeof data.fileName === "string" ? data.fileName : "";
        const fileDataUrl = typeof data.fileDataUrl === "string" ? data.fileDataUrl : "";
        logger.info("analyzeContract called", {
            requestId,
            fileName,
            hasBody: Boolean(request.body),
            fileDataPrefix: fileDataUrl.slice(0, 32),
        });
        if (!fileName ||
            !fileDataUrl.startsWith("data:application/pdf;base64,")) {
            logger.warn("Invalid PDF payload received", {
                requestId,
                fileName,
                fileDataPrefix: fileDataUrl.slice(0, 32),
            });
            throw new https_1.HttpsError("invalid-argument", "Envie um PDF valido para analise.");
        }
        const aiConfig = await getAiRuntimeConfig();
        logger.info("AI config loaded", {
            requestId,
            model: aiConfig.model,
            promptLength: aiConfig.contractPrompt.length,
        });
        const openRouterResponse = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openRouterApiKey.value()}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: aiConfig.model,
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
                        content: aiConfig.contractPrompt,
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
        if (!openRouterResponse.ok) {
            const errorText = await openRouterResponse.text();
            logger.error("OpenRouter request failed", {
                requestId,
                status: openRouterResponse.status,
                body: errorText,
            });
            throw new https_1.HttpsError("internal", `OpenRouter error: ${openRouterResponse.status} ${errorText}`);
        }
        const payload = await openRouterResponse.json();
        const content = payload?.choices?.[0]?.message?.content;
        const parsed = parseAnalysisContent(content);
        logger.info("Contract analysis generated successfully", {
            requestId,
            fileName,
        });
        response.status(200).json({
            data: parsed,
        });
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            logger.error("analyzeContract failed with HttpsError", {
                requestId,
                code: error.code,
                message: error.message,
                details: error.details ?? null,
            });
            response.status(mapHttpsErrorToStatus(error.code)).json({
                error: {
                    code: error.code,
                    message: error.message,
                    details: error.details ?? "",
                },
            });
            return;
        }
        const message = error instanceof Error ? error.message : "Unexpected backend error";
        logger.error("analyzeContract failed with unexpected error", {
            requestId,
            message,
            error,
        });
        response.status(500).json({
            error: {
                code: "internal",
                message: `Falha no backend da analise: ${message}`,
            },
        });
    }
});
async function getAiRuntimeConfig() {
    if (aiConfigCache && aiConfigCache.expiresAt > Date.now()) {
        return aiConfigCache.value;
    }
    try {
        const configSnapshot = await firestore.doc(AI_CONFIG_DOCUMENT_PATH).get();
        if (!configSnapshot.exists) {
            return updateAiConfigCache({
                model: DEFAULT_OPENROUTER_MODEL,
                contractPrompt: DEFAULT_CONTRACT_ANALYSIS_SYSTEM_PROMPT,
            });
        }
        const rawConfig = configSnapshot.data();
        return updateAiConfigCache({
            model: asOptionalString(rawConfig?.model, DEFAULT_OPENROUTER_MODEL),
            contractPrompt: asOptionalString(rawConfig?.contractPrompt, DEFAULT_CONTRACT_ANALYSIS_SYSTEM_PROMPT),
        });
    }
    catch (error) {
        logger.error("Failed to load AI config from Firestore.", { error });
        return updateAiConfigCache({
            model: DEFAULT_OPENROUTER_MODEL,
            contractPrompt: DEFAULT_CONTRACT_ANALYSIS_SYSTEM_PROMPT,
        });
    }
}
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
function asString(value) {
    if (typeof value !== "string" || !value.trim()) {
        throw new https_1.HttpsError("internal", "Resposta invalida do provedor de IA.");
    }
    return value.trim();
}
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
function asOptionalString(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
function updateAiConfigCache(value) {
    aiConfigCache = {
        value,
        expiresAt: Date.now() + AI_CONFIG_CACHE_TTL_MS,
    };
    return value;
}
function extractRequestPayload(body) {
    if (body && typeof body === "object" && "data" in body) {
        return body.data ?? {};
    }
    return body ?? {};
}
function mapHttpsErrorToStatus(code) {
    switch (code) {
        case "invalid-argument":
            return 400;
        case "permission-denied":
            return 403;
        case "unauthenticated":
            return 401;
        default:
            return 500;
    }
}
//# sourceMappingURL=index.js.map