import re

def split_content(text):
    think_pattern = r"<think>(.*?)</think>"
    think_content = re.search(think_pattern, text, re.DOTALL)
    
    if think_content:
        think_text = think_content.group(1).strip()  # Extract and remove extra spaces
        main_text = re.sub(think_pattern, "", text, flags=re.DOTALL).strip()  # Remove <think> part from main text
    else:
        think_text = ""
        main_text = text.strip()  # No <think> tag found, return full text as main content

    return think_text, main_text