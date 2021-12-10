# exp-correlator
[![Test application](https://github.com/BonnierNews/exp-correlator/actions/workflows/run-tests.yml/badge.svg?branch=main)](https://github.com/BonnierNews/exp-correlator/actions/workflows/run-tests.yml)

Keep track of correlation id through a series of async operations. Either using a handler or an Express middleware.

## Installation
```bash
npm install exp-correlator
```

## Usage
If an execution is started using either `attachCorrelationIdHandler` or occurs after the `middleware` is attached (when
the execution is part of the call chain of a Express request) any call to `getId` during that execution will return the
same correlation id. Example of use-cases may be to pass a correlation-id onto subsequent requests to other systems or
to be able to group log messages during the same request without passing on a correlation id between each function call.

### Async handler
The async handler will set the correlation id to the supplied or generate a new uuid v4 if not supplied.

```js
const { attachCorrelationIdHandler, getId } = require("exp-correlator");
const logThis = async function (msg) {
  const correlationId = getId(); 
  console.log({correlationId, msg});
}
const f = async function () {
  ...
  logThis("epic message");
  logThis("epic message2");
  ...
};

await f();
```

In the example above all the log messages produced by logThis can be grouped togheter by the correlation id without having
to pass the correlation id as an argument every time.

### Express middleware
The Express middleware will set the correlation id from the `correlation-id` or `x-correlation-id` handler if avaiable. Otherwise a
new uuid v4 will be generated.

```js
const { middleware, getId } = require("exp-correlator");
const express = require("express");
const app = express();
const logThis = async function (msg) {
  const correlationId = getId(); 
  console.log({correlationId, msg});
}

const callToExternalSystem () {
  const correlationId = getId(); 
  await ... // call to an external system setting correlationId as a header
}

app.use(middleware);
app.get("/", (req, res) => {
  const correlationId = getId();
  await callToExternalSystem();
  logThis("epic message");
  res.json({ correlationId });
  ...
});
```

In the example above the middleware set the correlation id based on the incoming header, it will then
be passed on when doing calls to `callToExternalSystem` and `logThis` without being explicitly passed.

## Changelog
Can be found [here](CHANGELOG.md).

## License
Released under the [MIT license](https://tldrlegal.com/license/mit-license).
