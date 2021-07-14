const path = require('path')
const { DataTypes, Sequelize } = require('sequelize')

const DEFAULT_DB_PATH = path.resolve(__dirname, '..', 'bouncer.sqlite')

class Db {
  constructor (dbPath = DEFAULT_DB_PATH) {
    this.dbPath = dbPath
    this.hostnames = []
    this.interval = null
    this.sequelize = null
  }

  get hosts () {
    return this.hostnames
      .map(hostname => {
        return typeof hostname === 'string'
          ? hostname
          : hostname
            .toString()
            .replace(/\.\*\?/g, '*')
            .replace(/\\\./g, '.')
            .slice(1, -1)
      })
      .sort((a, b) => {
        const idxA = a.indexOf('*')
        const idxB = b.indexOf('*')

        if (idxA === -1 && idxB === -1) {
          return a > b ? 1 : -1
        }

        if (idxA !== -1 && idxB === -1) {
          return 1
        }

        if (idxA === -1 && idxB !== -1) {
          return -1
        }

        if (idxA < idxB) return 1
        if (idxA > idxB) return -1

        return a > b ? 1 : -1
      })
  }

  get models () {
    return this.sequelize.models
  }

  async init () {
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      logging: () => {},
      storage: this.dbPath
    })

    sequelize.define('Host', {
      hostname: {
        primaryKey: true,
        type: DataTypes.STRING
      }
    })

    await sequelize.sync()

    this.sequelize = sequelize

    await this.readHostnames()

    this.interval = setInterval(this.readHostnames.bind(this), 60e3)
  }

  isBlocked (hostname) {
    for (const name of this.hostnames) {
      const isBlocked = (
        (typeof name === 'string' && name === hostname) ||
        (name instanceof RegExp && name.test(hostname))
      )

      if (isBlocked) return true
    }

    return false
  }

  async readHostnames () {
    const hosts = await this.models.Host.findAll()

    this.hostnames = hosts.map(host => {
      const isWildcard = host.dataValues.hostname.includes('*')

      if (!isWildcard) return host.dataValues.hostname

      const regexStr = host.dataValues.hostname
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*?')

      return new RegExp(regexStr)
    })
  }

  async close () {
    await this.sequelize.close()
    clearInterval(this.interval)
  }
}

module.exports = Db
