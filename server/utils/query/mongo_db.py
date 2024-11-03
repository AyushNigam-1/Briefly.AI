from pymongo import MongoClient
from bson.objectid import ObjectId

CONNECTION_STRING = "mongodb+srv://<username>:<password>@<cluster-url>/test?retryWrites=true&w=majority"
client = MongoClient(CONNECTION_STRING)

db = client['summary']
collection = db['briefly']

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

