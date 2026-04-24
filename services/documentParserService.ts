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
