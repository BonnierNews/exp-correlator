"use strict";

const { AsyncLocalStorage } = require("async_hooks");
const { randomUUID } = require("crypto");

const store = new AsyncLocalStorage();
const CORRELATION_ID_KEY = "correlationId";
const X_HEADER_KEY = "x-correlation-id";
const HEADER_KEY = "correlation-id";

function getId() {
  return store.getStore()?.get(CORRELATION_ID_KEY);
}

function getCorrelationIdFromHeader(req, res) {
  if (res.get(X_HEADER_KEY)) {
    return { id: res.get(X_HEADER_KEY), fromHeader: X_HEADER_KEY };
  }
  if (res.get(HEADER_KEY)) {
    return { id: res.get(HEADER_KEY), fromHeader: HEADER_KEY };
  }

  if (req.headers[X_HEADER_KEY]) {
    return { id: req.headers[X_HEADER_KEY], fromHeader: X_HEADER_KEY };
  }
  if (req.headers[HEADER_KEY]) {
    return { id: req.headers[HEADER_KEY], fromHeader: HEADER_KEY };
  }

  return { id: randomUUID(), fromHeader: X_HEADER_KEY };
}

function middleware(req, res, next) {
  const correlationIdAndHeader = getCorrelationIdFromHeader(req, res);

  store.run(new Map(), () => {
    res.set(correlationIdAndHeader.fromHeader, correlationIdAndHeader.id);
    store.getStore().set(CORRELATION_ID_KEY, correlationIdAndHeader.id);
    next();
  });
}

function attachCorrelationIdHandler(handler, correlationId) {
  return new Promise((resolve, reject) => {
    store.run(new Map(), async () => {
      store.getStore().set(CORRELATION_ID_KEY, correlationId || randomUUID());
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
