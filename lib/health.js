const tcpp = require('tcp-ping');
const util = require('util');

const tcpPing = util.promisify(tcpp.ping);

const timeout =  5 * 1000 // timeout in ms
const attempts = 5

module.exports = async function ping(sshInfo) {
    try {
        const result = await tcpPing({
            address: sshInfo.hostname,
            port: sshInfo.port,
            timeout: timeout,
            attempts: attempts
        });
        return !!result;
    } catch (_) {
        return false;
    }
}