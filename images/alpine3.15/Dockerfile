FROM alpine:3.15
RUN mkdir -p /lib/apk/db /run
RUN apk add --initdb openrc
RUN apk add linux-virt kmod kmod-openrc blkid
#RUN apk add mkinitfs blkid squashfs-tools

# busybox-initscripts busybox-suid
RUN apk add --update alpine-baselayout alpine-conf alpine-keys apk-tools busybox busybox-initscripts \
    ca-certificates dbus-libs kbd-bkeymaps \
    gnutls openssh openssh-client rng-tools dhcpcd network-extras wget util-linux
RUN [ ! -z "$PKGS" ] && apk add --no-cache $PKGS || echo "No optional pkgs provided."

# FYI
# https://hütter.ch/posts/pitaya-alpine/

# Create modloop
#RUN update-kernel -f virt /boot

# Rebuild initrd
#RUN echo 'features="ata base cdrom dhcp ext4 keymap kms mmc nvme raid scsi usb network virtio squashfs"' > /etc/mkinitfs/mkinitfs.conf
#RUN mkinitfs -b / 5.15.16-0-virt

USER root
# the public key that is authorized to connect to this instance.
ARG SSHPUBKEY
# optional packages
ARG PKGS

# Copy kernel for later use
RUN cp /boot/vmlinuz-virt /vmlinuz
# Nuke boot
RUN rm -rf /boot

# Deleted cached packages
#RUN rm -rf /var/cache/apk/*

# Our init
COPY files/init /init

RUN echo "Welcome to slim!" > /etc/motd
# RUN echo "tty0::respawn:/sbin/agetty -a root -L tty0 38400 vt100" >> /etc/inittab
# RUN echo "# Allow hypervisor login" >> /etc/inittab
#RUN echo "hvc0:12345:respawn:/sbin/agetty -L 9600 hvc0 screen" >> /etc/inittab
# RUN echo "ttyS0::respawn:/sbin/agetty -a root -L ttyS0 115200 vt100" >> /etc/inittab

# Set an ssh key
RUN mkdir -p /etc/ssh /root/.ssh && chmod 0700 /root/.ssh
RUN echo $SSHPUBKEY > /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys

# Fix ssh
RUN sed -i 's/root:!/root:*/' /etc/shadow