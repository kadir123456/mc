import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Zap, Users } from 'lucide-react';
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

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 mb-8">
            <p className="text-slate-300 text-lg leading-relaxed mb-6">
              Coupon Analyzer, spor kuponlarınızı detaylı şekilde analiz etmenize yardımcı olan modern bir platformdur.
              Akıllı analiz teknolojisi ile kuponlarınızı değerlendirip, size en iyi önerileri sunuyoruz.
            </p>

            <p className="text-slate-300 leading-relaxed mb-6">
              Misyonumuz, kullanıcılarımıza güvenilir, hızlı ve kullanıcı dostu bir analiz deneyimi sunmaktır.
              Platform, yapay zeka destekli teknolojiler kullanarak kuponlarınızdaki maçları inceler ve
              kapsamlı değerlendirmeler sunar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <Shield className="w-10 h-10 text-blue-400 mb-4" />
              <h3 className="text-white font-bold mb-2">Güvenli</h3>
              <p className="text-slate-400 text-sm">
                Verileriniz şifreli olarak saklanır ve üçüncü taraflarla paylaşılmaz.
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <Zap className="w-10 h-10 text-blue-400 mb-4" />
              <h3 className="text-white font-bold mb-2">Hızlı</h3>
              <p className="text-slate-400 text-sm">
                Kuponlarınız saniyeler içinde analiz edilir ve sonuçlar anında görüntülenir.
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
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
              Güvenli ödeme sistemi, hızlı analiz motoru ve kullanıcı dostu tasarımı ile
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
