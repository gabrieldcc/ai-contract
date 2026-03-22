import { AnalysisHistoryItem, AppUser, ContractAnalysis, UploadedContractFile } from '@/types/contract';

export const MOCK_SELECTED_FILE: UploadedContractFile = {
  id: 'file_001',
  name: 'Contrato_Servicos_TI_2026.pdf',
  sizeLabel: '2.4 MB',
  type: 'pdf',
  uri: 'mock://contratos/Contrato_Servicos_TI_2026.pdf',
  uploadedAt: '2026-03-22T12:30:00.000Z',
};

export const MOCK_ANALYSIS: ContractAnalysis = {
  id: 'analysis_001',
  fileName: 'Contrato_Servicos_TI_2026.pdf',
  summary:
    'Contrato de prestação de serviços de TI com vigência de 24 meses, incluindo suporte técnico, SLA e cláusulas de confidencialidade.',
  importantPoints: [
    'Prazo contratual definido com possibilidade de renovação automática.',
    'SLA com tempo máximo de resposta de 4 horas para incidentes críticos.',
    'Cláusula de confidencialidade válida por 5 anos após término contratual.',
  ],
  attentionPoints: [
    'Multa por rescisão antecipada sem regra de proporcionalidade explícita.',
    'Reajuste anual atrelado a índice sem teto de variação.',
    'Ausência de cláusula de limitação de responsabilidade em caso de falha sistêmica.',
  ],
  risks: [
    'Risco financeiro elevado em cenário de saída antecipada do contrato.',
    'Risco de litígio por redação ambígua sobre responsabilidade por indisponibilidade.',
  ],
  recommendations: [
    'Adicionar cláusula de limitação de responsabilidade com teto percentual.',
    'Definir método de cálculo proporcional para multa de rescisão.',
    'Incluir plano de continuidade e penalidades graduais por descumprimento de SLA.',
  ],
  createdAt: '2026-03-22T12:35:00.000Z',
};

export const MOCK_HISTORY: AnalysisHistoryItem[] = [
  {
    id: 'analysis_001',
    contractName: 'Contrato_Servicos_TI_2026.pdf',
    createdAt: '2026-03-22T12:35:00.000Z',
    status: 'completed',
  },
  {
    id: 'analysis_002',
    contractName: 'Acordo_Parceria_Comercial.docx',
    createdAt: '2026-03-20T10:10:00.000Z',
    status: 'processing',
  },
  {
    id: 'analysis_003',
    contractName: 'Termo_Fornecimento_Anual.pdf',
    createdAt: '2026-03-18T08:40:00.000Z',
    status: 'failed',
  },
];

export const MOCK_ANALYSIS_BY_ID: Record<string, ContractAnalysis> = {
  analysis_001: MOCK_ANALYSIS,
  analysis_002: {
    ...MOCK_ANALYSIS,
    id: 'analysis_002',
    fileName: 'Acordo_Parceria_Comercial.docx',
    summary: 'Acordo comercial em processamento (simulação).',
    createdAt: '2026-03-20T10:10:00.000Z',
  },
  analysis_003: {
    ...MOCK_ANALYSIS,
    id: 'analysis_003',
    fileName: 'Termo_Fornecimento_Anual.pdf',
    summary: 'Análise anterior com falha simulada para demonstrar estado de erro.',
    createdAt: '2026-03-18T08:40:00.000Z',
  },
};

export const MOCK_USER: AppUser = {
  id: 'user_001',
  name: 'Gabriel Castro',
  email: 'gabriel@email.com',
};
