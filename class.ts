Instalar

npx expo install expo-file-system expo-document-picker
Se você chegou a instalar pdfjs-dist, ele não é mais necessário nessa versão simplificada. Pode remover:

npm uninstall pdfjs-dist
Criar variável
Arquivo .env:

EXPO_PUBLIC_OPENROUTER_API_KEY=sua_chave_aqui
Arquivos para colar

types/contract

export type AnalysisStatus = 'completed' | 'processing' | 'failed';

export type UploadedContractFile = {
  id: string;
  name: string;
  sizeLabel: string;
  type: 'pdf';
  uri: string;
  uploadedAt: string;
};

export type ParsedDocumentPayload = {
  fileName: string;
  extractedText: string;
};

export type ContractAnalysis = {
  id: string;
  fileName: string;
  summary: string;
  importantPoints: string[];
  attentionPoints: string[];
  risks: string[];
  recommendations: string[];
  createdAt: string;
};

export type AnalysisHistoryItem = {
  id: string;
  contractName: string;
  createdAt: string;
  status: AnalysisStatus;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
};
services/documentParserService

import { ParsedDocumentPayload, UploadedContractFile } from '@/types/contract';
import * as FileSystem from 'expo-file-system/legacy';

export const documentParserService = {
  async extractTextFromDocument(file: UploadedContractFile): Promise<ParsedDocumentPayload> {
    console.log('documentParserService.extractTextFromDocument:start', {
      fileName: file.name,
      fileUri: file.uri,
      uploadedAt: file.uploadedAt,
    });

    try {
      const base64File = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const rawPdfContent = decodeBase64(base64File);

      console.log('documentParserService.extractTextFromDocument:fileRead', {
        fileName: file.name,
        base64Length: base64File.length,
        base64Prefix: base64File.slice(0, 20),
        contentLength: rawPdfContent.length,
        contentPrefix: rawPdfContent.slice(0, 40),
      });

      if (!rawPdfContent.startsWith('%PDF-')) {
        console.error('documentParserService.extractTextFromDocument:invalidPdfSignature', {
          fileName: file.name,
          contentPrefix: rawPdfContent.slice(0, 40),
        });
        throw new Error('O arquivo selecionado nao parece ser um PDF valido.');
      }

      const extractedText = buildDemoContractText(file, rawPdfContent.length);

      const parsedDocument = {
        fileName: file.name,
        extractedText,
      };

      console.log('documentParserService.extractTextFromDocument:success', {
        fileName: parsedDocument.fileName,
        extractedTextLength: parsedDocument.extractedText.length,
        extractedTextPreview: parsedDocument.extractedText.slice(0, 120),
      });

      return parsedDocument;
    } catch (error) {
      console.error('documentParserService.extractTextFromDocument:error', {
        fileName: file.name,
        fileUri: file.uri,
        error,
      });
      throw error;
    }
  },
};

function decodeBase64(value: string): string {
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(value);
  }

  throw new Error('Nao foi possivel decodificar o PDF em base64 no dispositivo.');
}

function buildDemoContractText(file: UploadedContractFile, rawContentLength: number): string {
  return `
Contrato identificado no aplicativo:
- Nome do arquivo: ${file.name}
- Tamanho exibido: ${file.sizeLabel}
- Data de upload: ${file.uploadedAt}
- Tamanho bruto aproximado do PDF: ${rawContentLength} caracteres

Considere este documento como um contrato de prestacao de servicos entre uma empresa contratante e uma empresa fornecedora.
Analise os elementos normalmente presentes nesse tipo de contrato, com foco em:
- objeto do contrato
- prazo de vigencia
- pagamento
- multa e rescisao
- confidencialidade
- responsabilidades das partes
- riscos juridicos e operacionais

Se o conteudo do documento nao estiver integralmente disponivel, deixe isso claro no resumo e nas recomendacoes.
  `.trim();
}
services/analysisService

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
      });

      const rawText = await response.text();

      console.log('analysisService.generateAnalysis:responseBody', {
        fileName,
        responsePreview: rawText.slice(0, 300),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter error: ${response.status} ${rawText}`);
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
        error,
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
hooks/ContractFlowContext

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
        console.error('ContractFlow.selectFile:invalidType', {
          assetName: asset.name,
          extension,
        });
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
        fileName: pickedFile.name,
        fileUri: pickedFile.uri,
        sizeLabel: pickedFile.sizeLabel,
      });

      await storageService.uploadContract(pickedFile);

      console.log('ContractFlow.selectFile:success', {
        fileName: pickedFile.name,
      });

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
    console.log('ContractFlow.clearSelectedFile');
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
        extractedTextLength: parsedDocument.extractedText.length,
        extractedTextPreview: parsedDocument.extractedText.slice(0, 120),
      });

      const generatedAnalysis = await analysisService.generateAnalysis(parsedDocument, selectedFile.name);
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

      console.log('ContractFlow.analyzeSelectedContract:success', {
        fileName: generatedAnalysis.fileName,
        createdAt: generatedAnalysis.createdAt,
      });

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

    console.log('ContractFlow.openHistoryAnalysis:start', { id });

    try {
      const analysis = await storageService.getAnalysisById(id);

      if (!analysis) {
        console.error('ContractFlow.openHistoryAnalysis:notFound', { id });
        setError('A análise selecionada não foi encontrada.');
        return false;
      }

      setCurrentAnalysis(analysis);

      console.log('ContractFlow.openHistoryAnalysis:success', {
        id,
        fileName: analysis.fileName,
      });

      return true;
    } catch (error) {
      console.error('ContractFlow.openHistoryAnalysis:error', {
        id,
        error,
      });
      setError('Não foi possível carregar os detalhes da análise.');
      return false;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetForNewAnalysis = () => {
    console.log('ContractFlow.resetForNewAnalysis');
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
babel.config.js

module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: ['expo-router/babel'],
  };
};
Se quiser, eu posso te montar isso em “ordem de aula”, dizendo exatamente qual arquivo colar primeiro, segundo, terceiro e o que explicar em cada etapa.





9:25 PM
sim
9:26 PM


Perfeito. Esta é a melhor ordem para a aula, com o que explicar em cada etapa.

1. Instalação
Rodar:

npx expo install expo-file-system expo-document-picker
Se tiver instalado antes:

npm uninstall pdfjs-dist
Explicação:

expo-document-picker seleciona o PDF
expo-file-system permite ler o arquivo no app
nesta versão da aula, não vamos parsear o PDF de verdade; vamos validar o arquivo e seguir com texto-base para demonstrar a integração com IA
2. .env
Criar:

EXPO_PUBLIC_OPENROUTER_API_KEY=sua_chave_aqui
Explicação:

como a chamada está sendo feita no front, a chave precisa estar disponível no app
isso serve para demo/aula, mas não é o ideal para produção
3. types/contract
Cole primeiro esse arquivo.

Explicação:

aqui você define o contrato de dados da aplicação
o ponto novo é ParsedDocumentPayload, que agora carrega extractedText
4. services/documentParserService
Cole em seguida.

Explicação:

esse serviço valida se o arquivo realmente parece um PDF
depois gera um texto-base de demonstração
isso simplifica a aula e evita o problema de parser real do PDF no front
Mensagem didática:

“Aqui eu não estou lendo o conteúdo jurídico real do PDF; estou apenas transformando o upload em texto para demonstrar a integração com a OpenRouter.”
5. services/analysisService
Cole depois.

Explicação:

esse é o coração da integração
aqui entra:
URL da OpenRouter
API key
modelo
prompt
fetch
tratamento da resposta
mostre que a IA recebe texto e devolve JSON estruturado
Mensagem didática:

“A integração com IA acontece aqui. O resto da aplicação só prepara os dados e consome o resultado.”
6. hooks/ContractFlowContext
Cole por último.

Explicação:

esse arquivo orquestra todo o fluxo da tela
selecionar arquivo
chamar parser
chamar análise
salvar resultado no estado
navegar depois
Mensagem didática:

“O contexto coordena os serviços. Ele não sabe como a IA funciona internamente; ele só chama os serviços na ordem certa.”
7. babel.config.js
Garanta que está simples assim:

module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: ['expo-router/babel'],
  };
};
Explicação:

essa versão evita a complicação que apareceu quando tentamos usar parser de PDF mais pesado no app
8. O que enfatizar na aula

seleção do arquivo
leitura/validação básica
transformação em texto
envio para OpenRouter
resposta estruturada em JSON
atualização da UI
9. O que deixar claro para os alunos

isso funciona como demo de integração com IA
não é uma extração real de conteúdo jurídico do PDF
para produção, o ideal seria:
backend
chave protegida
parser real de PDF
persistência real