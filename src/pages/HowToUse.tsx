import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Upload, Sparkles, ShoppingBag } from 'lucide-react';
import { Footer } from '../components/Footer';

export const HowToUse: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Ana Sayfaya Dön
          </Link>

          <h1 className="text-4xl font-bold text-white mb-4">Nasıl Kullanılır?</h1>
          <p className="text-slate-400 mb-12">
            Aikupon'ı kullanarak kuponlarınızı kolayca analiz edebilirsiniz. İşte adım adım rehber:
          </p>

          <div className="space-y-8">
            <div className="bg-slate-800/50 border-l-4 border-blue-500 rounded-xl p-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-3">1. Hesap Oluşturun</h2>
                  <p className="text-slate-300 leading-relaxed mb-4">
                    İlk olarak ücretsiz bir hesap oluşturun. E-posta ve şifre ile veya Google hesabınızla
                    hızlıca kayıt olabilirsiniz.
                  </p>
                  <ul className="text-slate-400 text-sm space-y-1">
                    <li>• İlk kayıtta <span className="text-green-400 font-semibold">1 ücretsiz kredi</span> kazanırsınız</li>
                    <li>• 18 yaş ve üzeri olmalısınız</li>
                    <li>• Kullanım şartlarını kabul etmelisiniz</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border-l-4 border-green-500 rounded-xl p-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                  <Upload className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-3">2. Kupon Görselini Yükleyin</h2>
                  <p className="text-slate-300 leading-relaxed mb-4">
                    Dashboard'unuzdan "Görsel Yükle" sekmesine gelin ve kupon görselinizi seçin.
                  </p>
                  <ul className="text-slate-400 text-sm space-y-1">
                    <li>• PNG, JPG veya WebP formatları desteklenir</li>
                    <li>• Maksimum dosya boyutu: 10MB</li>
                    <li>• Görsel net ve okunabilir olmalıdır</li>
                    <li>• Ekran görüntüsü veya fotoğraf kullanabilirsiniz</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border-l-4 border-purple-500 rounded-xl p-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-3">3. Analizi Başlatın</h2>
                  <p className="text-slate-300 leading-relaxed mb-4">
                    Görseli yükledikten sonra "Analiz Yap" butonuna tıklayın. Sistem otomatik olarak
                    kuponunuzu detaylı şekilde analiz edecektir.
                  </p>
                  <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mt-4">
                    <h4 className="text-white font-semibold mb-2">Analiz Neler İçerir?</h4>
                    <ul className="text-slate-400 text-sm space-y-1">
                      <li>• Her maç için MS1, MS2, Beraberlik tahminleri</li>
                      <li>• Alt/Üst ve Handicap değerlendirmeleri</li>
                      <li>• Güven oranları (0-100 arası)</li>
                      <li>• Takım form durumu analizi</li>
                      <li>• Yaralı/cezalı oyuncu bilgileri</li>
                      <li>• Hava durumu faktörü</li>
                      <li>• Geçmiş karşılaşma istatistikleri</li>
                      <li>• Özel öneriler ve dikkat edilmesi gerekenler</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border-l-4 border-orange-500 rounded-xl p-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-3">4. Kredi Satın Alın</h2>
                  <p className="text-slate-300 leading-relaxed mb-4">
                    Her analiz 1 kredi tüketir. Krediniz bittiğinde "Kredi Al" sekmesinden paket
                    satın alabilirsiniz.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                      <p className="text-blue-400 font-bold text-lg">99 ₺</p>
                      <p className="text-slate-300 text-sm">5 Analiz</p>
                    </div>
                    <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-3">
                      <p className="text-blue-400 font-bold text-lg">299 ₺</p>
                      <p className="text-slate-300 text-sm">20 Analiz</p>
                      <span className="text-xs text-green-400">En Popüler</span>
                    </div>
                    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                      <p className="text-blue-400 font-bold text-lg">499 ₺</p>
                      <p className="text-slate-300 text-sm">50 Analiz</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-slate-800/50 border border-slate-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">İpuçları</h2>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold mt-1">•</span>
                <span>Kupon görsellerinizin net ve okunabilir olmasına dikkat edin</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold mt-1">•</span>
                <span>Analiz sonuçlarını "Geçmiş" sekmesinden istediğiniz zaman görüntüleyebilirsiniz</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold mt-1">•</span>
                <span>Kredileriniz 1 yıl boyunca geçerlidir</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold mt-1">•</span>
                <span>Analiz sonuçları sadece bilgilendirme amaçlıdır, nihai karar size aittir</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/register"
              className="inline-block bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium px-8 py-3 rounded-lg transition"
            >
              Hemen Başla
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};
