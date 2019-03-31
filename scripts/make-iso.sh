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

# Mount base alpine iso
# Some duplicate code here; probably needs cleanup at some point
if [ "$(uname)" == "Linux" ]; then
    # unfortunately the udisksctl commands return 'sentences', so we have to cut out the rest
    # example: Mapped file /home/gjabell/.slim/registery/alpine3.8-runc-ansible/base.iso as /dev/loop0.
    DISK=$(udisksctl loop-setup -r -f $ISO | grep -Po '/dev/loop\d+')
    echo "base image mounted on $DISK"
    # /dev/loopXp1 is the partition with the base system
    PART=$DISK"p1"
    # mounting returns the path used, typically /run/media/[username]/...
    # example: Mounted /dev/loop0p1 at /run/media/gjabell/alpine-virt 3.8.0 x86_64.
    # this regex attempts to cover any case, but might need some tweaking
    MOUNT="$(udisksctl mount -b $PART | grep -Po "(?<=$PART at )/.+(?=\\.)")"
    cp -a "$MOUNT"/. baker-mount
    udisksctl unmount -b $PART
    udisksctl loop-delete -b $DISK
else
    DISK=$(hdiutil attach -nomount $ISO | head -n 1 | cut -f 1)
    echo "base image mounted on $DISK"
    FS_MOUNTOPTIONS="uid=1000,gid=1000" mount -t cd9660 $DISK alpine-iso
    cp -a alpine-iso/. baker-mount
    umount alpine-iso
fi

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
