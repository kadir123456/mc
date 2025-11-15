import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '../components/Footer';

export const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Ana Sayfaya Dön
          </Link>

          <h1 className="text-4xl font-bold text-white mb-6">Kullanım Şartları</h1>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">1. Genel Kurallar</h2>
              <p className="text-slate-300 leading-relaxed">
                Bu platformu kullanarak aşağıdaki şartları kabul etmiş sayılırsınız:
              </p>
              <ul className="list-disc list-inside text-slate-300 mt-2 space-y-1 ml-4">
                <li>18 yaşında veya daha büyük olmalısınız</li>
                <li>Doğru ve güncel bilgiler sağlamalısınız</li>
                <li>Hesap güvenliğinden siz sorumlusunuz</li>
                <li>Platformu yasalara uygun kullanmalısınız</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">2. Hizmet Kapsamı</h2>
              <p className="text-slate-300 leading-relaxed">
                Aikupon, futbol maçlarını analiz ederek bilgilendirme amaçlı istatistiksel raporlar sunar.
                Bu analizler kesinlikle yatırım veya finansal tavsiye niteliğinde değildir. 
                Platform sadece eğitim ve bilgilendirme amaçlıdır. Kullanıcılar kendi kararlarından
                kendileri sorumludur.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">3. Ödeme ve İade</h2>
              <ul className="list-disc list-inside text-slate-300 space-y-1 ml-4">
                <li>Tüm ödemeler güvenli ödeme altyapısı ile işlenir</li>
                <li>Krediler satın alma işleminin ardından hesabınıza yüklenir</li>
                <li>Kullanılmamış krediler 14 gün içinde iade edilebilir</li>
                <li>Kullanılmış krediler iade edilemez</li>
                <li>Kredilerin geçerlilik süresi 1 yıldır</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">4. Yasak Davranışlar</h2>
              <ul className="list-disc list-inside text-slate-300 space-y-1 ml-4">
                <li>Sahte hesap oluşturmak</li>
                <li>Platformu kötüye kullanmak</li>
                <li>Başkalarının hesaplarına erişmeye çalışmak</li>
                <li>Otomatik araçlarla sistemi zorlamak</li>
                <li>Yasadışı içerik paylaşmak</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">5. Sorumluluk Reddi</h2>
              <p className="text-slate-300 leading-relaxed">
                Platform, analiz sonuçlarının doğruluğunu garanti etmez. Kullanıcılar, analiz
                sonuçlarına dayalı aldıkları kararlardan tamamen kendileri sorumludur. Platform
                yöneticileri, kullanıcıların maruz kalabileceği herhangi bir kayıptan sorumlu tutulamaz.
                Sunulan analizler sadece eğitim ve bilgilendirme amaçlıdır.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">6. Değişiklikler</h2>
              <p className="text-slate-300 leading-relaxed">
                Platform, bu kullanım şartlarını önceden haber vermeksizin değiştirme hakkını saklı tutar.
                Değişiklikler yayınlandığı anda geçerli olur.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">7. İletişim</h2>
              <p className="text-slate-300 leading-relaxed">
                Sorularınız için: <a href="mailto:bilwininc@gmail.com" className="text-blue-400 hover:underline">bilwininc@gmail.com</a>
              </p>
            </section>

            <div className="border-t border-slate-600 pt-6 mt-8">
              <p className="text-slate-400 text-sm">
                Son Güncelleme: Ocak 2025
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};
