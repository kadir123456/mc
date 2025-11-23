import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader } from 'lucide-react';
import { pytrService } from '../services/pytrService';
import { useAuth } from '../context/AuthContext';

export const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifyPayment = async () => {
      const orderId = searchParams.get('order_id');
      if (!orderId || !user) {
        setTimeout(() => navigate('/dashboard'), 2000);
        return;
      }

      try {
        const isValid = await pytrService.verifyPayment(orderId);
        if (isValid) {
          setSuccess(true);
          setTimeout(() => navigate('/dashboard'), 3000);
        } else {
          setTimeout(() => navigate('/dashboard'), 2000);
        }
      } catch (error) {
        console.error('Ödeme doğrulama hatası:', error);
        setTimeout(() => navigate('/dashboard'), 2000);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 md:bg-gradient-to-br md:from-slate-900 md:via-slate-800 md:to-slate-900 flex items-center justify-center px-4">
        <div className="text-center bg-white md:bg-slate-800/50 p-6 rounded-xl border border-slate-200 md:border-slate-700 shadow-lg max-w-sm w-full">
          <Loader className="w-10 h-10 animate-spin text-blue-600 md:text-blue-400 mx-auto mb-3" />
          <p className="text-slate-900 md:text-white font-medium text-sm">Ödeme doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 md:bg-gradient-to-br md:from-slate-900 md:via-slate-800 md:to-slate-900 flex items-center justify-center px-4">
      <div className="text-center bg-white md:bg-slate-800/50 p-6 rounded-xl border border-slate-200 md:border-slate-700 shadow-lg max-w-sm w-full">
        {success ? (
          <>
            <CheckCircle className="w-14 h-14 text-green-600 md:text-green-400 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-slate-900 md:text-white mb-2">Ödeme Başarılı!</h1>
            <p className="text-slate-700 md:text-slate-300 mb-3 text-sm">Krediniz hesabınıza eklendi.</p>
            <p className="text-slate-500 md:text-slate-400 text-xs">Panoya yönlendiriliyorsunuz...</p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-bold text-slate-900 md:text-white mb-2">Ödeme İşleniyor</h1>
            <p className="text-slate-700 md:text-slate-300 text-sm">Lütfen bekleyin...</p>
          </>
        )}
      </div>
    </div>
  );
};