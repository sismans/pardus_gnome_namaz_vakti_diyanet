#!/bin/bash
# ============================================================================
#  Namaz Vakti — ZIP Paketleme Scripti (build.sh)
# ============================================================================
#
#  Bu script şunları yapar:
#    1. GSettings şemasını derler (glib-compile-schemas)
#    2. Tüm dosyaları tek bir .zip dosyasına paketler
#    3. ZIP dosyası doğrudan kuruluma hazırdır:
#         gnome-extensions install namazvakti@suleyman.hocam.zip
#
#  Kullanım:
#    chmod +x build.sh
#    ./build.sh
#
# ============================================================================

set -e  # Hata durumunda scripti durdur

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

EXTENSION_UUID="namazvakti@suleyman.hocam"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ZIP_FILE="${SCRIPT_DIR}/${EXTENSION_UUID}.zip"

echo -e "${YELLOW}══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  🕌 Namaz Vakti Extension — Paketleme${NC}"
echo -e "${YELLOW}══════════════════════════════════════════${NC}"

# ── Adım 1: GSettings Şemasını Derle ──
echo -e "\n${GREEN}[1/3]${NC} GSettings şeması derleniyor..."
if command -v glib-compile-schemas &> /dev/null; then
    glib-compile-schemas "${SCRIPT_DIR}/schemas/"
    echo -e "  ✓ Şema başarıyla derlendi: schemas/gschemas.compiled"
else
    echo -e "  ${RED}✗ glib-compile-schemas bulunamadı!${NC}"
    echo -e "  Lütfen kurun: ${YELLOW}sudo apt install libglib2.0-dev-bin${NC}"
    exit 1
fi

# ── Adım 2: Eski ZIP Varsa Sil ──
if [ -f "${ZIP_FILE}" ]; then
    rm "${ZIP_FILE}"
    echo -e "  ✓ Eski ZIP dosyası silindi"
fi

# ── Adım 3: ZIP Paketi Oluştur ──
echo -e "\n${GREEN}[2/3]${NC} ZIP paketi oluşturuluyor..."
cd "${SCRIPT_DIR}"
zip -r "${ZIP_FILE}" \
    metadata.json \
    extension.js \
    prefs.js \
    stylesheet.css \
    schemas/org.gnome.shell.extensions.namazvakti.gschema.xml \
    schemas/gschemas.compiled

echo -e "  ✓ Paket oluşturuldu: ${ZIP_FILE}"

# ── Adım 4: Bilgi ──
echo -e "\n${GREEN}[3/3]${NC} Paket bilgileri:"
echo -e "  📦 Dosya: ${YELLOW}${ZIP_FILE}${NC}"
echo -e "  📏 Boyut: $(du -h "${ZIP_FILE}" | cut -f1)"

echo -e "\n${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ Paketleme tamamlandı!${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}Kurulum komutu:${NC}"
echo -e "  gnome-extensions install ${EXTENSION_UUID}.zip"
echo -e "\n${YELLOW}Ardından:${NC}"
echo -e "  • X11:    Alt+F2 → 'r' → Enter"
echo -e "  • Wayland: Oturumu kapatıp tekrar açın"
echo -e "  • Etkinleştirme: gnome-extensions enable ${EXTENSION_UUID}"
