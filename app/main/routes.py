from app.main import main_blueprint


@main_blueprint.route("/")
def index():
    return "Hi"
