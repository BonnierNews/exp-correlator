# exp-correlator
[![Test application](https://github.com/BonnierNews/exp-correlator/actions/workflows/run-tests.yml/badge.svg?branch=main)](https://github.com/BonnierNews/exp-correlator/actions/workflows/run-tests.yml)

Keep track of correlation id through a series of async operations. Either using a handler or an Express middleware. Uses
[async_hooks](https://nodejs.org/docs/latest-v16.x/api/async_hooks.html).


## Table of contents

- [Installation](#installation)
- [Usage](#usage)
  - [Async handler](#async-handler)
  - [Express middleware](#express-middleware)
  - [Logging with pino](#logging-with-pino)
  - [Making requests with exp-fetch](#making-requests-with-exp-fetch)
- [Changelog](#changelog)
- [License](#license)


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

await attachCorrelationIdHandler(f);
```

In the example above all the log messages produced by logThis can be grouped together by the correlation id without having
to pass the correlation id as an argument every time.

### Express middleware
The Express middleware will set the correlation id from the `correlation-id` or `x-correlation-id` header if available. Otherwise a
new uuid v4 will be generated. The middleware also assigns the correlation-id to the response, matching the header of incoming correlation-id if
it's available. 

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

### Logging with pino
To add correlationId when logging using [pino](https://www.npmjs.com/package/pino) do the following:
```js
const { getId } = require("exp-correlator");
const pino = require("pino");
const logger = pino({mixin: () => {return { correlationId: getId() };}});
```

In the example above the correct correlation id will be added each time a log function is called when
the express middleware or the async handler is used.

### Making requests with exp-fetch
To add a correlation id when fetching using [exp-fetch](https://www.npmjs.com/package/exp-fetch) do the
following:
```js
const { getId } = require("exp-correlator");
const fetchBuilder = require("exp-fetch);
const fetch = fetchBuilder({ getCorrelationId: getId }).fetch;
await fetch("http://foo.bar");
```

In the example above the correlation id will be added to the outgoing requests headers as `correlation-id`.

## Known issues 
Using bodyParser after using correlation middleware will cause the async local storage to be undefined. 
```js
const { middleware, getId } = require("exp-correlator");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const logThis = async function (msg) {
  const correlationId = getId(); // correlationId will be null here
  console.log({correlationId, msg});
}

app.use(middleware);

// this won't work, bodyParser is used after correlation middleware for this route
app.post("/", bodyParser.json(), (req, res) => {
  const correlationId = getId();
  await callToExternalSystem();
  logThis("epic message");
  res.json({ correlationId });
  ...
});

// workaround add the correlation middleware after the bodyParser
app.post("/", bodyParser.json(), middleware, (req, res) => {
  const correlationId = getId();
  await callToExternalSystem();
  logThis("epic message");
  res.json({ correlationId });
  ...
});

```

## Changelog
Can be found [here](CHANGELOG.md).

## License
Released under the [MIT license](https://tldrlegal.com/license/mit-license).
