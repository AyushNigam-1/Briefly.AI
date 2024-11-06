from pymongo import MongoClient
from bson.objectid import ObjectId
from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

CONNECTION_STRING = "mongodb+srv://<username>:<password>@<cluster-url>/test?retryWrites=true&w=majority"
client = MongoClient(CONNECTION_STRING)

db = client['briefly']
collection = db['summaries']
users_collection = db['users'] 

def write_document(document):
    """
    Insert a document into the collection.
    
    Parameters:
    document (dict): The document to be inserted.
    
    Returns:
    str: The ID of the inserted document.
    """
    result = collection.insert_one(document)
    print("Inserted document ID:", result.inserted_id)
    return str(result.inserted_id)

def read_document_by_id(doc_id):
    """
    Read a document from the collection by its ID.
    
    Parameters:
    doc_id (str): The ID of the document to retrieve.
    
    Returns:
    dict: The document if found, or None if not found.
    """
    try:
        document = collection.find_one({"_id": ObjectId(doc_id)})
        if document:
            print("Document found:", document)
            return document
        else:
            print("Document not found")
            return None
    except Exception as e:
        print(f"An error occurred: {e}")
        return None
    
def signup(username, password):
    if not username or not password:
        return {"error": "Username and password are required"}, 400

    if users_collection.find_one({"username": username}):
        return {"error": "Username already exists"}, 400

    hashed_password = generate_password_hash(password)
    user_data = {
        "username": username,
        "password": hashed_password
    }
    users_collection.insert_one(user_data)
    return {"message": "User registered successfully"}, 201

def login(username, password):
    if not username or not password:
        return {"error": "Username and password are required"}, 400

    user = users_collection.find_one({"username": username})
    if not user or not check_password_hash(user['password'], password):
        return {"error": "Invalid username or password"}, 401

    return {"message": "Login successful", "user_id": str(user['_id'])}, 200
