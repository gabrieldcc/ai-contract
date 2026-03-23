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
  fileDataUrl: string;
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
