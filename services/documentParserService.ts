import { ParsedDocumentPayload, UploadedContractFile } from '@/types/contract';
import * as FileSystem from 'expo-file-system/legacy';

export const documentParserService = {
  async extractTextFromDocument(file: UploadedContractFile): Promise<ParsedDocumentPayload> {
    console.log('documentParserService.extractTextFromDocument:start', {
      fileName: file.name,
      fileUri: file.uri,
      uploadedAt: file.uploadedAt,
    });

    const base64File = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log('documentParserService.extractTextFromDocument:success', {
      fileName: file.name,
      base64Length: base64File.length,
    });

    return {
      fileName: file.name,
      fileDataUrl: `data:application/pdf;base64,${base64File}`,
    };
  },
};
