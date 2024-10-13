from langchain_community.document_loaders import YoutubeLoader
from langchain.prompts import PromptTemplate
from langchain.chains.summarize import load_summarize_chain
from langchain_groq import ChatGroq
import os
from dotenv import load_dotenv
load_dotenv()
api_key = os.getenv("groq_api_key") 

def get_youtube_summary(url: str) -> str:
    llm = ChatGroq(model="Gemma-7b-It", groq_api_key=api_key)

    prompt_template = """
    Provide a summary of the following YouTube content in 300 words.
    Format the response in HTML and apply Tailwind CSS classes to enhance the layout. 
    Follow these guidelines:

    - Use <p class="text-gray-300 my-2"> for paragraphs.
    - Use <ul class="list-disc list-inside my-4"> for unordered lists and <li class="my-1"> for list items.
    - For headings, use <h2 class="text-2xl font-bold text-gray-100 my-4">.
    - Wrap the entire content in a <div class="prose prose-invert max-w-none"> for overall styling.

    Ensure the text is well-structured for webpage display.

    Content: {text}
    """
    prompt = PromptTemplate(template=prompt_template, input_variables=["text"])

    loader = YoutubeLoader.from_youtube_url(url, add_video_info=True)
    docs = loader.load()

    chain = load_summarize_chain(llm, chain_type="stuff", prompt=prompt)
    summary = chain.run(docs)

    return summary
