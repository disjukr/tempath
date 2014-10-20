#!/usr/bin/env node

process.title = 'choice';

var nomnom = require('nomnom');
nomnom.script('pathocure');
nomnom.options({
    file: {
        required: true,
        position: 0,
        help: 'path template file'
    },
    argument: {
        position: 1,
        list: true,
        help: 'number values that be used to path property'
    },
    help: {
        abbr: 'h',
        flag: true,
        help: 'print this message'
    }
});
var opts = nomnom.parse();
var file = opts.file;
var fs = require('fs');
var code;
try {
    code = fs.readFileSync(file, { encoding: 'utf8' });
} catch (e) {
    switch (e.errno) {
    case 34:
        console.log(file + ': no such file or directory');
        process.exit(2);
        break;
    default:
        console.log(e.message);
        process.exit(1);
        break;
    }
}

var pathocure = require('./pathocure');
var result;
try {
    result = pathocure.render(
        code,
        opts.argument.map(function (argument) {
            if (argument === 'default')
                return undefined;
            return +argument;
        }),
        file
    );
} catch (e) {
    if (e instanceof pathocure.RenderError) {
        if (e.file && e.line && e.column) {
            console.log('At ' + e.file + ', line ' + e.line + ', column ' + e.column + ':');
            console.log(code.split(/\r?\n/)[e.line - 1]);
            console.log(new Array(e.column + 1).join(' ') + '^');
        }
        console.log(e.message);
        process.exit(1);
    }
    throw e;
}

console.log(result);
process.exit(0);
