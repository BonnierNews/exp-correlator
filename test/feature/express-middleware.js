"use strict";

const { middleware, getId } = require("../../");
const express = require("express");
const request = require("supertest");
const bodyParser = require("body-parser");

Feature("express middleware", () => {
  Scenario("middleware uses correlation-id from the request", () => {
    let app;
    Given("an express app using the middleware", () => {
      app = express();
      app.use(middleware);
      app.get("/", (req, res) => {
        const correlationId = getId();
        res.json({ correlationId });
      });
    });

    let response;
    When("a request is made supplying a correlation-id", async () => {
      response = await request(app).get("/").set("correlation-id", "epic-correlation-id-1");
    });

    Then("the correlation id should be available in the response", () => {
      expect(response.body).to.deep.eql({ correlationId: "epic-correlation-id-1" });
    });
  });

  Scenario("middleware uses x-correlation-id from the request", () => {
    let app;
    Given("an express app using the middleware", () => {
      app = express();
      app.use(middleware);
      app.get("/", (req, res) => {
        const correlationId = getId();
        res.json({ correlationId });
      });
    });

    let response;
    When("a request is made supplying a x-correlation-id", async () => {
      response = await request(app).get("/").set("x-correlation-id", "epic-x-correlation-id-1");
    });

    Then("the correlation id should be available in the response", () => {
      expect(response.body).to.deep.eql({ correlationId: "epic-x-correlation-id-1" });
    });
  });

  Scenario("middleware generates a new correlation-id when none is given in the request", () => {
    let app;
    Given("an express app using the middleware", () => {
      app = express();
      app.use(middleware);
      app.get("/", (req, res) => {
        const correlationId = getId();
        res.json({ correlationId });
      });
    });

    let response;
    When("a request is made without supplying any kind of correlation id", async () => {
      response = await request(app).get("/");
    });

    Then("the correlation id should be a guid available in the response", () => {
      const { correlationId } = response.body;
      expect(correlationId).to.match(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
    });
  });

  Scenario("middleware generates and keeps track of correlation-ids during parallel processing", () => {
    let app;
    Given("an express app using the middleware", () => {
      app = express();
      app.use(middleware);
      app.get("/", (req, res) => {
        const correlationId = getId();
        res.json({ correlationId });
      });
    });

    let responses;
    When("multiple requests are made", async () => {
      responses = await Promise.all([
        request(app).get("/"),
        request(app).get("/").set("x-correlation-id", "epic-x-correlation-id-1"),
        request(app).get("/").set("correlation-id", "epic-correlation-id-1"),
      ]);
    });

    Then("the correlation ids should be unique and the expected", () => {
      const { correlationId: newCorrelationId } = responses[0].body;
      const { correlationId: xCorrelationId1 } = responses[1].body;
      const { correlationId: correlationId1 } = responses[2].body;
      expect(newCorrelationId).to.match(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
      expect(xCorrelationId1).to.eql("epic-x-correlation-id-1");
      expect(correlationId1).to.eql("epic-correlation-id-1");
    });
  });

  Scenario("middleware generates or re-uses request correlation-id when responding", () => {
    let app;
    Given("an express app using the middleware", () => {
      app = express();
      app.use(middleware);
      app.get("/", (req, res) => {
        const correlationId = getId();
        res.json({ correlationId });
      });
    });

    let responses;
    When("multiple requests are made", async () => {
      responses = await Promise.all([
        request(app).get("/"),
        request(app).get("/").set("x-correlation-id", "epic-x-correlation-id-1"),
        request(app).get("/").set("correlation-id", "epic-correlation-id-1"),
      ]);
    });

    Then("the correlation ids should be unique and the expected", () => {
      const newCorrelationId = responses[0].headers["x-correlation-id"];
      const xCorrelationId1 = responses[1].headers["x-correlation-id"];
      const correlationId = responses[2].headers["correlation-id"];

      expect(newCorrelationId).to.match(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
      expect(xCorrelationId1).to.eql("epic-x-correlation-id-1");
      expect(correlationId).to.eql("epic-correlation-id-1");
    });
  });

  Scenario("middleware priorities re-using already set response correlation-id", () => {
    let app;
    let firstCorrelationId;
    Given("an express app using middleware setup to work around body issues", () => {
      app = express();

      app.use(middleware);
      app.use((req, res, next) => {
        firstCorrelationId = res.getHeader("x-correlation-id");
        next();
      });

      app.post("/", bodyParser.json(), middleware, (req, res) => {
        const correlationId = getId();
        res.json({ correlationId });
      });
    });

    let response;
    When("request is made", async () => {
      response = await request(app).post("/");
    });

    Then("the correlation id should be preserved between multiple middleware uses", () => {
      const newCorrelationId = response.headers["x-correlation-id"];

      expect(newCorrelationId).to.match(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
      expect(newCorrelationId).to.eql(firstCorrelationId);
    });
  });

});
