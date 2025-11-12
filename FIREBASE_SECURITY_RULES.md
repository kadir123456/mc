# Firebase Realtime Database Security Rules

Bu döküman, projenin Firebase Realtime Database güvenlik kurallarını içerir.

## Kuralların Uygulanması

1. Firebase Console'a giriş yapın: https://console.firebase.google.com
2. Projenizi seçin
3. Sol menüden **Realtime Database** seçin
4. **Rules** sekmesine tıklayın
5. Aşağıdaki kuralları kopyalayıp yapıştırın
6. **Publish** butonuna tıklayın

## Güvenlik Kuralları

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid",
        "analyses": {
          "$analysisId": {
            ".read": "$uid === auth.uid",
            ".write": "$uid === auth.uid"
          }
        }
      }
    },
    "analyses": {
      "$analysisId": {
        ".read": "auth != null && data.child('userId').val() === auth.uid",
        ".write": "auth != null && (!data.exists() || data.child('userId').val() === auth.uid)",
        ".validate": "newData.hasChildren(['id', 'userId', 'imageUrl', 'uploadedAt', 'status', 'analysis'])"
      }
    },
    "match_cache": {
      "$matchId": {
        ".read": "auth != null",
        ".write": "auth != null",
        ".validate": "newData.hasChildren(['matchId', 'teamHome', 'teamAway', 'league', 'homeForm', 'awayForm', 'h2h', 'injuries', 'leaguePosition', 'lastUpdated', 'dataSources', 'confidenceScore'])"
      }
    },
    "transactions": {
      "$transactionId": {
        ".read": "auth != null && data.child('userId').val() === auth.uid",
        ".write": "auth != null && (!data.exists() || data.child('userId').val() === auth.uid)"
      }
    }
  }
}
```

## Kural Açıklamaları

### 1. Users Node
- **Okuma**: Kullanıcı sadece kendi verilerini okuyabilir
- **Yazma**: Kullanıcı sadece kendi verilerini yazabilir
- **Alt koleksiyonlar**: Analyses referansları kullanıcıya özel

### 2. Analyses Node
- **Okuma**: Sadece analizi yapan kullanıcı okuyabilir
- **Yazma**: Sadece analizi yapan kullanıcı yazabilir (yeni analiz oluştururken veya kendi analizini güncellerken)
- **Validasyon**: Zorunlu alanlar kontrol edilir

### 3. Match Cache Node
- **Okuma**: Tüm kimliği doğrulanmış kullanıcılar okuyabilir (önbellek paylaşımlı)
- **Yazma**: Tüm kimliği doğrulanmış kullanıcılar yazabilir
- **Validasyon**: Zorunlu veri yapısı kontrol edilir
- **Not**: Cache verisi 24 saat sonra otomatik olarak yenilendiğinden, paylaşımlı okuma performansı artırır

### 4. Transactions Node
- **Okuma**: Kullanıcı sadece kendi işlemlerini görür
- **Yazma**: Kullanıcı sadece kendi işlemlerini oluşturabilir/güncelleyebilir

## Güvenlik Prensipleri

1. **Kimlik Doğrulama Zorunlu**: Tüm işlemler için `auth != null` kontrolü
2. **Veri İzolasyonu**: Kullanıcılar sadece kendi verilerine erişebilir
3. **Önbellek Optimizasyonu**: Match cache tüm kullanıcılar tarafından okunabilir (maliyet optimizasyonu)
4. **Veri Bütünlüğü**: Validate kuralları ile zorunlu alanlar kontrol edilir

## Test Senaryoları

### Başarılı Senaryolar
- ✅ Kullanıcı kendi analizini okuyabilir
- ✅ Kullanıcı yeni analiz oluşturabilir
- ✅ Tüm kullanıcılar match cache'i okuyabilir
- ✅ Kullanıcı kendi işlemlerini görüntüleyebilir

### Başarısız Senaryolar
- ❌ Kullanıcı başka kullanıcının analizini okuyamaz
- ❌ Kimliği doğrulanmamış kullanıcılar hiçbir veri okuyamaz
- ❌ Eksik zorunlu alan ile veri yazılamaz

## Notlar

- Bu kurallar Firebase Realtime Database için tasarlanmıştır
- Firestore kullanıyorsanız, kuralların Firestore formatına dönüştürülmesi gerekir
- Üretim ortamında daha katı kurallar eklenebilir (rate limiting, veri boyutu kontrolleri vb.)
