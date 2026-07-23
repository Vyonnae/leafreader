export class AiServiceNotConfiguredError extends Error {
  constructor() {
    super('AI服务未配置')
    this.name = 'AiServiceNotConfiguredError'
  }
}

export async function summarizeArticle() {
  throw new AiServiceNotConfiguredError()
}

export const aiService = {
  summarizeArticle,
}
