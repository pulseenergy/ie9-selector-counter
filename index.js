
module.exports = require('./lib/counter.js');

var path = require('path');

module.exports.count(path.resolve(process.argv[2]), console.log);
