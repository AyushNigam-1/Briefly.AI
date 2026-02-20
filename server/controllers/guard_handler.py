import os
from groq import Groq

client = Groq(api_key=os.getenv("groq_api_key"))

GUARD_MODEL = "meta-llama/llama-prompt-guard-2-22m"

async def run_guard(text: str):
    """
    Returns: (is_safe: bool, raw_response)
    """
    res = client.chat.completions.create(
        model=GUARD_MODEL,
        messages=[
            {
                "role": "user",
                "content": text
            }
        ],
        temperature=0,
    )

    output = res.choices[0].message.content.lower()

    is_safe = output.strip().startswith("safe")

    return is_safe, output
