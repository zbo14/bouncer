const EventEmitter = require('events')
const net = require('net')
const ip = require('ip')

const BUFFER_SIZE = 262

/**
 * @extends EventEmitter
 */
class SocksConn extends EventEmitter {
  constructor (db, sock) {
    super()

    this.data = Buffer.alloc(BUFFER_SIZE)
    this.db = db
    this.hasGreeted = false
    this.host = ''
    this.index = 0
    this.port = 0

    this.dataHandler = async chunk => {
      try {
        await this.handleData(chunk)
      } catch (err) {
        this.end(err)
      }
    }

    this.sock = sock
      .on('close', () => this.emit('close'))
      .on('data', this.dataHandler)
      .on('error', () => {})
  }

  respond (status, sock) {
    if (status) {
      this.write(Buffer.from([5, status, 0, 1, 0, 0, 0, 0, 0, 0]))
      return
    }

    const { port, family, address } = sock.address()

    const addrBuf = family === 'IPv4'
      ? Buffer.from([1, ...ip.toBuffer(address)])
      : Buffer.from([4, ...ip.toBuffer(address)])

    const portBuf = Buffer.alloc(2)
    portBuf.writeUint16BE(port)

    const resp = Buffer.concat([
      Buffer.from([5, 0, 0]),
      addrBuf,
      portBuf
    ])

    this.write(resp)
  }

  end (err) {
    err && console.error(err)
    this.sock.end()
  }

  write (...args) {
    this.sock.write(...args)
  }

  async handleData (chunk) {
    if (this.index + chunk.byteLength > BUFFER_SIZE) {
      throw new Error('Exceeded buffer size')
    }

    chunk.copy(this.data, this.index)

    this.index += chunk.byteLength

    this.hasGreeted
      ? await this.handleRequest()
      : this.handleGreeting()
  }

  handleGreeting () {
    if (!this.index) return

    if (this.data[0] !== 5) {
      throw new Error('Expected SOCKS version 5, got: ' + this.data[0])
    }

    if (this.index < 2) return

    const nauth = this.data[1]

    if (this.index < 2 + nauth) return

    if (this.data.slice(2, 1 + nauth).includes(0)) {
      this.write(Buffer.from([5, 255]))
      throw new Error('Expected no authentication')
    }

    this.write(Buffer.from([5, 0]))

    this.hasGreeted = true
    this.index = 0
  }

  async handleRequest () {
    if (!this.index) return

    if (this.data[0] !== 5) {
      this.respond(7)
      throw new Error('Expected SOCKS version 5, got: ' + this.data[0])
    }

    if (this.index < 2) return

    if (this.data[1] !== 1) {
      this.respond(7)
      throw new Error('Unsupported command: ' + this.data[1])
    }

    if (this.index < 3) return

    if (this.data[2]) {
      this.respond(7)
      throw new Error('Expected reserved (null) byte, got: ' + this.data[2])
    }

    if (this.index < 4) return

    let host
    let index

    switch (this.data[3]) {
      case 1:
        index = 8

        if (this.index < index) return

        this.host = ip.toString(this.data, 4, 4)

        break

      case 3:
        index = 5 + this.data[4]

        if (this.index < 5 || this.index < index) return

        host = this.data.slice(5, index).toString()

        break

      case 4:
        index = 20

        if (this.index < index) return

        host = ip.toString(this.data, 4, 16)

        break

      default:
        this.respond(8)
        throw new Error('Unsupported address type: ' + this.data[3])
    }

    if (this.index < index + 2) return

    const port = this.data.readUint16BE(index)

    if (this.db.isBlocked(host)) {
      this.respond(2)
      console.log(`Blocked: ${host}:${port}`)
      return
    }

    const sock = net.connect(port, host)

    try {
      await Promise.race([
        EventEmitter.once(sock, 'connect'),

        new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error(`Connect timeout: ${host}:${port}`))
          }, 10e3)
        })
      ])
    } catch (err) {
      this.respond(4)
      throw err
    }

    this.host = host
    this.port = port

    this.respond(0, sock)
    this.sock.removeListener('data', this.dataHandler)

    sock
      .on('error', () => {})
      .pipe(this.sock)
      .pipe(sock)

    this.emit('connect', { host, port })
  }
}

module.exports = SocksConn
