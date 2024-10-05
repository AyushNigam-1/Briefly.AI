from langchain_community.document_loaders import YoutubeLoader,UnstructuredURLLoader
import validators

class InvalidURLException(Exception):
    def __init__(self, url, message="The provided URL is not valid."):
        self.url = url
        self.message = message
        super().__init__(self.message)

class MissingAPIKeyException(Exception):
    def __init__(self, message="API key is required but missing."):
        self.message = message
        super().__init__(self.message)

class URLValidator:
    def validate_and_load(self ,url , api_key):
        if not validators.url(url):
            raise InvalidURLException(url) 
        
        if not api_key:
            raise MissingAPIKeyException() 
        
        try:
            if "youtu.be" in url:
                loader = YoutubeLoader.from_youtube_url(url,add_video_info=True)
            else:
                loader = UnstructuredURLLoader(url=[url],ssl_verfiy=False , headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"})
            docs = loader.load()
            return docs

        except Exception as e:
            raise e
       

