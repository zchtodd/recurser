from flask import request
from app.api import api_blueprint


@api_blueprint.route("/execute/", methods=["POST"])
def index():
    data = requets.get_json()
    return ""
