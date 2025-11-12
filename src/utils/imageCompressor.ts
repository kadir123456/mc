export const compressImage = (base64: string, maxWidth = 1024, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Boyutu küçült
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      // JPEG formatında sıkıştır (daha küçük boyut)
      const compressed = canvas.toDataURL('image/jpeg', quality).split(',')[1];
      
      console.log('📊 Görsel sıkıştırma:', {
        orijinal: Math.round(base64.length / 1024) + 'KB',
        sıkıştırılmış: Math.round(compressed.length / 1024) + 'KB',
        tasarruf: Math.round(((base64.length - compressed.length) / base64.length) * 100) + '%'
      });
      
      resolve(compressed);
    };

    img.onerror = () => reject(new Error('Görsel yüklenemedi'));
    img.src = `data:image/jpeg;base64,${base64}`;
  });
};
