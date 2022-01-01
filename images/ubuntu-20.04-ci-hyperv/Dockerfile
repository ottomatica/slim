FROM ubuntu:20.04
RUN apt-get update && \
    # kernel, hyper-v support, and other virtual tooling.
    apt-get install -y linux-virtual linux-cloud-tools-virtual linux-tools-virtual && \
    apt-get clean

RUN echo $' \n\
hv_balloon\n\
hv_utils\n\
hv_vmbus\n\
hv_sock\n\
hv_storvsc\n\
hv_netvsc\n' >> /etc/initramfs-tools/modules

RUN update-initramfs -u

# # Extract the kernel, modules, and initrd
# COPY --from=kernel /lib/modules /lib/modules
# COPY --from=kernel /boot/vmlinuz-* /vmlinuz
# COPY --from=kernel /boot/initrd.img-* /initrd
RUN mv /boot/vmlinuz-* /vmlinuz
RUN mv /boot/initrd.img-* /initrd

COPY grub.cfg /EFI/BOOT/grub.cfg
COPY bootx64.efi /EFI/BOOT/BOOTX64.efi

# Needed for configuring server and setting up devices.
RUN apt install cloud-init udev kmod -y
# Quality of life:
RUN apt install openssh-server sudo -y