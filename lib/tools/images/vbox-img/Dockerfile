FROM ubuntu:20.04 as install

ENV DEBIAN_FRONTEND=noninteractive
RUN apt update && \
    apt install curl -y

ENV VIRTUALBOX=virtualbox-6.1_6.1.30-148432~Ubuntu~eoan_amd64.deb
RUN curl -s -O https://download.virtualbox.org/virtualbox/6.1.30/$VIRTUALBOX
RUN apt install ./$VIRTUALBOX -y

FROM ubuntu:20.04
COPY --from=install /usr/bin/vbox-img /usr/bin/vbox-img
# Library dependencies
RUN apt update && \
    apt install libxml2 -y