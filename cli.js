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
    result = pathocure.render(code, [], file);
} catch (e) {
    if (e instanceof pathocure.RenderError) {
        console.log('At ' + e.file + ', line ' + e.lloc.last_line + ', column ' + e.lloc.last_column + ':');
        console.log(code.split(/\r?\n/)[e.lloc.last_line - 1]);
        console.log(new Array(e.lloc.last_column + 1).join(' ') + '^');
        console.log(e.message);
        process.exit(1);
    }
    throw e;
}

console.log(result);
process.exit(0);
