const { expect } = require("chai");
const supertest = require("supertest");

global.expect = expect;
global.supertest = supertest;

/*
If using ESLint, add the following data to .eslintrc.js
"globals": {
    "supertest": true,
    "expect": true
}
*/
