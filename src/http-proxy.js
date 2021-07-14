const EventEmitter = require('events')
const http = require('http')
const net = require('net')
const Db = require('./db')

/**
 * An HTTP proxy server capable of dynamically blocking hostnames.
 *
 * @extends http.Server
 */
class HttpProxy extends http.Server {
  constructor () {
    super()

    this.db = new Db()

    this
      .on('error', console.error)
      .on('connect', async (req, sock, head) => {
        try {
          await this.handleConnect(req, sock, head)
        } catch (err) {
          console.error(err)
        }
      })
  }

  /**
   * @param  {Number} [port = 8088]
   * @param  {String} [host = '0.0.0.0']
   *
   * @return {Promise}
   */
  start (port = 8088, host = '0.0.0.0') {
    const promise = EventEmitter.once(this, 'listening')

    this.listen(port, host)

    return Promise.all([this.db.init(), promise])
  }

  /**
   * @return {Promise}
   */
  async stop () {
    const promise = EventEmitter.once(this, 'close')

    this.close()

    await promise
    await this.db.close()
  }

  async handleConnect (req, srcSock, head) {
    const { hostname, port } = new URL('http://' + req.url)
    const isBlocked = this.db.isBlocked(hostname)

    if (isBlocked) {
      srcSock.end()
      console.log(`Blocked: ${hostname}:${port}`)
      return
    }

    const dstSock = await new Promise((resolve, reject) => {
      const sock = net.connect(port, hostname)

      sock
        .once('connect', () => resolve(sock))
        .once('error', reject)

      setTimeout(() => {
        reject(new Error(`Timeout: ${hostname}:${port}`))
      }, 10e3)
    })

    dstSock.write(head)
    srcSock.write('HTTP/1.1 200 Connection Established\r\n\r\n')

    srcSock
      .on('error', () => {})
      .pipe(dstSock)
      .on('error', () => {})
      .pipe(srcSock)

    console.log(`Connected: ${hostname}:${port}`)
  }
}

module.exports = HttpProxy
