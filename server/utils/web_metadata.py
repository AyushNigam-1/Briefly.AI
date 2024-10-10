import requests
from bs4 import BeautifulSoup
from fastapi import HTTPException

def get_website_metadata(url: str):
    try:
        response = requests.get(url)
        response.raise_for_status()  
        soup = BeautifulSoup(response.content, 'html.parser')

        
        title = soup.title.string if soup.title else 'No title found'

        
        favicon = None
        icon_link = soup.find('link', rel='icon')
        if not icon_link:
            icon_link = soup.find('link', rel='shortcut icon')
        if icon_link:
            favicon = icon_link['href']
            if not favicon.startswith(('http://', 'https://')):
                favicon = requests.compat.urljoin(url, favicon)

        
        canonical_link = soup.find('link', rel='canonical')
        canonical_url = canonical_link['href'] if canonical_link else url  

        
        description_tag = soup.find('meta', attrs={'name': 'description'})
        meta_description = description_tag['content'] if description_tag else 'No description found'

        
        return {
            'type': 'web',
            'title': title,
            'favicon': favicon,
            'canonical_url': canonical_url,
            'meta_description': meta_description
        }

    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=str(e))
