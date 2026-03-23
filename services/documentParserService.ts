import { ParsedDocumentPayload, UploadedContractFile } from '@/types/contract';
import * as FileSystem from 'expo-file-system/legacy';

export const documentParserService = {
  async extractTextFromDocument(file: UploadedContractFile): Promise<ParsedDocumentPayload> {
    const base64File = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      fileName: file.name,
      fileDataUrl: `data:application/pdf;base64,${base64File}`,
    };
  },
};
