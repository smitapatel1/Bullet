import asyncio
import json
import random
from typing import Dict, Any, List, Optional
from datetime import datetime
import httpx

from app.core.config import settings

try:
    from playwright.async_api import async_playwright, Browser, Page, Error as PlaywrightError
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


class BrowserManager:
    def __init__(self):
        self.browser_pool = []
        self.context_pool = {}
        self.max_browsers = settings.BROWSER_POOL_SIZE
        self.playwright = None

    async def get_browser(self) -> 'Browser':
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError("Playwright not installed. Install with: pip install playwright && playwright install")

        if not self.playwright:
            self.playwright = await async_playwright().start()

        if len(self.browser_pool) < self.max_browsers:
            browser = await self.playwright.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-software-rasterizer',
                ]
            )
            self.browser_pool.append(browser)

        return self.browser_pool[0] if self.browser_pool else None

    async def create_context(self, browser: 'Browser', proxy: Dict[str, str] = None) -> 'BrowserContext':
        context_options = {
            'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'viewport': {'width': 1920, 'height': 1080},
            'java_script_enabled': True,
            'ignore_https_errors': True,
        }

        if proxy:
            context_options['proxy'] = proxy

        return await browser.new_context(**context_options)

    async def scrape(
        self,
        url: str,
        max_pages: int = 1,
        wait_selector: str = None,
        extract_schema: Dict[str, Any] = None,
        actions: List[Dict[str, Any]] = None,
        output: str = 'json',
        screenshot: bool = False
    ) -> List[Dict[str, Any]]:
        if not PLAYWRIGHT_AVAILABLE:
            return await self._http_fallback(url)

        browser = await self.get_browser()
        if not browser:
            return []

        context = await self.create_context(browser)
        page = await context.new_page()

        results = []
        visited = set()
        to_visit = [url]

        try:
            while to_visit and len(visited) < max_pages:
                current_url = to_visit.pop(0)
                if current_url in visited:
                    continue

                try:
                    await page.goto(current_url, wait_until='networkidle', timeout=30000)

                    if wait_selector:
                        await page.wait_for_selector(wait_selector, timeout=10000)

                    if actions:
                        for action in actions:
                            await self._execute_action(page, action)

                    page_data = await self._extract_page_data(page, extract_schema)
                    results.append(page_data)
                    visited.add(current_url)

                    if screenshot:
                        screenshot_path = f"/tmp/screenshot_{datetime.now().timestamp()}.png"
                        await page.screenshot(path=screenshot_path, full_page=True)
                        page_data['_screenshot'] = screenshot_path

                    links = await self._extract_links(page, extract_schema)
                    for link in links:
                        if link not in visited and len(to_visit) < max_pages - len(visited):
                            to_visit.append(link)

                    await asyncio.sleep(random.uniform(0.5, 2.0))

                except PlaywrightError as e:
                    print(f"Error processing {current_url}: {e}")
                    continue

        finally:
            await context.close()

        return results

    async def _execute_action(self, page: 'Page', action: Dict[str, Any]):
        action_type = action.get('type')

        if action_type == 'click':
            selector = action.get('selector')
            wait_before = action.get('wait_before', 0)
            wait_after = action.get('wait_after', 1000)

            await asyncio.sleep(wait_before / 1000)
            await page.click(selector)
            await asyncio.sleep(wait_after / 1000)

        elif action_type == 'fill':
            selector = action.get('selector')
            value = action.get('value')
            await page.fill(selector, value)

        elif action_type == 'press':
            key = action.get('key', 'Enter')
            await page.keyboard.press(key)

        elif action_type == 'scroll':
            direction = action.get('direction', 'down')
            amount = action.get('amount', 500)
            if direction == 'down':
                await page.evaluate(f'window.scrollBy(0, {amount})')
            else:
                await page.evaluate(f'window.scrollBy(0, -{amount})')

        elif action_type == 'wait':
            selector = action.get('selector')
            if selector:
                await page.wait_for_selector(selector, timeout=action.get('timeout', 5000))
            else:
                await asyncio.sleep(action.get('duration', 1000) / 1000)

        elif action_type == 'select':
            selector = action.get('selector')
            value = action.get('value')
            await page.select_option(selector, value)

        elif action_type == 'hover':
            selector = action.get('selector')
            await page.hover(selector)

    async def _extract_page_data(
        self,
        page: 'Page',
        extract_schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        if not extract_schema:
            content = await page.content()
            return {
                'url': page.url,
                'html': content,
                'title': await page.title()
            }

        return await page.evaluate(f'''
            () => {{
                const schema = {json.dumps(extract_schema)};
                const result = {{ url: window.location.href }};

                if (schema.type === 'list' && schema.container) {{
                    const items = document.querySelectorAll(schema.container);
                    result.data = [];

                    items.forEach(item => {{
                        const row = {{}};
                        for (const [field, selector] of Object.entries(schema.fields || {{}}) {{
                            const elem = item.querySelector(selector);
                            row[field] = elem ? elem.textContent.trim() : null;
                        }}
                        result.data.push(row);
                    }});
                }} else if (schema.fields) {{
                    result.data = {{}};
                    for (const [field, selector] of Object.entries(schema.fields)) {{
                        const elem = document.querySelector(selector);
                        result.data[field] = elem ? elem.textContent.trim() : null;
                    }}
                }}

                return result;
            }}
        ''')

    async def _extract_links(self, page: 'Page', extract_schema: Dict[str, Any] = None) -> List[str]:
        link_selector = extract_schema.get('link_selector', 'a[href]') if extract_schema else 'a[href]'

        return await page.evaluate(f'''
            () => {{
                const links = [];
                document.querySelectorAll('{link_selector}').forEach(a => {{
                    const href = a.getAttribute('href');
                    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {{
                        const fullUrl = new URL(href, window.location.href).href;
                        links.push(fullUrl);
                    }}
                }});
                return [...new Set(links)];
            }}
        ''')

    async def _http_fallback(self, url: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            response = await client.get(url)
            return [{
                'url': str(response.url),
                'html': response.text,
                'status': response.status_code
            }]

    async def record_actions(
        self,
        url: str,
        actions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        if not PLAYWRIGHT_AVAILABLE:
            return {"error": "Playwright not available"}

        browser = await self.get_browser()
        if not browser:
            return {"error": "Failed to create browser"}

        context = await self.create_context(browser)
        page = await context.new_page()

        recording_events = []

        try:
            page.on('click', lambda *args: recording_events.append({
                'type': 'click',
                'selector': args[0] if args else None,
                'timestamp': datetime.utcnow().isoformat()
            }))

            await page.goto(url)
            await asyncio.sleep(2)

            for action in actions:
                await self._execute_action(page, action)
                recording_events.append({
                    **action,
                    'timestamp': datetime.utcnow().isoformat()
                })

            return {
                'events': recording_events,
                'url': page.url,
                'duration_seconds': len(actions) * 2
            }

        finally:
            await context.close()
