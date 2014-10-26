var fs = require('fs');

var CSON = require('cursive');
var syntaxPath = __dirname + '/syntax.cursive';
var syntax = CSON.parse(fs.readFileSync(syntaxPath, { encoding: 'utf8' }));

var parseCodeTemplate = {
    RETN: 'return $1;',
    TOKN: '$$ = { type: @1, tree: [@], lloc: this._$ };',
    SELF: '$$ = @1',
    LIST: '$$ = [@1];',
    PUSH: '@1.push(@2); $$ = @1;'
};
function imprint(code) {
    code = code.trim();
    var type = code.substr(0, 4);
    var args = code.substr(4).split(',').map(function (arg) {
        return arg.trim();
    });
    var rest = args.concat();
    var alreadyRemoved = [];
    var result = parseCodeTemplate[type].replace(/@(\d+)/g, function (_, index) {
        index = parseInt(index, 10) - 1;
        delete rest[index];
        return args[index] || '$' + (index + 1);
    });
    result = result.replace('@', rest.filter(function (arg) {
        return arg !== undefined;
    }).join(', '));
    return result;
}
Object.keys(syntax.bnf).forEach(function (symbol) {
    symbol = syntax.bnf[symbol];
    Object.keys(symbol).forEach(function (expression) {
        expression = symbol[expression];
        expression[1] = imprint(expression[1]);
    });
});

var parser = new require('jison').Parser(syntax);
var lexer = new require('jison-lex')(syntax.lex);
var forBrowser = [
    'var tempath = {};',
    parser.generateModule({ moduleName: 'tempath._parser' }), '//"',
    ';(function () {',
        lexer.generate(), '//"',
        'tempath._lexer = lexer;',
    '})();',
    fs.readFileSync(__dirname + '/tempath.js', { encoding: 'utf8' })
].join('\n');
fs.writeFileSync(__dirname + '/bin/tempath.parser.json', JSON.stringify(syntax, undefined, 4));
fs.writeFileSync(__dirname + '/bin/tempath.parser.js', parser.generate());
fs.writeFileSync(__dirname + '/bin/tempath.js', forBrowser);
