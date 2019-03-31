FROM alpine:latest AS install
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

RUN apk add --update --no-cache --initdb alpine-baselayout apk-tools busybox ca-certificates util-linux \
    openssh openssh-client rng-tools

RUN rm -rf /var/cache/apk && mkdir -p /var/cache/apk

# Deleted cached packages
RUN rm -rf /var/cache/apk/* && mkdir -p /var/cache/apk

COPY files/init /init
COPY files/bin /bin/
COPY files/etc/ /etc/
COPY files/usr/ /usr/

# Don't need floppy group
RUN sed -i '/floppy:x:11:root/d' /etc/group