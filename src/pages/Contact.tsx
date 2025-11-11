import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import { Footer } from '../components/Footer';

export const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoLink = `mailto:bilwininc@gmail.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(`İsim: ${formData.name}\nE-posta: ${formData.email}\n\nMesaj:\n${formData.message}`)}`;
    window.location.href = mailtoLink;
    setSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Ana Sayfaya Dön
          </Link>

          <h1 className="text-4xl font-bold text-white mb-6">İletişim</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Bize Ulaşın</h2>

              {submitted && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
                  Mesajınız hazırlandı! E-posta istemciniz açılacak.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Ad Soyad</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Adınız ve soyadınız"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">E-posta</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="ornek@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Konu</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Mesajınızın konusu"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Mesaj</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Mesajınız..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Gönder
                </button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="w-6 h-6 text-blue-400" />
                  <h3 className="text-xl font-bold text-white">E-posta</h3>
                </div>
                <a
                  href="mailto:bilwininc@gmail.com"
                  className="text-blue-400 hover:underline"
                >
                  bilwininc@gmail.com
                </a>
                <p className="text-slate-400 text-sm mt-2">
                  Genellikle 24-48 saat içinde yanıt veriyoruz
                </p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
                <h3 className="text-xl font-bold text-white mb-4">Sık Sorulan Sorular</h3>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li>• Teknik sorunlar ve hata bildirimleri</li>
                  <li>• Ödeme ve fatura ile ilgili sorular</li>
                  <li>• Hesap yönetimi ve güvenlik</li>
                  <li>• Genel öneriler ve geri bildirimler</li>
                </ul>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
                <h3 className="text-xl font-bold text-white mb-4">Geliştirici</h3>
                <p className="text-slate-300 text-sm mb-2">
                  <strong className="text-white">bilwin.inc</strong>
                </p>
                <p className="text-slate-400 text-xs">
                  © 2025 Tüm hakları saklıdır
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};
