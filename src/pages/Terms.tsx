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

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-bold text-red-400 mb-3">⚠️ Önemli Yasal Uyarılar</h3>
            <div className="text-slate-300 text-sm leading-relaxed space-y-2">
              <p>• <strong>18 Yaş ve Üzeri:</strong> Bu platform yalnızca 18 yaşında veya daha büyük kullanıcılar içindir.</p>
              <p>• <strong>Bilgilendirme Amaçlıdır:</strong> Platform sadece eğitim ve bilgilendirme amaçlıdır. Yatırım tavsiyesi değildir.</p>
              <p>• <strong>Yerel Yasalara Uyun:</strong> Bulunduğunuz ülke ve bölgenin yasalarına göre hareket etmek zorundasınız.</p>
            </div>
          </div>

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
                <li>Bulunduğunuz ülkenin yasalarına göre hareket etmelisiniz</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">2. Hizmet Kapsamı</h2>
              <p className="text-slate-300 leading-relaxed">
                Aikupon, futbol maçlarını istatistiksel olarak değerlendirerek bilgilendirme amaçlı raporlar sunar.
                Bu değerlendirmeler <strong>kesinlikle yatırım, finansal tavsiye veya garantili sonuç niteliğinde değildir</strong>. 
                Platform <strong>sadece eğitim ve bilgilendirme amaçlıdır</strong>. Kullanıcılar kendi kararlarından
                tamamen kendileri sorumludur. Hiçbir sonuç garanti edilmez.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">3. Yaş Sınırı</h2>
              <p className="text-slate-300 leading-relaxed">
                Bu platform <strong>18 yaş altı kullanıcılar için uygun değildir</strong>. Platforma erişim ve kullanım
                için 18 yaşında veya daha büyük olmanız gerekmektedir. 18 yaş altı bireylerin platformu kullanması
                kesinlikle yasaktır.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">4. Ödeme ve İade</h2>
              <ul className="list-disc list-inside text-slate-300 space-y-1 ml-4">
                <li>Tüm ödemeler güvenli ödeme altyapısı ile işlenir</li>
                <li>Krediler satın alma işleminin ardından hesabınıza yüklenir</li>
                <li>Kullanılmamış krediler 14 gün içinde iade edilebilir</li>
                <li>Kullanılmış krediler iade edilemez</li>
                <li>Kredilerin geçerlilik süresi 1 yıldır</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">5. Yasak Davranışlar</h2>
              <ul className="list-disc list-inside text-slate-300 space-y-1 ml-4">
                <li>Sahte hesap oluşturmak</li>
                <li>Platformu kötüye kullanmak</li>
                <li>Başkalarının hesaplarına erişmeye çalışmak</li>
                <li>Otomatik araçlarla sistemi zorlamak</li>
                <li>Yasadışı içerik paylaşmak</li>
                <li>18 yaş altı kullanıcıların platforma erişimi</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">6. Sorumluluk Reddi</h2>
              <p className="text-slate-300 leading-relaxed mb-3">
                <strong>Platform, değerlendirme sonuçlarının doğruluğunu veya kesinliğini garanti etmez.</strong> Kullanıcılar, 
                değerlendirme sonuçlarına dayalı aldıkları kararlardan tamamen kendileri sorumludur. Platform
                yöneticileri, kullanıcıların maruz kalabileceği herhangi bir kayıptan sorumlu tutulamaz.
              </p>
              <p className="text-slate-300 leading-relaxed">
                Sunulan tüm değerlendirmeler, analizler ve raporlar <strong>sadece eğitim ve bilgilendirme amaçlıdır</strong>.
                Hiçbir şekilde yatırım tavsiyesi, finansal öneri veya garantili sonuç niteliği taşımaz.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">7. Yerel Yasalara Uyum</h2>
              <p className="text-slate-300 leading-relaxed">
                Kullanıcılar, <strong>bulundukları ülke ve bölgenin yasalarına göre hareket etmekten sorumludur</strong>.
                Platformu kullanmadan önce yerel düzenlemeleri kontrol etmek kullanıcının sorumluluğundadır.
                Yerel yasalara aykırı kullanımdan platform yönetimi sorumlu tutulamaz.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">8. Değişiklikler</h2>
              <p className="text-slate-300 leading-relaxed">
                Platform, bu kullanım şartlarını önceden haber vermeksizin değiştirme hakkını saklı tutar.
                Değişiklikler yayınlandığı anda geçerli olur.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">9. İletişim</h2>
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