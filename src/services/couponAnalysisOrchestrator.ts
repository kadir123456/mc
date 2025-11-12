import { geminiVisionService, DetectedMatch } from './geminiVisionService';
import { sportsradarService, SportsradarMatchData } from './sportsradarService';
import { geminiAnalysisService, FinalAnalysis } from './geminiAnalysisService';

export interface AnalysisResult {
  id: string;
  userId: string;
  imageUrl: string;
  uploadedAt: number;
  analysis: FinalAnalysis;
  status: 'completed';
}

export interface ProgressCallback {
  (step: 'upload' | 'detect' | 'collect' | 'analyze', progress: number): void;
}

export const couponAnalysisOrchestrator = {
  async analyzeImage(
    userId: string,
    base64Image: string,
    onProgress?: ProgressCallback
  ): Promise<AnalysisResult> {
    console.log('🚀 Orchestrator: Analiz süreci başlıyor...');

    try {
      onProgress?.('upload', 50);
      console.log('📤 ADIM 1/4: Görsel hazırlanıyor...');
      await this.delay(500);
      onProgress?.('upload', 100);

      onProgress?.('detect', 30);
      console.log('👁️ ADIM 2/4: Maçlar tespit ediliyor...');
      const matches: DetectedMatch[] = await geminiVisionService.detectMatches(base64Image);
      onProgress?.('detect', 100);

      onProgress?.('collect', 30);
      console.log('🌐 ADIM 3/4: Sportsradar API ile gerçek zamanlı veri toplanıyor...');
      const matchDataList: SportsradarMatchData[] = await sportsradarService.fetchAllMatches(matches);
      onProgress?.('collect', 100);

      onProgress?.('analyze', 50);
      console.log('🧠 ADIM 4/4: Final analiz yapılıyor...');
      const analysis: FinalAnalysis = await geminiAnalysisService.analyzeMatches(
        matches,
        matchDataList
      );
      onProgress?.('analyze', 100);

      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const result: AnalysisResult = {
        id: analysisId,
        userId,
        imageUrl: analysisId,
        uploadedAt: Date.now(),
        analysis,
        status: 'completed',
      };

      console.log('✅ Orchestrator: Analiz tamamlandı! (Veritabanına kaydedilmedi)');
      return result;

    } catch (error: any) {
      console.error('❌ Orchestrator hatası:', error);
      throw new Error(error.message || 'Analiz sırasında hata oluştu');
    }
  },

  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};
