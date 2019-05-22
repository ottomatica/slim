#!/bin/bash

SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"
DOCKERFILE_PATH="$1"

# pass the rest of the args to docker
shift
DOCKER_OPTS="$@"

# Prepare and reset build directories
WORKDIR=~/.slim
mkdir -p $WORKDIR
cd $WORKDIR
rm -rf slim-tmp slim-vm
rm -rf initrd.img.gz initrd.img

# terminate early if commands fail
set -e
set -o pipefail

echo "using docker opts $DOCKER_OPTS"

# Use docker to build image
docker build "$@" -t slim-vm --build-arg SSHPUBKEY="$(cat $SCRIPTPATH/keys/baker.pub)" $DOCKERFILE_PATH
# Run a container and use export/import to flatten layers
ID=$(docker run -it -d slim-vm sh)
docker export $ID | docker import - slim-vm-flat
docker save slim-vm-flat > slim.tar
docker stop $ID
docker rm $ID

# Extracted nested tar files to get filesystem in layer.tar
mkdir -p slim-tmp slim-vm
mv slim.tar slim-tmp
cd slim-tmp && node $SCRIPTPATH/../lib/util/tar.js slim.tar .
mv */layer.tar ../slim-vm
echo "extracting layer.tar"
cd ../slim-vm && node $SCRIPTPATH/../lib/util/tar.js layer.tar .
rm layer.tar

#echo "copy randomness"
#cat /dev/urandom | head -c 5000 > etc/random-seed || echo $?

# extract kernel
mv vmlinuz $WORKDIR

echo "creating initrd.img"
find . | cpio -o -H newc -O $WORKDIR/initrd.img;
echo "compressing image"
cd $WORKDIR && gzip initrd.img
