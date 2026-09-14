# 🕌 Namaz Vakti — GNOME Shell Extension

<p align="center">
  <img src="screenshots/panel-preview.png" alt="Panel Önizleme" width="400">
</p>

Sağ üst panelde sıradaki namaz vaktine kalan süreyi geri sayım olarak gösteren bir GNOME Shell eklentisidir. **Diyanet İşleri Başkanlığı** vakitleriyle birebir uyumludur.

[![GNOME 45+](https://img.shields.io/badge/GNOME-45%20%7C%2046%20%7C%2047%20%7C%2048-blue?logo=gnome&logoColor=white)](https://extensions.gnome.org/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-green.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Pardus Uyumlu](https://img.shields.io/badge/Pardus-Uyumlu-red)](https://www.pardus.org.tr/)

---

## ✨ Özellikler

| Özellik | Açıklama |
|---------|----------|
| ☪ **Geri Sayım** | Sıradaki namaz vaktine kalan süre panelde gösterilir |
| 📋 **Açılır Menü** | Tıklayınca günün tüm vakitlerini listeler |
| 🔘 **ON/OFF Toggle** | Menüden tek tıkla açıp kapatabilirsiniz |
| 🏙️ **81 İl Desteği** | Türkiye'nin tüm illeri için vakit hesaplama |
| 💾 **Kalıcı Ayarlar** | Seçtiğiniz il reboot sonrası bile hatırlanır |
| ⚡ **Hafif** | Günde sadece 1 API çağrısı, 30 sn'de bir güncelleme |
| 📦 **Tek ZIP** | Kolay kurulum, kolay paylaşım |

## 📸 Ekran Görüntüleri

### Panel Görünümü
```
☪ İkindi: 1s 15d
```

### Açılır Menü
```
┌──────────────────────────┐
│  ☪  Namaz Vakitleri       │
│──────────────────────────│
│  İmsak           04:58   │
│  Sabah           05:08   │
│  Güneş           06:35   │
│  Öğle            13:05   │
│  İkindi          16:37   │  ← Sıradaki (vurgulu)
│  Akşam           19:24   │
│  Yatsı           20:45   │
│──────────────────────────│
│  Geri Sayım      [ON ]   │  ← Toggle
└──────────────────────────┘
```

## 🚀 Kurulum

### Yöntem 1: ZIP ile Kurulum (Önerilen)

```bash
# 1. Releases sayfasından ZIP'i indirin veya kendiniz oluşturun:
./build.sh

# 2. Kurun:
gnome-extensions install namazvakti@suleyman.hocam.zip

# 3. Oturumu kapatıp açın (Wayland zorunlu, X11'de Alt+F2 → r)

# 4. Etkinleştirin:
gnome-extensions enable namazvakti@suleyman.hocam
```

### Yöntem 2: Git'ten Manuel Kurulum

```bash
# 1. Repoyu klonlayın:
git clone https://github.com/KULLANICI_ADI/namazvakti-gnome-extension.git
cd namazvakti-gnome-extension

# 2. Kurun:
make install

# 3. Oturumu kapatıp açın

# 4. Etkinleştirin:
gnome-extensions enable namazvakti@suleyman.hocam
```

### Yöntem 3: GNOME Extensions Uygulamasından

Kurulumdan sonra **Uzantılar** (Extensions) uygulamasını açın → **Namaz Vakti** → Slider ile açın.

## ⚙️ Ayarlar

**İl değiştirmek için:**
1. GNOME Extensions uygulamasını açın
2. Namaz Vakti satırındaki ⚙️ ikonuna tıklayın
3. Açılan pencereden il seçin
4. Vakitler otomatik güncellenir

## 🏗️ Proje Yapısı

```
namazvakti@suleyman.hocam/
├── metadata.json          # Eklenti kimliği ve GNOME sürüm uyumu
├── extension.js           # Ana eklenti kodu (geri sayım + menü + toggle)
├── prefs.js               # Ayarlar penceresi (81 il seçimi)
├── stylesheet.css          # Panel ve menü stili
├── schemas/
│   └── ...gschema.xml     # GSettings şeması (kalıcı il hatırlama)
├── build.sh               # ZIP paketleme scripti
├── Makefile               # make install / make zip / make uninstall
├── LICENSE                # GPL-3.0
└── README.md              # Bu dosya
```

## 🔧 Teknik Detaylar

### Veri Kaynağı
- **API:** [Aladhan API](https://aladhan.com/prayer-times-api) (`method=13` → Diyanet İşleri Başkanlığı)
- **HTTP:** Soup3 asenkron çağrı (UI thread bloklanmaz)
- **Cache:** Günde sadece 1 API çağrısı, gece yarısı otomatik yenileme

### Zaman Hesaplama Algoritması

Tüm hesaplamalar **dakika modeline** dayanır:

```
T_güncel = (Saat × 60) + Dakika
T_hedef  = (VakitSaat × 60) + VakitDakika
ΔT = T_hedef - T_güncel

Tüm vakitler geçtiyse (yatsı sonrası):
  ΔT = (1440 - T_güncel) + T_imsak_ertesi
```

### Bellek Yönetimi
- `disable()` tüm timer, sinyal ve referansları temizler
- Bellek sızıntısı riski sıfır
- OFF durumunda CPU kullanımı sıfır

### Desteklenen GNOME Sürümleri
- GNOME Shell 45, 46, 47, 48
- ESM (ECMAScript Modules) formatı

## 🐧 Pardus Uyumluluğu

Bu eklenti Pardus (Debian tabanlı) sistemlerde test edilmiştir. Pardus Yazılım Merkezi'ne önermek için:

1. [Pardus Uygulama Öner](https://apps.pardus.org.tr/suggest) sayfasına gidin
2. **Uygulama Adı:** Namaz Vakti GNOME Extension
3. **Web Sitesi:** Bu GitHub reposunun URL'si

## 📋 Gereksinimler

- GNOME Shell 45 veya üzeri
- `libsoup3` (genellikle GNOME ile birlikte gelir)
- İnternet bağlantısı (günde 1 kez API çağrısı için)

## 🤝 Katkıda Bulunma

1. Bu repoyu fork edin
2. Yeni bir branch oluşturun (`git checkout -b ozellik/yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -m 'Yeni özellik ekle'`)
4. Branch'inizi push edin (`git push origin ozellik/yeni-ozellik`)
5. Pull Request açın

## 📄 Lisans

Bu proje [GNU General Public License v3.0](LICENSE) ile lisanslanmıştır.

## 👤 Geliştirici

**suleyman.hocam**

---

<p align="center">
  <i>☪ Hayırlı namazlar!</i>
</p>
