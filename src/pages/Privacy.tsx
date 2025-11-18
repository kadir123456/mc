import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Footer } from '../components/Footer';

export const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Ana Sayfaya Dön
          </Link>

          <h1 className="text-4xl font-bold text-white mb-6">Gizlilik Politikası</h1>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-red-400 mb-2">⚠️ Önemli Bilgilendirme</h3>
                <div className="text-slate-300 text-sm leading-relaxed space-y-1">
                  <p>• Platform sadece eğitim ve bilgilendirme amaçlıdır.</p>
                  <p>• 18 yaş altı kullanıcılar için uygun değildir.</p>
                  <p>• Yatırım tavsiyesi niteliği taşımaz.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">1. Toplanan Bilgiler</h2>
              <p className="text-slate-300 leading-relaxed mb-3">
                Platformumuzu kullanırken aşağıdaki bilgiler toplanabilir:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-1 ml-4">
                <li>E-posta adresi ve ad soyad</li>
                <li>Profil fotoğrafı (Google ile girişte)</li>
                <li>Değerlendirme sonuçları ve geçmişi</li>
                <li>Ödeme ve işlem bilgileri</li>
                <li>Cihaz ve tarayıcı bilgileri</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">2. Bilgilerin Kullanımı</h2>
              <p className="text-slate-300 leading-relaxed mb-3">
                Toplanan bilgiler aşağıdaki amaçlarla kullanılır:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-1 ml-4">
                <li>Hizmet sunumu ve değerlendirme işlemleri</li>
                <li>Kullanıcı hesabı yönetimi</li>
                <li>Ödeme işlemlerinin gerçekleştirilmesi</li>
                <li>Platform güvenliğinin sağlanması</li>
                <li>Hizmet kalitesinin iyileştirilmesi</li>
                <li>İstatistiksel analizler</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">3. Veri Paylaşımı</h2>
              <p className="text-slate-300 leading-relaxed">
                Kişisel bilgileriniz üçüncü taraflarla paylaşılmaz. Ancak aşağıdaki durumlarda
                sınırlı veri aktarımı gerçekleşebilir:
              </p>
              <ul className="list-disc list-inside text-slate-300 mt-2 space-y-1 ml-4">
                <li><strong>Analiz Servisi:</strong> Sadece istatistiksel değerlendirme için kullanılır</li>
                <li><strong>Ödeme Altyapısı:</strong> Sadece ödeme işlemleri için kullanılır</li>
                <li><strong>Yasal Zorunluluk:</strong> Yasal talep durumunda</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">4. Veri Güvenliği</h2>
              <p className="text-slate-300 leading-relaxed">
                Verilerinizin güvenliği öncelikimizdir. Şu önlemler alınmıştır:
              </p>
              <ul className="list-disc list-inside text-slate-300 mt-2 space-y-1 ml-4">
                <li>SSL/TLS şifreleme ile güvenli iletişim</li>
                <li>Şifreler hashlenmiş olarak saklanır</li>
                <li>Düzenli güvenlik güncellemeleri</li>
                <li>Yetkisiz erişime karşı koruma</li>
                <li>Düzenli yedekleme</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">5. Çerezler (Cookies)</h2>
              <p className="text-slate-300 leading-relaxed">
                Platform, kullanıcı deneyimini iyileştirmek için çerezler kullanır. Bu çerezler
                oturum yönetimi, tercih saklama ve analitik amaçlı kullanılır. Tarayıcı ayarlarınızdan
                çerezleri yönetebilirsiniz.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">6. Kullanıcı Hakları</h2>
              <p className="text-slate-300 leading-relaxed mb-3">
                KVKK kapsamında aşağıdaki haklara sahipsiniz:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-1 ml-4">
                <li>Verilerinizi görüntüleme</li>
                <li>Yanlış verileri düzeltme</li>
                <li>Verilerin silinmesini talep etme</li>
                <li>Veri işleme faaliyetlerine itiraz etme</li>
                <li>Hesabınızı silme</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">7. Yaş Sınırı ve Gizlilik</h2>
              <p className="text-slate-300 leading-relaxed">
                <strong>Platformumuz 18 yaş altı kullanıcılara yönelik değildir.</strong> 18 yaş altı bireylerin
                kişisel bilgilerini bilerek toplamayız. Eğer 18 yaş altındaysınız, lütfen platforma erişmeyiniz.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">8. Değişiklikler</h2>
              <p className="text-slate-300 leading-relaxed">
                Bu gizlilik politikası zaman zaman güncellenebilir. Değişiklikler bu sayfada
                yayınlanacaktır.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">9. İletişim</h2>
              <p className="text-slate-300 leading-relaxed">
                Gizlilik ile ilgili sorularınız için:{' '}
                <a href="mailto:bilwininc@gmail.com" className="text-blue-400 hover:underline">
                  bilwininc@gmail.com
                </a>
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