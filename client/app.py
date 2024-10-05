import streamlit as st
from utils.validators import URLValidator, InvalidURLException, MissingAPIKeyException

st.set_page_config(page_title="LangChain: Summarize Text From YT or Website", page_icon="🦜")
st.title("🦜 LangChain: Summarize Text From YT or Website")
st.subheader('Summarize URL')

with st.sidebar:
   groq_api_key = st.text_input("Groq API Key", value="", type="password")

generic_url = st.text_input("URL", label_visibility="collapsed")

url_validator = URLValidator()

if st.button("Summarize the Content from YT or Website"):
     with st.spinner("Loading content..."): 
        try:
            docs = url_validator.validate_and_load(generic_url, groq_api_key)
            st.success("Successfully loaded the content:")
            st.write(docs)

        except InvalidURLException as e:
            st.error(f"Invalid URL: {e}")

        except MissingAPIKeyException as e:
            st.error(f"Error: {e}")

        except Exception as e:
            st.error(f"An error occurred: {e}")
