import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Zap, Users, AlertTriangle } from 'lucide-react';
import { Footer } from '../components/Footer';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Ana Sayfaya Dön
          </Link>

          <h1 className="text-4xl font-bold text-white mb-6">Hakkımızda</h1>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-red-400 mb-2">⚠️ Önemli Yasal Uyarı</h3>
                <div className="text-slate-300 text-sm leading-relaxed space-y-1">
                  <p>• Bu platform sadece eğitim ve bilgilendirme amaçlıdır.</p>
                  <p>• 18 yaş altı kullanıcılar için uygun değildir.</p>
                  <p>• Yatırım tavsiyesi değildir, bulunduğunuz ülkenin yasalarına göre hareket ediniz.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 mb-8">
            <p className="text-slate-300 text-lg leading-relaxed mb-6">
              Aikupon, futbol maçlarını detaylı şekilde istatistiksel olarak değerlendirmenize yardımcı olan 
              modern bir eğitim platformudur. Yapay zeka teknolojisi ile maç verilerini analiz edip, 
              size istatistiksel raporlar sunuyoruz.
            </p>

            <p className="text-slate-300 leading-relaxed mb-6">
              Misyonumuz, kullanıcılarımıza güvenilir, hızlı ve kullanıcı dostu bir veri değerlendirme 
              deneyimi sunmaktır. Platform, yapay zeka destekli teknolojiler kullanarak futbol maçlarını 
              inceler ve kapsamlı istatistiksel raporlar sunar.
            </p>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-6">
              <p className="text-yellow-400 text-sm font-semibold mb-2">Bilgilendirme Noktası:</p>
              <p className="text-slate-300 text-sm leading-relaxed">
                Platform üzerinden sunulan tüm değerlendirmeler, analizler ve raporlar sadece 
                bilgilendirme ve eğitim amaçlıdır. Hiçbir şekilde yatırım, finansal tavsiye veya 
                garantili sonuç niteliği taşımaz. Kullanıcılar kendi kararlarından tamamen sorumludur.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition">
              <Shield className="w-10 h-10 text-blue-400 mb-4" />
              <h3 className="text-white font-bold mb-2">Güvenli</h3>
              <p className="text-slate-400 text-sm">
                Verileriniz şifreli olarak saklanır ve üçüncü taraflarla paylaşılmaz.
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition">
              <Zap className="w-10 h-10 text-blue-400 mb-4" />
              <h3 className="text-white font-bold mb-2">Hızlı</h3>
              <p className="text-slate-400 text-sm">
                Maç değerlendirmeleriniz saniyeler içinde tamamlanır ve sonuçlar anında görüntülenir.
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition">
              <Users className="w-10 h-10 text-blue-400 mb-4" />
              <h3 className="text-white font-bold mb-2">Kullanıcı Dostu</h3>
              <p className="text-slate-400 text-sm">
                Sade ve anlaşılır arayüz ile herkes kolayca kullanabilir.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Teknoloji</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Platform, modern web teknolojileri ve yapay zeka altyapısı kullanılarak geliştirilmiştir.
              Güvenli ödeme sistemi, hızlı değerlendirme motoru ve kullanıcı dostu tasarımı ile
              en iyi deneyimi sunmayı hedefliyoruz.
            </p>
            <p className="text-slate-400 text-sm">
              Geliştirici: <span className="font-semibold">bilwin.inc</span> © 2025
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};