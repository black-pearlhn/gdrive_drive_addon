from sgd import app
# updated
from sgd import app  # Import the Flask app from your package
import os

if __name__ == "__main__":
    # Set the Flask environment to development for easier debugging
    os.environ["FLASK_ENV"] = "development"

    # Run the Flask application
    app.run(host="0.0.0.0", port=5000)  # You can specify the port as needed
