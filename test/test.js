require('../codegen');

var assert = require('assert');
var fs = require('fs');

var pathocure = require('../pathocure');
var parse = pathocure.parse;
var tokenize = pathocure.tokenize;

function fixture(file) {
    if (fixture.memo[file])
        return fixture.memo;
    var path = __dirname + '/fixtures/' + file;
    fixture.memo[file] = fs.readFileSync(path, { encoding: 'utf8' });
    return fixture.memo[file];
}
fixture.memo = {};

describe('Basic SVG Path Data syntax. see http://www.w3.org/TR/SVG/paths.html#PathData', function () {
    it('separate tokens by whitespace, comma, newline', function () {
        var tokens = tokenize('M 0,0\nZ', 'text');
        assert.deepEqual(tokens, ['M', '0', '0', 'Z']);
    });
    it('superfluous separators can be eliminated', function () {
        var tokens = tokenize('M0,0Z', 'text');
        assert.deepEqual(tokens, ['M', '0', '0', 'Z']);
    });
    it('command letter can be eliminated on same subsequent commands', function () {
        var tokens = tokenize('M0,0 L1,2 3,4 Z', 'text');
        assert.deepEqual(tokens, ['M', '0', '0', 'L', '1', '2', '3', '4', 'Z']);
    });
});

describe('malformed but should be parsed well', function () {
    it('1234.path', function () {
        var tokens = tokenize(fixture('1234.path'), 'text');
        assert.deepEqual(tokens, ['M', '0', '0', 'L', '1', '2', '3', '4', 'Z']);
    });
});
