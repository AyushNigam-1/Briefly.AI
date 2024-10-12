import requests
from bs4 import BeautifulSoup
from fastapi import HTTPException
import tldextract
def get_website_metadata(url: str):
    try:
        response = requests.get(url)
        response.raise_for_status()  
        soup = BeautifulSoup(response.content, 'html.parser')

        # Extract the title of the webpage
        title = soup.title.string if soup.title else 'No title found'

        # Extract the favicon of the webpage
        favicon = None
        icon_link = soup.find('link', rel='icon')
        if not icon_link:
            icon_link = soup.find('link', rel='shortcut icon')
        if icon_link:
            favicon = icon_link['href']
            if not favicon.startswith(('http://', 'https://')):
                favicon = requests.compat.urljoin(url, favicon)

        # Extract the meta description of the webpage
        description_tag = soup.find('meta', attrs={'name': 'description'})
        meta_description = description_tag['content'] if description_tag else 'No description found'

        # Return the metadata as a dictionary
        return {
            'type': 'web',
            'title': title,
            'favicon': favicon,
            'meta_description': meta_description,
            'base_url': tldextract.extract(url).domain
        }

    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=str(e))
