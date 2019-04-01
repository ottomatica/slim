
FROM alpine:3.8.4 AS build
RUN mkdir -p /lib/apk/db /run
RUN apk add --no-cache --initdb openrc

FROM alpine:3.8.4 AS kernel
RUN mkdir -p /lib/apk/db /run
RUN echo "http://dl-cdn.alpinelinux.org/alpine/v3.8/main" > /etc/apk/repositories
RUN apk add --no-cache --initdb linux-virt

FROM alpine:3.8.4 AS install
# the public key that is authorized to connect to this instance.
ARG SSHPUBKEY

USER root 
# Set an ssh key
RUN mkdir -p /etc/ssh /root/.ssh && chmod 0700 /root/.ssh
RUN echo $SSHPUBKEY > /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys

RUN mkdir -p /lib/apk/db /run

RUN rm -rf /var/cache/apk && mkdir /var/cache/apk
RUN echo "http://dl-cdn.alpinelinux.org/alpine/v3.8/community" >> /etc/apk/repositories

RUN mkdir -p /etc/init.d && ln -s /usr/bin/service /etc/init.d/010-onboot
RUN mkdir -p /etc/shutdown.d && ln -s /usr/bin/service /etc/shutdown.d/010-onshutdown


# don't want all the /etc stuff from openrc -- only tools
# https://pkgs.alpinelinux.org/contents?repo=main&page=2&arch=x86_64&branch=v3.8&name=openrc
COPY --from=build /lib/ /lib/
COPY --from=build /bin /bin
COPY --from=build /sbin /sbin
COPY --from=build /etc/ /etc/

# Need virtio modules for networking and host folder sharing.
COPY --from=kernel /lib/modules /lib/modules

RUN apk add --update --no-cache --initdb alpine-baselayout apk-tools busybox ca-certificates util-linux \
    openssh openssh-client rng-tools dhcpcd

RUN rm -rf /var/cache/apk && mkdir -p /var/cache/apk

# Deleted cached packages
RUN rm -rf /var/cache/apk/* && mkdir -p /var/cache/apk

# Our local files
COPY files/init /init
COPY files/bin /bin/
COPY files/etc/ /etc/
COPY files/usr/ /usr/

# For mounts
RUN mkdir -p /data
RUN mkdir -p /mnt/disk

# Fix ssh
RUN sed -i 's/root:!/root:*/' /etc/shadow

# Don't need floppy group
RUN sed -i '/floppy:x:11:root/d' /etc/group