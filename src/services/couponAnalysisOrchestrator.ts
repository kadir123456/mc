import { geminiVisionService, DetectedMatch } from './geminiVisionService';
import { googleSearchService, MatchData } from './googleSearchService';
import { geminiAnalysisService, FinalAnalysis } from './geminiAnalysisService';
import { ref, set } from 'firebase/database';
import { ref as storageRef, uploadString } from 'firebase/storage';
import { database, storage } from './firebase';

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
      console.log('🌐 ADIM 3/4: Google Search ile gerçek zamanlı veri toplanıyor...');
      const matchDataList: MatchData[] = await googleSearchService.fetchAllMatches(matches);
      onProgress?.('collect', 100);

      onProgress?.('analyze', 50);
      console.log('🧠 ADIM 4/4: Final analiz yapılıyor...');
      const analysis: FinalAnalysis = await geminiAnalysisService.analyzeMatches(
        matches,
        matchDataList
      );
      onProgress?.('analyze', 100);

      const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      let imageUrl = base64Image;
      if (base64Image.startsWith('data:')) {
        try {
          const imagePath = `coupon_images/${userId}/${analysisId}.jpg`;
          const imageRef = storageRef(storage, imagePath);
          await uploadString(imageRef, base64Image, 'data_url');
          imageUrl = imagePath;
          console.log('📸 Görsel Storage\'a kaydedildi');
        } catch (error) {
          console.warn('⚠️ Görsel yükleme hatası:', error);
        }
      }

      const result: AnalysisResult = {
        id: analysisId,
        userId,
        imageUrl,
        uploadedAt: Date.now(),
        analysis,
        status: 'completed',
      };

      await set(ref(database, `analyses/${analysisId}`), result);
      await set(ref(database, `users/${userId}/analyses/${analysisId}`), analysisId);

      await this.cleanOldAnalyses(userId);

      console.log('✅ Orchestrator: Analiz tamamlandı ve kaydedildi!');
      return result;

    } catch (error: any) {
      console.error('❌ Orchestrator hatası:', error);
      throw new Error(error.message || 'Analiz sırasında hata oluştu');
    }
  },

  async cleanOldAnalyses(userId: string): Promise<void> {
    try {
      const { analysisService } = await import('./analysisService');
      const userAnalyses = await analysisService.getUserAnalyses(userId);

      if (userAnalyses.length > 5) {
        const oldestAnalyses = userAnalyses
          .sort((a, b) => a.uploadedAt - b.uploadedAt)
          .slice(0, userAnalyses.length - 5);

        console.log(`🗑️ ${oldestAnalyses.length} eski analiz silinecek...`);

        for (const oldAnalysis of oldestAnalyses) {
          await analysisService.deleteAnalysis(userId, oldAnalysis.id);
        }
      }
    } catch (error) {
      console.warn('⚠️ Eski analizler silinirken hata:', error);
    }
  },

  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
};
