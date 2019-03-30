#!/bin/bash
WORKDIR=~/.slim
OUTPUT_PATH=$1

# Prepare and reset build directories
mkdir -p $WORKDIR
cd $WORKDIR

mkdir -p alpine-iso/ baker-mount


# Some directories and files are not writeable, making harder to copy over/delete on multiple runs. Add write permission first.
chmod -R +w baker-mount
rm -rf baker-mount

# Mount base alpine iso
ISO=~/Downloads/alpine-virt-3.8.0-x86_64.iso
DISK=$(hdiutil attach -nomount $ISO | head -n 1 | cut -f 1)
echo "base image mounted on $DISK"

FS_MOUNTOPTIONS="uid=1000,gid=1000" mount -t cd9660 $DISK alpine-iso
cp -a alpine-iso/. baker-mount
umount alpine-iso

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