import operator
import pyparsing as pp


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


class StackException(Exception):
    pass


class Frame(object):
    def __init__(self):
        self.args = []
        self.values = {}
        self.retval = None

        self.parent_frame = None
        self.children = []

    def __getitem__(self, key):
        return self.values[key]

    def __setitem__(self, key, value):
        self.values[key] = value


class Context(object):
    def __init__(self):
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


class Identifier(object):
    def __init__(self, s, loc, toks):
        self.value = toks[0]

    def execute(self, context):
        return context.values[self.value]


class Term(object):
    def __init__(self, s, loc, toks):
        self.value_or_summand = toks[0]

    def execute(self, context):
        return self.value_or_summand.execute(context)


class Factor(object):
    def __init__(self, s, loc, toks):
        self.terms = toks[::2]
        self.ops = toks[1::2]

    def execute(self, context):
        val = self.terms[0].execute(context)
        for op, term in zip(self.ops, self.terms[1:]):
            val = ops_table[op](val, term.execute(context))
        return val


class Summand(object):
    def __init__(self, s, loc, toks):
        self.factors = toks[::2]
        self.ops = toks[1::2]

    def execute(self, context):
        val = self.factors[0].execute(context)
        for op, factor in zip(self.ops, self.factors[1:]):
            val = ops_table[op](val, factor.execute(context))
        return val


class FunctionCall(object):
    def __init__(self, s, loc, toks):
        self.summands = toks

    def execute(self, context):
        frame = Frame()
        args = {}

        for param, summand in zip(context.fundef.parameters, self.summands):
            args[param.value] = summand.execute(context)
            frame.args.append(args[param.value])

        if len(context.stack) >= MAX_STACK_LEN:
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
        context.values[self.var.value] = self.summand.execute(context)


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

        if len(toks) == 3:
            self._else = toks[2]

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
        return self.call.execute(context)


lparen = pp.Suppress("(")
rparen = pp.Suppress(")")
lbrace = pp.Suppress("{")
rbrace = pp.Suppress("}")
_and = pp.Suppress("&&")
_or = pp.Suppress("||")
semicolon = pp.Suppress(";")

_if = pp.Keyword("if")
_else = pp.Keyword("else")
_return = pp.Keyword("return")
fun = pp.Keyword("fun")

keywords = _if | _else | _return | fun
operator = pp.oneOf((">", ">=", "<", "<=", "==", "!="))

number = (
    pp.Combine(
        pp.Optional("-")
        + pp.Word(pp.nums)
        + pp.Optional("." + pp.OneOrMore(pp.Word(pp.nums)))
    )
).setParseAction(Number)

identifier = ~keywords + pp.Word(pp.alphanums + "_")
identifier.setParseAction(Identifier)

summand = pp.Forward()
function_call = pp.Forward()

value = number | identifier | function_call
term = (value | (lparen + summand + rparen)).setParseAction(Term)
factor = (term + pp.ZeroOrMore(pp.oneOf(("*", "/")) + term)).setParseAction(Factor)

summand << factor + pp.ZeroOrMore(pp.oneOf(("+", "-")) + factor)
summand.setParseAction(Summand)

function_call << (
    fun.suppress() + lparen + pp.Optional(pp.delimitedList(summand)) + rparen
)
function_call.setParseAction(FunctionCall)

test = pp.Forward()
or_condition = pp.Forward()
block = pp.Forward()

assignment = (identifier + pp.Suppress("=") + summand).setParseAction(Assignment)

expression = (summand + pp.Optional(operator + summand)).setParseAction(Test)

condition = (expression | (lparen + or_condition + rparen)).setParseAction(Condition)
and_condition = (condition + pp.ZeroOrMore(_and + condition)).setParseAction(
    AndCondition
)
or_condition << and_condition + pp.ZeroOrMore(_or + and_condition)
or_condition.setParseAction(OrCondition)

else_cond = (_else.suppress() + lbrace + block + rbrace).setParseAction(ElseCondition)

if_cond = (
    _if.suppress()
    + lparen
    + or_condition
    + rparen
    + lbrace
    + block
    + rbrace
    + pp.Optional(else_cond)
).setParseAction(IfCondition)

return_stmt = (_return.suppress() + expression).setParseAction(Return)

simple_stmt = ((assignment | return_stmt | expression) + semicolon).setParseAction(
    SimpleStmt
)
statement = (if_cond | simple_stmt).setParseAction(Statement)

block << pp.ZeroOrMore(statement).setParseAction(Block)

fundef = (
    fun.suppress()
    + lparen
    + pp.Group(pp.delimitedList(identifier))
    + rparen
    + lbrace
    + block
    + rbrace
).setParseAction(FunctionDef)

program = (fundef + function_call + semicolon).setParseAction(Program)


def parse(code):
    return program.parseString(code, parseAll=True)[0]
