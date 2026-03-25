import { MOCK_HISTORY } from '@/constants/mocks';
import { analysisService } from '@/services/analysisService';
import { documentParserService } from '@/services/documentParserService';
import { storageService } from '@/services/storageService';
import { AnalysisHistoryItem, ContractAnalysis, UploadedContractFile } from '@/types/contract';
import { formatFileSize } from '@/utils/format';
import * as DocumentPicker from 'expo-document-picker';
import React, { createContext, useContext, useMemo, useState } from 'react';

type ContractFlowContextValue = {
  selectedFile: UploadedContractFile | null;
  currentAnalysis: ContractAnalysis | null;
  history: AnalysisHistoryItem[];
  isSelectingFile: boolean;
  isAnalyzing: boolean;
  error: string | null;
  selectFile: () => Promise<void>;
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

  const selectFile = async () => {
    setError(null);
    setIsSelectingFile(true);
    console.log('ContractFlow.selectFile:start');

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        console.log('ContractFlow.selectFile:canceled');
        return;
      }

      const asset = result.assets[0];
      const extension = asset.name.split('.').pop()?.toLowerCase();

      if (!extension || !isSupportedFileType(extension)) {
        setError('Selecione um arquivo PDF.');
        return;
      }

      const pickedFile: UploadedContractFile = {
        id: asset.uri,
        name: asset.name,
        sizeLabel: formatFileSize(asset.size),
        type: 'pdf',
        uri: asset.uri,
        uploadedAt: new Date().toISOString(),
      };

      console.log('ContractFlow.selectFile:selected', {
        name: pickedFile.name,
        uri: pickedFile.uri,
        sizeLabel: pickedFile.sizeLabel,
      });

      await storageService.uploadContract(pickedFile);
      setSelectedFile(pickedFile);
    } catch (error) {
      console.error('ContractFlow.selectFile:error', {
        error,
      });
      setError('Nao foi possivel selecionar o contrato.');
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
    console.log('ContractFlow.analyzeSelectedContract:start', {
      fileName: selectedFile.name,
      fileUri: selectedFile.uri,
    });

    try {
      const parsedDocument = await documentParserService.extractTextFromDocument(selectedFile);
      console.log('ContractFlow.analyzeSelectedContract:documentParsed', {
        fileName: parsedDocument.fileName,
        dataUrlPrefix: parsedDocument.fileDataUrl.slice(0, 32),
        dataUrlLength: parsedDocument.fileDataUrl.length,
      });

      const generatedAnalysis = await analysisService.generateAnalysis(parsedDocument, selectedFile.name);
      console.log('ContractFlow.analyzeSelectedContract:analysisGenerated', {
        fileName: generatedAnalysis.fileName,
        createdAt: generatedAnalysis.createdAt,
      });
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
    } catch (error) {
      console.error('ContractFlow.analyzeSelectedContract:error', {
        fileName: selectedFile.name,
        error,
      });
      setError(error instanceof Error ? error.message : 'Falha ao gerar a analise do contrato.');
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
      selectFile,
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

function isSupportedFileType(value: string): value is UploadedContractFile['type'] {
  return value === 'pdf';
}
