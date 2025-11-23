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
  // Shopier ödeme sayfasına yönlendir (Yeni sekmede)
  redirectToPayment(packageId: string, userId: string, userEmail: string, userName?: string): void {
    const pkg = shopierPackages.find((p) => p.id === packageId);
    if (!pkg || !pkg.shopierUrl) {
      throw new Error('Paket bulunamadı');
    }

    // Kullanıcı bilgilerini localStorage'a kaydet (callback'te kullanmak için)
    const paymentData = {
      packageId,
      userId,
      userEmail,
      credits: pkg.searches,
      price: pkg.price,
      timestamp: Date.now(),
    };
    
    localStorage.setItem('shopier_pending_payment', JSON.stringify(paymentData));

    // Shopier URL'ine kullanıcı bilgilerini ekle (otomatik doldurma için)
    const url = new URL(pkg.shopierUrl);
    url.searchParams.append('buyer_email', userEmail);
    if (userName) {
      url.searchParams.append('buyer_name', userName);
    }

    // Yeni sekmede aç
    const paymentUrl = url.toString();
    const newWindow = window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    
    // Eğer pop-up engelleyici varsa, kullanıcıya bildir
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Pop-up engellendi, kullanıcıya alternatif sun
      const userConfirm = window.confirm(
        '⚠️ Pop-up engelleyici aktif olabilir.\n\n' +
        'Ödeme sayfasını yeni sekmede açmak için "Tamam"a tıklayın.\n' +
        'Veya "İptal" ile mevcut sekmede devam edin.'
      );
      
      if (userConfirm) {
        // Yeniden dene
        window.open(paymentUrl, '_blank', 'noopener,noreferrer');
      } else {
        // Mevcut sekmede aç (fallback)
        window.location.href = paymentUrl;
      }
    }
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
