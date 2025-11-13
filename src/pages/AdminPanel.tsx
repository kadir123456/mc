import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, RefreshCw, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ref, get, set, update } from 'firebase/database';
import { database } from '../services/firebase';
import { authService } from '../services/authService';

interface PaymentRequest {
  id: string;
  userId: string;
  userEmail: string;
  credits: number;
  amount: string;
  paymentDescription: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  processedAt?: number;
  processedBy?: string;
}

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadPayments();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const adminRef = ref(database, `admins/${user.uid}`);
      const snapshot = await get(adminRef);

      if (snapshot.exists() && snapshot.val() === true) {
        setIsAdmin(true);
      } else {
        alert('Bu sayfaya erişim yetkiniz yok!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Admin check error:', error);
      navigate('/dashboard');
    }
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      const paymentsRef = ref(database, 'payment_requests');
      const snapshot = await get(paymentsRef);

      if (snapshot.exists()) {
        const paymentsData = snapshot.val();
        const paymentsList = Object.keys(paymentsData).map(key => ({
          id: key,
          ...paymentsData[key]
        }));

        paymentsList.sort((a, b) => b.createdAt - a.createdAt);
        setPayments(paymentsList);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error('Load payments error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (payment: PaymentRequest) => {
    if (!user) return;

    const confirmed = window.confirm(
      `${payment.userEmail} kullanıcısına ${payment.credits} kredi eklenecek. Onaylıyor musunuz?`
    );

    if (!confirmed) return;

    setProcessing(payment.id);
    try {
      const userRef = ref(database, `users/${payment.userId}`);
      const userSnapshot = await get(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        const currentCredits = userData.credits || 0;
        const newCredits = currentCredits + payment.credits;

        await update(userRef, {
          credits: newCredits
        });

        await update(ref(database, `payment_requests/${payment.id}`), {
          status: 'approved',
          processedAt: Date.now(),
          processedBy: user.uid
        });

        alert(`Başarılı! ${payment.credits} kredi eklendi.`);
        loadPayments();
      }
    } catch (error) {
      console.error('Approve error:', error);
      alert('Hata oluştu!');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (payment: PaymentRequest) => {
    if (!user) return;

    const confirmed = window.confirm(
      `${payment.userEmail} kullanıcısının ödeme talebi reddedilecek. Onaylıyor musunuz?`
    );

    if (!confirmed) return;

    setProcessing(payment.id);
    try {
      await update(ref(database, `payment_requests/${payment.id}`), {
        status: 'rejected',
        processedAt: Date.now(),
        processedBy: user.uid
      });

      alert('Ödeme talebi reddedildi.');
      loadPayments();
    } catch (error) {
      console.error('Reject error:', error);
      alert('Hata oluştu!');
    } finally {
      setProcessing(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-20">
      <nav className="bg-slate-800/95 backdrop-blur border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-red-400" />
              <h1 className="text-xl font-bold text-white">Admin Panel</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadPayments}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition text-sm"
              >
                <LogOut className="w-4 h-4" />
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-bold text-blue-300 mb-2">Bekleyen Ödemeler</h2>
          <p className="text-sm text-slate-300">
            Kullanıcıların banka transferi ödemelerini onaylayın veya reddedin.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
            <p className="text-slate-300">Yükleniyor...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-lg">
            <p className="text-slate-300">Henüz ödeme talebi yok</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className={`bg-slate-800/50 border rounded-lg p-4 ${
                  payment.status === 'pending'
                    ? 'border-yellow-700/50'
                    : payment.status === 'approved'
                    ? 'border-green-700/50'
                    : 'border-red-700/50'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          payment.status === 'pending'
                            ? 'bg-yellow-900/50 text-yellow-300'
                            : payment.status === 'approved'
                            ? 'bg-green-900/50 text-green-300'
                            : 'bg-red-900/50 text-red-300'
                        }`}
                      >
                        {payment.status === 'pending'
                          ? 'Bekliyor'
                          : payment.status === 'approved'
                          ? 'Onaylandı'
                          : 'Reddedildi'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(payment.createdAt).toLocaleString('tr-TR')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-400">Email:</span>
                        <p className="text-white font-medium truncate">{payment.userEmail}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Kredi:</span>
                        <p className="text-white font-medium">{payment.credits} kredi</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Tutar:</span>
                        <p className="text-green-400 font-bold">{payment.amount}₺</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Açıklama:</span>
                        <p className="text-white font-mono text-xs">{payment.paymentDescription}</p>
                      </div>
                    </div>
                  </div>

                  {payment.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(payment)}
                        disabled={processing === payment.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition text-sm"
                      >
                        <Check className="w-4 h-4" />
                        Onayla
                      </button>
                      <button
                        onClick={() => handleReject(payment)}
                        disabled={processing === payment.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition text-sm"
                      >
                        <X className="w-4 h-4" />
                        Reddet
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
