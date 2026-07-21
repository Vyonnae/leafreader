import dns from "node:dns/promises"
import http from "node:http"
import https from "node:https"
import ipaddr from "ipaddr.js"

const LOCAL_HOSTNAMES = new Set(["localhost", "localhost.localdomain"])
const DEFAULT_TIMEOUT_MS = Number(process.env.RSS_FETCH_TIMEOUT_MS || 10000)
const DEFAULT_MAX_BYTES = Number(process.env.RSS_MAX_RESPONSE_BYTES || 5 * 1024 * 1024)

export function normalizeFeedUrl(value) {
  let url

  try {
    url = new URL(String(value || "").trim())
  } catch {
    throw new Error("Feed URL must be a valid HTTP or HTTPS URL.")
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Feed URL must use HTTP or HTTPS.")
  }

  if (url.username || url.password) {
    throw new Error("Feed URL must not include credentials.")
  }

  const hostname = url.hostname.toLowerCase()
  if (LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".localhost")) {
    throw new Error("Local feed URLs are not allowed.")
  }

  url.hash = ""
  return url.toString()
}

export function isBlockedAddress(address) {
  let parsed

  try {
    parsed = ipaddr.parse(address)
  } catch {
    return true
  }

  const range = parsed.range()

  if (["loopback", "private", "linkLocal", "uniqueLocal", "multicast", "unspecified", "broadcast", "carrierGradeNat"].includes(range)) {
    return true
  }

  if (parsed.kind() === "ipv4") {
    const octets = parsed.octets
    return (
      (octets[0] === 0) ||
      (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) ||
      (octets[0] === 169 && octets[1] === 254) ||
      (octets[0] === 192 && octets[1] === 0 && octets[2] === 0) ||
      (octets[0] === 192 && octets[1] === 0 && octets[2] === 2) ||
      (octets[0] === 198 && [18, 19].includes(octets[1])) ||
      (octets[0] === 198 && octets[1] === 51 && octets[2] === 100) ||
      (octets[0] === 203 && octets[1] === 0 && octets[2] === 113) ||
      (octets[0] >= 240)
    )
  }

  return ["reserved", "ipv4Mapped"].includes(range)
}

export async function resolvePublicAddress(hostname) {
  const records = await dns.lookup(hostname, { all: true, verbatim: true })
  const blocked = records.find((record) => isBlockedAddress(record.address))

  if (blocked) {
    throw new Error("Feed URL resolves to a private or unsafe address.")
  }

  if (!records.length) {
    throw new Error("Feed URL could not be resolved.")
  }

  return records[0]
}

export async function fetchText(urlValue, options = {}) {
  const maxRedirects = options.maxRedirects ?? 4
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  return fetchTextInternal(normalizeFeedUrl(urlValue), { maxRedirects, maxBytes, timeoutMs, redirectsSeen: 0, headers: options.headers || {} })
}

async function fetchTextInternal(urlValue, options) {
  const url = new URL(urlValue)
  const resolved = await resolvePublicAddress(url.hostname)
  const client = url.protocol === "https:" ? https : http

  return new Promise((resolve, reject) => {
    const request = client.request({
      protocol: url.protocol,
      hostname: resolved.address,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: "GET",
      timeout: options.timeoutMs,
      headers: {
        ...options.headers,
        Host: url.host,
        "User-Agent": "LeafReader/1.0 RSS fetcher",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8"
      },
      servername: url.hostname
    }, (response) => {
      const status = response.statusCode || 0

      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.resume()
        if (options.redirectsSeen >= options.maxRedirects) {
          reject(new Error("Too many feed redirects."))
          return
        }

        const nextUrl = new URL(response.headers.location, url).toString()
        fetchTextInternal(nextUrl, { ...options, redirectsSeen: options.redirectsSeen + 1 }).then(resolve, reject)
        return
      }

      const chunks = []
      let received = 0

      response.on("data", (chunk) => {
        received += chunk.length
        if (received > options.maxBytes) {
          request.destroy(new Error("Feed response is too large."))
          return
        }
        chunks.push(chunk)
      })

      response.on("end", () => {
        resolve({
          status,
          headers: response.headers,
          url: url.toString(),
          text: Buffer.concat(chunks).toString("utf8")
        })
      })
    })

    request.on("timeout", () => request.destroy(new Error("Feed request timed out.")))
    request.on("error", reject)
    request.end()
  })
}
