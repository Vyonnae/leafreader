import { Readability } from "@mozilla/readability"
import { JSDOM } from "jsdom"

import { sanitizeArticleHtml, toPlainExcerpt } from "../../api/_lib/sanitizer.js"

function estimateReadingTime(html) {
  const words = toPlainExcerpt(html, Number.MAX_SAFE_INTEGER).split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
}

function absolutizeMedia(html, baseUrl) {
  if (!html) return ""
  const dom = new JSDOM(`<main>${html}</main>`, { url: baseUrl })
  dom.window.document.querySelectorAll("img").forEach((image) => {
    const src = image.getAttribute("src")
    if (!src) return
    try {
      image.setAttribute("src", new URL(src, baseUrl).toString())
    } catch {
      image.removeAttribute("src")
    }
  })
  dom.window.document.querySelectorAll("a").forEach((link) => {
    const href = link.getAttribute("href")
    if (!href) return
    try {
      link.setAttribute("href", new URL(href, baseUrl).toString())
    } catch {
      link.removeAttribute("href")
    }
  })
  return dom.window.document.querySelector("main").innerHTML
}

function firstImage(html) {
  const match = String(html || "").match(/<img[^>]+src=["']([^"']+)["']/i)
  return match?.[1] || ""
}

export function normalizeExtractedArticle(article = {}, fallbackUrl = "") {
  const content = sanitizeArticleHtml(absolutizeMedia(article.content || "", fallbackUrl))
  const excerpt = article.excerpt || toPlainExcerpt(content, 220)

  return {
    title: article.title || "",
    content,
    excerpt,
    byline: article.byline || "",
    length: article.length || toPlainExcerpt(content, Number.MAX_SAFE_INTEGER).length,
    readingTime: estimateReadingTime(content),
    image: article.image || firstImage(content),
  }
}

export async function extractArticleFromHtml(html, url) {
  const dom = new JSDOM(String(html || ""), { url })
  const reader = new Readability(dom.window.document, {
    keepClasses: true,
  })
  const article = reader.parse()

  if (!article?.content) {
    return normalizeExtractedArticle({
      title: dom.window.document.title || "",
      content: "",
      excerpt: "",
      byline: "",
      length: 0,
    }, url)
  }

  return normalizeExtractedArticle(article, url)
}
