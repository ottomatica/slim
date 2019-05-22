#!/bin/bash

SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"
NAME="$1"

echo "extracting filesystem for $NAME"

# Prepare and reset build directories
WORKDIR=~/.slim
mkdir -p $WORKDIR
cd $WORKDIR
rm -rf $NAME-tmp $NAME-vm
rm -rf initrd.img.gz initrd.img

# terminate early if commands fail
set -e
set -o pipefail

# Run a container and use export/import to flatten layers
ID=$(docker run -it -d $NAME sh)
echo "saving docker filesystem"
docker export $ID | docker import - $NAME-flat
docker save $NAME-flat > $NAME.tar
docker stop $ID
docker rm $ID

# Extracted nested tar files to get filesystem in layer.tar
# layer.tar is the same regardless of our naming scheme
mkdir -p $NAME-tmp $NAME-vm
mv $NAME.tar $NAME-tmp
cd $NAME-tmp && node $SCRIPTPATH/../lib/util/tar.js $NAME.tar .
mv */layer.tar ../$NAME-vm
echo "extracting layer.tar"
cd ../$NAME-vm && node $SCRIPTPATH/../lib/util/tar.js layer.tar .
rm layer.tar

#echo "copy randomness"
#cat /dev/urandom | head -c 5000 > etc/random-seed || echo $?

# extract kernel
mv vmlinuz $WORKDIR

echo "creating initrd.img"
find . | cpio -o -H newc -O $WORKDIR/initrd.img;
echo "compressing image"
cd $WORKDIR && gzip initrd.img
