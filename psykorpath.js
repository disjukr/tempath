var parser = require('./bin/psykorpath.parser');
var lexer = new require('jison-lex')(require('./bin/psykorpath.parser.json').lex);

function Renderer(ast, file, caller, lloc) {
    if (ast === undefined)
        throw new Error('ast is required');
    this.ast = ast;
    this.file = file; // path of file
    this.caller = caller; // renderer
    this.lloc = lloc; // called from
    this.args = null;
    this.scope = null;
    this.result = '';
    this.init();
}

function RenderError(message, line, column, file) {
    this.message = message || '';
    this.line = line;
    this.column = column;
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
Object.keys(builtin).forEach(function (commandName) {
    builtin[commandName].isBuiltin = true;
});

Renderer.prototype.init = function init(args) {
    this.args = args;
    this.scope = new Scope(this.caller && this.caller.scope);
    this.result = '';
};

Renderer.prototype.get = function get(name) {
    return this.scope.get(name);
};

Renderer.prototype.set = function set(name, value) {
    this.scope.set(name, value);
};

Renderer.prototype.evaluate = function evaluate(expression) {
    switch (expression.type) {
    case 'number':
        return +(expression.tree[0]);
    case 'lvalue':
        return (function () {
            var name = expression.tree[0];
            var value = this.get(name);
            if (value === undefined) {
                throw new RenderError(
                    'undefined variable: ' + name,
                    expression.lloc.first_line,
                    expression.lloc.first_column,
                    this.file
                );
            }
            return value;
        }.bind(this))();
    case 'prefix +':
        return +(this.evaluate(expression.tree[0]));
    case 'prefix -':
        return -(this.evaluate(expression.tree[0]));
    case '+':
        return this.evaluate(expression.tree[0]) + this.evaluate(expression.tree[1]);
    case '-':
        return this.evaluate(expression.tree[0]) - this.evaluate(expression.tree[1]);
    case '*':
        return this.evaluate(expression.tree[0]) * this.evaluate(expression.tree[1]);
    case '/':
        return this.evaluate(expression.tree[0]) / this.evaluate(expression.tree[1]);
    case '%':
        return this.evaluate(expression.tree[0]) % this.evaluate(expression.tree[1]);
    }
    throw new RenderError(
        'unexpected expression type: ' + expression.type,
        expression.lloc.first_line,
        expression.lloc.first_column,
        this.file
    );
};

Renderer.prototype.render = function render(args) {
    this.init(args);
    this.ast.forEach(function (node) {
        if (this.render[node.type] === undefined) {
            throw new RenderError(
                'unexpected command type: ' + node.type,
                node.lloc.first_line,
                node.lloc.first_column,
                this.file
            );
        } else {
            this.render[node.type].call(this, node);
        }
    }.bind(this));
    return this.result;
};
Renderer.prototype.render['command'] = function (node) {
    var commandName = node.tree[0];
    var commandArguments = node.tree[1];
    var command = this.get(commandName);
    if (command === undefined) {
        throw new RenderError(
            'undefined command: ' + commandName,
            node.lloc.first_line,
            node.lloc.first_column,
            this.file
        );
    }
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
                    node.lloc.last_line, node.lloc.last_column, this.file
                );
            }
            if (command.isBuiltin) {
                command.apply(this, evaluateArguments.call(this, argumentsFragment, true));
            } else {
                throw new RenderError(
                    'custom command is not supported for now: ' + commandName,
                    node.lloc.first_line,
                    node.lloc.first_column,
                    this.file
                );
            }
        }
    }
    function evaluateArguments(args, forBuiltin) {
        return args.map(function (argument) {
            if (argument.type === 'default') {
                if (forBuiltin) {
                    throw new RenderError(
                        'default is not allowed for builtin command',
                        argument.lloc.first_line,
                        argument.lloc.first_column,
                        this.file
                    );
                } else {
                    return undefined;
                }
            }
            return this.evaluate(argument);
        }.bind(this));
    }
};
Renderer.prototype.render['prop'] = function (node) {
    var prop_definitions = node.tree[0];
    prop_definitions.forEach(function (definition) {
        var name, range, rangeMin, rangeMax, defaultValue;
        var value = this.args.shift();
        switch (definition.type) {
        case 'name':
            name = definition.tree[0];
            break;
        case 'name range':
            name = definition.tree[0];
            range = definition.tree[1];
            break;
        case 'name default':
            name = definition.tree[0];
            defaultValue = definition.tree[1];
            break;
        case 'name range default':
            name = definition.tree[0];
            range = definition.tree[1];
            defaultValue = definition.tree[2];
            break;
        default:
            throw new RenderError(
                'unexpected prop definition type: ' + definition.type,
                definition.lloc.first_line,
                definition.lloc.first_column,
                this.file
            );
        }
        if (typeof value !== 'number' || isNaN(value)) {
            if (defaultValue !== undefined) {
                value = this.evaluate(defaultValue);
            } else {
                if (value === undefined) { // default
                    throw new RenderError(
                        'there is no default value: ' + name,
                        this.lloc && this.lloc.first_line,
                        this.lloc && this.lloc.first_column,
                        this.caller && this.caller.file
                    );
                } else {
                    throw new RenderError(
                        'input value is not a number: ' + value,
                        definition.lloc.first_line,
                        definition.lloc.first_column,
                        this.file
                    );
                }
            }
        }
        if (range !== undefined) {
            rangeMin = range.tree[0];
            rangeMax = range.tree[1];
            value = Math.max(Math.min(value, rangeMax), rangeMin);
        }
        this.set(name, value);
    }.bind(this));
};
Renderer.prototype.render['set'] = function (node) {
    var name = node.tree[0];
    var value = this.evaluate(node.tree[1]);
    this.set(name, value);
};
Renderer.prototype.render['for in range'] = function (node) {
    var i = node.tree[0];
    var j;
    var range = node.tree[1];
    var rangeMin = range.tree[0] | 0;
    var rangeMax = range.tree[1] | 0;
    var ast = node.tree[2];
    var parentScope = this.scope;
    this.scope = new Scope(this.scope);
    function loop(node) {
        if (this.render[node.type] === undefined) {
            throw new RenderError(
                'unexpected command type: ' + node.type,
                node.lloc.first_line,
                node.lloc.first_column,
                this.file
            );
        } else {
            this.render[node.type].call(this, node);
        }
    }
    if (rangeMax < rangeMin) {
        for (j = rangeMin; j >= rangeMax; --j) {
            this.set(i, j);
            ast.forEach(loop.bind(this));
        }
    } else {
        for (j = rangeMin; j <= rangeMax; ++j) {
            this.set(i, j);
            ast.forEach(loop.bind(this));
        }
    }
    this.scope = parentScope;
};

function Scope(parent) {
    this.environment = {};
}

Scope.prototype.get = function get(name) {
    if (this.environment[name] !== undefined)
        return this.environment[name];
    if (this.parent)
        return this.parent.get(name);
    return builtin[name];
};

Scope.prototype.set = function set(name, value) {
    this.environment[name] = value;
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
    var renderer = new Renderer(ast, file, undefined, undefined);
    return renderer.render(args);
};
