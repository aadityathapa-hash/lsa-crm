import sys
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

if len(sys.argv) < 2:
    sys.exit("usage: python3 authorize_gmail.py <client_secret.json>")

flow = InstalledAppFlow.from_client_secrets_file(sys.argv[1], SCOPES)
creds = flow.run_local_server(port=0)
with open('gmail_token.json', 'w') as f:
    f.write(creds.to_json())

print("Wrote gmail_token.json")
