import sanitizeHtml from "sanitize-html"

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "blockquote",
  "pre",
  "code",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "figure",
  "figcaption",
  "h1",
  "h2",
  "h3",
  "h4"
]

export function sanitizeArticleHtml(html = "") {
  return sanitizeHtml(String(html || ""), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      code: ["class"],
      pre: ["class"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"]
    },
    allowedSchemesAppliedToAttributes: ["href", "src"],
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          rel: "noopener noreferrer"
        }
      })
    },
    exclusiveFilter(frame) {
      if (frame.tag === "img" && frame.attribs.src?.startsWith("data:text/html")) {
        return true
      }
      return false
    }
  })
}

export function toPlainExcerpt(html = "", maxLength = 180) {
  const text = sanitizeHtml(String(html || ""), { allowedTags: [], allowedAttributes: {} })
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return text.length > maxLength ? text.slice(0, maxLength).trim() : text
}
