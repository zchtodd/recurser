from flask import Blueprint

api_blueprint = Blueprint("main", __name__, url_prefix="/api")

from app.api import routes
