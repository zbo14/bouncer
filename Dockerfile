FROM node:14.17.3-alpine

ARG proto

COPY . /bouncer

WORKDIR /bouncer

RUN apk update && \
    apk upgrade && \
    npm i --production && \
    adduser -D bouncer

USER bouncer

ENTRYPOINT node proxy $proto
