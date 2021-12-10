"use strict";

const { AsyncLocalStorage } = require("async_hooks");
const { v4: uuid } = require("uuid");

const store = new AsyncLocalStorage();
const CORRELATION_ID_KEY = "correlationId";

function getId() {
  return store.getStore()?.get(CORRELATION_ID_KEY);
}

function middleware(req, res, next) {
  const correlationId = req.headers["x-correlation-id"] || req.headers["correlation-id"] || uuid();

  store.run(new Map(), () => {
    store.getStore().set(CORRELATION_ID_KEY, correlationId);
    next();
  });
}

function attachCorrelationIdHandler(handler, correlationId) {
  return new Promise((resolve, reject) => {
    store.run(new Map(), async () => {
      store.getStore().set(CORRELATION_ID_KEY, correlationId || uuid());
      try {
        const res = await handler();
        resolve(res);
      } catch (err) {
        reject(err);
      }
    });
  });
}

module.exports = { middleware, getId, attachCorrelationIdHandler };
