# bouncer

A proxy suite that dynamically blocks hostnames you specify!

Simplicity and ease-of-use were primary design goals for this project. If you're looking for a privacy-focused web proxy with more functionality, something like [privoxy](https://www.privoxy.org/) might be a better choice.

## Features

**Dynamic and database-driven:**

View and edit blocked hostnames on-the-fly, without a service restart.

**Pattern matching:**

Block custom wildcard domains (e.g. `*.foo.com`, `bar-*.baz.com`).

**Supports HTTP and SOCKS5:**

Run HTTP and SOCKS5 proxies that use the same list of blocked hostnames.

This is useful since (1) some clients or devices only support HTTP, and (2) the SOCKS5 proxy allows us to block traffic that isn't handled by HTTP proxies (e.g. TLS connections in desktop applications).

## Prerequisites

* [Node 14.x](https://nodejs.org/dist/latest-v14.x/)
* [Docker](https://docs.docker.com/get-docker/)
* [Compose](https://docs.docker.com/compose/install/)

## Install

Clone the repo, `cd` into it, and `npm i -g`.

## Usage

### Proxy

#### Build Docker image

`npm run build`

#### Start

`npm start`

This starts an HAProxy gateway that load-balances connections and requests across SOCKS5 and HTTP proxies, respectively.

The gateway listens on port 8088 for HTTP requests and port 9059 for SOCSK5 connections.

#### Stop

`npm stop`

This stops and removes the Docker containers running the gateway and proxies.

### CLI

```
Usage: bouncer [options] [command]

Options:
  -V, --version           output the version number
  -h, --help              display help for command

Commands:
  allow <hostname>
  block <hostname/@file>
  view
  help [command]          display help for command
```

#### Block hostname

`bouncer block <hostname/@file>`

Block a hostname or a file containing 1 hostname per line.

#### Allow hostname

`bouncer allow <hostname>`

#### View blocked hostnames

`bouncer view`
