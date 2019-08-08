import unittest
from pyparsing import ParseException

from app.services.interpreter import (
    StackException,
    IterationException,
    Context,
    parse,
)

shell = """
fun() {
%s
}

fun();
"""


class InterpreterTestCase(unittest.TestCase):
    def test_string_append(self):
        context = Context()
        parse(shell % 'x = append("", "abc");').execute(context)
        self.assertEqual(context.root_frame.values["x"], "abc")

        context = Context()
        parse(shell % 'x = append("abc", "def");').execute(context)
        self.assertEqual(context.root_frame.values["x"], "abcdef")

        context = Context()
        parse(shell % 'x = "a";\nx = append(x, x);').execute(context)
        self.assertEqual(context.root_frame.values["x"], "aa")

        context = Context()
        parse(shell % 'x = "a" + "b" + "c";').execute(context)
        self.assertEqual(context.root_frame.values["x"], "abc")

        with self.assertRaises(ParseException):
            context = Context()
            parse(shell % 'x = "a" + 1;').execute(context)
            self.assertEqual(context.root_frame.values["x"], "abc")

        with self.assertRaises(ParseException):
            context = Context()
            parse(shell % 'x = "a";\ny = append(x, 1);').execute(context)
            self.assertEqual(context.root_frame.values["x"], "abc")

        with self.assertRaises(ParseException):
            context = Context()
            parse(shell % 'x = 1;\ny = append(x, 1);').execute(context)
            self.assertEqual(context.root_frame.values["x"], "abc")

    def test_string_insert(self):
        context = Context()
        parse(shell % 'x = insert("", 0, "a");').execute(context)
        self.assertEqual(context.root_frame.values["x"], "a")

        context = Context()
        parse(shell % 'x = insert("abc", 1, "x");').execute(context)
        self.assertEqual(context.root_frame.values["x"], "axbc")
    
    def test_string_remove(self):
        context = Context()
        parse(shell % 'x = remove("", "a");').execute(context)
        self.assertEqual(context.root_frame.values["x"], "")

        context = Context()
        parse(shell % 'x = remove("abc", "b");').execute(context)
        self.assertEqual(context.root_frame.values["x"], "ac")

if __name__ == "__main__":
    unittest.main()
