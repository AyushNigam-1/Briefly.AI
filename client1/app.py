import streamlit as st
from utils.validators import URLValidator, InvalidURLException, MissingAPIKeyException
from utils.api_client import SummarizerClient  

API_BASE_URL = "http://127.0.0.1:8000"

summarizer_client = SummarizerClient(base_url=API_BASE_URL)

st.set_page_config(page_title="Summarize Text From YT or Website")
st.title("Summarize Text From YT or Website")
st.subheader('Enter URL')

with st.sidebar:
    groq_api_key = st.text_input("Groq API Key", value="", type="password")

generic_url = st.text_input("URL", label_visibility="visible")

url_validator = URLValidator()

def handle_summarization(api_key: str, url: str):
    try:
        url_validator.validate(url, api_key)
        
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
if st.button("Summarize"):
    with st.spinner("Loading content..."):
        handle_summarization(groq_api_key, generic_url)
