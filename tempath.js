;(function (exports) {
var nodejs = typeof window === 'undefined';
if (nodejs) {
    exports._parser = require('./bin/tempath.parser');
    exports._lexer = new require('jison-lex')(require('./bin/tempath.parser.json').lex);
}

function Renderer(ast, file) {
    if (ast === undefined)
        throw new Error('ast is required');
    this.ast = ast;
    this.file = file; // path of file
    this.caller = null; // renderer
    this.lloc = null; // called from
    this.args = null;
    this.scope = null;
    this.props = null;
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

function bool(number) {
    return (number > 0) | 0;
}
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
    A: function (rx, ry, x_axis_rotation, large_arc_flag, sweep_flag, x, y) { this.result += 'A' + rx + ',' + ry + ' ' + x_axis_rotation + ' ' + bool(large_arc_flag) + ',' + bool(sweep_flag) + ' ' + x + ',' + y; },
    a: function (rx, ry, x_axis_rotation, large_arc_flag, sweep_flag, x, y) { this.result += 'a' + rx + ',' + ry + ' ' + x_axis_rotation + ' ' + bool(large_arc_flag) + ',' + bool(sweep_flag) + ' ' + x + ',' + y; }
};
var builtinFunction = {
    ceil: Math.ceil,
    round: Math.round,
    floor: Math.floor,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    sqrt: Math.sqrt,
    atan2: Math.atan2
};
Object.keys(builtin).forEach(function (commandName) {
    builtin[commandName].isBuiltin = true;
});
Object.keys(builtinFunction).forEach(function (commandName) {
    builtinFunction[commandName].isBuiltin = true;
});

Renderer.prototype.init = function init(args, caller, lloc) {
    this.args = args || [];
    this.caller = caller || undefined;
    this.lloc = lloc || undefined;
    this.scope = new Scope(this.caller && this.caller.scope);
    this.props = this.getPropDefinitions();
    this.result = '';
};

Renderer.prototype.getPropDefinitions = function getPropDefinitions() {
    var result = [];
    this.ast.filter(function (node) {
        return node.type === 'prop';
    }).forEach(function (prop) {
        var prop_definitions = prop.tree[0];
        prop_definitions.forEach(function (definition) {
            var name, range, defaultValue;
            switch (definition.type) {
            case 'name':
                name = definition.tree[0];
                break;
            case 'name range':
                name = definition.tree[0];
                range = this.evaluate(definition.tree[1]);
                break;
            case 'name default':
                name = definition.tree[0];
                defaultValue = this.evaluate(definition.tree[1]);
                break;
            case 'name range default':
                name = definition.tree[0];
                range = this.evaluate(definition.tree[1]);
                defaultValue = this.evaluate(definition.tree[2]);
                break;
            default:
                throw new RenderError(
                    'unexpected prop definition type: ' + definition.type,
                    definition.lloc.first_line,
                    definition.lloc.first_column,
                    this.file
                );
            }
            result.push({ name: name, range: range, defaultValue: defaultValue });
        }.bind(this));
    }.bind(this));
    this.length = result.length;
    return result;
};

Renderer.prototype.get = function get(name) {
    return this.scope.get(name);
};

Renderer.prototype.set = function set(name, value) {
    this.scope.set(name, value);
};

Renderer.prototype.getFunction = function getFunction(name) {
    return this.scope.getFunction(name);
};

Renderer.prototype.setFunction = function setFunction(name, value) {
    this.scope.setFunction(name, value);
};

Renderer.prototype.evaluate = function evaluate(expression) {
    switch (expression.type) {
    case 'function call':
        return (function () {
            var fnName = expression.tree[0];
            var fn = this.getFunction(fnName);
            if (fn === undefined) {
                throw new RenderError(
                    'undefined function: ' + fnName,
                    expression.lloc.first_line,
                    expression.lloc.first_column,
                    this.file
                );
            }
            var forBuiltin = fn.isBuiltin;
            var args = expression.tree[1];
            args = args.map(function (argument) {
                if (argument.type === 'default') {
                    if (forBuiltin) {
                        throw new RenderError(
                            'default is not allowed for builtin function',
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
            if (forBuiltin)
                return fn.apply(this, args);
            else
                return fn.apply(this, args, expression.lloc);
        }.bind(this))();
    case 'range':
        return {
            start: this.evaluate(expression.tree[0]),
            end: this.evaluate(expression.tree[1])
        };
    case 'string':
        return expression.tree[0];
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
    case '*':
        return this.evaluate(expression.tree[0]) * this.evaluate(expression.tree[1]);
    case '/':
        return this.evaluate(expression.tree[0]) / this.evaluate(expression.tree[1]);
    case '%':
        return this.evaluate(expression.tree[0]) % this.evaluate(expression.tree[1]);
    case '+':
        return this.evaluate(expression.tree[0]) + this.evaluate(expression.tree[1]);
    case '-':
        return this.evaluate(expression.tree[0]) - this.evaluate(expression.tree[1]);
    case '<':
        return (this.evaluate(expression.tree[0]) < this.evaluate(expression.tree[1])) | 0;
    case '>':
        return (this.evaluate(expression.tree[0]) > this.evaluate(expression.tree[1])) | 0;
    case '<=':
        return (this.evaluate(expression.tree[0]) <= this.evaluate(expression.tree[1])) | 0;
    case '>=':
        return (this.evaluate(expression.tree[0]) >= this.evaluate(expression.tree[1])) | 0;
    case '=':
        return (this.evaluate(expression.tree[0]) === this.evaluate(expression.tree[1])) | 0;
    case 'not':
        return bool(this.evaluate(expression.tree[0])) ^ 1;
    case 'and':
        return bool(this.evaluate(expression.tree[0])) & bool(this.evaluate(expression.tree[1]));
    case 'or':
        return bool(this.evaluate(expression.tree[0])) | bool(this.evaluate(expression.tree[1]));
    }
    throw new RenderError(
        'unexpected expression type: ' + expression.type,
        expression.lloc.first_line,
        expression.lloc.first_column,
        this.file
    );
};

Renderer.prototype.apply = function apply(caller, args, lloc) {
    this.render(args, caller, lloc);
    caller.result += this.result;
};

Renderer.prototype.runCommand = function runCommand(node) {
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
};

Renderer.prototype.render = function render(args, caller, lloc) {
    this.init(args, caller, lloc);
    this.ast.forEach(this.runCommand.bind(this));
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
        command.apply(this, [], node.lloc);
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
                // builtin command is function
                command.apply(this, evaluateArguments.call(this, argumentsFragment, true));
            } else {
                // custom command is renderer
                command.apply(
                    this, evaluateArguments.call(this, argumentsFragment, false),
                    node.lloc
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
            range = this.evaluate(definition.tree[1]);
            break;
        case 'name default':
            name = definition.tree[0];
            defaultValue = this.evaluate(definition.tree[1]);
            break;
        case 'name range default':
            name = definition.tree[0];
            range = this.evaluate(definition.tree[1]);
            defaultValue = this.evaluate(definition.tree[2]);
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
                value = defaultValue;
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
            rangeMin = Math.min(range.start, range.end);
            rangeMax = Math.max(range.start, range.end);
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
    var range = this.evaluate(node.tree[1]);
    var start = Math.floor(range.start);
    var end = Math.floor(range.end);
    var ast = node.tree[2];
    var parentScope = this.scope;
    this.scope = new Scope(this.scope);
    if (end < start) {
        for (j = start; j >= end; --j) {
            this.set(i, j);
            ast.forEach(this.runCommand.bind(this));
        }
    } else {
        for (j = start; j <= end; ++j) {
            this.set(i, j);
            ast.forEach(this.runCommand.bind(this));
        }
    }
    this.scope = parentScope;
};
Renderer.prototype.render['if'] = function (node) {
    var condition = this.evaluate(node.tree[0]);
    var ast = node.tree[1];
    var parentScope = this.scope;
    this.scope = new Scope(this.scope);
    if (bool(condition))
        ast.forEach(this.runCommand.bind(this));
    this.scope = parentScope;
};
Renderer.prototype.render['if else'] = function (node) {
    var condition = this.evaluate(node.tree[0]);
    var trueAst = node.tree[1];
    var falseAst = node.tree[2];
    var parentScope = this.scope;
    this.scope = new Scope(this.scope);
    if (bool(condition))
        trueAst.forEach(this.runCommand.bind(this));
    else
        falseAst.forEach(this.runCommand.bind(this));
    this.scope = parentScope;
};
Renderer.prototype.render['import'] = function (node) {
    var fileNode = node.tree[0];
    var file = exports.resolveFilePath(this.file, this.evaluate(fileNode));
    var ast = exports.importFileAsAST(file);
    if (ast === undefined) {
        var fileContent = exports.importFile(file);
        ast = fileContent && parse(fileContent);
    }
    if (ast === undefined) {
        throw new RenderError(
            'file not found: ' + file,
            fileNode.lloc.first_line,
            fileNode.lloc.first_column,
            this.file
        );
    }
    var renderer = new Renderer(ast, file);
    var commandName = node.tree[1];
    if (commandName === undefined) {
        commandName = file.split(/\\|\//g).pop().split('.').shift();
    }
    this.set(commandName, renderer);
};
Renderer.prototype.render['def'] = function (node) {
    var name = node.tree[0];
    var ast = node.tree[1];
    var renderer = new Renderer(ast, this.file);
    this.set(name, renderer);
};

function Scope(parent) {
    this.parent = parent;
    this.environment = {};
    this.functionEnvironment = {};
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

Scope.prototype.getFunction = function getFunction(name) {
    if (this.functionEnvironment[name] !== undefined)
        return this.functionEnvironment[name];
    if (this.parent)
        return this.parent.getFunction(name);
    return builtinFunction[name];
};

Scope.prototype.setFunction = function setFunction(name, value) {
    this.functionEnvironment[name] = value;
};

function parse(code) {
    return exports._parser.parse(code);
}

function tokenize(code, prop) {
    var lexer = exports._lexer;
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
exports.getPropDefinitionsByAST = function getPropDefinitionsByAST(ast) {
    var renderer = new Renderer(ast);
    return renderer.getPropDefinitions();
};
exports.getPropDefinitions = function getPropDefinitions(code) {
    var ast = parse(code);
    return exports.getPropDefinitionsByAST(ast);
};
exports.renderByAST = function renderByAST(ast, args, file) {
    var renderer = new Renderer(ast, file);
    return renderer.render(args, undefined, undefined);
};
exports.render = function render(code, args, file) {
    var ast = parse(code);
    return exports.renderByAST(ast, args, file);
};

exports.resolveFilePath = function resolveFilePath(from, file) {
    return file;
};
exports.importFileAsAST = function importFileAsAST(file) {
    return library[file];
};
exports.importFile = function importFile(file) {
    return undefined;
};

var library = {};
exports.register = function register(name, code) {
    library[name] = parse(code);
};


})(typeof window === 'undefined' ? exports : tempath);
