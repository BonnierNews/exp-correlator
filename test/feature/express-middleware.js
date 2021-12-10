"use strict";

const { middleware, getId } = require("../../");
const express = require("express");
const request = require("supertest");

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

    Then("the correlation id should be a guid availablee in the response", () => {
      const { correlationId } = response.body;
      expect(correlationId).to.match(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
    });
  });

  Scenario("middleware generates and keeps track of correlation-ids during parallell processing", () => {
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

});
