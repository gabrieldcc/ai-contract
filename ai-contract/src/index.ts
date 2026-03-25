import {setGlobalOptions} from "firebase-functions";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";

setGlobalOptions({maxInstances: 10});

const openRouterApiKey = defineSecret("OPENROUTER_API_KEY");
const OPENROUTER_API_URL =
  "https://openrouter.ai/api/v1/chat/completions";
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

export const analyzeContract = onCall(
  {
    region: "us-central1",
    secrets: [openRouterApiKey],
    cors: true,
  },
  async (request): Promise<AnalyzeContractResponse> => {
    const data = request.data as AnalyzeContractRequest;
    const fileName =
      typeof data.fileName === "string" ? data.fileName : "";
    const fileDataUrl =
      typeof data.fileDataUrl === "string" ? data.fileDataUrl : "";

    if (!fileName ||
      !fileDataUrl.startsWith("data:application/pdf;base64,")) {
      throw new HttpsError(
        "invalid-argument",
        "Envie um PDF valido para analise.",
      );
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new HttpsError(
        "internal",
        `OpenRouter error: ${response.status} ${errorText}`,
      );
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    return parseAnalysisContent(content);
  },
);

/**
 * Normalizes the provider response into the app contract schema.
 * @param {unknown} content Raw OpenRouter message content.
 * @return {AnalyzeContractResponse} Structured contract analysis.
 */
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

/**
 * Ensures a required string field exists in the model response.
 * @param {unknown} value Candidate field value.
 * @return {string} Non-empty string value.
 */
function asString(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError("internal", "Resposta invalida do provedor de IA.");
  }

  return value.trim();
}

/**
 * Ensures a required list of strings exists in the model response.
 * @param {unknown} value Candidate field value.
 * @return {string[]} Non-empty list of strings.
 */
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
