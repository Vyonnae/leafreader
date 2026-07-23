import { extractArticleFromHtml } from "../src/utils/articleExtractor.js"
import { sanitizeArticleHtml, toPlainExcerpt } from "./_lib/sanitizer.js"
import { json, readJsonBody, ApiRequestError, withApi } from "./_lib/responses.js"
import { fetchText, normalizeFeedUrl } from "./_lib/urlSecurity.js"

const ARTICLE_TIMEOUT_MS = Number(process.env.ARTICLE_FETCH_TIMEOUT_MS || 12000)
const ARTICLE_MAX_BYTES = Number(process.env.ARTICLE_MAX_RESPONSE_BYTES || 6 * 1024 * 1024)

function normalizeArticleUrl(value) {
  try {
    return normalizeFeedUrl(value)
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw new ApiRequestError("INVALID_ARTICLE_URL", "Article URL must be a valid public HTTP or HTTPS URL.", error.status)
    }
    throw error
  }
}

function contentTypeAllowsHtml(contentType = "") {
  const normalized = String(contentType).toLowerCase()
  return !normalized || normalized.includes("text/html") || normalized.includes("application/xhtml+xml")
}

export default withApi(async (req, res, requestId) => {
  const body = await readJsonBody(req)
  const url = normalizeArticleUrl(body.url)

  let response
  try {
    response = await fetchText(url, {
      timeoutMs: ARTICLE_TIMEOUT_MS,
      maxBytes: ARTICLE_MAX_BYTES,
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.6",
      },
    })
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw new ApiRequestError("ARTICLE_FETCH_FAILED", "Unable to fetch the full article right now.", error.status, { cause: error })
    }
    throw error
  }

  if (response.status < 200 || response.status >= 300) {
    throw new ApiRequestError("ARTICLE_FETCH_FAILED", "The article page could not be loaded.", 502)
  }

  if (!contentTypeAllowsHtml(response.headers["content-type"])) {
    throw new ApiRequestError("ARTICLE_NOT_HTML", "The article page did not return readable HTML.", 415)
  }

  const extracted = await extractArticleFromHtml(response.text, response.url || url)
  const content = sanitizeArticleHtml(extracted.content)

  if (!content) {
    throw new ApiRequestError("ARTICLE_NOT_READABLE", "Unable to extract readable article content.", 422)
  }

  return json(res, 200, {
    title: extracted.title,
    content,
    excerpt: extracted.excerpt || toPlainExcerpt(content, 220),
    author: extracted.byline,
    byline: extracted.byline,
    length: extracted.length,
    readingTime: extracted.readingTime,
    image: extracted.image,
  }, requestId)
}, ["POST"])
