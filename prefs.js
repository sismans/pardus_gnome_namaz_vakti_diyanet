/**
 * ============================================================================
 *  Namaz Vakti — Ayarlar Penceresi (prefs.js)
 * ============================================================================
 *
 *  GNOME Extensions uygulamasında "Ayarlar" (⚙️) ikonuna tıklandığında
 *  açılan pencere. Kullanıcının il seçimi yapmasını sağlar.
 *
 *  ── Teknik Detaylar ──
 *  • GNOME 45+ ESM formatı
 *  • ExtensionPreferences base class (eski buildPrefsWidget yerine)
 *  • Adw (libadwaita) ile modern GNOME tasarım dili
 *  • GSettings ile kalıcı depolama
 *
 *  ── Kullanıcı Akışı ──
 *  1. Kullanıcı GNOME Extensions → Namaz Vakti → ⚙️ tıklar
 *  2. Pencere açılır, mevcut il seçili olarak gösterilir
 *  3. Kullanıcı yeni il seçer → GSettings güncellenir
 *  4. extension.js GSettings değişikliğini algılar → yeni veri çeker
 *
 *  @author  suleyman.hocam
 *  @license GPL-3.0
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
//  ESM İmportlar
// ─────────────────────────────────────────────────────────────────────────────
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

// GNOME 45+ prefs base class
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


// ─────────────────────────────────────────────────────────────────────────────
//  Türkiye'nin 81 İli (Alfabetik Sıralı)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CITIES_TR
 * ─────────
 * Her eleman { name, apiName } yapısındadır:
 *   name    : Türkçe gösterim adı (UI'da görünür)
 *   apiName : Aladhan API'nin "city" parametresine gönderilen İngilizce ad
 *
 * NOT: Aladhan API şehir adlarını İngilizce kabul eder.
 * Özel karakter içermeyen İngilizce transliterasyonlar kullanılmıştır.
 */
const CITIES_TR = [
    { name: 'Adana',          apiName: 'Adana' },
    { name: 'Adıyaman',       apiName: 'Adiyaman' },
    { name: 'Afyonkarahisar', apiName: 'Afyonkarahisar' },
    { name: 'Ağrı',           apiName: 'Agri' },
    { name: 'Aksaray',        apiName: 'Aksaray' },
    { name: 'Amasya',         apiName: 'Amasya' },
    { name: 'Ankara',         apiName: 'Ankara' },
    { name: 'Antalya',        apiName: 'Antalya' },
    { name: 'Ardahan',        apiName: 'Ardahan' },
    { name: 'Artvin',         apiName: 'Artvin' },
    { name: 'Aydın',          apiName: 'Aydin' },
    { name: 'Balıkesir',      apiName: 'Balikesir' },
    { name: 'Bartın',         apiName: 'Bartin' },
    { name: 'Batman',         apiName: 'Batman' },
    { name: 'Bayburt',        apiName: 'Bayburt' },
    { name: 'Bilecik',        apiName: 'Bilecik' },
    { name: 'Bingöl',         apiName: 'Bingol' },
    { name: 'Bitlis',         apiName: 'Bitlis' },
    { name: 'Bolu',           apiName: 'Bolu' },
    { name: 'Burdur',         apiName: 'Burdur' },
    { name: 'Bursa',          apiName: 'Bursa' },
    { name: 'Çanakkale',      apiName: 'Canakkale' },
    { name: 'Çankırı',        apiName: 'Cankiri' },
    { name: 'Çorum',          apiName: 'Corum' },
    { name: 'Denizli',        apiName: 'Denizli' },
    { name: 'Diyarbakır',     apiName: 'Diyarbakir' },
    { name: 'Düzce',          apiName: 'Duzce' },
    { name: 'Edirne',         apiName: 'Edirne' },
    { name: 'Elazığ',         apiName: 'Elazig' },
    { name: 'Erzincan',       apiName: 'Erzincan' },
    { name: 'Erzurum',        apiName: 'Erzurum' },
    { name: 'Eskişehir',      apiName: 'Eskisehir' },
    { name: 'Gaziantep',      apiName: 'Gaziantep' },
    { name: 'Giresun',        apiName: 'Giresun' },
    { name: 'Gümüşhane',      apiName: 'Gumushane' },
    { name: 'Hakkari',        apiName: 'Hakkari' },
    { name: 'Hatay',          apiName: 'Hatay' },
    { name: 'Iğdır',          apiName: 'Igdir' },
    { name: 'Isparta',        apiName: 'Isparta' },
    { name: 'İstanbul',       apiName: 'Istanbul' },
    { name: 'İzmir',          apiName: 'Izmir' },
    { name: 'Kahramanmaraş',  apiName: 'Kahramanmaras' },
    { name: 'Karabük',        apiName: 'Karabuk' },
    { name: 'Karaman',        apiName: 'Karaman' },
    { name: 'Kars',           apiName: 'Kars' },
    { name: 'Kastamonu',      apiName: 'Kastamonu' },
    { name: 'Kayseri',        apiName: 'Kayseri' },
    { name: 'Kilis',          apiName: 'Kilis' },
    { name: 'Kırıkkale',      apiName: 'Kirikkale' },
    { name: 'Kırklareli',     apiName: 'Kirklareli' },
    { name: 'Kırşehir',       apiName: 'Kirsehir' },
    { name: 'Kocaeli',        apiName: 'Kocaeli' },
    { name: 'Konya',          apiName: 'Konya' },
    { name: 'Kütahya',        apiName: 'Kutahya' },
    { name: 'Malatya',        apiName: 'Malatya' },
    { name: 'Manisa',         apiName: 'Manisa' },
    { name: 'Mardin',         apiName: 'Mardin' },
    { name: 'Mersin',         apiName: 'Mersin' },
    { name: 'Muğla',          apiName: 'Mugla' },
    { name: 'Muş',            apiName: 'Mus' },
    { name: 'Nevşehir',       apiName: 'Nevsehir' },
    { name: 'Niğde',          apiName: 'Nigde' },
    { name: 'Ordu',           apiName: 'Ordu' },
    { name: 'Osmaniye',       apiName: 'Osmaniye' },
    { name: 'Rize',           apiName: 'Rize' },
    { name: 'Sakarya',        apiName: 'Sakarya' },
    { name: 'Samsun',         apiName: 'Samsun' },
    { name: 'Şanlıurfa',      apiName: 'Sanliurfa' },
    { name: 'Siirt',          apiName: 'Siirt' },
    { name: 'Sinop',          apiName: 'Sinop' },
    { name: 'Sivas',          apiName: 'Sivas' },
    { name: 'Şırnak',         apiName: 'Sirnak' },
    { name: 'Tekirdağ',       apiName: 'Tekirdag' },
    { name: 'Tokat',          apiName: 'Tokat' },
    { name: 'Trabzon',        apiName: 'Trabzon' },
    { name: 'Tunceli',        apiName: 'Tunceli' },
    { name: 'Uşak',           apiName: 'Usak' },
    { name: 'Van',            apiName: 'Van' },
    { name: 'Yalova',         apiName: 'Yalova' },
    { name: 'Yozgat',         apiName: 'Yozgat' },
    { name: 'Zonguldak',      apiName: 'Zonguldak' },
];


// ─────────────────────────────────────────────────────────────────────────────
//  NamazVaktiPreferences — Ayarlar Penceresi Sınıfı
// ─────────────────────────────────────────────────────────────────────────────

export default class NamazVaktiPreferences extends ExtensionPreferences {

    /**
     * fillPreferencesWindow()
     * ───────────────────────
     * GNOME 45+ standardı: Ayarlar penceresi açıldığında çağrılır.
     * Parametre olarak gelen Adw.PreferencesWindow'a sayfa ekleriz.
     *
     * @param {Adw.PreferencesWindow} window - GNOME'un sağladığı pencere
     */
    fillPreferencesWindow(window) {
        // GSettings referansı — Extension base class bunu sağlar
        const settings = this.getSettings();

        // ── Sayfa: Ana ayarlar sayfası ──
        const page = new Adw.PreferencesPage({
            title: 'Namaz Vakti Ayarları',
            icon_name: 'preferences-system-symbolic',
        });

        // ── Grup: Konum Ayarları ──
        const locationGroup = new Adw.PreferencesGroup({
            title: 'Konum Ayarları',
            description: 'Namaz vakitlerinin hesaplanacağı ili seçin.',
        });

        // ── ComboRow: İl Seçimi ──
        // Adw.ComboRow, libadwaita'nın modern dropdown widget'ı
        // Gtk.StringList ile doldurulur
        const cityRow = new Adw.ComboRow({
            title: 'İl',
            subtitle: 'Vakitler seçilen ile göre hesaplanır',
        });

        // StringList: ComboRow'un veri modeli
        const stringList = new Gtk.StringList();
        for (const city of CITIES_TR) {
            stringList.append(city.name);
        }
        cityRow.set_model(stringList);

        // ── Mevcut Seçimi Yükle ──
        // GSettings'den kaydedilmiş şehri oku ve ComboRow'da seçili yap
        const currentCity = settings.get_string('city');
        const currentIndex = CITIES_TR.findIndex(c => c.apiName === currentCity);
        if (currentIndex >= 0) {
            cityRow.set_selected(currentIndex);
        }

        // ── Seçim Değiştiğinde GSettings'e Yaz ──
        // "notify::selected" sinyali, kullanıcı yeni bir il seçtiğinde tetiklenir
        cityRow.connect('notify::selected', () => {
            const selectedIndex = cityRow.get_selected();
            if (selectedIndex >= 0 && selectedIndex < CITIES_TR.length) {
                const selectedCity = CITIES_TR[selectedIndex];
                settings.set_string('city', selectedCity.apiName);
                //
                // Bu noktada extension.js'deki 'changed::city' sinyali tetiklenir
                // ve eklenti otomatik olarak yeni il için veri çeker.
                //
                console.log(`[NamazVakti Prefs] İl değiştirildi: ${selectedCity.name} (${selectedCity.apiName})`);
            }
        });

        // ── Widget Hiyerarşisi: Grupla ve Sayfaya Ekle ──
        locationGroup.add(cityRow);
        page.add(locationGroup);

        // ── Bilgi Grubu: Kullanıcıya yardımcı bilgi ──
        const infoGroup = new Adw.PreferencesGroup({
            title: 'Hakkında',
            description: 'Diyanet İşleri Başkanlığı vakitleriyle uyumlu hesaplama metodu (method=13) kullanılmaktadır.',
        });

        // Bilgi satırı
        const infoRow = new Adw.ActionRow({
            title: 'Veri Kaynağı',
            subtitle: 'Aladhan API (api.aladhan.com) — Diyanet metodu',
        });
        infoGroup.add(infoRow);

        // Versiyon satırı
        const versionRow = new Adw.ActionRow({
            title: 'Sürüm',
            subtitle: 'v1.0',
        });
        infoGroup.add(versionRow);

        page.add(infoGroup);

        // ── Sayfayı Pencereye Ekle ──
        window.add(page);
    }
}
