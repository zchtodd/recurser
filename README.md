# Recurser

![recurser](https://media.giphy.com/media/H1MZob5ZSIUAJrzQKv/giphy.gif)

An aide to learning recursion through visualization.

Write a recursive function and watch to see how it is executed.  Recurser executes your function and draws an 
animated tree to help you understand the concept of recursion.

[Try out Recurser](https://recurser.tech)

# Language

Recurser parses and executes a small custom language.

## Control flow

The language supports `if` and `else` but no `else if` construct.  C style for loops are supported.

## Data types

Types include numbers, strings, and arrays.  Strings are defined with double quotes.  Arrays can contain a mix of element types.

## Functions

| Function      | Description                                           | Example                      |
| ------------- |:-----------------------------------------------------:| ----------------------------:|
| append        | Add any type element to the end of an array.          | `x.append(5);`               |
| insert        | Insert in specific position any type of element.      | `x.insert(1, "a");`          |
| pop           | Pop element from array at the specified position.     | `x.pop(0);`                  |
| replace       | Replace first argument with the second in a string.   | `x.replace("hello", "hi");`  |

## Comments

Both C-style and Python style comments are supported.
