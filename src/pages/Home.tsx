import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, TrendingUp, Shield, Clock, ChevronRight, Star, Check, BarChart3 } from 'lucide-react';
import { Footer } from '../components/Footer';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-8 h-8 text-yellow-400" />
              <h1 className="text-2xl font-bold text-white">Aikupon</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/login"
                className="text-slate-300 hover:text-white transition px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base"
              >
                Giriş Yap
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 sm:px-6 sm:py-2 rounded-lg font-medium transition text-sm sm:text-base"
              >
                Ücretsiz Başla
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-600/20 text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Star className="w-4 h-4" />
              Yapay Zeka Destekli Futbol İstatistik Analizi
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Futbol Maçlarını
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Yapay Zeka ile Değerlendirin
              </span>
            </h1>

            <p className="text-xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Günlük maç bülteninden maçları seçin, yapay zeka her maçı gerçek verilerle değerlendirsin.
              Profesyonel istatistiksel analiz ile detaylı inceleme yapın.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                to="/bulletin"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition flex items-center gap-2 shadow-xl shadow-blue-600/20 w-full sm:w-auto justify-center"
              >
                Günlük Bülteni Görüntüle
                <ChevronRight className="w-5 h-5" />
              </Link>
              <Link
                to="/how-to-use"
                className="bg-slate-700/50 hover:bg-slate-700 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition border border-slate-600 w-full sm:w-auto justify-center"
              >
                Nasıl Çalışır?
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-slate-400">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <span>Ücretsiz Deneme</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <span>Kredi Kartı Gerekmez</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-400" />
                <span>Anında Sonuç</span>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Neden Aikupon?</h2>
              <p className="text-xl text-slate-300">Yapay zeka ile profesyonel istatistiksel değerlendirmeye saniyeler içinde ulaşın</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6 hover:border-blue-500/50 transition">
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Gerçek Veri Analizi</h3>
                <p className="text-slate-300">
                  Günlük güncellenen maç verileri, takım formu, lig durumu ve profesyonel istatistiksel değerlendirme.
                </p>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6 hover:border-blue-500/50 transition">
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Güven Skorları</h3>
                <p className="text-slate-300">
                  Her maç değerlendirmesi için 0-100 arası güven skoru, yüzde olasılıkları ve profesyonel öneriler.
                </p>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6 hover:border-blue-500/50 transition">
                <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Anlık Değerlendirme</h3>
                <p className="text-slate-300">
                  Maçları seçin, yapay zeka 30 saniye içinde detaylı istatistiksel rapor oluşturur.
                </p>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6 hover:border-blue-500/50 transition">
                <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Güvenli Platform</h3>
                <p className="text-slate-300">
                  Verileriniz şifrelenir, gizliliğiniz tamamen korunur.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">Nasıl Çalışır?</h2>
              <p className="text-xl text-slate-300">3 basit adımda istatistiksel değerlendirme</p>
            </div>

            {/* Tanıtım Videosu */}
            <div className="mb-12">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-xl shadow-2xl border-2 border-slate-600"
                  src="https://www.youtube.com/embed/kCBz3-lPJVc"
                  title="Aikupon Nasıl Kullanılır?"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <p className="text-center text-slate-400 mt-4 text-sm">
                📹 Platform kullanımını anlatan detaylı video rehberimizi izleyin
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-6 bg-slate-700/50 border border-slate-600 rounded-xl p-8">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  1
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Bültenden Maç Seç</h3>
                  <p className="text-slate-300 text-lg">
                    Günlük güncellenen maç bülteninden istediğiniz maçları seçin.
                    3 maç için 1 kredi, 5 maç + ilk yarı incelemesi için 5 kredi.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6 bg-slate-700/50 border border-slate-600 rounded-xl p-8">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  2
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Yapay Zeka Değerlendirmesi</h3>
                  <p className="text-slate-300 text-lg">
                    Aikupon yapay zekası seçtiğiniz maçları gerçek verilerle değerlendirir.
                    İstatistiksel olasılıklar, form analizi ve detaylı inceleme.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6 bg-slate-700/50 border border-slate-600 rounded-xl p-8">
                <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  3
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Sonuçları Görüntüle</h3>
                  <p className="text-slate-300 text-lg">
                    Detaylı değerlendirme sonuçları "Analizlerim" sayfasında saklanır.
                    Yüzde olasılıkları, güven skorları ve öneriler ile bilinçli inceleme yapın.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center mt-12">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 sm:px-10 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition shadow-2xl shadow-blue-600/30"
              >
                Ücretsiz Dene
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-bold text-red-400 mb-3">⚠️ Önemli Yasal Uyarılar</h3>
              <div className="text-slate-300 text-sm leading-relaxed space-y-2">
                <p>• <strong>18 Yaş Sınırı:</strong> Bu platform 18 yaş altı kullanıcılar için uygun değildir. Platforma erişim ve kullanım için 18 yaşında veya daha büyük olmanız gerekmektedir.</p>
                <p>• <strong>Bilgilendirme Amaçlıdır:</strong> Sunulan tüm analizler, değerlendirmeler ve raporlar sadece bilgilendirme ve eğitim amaçlıdır. Hiçbir şekilde yatırım, finansal tavsiye veya kesin sonuç garantisi niteliği taşımaz.</p>
                <p>• <strong>Kişisel Sorumluluk:</strong> Kullanıcılar, platform üzerinden elde ettikleri bilgilere dayanarak aldıkları kararlardan tamamen kendileri sorumludur. Platform yöneticileri herhangi bir kayıptan sorumlu tutulamaz.</p>
                <p>• <strong>Yerel Yasalara Uyum:</strong> Bulunduğunuz ülke ve bölgenin yasalarına göre hareket etmek sizin sorumluluğunuzdadır. Platformu kullanmadan önce yerel düzenlemeleri kontrol ediniz.</p>
                <p>• <strong>Sonuç Garantisi Yoktur:</strong> İstatistiksel değerlendirmeler geçmiş verilere dayanır ve gelecek sonuçlarını garanti etmez.</p>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-6">Hemen Başlayın</h2>
              <p className="text-xl text-slate-300 mb-10">
                Ücretsiz hesap oluşturun, ilk değerlendirmenizi yapın. Kredi kartı bilgisi gerekmez.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 sm:px-10 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition w-full sm:w-auto text-center"
                >
                  Ücretsiz Kayıt Ol
                </Link>
                <Link
                  to="/contact"
                  className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 sm:px-10 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition border border-slate-600 w-full sm:w-auto text-center"
                >
                  İletişim
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};