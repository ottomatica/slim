FROM alpine:3.15
RUN mkdir -p /lib/apk/db /run
RUN apk add --no-cache --initdb openrc
RUN apk add --no-cache --initdb linux-virt
RUN apk add --no-cache --initdb mkinitfs blkid squashfs-tools

RUN apk add --update --no-cache --initdb alpine-baselayout alpine-conf apk-tools busybox ca-certificates util-linux \
    openssh openssh-client rng-tools dhcpcd
RUN [ ! -z "$PKGS" ] && apk add --no-cache $PKGS || echo "No optional pkgs provided."


# Create modloop
RUN /etc/init.d/modloop start || true
RUN update-kernel -f virt /boot

USER root
# the public key that is authorized to connect to this instance.
ARG SSHPUBKEY
# optional packages
ARG PKGS

# Copy kernel/initrd for later use
RUN cp /boot/vmlinuz-virt /vmlinuz
RUN cp /boot/initramfs-virt /initrd

# Deleted cached packages
RUN rm -rf /var/cache/apk/*

# Our init
COPY files/init /init

RUN echo "Welcome to slim!" > /etc/motd
# RUN echo "tty0::respawn:/sbin/agetty -a root -L tty0 38400 vt100" > /etc/inittab
# RUN echo "hvc0::respawn:/sbin/agetty -a root -L hvc0 38400 vt100" > /etc/inittab
# RUN echo "ttyS0::respawn:/sbin/agetty -a root -L ttyS0 115200 vt100" >> /etc/inittab

# Set an ssh key
RUN mkdir -p /etc/ssh /root/.ssh && chmod 0700 /root/.ssh
RUN echo $SSHPUBKEY > /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys

# Fix ssh
RUN sed -i 's/root:!/root:*/' /etc/shadow