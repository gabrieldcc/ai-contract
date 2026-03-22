import { MOCK_ANALYSIS, MOCK_HISTORY } from '@/constants/mocks';
import { AnalysisHistoryItem, ContractAnalysis } from '@/types/contract';

export const analysisService = {
  async generateAnalysis(contractText: string, fileName: string): Promise<ContractAnalysis> {
    await delay(1200);

    // TODO: integrar com API de IA para análise real
    return {
      ...MOCK_ANALYSIS,
      id: `analysis_${Date.now()}`,
      fileName,
      createdAt: new Date().toISOString(),
      summary: `${MOCK_ANALYSIS.summary} (simulação baseada em texto extraído)`,
      importantPoints: [...MOCK_ANALYSIS.importantPoints],
      attentionPoints: [...MOCK_ANALYSIS.attentionPoints],
      risks: [...MOCK_ANALYSIS.risks],
      recommendations: [...MOCK_ANALYSIS.recommendations],
      // Mantido apenas para mostrar o contrato de entrada da função
      // e facilitar integração futura com prompt estruturado.
      ...(contractText ? {} : {}),
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
