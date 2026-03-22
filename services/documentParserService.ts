export const documentParserService = {
  async extractTextFromDocument(fileUri: string): Promise<string> {
    await delay(650);

    // TODO: integrar parser real para PDF/DOC/DOCX
    return `Texto extraído de forma simulada para: ${fileUri}`;
  },
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
