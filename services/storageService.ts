import { MOCK_ANALYSIS_BY_ID } from '@/constants/mocks';
import { ContractAnalysis, UploadedContractFile } from '@/types/contract';

export const storageService = {
  async uploadContract(file: UploadedContractFile): Promise<{ fileUrl: string }> {
    await delay(700);

    // TODO: integrar com Firebase Storage (upload real do arquivo)
    return { fileUrl: `https://mock-storage.local/${file.name}` };
  },

  async saveAnalysis(analysis: ContractAnalysis): Promise<void> {
    await delay(300);

    // TODO: integrar com Firestore para persistir análise vinculada ao usuário
    void analysis;
  },

  async getAnalysisById(id: string): Promise<ContractAnalysis | null> {
    await delay(350);

    // TODO: buscar análise real do banco (Firestore)
    return MOCK_ANALYSIS_BY_ID[id] ?? null;
  },
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
