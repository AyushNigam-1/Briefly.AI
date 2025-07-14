from pymongo import MongoClient
import os
from dotenv import load_dotenv
import gridfs
# Load environment variables
load_dotenv()

# Fetch MongoDB URI from the environment variables
CONNECTION_STRING = os.getenv("mongo_db_uri")

# Set up MongoDB connection and client
client = MongoClient("mongodb+srv://AyushNigam:Ayush@cluster0.zg5uxhv.mongodb.net/admin")
db = client['briefly']  # Database name
fs = gridfs.GridFS(db)
users_collection = db['users']  # Users collection
summary_collection = db['summary']