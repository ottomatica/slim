const Docker = require('dockerode');

class DockerConnector {

    constructor() {
        this.docker = new Docker();
    }

    /*
     * imageNames: string | string[] 
     * image format <image-name>[:<tag>]
     */    
    async imageExists( imageNames ) {
        return new Promise((resolve, reject) => {    
            let imageNamesArray = Array.isArray(imageNames) ? imageNames : [imageNames];

            this.docker.listImages({ filters: { reference: imageNamesArray } })
                .then( (images) => { 
                    resolve( images.length > 0 )
                })
                .catch( (err) => reject(err.message) )
            ;
        });
    }

    async run(image, cmd, options, startOptions) {

        options = options || {};
        startOptions = startOptions || {};

        return new Promise( (resolve, reject) => {
            console.log( image, cmd );
            this.docker.run(image, cmd, process.stdout, options, startOptions,  function (err, data, container) {

                if( err ) return reject( err );
                // console.log(err, data, container.id);
                resolve(data.StatusCode);
            });
        });

    }

    async ready() {
        let isReady = false;
        const containerExists = await this.containerExists();

        if(containerExists) {
            const container = this.docker.getContainer(this.containerId);
            isReady = (await container.inspect()).State.Running;
        }

        return isReady;
    }

    async containerExists() {
        let containerExists = false;
        try {
            let runningContainers = await this.docker.listContainers({ all: true });
            containerExists = runningContainers.filter(container => container.Id.includes(this.containerId) || container.Names.includes(`/${this.containerId}`)).length > 0;
        } catch (err) {
            console.error(chalk.red(' => Docker is not running so can\'t check for any matching containers.'));
        }
        return containerExists;
    }

    async pull(imageName, options, onProgress, verbose = true) {

        let self = this;
        process.stdout.write(`pulling ${imageName} `);
        return new Promise((resolve, reject) => {
            self.docker.pull(imageName, options, async (error, stream) => {
                
                if (error) { return reject(error); }
                if (!stream) { return reject("Failured to pull."); }
                
                let onFinished = (error, output) => {
                    if (error) {
                        return reject(error);
                    }
                    process.stdout.write('... pulled\n');
                    resolve(output);
                }
    
                if( onProgress == undefined ) 
                {
                    onProgress = (data) => { if(verbose){ console.log(data) }};
                }
    
                self.docker.modem.followProgress(stream, onFinished, onProgress);
            });
        });
    }
}

module.exports = new DockerConnector();