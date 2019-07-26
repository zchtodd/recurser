import json

from flask import request
from pyparsing import ParseException

from app.services.interpreter import Context, parse
from app.api import api_blueprint


def build_nodes(root):
    node = {"args": root.args, "retval": root.retval, "children": []}
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
    else:
        res["nodes"] = build_nodes(context.root_frame)

    return res
