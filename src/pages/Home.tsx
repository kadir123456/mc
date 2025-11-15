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
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-slate-300 hover:text-white transition px-4 py-2"
              >
                Giriş Yap
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
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
              Yapay Zeka Destekli Spor Analizi
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Futbol Maçlarını
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                AI ile Analiz Edin
              </span>
            </h1>

            <p className="text-xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Günlük maç bülteninden maç seçin, yapay zeka her maçı gerçek verilerle analiz etsin.
              Profesyonel istatistiksel değerlendirme ile bilinçli kararlar alın.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                to="/bulletin"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition flex items-center gap-2 shadow-xl shadow-blue-600/20"
              >
                Günlük Bülteni Görüntüle
                <ChevronRight className="w-5 h-5" />
              </Link>
              <Link
                to="/how-to-use"
                className="bg-slate-700/50 hover:bg-slate-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition border border-slate-600"
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
              <p className="text-xl text-slate-300">Yapay zeka ile profesyonel istatistiksel analize saniyeler içinde ulaşın</p>
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
                  Her maç analizi için 0-100 arası güven skoru, yüzde tahminleri ve profesyonel öneriler.
                </p>
              </div>

              <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6 hover:border-blue-500/50 transition">
                <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Anlık Analiz</h3>
                <p className="text-slate-300">
                  Maçları seçin, yapay zeka 30 saniye içinde detaylı istatistiksel tahmin oluşturur.
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
              <p className="text-xl text-slate-300">3 basit adımda istatistiksel analiz</p>
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
                    3 maç için 1 kredi, 5 maç + ilk yarı analizi için 5 kredi.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6 bg-slate-700/50 border border-slate-600 rounded-xl p-8">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  2
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Yapay Zeka Analizi</h3>
                  <p className="text-slate-300 text-lg">
                    Aikupon yapay zekası seçtiğiniz maçları gerçek verilerle analiz eder.
                    İstatistiksel tahminler, form analizi ve detaylı değerlendirmeler.
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
                    Detaylı analiz sonuçları "Analizlerim" sayfasında saklanır.
                    Yüzde tahminleri, güven skorları ve öneriler ile bilinçli değerlendirme yapın.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center mt-12">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 rounded-lg font-bold text-lg transition shadow-2xl shadow-blue-600/30"
              >
                Ücretsiz Dene
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
          <div className="max-w-4xl mx-auto">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-12">
              <h3 className="text-lg font-bold text-yellow-400 mb-2">Önemli Uyarı</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Bu platform sadece eğitim ve bilgilendirme amaçlıdır. Sunulan analizler yatırım veya finansal tavsiye niteliğinde değildir.
                Kullanıcılar kendi kararlarından tamamen sorumludur. Sonuçlar garanti edilmez ve platform yöneticileri
                herhangi bir kayıptan sorumlu tutulamaz. Platform, spor maçlarının istatistiksel değerlendirmesini sağlar.
              </p>
            </div>

            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-6">Hemen Başlayın</h2>
              <p className="text-xl text-slate-300 mb-10">
                Ücretsiz hesap oluşturun, ilk analizinizi yapın. Kredi kartı bilgisi gerekmez.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-lg font-bold text-lg transition w-full sm:w-auto"
                >
                  Ücretsiz Kayıt Ol
                </Link>
                <Link
                  to="/contact"
                  className="bg-slate-700 hover:bg-slate-600 text-white px-10 py-4 rounded-lg font-bold text-lg transition border border-slate-600 w-full sm:w-auto"
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
