# PsyKorPath

PsyKorPath is a template language of path data, the superset of [SVG Path Data syntax][w3c paths].
Inspired by [Prototypo][prototypo, kickstarter project]'s under the hood part.

[w3c paths]: http://www.w3.org/TR/SVG/paths.html#PathData
[prototypo, kickstarter project]: https://www.kickstarter.com/projects/599698621/prototypo-streamlining-font-creation


## Usage

### Installation
```sh
npm install -g psykorpath
```

### Command line interface
```sh
$ psykorpath --help

Usage: psykorpath <file> [argument]... [options]

file         path template file
argument     number values that be used to path property

Options:
   -h, --help   print this message
```

### Example
```sh
$ echo "prop \$a \$b \$c \$d M 0 0 L \$a+\$b \$c*\$d 6 0 Z" > sample.path

$ cat sample.path
prop $a $b $c $d M 0 0 L $a+$b $c*$d 6 0 Z

$ psykorpath sample.path 1 2 3 4
M0,0L3,12L6,0Z
```


## Syntax

Since PsyKorPath is the superset of SVG path data, you can use all feature of it.

### Basic functionalities
```psykorpath
M 0,0               # also you can use comment!
L 1,2 3,4           # command letter can be eliminated on same subsequent commands
c 5,6 7,8 9,10      # relative versions of all commands are available
```


## Development

use [mocha](http://visionmedia.github.io/mocha/) for generate parser code & test.

```
$ npm install -g mocha
$ mocha
```


## License

Distributed under [MIT License](./LICENSE)

