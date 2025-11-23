# 👨‍💼 Admin Kullanıcı Ekleme Rehberi

## 🔥 Firebase Console'dan Admin Ekleme

### Adım 1: Kullanıcı UID'sini Bulun

1. **Firebase Console** → Projeniz
2. **Authentication** → **Users** sekmesi
3. Admin yapmak istediğiniz kullanıcıyı bulun
4. **User UID** kolonundaki ID'yi kopyalayın
   - Örnek: `abc123xyz456def789`

### Adım 2: Admin Olarak Atayın

1. **Realtime Database** → **Data** sekmesi
2. `admins` node'una gidin (yoksa oluşturun)
3. **+** butonuna tıklayın
4. Alan adı: Kullanıcının UID'si
5. Değer: `true`
6. **Add** butonuna tıklayın

### Görsel Yapı

```
your-database/
├── users/
├── matches/
├── coupons/
└── admins/
    ├── abc123xyz456def789: true
    ├── xyz789abc123def456: true
    └── def456xyz789abc123: true
```

### JSON Formatı

```json
{
  "admins": {
    "abc123xyz456def789": true,
    "xyz789abc123def456": true,
    "def456xyz789abc123": true
  }
}
```

## ✅ Admin Kontrolü

Admin kullanıcı olarak giriş yaptıktan sonra:

1. Tarayıcıda `/admin` adresine gidin
2. Sistem otomatik kontrol eder:
   - UID Firebase'de `admins` altında var mı?
   - Değeri `true` mu?
3. Eğer admin değilseniz → Dashboard'a yönlendirilirsiniz
4. Eğer adminseniz → Admin paneli açılır

## 🔒 Güvenlik

- Sadece Firebase Console'dan admin eklenebilir
- Kullanıcılar kendi başlarına admin olamaz
- Firebase Rules: `"admins": { ".write": false }`
- Admin listesi sadece giriş yapan kullanıcılar tarafından okunabilir

## 📋 Admin Paneli Özellikleri

### Bekleyen Ödemeler
- Kullanıcı bilgileri (Email, ID)
- Paket detayları (Kredi, Tutar)
- Ödeme açıklaması
- İşlem tarihi

### Onaylama İşlemi
1. "Onayla" butonuna tıklayın
2. Onay penceresi açılır
3. Krediler **otomatik** eklenir
4. Durum "approved" olarak güncellenir

### Reddetme İşlemi
1. "Reddet" butonuna tıklayın
2. Onay penceresi açılır
3. Durum "rejected" olarak güncellenir
4. Kredi eklenmez

## 🎯 Örnek Senaryolar

### Senaryo 1: İlk Admin Ekleme

```
1. Firebase Console → Authentication
2. Kendi email'inizi bulun
3. UID'yi kopyalayın: "xyz123abc"
4. Realtime Database → Data
5. Root'a sağ tıklayın → Add child
6. Name: "admins"
7. İçine girin → Add child
8. Name: "xyz123abc"
9. Value: true (boolean)
10. Save
```

### Senaryo 2: Birden Fazla Admin

```json
{
  "admins": {
    "user1_uid_here": true,
    "user2_uid_here": true,
    "user3_uid_here": true,
    "user4_uid_here": true
  }
}
```

### Senaryo 3: Admin Kaldırma

```
1. Realtime Database → Data → admins
2. İlgili UID'ye tıklayın
3. Delete butonuna tıklayın
veya
4. Değeri false yapın (tavsiye edilmez, silin)
```

## 🚀 Hızlı Başlangıç

**Kendi hesabınızı admin yapmak için:**

1. Siteye kayıt olun / giriş yapın
2. Firebase Console → Authentication → Users
3. Email'inizi bulun → UID'yi kopyalayın
4. Firebase Console → Realtime Database → Data
5. Admins node'u oluşturun:
   ```
   admins/
     YOUR_UID: true
   ```
6. Siteye geri dönün
7. `/admin` adresine gidin
8. Admin paneli açılır! 🎉

## ⚠️ Önemli Notlar

- Admin UID'leri **tamamen doğru** olmalı
- Boolean değer kullanın: `true` (string değil!)
- Test için önce kendi hesabınızı admin yapın
- Admin listesi düzenli kontrol edilmeli
- Güvenlik için gereksiz adminleri kaldırın

## 🔧 Sorun Giderme

**"Bu sayfaya erişim yetkiniz yok" hatası:**
- UID'nin doğru olduğundan emin olun
- Firebase'de `admins/YOUR_UID: true` var mı kontrol edin
- Tarayıcı cache'ini temizleyin
- Çıkış yapıp tekrar giriş yapın

**Admin paneli yüklenmiyor:**
- Firebase Rules güncel mi kontrol edin
- Console'da hata var mı bakın (F12)
- Internet bağlantınızı kontrol edin

## ✅ Başarılı Kurulum

Admin doğru eklendiğinde:
- `/admin` sayfası açılır
- Bekleyen ödemeler görünür
- Onayla/Reddet butonları aktif
- Yenile butonu çalışır
