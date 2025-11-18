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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-white font-medium">Ödeme doğrulanıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="text-center">
        {success ? (
          <>
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Ödeme Başarılı!</h1>
            <p className="text-slate-300 mb-4">Krediiniz hesabınıza eklenmiştir.</p>
            <p className="text-slate-400">Pano'ya yönlendiriliyorsunuz...</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-white mb-2">Ödeme İşleniyor</h1>
            <p className="text-slate-300">Lütfen kısa bir süre bekleyin...</p>
          </>
        )}
      </div>
    </div>
  );
};
