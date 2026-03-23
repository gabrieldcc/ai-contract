import {
  CONTRACT_ANALYSIS_SYSTEM_PROMPT,
  OPENROUTER_API_KEY,
  OPENROUTER_API_URL,
  OPENROUTER_MODEL,
} from '@/constants/openRouter';
import { MOCK_ANALYSIS, MOCK_HISTORY } from '@/constants/mocks';
import { AnalysisHistoryItem, ContractAnalysis, ParsedDocumentPayload } from '@/types/contract';

export const analysisService = {
  async generateAnalysis(document: ParsedDocumentPayload, fileName: string): Promise<ContractAnalysis> {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        plugins: [
          {
            id: 'file-parser',
            pdf: {
              engine: 'pdf-text',
            },
          },
        ],
        response_format: {
          type: 'json_object',
        },
        messages: [
          {
            role: 'system',
            content: CONTRACT_ANALYSIS_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise este contrato em PDF e retorne o JSON solicitado.',
              },
              {
                type: 'file',
                file: {
                  filename: document.fileName,
                  file_data: document.fileDataUrl,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter error: ${response.status} ${errorText}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = parseAnalysisContent(content);

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

function parseAnalysisContent(
  content: unknown
): Pick<ContractAnalysis, 'summary' | 'importantPoints' | 'attentionPoints' | 'risks' | 'recommendations'> {
  const normalizedContent = Array.isArray(content)
    ? content
        .map((item) => {
          if (typeof item === 'string') {
            return item;
          }

          if (item && typeof item === 'object' && 'text' in item && typeof item.text === 'string') {
            return item.text;
          }

          return '';
        })
        .join('\n')
    : typeof content === 'string'
      ? content
      : '';

  const cleaned = normalizedContent
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned) as Partial<ContractAnalysis>;

  return {
    summary: asString(parsed.summary, MOCK_ANALYSIS.summary),
    importantPoints: asStringArray(parsed.importantPoints, MOCK_ANALYSIS.importantPoints),
    attentionPoints: asStringArray(parsed.attentionPoints, MOCK_ANALYSIS.attentionPoints),
    risks: asStringArray(parsed.risks, MOCK_ANALYSIS.risks),
    recommendations: asStringArray(parsed.recommendations, MOCK_ANALYSIS.recommendations),
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
