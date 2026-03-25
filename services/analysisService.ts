import { firebaseFunctionsRegion, firebaseProjectId } from '@/constants/firebase';
import { MOCK_ANALYSIS, MOCK_HISTORY } from '@/constants/mocks';
import { AnalysisHistoryItem, ContractAnalysis, ParsedDocumentPayload } from '@/types/contract';

type AnalyzeContractPayload = {
  fileName: string;
  fileDataUrl: string;
};

type AnalyzeContractResponse = {
  summary?: unknown;
  importantPoints?: unknown;
  attentionPoints?: unknown;
  risks?: unknown;
  recommendations?: unknown;
};

type AnalyzeContractHttpResponse = {
  data?: AnalyzeContractResponse;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

const ANALYZE_CONTRACT_URL = `https://${firebaseFunctionsRegion}-${firebaseProjectId}.cloudfunctions.net/analyzeContract`;

export const analysisService = {
  async generateAnalysis(document: ParsedDocumentPayload, fileName: string): Promise<ContractAnalysis> {
    let payload: AnalyzeContractHttpResponse;
    console.log('analysisService.generateAnalysis:start', {
      url: ANALYZE_CONTRACT_URL,
      fileName,
      documentFileName: document.fileName,
      dataUrlPrefix: document.fileDataUrl.slice(0, 32),
      dataUrlLength: document.fileDataUrl.length,
    });

    try {
      const response = await fetch(ANALYZE_CONTRACT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            fileName: document.fileName,
            fileDataUrl: document.fileDataUrl,
          } satisfies AnalyzeContractPayload,
        }),
      });
      const responseText = await response.text();
      console.log('analysisService.generateAnalysis:response', {
        status: response.status,
        ok: response.ok,
        responsePreview: responseText.trim().slice(0, 300),
      });
      payload = tryParseHttpResponse(responseText);

      if (!response.ok || payload.error) {
        throw buildHttpErrorMessage(payload, response.status, responseText);
      }
    } catch (error) {
      console.error('analysisService.generateAnalysis:error', {
        fileName,
        url: ANALYZE_CONTRACT_URL,
        error,
      });
      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Falha ao chamar o backend da analise.');
    }

    const parsed = parseAnalysisResponse(payload.data ?? {});

    return {
      id: `analysis_${Date.now()}`,
      fileName,
      createdAt: new Date().toISOString(),
      summary: parsed.summary,
      importantPoints: parsed.importantPoints,
      attentionPoints: parsed.attentionPoints,
      risks: parsed.risks,
      recommendations: parsed.recommendations,
    };
  },

  async getHistory(): Promise<AnalysisHistoryItem[]> {
    await delay(500);

    // TODO: consultar histórico real (Firestore)
    return MOCK_HISTORY;
  },
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseAnalysisResponse(
  payload: AnalyzeContractResponse
): Pick<ContractAnalysis, 'summary' | 'importantPoints' | 'attentionPoints' | 'risks' | 'recommendations'> {
  return {
    summary: asString(payload.summary, MOCK_ANALYSIS.summary),
    importantPoints: asStringArray(payload.importantPoints, MOCK_ANALYSIS.importantPoints),
    attentionPoints: asStringArray(payload.attentionPoints, MOCK_ANALYSIS.attentionPoints),
    risks: asStringArray(payload.risks, MOCK_ANALYSIS.risks),
    recommendations: asStringArray(payload.recommendations, MOCK_ANALYSIS.recommendations),
  };
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return normalized.length > 0 ? normalized : fallback;
}

function buildHttpErrorMessage(payload: AnalyzeContractHttpResponse, status: number, rawResponse: string): Error {
  const code = payload.error?.code ?? 'unknown';
  const message = payload.error?.message ?? `HTTP ${status}`;
  const details = stringifyDetails(payload.error?.details);
  const responsePreview = rawResponse.trim().slice(0, 300);

  console.error('analyzeContract http error', {
    code,
    message,
    details,
    status,
    payload,
    responsePreview,
  });

  return new Error(
    `Erro backend (${code}): ${message}${details ? ` | details: ${details}` : ''}${responsePreview ? ` | resposta: ${responsePreview}` : ''}`
  );
}

function stringifyDetails(details: unknown): string {
  if (typeof details === 'string') {
    return details;
  }

  if (details == null) {
    return '';
  }

  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

function tryParseHttpResponse(responseText: string): AnalyzeContractHttpResponse {
  try {
    return JSON.parse(responseText) as AnalyzeContractHttpResponse;
  } catch {
    return {
      error: {
        code: 'invalid-json-response',
        message: 'Backend retornou uma resposta nao JSON.',
        details: responseText.trim().slice(0, 1000),
      },
    };
  }
}
