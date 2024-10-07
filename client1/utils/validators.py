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
    def validate(self ,url , api_key):
        if not validators.url(url):
            raise InvalidURLException(url) 
        
        if not api_key:
            raise MissingAPIKeyException() 
            
        return url

        
       

