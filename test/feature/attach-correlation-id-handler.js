"use strict";

const { expect } = require("chai");
const { attachCorrelationIdHandler, getId } = require("../../");

Feature("attach correlation id handler", () => {
  Scenario("attaching the correlation id handler with a given correlation id", () => {
    let f;
    Given("an epic chain of async functions", () => {
      const g = () => new Promise((resolve) => resolve(getId()));
      f = async function () {
        const output = [];
        output.push(getId());
        const a = await g();
        output.push(a);
        return output;
      };
    });

    let output;
    When("the chain of async functions are run with the correlation id handler with a supplied correlation id", async () => {
      output = await attachCorrelationIdHandler(f, "epic-correlation-id");
    });

    Then("the output should be an array with the supplied correlation id", () => {
      expect(output).to.deep.equal([ "epic-correlation-id", "epic-correlation-id" ]);
    });
  });

  Scenario("attaching the correlation id handler without a correlation id", () => {
    let f;
    Given("an epic chain of async functions", () => {
      const g = () => new Promise((resolve) => resolve(getId()));
      f = async function () {
        const output = [];
        output.push(getId());
        const a = await g();
        output.push(a);
        return output;
      };
    });

    let output;
    When("the chain of async functions are run with the correlation id handler with a supplied correlation id", async () => {
      output = await attachCorrelationIdHandler(f);
    });

    Then("the output should be an array with a new correlation id", () => {
      expect(output).to.have.length(2);
      const [ correlationId1, correlationId2 ] = output;
      expect(correlationId1).to.match(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i);
      expect(correlationId1).to.eql(correlationId2);
    });
  });

  Scenario("the correlation id handler keeps track of correlation ids when parallell processing", () => {
    let f;
    Given("an epic chain of async functions", () => {
      const g = () => new Promise((resolve) => resolve(getId()));
      f = async function () {
        const output = [];
        output.push(getId());
        const a = await g();
        output.push(a);
        return output;
      };
    });

    let outputs;
    When("the chain of async functions are run multiple times in parallell with different correlation ids", async () => {
      outputs = await Promise.all([
        attachCorrelationIdHandler(f, "epic-correlation-id-1"),
        attachCorrelationIdHandler(f, "epic-correlation-id-2"),
        attachCorrelationIdHandler(f, "epic-correlation-id-3"),
      ]);
    });

    Then("the outputs should have the expected correlationIds", () => {
      expect(outputs).to.have.length(3);
      let i = 1;
      for (const output of outputs ) {
        expect(output).to.have.length(2);
        const [ correlationId1, correlationId2 ] = output;
        expect(correlationId1).to.eql(`epic-correlation-id-${i}`);
        expect(correlationId2).to.eql(correlationId1);
        i++;
      }
    });
  });
});
