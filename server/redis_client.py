import redis
import os

# Environment variables
REDIS_HOST = os.getenv("REDIS_HOST", "10.207.18.43")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))


# Connection Pool
pool = redis.ConnectionPool(
    host=REDIS_HOST,
    port=REDIS_PORT,
    db=REDIS_DB,
    decode_responses=False  # IMPORTANT: keep raw bytes
)


# Global client
redis_client = redis.Redis(connection_pool=pool)


# Central TTL
CACHE_TTL = 3600


# -------------------------
# Clean Decoding Utilities
# -------------------------

def decode_if_bytes(value):
    """
    Safely decode a Redis value if it is bytes.
    Leaves non-bytes unchanged.
    """
    if isinstance(value, bytes):
        return value.decode("utf-8")
    return value


def decode_list(values):
    """
    Decode a list returned from Redis (like lrange).
    """
    return [
        v.decode("utf-8") if isinstance(v, bytes) else v
        for v in values
    ]


def decode_dict(data: dict):
    """
    Decode keys and values in Redis hash results.
    """
    return {
        decode_if_bytes(k): decode_if_bytes(v)
        for k, v in data.items()
    }