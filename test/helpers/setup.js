"use strict";
process.env.NODE_ENV = "test";

const chai = require("chai");

chai.config.truncateThreshold = 0;
chai.config.includeStack = true;

global.expect = chai.expect;
