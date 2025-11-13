import React, { useState } from 'react';
import { Copy, Check, AlertCircle, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

const BANK_IBAN = import.meta.env.VITE_BANK_IBAN || 'TR72 0006 2000 4210 0006 8187 48';
const BANK_NAME = import.meta.env.VITE_BANK_NAME || 'Garanti Bankası';
const BANK_ACCOUNT_HOLDER = import.meta.env.VITE_BANK_ACCOUNT_HOLDER || 'Kadir Aci';

const CREDIT_PRICES = {
  5: import.meta.env.VITE_PRICE_5_CREDITS || '50',
  10: import.meta.env.VITE_PRICE_10_CREDITS || '90',
  25: import.meta.env.VITE_PRICE_25_CREDITS || '200',
  50: import.meta.env.VITE_PRICE_50_CREDITS || '350'
};

export const BankTransferPayment: React.FC = () => {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const userId = user?.uid?.slice(0, 5).toUpperCase() || '00000';
  const paymentDescription = `AI hizmet bedeli ID ${userId}`;

  const packages = [
    { credits: 5, price: CREDIT_PRICES[5], popular: false },
    { credits: 10, price: CREDIT_PRICES[10], popular: true },
    { credits: 25, price: CREDIT_PRICES[25], popular: false },
    { credits: 50, price: CREDIT_PRICES[50], popular: false }
  ];

  const handleCopyIBAN = () => {
    navigator.clipboard.writeText(BANK_IBAN.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyDescription = () => {
    navigator.clipboard.writeText(paymentDescription);
  };

  const handleSubmitPayment = async () => {
    if (!selectedPackage || !user) return;

    setSubmitting(true);
    try {
      const paymentRequest = {
        userId: user.uid,
        userEmail: user.email,
        credits: selectedPackage,
        amount: CREDIT_PRICES[selectedPackage as keyof typeof CREDIT_PRICES],
        paymentDescription,
        status: 'pending',
        createdAt: Date.now()
      };

      await authService.createPaymentRequest(paymentRequest);

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedPackage(null);
      }, 3000);
    } catch (error) {
      console.error('Payment request error:', error);
      alert('Ödeme talebi oluşturulamadı. Lütfen tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 md:p-4">
        <div className="flex items-start gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-blue-300 mb-1">Ödeme Bilgileri</h3>
            <p className="text-xs text-slate-300">
              Aşağıdaki hesaba havale/EFT yaparak kredi satın alabilirsiniz.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {packages.map((pkg) => (
          <button
            key={pkg.credits}
            onClick={() => setSelectedPackage(pkg.credits)}
            className={`relative p-3 rounded-lg border-2 transition ${
              selectedPackage === pkg.credits
                ? 'bg-blue-600/20 border-blue-500'
                : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Popüler
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{pkg.credits}</div>
              <div className="text-[10px] text-slate-400 mb-1">kredi</div>
              <div className="text-sm font-bold text-blue-400">{pkg.price}₺</div>
            </div>
          </button>
        ))}
      </div>

      {selectedPackage && (
        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-700">
                <span className="text-slate-400">Banka</span>
                <span className="text-white font-medium">{BANK_NAME}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-700">
                <span className="text-slate-400">Hesap Sahibi</span>
                <span className="text-white font-medium">{BANK_ACCOUNT_HOLDER}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-700">
                <span className="text-slate-400">Tutar</span>
                <span className="text-lg font-bold text-green-400">
                  {CREDIT_PRICES[selectedPackage as keyof typeof CREDIT_PRICES]}₺
                </span>
              </div>
              <div className="flex justify-between items-start gap-2 py-1.5 border-b border-slate-700">
                <span className="text-slate-400">IBAN</span>
                <div className="text-right flex-1">
                  <p className="text-white font-mono text-xs break-all">{BANK_IBAN}</p>
                  <button
                    onClick={handleCopyIBAN}
                    className="mt-1 text-blue-400 hover:text-blue-300 text-[10px] flex items-center gap-1 ml-auto"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Kopyalandı' : 'Kopyala'}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-start gap-2 py-1.5">
                <span className="text-slate-400">Açıklama</span>
                <div className="text-right flex-1">
                  <p className="text-white font-medium text-xs">{paymentDescription}</p>
                  <button
                    onClick={handleCopyDescription}
                    className="mt-1 text-blue-400 hover:text-blue-300 text-[10px] flex items-center gap-1 ml-auto"
                  >
                    <Copy className="w-3 h-3" />
                    Kopyala
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300">
                <p className="font-bold text-yellow-400 mb-1">Önemli!</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Açıklama kısmına mutlaka ID numaranızı yazın</li>
                  <li>Ödeme yapıldıktan sonra onay için bekleyin</li>
                  <li>Krediler hesabınıza 24 saat içinde yüklenecektir</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmitPayment}
            disabled={submitting || success}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-bold text-sm transition flex items-center justify-center gap-2"
          >
            {success ? (
              <>
                <Check className="w-5 h-5" />
                Ödeme Talebiniz Alındı!
              </>
            ) : submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Gönderiliyor...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Ödeme Yaptım, Onayla
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
