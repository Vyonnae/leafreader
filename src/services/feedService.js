import { ApiError, ApiNetworkError, ApiTimeoutError, apiClient } from './apiClient'

export function userMessageForFeedError(error) {
  if (error instanceof ApiTimeoutError) {
    return 'The feed took too long to respond. Try again in a moment.'
  }

  if (error instanceof ApiNetworkError) {
    return 'LeafReader could not reach the feed service. Your local reading space is still safe.'
  }

  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return 'Sign in to sync publications across devices.'
    if (error.status === 404) return 'No RSS or Atom feed was found at that address.'
    if (error.status === 409) return 'That publication is already in your library.'
    if (error.status === 429) return 'This feed was refreshed recently. Try again in a few minutes.'
    if (error.status >= 500) return 'LeafReader could not refresh this feed right now.'
    return error.message
  }

  return 'LeafReader could not complete this feed action.'
}

export function discoverFeed(url) {
  return apiClient.post('/api/feeds/discover', { url })
}

export function subscribeToFeed(url, options = {}) {
  return apiClient.post('/api/feeds/subscribe', {
    url,
    customTitle: options.customTitle || null,
    collectionId: options.collectionId || null,
  })
}

export function refreshFeed(subscriptionId) {
  return apiClient.post('/api/feeds/refresh', { subscriptionId })
}

export function removeSubscription(subscriptionId) {
  return apiClient.delete('/api/subscriptions/remove', {
    body: { subscriptionId },
  })
}

export function getLibrary(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value)
  })
  const query = search.toString()
  return apiClient.get(`/api/library${query ? `?${query}` : ''}`)
}

export function importOpml(feeds) {
  return apiClient.post('/api/opml/import', { feeds })
}

export function exportOpml() {
  return apiClient.get('/api/opml/export', {
    headers: { Accept: 'application/xml' },
  })
}

export function deleteAccount(confirmation) {
  return apiClient.delete('/api/account', {
    body: { confirmation },
  })
}

export const feedService = {
  discoverFeed,
  subscribeToFeed,
  refreshFeed,
  removeSubscription,
  getLibrary,
  importOpml,
  exportOpml,
  deleteAccount,
  userMessageForFeedError,
}
