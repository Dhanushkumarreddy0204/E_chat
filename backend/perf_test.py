import asyncio
import time
import json
import urllib.request
import urllib.error

BASE = 'http://127.0.0.1:8000'
CREDS = {'email_or_username': 'dhanush', 'password': 'password123'}


def http_request(method, url, data=None, headers=None):
    headers = headers or {}
    if data:
        body = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
    else:
        body = None

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    t = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            elapsed = (time.monotonic() - t) * 1000
            return resp.status, elapsed, result
    except urllib.error.HTTPError as e:
        elapsed = (time.monotonic() - t) * 1000
        try:
            body = json.loads(e.read())
        except Exception:
            body = {}
        return e.code, elapsed, body


def run():
    print("=" * 60)
    print("EChat API Performance & Correctness Test")
    print("=" * 60)

    results = []

    # 1. Root health
    status, ms, _ = http_request('GET', f'{BASE}/')
    tag = 'PASS' if status == 200 else 'FAIL'
    print(f'[{tag}] GET /              {status}  {ms:.0f}ms')
    results.append((tag, 'GET /', ms))

    # 2. Login
    status, ms, data = http_request('POST', f'{BASE}/api/v1/auth/login', CREDS)
    tag = 'PASS' if status == 200 else 'FAIL'
    print(f'[{tag}] POST /auth/login   {status}  {ms:.0f}ms')
    results.append((tag, 'POST /auth/login', ms))
    token = data.get('access_token', '')
    user_id = data.get('user', {}).get('id', '')
    headers = {'Authorization': f'Bearer {token}'}

    # 3. /auth/me
    status, ms, me = http_request('GET', f'{BASE}/api/v1/auth/me', headers=headers)
    tag = 'PASS' if status == 200 else 'FAIL'
    print(f'[{tag}] GET /auth/me       {status}  {ms:.0f}ms  user={me.get("username","")}')
    results.append((tag, 'GET /auth/me', ms))

    # 4. Feed
    status, ms, body = http_request('GET', f'{BASE}/api/v1/posts/feed?page=1&limit=10', headers=headers)
    tag = 'PASS' if status == 200 else 'FAIL'
    items = len(body.get('items', []))
    print(f'[{tag}] GET /posts/feed    {status}  {ms:.0f}ms  items={items}')
    results.append((tag, 'GET /posts/feed', ms))

    # 5. Explore
    status, ms, body = http_request('GET', f'{BASE}/api/v1/posts/explore?page=1&limit=21', headers=headers)
    tag = 'PASS' if status == 200 else 'FAIL'
    items = len(body.get('items', []))
    print(f'[{tag}] GET /posts/explore {status}  {ms:.0f}ms  items={items}')
    results.append((tag, 'GET /posts/explore', ms))

    # 6. Clips
    status, ms, body = http_request('GET', f'{BASE}/api/v1/posts/clips?page=1&limit=10', headers=headers)
    tag = 'PASS' if status == 200 else 'FAIL'
    items = len(body.get('items', []))
    print(f'[{tag}] GET /posts/clips   {status}  {ms:.0f}ms  items={items}')
    results.append((tag, 'GET /posts/clips', ms))

    # 7. Stories feed
    status, ms, body = http_request('GET', f'{BASE}/api/v1/stories/feed', headers=headers)
    tag = 'PASS' if status == 200 else 'FAIL'
    groups = len(body) if isinstance(body, list) else 'err'
    print(f'[{tag}] GET /stories/feed  {status}  {ms:.0f}ms  groups={groups}')
    results.append((tag, 'GET /stories/feed', ms))

    # 8. Conversations
    status, ms, body = http_request('GET', f'{BASE}/api/v1/chat/conversations', headers=headers)
    tag = 'PASS' if status == 200 else 'FAIL'
    count = len(body) if isinstance(body, list) else 'err'
    print(f'[{tag}] GET /conversations {status}  {ms:.0f}ms  count={count}')
    results.append((tag, 'GET /conversations', ms))

    # 9. Notifications
    status, ms, body = http_request('GET', f'{BASE}/api/v1/notifications/?limit=30', headers=headers)
    tag = 'PASS' if status == 200 else 'FAIL'
    count = len(body) if isinstance(body, list) else 'err'
    print(f'[{tag}] GET /notifications {status}  {ms:.0f}ms  count={count}')
    results.append((tag, 'GET /notifications', ms))

    # 10. Saved posts
    status, ms, body = http_request('GET', f'{BASE}/api/v1/posts/saved/all', headers=headers)
    tag = 'PASS' if status == 200 else 'FAIL'
    count = len(body) if isinstance(body, list) else 'err'
    print(f'[{tag}] GET /posts/saved   {status}  {ms:.0f}ms  count={count}')
    results.append((tag, 'GET /posts/saved', ms))

    # 11. User suggestions
    status, ms, body = http_request('GET', f'{BASE}/api/v1/users/suggestions', headers=headers)
    tag = 'PASS' if status == 200 else 'FAIL'
    count = len(body) if isinstance(body, list) else 'err'
    print(f'[{tag}] GET /suggestions   {status}  {ms:.0f}ms  count={count}')
    results.append((tag, 'GET /suggestions', ms))

    # 12. User profile
    username = me.get('username', 'alice')
    status, ms, body = http_request('GET', f'{BASE}/api/v1/users/{username}', headers=headers)
    tag = 'PASS' if status == 200 else 'FAIL'
    print(f'[{tag}] GET /users/profile {status}  {ms:.0f}ms  user={body.get("username","")}')
    results.append((tag, 'GET /users/profile', ms))

    # 13. User search
    status, ms, body = http_request('GET', f'{BASE}/api/v1/users/search?q=a', headers=headers)
    tag = 'PASS' if status == 200 else 'FAIL'
    count = len(body) if isinstance(body, list) else 'err'
    print(f'[{tag}] GET /users/search  {status}  {ms:.0f}ms  count={count}')
    results.append((tag, 'GET /users/search', ms))

    # 14. Unread notifications count
    status, ms, body = http_request('GET', f'{BASE}/api/v1/notifications/unread-count', headers=headers)
    tag = 'PASS' if status == 200 else 'FAIL'
    print(f'[{tag}] GET /notif/unread  {status}  {ms:.0f}ms  count={body.get("unread_count","?")}')
    results.append((tag, 'GET /notif/unread', ms))

    print()
    print("=" * 60)
    passed = sum(1 for r in results if r[0] == 'PASS')
    failed = sum(1 for r in results if r[0] == 'FAIL')
    avg_ms = sum(r[2] for r in results) / len(results)
    slow = [r for r in results if r[2] > 200]
    print(f"Results: {passed} PASS / {failed} FAIL  |  Avg: {avg_ms:.0f}ms")
    if slow:
        print(f"\nSlow endpoints (>200ms):")
        for r in slow:
            print(f"  {r[1]}  {r[2]:.0f}ms")
    else:
        print("All endpoints responded under 200ms target!")
    print("=" * 60)


if __name__ == '__main__':
    run()
