import axios from 'axios';
import { Package } from '../types';

const PYTR_API_KEY = import.meta.env.VITE_PYTR_API_KEY;
const PYTR_MERCHANT_ID = import.meta.env.VITE_PYTR_MERCHANT_ID;
const PYTR_API_URL = import.meta.env.VITE_PYTR_API_URL || 'https://api.pytr.io';

export const packages: Package[] = [
  {
    id: 'pkg_5',
    name: 'Başlangıç',
    searches: 5,
    price: 99,
  },
  {
    id: 'pkg_12',
    name: 'Standart',
    searches: 12,
    price: 199,
    popular: true,
  },
  {
    id: 'pkg_30',
    name: 'Profesyonel',
    searches: 30,
    price: 399,
  },
  {
    id: 'pkg_100',
    name: 'Expert',
    searches: 100,
    price: 999,
  },
];

export const pytrService = {
  async createPaymentOrder(
    userId: string,
    packageId: string,
    userEmail: string
  ): Promise<{ orderId: string; paymentUrl: string }> {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) throw new Error('Paket bulunamadı');

    try {
      const response = await axios.post(
        `${PYTR_API_URL}/payments/create`,
        {
          merchantId: PYTR_MERCHANT_ID,
          amount: pkg.price,
          currency: 'TRY',
          description: `${pkg.name} - ${userEmail}`,
          orderId: `order_${Date.now()}_${userId}`,
          customData: {
            userId,
            packageId,
            credits: pkg.searches,
          },
          redirectUrl: `${window.location.origin}/payment-success`,
          metadata: {
            userId,
            packageId,
            credits: pkg.searches,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${PYTR_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        orderId: response.data.orderId,
        paymentUrl: response.data.paymentUrl,
      };
    } catch (error) {
      console.error('PyTR ödeme hatası:', error);
      throw error;
    }
  },

  async verifyPayment(orderId: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${PYTR_API_URL}/payments/${orderId}/verify`,
        {
          headers: {
            'Authorization': `Bearer ${PYTR_API_KEY}`,
          },
        }
      );

      return response.data.status === 'completed' || response.data.status === 'success';
    } catch (error) {
      console.error('Ödeme doğrulama hatası:', error);
      return false;
    }
  },

  async handleWebhook(payload: any) {
    try {
      if (payload.event === 'payment.completed') {
        return {
          success: true,
          userId: payload.customData?.userId,
          packageId: payload.customData?.packageId,
          credits: payload.customData?.credits,
          amount: payload.amount,
        };
      }
      return { success: false };
    } catch (error) {
      console.error('Webhook hatası:', error);
      return { success: false };
    }
  },
};
