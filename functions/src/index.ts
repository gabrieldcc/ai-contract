import {onRequest, HttpsError} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {getApp, getApps, initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const openRouterApiKey = defineSecret("OPENROUTER_API_KEY");
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

const adminApp = getApps().length ? getApp() : initializeApp();
const firestore = getFirestore(adminApp);

let aiConfigCache:
  | {
      value: AiRuntimeConfig;
      expiresAt: number;
    }
  | null = null;

type AnalyzeContractRequest = {
  fileName?: unknown;
  fileDataUrl?: unknown;
};

type AnalyzeContractResponse = {
  summary: string;
  importantPoints: string[];
  attentionPoints: string[];
  risks: string[];
  recommendations: string[];
};

type FirestoreAiConfig = {
  model?: unknown;
  contractPrompt?: unknown;
};

type AiRuntimeConfig = {
  model: string;
  contractPrompt: string;
};

export const analyzeContract = onRequest(
  {
    region: "us-central1",
    secrets: [openRouterApiKey],
    cors: true,
    invoker: "public",
  },
  async (request, response): Promise<void> => {
    const requestId =
      request.headers["x-cloud-trace-context"] ?? `http-${Date.now()}`;

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
      const fileDataUrl =
        typeof data.fileDataUrl === "string" ? data.fileDataUrl : "";

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
        throw new HttpsError(
          "invalid-argument",
          "Envie um PDF valido para analise.",
        );
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
                  text:
                    "Analise este contrato em PDF e retorne o JSON solicitado.",
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
        throw new HttpsError(
          "internal",
          `OpenRouter error: ${openRouterResponse.status} ${errorText}`,
        );
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
    } catch (error) {
      if (error instanceof HttpsError) {
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

      const message =
        error instanceof Error ? error.message : "Unexpected backend error";
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
  },
);

async function getAiRuntimeConfig(): Promise<AiRuntimeConfig> {
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

    const rawConfig = configSnapshot.data() as FirestoreAiConfig | undefined;
    return updateAiConfigCache({
      model: asOptionalString(rawConfig?.model, DEFAULT_OPENROUTER_MODEL),
      contractPrompt: asOptionalString(
        rawConfig?.contractPrompt,
        DEFAULT_CONTRACT_ANALYSIS_SYSTEM_PROMPT,
      ),
    });
  } catch (error) {
    logger.error("Failed to load AI config from Firestore.", {error});
    return updateAiConfigCache({
      model: DEFAULT_OPENROUTER_MODEL,
      contractPrompt: DEFAULT_CONTRACT_ANALYSIS_SYSTEM_PROMPT,
    });
  }
}

function parseAnalysisContent(content: unknown): AnalyzeContractResponse {
  const normalizedContent = Array.isArray(content) ?
    content.map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (
        item &&
        typeof item === "object" &&
        "text" in item &&
        typeof item.text === "string"
      ) {
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

  const parsed = JSON.parse(cleaned) as Partial<AnalyzeContractResponse>;

  return {
    summary: asString(parsed.summary),
    importantPoints: asStringArray(parsed.importantPoints),
    attentionPoints: asStringArray(parsed.attentionPoints),
    risks: asStringArray(parsed.risks),
    recommendations: asStringArray(parsed.recommendations),
  };
}

function asString(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError("internal", "Resposta invalida do provedor de IA.");
  }

  return value.trim();
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new HttpsError("internal", "Resposta invalida do provedor de IA.");
  }

  const normalized = value.filter((item): item is string =>
    typeof item === "string" && item.trim().length > 0,
  );

  if (normalized.length === 0) {
    throw new HttpsError("internal", "Resposta invalida do provedor de IA.");
  }

  return normalized;
}

function asOptionalString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function updateAiConfigCache(value: AiRuntimeConfig): AiRuntimeConfig {
  aiConfigCache = {
    value,
    expiresAt: Date.now() + AI_CONFIG_CACHE_TTL_MS,
  };

  return value;
}

function extractRequestPayload(body: unknown): AnalyzeContractRequest {
  if (body && typeof body === "object" && "data" in body) {
    return (body as {data?: AnalyzeContractRequest}).data ?? {};
  }

  return (body as AnalyzeContractRequest | undefined) ?? {};
}

function mapHttpsErrorToStatus(code: HttpsError["code"]): number {
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
