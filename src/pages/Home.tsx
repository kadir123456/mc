import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, TrendingUp, Shield, Clock, ChevronRight, Star, Check, BarChart3, Menu, X } from 'lucide-react';
import { Footer } from '../components/Footer';

export const Home: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 md:bg-gradient-to-br md:from-slate-900 md:via-slate-800 md:to-slate-900">
      {/* Header - Mobil App Tarzı */}
      <header className="bg-white md:bg-slate-800/50 md:backdrop-blur border-b border-slate-200 md:border-slate-700 sticky top-0 z-50 shadow-sm md:shadow-none">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-7 h-7 md:w-8 md:h-8 text-blue-600 md:text-yellow-400" />
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 md:text-white">Aikupon</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
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

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition active:scale-95"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 pb-2 border-t border-slate-200 pt-3">
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-700 hover:bg-slate-100 transition px-4 py-2.5 rounded-lg font-medium"
                >
                  Giriş Yap
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition text-center"
                >
                  Ücretsiz Başla
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      <main>
        {/* Hero Section - Mobil App Tarzı */}
        <section className="py-12 md:py-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-100 md:bg-blue-600/20 text-blue-600 md:text-blue-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium mb-4 md:mb-6">
              <Star className="w-3.5 h-3.5 md:w-4 md:h-4" />
              Yapay Zeka Destekli Analiz
            </div>

            <h1 className="text-3xl md:text-6xl font-bold text-slate-900 md:text-white mb-4 md:mb-6 leading-tight px-2">
              Futbol Maçlarını
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 md:from-blue-400 md:to-purple-400">
                AI ile Değerlendirin
              </span>
            </h1>

            <p className="text-base md:text-xl text-slate-700 md:text-slate-300 mb-6 md:mb-10 max-w-3xl mx-auto leading-relaxed px-4">
              Günlük maç bülteninden maçları seçin, yapay zeka gerçek verilerle değerlendirsin.
            </p>

            <div className="flex flex-col gap-3 mb-8 md:mb-12 px-4">
              <Link
                to="/bulletin"
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3.5 rounded-xl font-semibold text-base transition flex items-center justify-center gap-2 shadow-lg active:scale-95"
              >
                Günlük Bülteni Görüntüle
                <ChevronRight className="w-5 h-5" />
              </Link>
              <Link
                to="/how-to-use"
                className="bg-white md:bg-slate-700/50 hover:bg-slate-50 md:hover:bg-slate-700 text-slate-900 md:text-white px-6 py-3.5 rounded-xl font-semibold text-base transition border border-slate-300 md:border-slate-600 active:scale-95"
              >
                Nasıl Çalışır?
              </Link>
            </div>

            <div className="flex flex-col md:flex-row md:flex-wrap items-center justify-center gap-3 md:gap-8 text-slate-600 md:text-slate-400 text-sm px-4">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600 md:text-green-400" />
                <span>Ücretsiz Deneme</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600 md:text-green-400" />
                <span>Kredi Kartı Gerekmez</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600 md:text-green-400" />
                <span>Anında Sonuç</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Mobil Card Tarzı */}
        <section className="py-8 md:py-20 px-4 bg-white md:bg-slate-800/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 md:mb-16">
              <h2 className="text-2xl md:text-4xl font-bold text-slate-900 md:text-white mb-2 md:mb-4">Neden Aikupon?</h2>
              <p className="text-base md:text-xl text-slate-600 md:text-slate-300 px-4">Yapay zeka ile profesyonel analiz</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
              <div className="bg-white md:bg-slate-700/50 border border-slate-200 md:border-slate-600 rounded-xl p-5 md:p-6 hover:border-blue-400 md:hover:border-blue-500/50 transition shadow-sm md:shadow-none">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 md:bg-blue-600/20 rounded-lg flex items-center justify-center mb-3 md:mb-4">
                  <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-blue-600 md:text-blue-400" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900 md:text-white mb-2 md:mb-3">Gerçek Veri Analizi</h3>
                <p className="text-sm md:text-base text-slate-600 md:text-slate-300">
                  Günlük güncellenen maç verileri, takım formu ve profesyonel istatistiksel değerlendirme.
                </p>
              </div>

              <div className="bg-white md:bg-slate-700/50 border border-slate-200 md:border-slate-600 rounded-xl p-5 md:p-6 hover:border-purple-400 md:hover:border-blue-500/50 transition shadow-sm md:shadow-none">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 md:bg-purple-600/20 rounded-lg flex items-center justify-center mb-3 md:mb-4">
                  <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-purple-600 md:text-purple-400" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900 md:text-white mb-2 md:mb-3">Güven Skorları</h3>
                <p className="text-sm md:text-base text-slate-600 md:text-slate-300">
                  Her maç için güven skoru, yüzde olasılıkları ve profesyonel öneriler.
                </p>
              </div>

              <div className="bg-white md:bg-slate-700/50 border border-slate-200 md:border-slate-600 rounded-xl p-5 md:p-6 hover:border-green-400 md:hover:border-blue-500/50 transition shadow-sm md:shadow-none">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 md:bg-green-600/20 rounded-lg flex items-center justify-center mb-3 md:mb-4">
                  <Clock className="w-5 h-5 md:w-6 md:h-6 text-green-600 md:text-green-400" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900 md:text-white mb-2 md:mb-3">Anlık Değerlendirme</h3>
                <p className="text-sm md:text-base text-slate-600 md:text-slate-300">
                  Maçları seçin, AI 30 saniye içinde detaylı istatistiksel rapor oluşturur.
                </p>
              </div>

              <div className="bg-white md:bg-slate-700/50 border border-slate-200 md:border-slate-600 rounded-xl p-5 md:p-6 hover:border-yellow-400 md:hover:border-blue-500/50 transition shadow-sm md:shadow-none">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-100 md:bg-yellow-600/20 rounded-lg flex items-center justify-center mb-3 md:mb-4">
                  <Shield className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 md:text-yellow-400" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-slate-900 md:text-white mb-2 md:mb-3">Güvenli Platform</h3>
                <p className="text-sm md:text-base text-slate-600 md:text-slate-300">
                  Verileriniz şifrelenir, gizliliğiniz tamamen korunur.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works - Mobil Optimized */}
        <section className="py-8 md:py-20 px-4 bg-slate-50 md:bg-transparent">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 md:mb-16">
              <h2 className="text-2xl md:text-4xl font-bold text-slate-900 md:text-white mb-2 md:mb-4">Nasıl Çalışır?</h2>
              <p className="text-base md:text-xl text-slate-600 md:text-slate-300">3 basit adımda analiz</p>
            </div>

            <div className="space-y-4 md:space-y-8">
              <div className="flex items-start gap-4 md:gap-6 bg-white md:bg-slate-700/50 border border-slate-200 md:border-slate-600 rounded-xl p-5 md:p-8 shadow-sm md:shadow-none">
                <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl">
                  1
                </div>
                <div>
                  <h3 className="text-lg md:text-2xl font-bold text-slate-900 md:text-white mb-1 md:mb-2">Bültenden Maç Seç</h3>
                  <p className="text-sm md:text-lg text-slate-600 md:text-slate-300">
                    Günlük güncellenen maç bülteninden istediğiniz maçları seçin.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 md:gap-6 bg-white md:bg-slate-700/50 border border-slate-200 md:border-slate-600 rounded-xl p-5 md:p-8 shadow-sm md:shadow-none">
                <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl">
                  2
                </div>
                <div>
                  <h3 className="text-lg md:text-2xl font-bold text-slate-900 md:text-white mb-1 md:mb-2">AI Değerlendirmesi</h3>
                  <p className="text-sm md:text-lg text-slate-600 md:text-slate-300">
                    Aikupon yapay zekası maçları gerçek verilerle analiz eder.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 md:gap-6 bg-white md:bg-slate-700/50 border border-slate-200 md:border-slate-600 rounded-xl p-5 md:p-8 shadow-sm md:shadow-none">
                <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg md:text-xl">
                  3
                </div>
                <div>
                  <h3 className="text-lg md:text-2xl font-bold text-slate-900 md:text-white mb-1 md:mb-2">Sonuçları Görüntüle</h3>
                  <p className="text-sm md:text-lg text-slate-600 md:text-slate-300">
                    Detaylı sonuçlar "Analizlerim" sayfasında saklanır.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center mt-8 md:mt-12">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3.5 md:px-10 md:py-4 rounded-xl font-bold text-base md:text-lg transition shadow-lg active:scale-95 w-full md:w-auto"
              >
                Ücretsiz Dene
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section - Mobil Optimized */}
        <section className="py-8 md:py-20 px-4 bg-white md:bg-slate-800/30">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 md:bg-red-500/10 border border-red-200 md:border-red-500/30 rounded-xl p-4 md:p-6 mb-6 md:mb-8">
              <h3 className="text-base md:text-lg font-bold text-red-600 md:text-red-400 mb-2 md:mb-3">⚠️ Önemli Uyarılar</h3>
              <div className="text-slate-700 md:text-slate-300 text-xs md:text-sm leading-relaxed space-y-1.5 md:space-y-2">
                <p>• <strong>18 Yaş Sınırı:</strong> Bu platform 18 yaş üzeri kullanıcılar içindir.</p>
                <p>• <strong>Bilgilendirme Amaçlıdır:</strong> Sunulan analizler sadece bilgilendirme amaçlıdır.</p>
                <p>• <strong>Kişisel Sorumluluk:</strong> Kullanıcılar kararlarından sorumludur.</p>
                <p>• <strong>Sonuç Garantisi Yoktur:</strong> İstatistikler geçmiş verilere dayanır.</p>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl md:text-4xl font-bold text-slate-900 md:text-white mb-3 md:mb-6">Hemen Başlayın</h2>
              <p className="text-base md:text-xl text-slate-700 md:text-slate-300 mb-6 md:mb-10 px-4">
                Ücretsiz hesap oluşturun. Kredi kartı bilgisi gerekmez.
              </p>
              <div className="flex flex-col gap-3 md:flex-row md:justify-center md:gap-4">
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 md:px-10 md:py-4 rounded-xl font-bold text-base md:text-lg transition text-center active:scale-95"
                >
                  Ücretsiz Kayıt Ol
                </Link>
                <Link
                  to="/contact"
                  className="bg-white md:bg-slate-700 hover:bg-slate-50 md:hover:bg-slate-600 text-slate-900 md:text-white px-8 py-3.5 md:px-10 md:py-4 rounded-xl font-bold text-base md:text-lg transition border border-slate-300 md:border-slate-600 text-center active:scale-95"
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