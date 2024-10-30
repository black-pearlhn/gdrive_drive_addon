import os
import json
from flask import Flask
from .gdrive import GoogleDrive

app = Flask(__name__)

# Assuming you are loading the token from an environment variable
tokenFromVar = os.environ.get("TOKEN")
print("TOKEN:", tokenFromVar)
if tokenFromVar is None:
    raise Exception("TOKEN environment variable not set")

token = json.loads(tokenFromVar)
gdrive = GoogleDrive(token)

# Import your routes
from sgd import (
    routes,
)  # Ensure this is correct and that routes.py has valid route definitions
