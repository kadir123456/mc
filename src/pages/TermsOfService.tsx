import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
            Ana Sayfaya Dön
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-8 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-yellow-400 font-bold mb-2">⚖️ Yasal Uyarı</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Bu Kullanım Şartları taslak bir belgedir ve <strong>hukuki geçerliliği yoktur</strong>.
              Bu metin bir avukat tarafından incelenmeden kullanılmamalıdır. Platform sahibi,
              bu metnin yasal geçerliliği hakkında hiçbir garanti vermemektedir. Resmi kullanım için
              mutlaka yetkili bir hukuk danışmanından destek alınmalıdır.
            </p>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-8 sm:p-12">
          <h1 className="text-4xl font-bold text-white mb-4">Kullanım Şartları</h1>
          <p className="text-slate-400 mb-8">Son güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>

          <div className="space-y-8 text-slate-300">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Kabulüm ve Sözleşme</h2>
              <p className="leading-relaxed">
                Aikupon platformunu ("Site", "Hizmet", "Platform") kullanarak, işbu Kullanım Şartlarını
                ("Şartlar") kabul etmiş sayılırsınız. Bu Şartları kabul etmiyorsanız, lütfen Siteyi
                kullanmayınız.
              </p>
              <p className="leading-relaxed mt-4">
                Platform yönetimi, bu Şartları herhangi bir zamanda değiştirme hakkını saklı tutar.
                Değişiklikler yayınlandığı anda yürürlüğe girer.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Hizmet Tanımı</h2>
              <p className="leading-relaxed">
                Aikupon, spor müsabakalarının istatistiksel analizini yapay zeka ile gerçekleştiren
                bir eğitim ve bilgilendirme platformudur. Platform:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li>Sadece bilgilendirme amaçlıdır</li>
                <li>Yatırım veya finansal tavsiye vermez</li>
                <li>Hiçbir sonuç garanti etmez</li>
                <li>Eğitim amaçlı istatistiksel değerlendirmeler sunar</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. Kullanıcı Sorumlulukları</h2>
              <p className="leading-relaxed mb-4">
                Platform kullanıcısı olarak:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>18 yaşında veya daha büyük olduğunuzu beyan edersiniz</li>
                <li>Sağladığınız bilgilerin doğru ve güncel olduğunu taahhüt edersiniz</li>
                <li>Hesap güvenliğinizden tamamen sorumlu olduğunuzu kabul edersiniz</li>
                <li>Platformu yasa dışı amaçlarla kullanmayacağınızı kabul edersiniz</li>
                <li>Tek kişi olarak bir hesaba sahip olacağınızı kabul edersiniz</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Sorumluluğun Sınırlandırılması</h2>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mb-4">
                <p className="font-semibold text-red-400 mb-3">ÖNEMLİ SINIRLANDIRMA</p>
                <p className="leading-relaxed">
                  Platform, sağlanan içerik ve hizmetlerin doğruluğu, eksiksizliği, güncelliği veya
                  uygunluğu konusunda <strong>hiçbir garanti vermemektedir</strong>.
                </p>
              </div>
              <p className="leading-relaxed">
                Platform yönetimi, kullanıcıların Platform üzerinden aldıkları kararlar sonucunda
                oluşabilecek doğrudan veya dolaylı zararlardan, kayıplardan veya masraflardan
                sorumlu değildir.
              </p>
              <p className="leading-relaxed mt-4">
                Maksimum sorumluluk, kullanıcının Platform için ödediği ücretin iadesiyle sınırlıdır.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Tazminat (Indemnification)</h2>
              <p className="leading-relaxed">
                Kullanıcı, üçüncü şahısların talepleri, davaları, zararları, kayıpları veya masrafları
                (avukatlık ücretleri dahil) ile ilgili olarak Platform sahibini, yöneticilerini,
                çalışanlarını ve ortaklarını tazmin etmeyi ve savunmayı kabul eder.
              </p>
              <p className="leading-relaxed mt-4">
                Bu tazminat yükümlülüğü şunları içerir ancak bunlarla sınırlı değildir:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li>Kullanıcının Platformu kötüye kullanmasından kaynaklanan talepler</li>
                <li>İşbu Şartların ihlali</li>
                <li>Başkalarının haklarının ihlali</li>
                <li>Yasa dışı faaliyetler</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Yasaya Uygunluk ve Yasaklar</h2>
              <p className="leading-relaxed mb-4">
                Kullanıcı, Platformu aşağıdaki amaçlarla kullanmayacağını kabul eder:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Herhangi bir yasayı veya düzenlemeyi ihlal etmek</li>
                <li>Üçüncü şahısların haklarını ihlal etmek</li>
                <li>Platform altyapısına zarar vermek veya engel olmak</li>
                <li>Otomatik sistemler (botlar) kullanarak içerik toplamak</li>
                <li>Sahte hesap oluşturmak veya kimlik sahteciliği yapmak</li>
                <li>Zararlı yazılım, virüs veya benzeri kodlar yüklemek</li>
              </ul>
              <p className="leading-relaxed mt-4">
                İhlal durumunda Platform, kullanıcı hesabını <strong>bildirimde bulunmaksızın</strong> askıya alabilir
                veya tamamen sonlandırabilir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. İçeriğin Denetlenmesi ve Şikayet Prosedürü</h2>
              <p className="leading-relaxed">
                Platform, kullanıcı tarafından yüklenen içerikleri önceden denetleme zorunluluğu olmaksızın,
                uygunsuz veya yasaya aykırı içerikleri kaldırma ve erişimi engelleme hakkına sahiptir.
              </p>
              <p className="leading-relaxed mt-4">
                Şikayet ve bildirimler için:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li>E-posta: bilwininc@gmail.com</li>
                <li>Şikayetler 48 saat içinde değerlendirilir</li>
                <li>Geçerli şikayetler için gerekli aksiyonlar alınır</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Fikri Mülkiyet Hakları</h2>
              <p className="leading-relaxed">
                Platform üzerindeki tüm içerik, tasarım, logo, yazılım ve diğer materyaller
                Platform sahibinin veya lisans verenlerin mülkiyetindedir ve telif hakkı
                yasaları ile korunmaktadır.
              </p>
              <p className="leading-relaxed mt-4">
                Kullanıcılar, Platform içeriğini kişisel kullanım dışında çoğaltamaz, dağıtamaz,
                değiştiremez veya ticari amaçlarla kullanamazlar.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Mücbir Sebep ve Hizmet Kesintileri</h2>
              <p className="leading-relaxed">
                Platform, aşağıdaki durumlardan kaynaklanan hizmet kesintileri veya gecikmelerden
                sorumlu tutulamaz:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li>Doğal afetler, savaş, terör saldırıları</li>
                <li>İnternet veya elektrik kesintileri</li>
                <li>Üçüncü taraf servis sağlayıcıların arızaları</li>
                <li>Hükümet müdahaleleri veya yasal kısıtlamalar</li>
                <li>Siber saldırılar</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Planlı bakım çalışmaları mümkün olduğunca önceden duyurulur.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Ödeme ve İade Politikası</h2>
              <p className="leading-relaxed">
                Platform üzerinden satın alınan hizmetler için:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4 ml-4">
                <li>Kullanılmamış krediler 14 gün içinde iade edilebilir</li>
                <li>Kullanılmış krediler iade edilemez</li>
                <li>İade talepleri bilwininc@gmail.com adresine yapılmalıdır</li>
                <li>İadeler 7-14 iş günü içinde işleme alınır</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Uyuşmazlıkların Çözümü ve Yetkili Mahkeme</h2>
              <p className="leading-relaxed">
                İşbu Şartlardan doğan veya bu Şartlarla ilgili tüm uyuşmazlıklar Türkiye Cumhuriyeti
                yasalarına göre çözümlenecektir.
              </p>
              <p className="leading-relaxed mt-4">
                Taraflar arasındaki uyuşmazlıklarda <strong>[İstanbul] Mahkemeleri ve İcra Daireleri</strong> yetkili olacaktır.
              </p>
              <p className="text-sm text-yellow-400 mt-4 italic">
                Not: Yetkili mahkeme bilgisi şirket merkezine göre güncellenmelidir.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Veri Koruma ve Gizlilik</h2>
              <p className="leading-relaxed">
                Kullanıcı verilerinin işlenmesi ve korunması{' '}
                <Link to="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                  Gizlilik Politikası
                </Link>{' '}
                kapsamındadır. Kullanıcılar, kayıt olarak Gizlilik Politikasını da kabul etmiş sayılırlar.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">13. İletişim ve Bildirimler</h2>
              <p className="leading-relaxed">
                Platform ile iletişim için:
              </p>
              <div className="bg-slate-700/50 rounded-lg p-6 mt-4">
                <p className="font-semibold mb-2">Bilwin Inc.</p>
                <p>E-posta: bilwininc@gmail.com</p>
                <p>Web: aikupon.com</p>
              </div>
              <p className="leading-relaxed mt-4">
                Platform, kullanıcılara e-posta yoluyla bildirim gönderme hakkını saklı tutar.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">14. Bütünlük ve Erişim</h2>
              <p className="leading-relaxed">
                Bu Kullanım Şartları, Gizlilik Politikası ve diğer platform politikaları ile birlikte
                taraflar arasındaki tam sözleşmeyi oluşturur.
              </p>
              <p className="leading-relaxed mt-4">
                Herhangi bir maddenin geçersiz sayılması, diğer maddelerin geçerliliğini etkilemez.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">15. Feragat ve Vazgeçme</h2>
              <p className="leading-relaxed">
                Platform yönetiminin işbu Şartların herhangi bir hükmünü uygulamaması, o hükümden
                vazgeçtiği anlamına gelmez. Platform, haklarını herhangi bir zamanda kullanabilir.
              </p>
            </section>
          </div>

          <div className="mt-12 p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-400 font-semibold mb-2">📋 Onay Beyanı</p>
            <p className="text-slate-300 text-sm leading-relaxed">
              Bu Kullanım Şartlarını okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan edersiniz.
              Kayıt olarak bu Şartları kabul etmiş sayılırsınız.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
