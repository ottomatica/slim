#!/bin/bash
echo "Creating disk sized $1M"
dd if=/dev/zero of=rootfs.ext4 bs=1M count=$1
mkfs.ext4 rootfs.ext4
mkdir -p /tmp/rootfs
mount -t ext4 rootfs.ext4 /tmp/rootfs
# Copy extracted rootfs into mounted image
echo "Copying rootfs"
cp -a /slim-vm/. /tmp/rootfs
echo "LABEL=slim-rootfs	/	 ext4	discard,errors=remount-ro	0 1" >> /tmp/rootfs/etc/fstab
#chown -R root:root /tmp/rootfs
# Finalize
umount /tmp/rootfs
tune2fs -O ^read-only -L "slim-rootfs" rootfs.ext4
#fsck -f rootfs.ext4
# Store back on host
mv rootfs.ext4 /out/rootfs
echo "Done"