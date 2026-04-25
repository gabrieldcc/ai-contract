import { MOCK_HISTORY } from '@/constants/mocks';
import { AnalysisHistoryItem, ContractAnalysis, ParsedDocumentPayload } from '@/types/contract';

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

type ParsedOpenRouterContent = {
  summary?: unknown;
  importantPoints?: unknown;
  attentionPoints?: unknown;
  risks?: unknown;
  recommendations?: unknown;
};

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = 'openai/gpt-4o-mini';

export const analysisService = {
  async generateAnalysis(document: ParsedDocumentPayload, fileName: string): Promise<ContractAnalysis> {
    if (!OPENROUTER_API_KEY) {
      throw new Error('Defina EXPO_PUBLIC_OPENROUTER_API_KEY antes de iniciar o app.');
    }

    console.log('analysisService.generateAnalysis:start', {
      fileName,
      url: OPENROUTER_API_URL,
      model: OPENROUTER_MODEL,
      apiKeyFingerprint: maskSecret(OPENROUTER_API_KEY),
      documentFileName: document.fileName,
      extractedTextLength: document.extractedText.length,
      extractedTextPreview: document.extractedText.slice(0, 120),
    });

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          response_format: {
            type: 'json_object',
          },
          messages: [
            {
              role: 'system',
              content: `
Voce e um assistente de analise contratual.
Leia o texto de um contrato e responda apenas JSON valido.

Formato:
{
  "summary": "string",
  "importantPoints": ["string"],
  "attentionPoints": ["string"],
  "risks": ["string"],
  "recommendations": ["string"]
}

Regras:
- Responda em portugues do Brasil.
- Nao use markdown.
- Seja objetivo.
              `.trim(),
            },
            {
              role: 'user',
              content: `
Nome do arquivo: ${document.fileName}

Texto do contrato:
${document.extractedText}
              `.trim(),
            },
          ],
        }),
      });

      console.log('analysisService.generateAnalysis:response', {
        fileName,
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        requestId: response.headers.get('x-request-id'),
      });

      const rawText = await response.text();

      console.log('analysisService.generateAnalysis:responseBody', {
        fileName,
        responsePreview: rawText.slice(0, 300),
      });

      if (!response.ok) {
        console.error('analysisService.generateAnalysis:requestFailed', {
          fileName,
          status: response.status,
          statusText: response.statusText,
          requestId: response.headers.get('x-request-id'),
          responseBody: rawText,
          likelyCause: inferOpenRouterCause(response.status, rawText),
        });

        throw new Error(formatOpenRouterError(response.status, rawText));
      }

      const payload = JSON.parse(rawText) as OpenRouterResponse;
      const content = payload.choices?.[0]?.message?.content;
      const normalizedContent = normalizeContent(content);
      const parsed = JSON.parse(stripMarkdownFence(normalizedContent)) as ParsedOpenRouterContent;

      const generatedAnalysis = {
        id: `analysis_${Date.now()}`,
        fileName,
        createdAt: new Date().toISOString(),
        summary: asString(parsed.summary),
        importantPoints: asStringArray(parsed.importantPoints),
        attentionPoints: asStringArray(parsed.attentionPoints),
        risks: asStringArray(parsed.risks),
        recommendations: asStringArray(parsed.recommendations),
      };

      console.log('analysisService.generateAnalysis:success', {
        fileName: generatedAnalysis.fileName,
        createdAt: generatedAnalysis.createdAt,
        summaryPreview: generatedAnalysis.summary.slice(0, 120),
        importantPointsCount: generatedAnalysis.importantPoints.length,
        attentionPointsCount: generatedAnalysis.attentionPoints.length,
        risksCount: generatedAnalysis.risks.length,
        recommendationsCount: generatedAnalysis.recommendations.length,
      });

      return generatedAnalysis;
    } catch (error) {
      console.error('analysisService.generateAnalysis:error', {
        fileName,
        url: OPENROUTER_API_URL,
        apiKeyFingerprint: maskSecret(OPENROUTER_API_KEY),
        error: serializeError(error),
      });
      throw error;
    }
  },

  async getHistory(): Promise<AnalysisHistoryItem[]> {
    await delay(500);

    return MOCK_HISTORY;
  },
};

function normalizeContent(content: OpenRouterResponse['choices'] extends Array<infer T>
  ? T extends { message?: { content?: infer C } }
    ? C
    : never
  : never): string {
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item?.text === 'string' ? item.text : ''))
      .join('\n');
  }

  if (typeof content === 'string') {
    return content;
  }

  throw new Error('Resposta invalida da OpenRouter.');
}

function stripMarkdownFence(value: string): string {
  return value.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

function asString(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Resposta invalida da OpenRouter.');
  }

  return value.trim();
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error('Resposta invalida da OpenRouter.');
  }

  const normalized = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);

  if (normalized.length === 0) {
    throw new Error('Resposta invalida da OpenRouter.');
  }

  return normalized;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatOpenRouterError(status: number, rawText: string): string {
  const normalizedBody = rawText.trim();
  const likelyCause = inferOpenRouterCause(status, rawText);

  if (!normalizedBody) {
    return `OpenRouter error: ${status}. ${likelyCause}`;
  }

  return `OpenRouter error: ${status}. ${normalizedBody}. ${likelyCause}`;
}

function inferOpenRouterCause(status: number, rawText: string): string {
  const normalizedBody = rawText.toLowerCase();

  if (status === 401 && normalizedBody.includes('user not found')) {
    return 'A chave da OpenRouter parece invalida, revogada, vinculada a uma conta inexistente ou nao esta sendo lida corretamente pelo app.';
  }

  if (status === 401) {
    return 'A autenticacao da OpenRouter falhou. Verifique a chave em EXPO_PUBLIC_OPENROUTER_API_KEY.';
  }

  if (status === 403) {
    return 'A chave foi reconhecida, mas nao tem permissao para este recurso ou modelo.';
  }

  if (status === 429) {
    return 'O limite de requisicoes ou credito da OpenRouter pode ter sido excedido.';
  }

  if (status >= 500) {
    return 'A OpenRouter retornou erro interno.';
  }

  return 'Falha ao chamar a OpenRouter.';
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    value: error,
  };
}

function maskSecret(value: string | undefined): string {
  if (!value) {
    return 'missing';
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}***`;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
