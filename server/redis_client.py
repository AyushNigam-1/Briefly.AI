import redis
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

redis_client = redis.from_url(
    REDIS_URL, 
    decode_responses=False 
)

CACHE_TTL = 3600

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