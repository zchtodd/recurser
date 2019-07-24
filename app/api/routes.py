import json

from flask import request
from pyparsing import ParseException

from app.services.interpreter import Context, parse
from app.api import api_blueprint


@api_blueprint.route("/execute/", methods=["POST"])
def index():
    data = request.get_json()
    res = {}

    context = Context()

    try:
        parse(data["code"]).execute(context)
    except ParseException as err:
        res["error"] = {"lineno": err.lineno, "col": err.col, "message": str(err)}

    return res
