#!/bin/bash

SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"

# exit on error
set -e
WORKDIR=~/.slim
OUTPUT_PATH=$1
NAME=$2

echo $OUTPUT_PATH

# Prepare and reset build directories
mkdir -p $WORKDIR
cd $WORKDIR

mkdir -p $NAME-iso/{boot,isolinux}

# copy our custom initramfs, the kernel extracted earlier, and our isolinux files
cp initrd.img.gz $NAME-iso/boot/initrd
cp $WORKDIR/vmlinuz $NAME-iso/boot/vmlinuz
cp $SCRIPTPATH/syslinux/* $NAME-iso/isolinux/

# Needs `brew install cdrtools`
# See https://wiki.syslinux.org/wiki/index.php?title=ISOLINUX#How_Can_I_Make_a_Bootable_CD_With_ISOLINUX.3F
mkisofs -o $OUTPUT_PATH \
        -b isolinux/isolinux.bin \
        -c isolinux/boot.cat \
        -no-emul-boot \
        -boot-load-size 4 \
        -boot-info-table \
        -V slim -J -R \
        $NAME-iso/

echo
echo "Created microkernel."
OUTPUT_DIR=$(dirname $OUTPUT_PATH)
cd $OUTPUT_DIR
ls -lh $OUTPUT_PATH
