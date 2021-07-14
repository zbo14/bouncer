#!/usr/bin/env node

'use strict'

const fs = require('fs')
const { Command } = require('commander')
const DB = require('./src/db')

const program = new Command()

program.version('0.0.1')

program
  .command('allow <hostname>')
  .action(async hostname => {
    const db = new DB()
    await db.init()

    try {
      const nDeleted = await db.models.Host.destroy({ where: { hostname } })

      nDeleted
        ? console.log('Allowed:', hostname)
        : console.error('Host not found')
    } catch (err) {
      console.error(err)
    }

    await db.close()
  })

program
  .command('block <hostname/@file>')
  .action(async arg => {
    const db = new DB()
    await db.init()

    let hostnames

    if (arg[0] === '@') {
      const data = await fs.promises.readFile(arg.slice(1), 'utf8')
      hostnames = data.split('\n').filter(Boolean)
    } else {
      hostnames = [arg]
    }

    for (const hostname of hostnames) {
      try {
        await db.models.Host.create({ hostname })
        console.log('Blocked:', hostname)
      } catch (err) {
        console.error((err?.errors?.[0] || err).message)
      }
    }

    await db.close()
  })

program
  .command('view')
  .action(async () => {
    const db = new DB()
    await db.init()
    console.log(db.hosts.join('\n'))
    await db.close()
  })

program.parse(process.argv)
