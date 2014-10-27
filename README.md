# Tempath

Tempath is a template language of path data, the superset of [SVG Path Data syntax][w3c paths].
Inspired by [Prototypo][prototypo, kickstarter project]'s under the hood part.

[w3c paths]: http://www.w3.org/TR/SVG/paths.html#PathData
[prototypo, kickstarter project]: https://www.kickstarter.com/projects/599698621/prototypo-streamlining-font-creation


## Usage

### Installation
```sh
npm install -g tempath
```

### Command line interface
```sh
$ tempath --help

Usage: tempath <file> [argument]... [options]

file         path template file
argument     number values that be used to path property

Options:
   -h, --help   print this message
```

### Example
```sh
$ echo "prop \$a, \$b, \$c, \$d M 0 0 L \$a+\$b \$c*\$d 6 0 Z" > sample.path

$ cat sample.path
prop $a, $b, $c, $d M 0 0 L $a+$b $c*$d 6 0 Z

$ tempath sample.path 1 2 3 4
M0,0L3,12L6,0Z
```


## Brief Syntax Guide

Since tempath is the superset of SVG path data, you can use all feature of it.

### Basic functionalities
```tempath
M 0,0               # also you can use comment!
L 1,2 3,4           # command letter can be eliminated on same subsequent commands
c 5,6 7,8 9,10      # relative versions of all commands are available
```

### Commands

Tempath code consists of command set.
Also you can define your custom command by other commands:

* `set`: set the variable
* `prop`: define property that represent the path
* `def`: define custom command
* `if`: conditional execution of command
* `for`: make loop
* `import`: import foreign template on command

### Variable

Variable name starts with `$` character.

```tempath
set $a, 1
set $b, 2
M $a $b     # M1,2
```

### Property

`prop` command takes a value from outside, and set the value to variable.

```tempath
prop $a         # Take one value from outside, just set $a by that.
prop $b 0~1     # Take one value from outside,
                # but limit the value into 1~2(inclusive).
prop $c 2       # If there is no value outside, set 2 to $c.
prop $d 3~4 5   # Default value also limited.
                # thus, set 4 when default is used
```


## Development

use [mocha](http://visionmedia.github.io/mocha/) for generate parser code & test.

```
$ npm install -g mocha
$ mocha
```


## License

Distributed under [MIT License](./LICENSE)

