#!/usr/bin/env bash
# PokelearnOS ISO Build Script
# Builds a bootable Ubuntu-based kiosk ISO for Dell Inspiron 7306
# Requires: debootstrap, xorriso, squashfs-tools, syslinux-utils
# Must be run with root privileges in a Linux environment with ~10GB free space
# NOT run inside Replit - run locally, in Docker, or in a VM/GitHub Actions runner
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
WORK_DIR="${WORK_DIR:-/tmp/pokelearnos-build}"
DIST_DIR="$ROOT_DIR/dist"
ISO_NAME="pokelearnos.iso"
UBUNTU_MIRROR="http://archive.ubuntu.com/ubuntu"
UBUNTU_RELEASE="noble"  # Ubuntu 24.04 LTS

# Privilege check
if [ "$EUID" -ne 0 ]; then
  echo "ERROR: This script must be run as root (use sudo)."
  echo "Example: sudo bash iso/build-iso.sh"
  exit 1
fi

# Dependency check
for tool in debootstrap xorriso mksquashfs; do
  if ! command -v "$tool" &>/dev/null; then
    echo "ERROR: Required tool '$tool' not found."
    echo "Install with: sudo apt-get install debootstrap xorriso squashfs-tools"
    exit 1
  fi
done

echo "=== PokelearnOS ISO Build ==="
echo "Work directory: $WORK_DIR"
echo "Output: $DIST_DIR/$ISO_NAME"

CHROOT="$WORK_DIR/chroot"
ISO_ROOT="$WORK_DIR/iso"

mkdir -p "$CHROOT" "$ISO_ROOT/live" "$DIST_DIR"

# Step 1: Bootstrap minimal Ubuntu
echo "[1/7] Bootstrapping Ubuntu $UBUNTU_RELEASE..."
debootstrap --arch=amd64 "$UBUNTU_RELEASE" "$CHROOT" "$UBUNTU_MIRROR"

# Step 2: Customize chroot
echo "[2/7] Customizing chroot..."
bash "$SCRIPT_DIR/chroot-customize.sh" "$CHROOT"

# Step 3: Copy app assets
echo "[3/7] Copying PokelearnOS assets..."
bash "$SCRIPT_DIR/copy-assets.sh" "$CHROOT"

# Step 4: Create squashfs
echo "[4/7] Creating squashfs filesystem..."
mksquashfs "$CHROOT" "$ISO_ROOT/live/filesystem.squashfs" \
  -e boot -noappend -comp xz -b 1M

# Step 5: Copy kernel and initrd
echo "[5/7] Copying kernel and initrd..."
cp "$CHROOT/boot/vmlinuz-"* "$ISO_ROOT/live/vmlinuz"
cp "$CHROOT/boot/initrd.img-"* "$ISO_ROOT/live/initrd"

# Step 6: Create GRUB config
echo "[6/7] Creating GRUB boot config..."
mkdir -p "$ISO_ROOT/boot/grub"
cat > "$ISO_ROOT/boot/grub/grub.cfg" << 'GRUBCFG'
set timeout=3
set default=0

menuentry "PokelearnOS" {
    linux /live/vmlinuz boot=live quiet splash -- console=tty1
    initrd /live/initrd
}
GRUBCFG

# Step 7: Build ISO
echo "[7/7] Building ISO with xorriso..."
xorriso -as mkisofs \
  -iso-level 3 \
  -full-iso9660-filenames \
  -volid "POKELEARNOS" \
  -eltorito-boot boot/grub/i386-pc/eltorito.img \
  -no-emul-boot \
  -boot-load-size 4 \
  -boot-info-table \
  --eltorito-catalog boot/grub/boot.cat \
  --grub2-boot-info \
  --grub2-mbr "$CHROOT/usr/lib/grub/i386-pc/boot_hybrid.img" \
  -output "$DIST_DIR/$ISO_NAME" \
  "$ISO_ROOT"

# Generate checksum
echo "[done] Generating checksum..."
sha256sum "$DIST_DIR/$ISO_NAME" >> "$DIST_DIR/checksums.txt"
echo ""
echo "=== Build complete ==="
echo "ISO: $DIST_DIR/$ISO_NAME"
echo "Checksum written to: $DIST_DIR/checksums.txt"
echo ""
echo "To flash to USB: sudo dd if=$DIST_DIR/$ISO_NAME of=/dev/sdX bs=4M status=progress"
