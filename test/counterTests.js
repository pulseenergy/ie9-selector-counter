var assert = require('assert');
var counter = require('../lib/counter');
var fs = require('fs');
var path = require('path');
var https = require('https');
var nock = require('nock');

describe("counter", function () {
	it("processes imports as expected", function (done) {
		var stubData = fs.readFileSync(path.resolve(__dirname, './testFiles/c.css'));
		nock('http://localhost:9000')
			.get('/testFiles/c.css')
			.reply(200, stubData);

		counter.count(path.resolve(__dirname, "./testFiles/root.css"), function (count) {
			assert.equal(count, 4, "After importing there should be 4 selectors. Count = " + count);
			done();
		});
	});
});