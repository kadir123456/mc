import { Package } from '../types';

// Shopier paketleri ve linkleri
export const shopierPackages: Package[] = [
  {
    id: 'pkg_5',
    name: 'Başlangıç',
    searches: 5,
    price: 99,
    shopierUrl: 'https://www.shopier.com/bilwininc/41271482',
    popular: false,
  },
  {
    id: 'pkg_10',
    name: 'Standart',
    searches: 10,
    price: 189,
    shopierUrl: 'https://www.shopier.com/bilwininc/41271535',
    popular: true,
  },
  {
    id: 'pkg_25',
    name: 'Profesyonel',
    searches: 25,
    price: 449,
    shopierUrl: 'https://www.shopier.com/bilwininc/41271562',
    popular: false,
  },
  {
    id: 'pkg_50',
    name: 'Expert',
    searches: 50,
    price: 799,
    shopierUrl: 'https://www.shopier.com/bilwininc/41271593',
    popular: false,
  },
];

export const shopierService = {
  // Shopier ödeme sayfasına yönlendir
  redirectToPayment(packageId: string, userId: string): void {
    const pkg = shopierPackages.find((p) => p.id === packageId);
    if (!pkg || !pkg.shopierUrl) {
      throw new Error('Paket bulunamadı');
    }

    // Kullanıcı bilgilerini localStorage'a kaydet (callback'te kullanmak için)
    const paymentData = {
      packageId,
      userId,
      credits: pkg.searches,
      price: pkg.price,
      timestamp: Date.now(),
    };
    
    localStorage.setItem('shopier_pending_payment', JSON.stringify(paymentData));

    // Shopier sayfasına yönlendir
    window.location.href = pkg.shopierUrl;
  },

  // Bekleyen ödeme bilgisini al
  getPendingPayment(): any {
    const data = localStorage.getItem('shopier_pending_payment');
    return data ? JSON.parse(data) : null;
  },

  // Bekleyen ödeme bilgisini temizle
  clearPendingPayment(): void {
    localStorage.removeItem('shopier_pending_payment');
  },
};
