import requests
from bs4 import BeautifulSoup
from fastapi import HTTPException
def get_website_metadata(url: str):
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise an error for bad responses
        soup = BeautifulSoup(response.content, 'html.parser')

        title = soup.title.string if soup.title else 'No title found'

        favicon = None
        icon_link = soup.find('link', rel='icon')
        if icon_link:
            favicon = icon_link['href']
        else:
            icon_link = soup.find('link', rel='shortcut icon')
            if icon_link:
                favicon = icon_link['href']

        if favicon and not favicon.startswith(('http://', 'https://')):
            favicon = requests.compat.urljoin(url, favicon)

        return {
            'type':'web',
            'title': title,
            'favicon': favicon
        }

    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=str(e))