# redis_client.py
import redis
import os

# It's best practice to use environment variables for your host and port
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))

# Create a Connection Pool
# This manages multiple connections efficiently under the hood
pool = redis.ConnectionPool(
    host=REDIS_HOST,
    port=REDIS_PORT,
    db=REDIS_DB,
    decode_responses=True # Automatically decodes byte responses to strings
)

# Initialize the global client using the pool
redis_client = redis.Redis(connection_pool=pool)

# Optional: You can also define your TTL constants here so they are centralized
CACHE_TTL = 3600