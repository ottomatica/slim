#!/bin/bash
WORKDIR=~/.slim
OUTPUT_PATH=$1
ISO=$2

echo $OUTPUT_PATH $ISO

# Prepare and reset build directories
mkdir -p $WORKDIR
cd $WORKDIR

mkdir -p alpine-iso/ baker-mount


# Some directories and files are not writeable, making harder to copy over/delete on multiple runs. Add write permission first.
chmod -R +w baker-mount
rm -rf baker-mount/*

# copy base alpine iso
7z x $ISO -obaker-mount

# make items writable
chmod +w baker-mount/boot/syslinux/isolinux.bin
chmod +w baker-mount/boot/initramfs-virt
chmod +w baker-mount/boot/vmlinuz-virt

# update
cp file.img.gz baker-mount/boot/initramfs-virt

# Needs `brew install cdrtools`
mkisofs -b boot/syslinux/isolinux.bin -c boot/syslinux/boot.cat -no-emul-boot -boot-load-size 4 -boot-info-table   -V slim -o $OUTPUT_PATH -J -R baker-mount/

echo
echo "Created microkernel."
OUTPUT_DIR=$(dirname $OUTPUT_PATH)
cd $OUTPUT_DIR
ls -lh $OUTPUT_PATH
