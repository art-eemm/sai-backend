export interface IPDFService {
  extractDate(filePath: string): Promise<string | null>;
  extractText(filePath: string): Promise<string>;
}
