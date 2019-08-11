import operator
import pyparsing as pp
pp.ParserElement.enablePackrat()


ops_table = {
    "&&": operator.and_,
    "||": operator.or_,
    "==": operator.eq,
    "!=": operator.ne,
    ">": operator.gt,
    ">=": operator.ge,
    "<": operator.lt,
    "<=": operator.le,
    "+": operator.add,
    "-": operator.sub,
    "*": operator.mul,
    "/": operator.truediv,
}

MAX_STACK_LEN = 16
MAX_FRAME_COUNT = 512
ITERATION_LIMIT = 1000


class StackException(Exception):
    pass


class IterationException(Exception):
    pass


class Frame(object):
    def __init__(self):
        self.frame_count = 0
        self.args = []
        self.values = {}
        self.retval = None

        self.parent_frame = None
        self.children = []

    def __getitem__(self, key):
        try:
            return self.values[key]
        except KeyError as err:
            raise pp.ParseException("Undefined: " + key)

    def __setitem__(self, key, value):
        self.values[key] = value


class Context(object):
    def __init__(self):
        self.frame_count = 1
        self.root_frame = None
        self.fundef = None
        self.stack = []

    @property
    def values(self):
        return self.stack[0]


class ReturnValue(object):
    def __init__(self, value):
        self.value = value


class Number(object):
    def __init__(self, s, loc, toks):
        self.value = "".join(toks[0])

    def execute(self, context):
        return float(self.value)


class String(object):
    def __init__(self, s, loc, toks):
        self.value = "".join(toks[0])

    def execute(self, context):
        return self.value


class Array(object):
    def __init__(self, s, loc, toks):
        self.value = toks

    def execute(self, context):
        return [elem.execute(context) for elem in self.value]


class Identifier(object):
    def __init__(self, s, loc, toks):
        self.value = toks[0]
        self.array_access = None
        self.loc = loc

        if "array_index" in toks:
            self.array_access = toks.array_index

    def execute(self, context):
        value = context.values[self.value]
        if self.array_access:
            try:
                return value[int(self.array_access.execute(context))]
            except (TypeError, IndexError) as err:
                raise pp.ParseException(err)
        return value


class Term(object):
    def __init__(self, s, loc, toks):
        self.value_or_summand = toks[0]

    def execute(self, context):
        return self.value_or_summand.execute(context)


class Factor(object):
    def __init__(self, s, loc, toks):
        self.terms = toks[::2]
        self.ops = toks[1::2]
        self.loc = loc

    def execute(self, context):
        val = self.terms[0].execute(context)
        for op, term in zip(self.ops, self.terms[1:]):
            try:
                val = ops_table[op](val, term.execute(context))
            except TypeError as err:
                raise pp.ParseException(err, self.loc)
        return val


class Summand(object):
    def __init__(self, s, loc, toks):
        self.factors = toks[::2]
        self.ops = toks[1::2]

    def execute(self, context):
        val = self.factors[0].execute(context)
        for op, factor in zip(self.ops, self.factors[1:]):
            try:
                val = ops_table[op](val, factor.execute(context))
            except TypeError as err:
                raise pp.ParseException(err)
        return val


class FunctionCall(object):
    def __init__(self, s, loc, toks):
        self.fun_name = toks[0]
        self.summands = toks[1:]

    def execute(self, context):
        args = []
        for summand in self.summands:
            args.append(summand.execute(context))

        if self.fun_name == "len":
            return len(args[0])


class MethodCall(object):
    def __init__(self, s, loc, toks):
        self.identifier = toks[0]
        self.func = toks[2]

    def execute(self, context):
        identval = self.identifier.execute(context)
        fun_name = self.func.fun_name

        if fun_name == "append":
            value = identval + [self.func.summands[0].execute(context)]
        elif fun_name == "insert":
            index = int(self.func.summands[0].execute(context))
            middle = self.func.summands[1].execute(context)
            middle = [middle] if isinstance(identval, list) else middle
            value = identval[:index] + middle + identval[index:]
        elif fun_name == "replace":
            args1 = self.func.summands[0].execute(context)
            args2 = self.func.summands[1].execute(context)
            value = identval.replace(args1, args2)

        context.values[self.identifier.value] = value


class MainCall(object):
    def __init__(self, s, loc, toks):
        self.summands = toks

    def execute(self, context):
        frame = Frame()
        frame.frame_count = context.frame_count
        context.frame_count += 1

        args = {}
        for param, summand in zip(context.fundef.parameters, self.summands):
            args[param.value] = summand.execute(context)
            frame.args.append(args[param.value])

        if (
            len(context.stack) >= MAX_STACK_LEN
            or context.frame_count >= MAX_FRAME_COUNT
        ):
            raise StackException()

        frame.values = args.copy()

        if not context.root_frame:
            context.root_frame = frame
        else:
            frame.parent_frame = context.stack[0]
            context.stack[0].children.append(frame)

        context.stack.insert(0, frame)
        for statement in context.fundef.block.tokens:
            ret = statement.execute(context)
            if isinstance(ret, ReturnValue):
                frame.retval = ret.value
                context.stack.pop(0)
                return ret.value
        context.stack.pop(0)


class Test(object):
    def __init__(self, s, loc, toks):
        self.lsummand = toks[0]
        self.op = None
        self.rsummand = None

        if len(toks) > 1:
            self.op = toks[1]
            self.rsummand = toks[2]

    def execute(self, context):
        lval = self.lsummand.execute(context)
        if not self.op:
            return lval

        rval = self.rsummand.execute(context)
        return ops_table[self.op](lval, rval)


class Condition(object):
    def __init__(self, s, loc, toks):
        self.expr_or_orcond = toks[0]

    def execute(self, context):
        return self.expr_or_orcond.execute(context)


class AndCondition(object):
    def __init__(self, s, loc, toks):
        self.conditions = toks

    def execute(self, context):
        for condition in self.conditions:
            if not condition.execute(context):
                return False
        return True


class OrCondition(object):
    def __init__(self, s, loc, toks):
        self.and_conditions = toks

    def execute(self, context):
        for and_condition in self.and_conditions:
            if and_condition.execute(context):
                return True
        return False


class Assignment(object):
    def __init__(self, s, loc, toks):
        self.var = toks[0]
        self.summand = toks[1]

    def execute(self, context):
        varname = self.var.value
        new_val = self.summand.execute(context)
        if self.var.array_access:
            index = int(self.var.array_access.execute(context))
            context.values[varname][index] = new_val
        else:
            context.values[varname] = new_val


class SimpleStmt(object):
    def __init__(self, s, loc, toks):
        self.expr = toks[0]

    def execute(self, context):
        return self.expr.execute(context)


class Statement(object):
    def __init__(self, s, loc, toks):
        self.flow_or_stmt = toks[0]

    def execute(self, context):
        return self.flow_or_stmt.execute(context)


class IfCondition(object):
    def __init__(self, s, loc, toks):
        self.or_condition = toks[0]
        self.block = toks[1]
        self._else = None

        if "else_clause" in toks:
            self._else = toks.else_clause

    def execute(self, context):
        if self.or_condition.execute(context):
            return self.block.execute(context)
        elif self._else:
            return self._else.execute(context)


class ElseCondition(object):
    def __init__(self, s, loc, toks):
        self.block = toks[0]

    def execute(self, context):
        return self.block.execute(context)


class Return(object):
    def __init__(self, s, loc, toks):
        self.expr = toks[0]

    def execute(self, context):
        ret = self.expr.execute(context)
        return ReturnValue(ret)


class Block(object):
    def __init__(self, s, loc, toks):
        self.tokens = toks

    def execute(self, context):
        for token in self.tokens:
            ret = token.execute(context)
            if isinstance(ret, ReturnValue):
                return ret


class Loop(object):
    def __init__(self, s, loc, toks):
        self.init = toks[0]
        self.condition = toks[1]
        self.post = toks[2]
        self.block = toks[3]

    def execute(self, context):
        self.init.execute(context)
        iterations = 0
        while True:
            if iterations > ITERATION_LIMIT:
                raise IterationException()

            if not self.condition.execute(context):
                break

            ret = self.block.execute(context)
            self.post.execute(context)

            if isinstance(ret, ReturnValue):
                return ret
            iterations += 1


class FunctionDef(object):
    def __init__(self, s, loc, toks):
        self.parameters = toks[0]
        self.block = toks[1]

    def execute(self, context):
        context.fundef = self


class Program(object):
    def __init__(self, s, loc, toks):
        self.fundef = toks[0]
        self.call = toks[1]

    def execute(self, context):
        self.fundef.execute(context)

        try:
            return self.call.execute(context)
        except Exception as err:
            raise pp.ParseException(err)


summand = pp.Forward()
function_call = pp.Forward()
method_call = pp.Forward()
main_call = pp.Forward()
or_condition = pp.Forward()
block = pp.Forward()
loop = pp.Forward()

lparen = pp.Suppress("(")
rparen = pp.Suppress(")")
lbrace = pp.Suppress("{")
rbrace = pp.Suppress("}")
lbrack = pp.Suppress("[")
rbrack = pp.Suppress("]")

_and = pp.Suppress("&&")
_or = pp.Suppress("||")
semicolon = pp.Suppress(";")

_if = pp.Keyword("if")
_else = pp.Keyword("else")
_return = pp.Keyword("return")
_for = pp.Keyword("for")
_len = pp.Keyword("len")
append = pp.Keyword("append")
replace = pp.Keyword("replace")
insert = pp.Keyword("insert")
fun = pp.Keyword("fun")

keywords = _if | _else | _return | _for | fun
function = _len | append | replace | insert
operator = pp.oneOf((">", ">=", "<", "<=", "==", "!="))

number = pp.Regex(r'-?\d+(\.\d*)?').setParseAction(Number)
string = pp.QuotedString(quoteChar='"').setParseAction(String)

identifier = (
    ~keywords
    + ~function
    + pp.Word(pp.alphanums + "_")
    + pp.Optional(lbrack + summand("array_index") + rbrack)
)
identifier.setParseAction(Identifier)

array = (lbrack + pp.Optional(pp.delimitedList(summand)) + rbrack).setParseAction(Array)
value = number | array | method_call | identifier | string | function_call | main_call
term = (value | (lparen + summand + rparen)).setParseAction(Term)
factor = (term + pp.ZeroOrMore(pp.oneOf(("*", "/")) + term)).setParseAction(Factor)

summand <<= factor + pp.ZeroOrMore(pp.oneOf(("+", "-")) + factor)
summand.setParseAction(Summand)

function_call <<= (function + lparen + pp.Optional(pp.delimitedList(summand)) + rparen)
function_call.setParseAction(FunctionCall)

method_call <<= (identifier + "." + function_call)
method_call.setParseAction(MethodCall)

main_call <<= (fun.suppress() + lparen + pp.Optional(pp.delimitedList(summand)) + rparen)
main_call.setParseAction(MainCall)

assignment = (identifier + pp.Suppress("=") + summand).setParseAction(Assignment)
expression = (summand + pp.Optional(operator + summand)).setParseAction(Test)

condition = (expression | (lparen + or_condition + rparen)).setParseAction(Condition)
and_condition = (condition + pp.ZeroOrMore(_and + condition)).setParseAction(
    AndCondition
)
or_condition <<= and_condition + pp.ZeroOrMore(_or + and_condition)
or_condition.setParseAction(OrCondition)

else_cond = (_else.suppress() - lbrace + block + rbrace).setParseAction(ElseCondition)

if_cond = (
    _if.suppress()
    + lparen
    + or_condition
    + rparen
    + lbrace
    + block
    + rbrace
    + pp.Optional(else_cond("else_clause"))
).setParseAction(IfCondition)

return_stmt = (_return.suppress() + expression).setParseAction(Return)

simple_stmt = ((assignment | return_stmt | expression) + semicolon).setParseAction(
    SimpleStmt
)
statement = (loop | if_cond | simple_stmt).setParseAction(Statement)

block <<= pp.ZeroOrMore(statement).setParseAction(Block)

loop <<= (
    _for.suppress()
    - lparen
    + assignment
    + semicolon
    + or_condition
    + semicolon
    + assignment
    - rparen
    + lbrace
    + block
    + rbrace
)
loop.setParseAction(Loop)

fundef = (
    fun.suppress()
    + lparen
    + pp.Group(pp.Optional(pp.delimitedList(identifier)))
    + rparen
    + lbrace
    + block
    + rbrace
).setParseAction(FunctionDef)

program = (fundef + main_call + semicolon).setParseAction(Program)
program.ignore(pp.cppStyleComment | pp.pythonStyleComment)


def parse(code):
    return program.parseString(code, parseAll=True)[0]
