FROM alpine:3.15
RUN mkdir -p /lib/apk/db /run
RUN apk add --initdb openrc
RUN apk add linux-virt kmod kmod-openrc blkid

# busybox-initscripts busybox-suid
RUN apk add --update alpine-baselayout alpine-conf alpine-keys apk-tools busybox busybox-initscripts \
    ca-certificates dbus-libs kbd-bkeymaps \
    coreutils  bash-completion findutils procps sed readline e2fsprogs \
    docker docker-bash-completion rsync  \
    gnutls openssh openssh-client rng-tools dhcpcd network-extras wget util-linux
RUN [ ! -z "$PKGS" ] && apk add --no-cache $PKGS || echo "No optional pkgs provided."

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
COPY files/real_init /real_init
COPY files/daemon.json /etc/docker/

RUN echo "Welcome to slim!" > /etc/motd

# Set an ssh key
RUN mkdir -p /etc/ssh /root/.ssh && chmod 0700 /root/.ssh
RUN echo $SSHPUBKEY > /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys

# Fix ssh
RUN sed -i 's/root:!/root:*/' /etc/shadow