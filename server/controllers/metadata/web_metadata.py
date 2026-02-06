import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from fastapi import HTTPException
import tldextract

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0 Safari/537.36"
    )
}

def _first(*values):
    for v in values:
        if v:
            return v
    return None


def get_website_metadata(url: str):
    try:
        r = requests.get(
            url,
            headers=HEADERS,
            timeout=10,
            allow_redirects=True,
        )
        r.raise_for_status()

    except Exception as e:
        raise HTTPException(400, f"Failed fetching site: {e}")

    soup = BeautifulSoup(r.text, "html.parser")

    def meta(property=None, name=None):
        if property:
            tag = soup.find("meta", property=property)
        else:
            tag = soup.find("meta", attrs={"name": name})
        return tag["content"].strip() if tag and tag.get("content") else None
    
    title = _first(
        meta(property="og:title"),
        meta(name="twitter:title"),
        soup.title.string.strip() if soup.title else None,
    )

    description = _first(
        meta(property="og:description"),
        meta(name="twitter:description"),
        meta(name="description"),
    )

    image = _first(
        meta(property="og:image"),
        meta(name="twitter:image"),
    )

    if image:
        image = urljoin(url, image)

    icon = None

    for rel in ["icon", "shortcut icon", "apple-touch-icon"]:
        link = soup.find("link", rel=rel)
        if link and link.get("href"):
            icon = urljoin(url, link["href"])
            break

    if not icon:
        icon = urljoin(url, "/favicon.ico")

    ext = tldextract.extract(url)
    base = f"{ext.domain}.{ext.suffix}"

    return {
        "title": title or base,
        "thumbnail": icon,
        "metadata": base,
        "final_url": r.url,
    }
