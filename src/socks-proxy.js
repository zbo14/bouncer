const EventEmitter = require('events')
const net = require('net')
const Db = require('./db')
const SocksConn = require('./socks-conn')

/**
 * A SOCKS5 proxy server capable of dynamically blocking hostnames.
 *
 * @extends net.Server
 */
class SocksProxy extends net.Server {
  constructor () {
    super()

    this.conns = []
    this.db = new Db()

    this
      .on('error', console.error)
      .on('connection', this.handleConnection.bind(this))
  }

  /**
   * @param  {Number} [port = 9059]
   * @param  {String} [host = '0.0.0.0']
   *
   * @return {Promise}
   */
  start (port = 9059, host = '0.0.0.0') {
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

  /**
   * @return {SocksConn[]}
   */
  get connections () {
    return this.conns.slice()
  }

  handleConnection (sock) {
    const conn = new SocksConn(this.db, sock)

    conn
      .on('connect', ({ host, port }) => {
        this.conns.push(conn)
        console.log(`Connected: ${host}:${port}`)
      })
      .on('close', () => {
        this.conns = this.conns.filter(otherConn => otherConn !== conn)
      })
  }
}

module.exports = SocksProxy
