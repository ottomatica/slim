#!/bin/bash
echo "Creating disk sized $1M"
dd if=/dev/zero of=rootfs.ext4 bs=1M count=$1

# Create two partitions (ESP for boot and second for rootfs).
sgdisk --clear \
  --new 1::+100M --typecode=1:ef00 --change-name=1:'EFI System' \
  --new 2::-0 --typecode=2:8300 --change-name=2:'slim-rootfs' \
  --attributes 1:set:2 \
  rootfs.ext4
  # --new 1::+1M --typecode=1:ef02 --change-name=1:'BIOS boot partition' \

# Print partitions
gdisk -l rootfs.ext4

# Automatically mount partitions on loop devices.
# losetup --partscan --find --show rootfs.ext4

# Bug: Loop device partitions do not show inside container
# https://github.com/moby/moby/issues/27886

# Workaround (tonyfahrion)
LOOPDEV=$(losetup --find --show --partscan rootfs.ext4)

# drop the first line, as this is our LOOPDEV itself, but we only want the child partitions
PARTITIONS=$(lsblk --raw --output "MAJ:MIN" --noheadings ${LOOPDEV} | tail -n +2)

echo "FS ", $LOOPDEV, $PARTITIONS

COUNTER=1
for i in $PARTITIONS; do
    MAJ=$(echo $i | cut -d: -f1)
    MIN=$(echo $i | cut -d: -f2)
    if [ ! -e "${LOOPDEV}p${COUNTER}" ]; then 
        echo "Creating loop partition", ${LOOPDEV}p${COUNTER}
        mknod ${LOOPDEV}p${COUNTER} b $MAJ $MIN; 
    fi
    COUNTER=$((COUNTER + 1))
done 

lsblk

# Format ESI partition (ESP)
mkfs.fat ${LOOPDEV}p1
ESP=/tmp/esp
mkdir $ESP && mount ${LOOPDEV}p1 $ESP
mkdir -p $ESP/EFI/BOOT

# Copy syslinux efi files
#cp syslinux-6.03/efi64/efi/syslinux.efi $ESP/EFI/BOOT/bootx64.efi
#cp syslinux-6.03/efi64/com32/elflink/ldlinux/ldlinux.e64 $ESP/EFI/BOOT/ldlinux.e64

# Prepare bootloader configuration
#echo "DEFAULT linux" > $ESP/EFI/BOOT/syslinux.cfg
#echo "LABEL linux" >> $ESP/EFI/BOOT/syslinux.cfg
#echo "KERNEL vmlinuz" >> $ESP/EFI/BOOT/syslinux.cfg
#echo "INITRD initrd" >> $ESP/EFI/BOOT/syslinux.cfg
#echo "APPEND root=/dev/sda2 console=tty0 console=ttyS0,115200n8" >> $ESP/EFI/BOOT/syslinux.cfg

# GRUB 
cat >> $ESP/EFI/BOOT/grub.cfg <<EOF
set timeout=0
set gfxpayload=text
menuentry 'Slim' {
	linuxefi /EFI/BOOT/vmlinuz root=/dev/sda2 console=tty0 console=ttyS0,115200n8 earlyprintk=ttyS0,115200 rootdelay=300 text
  initrdefi /EFI/BOOT/initrd
}
EOF

GRUB_MODULES="part_gpt part_msdos efi_uga gptsync fat ext2 lvm iso9660 lsefi gzio linux linuxefi acpi normal cpio crypto disk boot crc64 \
search_fs_uuid tftp xzio lzopio xfs video scsi multiboot hfsplus udf"

grub-mkimage -d /usr/lib/grub/x86_64-efi -O x86_64-efi -o BOOTX64.EFI -p /EFI/BOOT ${GRUB_MODULES} linuxefi;
cp BOOTX64.EFI $ESP/EFI/BOOT/BOOTX64.EFI

# Prepare rootfs partition
mkfs.ext4 -F -L "slim-rootfs" ${LOOPDEV}p2
mkdir -p /tmp/rootfs 
mount -t ext4 ${LOOPDEV}p2 /tmp/rootfs
mkdir -p /tmp/rootfs/boot/grub

# Copy extracted rootfs into mounted image
echo "Copying rootfs"

#cp -a /slim-vm/. /tmp/rootfs
#rsync -a /slim-vm/ /tmp/rootfs
tar -xf /slim-vm/rootfs.tar -C /tmp/rootfs

echo "LABEL=slim-rootfs	/	 ext4	discard,errors=remount-ro	0 1" >> /tmp/rootfs/etc/fstab

# Syslinux/Grub needs kernel and initrd on same partition.
mv /tmp/rootfs/vmlinuz $ESP/EFI/BOOT/vmlinuz
mv /tmp/rootfs/initrd $ESP/EFI/BOOT/initrd

# Cleanup
umount ${LOOPDEV}p1
umount ${LOOPDEV}p2
losetup -d ${LOOPDEV}

# Sanity check disk
fsck -f rootfs.ext4

# Store back on host
mv rootfs.ext4 /out/rootfs
echo "Done"