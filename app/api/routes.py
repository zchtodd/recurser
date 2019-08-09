import json

from flask import request
from pyparsing import ParseException

from app.services.interpreter import StackException, IterationException, Context, parse
from app.api import api_blueprint


def build_nodes(root):
    node = {
        "args": root.args,
        "retval": root.retval,
        "count": root.frame_count,
        "children": [],
    }
    for child in root.children:
        node["children"].append(build_nodes(child))
    return node


@api_blueprint.route("/execute/", methods=["POST"])
def index():
    data = request.get_json()
    res = {}

    context = Context()

    try:
        parse(data["code"]).execute(context)
    except ParseException as err:
        res["error"] = {"lineno": err.lineno, "col": err.col, "message": str(err)}
    except StackException as err:
        res["error"] = {"lineno": 1, "col": 0, "message": "Stack limit exceeded."}
    except IterationException as err:
        res["error"] = {"lineno": 1, "col": 0, "message": "Iteration limit exceeded."}
    else:
        res["nodes"] = build_nodes(context.root_frame)

    return res
