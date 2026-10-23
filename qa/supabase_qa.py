"""Test-only Supabase session for the Playwright admin audits.

The dashboard route is guarded by Supabase Auth, so a browser audit cannot open
it without a real owner account. This module injects a synthetic session into
the *test* browser and answers the two Supabase endpoints the guard calls. It
never touches the application bundle and never uses real credentials.

Returns ``None`` when no local Supabase configuration is available; callers can
then skip the dashboard route instead of inventing a pass.
"""

from __future__ import annotations

import json
import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
USER_ID = '00000000-0000-0000-0000-000000000001'


def _read_env() -> dict[str, str]:
    values: dict[str, str] = {}
    for name in ('.env.local', '.env'):
        path = ROOT / name
        if not path.exists():
            continue
        for line in path.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def owner_session(context) -> str | None:
    """Add an init script that seeds a non-expiring test session.

    Returns the Supabase project ref on success, otherwise ``None``.
    """
    env = _read_env()
    url = env.get('VITE_SUPABASE_URL', '')
    if not url:
        return None

    ref = re.sub(r'^https?://', '', url).split('.')[0]
    now = int(time.time())
    session = {
        'access_token': 'qa-playwright-token',
        'token_type': 'bearer',
        'expires_in': 3600,
        'expires_at': now + 3600,
        'refresh_token': 'qa-playwright-refresh',
        'user': {
            'id': USER_ID,
            'aud': 'authenticated',
            'role': 'authenticated',
            'email': 'qa@example.invalid',
            'email_confirmed_at': '2026-01-01T00:00:00Z',
            'phone': '',
            'confirmed_at': '2026-01-01T00:00:00Z',
            'last_sign_in_at': '2026-01-01T00:00:00Z',
            'app_metadata': {'provider': 'email', 'providers': ['email']},
            'user_metadata': {},
            'identities': [],
            'created_at': '2026-01-01T00:00:00Z',
            'updated_at': '2026-01-01T00:00:00Z',
            'is_anonymous': False,
        },
    }
    key = f'sb-{ref}-auth-token'
    context.add_init_script(
        f'localStorage.setItem({json.dumps(key)}, {json.dumps(json.dumps(session))});'
    )
    return ref


def mock_owner_api(page) -> None:
    """Answer the owner allow-list and auth calls made by the route guard."""
    page.route(
        '**/rest/v1/owners*',
        lambda route: route.fulfill(
            status=200,
            content_type='application/json',
            headers={'content-range': '0-0/1'},
            body=json.dumps({'user_id': USER_ID}),
        ),
    )
    page.route(
        '**/auth/v1/**',
        lambda route: route.fulfill(
            status=200,
            content_type='application/json',
            body='{}',
        ),
    )
