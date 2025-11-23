import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Calendar, Share2, ChevronDown, ChevronUp, Trophy, ArrowLeft, Trash2, X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { couponService, Coupon } from '../services/couponService';
import { translateLeague, translateTeam } from '../utils/leagueTranslations';

export const MyCoupons: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCoupon, setExpandedCoupon] = useState<string | null>(null);
  
  // ✅ Silme modu state'leri
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCoupons, setSelectedCoupons] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // ✅ Basılı tutma için ref ve timer
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => {
    if (user) {
      loadCoupons();
    }
  }, [user]);

  const loadCoupons = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userCoupons = await couponService.getUserCoupons(user.uid);
      setCoupons(userCoupons);
    } catch (error) {
      console.error('Kupon yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Basılı tutma başlangıcı
  const handlePressStart = (couponId: string) => {
    longPressTriggered.current = false;
    
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      // Titreşim (mobilde)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      // Seçim modunu aç ve bu kuponu seç
      setSelectionMode(true);
      setSelectedCoupons(new Set([couponId]));
    }, 500); // 500ms basılı tutma
  };

  // ✅ Basılı tutma bitişi
  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // ✅ Kupon tıklama
  const handleCouponClick = (couponId: string) => {
    // Eğer basılı tutma tetiklendiyse, tıklamayı engelle
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }

    // Seçim modundaysa, seçimi değiştir
    if (selectionMode) {
      toggleCouponSelection(couponId);
      return;
    }

    // Normal modda, kuponu genişlet/daralt
    toggleCoupon(couponId);
  };

  // ✅ Kupon seçimini değiştir
  const toggleCouponSelection = (couponId: string) => {
    const newSelection = new Set(selectedCoupons);
    if (newSelection.has(couponId)) {
      newSelection.delete(couponId);
    } else {
      newSelection.add(couponId);
    }
    setSelectedCoupons(newSelection);

    // Hiç seçili kupon kalmadıysa seçim modundan çık
    if (newSelection.size === 0) {
      setSelectionMode(false);
    }
  };

  // ✅ Tümünü seç
  const selectAllCoupons = () => {
    setSelectedCoupons(new Set(coupons.map(c => c.id)));
  };

  // ✅ Seçimi temizle
  const clearSelection = () => {
    setSelectedCoupons(new Set());
    setSelectionMode(false);
  };

  // ✅ Seçili kuponları sil
  const deleteSelectedCoupons = async () => {
    if (!user || selectedCoupons.size === 0) return;

    try {
      setDeleting(true);
      
      // Firebase'den sil
      const deletePromises = Array.from(selectedCoupons).map(couponId => 
        couponService.deleteCoupon(user.uid, couponId)
      );
      
      await Promise.all(deletePromises);
      
      // Local state'i güncelle
      setCoupons(prev => prev.filter(c => !selectedCoupons.has(c.id)));
      
      // Seçimi temizle
      setSelectedCoupons(new Set());
      setSelectionMode(false);
      setShowDeleteConfirm(false);
      
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('Kuponlar silinirken bir hata oluştu');
    } finally {
      setDeleting(false);
    }
  };

  const toggleCoupon = (couponId: string) => {
    setExpandedCoupon(expandedCoupon === couponId ? null : couponId);
  };

  const shareCoupon = (coupon: Coupon) => {
    const text = `Aikupon Analizi\n\n${coupon.matches.map((m, i) =>
      `${i + 1}. ${m.homeTeam} vs ${m.awayTeam}`
    ).join('\n')}\n\nToplam ${coupon.matches.length} maç`;

    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Kupon panoya kopyalandı!');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="text-center">
          <Ticket className="w-20 h-20 mx-auto text-slate-600 mb-6" />
          <p className="text-white text-xl mb-6">Analizleri görmek için giriş yapmalısınız</p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all hover:scale-105 shadow-lg"
          >Giriş Yap</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-6"></div>
          <p className="text-white text-xl">Analizler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 md:bg-gradient-to-br md:from-slate-950 md:via-slate-900 md:to-slate-950 pb-24 md:pb-12 md:pt-20">
      {/* Header */}
      <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {selectionMode ? (
            // Seçim modu header'ı
            <>
              <button
                onClick={clearSelection}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-slate-900 font-semibold text-sm">
                {selectedCoupons.size} seçildi
              </span>
              <button
                onClick={selectAllCoupons}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-95"
              >
                <Check className="w-5 h-5" />
              </button>
            </>
          ) : (
            // Normal header
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all active:scale-95"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-bold text-slate-900">Analizlerim</h1>
              <div className="w-10"></div>
            </>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Desktop Header */}
        <div className="hidden md:flex md:items-center md:justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold text-white mb-3 flex items-center gap-4">
              <Ticket className="w-10 h-10 text-blue-400" />
              Kuponlarım
            </h1>
            <p className="text-slate-400 text-lg">AI analiz sonuçlarınız</p>
          </div>
          
          {selectionMode && (
            <div className="flex items-center gap-3">
              <span className="text-slate-400">{selectedCoupons.size} seçildi</span>
              <button
                onClick={selectAllCoupons}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
              >
                Tümünü Seç
              </button>
              <button
                onClick={clearSelection}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
              >
                İptal
              </button>
            </div>
          )}
        </div>

        {/* Bilgi Mesajı */}
        {!selectionMode && coupons.length > 0 && (
          <div className="bg-blue-50 md:bg-slate-800/30 border border-blue-200 md:border-slate-700/50 rounded-lg p-3 mb-4 text-center">
            <p className="text-blue-700 md:text-slate-400 text-xs">
              💡 Silmek için kupona basılı tutun
            </p>
          </div>
        )}

        {coupons.length === 0 ? (
          <div className="text-center py-20 bg-white md:bg-slate-900/50 md:backdrop-blur-xl border-0 md:border md:border-slate-800/50 rounded-2xl shadow-sm md:shadow-lg">
            <Ticket className="w-20 h-20 mx-auto text-slate-400 md:text-slate-600 mb-6" />
            <p className="text-slate-900 md:text-slate-300 text-xl md:text-2xl mb-3">Henüz Analiziniz yok</p>
            <p className="text-slate-600 md:text-slate-500 text-base md:text-lg mb-8">Bülten'den maç seçerek ilk analizini oluşturun</p>
            <button
              onClick={() => navigate('/bulletin')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg"
            >Maçları Görüntüle</button>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-5">
            {coupons.map((coupon) => {
              const isExpanded = expandedCoupon === coupon.id;
              const isSelected = selectedCoupons.has(coupon.id);

              return (
                <div
                  key={coupon.id}
                  className={`bg-white md:bg-slate-900/50 md:backdrop-blur-xl border md:border rounded-xl md:rounded-2xl overflow-hidden shadow-sm md:shadow-lg transition-all duration-200 ${
                    isSelected 
                      ? 'border-red-400 md:border-red-500/50 bg-red-50 md:bg-red-900/10' 
                      : 'border-slate-200 md:border-slate-800/50 hover:shadow-md md:hover:border-blue-500/30'
                  } ${selectionMode ? 'select-none' : ''}`}
                  onTouchStart={() => handlePressStart(coupon.id)}
                  onTouchEnd={handlePressEnd}
                  onTouchCancel={handlePressEnd}
                  onMouseDown={() => handlePressStart(coupon.id)}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                >
                  {/* Kupon Header */}
                  <button
                    onClick={() => handleCouponClick(coupon.id)}
                    className="w-full p-4 md:p-5 text-left active:bg-slate-50 md:active:bg-slate-800/30 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Seçim Checkbox */}
                        {selectionMode && (
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                            isSelected 
                              ? 'bg-red-500 border-red-500' 
                              : 'border-slate-400 md:border-slate-600'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        )}
                        
                        <div className={`w-11 h-11 md:w-12 md:h-12 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-md flex-shrink-0 ${
                          isSelected ? 'from-red-500 to-red-600' : 'from-blue-600 to-purple-600'
                        }`}>
                          <Ticket className="w-5 h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-slate-900 md:text-white font-bold text-base md:text-lg mb-1">
                            Kupon #{coupon.id.slice(-6)}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 md:text-slate-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{new Date(coupon.purchasedAt).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'short'
                              })}</span>
                            </div>
                            <span className="text-slate-300 md:text-slate-600">•</span>
                            <span className="font-medium">{coupon.matches.length} Maç</span>
                            <span className="text-slate-300 md:text-slate-600">•</span>
                            <span className="text-orange-600 md:text-yellow-400 font-semibold">{coupon.creditsUsed} Kredi</span>
                          </div>
                        </div>
                      </div>
                      
                      {!selectionMode && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              shareCoupon(coupon);
                            }}
                            className="p-2 md:p-2.5 bg-slate-100 md:bg-slate-800/80 hover:bg-slate-200 md:hover:bg-slate-700 rounded-lg md:rounded-xl transition-all active:scale-95"
                          >
                            <Share2 className="w-4 h-4 text-slate-600 md:text-slate-300" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-slate-500 md:text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-500 md:text-slate-400" />
                          )}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Kupon Detayı */}
                  {isExpanded && !selectionMode && (
                    <div className="border-t border-slate-200 md:border-slate-800/50 bg-slate-50 md:bg-slate-800/30">
                      {/* Yeni Format: Image Analysis Sonuçları */}
                      {coupon.matches && Array.isArray(coupon.matches) && !coupon.analysis && (
                        <div className="p-3 md:p-4 space-y-3">
                          <div className="bg-blue-50 md:bg-blue-600/10 border border-blue-200 md:border-blue-500/30 rounded-lg p-3">
                            <p className="text-blue-700 md:text-blue-300 font-semibold text-xs md:text-sm">
                              📊 {
                                coupon.analysisType === 'macSonucu' ? 'Maç Sonucu' :
                                coupon.analysisType === 'karsilikliGol' ? 'Karşılıklı Gol' :
                                coupon.analysisType === 'altustu' ? '2.5 Alt/Üst' :
                                coupon.analysisType === 'ilkYariSonucu' ? 'İlk Yarı Sonucu' :
                                coupon.analysisType === 'ilkYariMac' ? 'İlk Yarı/Maç Sonucu' :
                                coupon.analysisType === 'handikap' ? 'Handikap' :
                                coupon.analysisType === 'hepsi' ? 'Tüm Değerlendirmeler' : 'Genel Analiz'
                              }
                            </p>
                          </div>
                          {coupon.matches.map((match: any, index: number) => (
                            <div
                              key={index}
                              className="bg-white md:bg-slate-900/70 border border-slate-200 md:border-slate-700/50 rounded-lg p-3 md:p-4 shadow-sm md:shadow-none"
                              data-testid={`coupon-match-${index}`}
                            >
                              {/* Maç Başlığı */}
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                  {index + 1}
                                </div>
                                <span className="text-xs text-blue-600 md:text-blue-300 font-semibold">
                                  {match.league}
                                </span>
                              </div>
                              
                              {/* Takımlar */}
                              <div className="mb-3">
                                <p className="text-slate-900 md:text-white font-bold text-sm mb-1">
                                  {match.homeTeam}
                                </p>
                                <p className="text-slate-400 text-xs text-center my-1">vs</p>
                                <p className="text-slate-900 md:text-white font-bold text-sm">
                                  {match.awayTeam}
                                </p>
                              </div>
                              
                              {/* Tarih */}
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 md:text-slate-400 mb-3 pb-3 border-b border-slate-200 md:border-slate-700/30">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>
                                  {new Date(match.date).toLocaleDateString('tr-TR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            
                              {/* Tahmin */}
                              {match.prediction && (
                                <div className="bg-green-50 md:bg-gradient-to-r md:from-green-600/20 md:to-emerald-600/20 border border-green-200 md:border-green-500/30 rounded-lg p-3">
                                  <p className="text-xs text-green-700 md:text-green-300 font-semibold mb-2 flex items-center gap-1.5">
                                    <Trophy className="w-3.5 h-3.5" />
                                    İstatistiksel Değerlendirme
                                  </p>
                                  <p className="text-slate-800 md:text-white text-sm leading-relaxed whitespace-pre-wrap">{match.prediction}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Eski Format: Standart Kuponlar */}
                      {coupon.analysis && coupon.analysis.length > 0 && (
                        <div className="p-3 md:p-4 space-y-3">
                        {coupon.analysis.map((match, index) => {
                          // En yüksek istatistiksel değerlendirmeyi bul
                          const predictions = [
                            { type: 'Ev Sahibi', value: match.predictions.ms1, key: 'ms1' },
                            { type: 'Beraberlik', value: match.predictions.msX, key: 'msX' },
                            { type: 'Deplasman', value: match.predictions.ms2, key: 'ms2' }
                          ];
                          const bestPrediction = predictions.reduce((max, p) => p.value > max.value ? p : max);

                          return (
                            <div
                              key={match.fixtureId}
                              className="bg-white md:bg-slate-900/70 border border-slate-200 md:border-slate-700/50 rounded-lg p-3 md:p-4 shadow-sm md:shadow-none"
                            >
                              {/* Başlık: Maç No + Lig */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                    {index + 1}
                                  </div>
                                  <span className="text-xs text-blue-600 md:text-blue-300 font-semibold">
                                    {translateLeague(match.league)}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 md:text-slate-500">
                                  {new Date(match.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} • {match.time}
                                </span>
                              </div>

                              {/* Takımlar - Kompakt Görünüm */}
                              <div className="mb-3 pb-3 border-b border-slate-200 md:border-slate-700/30">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-900 md:text-white font-bold text-sm flex-1">{translateTeam(match.homeTeam)}</span>
                                  <span className="text-xs text-slate-400 px-2">vs</span>
                                  <span className="text-slate-900 md:text-white font-bold text-sm flex-1 text-right">{translateTeam(match.awayTeam)}</span>
                                </div>
                              </div>

                              {/* İstatistiksel Değerlendirme - Tablo Formatı */}
                              <div className="bg-slate-50 md:bg-slate-800/50 rounded-lg p-2.5 mb-3">
                                <p className="text-[10px] text-slate-500 md:text-slate-400 mb-2 text-center font-medium">İstatistiksel Değerlendirme</p>
                                <div className="grid grid-cols-3 gap-2">
                                  <div className={`${bestPrediction.key === 'ms1' ? 'bg-green-100 md:bg-green-600/20 border-2 border-green-400 md:border-green-500/50' : 'bg-white md:bg-slate-700/30 border border-slate-200 md:border-slate-600/30'} rounded-lg p-2 transition-all`}>
                                    <div className="text-[10px] text-slate-500 md:text-slate-400 mb-1 text-center">Ev</div>
                                    <div className={`text-base font-bold text-center ${bestPrediction.key === 'ms1' ? 'text-green-600 md:text-green-400' : 'text-slate-700 md:text-white'}`}>
                                      %{match.predictions.ms1}
                                    </div>
                                  </div>
                                  <div className={`${bestPrediction.key === 'msX' ? 'bg-yellow-100 md:bg-yellow-600/20 border-2 border-yellow-400 md:border-yellow-500/50' : 'bg-white md:bg-slate-700/30 border border-slate-200 md:border-slate-600/30'} rounded-lg p-2 transition-all`}>
                                    <div className="text-[10px] text-slate-500 md:text-slate-400 mb-1 text-center">Ber.</div>
                                    <div className={`text-base font-bold text-center ${bestPrediction.key === 'msX' ? 'text-yellow-600 md:text-yellow-400' : 'text-slate-700 md:text-white'}`}>
                                      %{match.predictions.msX}
                                    </div>
                                  </div>
                                  <div className={`${bestPrediction.key === 'ms2' ? 'bg-blue-100 md:bg-blue-600/20 border-2 border-blue-400 md:border-blue-500/50' : 'bg-white md:bg-slate-700/30 border border-slate-200 md:border-slate-600/30'} rounded-lg p-2 transition-all`}>
                                    <div className="text-[10px] text-slate-500 md:text-slate-400 mb-1 text-center">Dep.</div>
                                    <div className={`text-base font-bold text-center ${bestPrediction.key === 'ms2' ? 'text-blue-600 md:text-blue-400' : 'text-slate-700 md:text-white'}`}>
                                      %{match.predictions.ms2}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* AI Tavsiyesi - Mobil Uyumlu */}
                              <div className="bg-gradient-to-r from-purple-50 to-blue-50 md:from-purple-600/10 md:to-blue-600/10 border border-purple-200 md:border-purple-500/30 rounded-lg p-2.5">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <Trophy className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                                    <span className="text-[10px] text-slate-600 md:text-slate-300 font-medium">Tavsiye:</span>
                                    <span className="text-xs text-slate-900 md:text-white font-bold truncate">{bestPrediction.type}</span>
                                  </div>
                                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                                    match.confidence >= 70 ? 'bg-green-100 text-green-700 md:bg-green-500/20 md:text-green-400 border border-green-300 md:border-green-500/30' :
                                    match.confidence >= 50 ? 'bg-yellow-100 text-yellow-700 md:bg-yellow-500/20 md:text-yellow-400 border border-yellow-300 md:border-yellow-500/30' : 
                                    'bg-red-100 text-red-700 md:bg-red-500/20 md:text-red-400 border border-red-300 md:border-red-500/30'
                                  }`}>
                                    %{match.confidence}
                                  </div>
                                </div>
                                
                                {/* Öneri Metni */}
                                {match.recommendation && (
                                  <p className="text-xs text-slate-700 md:text-slate-300 leading-relaxed">{match.recommendation}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      )}

                      {/* Genel Analiz - Sadece eski kuponlar için */}
                      {coupon.analysis && coupon.analysis[0]?.analysis && (
                        <div className="border-t border-slate-200 md:border-slate-800/50 p-4 md:p-6">
                          <h4 className="text-slate-900 md:text-white font-bold text-base mb-3 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            Genel Değerlendirme
                          </h4>
                          <div className="bg-white md:bg-slate-800/50 border border-slate-200 md:border-slate-600/30 rounded-lg p-3 md:p-4">
                            <p className="text-slate-700 md:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                              {coupon.analysis[0].analysis}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Silme Butonu (Alt Bar) */}
      {selectionMode && selectedCoupons.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50">
          <div className="bg-white md:bg-slate-800/95 md:backdrop-blur-xl border border-red-300 md:border-red-500/50 rounded-xl p-4 shadow-xl md:shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-900 md:text-white font-semibold text-sm">
                {selectedCoupons.size} kupon seçildi
              </span>
              <button
                onClick={clearSelection}
                className="p-1 text-slate-500 md:text-slate-400 hover:text-slate-700 md:hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              Seçilenleri Sil
            </button>
          </div>
        </div>
      )}

      {/* Silme Onay Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 md:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white md:bg-slate-800 border border-slate-200 md:border-red-500/30 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-red-100 md:bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500 md:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 md:text-white mb-2">Kuponu Sil</h3>
              <p className="text-slate-600 md:text-slate-300 text-sm">
                <span className="text-red-500 md:text-red-400 font-bold">{selectedCoupons.size}</span> kupon kalıcı olarak silinecek. Bu işlem geri alınamaz.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 md:bg-slate-700 hover:bg-slate-200 md:hover:bg-slate-600 text-slate-700 md:text-white rounded-lg font-medium transition-all active:scale-95"
              >İptal</button>
              <button
                onClick={deleteSelectedCoupons}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Siliniyor...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Sil
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};