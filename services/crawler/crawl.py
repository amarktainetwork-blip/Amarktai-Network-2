import argparse
import asyncio
import json
from urllib.parse import urlparse

import trafilatura
from playwright.async_api import async_playwright


async def crawl(url: str) -> dict:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Only HTTP and HTTPS URLs are allowed")

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, wait_until="networkidle", timeout=30000)
        html = await page.content()
        title = await page.title()
        await browser.close()

    text = trafilatura.extract(
        html,
        include_links=True,
        include_images=False,
        output_format="markdown",
        with_metadata=True,
    ) or ""
    return {"url": url, "title": title, "content": text, "method": "playwright+trafilatura"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    args = parser.parse_args()
    print(json.dumps(asyncio.run(crawl(args.url))))


if __name__ == "__main__":
    main()
