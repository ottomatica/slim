FROM ubuntu:20.04 AS kernel
RUN apt-get update && \
    apt-get install -y linux-virtual && \
    apt-get clean

FROM ubuntu:20.04

# copy the kernel for later use
COPY --from=kernel /lib/modules /lib/modules
COPY --from=kernel /boot/vmlinuz-* /vmlinuz

RUN apt-get update 
RUN apt install cloud-init -y

