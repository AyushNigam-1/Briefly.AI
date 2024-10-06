import streamlit as st
import asyncio
from utils.validators import URLValidator, InvalidURLException, MissingAPIKeyException
from utils.api_client import SummarizerClient  

API_BASE_URL = "http://127.0.0.1:8000"

summarizer_client = SummarizerClient(base_url=API_BASE_URL)

st.set_page_config(page_title="LangChain: Summarize Text From YT or Website", page_icon="🦜")
st.title("🦜 LangChain: Summarize Text From YT or Website")
st.subheader('Summarize URL')

with st.sidebar:
    groq_api_key = st.text_input("Groq API Key", value="", type="password")

generic_url = st.text_input("URL", label_visibility="visible")

url_validator = URLValidator()

def handle_summarization(api_key: str, url: str):
    try:
        # Validating the URL and API key
        url_validator.validate(url, api_key)
        
        # Call asyncio.run() to handle the async summarization
        summary = summarizer_client.summarize(api_key, url)
        
        if summary:
            st.success("Successfully summarized the content:")
            st.write(summary)
        else:
            st.error("No summary available.")
            
    except InvalidURLException as e:
        st.error(f"Invalid URL: {e}")
    except MissingAPIKeyException as e:
        st.error(f"Error: {e}")
    except Exception as e:
        st.error(f"An unexpected error occurred: {str(e)}")

# Summarize content button
if st.button("Summarize the Content from YT or Website"):
    with st.spinner("Loading content..."):
        handle_summarization(groq_api_key, generic_url)
