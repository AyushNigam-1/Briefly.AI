import requests


url = "https://www.eventbriteapi.com/v3/users/me/events/"
# params = {
#     "q": "spiritual wellness",
#     "location.address": "Delhi",
#     "location.within": "50km",
#     "start_date.range_start": "2025-03-01T00:00:00Z",
#     "start_date.range_end": "2025-03-07T23:59:59Z"
# }
headers = {"Authorization": "Bearer SMHU2H3I6TDSTG2MIL7IEHDJ2Y7XG2UC74KAOGTRYFVMSJNPGJ"}

response = requests.get(url, headers=headers)
data = response.json()

print(data)
