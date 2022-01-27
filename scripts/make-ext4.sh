#!/bin/bash
echo "Creating disk sized $1M"
dd if=/dev/zero of=rootfs.ext4 bs=1M count=$1
mkfs.ext4 rootfs.ext4
mkdir -p /tmp/rootfs
mount -t ext4 rootfs.ext4 /tmp/rootfs

# Copy extracted rootfs into mounted image
echo "Copying rootfs"
#cp -a /slim-vm/. /tmp/rootfs
tar -xf /slim-vm/rootfs.tar -C /tmp/rootfs

# Mount rootfs on boot.
echo "LABEL=slim-rootfs	/	 ext4	discard,errors=remount-ro	0 1" >> /tmp/rootfs/etc/fstab

# Docker overrides /etc/hosts and /etc/hostname and will export blank versions.
# Patch /etc/hosts and /etc/hostname
cat << 'EOF' > /tmp/rootfs/etc/hosts
127.0.0.1	localhost
127.0.1.1   slim
::1	localhost ip6-localhost ip6-loopback
fe00::0	ip6-localnet
ff00::0	ip6-mcastprefix
ff02::1	ip6-allnodes
ff02::2	ip6-allrouters
EOF

echo "slim" > /tmp/rootfs/etc/hostname

echo "Extracting uncompressed kernel"
mv /tmp/rootfs/vmlinuz /out/tmp.gz
gzip -d /out/tmp.gz
mv /out/tmp /out/vmlinuz

echo "Extracting initrd"
mv /tmp/rootfs/initrd /out/initrd

# CLeanup
umount /tmp/rootfs
fsck -f rootfs.ext4

# Finalize
tune2fs -O ^read-only -L "slim-rootfs" rootfs.ext4

# Store back on host
mv rootfs.ext4 /out/rootfs

echo "Saved rootfs raw image."