'use strict'

const proto = (process.argv[2] || '')
  .trim()
  .toLowerCase()

if (!['http', 'socks'].includes(proto)) {
  console.error('Expected proto to be one of ["http","socks"]')
  process.exit(1)
}

const Proxy = require(`./src/${proto}-proxy`)

const main = async () => {
  const proxy = new Proxy()

  await proxy.start()

  const { port } = proxy.address()

  console.log('Listening on port', port)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
