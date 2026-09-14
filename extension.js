/**
 * ============================================================================
 *  Namaz Vakti — GNOME Shell Extension (extension.js)
 * ============================================================================
 *
 *  Sağ üst panele yerleşen, sıradaki namaz vaktine kalan süreyi geri sayım
 *  olarak gösteren GNOME Shell eklentisi.
 *
 *  ── Özellikler ──
 *  • Tıklayınca açılır menü: Tüm vakitler + şehir seçimi + ON/OFF toggle
 *  • 81 il desteği (doğrudan menüden seçim)
 *  • ON: Geri sayım aktif  |  OFF: Sadece "☪" gösterir, timer durur
 *  • GNOME 45+ ESM formatı, Soup3 async API, günde 1 çağrı
 *
 *  @author  suleyman.hocam
 *  @license GPL-3.0
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
//  ESM İmportlar
// ─────────────────────────────────────────────────────────────────────────────
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup?version=3.0';
import Gio from 'gi://Gio';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';


// ─────────────────────────────────────────────────────────────────────────────
//  Sabitler
// ─────────────────────────────────────────────────────────────────────────────

/** Vakitler dizisi — kronolojik sırada */
const PRAYER_TIMES = [
    { apiKey: 'Imsak',   label: 'İmsak'  },
    { apiKey: 'Sunrise', label: 'Güneş'  },
    { apiKey: 'Dhuhr',   label: 'Öğle'   },
    { apiKey: 'Asr',     label: 'İkindi' },
    { apiKey: 'Maghrib', label: 'Akşam'  },
    { apiKey: 'Isha',    label: 'Yatsı'  },
];

/** Güncelleme aralığı (saniye) — dakika bazlı gösterim için 30sn yeterli */
const UPDATE_INTERVAL_SECONDS = 30;

/** API hata retry süresi (saniye) */
const RETRY_INTERVAL_SECONDS = 300;

/**
 * Türkiye'nin 81 İli (Diyanet Uyumlu)
 * { name: Türkçe gösterim, apiName: URL slug, diyanetId: Diyanet ilçe ID }
 */
const CITIES_TR = [
    { name: "Adana", apiName: "adana", diyanetId: "9146" },
    { name: "Adıyaman", apiName: "adiyaman", diyanetId: "9158" },
    { name: "Afyonkarahisar", apiName: "afyonkarahisar", diyanetId: "9167" },
    { name: "Ağrı", apiName: "agri", diyanetId: "9185" },
    { name: "Aksaray", apiName: "aksaray", diyanetId: "9193" },
    { name: "Amasya", apiName: "amasya", diyanetId: "9198" },
    { name: "Ankara", apiName: "ankara", diyanetId: "9206" },
    { name: "Antalya", apiName: "antalya", diyanetId: "9225" },
    { name: "Ardahan", apiName: "ardahan", diyanetId: "9238" },
    { name: "Artvin", apiName: "artvin", diyanetId: "9246" },
    { name: "Aydın", apiName: "aydin", diyanetId: "9252" },
    { name: "Balıkesir", apiName: "balikesir", diyanetId: "9270" },
    { name: "Bartın", apiName: "bartin", diyanetId: "9285" },
    { name: "Batman", apiName: "batman", diyanetId: "9288" },
    { name: "Bayburt", apiName: "bayburt", diyanetId: "9295" },
    { name: "Bilecik", apiName: "bilecik", diyanetId: "9297" },
    { name: "Bingöl", apiName: "bingol", diyanetId: "9303" },
    { name: "Bitlis", apiName: "bitlis", diyanetId: "9311" },
    { name: "Bolu", apiName: "bolu", diyanetId: "9315" },
    { name: "Burdur", apiName: "burdur", diyanetId: "9327" },
    { name: "Bursa", apiName: "bursa", diyanetId: "9335" },
    { name: "Çanakkale", apiName: "canakkale", diyanetId: "9352" },
    { name: "Çankırı", apiName: "cankiri", diyanetId: "9359" },
    { name: "Çorum", apiName: "corum", diyanetId: "9370" },
    { name: "Denizli", apiName: "denizli", diyanetId: "9392" },
    { name: "Diyarbakır", apiName: "diyarbakir", diyanetId: "9402" },
    { name: "Düzce", apiName: "duzce", diyanetId: "9414" },
    { name: "Edirne", apiName: "edirne", diyanetId: "9419" },
    { name: "Elazığ", apiName: "elazig", diyanetId: "9432" },
    { name: "Erzincan", apiName: "erzincan", diyanetId: "9440" },
    { name: "Erzurum", apiName: "erzurum", diyanetId: "9451" },
    { name: "Eskişehir", apiName: "eskisehir", diyanetId: "9470" },
    { name: "Gaziantep", apiName: "gaziantep", diyanetId: "9479" },
    { name: "Giresun", apiName: "giresun", diyanetId: "9494" },
    { name: "Gümüşhane", apiName: "gumushane", diyanetId: "9501" },
    { name: "Hakkari", apiName: "hakkari", diyanetId: "9507" },
    { name: "Hatay", apiName: "hatay", diyanetId: "20089" },
    { name: "Iğdır", apiName: "igdir", diyanetId: "9522" },
    { name: "Isparta", apiName: "isparta", diyanetId: "9528" },
    { name: "İstanbul", apiName: "istanbul", diyanetId: "9541" },
    { name: "İzmir", apiName: "izmir", diyanetId: "9560" },
    { name: "Kahramanmaraş", apiName: "kahramanmaras", diyanetId: "9577" },
    { name: "Karabük", apiName: "karabuk", diyanetId: "9581" },
    { name: "Karaman", apiName: "karaman", diyanetId: "9587" },
    { name: "Kars", apiName: "kars", diyanetId: "9594" },
    { name: "Kastamonu", apiName: "kastamonu", diyanetId: "9609" },
    { name: "Kayseri", apiName: "kayseri", diyanetId: "9620" },
    { name: "Kilis", apiName: "kilis", diyanetId: "9629" },
    { name: "Kırıkkale", apiName: "kirikkale", diyanetId: "9635" },
    { name: "Kırklareli", apiName: "kirklareli", diyanetId: "9638" },
    { name: "Kırşehir", apiName: "kirsehir", diyanetId: "9646" },
    { name: "Kocaeli", apiName: "kocaeli", diyanetId: "9654" },
    { name: "Konya", apiName: "konya", diyanetId: "9676" },
    { name: "Kütahya", apiName: "kutahya", diyanetId: "9689" },
    { name: "Malatya", apiName: "malatya", diyanetId: "9703" },
    { name: "Manisa", apiName: "manisa", diyanetId: "9716" },
    { name: "Mardin", apiName: "mardin", diyanetId: "9726" },
    { name: "Mersin", apiName: "mersin", diyanetId: "9737" },
    { name: "Muğla", apiName: "mugla", diyanetId: "9747" },
    { name: "Muş", apiName: "mus", diyanetId: "9755" },
    { name: "Nevşehir", apiName: "nevsehir", diyanetId: "9760" },
    { name: "Niğde", apiName: "nigde", diyanetId: "9766" },
    { name: "Ordu", apiName: "ordu", diyanetId: "9782" },
    { name: "Osmaniye", apiName: "osmaniye", diyanetId: "9788" },
    { name: "Rize", apiName: "rize", diyanetId: "9799" },
    { name: "Sakarya", apiName: "sakarya", diyanetId: "9807" },
    { name: "Samsun", apiName: "samsun", diyanetId: "9819" },
    { name: "Şanlıurfa", apiName: "sanliurfa", diyanetId: "9831" },
    { name: "Siirt", apiName: "siirt", diyanetId: "9839" },
    { name: "Sinop", apiName: "sinop", diyanetId: "9847" },
    { name: "Şırnak", apiName: "sirnak", diyanetId: "9854" },
    { name: "Sivas", apiName: "sivas", diyanetId: "9868" },
    { name: "Tekirdağ", apiName: "tekirdag", diyanetId: "9879" },
    { name: "Tokat", apiName: "tokat", diyanetId: "9887" },
    { name: "Trabzon", apiName: "trabzon", diyanetId: "9905" },
    { name: "Tunceli", apiName: "tunceli", diyanetId: "9914" },
    { name: "Uşak", apiName: "usak", diyanetId: "9919" },
    { name: "Van", apiName: "van", diyanetId: "9930" },
    { name: "Yalova", apiName: "yalova", diyanetId: "9935" },
    { name: "Yozgat", apiName: "yozgat", diyanetId: "9949" },
    { name: "Zonguldak", apiName: "zonguldak", diyanetId: "9955" }
];


// ─────────────────────────────────────────────────────────────────────────────
//  NamazVaktiIndicator — Panel Butonu Sınıfı
// ─────────────────────────────────────────────────────────────────────────────

const NamazVaktiIndicator = GObject.registerClass(
class NamazVaktiIndicator extends PanelMenu.Button {

    _init() {
        super._init(0.5, 'NamazVakti', false);

        // Panel etiketi
        this._label = new St.Label({
            text: '☪ Yükleniyor...',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'namaz-vakti-label namaz-vakti-loading',
        });
        this.add_child(this._label);
    }

    /**
     * Panel metnini günceller.
     */
    updateLabel(text, isLoading = false) {
        if (this._label) {
            this._label.set_text(text);
            if (isLoading) {
                this._label.add_style_class_name('namaz-vakti-loading');
            } else {
                this._label.remove_style_class_name('namaz-vakti-loading');
            }
        }
    }

    /**
     * Açılır Menüyü Oluşturur
     * ────────────────────────
     * Menü yapısı:
     *   ┌─────────────────────────────┐
     *   │  ☪ İstanbul            ▸    │  ← Tıkla → 81 il açılır
     *   │─────────────────────────────│
     *   │  İmsak           04:58      │
     *   │  Sabah            05:08     │  ← Sıradaki vurgulu
     *   │  ...                        │
     *   │─────────────────────────────│
     *   │  Geri Sayım         [ON]    │  ← Toggle
     *   └─────────────────────────────┘
     */
    buildMenu(timings, currentCity, isActive, onToggle, onCityChange) {
        this.menu.removeAll();

        // ── Başlık + İl Seçici (tek satır) ──
        // "☪ İstanbul" yazısına tıklayınca 81 il açılır
        const cityHeader = new PopupMenu.PopupSubMenuMenuItem(
            `☪  ${currentCity || 'İstanbul'}`
        );
        cityHeader.label.set_style('font-weight: bold; font-size: 14px;');

        // 81 ili alt menüye ekle
        for (const city of CITIES_TR) {
            const cityItem = new PopupMenu.PopupMenuItem(city.name);

            // Mevcut il ise ✓ işareti koy
            if (city.name === currentCity) {
                cityItem.setOrnament(PopupMenu.Ornament.CHECK);
                cityItem.label.set_style('font-weight: bold;');
            }

            // Tıklanınca il değiştir
            cityItem.connect('activate', () => {
                if (onCityChange) {
                    onCityChange(city.apiName, city.name);
                }
            });

            cityHeader.menu.addMenuItem(cityItem);
        }

        this.menu.addMenuItem(cityHeader);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // ── Vakit Satırları ──
        this._prayerItems = [];
        if (timings) {
            for (const prayer of PRAYER_TIMES) {
                const timeStr = timings[prayer.apiKey] || '--:--';
                const cleanTime = timeStr.trim().split(' ')[0];

                const item = new PopupMenu.PopupMenuItem(
                    `  ${prayer.label}`, { reactive: false }
                );

                // Sağ tarafa saati ekle
                const timeLabel = new St.Label({
                    text: `  ${cleanTime}`,
                    y_align: Clutter.ActorAlign.CENTER,
                    x_expand: true,
                    x_align: Clutter.ActorAlign.END,
                });
                timeLabel.set_style('font-family: monospace; color: #aaaaaa;');
                item.add_child(timeLabel);

                this.menu.addMenuItem(item);
                this._prayerItems.push({
                    item: item,
                    timeLabel: timeLabel,
                    apiKey: prayer.apiKey,
                });
            }
        } else {
            const loadingItem = new PopupMenu.PopupMenuItem(
                '  Veri yükleniyor...', { reactive: false }
            );
            this.menu.addMenuItem(loadingItem);
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // ── ON/OFF Toggle ──
        this._toggleItem = new PopupMenu.PopupSwitchMenuItem(
            'Geri Sayım', isActive
        );
        this._toggleItem.connect('toggled', (_item, state) => {
            if (onToggle) onToggle(state);
        });
        this.menu.addMenuItem(this._toggleItem);
    }

    /**
     * Sıradaki vaktin menü satırını vurgular.
     */
    highlightNextPrayer(nextApiKey) {
        if (!this._prayerItems) return;
        for (const p of this._prayerItems) {
            if (p.apiKey === nextApiKey) {
                p.item.label.set_style('font-weight: bold; color: #4fc3f7;');
                p.timeLabel.set_style(
                    'font-family: monospace; font-weight: bold; color: #4fc3f7;'
                );
            } else {
                p.item.label.set_style('');
                p.timeLabel.set_style('font-family: monospace; color: #aaaaaa;');
            }
        }
    }
});


// ─────────────────────────────────────────────────────────────────────────────
//  NamazVaktiExtension — Ana Eklenti Sınıfı
// ─────────────────────────────────────────────────────────────────────────────

export default class NamazVaktiExtension extends Extension {

    enable() {
        this._settings = this.getSettings();

        this._indicator = new NamazVaktiIndicator();
        Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'right');

        this._session = new Soup.Session({ timeout: 15 });

        this._cachedTimings = null;
        this._cachedDate = null;
        this._updateTimerId = null;
        this._retryTimerId = null;
        this._isActive = true;
        this._nextApiKey = null;

        // Mevcut il adını (Türkçe) bul
        this._currentCityDisplay = this._getCityDisplayName();

        // GSettings il değişikliği dinleyicisi
        this._settingsChangedId = this._settings.connect('changed::city', () => {
            this._cachedTimings = null;
            this._cachedDate = null;
            this._currentCityDisplay = this._getCityDisplayName();
            if (this._isActive) {
                this._fetchAndUpdate();
            }
        });

        // Başlangıç menüsü (veri yüklenmeden)
        this._rebuildMenu();

        // İlk veri çekme
        this._fetchAndUpdate();
    }

    disable() {
        if (this._updateTimerId !== null) {
            GLib.source_remove(this._updateTimerId);
            this._updateTimerId = null;
        }
        if (this._retryTimerId !== null) {
            GLib.source_remove(this._retryTimerId);
            this._retryTimerId = null;
        }
        if (this._settingsChangedId !== null) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        if (this._session) {
            this._session.abort();
            this._session = null;
        }
        this._cachedTimings = null;
        this._cachedDate = null;
        this._settings = null;
        this._isActive = true;
        this._nextApiKey = null;
        this._currentCityDisplay = null;
    }


    // ─────────────────────────────────────────────────────────────────────
    //  Menü & Toggle & Şehir Değişimi
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Menüyü yeniden oluşturur (vakit verisi + il + toggle durumu ile).
     */
    _rebuildMenu() {
        if (!this._indicator) return;

        this._indicator.buildMenu(
            this._cachedTimings,
            this._currentCityDisplay,
            this._isActive,
            // ON/OFF toggle callback
            (state) => this._onToggle(state),
            // İl değişimi callback
            (apiName, displayName) => this._onCityChange(apiName, displayName)
        );

        // Sıradaki vakti vurgula (eğer bilgi varsa)
        if (this._nextApiKey) {
            this._indicator.highlightNextPrayer(this._nextApiKey);
        }
    }

    /**
     * ON/OFF toggle değiştiğinde çağrılır.
     */
    _onToggle(state) {
        this._isActive = state;

        if (state) {
            console.log('[NamazVakti] Geri sayım AKTİF');
            this._fetchAndUpdate();
        } else {
            console.log('[NamazVakti] Geri sayım DURDURULDU');
            if (this._updateTimerId !== null) {
                GLib.source_remove(this._updateTimerId);
                this._updateTimerId = null;
            }
            if (this._retryTimerId !== null) {
                GLib.source_remove(this._retryTimerId);
                this._retryTimerId = null;
            }
            if (this._indicator) {
                this._indicator.updateLabel('☪', false);
            }
        }
    }

    /**
     * Kullanıcı menüden il seçtiğinde çağrılır.
     * GSettings'e yazar → sinyal tetiklenir → yeni veri çekilir.
     */
    _onCityChange(apiName, displayName) {
        if (!this._settings) return;

        console.log(`[NamazVakti] İl değiştirildi: ${displayName} (${apiName})`);

        // GSettings'e yaz — bu 'changed::city' sinyalini tetikler
        this._settings.set_string('city', apiName);

        // Menüyü yüklenme mesajıyla hemen güncelle
        this._currentCityDisplay = displayName;
        if (this._indicator && this._isActive) {
            this._indicator.updateLabel(`☪ ${displayName}: ...`, true);
        }
    }

    /**
     * API city adından Türkçe gösterim adını bulur.
     */
    _getCityDisplayName() {
        if (!this._settings) return 'İstanbul';
        const apiName = this._settings.get_string('city');
        const found = CITIES_TR.find(c => c.apiName === apiName);
        return found ? found.name : apiName;
    }


    // ─────────────────────────────────────────────────────────────────────
    //  API Veri Çekme
    // ─────────────────────────────────────────────────────────────────────

    _fetchAndUpdate() {
        if (!this._isActive) return;

        const today = this._getTodayString();
        if (this._cachedTimings && this._cachedDate === today) {
            this._updateCountdown();
            this._startUpdateLoop();
            return;
        }

        this._fetchTimingsFromAPI();
    }

    _fetchTimingsFromAPI() {
        if (!this._session || !this._settings || !this._isActive) return;

        let apiName = this._settings.get_string('city');
        
        // CITIES_TR'den Diyanet ID'yi bul
        let found = CITIES_TR.find(c => c.apiName.toLowerCase() === apiName.toLowerCase());
        if (!found) found = CITIES_TR.find(c => c.apiName === 'istanbul'); // fallback

        const diyanetId = found.diyanetId;
        const slug = found.apiName;

        const url = `https://namazvakitleri.diyanet.gov.tr/tr-TR/${diyanetId}/${slug}-icin-namaz-vakti`;

        if (this._indicator) {
            this._indicator.updateLabel(`☪ ${this._currentCityDisplay}: ...`, true);
        }

        const message = Soup.Message.new('GET', url);
        if (!message) {
            console.error('[NamazVakti] Geçersiz URL:', url);
            this._handleAPIError();
            return;
        }

        this._session.send_and_read_async(
            message, GLib.PRIORITY_DEFAULT, null,
            (session, result) => {
                try {
                    const bytes = session.send_and_read_finish(result);
                    if (message.get_status() !== Soup.Status.OK) {
                        this._handleAPIError();
                        return;
                    }

                    const decoder = new TextDecoder('utf-8');
                    const html = decoder.decode(bytes.get_data());

                    // Regex ile HTML içindeki var _vakitTime = "HH:MM" yakalanır
                    const extract = (key) => {
                        const regex = new RegExp(`var _${key}Time\\s*=\\s*"([^"]+)"`);
                        const match = html.match(regex);
                        return match ? match[1] : null;
                    };

                    const timings = {
                        Imsak: extract('imsak'),
                        Sunrise: extract('gunes'),
                        Dhuhr: extract('ogle'),
                        Asr: extract('ikindi'),
                        Maghrib: extract('aksam'),
                        Isha: extract('yatsi')
                    };

                    // Geçerlilik kontrolü
                    if (!timings.Imsak || !timings.Isha) {
                        console.error('[NamazVakti] Diyanet sayfasından veriler çekilemedi.');
                        this._handleAPIError();
                        return;
                    }

                    this._cachedTimings = timings;
                    this._cachedDate = this._getTodayString();

                    console.log(`[NamazVakti] Diyanet'ten vakitler çekildi (${slug})`);

                    // Menüyü yeni vakit verileriyle yeniden oluştur
                    this._rebuildMenu();

                    if (this._isActive) {
                        this._updateCountdown();
                        this._startUpdateLoop();
                    }
                } catch (error) {
                    console.error('[NamazVakti] Veri işleme hatası:', error.message);
                    this._handleAPIError();
                }
            }
        );
    }

    _handleAPIError() {
        if (this._indicator && this._isActive) {
            this._indicator.updateLabel('☪ Bağlantı bekleniyor...', true);
        }

        if (this._retryTimerId !== null) {
            GLib.source_remove(this._retryTimerId);
            this._retryTimerId = null;
        }

        this._retryTimerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, RETRY_INTERVAL_SECONDS,
            () => {
                this._retryTimerId = null;
                if (this._isActive) this._fetchTimingsFromAPI();
                return GLib.SOURCE_REMOVE;
            }
        );
    }


    // ─────────────────────────────────────────────────────────────────────
    //  Geri Sayım Hesaplama
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Matematiksel dakika modeli:
     *   T = (Saat × 60) + Dakika
     *   ΔT = T_hedef - T_güncel
     *   Tüm vakitler geçtiyse: ΔT = (1440 - T_güncel) + T_imsak
     */
    _updateCountdown() {
        if (!this._cachedTimings || !this._indicator || !this._isActive) return;

        const now = new Date();
        const currentMinutes = (now.getHours() * 60) + now.getMinutes();

        // Vakitleri dakikaya çevir
        const prayerMinutes = [];
        for (const prayer of PRAYER_TIMES) {
            const timeStr = this._cachedTimings[prayer.apiKey];
            if (!timeStr) continue;
            const minutes = this._timeStringToMinutes(timeStr);
            if (minutes !== null) {
                prayerMinutes.push({
                    label: prayer.label,
                    apiKey: prayer.apiKey,
                    minutes: minutes,
                });
            }
        }

        if (prayerMinutes.length === 0) {
            this._indicator.updateLabel('☪ Veri hatası', true);
            return;
        }

        // Sıradaki vakti bul
        let nextPrayer = null;
        let deltaMinutes = 0;

        for (const prayer of prayerMinutes) {
            if (prayer.minutes > currentMinutes) {
                nextPrayer = prayer;
                deltaMinutes = prayer.minutes - currentMinutes;
                break;
            }
        }

        // Tüm vakitler geçtiyse → ertesi İmsak
        if (nextPrayer === null) {
            nextPrayer = prayerMinutes[0];
            deltaMinutes = (1440 - currentMinutes) + nextPrayer.minutes;
            if (currentMinutes < nextPrayer.minutes) {
                deltaMinutes = nextPrayer.minutes - currentMinutes;
            }
        }

        // Saat:Dakika formatına çevir
        const hours = Math.floor(deltaMinutes / 60);
        const mins = deltaMinutes % 60;

        // Panel metnini oluştur
        let displayText;
        if (hours > 0) {
            displayText = `☪ ${nextPrayer.label}: ${hours}s ${mins}d`;
        } else {
            displayText = `☪ ${nextPrayer.label}: ${mins}d`;
        }

        this._indicator.updateLabel(displayText, false);

        // Menüde sıradaki vakti vurgula
        this._nextApiKey = nextPrayer.apiKey;
        this._indicator.highlightNextPrayer(nextPrayer.apiKey);

        // Gece yarısı geçtiyse yeni veri çek
        const today = this._getTodayString();
        if (this._cachedDate !== today) {
            this._cachedTimings = null;
            this._cachedDate = null;
            this._fetchTimingsFromAPI();
        }
    }


    // ─────────────────────────────────────────────────────────────────────
    //  Timer Yönetimi
    // ─────────────────────────────────────────────────────────────────────

    _startUpdateLoop() {
        if (!this._isActive) return;

        if (this._updateTimerId !== null) {
            GLib.source_remove(this._updateTimerId);
            this._updateTimerId = null;
        }

        this._updateTimerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT, UPDATE_INTERVAL_SECONDS,
            () => {
                if (!this._indicator || !this._isActive) {
                    this._updateTimerId = null;
                    return GLib.SOURCE_REMOVE;
                }
                this._updateCountdown();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }


    // ─────────────────────────────────────────────────────────────────────
    //  Yardımcı Metotlar
    // ─────────────────────────────────────────────────────────────────────

    /** "HH:MM" → dakika (T = H×60 + M) */
    _timeStringToMinutes(timeStr) {
        const cleaned = timeStr.trim().split(' ')[0];
        const parts = cleaned.split(':');
        if (parts.length !== 2) return null;

        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);

        if (isNaN(hours) || isNaN(minutes)) return null;
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

        return (hours * 60) + minutes;
    }

    /** Bugünün tarihini "YYYY-MM-DD" formatında döndürür */
    _getTodayString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
