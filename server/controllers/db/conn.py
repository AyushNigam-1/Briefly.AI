# db.py

from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Fetch MongoDB URI from the environment variables
CONNECTION_STRING = os.getenv("mongo_db_uri")

# Set up MongoDB connection and client
client = MongoClient(CONNECTION_STRING)
db = client['briefly']  # Database name
users_collection = db['users']  # Users collection
summary_collection = db['summary']