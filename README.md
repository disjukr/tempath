# Pathocure

Pathocure is a template language of path data, the superset of [SVG Path Data syntax][w3c paths].
Inspired by [Prototypo][prototypo, kickstarter project]'s under the hood part.

[w3c paths]: http://www.w3.org/TR/SVG/paths.html#PathData
[prototypo, kickstarter project]: https://www.kickstarter.com/projects/599698621/prototypo-streamlining-font-creation


## usage

### install
```sh
npm install -g pathocure
```

### command line interface
```sh
$ pathocure --help

Usage: pathocure <file> [argument]... [options]

file         path template file
argument     number values that be used to path property

Options:
   -h, --help   print this message

```

### example (not for now... this is just idea sketch)
```sh
$ echo "prop \$a \$b \$c \$d M 0 0 L \$a+\$b \$c*\$d 6 0 Z" > sample.path

$ cat sample.path
prop $a $b $c $d M 0 0 L $a+$b $c*$d 6 0 Z

$ pathocure sample.path 1 2 3 4
M0,0L3,12L6,0Z
```


## syntax

since pathocure is the superset of SVG path data, you can use all feature of it.

### basic functionalities
```pathocure
M 0,0                   # also you can use comment!
L 1,2 3,4               # command letter can be eliminated on same subsequent commands
c 5,6 7,8 9,10          # relative versions of all commands are available
```

### property
```pathocure
blabla
```
#### default
```pathocure
blabla
```


## development

use [mocha](http://visionmedia.github.io/mocha/) for generate parser code & test.

```
$ npm install -g mocha
$ mocha
```

