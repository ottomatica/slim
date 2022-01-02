FROM ubuntu:20.04 AS kernel
RUN apt-get update && \
    apt-get install -y linux-virtual && \
    apt-get clean

FROM ubuntu:20.04

# Extract the kernel, modules, and initrd
COPY --from=kernel /lib/modules /lib/modules
COPY --from=kernel /boot/vmlinuz-* /vmlinuz
COPY --from=kernel /boot/initrd.img-* /initrd

RUN apt-get update 
# Needed for configuring server and setting up devices.
RUN apt install cloud-init udev kmod -y
# If you'd like to be able to ssh in:
RUN apt install openssh-server sudo -y