var parser = require('./bin/pathocure.parser');
var lexer = new require('jison-lex')(require('./bin/pathocure.parser.json').lex);

function Renderer(ast, parent, file) {
    if (ast === undefined)
        throw new Error('ast is required');
    this.ast = ast;
    this.file = file; // path of file
    this.parent = parent === undefined ? null : parent;
    this.environment = null;
    this.result = '';
    this.init();
}

function RenderError(message, lloc, file) {
    this.message = message || '';
    this.lloc = lloc;
    this.file = file;
}
RenderError.prototype.name = 'RenderError';

var builtin = {
    M: function (x, y) { this.result += 'M' + x + ',' + y; },
    m: function (x, y) { this.result += 'm' + x + ',' + y; },
    Z: function () { this.result += 'Z'; },
    z: function () { this.result += 'z'; },
    L: function (x, y) { this.result += 'L' + x + ',' + y; },
    l: function (x, y) { this.result += 'l' + x + ',' + y; },
    H: function (x) { this.result += 'H' + x; },
    h: function (x) { this.result += 'h' + x; },
    V: function (y) { this.result += 'V' + y; },
    v: function (y) { this.result += 'v' + y; },
    C: function (x1, y1, x2, y2, x, y) { this.result += 'C' + x1 + ',' + y1 + ' ' + x2 + ',' + y2 + ' ' + x + ',' + y; },
    c: function (x1, y1, x2, y2, x, y) { this.result += 'c' + x1 + ',' + y1 + ' ' + x2 + ',' + y2 + ' ' + x + ',' + y; },
    S: function (x2, y2, x, y) { this.result += 'S' + x2 + ',' + y2 + ' ' + x + ',' + y; },
    s: function (x2, y2, x, y) { this.result += 's' + x2 + ',' + y2 + ' ' + x + ',' + y; },
    Q: function (x1, y1, x, y) { this.result += 'Q' + x1 + ',' + y1 + ' ' + x + ',' + y; },
    q: function (x1, y1, x, y) { this.result += 'q' + x1 + ',' + y1 + ' ' + x + ',' + y; },
    T: function (x, y) { this.result += 'T' + x + ',' + y; },
    t: function (x, y) { this.result += 't' + x + ',' + y; },
    A: function (rx, ry, x_axis_rotation, large_arc_flag, sweep_flag, x, y) { this.result += 'A' + rx + ',' + ry + ' ' + x_axis_rotation + ' ' + large_arc_flag + ',' + sweep_flag + ' ' + x + ',' + y; },
    a: function (rx, ry, x_axis_rotation, large_arc_flag, sweep_flag, x, y) { this.result += 'a' + rx + ',' + ry + ' ' + x_axis_rotation + ' ' + large_arc_flag + ',' + sweep_flag + ' ' + x + ',' + y; }
};

Renderer.prototype.init = function init() {
    this.environment = {};
    this.result = '';
};

Renderer.prototype.resolveName = function resolveName(name) {
    if (this.environment[name])
        return this.environment[name];
    if (this.parent)
        return this.parent.resolveName(name);
    return builtin[name];
};

Renderer.prototype.evaluate = function evaluate(expression) {
    switch (expression.type) {
    case 'number':
        return +(expression.tree[0]);
    }
    throw RenderError('unexpected expression type: ' + expression.type, expression.lloc, this.file);
};

Renderer.prototype.render = function render(args) {
    this.init();
    var evaluateArguments = function evaluateArguments(args) {
        return args.map(function (expression) {
            return this.evaluate(expression);
        }.bind(this));
    }.bind(this);
    this.ast.forEach(function (node) {
        switch (node.type) {
        case 'command':
            (function () {
                var commandName = node.tree[0];
                var commandArguments = node.tree[1];
                var command = this.resolveName(commandName);
                if (command === undefined)
                    throw new RenderError('undefined command: ' + commandName, node.lloc, this.file);
                if (command.length === 0) {
                    command.call(this);
                } else {
                    for (var i = 0; i < commandArguments.length; i += command.length) {
                        var argumentsFragment = commandArguments.slice(i, i + command.length);
                        if (argumentsFragment.length < command.length) {
                            throw new RenderError([
                                    commandName, ': ', command.length, ' ',
                                    (command.length === 1 ? 'argument' : 'arguments'),
                                    ' required, but only ', argumentsFragment.length, ' present.'
                                ].join(''),
                                node.lloc, this.file
                            );
                        }
                        command.apply(this, evaluateArguments(argumentsFragment));
                    }
                }
            }.bind(this))();
            break;
        }
    }.bind(this));
    return this.result;
};

function parse(code) {
    return parser.parse(code);
}

function tokenize(code, prop) {
    lexer.setInput(code);
    function nextToken() {
        return {
            type: lexer.lex(),
            text: lexer.yytext,
            lloc: lexer.yylloc
        };
    }
    var result = [];
    var token = nextToken();
    while (token.type !== lexer.EOF) {
        if (prop !== undefined)
            result.push(token[prop]);
        else
            result.push(token);
        token = nextToken();
    }
    return result;
}

exports.RenderError = RenderError;
exports.parse = parse;
exports.tokenize = tokenize;
exports.render = function render(code, args, file) {
    var ast = parse(code);
    var renderer = new Renderer(ast, undefined, file);
    return renderer.render(args);
};
