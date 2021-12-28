# slim | [![Build Status](https://travis-ci.org/ottomatica/slim.svg?branch=master)](https://travis-ci.org/ottomatica/slim)

`slim` will build a micro-vm from a Dockerfile. Slim works by building and extracting a rootfs from a Dockerfile, and then merging that filesystem with a small minimal kernel that runs in RAM.

This results in a real VM that can boot instantly, while using very limited resources. If done properly, slim can allow you to design and build immutable unikernels for running services, or build tiny and embedded development environments.

## Using slim

### Build a micro-vm

Create a micro-vm from a Dockerfile. Use `build` command with a directory containing a Dockerfile.

```
$ slim build images/alpine3.8-simple
```

![build](doc/img/build.png)

This will add a bootable iso in the slim registry. [See example Dockerfile](https://github.com/ottomatica/slim/tree/master/images/alpine3.8-simple).

`slim build` will use your [default provider](#running-a-micro-vm) unless the `-p` flag is specified (ie `-p hyperkit`).

### Listing micro-vm images

See a list of micro-vm images on your machine.

```
$ slim images
```

![images command](doc/img/images.png)

### Running a micro-vm

Provision a new instance of the given micro-vm image as a virtual machine.

Slim currently supports Virtualbox, KVM, and hyperkit (MacOS only) as providers for running VMs. Slim will discover all available providers, defaulting to virtualbox, if more than one provider is available.  The `-p` flag can be used to force Slim to use a specific provider.

Using hyperkit (requires sudo):

```
$ slim run micro1 alpine3.8-simple -p hyperkit
```

![nanobox](doc/img/nanobox.png)

Using virtualbox:

```
$ slim run micro2 alpine3.8-simple
```

![nanobox](doc/img/run-vbox.png)

VirtualBox will run the micro-vm instance as an attached iso loaded into a cdrom, and boot up the iso in seconds.

For convenience, a ssh connection command is provided at the end of the command, allowing easy access into the machine:

Example: `ssh -i /Users/cjparnin/.slim/baker_rsa root@127.0.0.1 -p 2008 -o StrictHostKeyChecking=no`

## Advanced Features

#### Build formats

Slim supports building multiple image formats, but by default will only build the image required for the given provider. The `-f` flag can be used to specify any additional image formats that should be built, which will be stored in the registry directory for that image. The currently supported formats and their corresponding providers are:

&#8203; | raw | iso | qcow2
--- | --- | --- | ---
kvm | ✓ | ✓ | ✓
hyperkit | ✓ | ✓ |
virtualbox | ✓ | ✓ |

* The `raw` format signifies an unbundled ramfs archive and kernel.

Example: running `slim build images/alpine3.8-simple -p kvm -f qcow2` will build a `raw` image (KVM's default image format), as well as a `qcow2` image.

#### Shared Folders

Slim will automatically mount `/` at `/host` and `cwd` (ie the directory where you run the slim run command) at `/slim` within the VM. This automounting can be disabled by passing the `--sync=no` option in the slim run command. The example [alpine3.8-simple](https://github.com/ottomatica/slim/tree/master/images/alpine3.8-simple) and [ubuntu16.04-simple](https://github.com/ottomatica/slim-images/tree/master/ubuntu16.04-simple) images illustrate how to support mounting within the image, and is documented [here](https://github.com/ottomatica/slim/issues/39).

#### Build and run parameters

* Using `slim build <image> --no-cache` will skip the docker build cache, allowing you to repair stale apt-get caches, for example.
* Using `slim run v0 ubuntu16.04-jenkins --memory 4096 --cpus 2` will allow you allocate more memory and cpus to your instance.

#### Managing vms and images

* You can get a list of vms with `slim vms`.
* Force shutdown of a vm. `slim stop micro1` (Note: for hyperkit, this will be the equivalent of delete.)
* You can delete a specific vm called "v0" with `slim delete vm v0`
* You can delete a specific image in registry called "ubuntu" with `slim delete image ubuntu`
* You can clean out the entire image registry with `slim clean`.

#### Extending base images (experimental)

Instead of having to copy and extend an existing Dockerfile, we're experimenting with a reuse pattern that lets you reference an existing base image hosted in a git repository, and extend it by passing in build arguments. For example, by defining this in an `info.yml`, you could extend the base alpine3.9 image with ansible and runc.

```
description: A simple configuration server with ansible and runc (for running containers).
base_repository: https://github.com/ottomatica/slim
base_directory: images/alpine3.9-simple
base_args:
  PKGS: runc ansible
```

## Example micro-vms

A collection of micro-vms can be found here, including ubuntu base images, jenkins, kubenetes, and more: https://github.com/ottomatica/slim-images

## Installing slim

Simply clone this repo and run:

```
npm install
npm link
```

Unfortunately, due to the experimental nature, there are a few system dependencies you must also install:

* [docker](https://docs.docker.com/install/), for building and extracting the kernel and filesystem.
* cdrtools: `brew install cdrtools`, for building the micro-vm iso.

To boot and run the image, you also need a hypervisor:

* [VirtualBox](https://www.virtualbox.org/wiki/Downloads), `kvm` on Linux, or `hyperkit` on macOS.

For kvm, you can install the following dependencies for ubuntu:

```bash
sudo apt-get install qemu-kvm libvirt-bin virtinst bridge-utils cpu-checker mkisofs
```
