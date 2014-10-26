require('../codegen');

var assert = require('assert');
var fs = require('fs');
var util = require('util');
var path = require('path');

var tempath = require('../tempath');
var parse = tempath.parse;
var tokenize = tempath.tokenize;
var render = tempath.render;

tempath.resolveFilePath = function resolveFilePath(from, file) {
    from = from || '.';
    file = path.resolve(path.dirname(from), file);
    return file;
};
tempath.importFileAsAST = function importFileAsAST(file) {
    var code;
    try {
        code = fs.readFileSync(file, { encoding: 'utf8' });
    } catch (e) {
        return undefined;
    }
    var ast = tempath.parse(code);
    return ast;
};

function fixturePath(file) {
    var filePath = __dirname + '/fixtures/' + file;
    return path.resolve(filePath);
}

function fixture(file) {
    if (fixture.memo[file])
        return fixture.memo[file];
    var filePath = __dirname + '/fixtures/' + file;
    fixture.memo[file] = fs.readFileSync(filePath, { encoding: 'utf8' });
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
        }, tempath.RenderError);
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

describe('relational operators', function () {
    describe('<', function () {
        it('eq', function () {
            var result = render('M 1 < 1 0', []);
            assert.equal(result, 'M0,0');
        });
        it('lt', function () {
            var result = render('M 1 < 2 0', []);
            assert.equal(result, 'M1,0');
        });
        it('gt', function () {
            var result = render('M 2 < 1 0', []);
            assert.equal(result, 'M0,0');
        });
    });
    describe('>', function () {
        it('eq', function () {
            var result = render('M 1 > 1 0', []);
            assert.equal(result, 'M0,0');
        });
        it('lt', function () {
            var result = render('M 1 > 2 0', []);
            assert.equal(result, 'M0,0');
        });
        it('gt', function () {
            var result = render('M 2 > 1 0', []);
            assert.equal(result, 'M1,0');
        });
    });
    describe('<=', function () {
        it('eq', function () {
            var result = render('M 1 <= 1 0', []);
            assert.equal(result, 'M1,0');
        });
        it('lt', function () {
            var result = render('M 1 <= 2 0', []);
            assert.equal(result, 'M1,0');
        });
        it('gt', function () {
            var result = render('M 2 <= 1 0', []);
            assert.equal(result, 'M0,0');
        });
    });
    describe('>=', function () {
        it('eq', function () {
            var result = render('M 1 >= 1 0', []);
            assert.equal(result, 'M1,0');
        });
        it('lt', function () {
            var result = render('M 1 >= 2 0', []);
            assert.equal(result, 'M0,0');
        });
        it('gt', function () {
            var result = render('M 2 >= 1 0', []);
            assert.equal(result, 'M1,0');
        });
    });
    describe('=', function () {
        it('eq', function () {
            var result = render('M 1 = 1 0', []);
            assert.equal(result, 'M1,0');
        });
        it('lt', function () {
            var result = render('M 1 = 2 0', []);
            assert.equal(result, 'M0,0');
        });
        it('gt', function () {
            var result = render('M 2 = 1 0', []);
            assert.equal(result, 'M0,0');
        });
    });
});

describe('logical operators', function () {
    describe('not', function () {
        it('1', function () {
            var result = render('M not 1 0', []);
            assert.equal(result, 'M0,0');
        });
        it('0', function () {
            var result = render('M not 0 0', []);
            assert.equal(result, 'M1,0');
        });
        it('-1', function () {
            var result = render('M not - 1 0', []);
            assert.equal(result, 'M1,0');
        });
    });
    describe('and', function () {
        it('0 0', function () {
            var result = render('M 0 and 0 0', []);
            assert.equal(result, 'M0,0');
        });
        it('0 1', function () {
            var result = render('M 0 and 1 0', []);
            assert.equal(result, 'M0,0');
        });
        it('1 0', function () {
            var result = render('M 1 and 0 0', []);
            assert.equal(result, 'M0,0');
        });
        it('1 1', function () {
            var result = render('M 1 and 1 0', []);
            assert.equal(result, 'M1,0');
        });
    });
    describe('or', function () {
        it('0 0', function () {
            var result = render('M 0 or 0 0', []);
            assert.equal(result, 'M0,0');
        });
        it('0 1', function () {
            var result = render('M 0 or 1 0', []);
            assert.equal(result, 'M1,0');
        });
        it('1 0', function () {
            var result = render('M 1 or 0 0', []);
            assert.equal(result, 'M1,0');
        });
        it('1 1', function () {
            var result = render('M 1 or 1 0', []);
            assert.equal(result, 'M1,0');
        });
    });
});

describe('loop', function () {
    describe('for...in', function () {
        it('check result', function () {
            var result = render(fixture('forin.path'), []);
            assert.equal(result, 'L1,2L2,4L3,6L3,6L2,4L1,2');
        });
        it('four lines', function () {
            var result = render(fixture('fourlines.path'), []);
            assert.equal(result, 'M0,0L0,10M10,0L10,10M20,0L20,10M30,0L30,10');
        });
        it('scope', function () {
            var result = render(fixture('scope.path'), []);
            assert.equal(result, 'M1,1M1,2M1,3');
        });
        it('dynamic range', function () {
            var result = render(fixture('dynamic_range.path'), []);
            assert.equal(result, 'M1,0M2,0M3,0');
        });
    });
});

describe('import', function () {
    it('check result', function () {
        var result = render(fixture('import.path'), [], fixturePath('import.path'));
        assert.equal(result, 'M0,0L50,0L50,50L0,50Z');
    });
});

describe('def', function () {
    it('check result', function () {
        var result = render(fixture('rect.path'), []);
        assert.equal(result, 'M0,0L50,0L50,50L0,50Z');
    });
});

describe('if', function () {
    it('true condition', function () {
        var result = render(fixture('if.path'), [0]);
        assert.equal(result, 'M1,0Z');
    });
    it('false condition', function () {
        var result = render(fixture('if.path'), [1]);
        assert.equal(result, 'M0,0Z');
    });
});

describe('function', function () {
    it('call', function () {
        var result = render(fixture('cos.path'), [0]);
        assert.equal(result, 'M-1,0Z');
    });
});
