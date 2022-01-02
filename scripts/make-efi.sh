#!/bin/bash
echo "Creating disk sized $1M"
dd if=/dev/zero of=rootfs.ext4 bs=1M count=$1

# to create the partitions programatically (rather than manually)
# we're going to simulate the manual input to fdisk
# The sed script strips off all the comments so that we can 
# document what we're doing in-line with the actual commands
# Note that a blank line (commented as "defualt" will send a empty
# line terminated with a newline to take the fdisk default.
sed -e 's/\s*\([\+0-9a-zA-Z]*\).*/\1/' << EOF | fdisk rootfs.ext4
  o # clear the in memory partition table
  n # new partition
  p # primary partition
  1 # partition number 1
    # default - start at beginning of disk 
  +100M # 100 MB boot parttion
  t # Change partition type
  ef # EFI (FAT-12/16/32)
  n # new partition
  p # primary partition
  2 # partion number 2
    # default, start immediately after preceding partition
    # default, extend partition to end of disk
  a # make a partition bootable
  1 # bootable partition is partition 1 -- /dev/sda1
  p # print the in-memory partition table
  w # write the partition table
  q # and we're done
EOF

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

# Format ESI partition (ESP) and install bootloader (syslinux)
mkdosfs ${LOOPDEV}p1
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

cat >> $ESP/EFI/BOOT/grub.cfg <<EOF
set timeout=0
set gfxpayload=text
menuentry 'Slim' {
	linuxefi /EFI/BOOT/kernel root=/dev/sda2 console=tty0 console=ttyS0,115200n8 text
  initrdefi /EFI/BOOT/initrd
}
EOF

GRUB_MODULES="part_gpt fat ext2 iso9660 gzio linux acpi normal cpio crypto disk boot crc64 \
search_fs_uuid tftp xzio xfs video"
# chroot /tmp/rootfs /bin/bash
#apt-get update
#apt-get -y install grub-efi
#grub-install --target=x86_64-efi --efi-directory=$ESP/EFI/BOOT --boot-directory=$ESP/EFI/BOOT --bootloader-id=grub ${ESP} 
grub-mkimage -O x86_64-efi -o BOOTX64.EFI -p /EFI/BOOT ${GRUB_MODULES} linuxefi;
cp BOOTX64.EFI $ESP/EFI/BOOT/BOOTX64.EFI

# Syslinux needs kernel and initrd on same partition.
cp /slim-vm/boot/vmlinuz $ESP/EFI/BOOT/vmlinuz
cp /slim-vm/boot/initrd $ESP/EFI/BOOT/initrd

# Prepare rootfs partition
mkfs.ext4 ${LOOPDEV}p2
mkdir -p /tmp/rootfs 
mount -t ext4 ${LOOPDEV}p2 /tmp/rootfs
mkdir -p /tmp/rootfs/boot/grub

# Copy extracted rootfs into mounted image
echo "Copying rootfs"
cp -a /slim-vm/. /tmp/rootfs
echo "LABEL=slim-rootfs	/	 ext4	discard,errors=remount-ro	0 1" >> /tmp/rootfs/etc/fstab

# Label
tune2fs -O ^read-only -L "slim-rootfs" ${LOOPDEV}p2

# Grub stuff
# cat > /tmp/rootfs/boot/grub/device.map << EOF
# (hd0)   ${LOOPDEV}
# (hd0,msdos1) ${LOOPDEV}p1
# EOF


# grub-install   --no-floppy \
#               --grub-mkdevicemap=/tmp/rootfs/boot/grub/device.map \
#               --modules="part_msdos ext2 configfile normal search_fs_uuid" \
#               --target=x86_64-efi \
#               --efi-directory=${ESP}/EFI/BOOT \
#               --root-directory=/tmp/rootfs \
#               --debug \
#               ${LOOPDEV}

# Cleanup
umount ${LOOPDEV}p1
umount ${LOOPDEV}p2
losetup -d ${LOOPDEV}

fsck -f rootfs.ext4


# Store back on host
mv rootfs.ext4 /out/rootfs
echo "Done"