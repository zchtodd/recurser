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
        parse(shell % 'x = "a";\nx = x + x;').execute(context)
        self.assertEqual(context.root_frame.values["x"], "aa")

        context = Context()
        parse(shell % 'x = "a" + "b" + "c";').execute(context)
        self.assertEqual(context.root_frame.values["x"], "abc")

        with self.assertRaises(ParseException):
            context = Context()
            parse(shell % 'x = "a" + 1;').execute(context)
            self.assertEqual(context.root_frame.values["x"], "abc")

    def test_string_insert(self):
        context = Context()
        parse(shell % 'x = ""; x.insert(0, "a");').execute(context)
        self.assertEqual(context.root_frame.values["x"], "a")

        context = Context()
        parse(shell % 'x = "abc"; x.insert(1, "x");').execute(context)
        self.assertEqual(context.root_frame.values["x"], "axbc")

    def test_array_insert(self):
        context = Context()
        parse(shell % 'x = []; x.insert(0, "a");').execute(context)
        self.assertEqual(context.root_frame.values["x"], ["a"])

    def test_array_append(self):
        context = Context()
        parse(shell % 'x = []; x.append("a");').execute(context)
        self.assertEqual(context.root_frame.values["x"], ["a"])
  
    def test_string_replace(self):
        context = Context()
        parse(shell % 'x = "a"; x.replace("a", "");').execute(context)
        self.assertEqual(context.root_frame.values["x"], "")

        context = Context()
        parse(shell % 'x = "abc"; x.replace("b", "");').execute(context)
        self.assertEqual(context.root_frame.values["x"], "ac")

if __name__ == "__main__":
    unittest.main()
