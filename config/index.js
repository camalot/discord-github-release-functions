"use strict";
const merge = require("merge");
let outConfig = {
  environment: process.env.NODE_ENV || ""
};

outConfig.isProduction = !(outConfig.environment === "dev" ||
  outConfig.environment === "" ||
  outConfig.environment === null ||
  outConfig.environment === undefined ||
  outConfig.environment === "development");


const normalizedPath = require("path").join(__dirname, "./");
require("fs")
  .readdirSync(normalizedPath)
  .forEach(function (file) {
    var configMatch = /.*?\.config\.js/i;
    if (
      file !== "index.js" &&
      file !== "config.js" &&
      configMatch.test(file)
    ) {
      outConfig = merge(outConfig, require("./" + file));
    }
  });

let result = merge({}, outConfig);
module.exports = result;
