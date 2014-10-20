require('../codegen');

var assert = require('assert');
var fs = require('fs');
var util = require('util');

var psykorpath = require('../psykorpath');
var parse = psykorpath.parse;
var tokenize = psykorpath.tokenize;
var render = psykorpath.render;

function fixture(file) {
    if (fixture.memo[file])
        return fixture.memo[file];
    var path = __dirname + '/fixtures/' + file;
    fixture.memo[file] = fs.readFileSync(path, { encoding: 'utf8' });
    return fixture.memo[file];
}
fixture.memo = {};

function print(obj) {
    console.log(util.inspect(obj, { depth: 10 }));
}

describe('Basic SVG Path Data syntax. see http://www.w3.org/TR/SVG/paths.html#PathData', function () {
    it('separate tokens', function () {
        var tokens = tokenize('M 0,0\nZ', 'text');
        assert.deepEqual(tokens, ['M', '0', ',', '0', 'Z']);
    });
    it('superfluous separators can be eliminated', function () {
        var tokens = tokenize('M0,0Z', 'text');
        assert.deepEqual(tokens, ['M', '0', ',', '0', 'Z']);
    });
    it('command letter can be eliminated on same subsequent commands', function () {
        var tokens = tokenize('M0,0 L1,2 3,4 Z', 'text');
        assert.deepEqual(tokens, ['M', '0', ',', '0', 'L', '1', ',', '2', '3', ',', '4', 'Z']);
    });
});

describe('malformed but should be parsed well', function () {
    it('1234.path', function () {
        var tokens = tokenize(fixture('1234.path'), 'text');
        assert.deepEqual(tokens, ['M', '0', '0', 'L', '1', '2', '3', '4', 'Z']);
    });
});

describe('prop', function () {
    it('check result', function () {
        var result = render(fixture('prop.path'), [1, 2, 3, 4]);
        assert.equal(result, 'M1,2M3,4');
    });
    it('range - min', function () {
        var result = render(fixture('prop.path'), [1, 0, 3, 4]);
        assert.equal(result, 'M1,1M3,4');
    });
    it('range - max', function () {
        var result = render(fixture('prop.path'), [1, 3, 3, 4]);
        assert.equal(result, 'M1,2M3,4');
    });
    it('default', function () {
        var result = render(fixture('prop.path'), [1, 2, undefined, undefined]);
        assert.equal(result, 'M1,2M3,5');
    });
    it('default in builtin', function () {
        assert.throws(function () {
            render(fixture('defaultinbuiltin.path'), []);
        }, psykorpath.RenderError);
    });
});

describe('set', function () {
    it('check result', function () {
        var result = render(fixture('set.path'), []);
        assert.equal(result, 'M1,2L3,4');
    });
    it('use with prop', function () {
        var result = render(fixture('setwithprop.path'), [undefined, undefined]);
        assert.equal(result, 'M1,2L3,4');
    });
});

describe('arithmetic operators', function () {
    it('check result', function () {
        var result = render(fixture('addmul.path'), [1, 2, 3, 4]);
        assert.equal(result, 'M0,0L3,12L6,0Z');
    });
    describe('prefix', function () {
        it('useless', function () {
            var result = render('M + 1, - 0', []);
            assert.equal(result, 'M1,0');
        });
        it('where to use plus?', function () {
            var result = render('M + 2, + 0', []);
            assert.equal(result, 'M2,0');
        });
        it('minus', function () {
            var result = render('M - 2, 0', []);
            assert.equal(result, 'M-2,0');
        });
    });
    it('add', function () {
        var result = render('M 1 + 1 0', []);
        assert.equal(result, 'M2,0');
    });
    it('sub', function () {
        var result = render('M 1 - 1 0', []);
        assert.equal(result, 'M0,0');
    });
    it('mul', function () {
        var result = render('M 2 * 3 0', []);
        assert.equal(result, 'M6,0');
    });
    it('div', function () {
        var result = render('M 3 / 2 0', []);
        assert.equal(result, 'M1.5,0');
    });
    it('priority', function () {
        var result = render('M 2 + 3 * 4, 0', []);
        assert.equal(result, 'M14,0');
    });
    it('bracket', function () {
        var result = render('M (2 + 3) * 4, 0', []);
        assert.equal(result, 'M20,0');
    });
});
