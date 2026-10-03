import base64
import os
import re
from urllib.parse import urlencode

import requests
from django.core import signing

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
API = "https://gmail.googleapis.com/gmail/v1/users/me"
SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
QUERY = (
    '(interview OR "next steps" OR "move forward" OR "your application" OR unfortunately '
    'OR "not selected" OR offer OR "phone screen" OR "schedule a call") '
    "-category:promotions -category:social"
)


class GmailError(Exception):
    pass


def _cfg():
    try:
        return (
            os.environ["GOOGLE_CLIENT_ID"],
            os.environ["GOOGLE_CLIENT_SECRET"],
            os.environ["GOOGLE_REDIRECT_URI"],
        )
    except KeyError:
        raise GmailError("Google credentials are not set in backend/.env.")


def auth_url(user):
    client_id, _, redirect = _cfg()
    state = signing.dumps({"u": user.id}, salt="gmail")  # signed, so the callback can trust it
    params = {
        "client_id": client_id,
        "redirect_uri": redirect,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{AUTH_URL}?{urlencode(params)}"


def user_id_from_state(state):
    return signing.loads(state, salt="gmail", max_age=600)["u"]


def exchange_code(code):
    client_id, secret, redirect = _cfg()
    r = requests.post(TOKEN_URL, data={
        "code": code, "client_id": client_id, "client_secret": secret,
        "redirect_uri": redirect, "grant_type": "authorization_code",
    }, timeout=15)
    data = r.json()
    if not r.ok or "refresh_token" not in data:
        raise GmailError("Google did not return a refresh token.")
    return data["refresh_token"]


def access_token(refresh_token):
    client_id, secret, _ = _cfg()
    r = requests.post(TOKEN_URL, data={
        "client_id": client_id, "client_secret": secret,
        "refresh_token": refresh_token, "grant_type": "refresh_token",
    }, timeout=15)
    if not r.ok:
        raise GmailError("Gmail access expired. Disconnect and reconnect Gmail.")
    return r.json()["access_token"]


def revoke(refresh_token):
    try:
        requests.post("https://oauth2.googleapis.com/revoke", params={"token": refresh_token}, timeout=10)
    except requests.RequestException:
        pass


def _get(token, path, **params):
    r = requests.get(f"{API}{path}", headers={"Authorization": f"Bearer {token}"}, params=params, timeout=20)
    if not r.ok:
        raise GmailError(f"Gmail returned an error ({r.status_code}).")
    return r.json()


def _body(payload):
    if payload.get("mimeType") == "text/plain" and payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"] + "==").decode("utf-8", "ignore")
    for part in payload.get("parts") or []:
        text = _body(part)
        if text:
            return text
    return ""


def recent_messages(token, since, limit=40):
    q = f"{QUERY} after:{int(since.timestamp())}"
    refs = _get(token, "/messages", q=q, maxResults=limit).get("messages", [])
    out = []
    for ref in refs:
        msg = _get(token, f"/messages/{ref['id']}", format="full")
        headers = {h["name"].lower(): h["value"] for h in msg["payload"].get("headers", [])}
        out.append({
            "id": ref["id"],
            "subject": headers.get("subject", ""),
            "from": headers.get("from", ""),
            "snippet": msg.get("snippet", ""),
            "body": _body(msg["payload"]),
        })
    return out


def match_application(apps, message):
    """Find the application whose company name appears in the email (longest name wins)."""
    haystack = f"{message['subject']} {message['from']} {message['body'][:3000]} {message['snippet']}".lower()
    best = None
    for app in apps:
        name = app.company.strip().lower()
        if name and re.search(rf"\b{re.escape(name)}\b", haystack):
            if best is None or len(name) > len(best.company):
                best = app
    return best