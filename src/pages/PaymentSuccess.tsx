import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader, XCircle } from 'lucide-react';
import { shopierService } from '../services/shopierService';
import { useAuth } from '../context/AuthContext';

export const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    const handlePaymentReturn = async () => {
      // Shopier'dan dönen parametreleri kontrol et
      const status = searchParams.get('status');
      const platformOrderId = searchParams.get('platform_order_id');
      
      // Bekleyen ödeme bilgisini al
      const pendingPayment = shopierService.getPendingPayment();
      
      if (!user) {
        setMessage('Kullanıcı girişi bulunamadı');
        setLoading(false);
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      try {
        // Shopier ödeme başarılı mı kontrol et
        if (status === '1' || status === 'success') {
          setSuccess(true);
          
          if (pendingPayment) {
            setCredits(pendingPayment.credits);
            setMessage(`${pendingPayment.credits} kredi hesabınıza eklenecek`);
            
            // Bekleyen ödemeyi temizle
            shopierService.clearPendingPayment();
            
            // Kullanıcı bilgilerini yenile (krediler backend'den güncellenecek)
            setTimeout(() => {
              refreshUser?.();
            }, 2000);
          } else {
            setMessage('Ödeme başarılı! Kredileriniz hesabınıza eklenecek.');
          }
          
          // 5 saniye sonra dashboard'a yönlendir
          setTimeout(() => navigate('/dashboard'), 5000);
        } else {
          // Ödeme başarısız
          setSuccess(false);
          setMessage('Ödeme işlemi tamamlanamadı veya iptal edildi.');
          shopierService.clearPendingPayment();
          setTimeout(() => navigate('/dashboard'), 3000);
        }
      } catch (error) {
        console.error('Payment return error:', error);
        setMessage('Bir hata oluştu. Lütfen destek ekibiyle iletişime geçin.');
        setTimeout(() => navigate('/dashboard'), 3000);
      } finally {
        setLoading(false);
      }
    };

    handlePaymentReturn();
  }, [searchParams, user, navigate, refreshUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-white font-medium">Ödeme doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-2xl text-center">
          {loading ? (
            <>
              <Loader className="w-16 h-16 animate-spin text-blue-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">İşleminiz Kontrol Ediliyor</h1>
              <p className="text-slate-400">Lütfen bekleyin...</p>
            </>
          ) : success ? (
            <>
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">Ödeme Başarılı!</h1>
              {credits > 0 && (
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-4 mb-4">
                  <p className="text-2xl font-bold text-blue-400">{credits} Kredi</p>
                  <p className="text-sm text-slate-300">hesabınıza eklenecek</p>
                </div>
              )}
              <p className="text-slate-300 mb-2">{message}</p>
              <p className="text-sm text-slate-400">Dashboard'a yönlendiriliyorsunuz...</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">Ödeme Başarısız</h1>
              <p className="text-slate-300 mb-4">{message}</p>
              <p className="text-sm text-slate-400">Dashboard'a yönlendiriliyorsunuz...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
