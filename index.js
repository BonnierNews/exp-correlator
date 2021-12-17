"use strict";

const { AsyncLocalStorage } = require("async_hooks");
const { v4: uuid } = require("uuid");

const store = new AsyncLocalStorage();
const CORRELATION_ID_KEY = "correlationId";

function getId() {
  return store.getStore()?.get(CORRELATION_ID_KEY);
}

function getCorrelationIdFromHeader(req) {
  if (req.headers["x-correlation-id"]) {
    return { id: req.headers["x-correlation-id"], fromHeader: "x-correlation-id" };
  }
  if (req.headers["correlation-id"]) {
    return { id: req.headers["correlation-id"], fromHeader: "correlation-id" };
  }
  return { id: uuid(), fromHeader: "x-correlation-id" };
}

function middleware(req, res, next) {
  const correlationIdAndHeader = getCorrelationIdFromHeader(req);

  store.run(new Map(), () => {
    res.set(correlationIdAndHeader.fromHeader, correlationIdAndHeader.id);
    store.getStore().set(CORRELATION_ID_KEY, correlationIdAndHeader.id);
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
