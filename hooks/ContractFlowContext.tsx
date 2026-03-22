import { MOCK_HISTORY, MOCK_SELECTED_FILE } from '@/constants/mocks';
import { analysisService } from '@/services/analysisService';
import { documentParserService } from '@/services/documentParserService';
import { storageService } from '@/services/storageService';
import { AnalysisHistoryItem, ContractAnalysis, UploadedContractFile } from '@/types/contract';
import React, { createContext, useContext, useMemo, useState } from 'react';

type ContractFlowContextValue = {
  selectedFile: UploadedContractFile | null;
  currentAnalysis: ContractAnalysis | null;
  history: AnalysisHistoryItem[];
  isSelectingFile: boolean;
  isAnalyzing: boolean;
  error: string | null;
  selectMockFile: () => Promise<void>;
  clearSelectedFile: () => void;
  analyzeSelectedContract: () => Promise<boolean>;
  openHistoryAnalysis: (id: string) => Promise<boolean>;
  resetForNewAnalysis: () => void;
};

const ContractFlowContext = createContext<ContractFlowContextValue | null>(null);

export function ContractFlowProvider({ children }: { children: React.ReactNode }) {
  const [selectedFile, setSelectedFile] = useState<UploadedContractFile | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<ContractAnalysis | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem[]>(MOCK_HISTORY);
  const [isSelectingFile, setIsSelectingFile] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectMockFile = async () => {
    setError(null);
    setIsSelectingFile(true);

    try {
      await storageService.uploadContract(MOCK_SELECTED_FILE);
      setSelectedFile({
        ...MOCK_SELECTED_FILE,
        uploadedAt: new Date().toISOString(),
      });
    } catch {
      setError('Não foi possível simular o upload do contrato.');
    } finally {
      setIsSelectingFile(false);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
  };

  const analyzeSelectedContract = async () => {
    if (!selectedFile) {
      setError('Selecione um contrato antes de iniciar a análise.');
      return false;
    }

    setError(null);
    setIsAnalyzing(true);

    try {
      const extractedText = await documentParserService.extractTextFromDocument(selectedFile.uri);
      const generatedAnalysis = await analysisService.generateAnalysis(extractedText, selectedFile.name);
      await storageService.saveAnalysis(generatedAnalysis);

      setCurrentAnalysis(generatedAnalysis);
      setHistory((prev) => [
        {
          id: generatedAnalysis.id,
          contractName: generatedAnalysis.fileName,
          createdAt: generatedAnalysis.createdAt,
          status: 'completed',
        },
        ...prev,
      ]);
      return true;
    } catch {
      setError('Falha ao gerar análise simulada.');
      return false;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openHistoryAnalysis = async (id: string) => {
    setError(null);
    setIsAnalyzing(true);

    try {
      const analysis = await storageService.getAnalysisById(id);
      if (!analysis) {
        setError('A análise selecionada não foi encontrada.');
        return false;
      }

      setCurrentAnalysis(analysis);
      return true;
    } catch {
      setError('Não foi possível carregar os detalhes da análise.');
      return false;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetForNewAnalysis = () => {
    setSelectedFile(null);
    setCurrentAnalysis(null);
    setError(null);
  };

  const value = useMemo(
    () => ({
      selectedFile,
      currentAnalysis,
      history,
      isSelectingFile,
      isAnalyzing,
      error,
      selectMockFile,
      clearSelectedFile,
      analyzeSelectedContract,
      openHistoryAnalysis,
      resetForNewAnalysis,
    }),
    [selectedFile, currentAnalysis, history, isSelectingFile, isAnalyzing, error]
  );

  return <ContractFlowContext.Provider value={value}>{children}</ContractFlowContext.Provider>;
}

export function useContractFlow() {
  const context = useContext(ContractFlowContext);

  if (!context) {
    throw new Error('useContractFlow deve ser usado dentro de ContractFlowProvider');
  }

  return context;
}
