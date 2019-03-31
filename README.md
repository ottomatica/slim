# slim

`slim` will build a microkernel from a Dockerfile. Slim works by building and extracting a rootfs from a Dockerfile, and then merging that filesystem with a small minimal kernel that runs in RAM.

This results in a real VM that can boot instantly, while using very limited resources.

## Using slim


### Build a microkernel

`slim build images/alpine3.8-runc-ansible`: Create a microkernel from a Dockerfile. [See example Dockerfile](https://github.com/ottomatica/slim/tree/master/images/alpine3.8-runc-ansible). This will be stored as a bootable iso.


### Listing microkernels

`slim images`: See a list of microkernels on your machine.

![images command](doc/img/images.png)

### Running a microkernel

`slim run micro1 alpine3.8-runc-ansible`: Provision a new instance of the given microkernel as a VM in VirtualBox. VirtualBox will run the microkernel as an attached iso loaded into a cdrom, and boot up the iso in seconds.

For convience, a ssh connection command is provided at the end of the command, allowing easy access into the machine:
Example: `ssh -i /Users/cjparnin/.slim/baker_rsa root@127.0.0.1 -p 2008 -o StrictHostKeyChecking=no`

## Installing slim

Simply clone this repo and run.

```
npm install
npm link
```

Unfortunately, due to the experimental nature, there are a few dependencies you must also install:

* [VirtualBox](https://www.virtualbox.org/wiki/Downloads)
* [docker](https://docs.docker.com/install/)
* gtar: `brew install gnu-tar`
* cdrtools: `brew install cdrtools`