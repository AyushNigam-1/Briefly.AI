from pymongo import MongoClient
import os
from dotenv import load_dotenv
import gridfs
load_dotenv()
CONNECTION_STRING = os.getenv("mongo_db_uri")

client = MongoClient(CONNECTION_STRING)
db = client['briefly']  # Database name
fs = gridfs.GridFS(db)
users_collection = db['user']  # Users collection
summary_collection = db['summary']
workflows_collection = db['workflows']   # 👈 ADD THIS
