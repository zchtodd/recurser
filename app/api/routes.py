import json

from flask import request
from app.api import api_blueprint


@api_blueprint.route("/execute/", methods=["POST"])
def index():
    data = request.get_json()
    return json.dumps({"a":1})
