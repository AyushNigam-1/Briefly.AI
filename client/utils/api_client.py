import requests
from typing import Optional
class SummarizerClient:
    def __init__(self, base_url: str):
        self.base_url = base_url

    def summarize(self, api_key: str, url: str) -> Optional[str]:
        try:
            response = requests.post(
                f"{self.base_url}/summarize/",
                json={"api_key": api_key, "url": url}
            )
            response.raise_for_status()
            return response.json().get("summary")
        except requests.HTTPError as e:
            return f"Error: {response.status_code} - {response.text}"
        except Exception as e:
            return f"Error: {str(e)}"
