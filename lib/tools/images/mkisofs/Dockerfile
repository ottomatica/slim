FROM ubuntu:20.04
RUN apt update && \
    apt install mkisofs e2fsprogs mtools dosfstools wget -y && \
    apt clean

RUN wget https://www.kernel.org/pub/linux/utils/boot/syslinux/syslinux-6.03.tar.gz
RUN tar -xvf syslinux-6.03.tar.gz

RUN apt install grub-efi gdisk rsync -y

# syslinux-6.03/efi64/efi/syslinux.efi
# syslinux-6.03/efi64/com32/elflink/ldlinux/ldlinux.e64