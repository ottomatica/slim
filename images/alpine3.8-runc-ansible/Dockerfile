FROM linuxkit/alpine:daed76b8f1d28cdeeee215a95b9671c682a405dc AS build

RUN apk add --no-cache go musl-dev git build-base
ENV GOPATH=/go PATH=$PATH:/go/bin
ENV COMMIT=db7b7b0f8147f29360d69dc81af9e2877647f0de

RUN git clone https://github.com/moby/vpnkit.git /go/src/github.com/moby/vpnkit && \
    cd /go/src/github.com/moby/vpnkit && \
    git checkout $COMMIT && \
    cd go && \
    make build/vpnkit-iptables-wrapper.linux build/vpnkit-expose-port.linux build/vpnkit-forwarder.linux

FROM linuxkit/alpine:daed76b8f1d28cdeeee215a95b9671c682a405dc as myrunc
RUN \
  apk add \
  bash \
  gcc \
  git \
  go \
  libc-dev \
  libseccomp-dev \
  linux-headers \
  make \
  && true
ENV GOPATH=/go PATH=$PATH:/go/bin
ENV RUNC_COMMIT=69663f0bd4b60df09991c08812a60108003fa340
RUN mkdir -p $GOPATH/src/github.com/opencontainers && \
  cd $GOPATH/src/github.com/opencontainers && \
  git clone https://github.com/opencontainers/runc.git
WORKDIR $GOPATH/src/github.com/opencontainers/runc
RUN git checkout $RUNC_COMMIT
RUN make static BUILDTAGS="seccomp" EXTRA_FLAGS="-buildmode pie" EXTRA_LDFLAGS="-extldflags \\\"-fno-PIC -static\\\""
RUN cp runc /usr/bin/

RUN mkdir -p /etc/init.d && ln -s /usr/bin/service /etc/init.d/010-onboot
RUN mkdir -p /etc/shutdown.d && ln -s /usr/bin/service /etc/shutdown.d/010-onshutdown

FROM alpine3.8-base

RUN apk add --update --no-cache --initdb musl tini \
    ansible \
    #bash iproute2 iptables ebtables ipvsadm bridge-utils \
    dhcpcd-openrc virtualbox-guest-additions virtualbox-guest-modules-virt \
    libseccomp e2fsprogs
    #openrc

RUN mkdir -p /etc/ssl/certs
RUN mkdir -p /lib/firmware
RUN mkdir -p /lib/mdev
RUN mkdir -p /lib/rc

COPY --from=build /go/src/github.com/moby/vpnkit/go/build/vpnkit-iptables-wrapper.linux /usr/bin/vpnkit-iptables-wrapper
COPY --from=build /go/src/github.com/moby/vpnkit/go/build/vpnkit-expose-port.linux /usr/bin/vpnkit-expose-port
COPY --from=build /go/src/github.com/moby/vpnkit/go/build/vpnkit-forwarder.linux /usr/bin/vpnkit-forwarder

COPY --from=myrunc /usr/bin/runc /usr/bin/
COPY --from=myrunc /etc/init.d/ /etc/init.d/
COPY --from=myrunc /etc/shutdown.d/ /etc/shutdown.d/

# Deleted cached packages
RUN rm -rf /var/cache/apk/* && mkdir -p /var/cache/apk

COPY files/init /init
COPY files/etc/ /etc/
