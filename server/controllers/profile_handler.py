from controllers.mongo import users_collection

def get_profile(user_id: str):
    user = users_collection.find_one({"_id": user_id}, {"password": 0})
    if not user:
        return None
    return user


def update_profile(user_id: str, payload: dict):
    users_collection.update_one(
        {"_id": user_id},
        {"$set": payload}
    )
    return get_profile(user_id)


def delete_profile_field(user_id: str, field: str):
    users_collection.update_one(
        {"_id": user_id},
        {"$unset": {field: ""}}
    )
