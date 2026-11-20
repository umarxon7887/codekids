const backendUrl = import.meta.env.VITE_API_URL ?? ''

export const env = {
  backendUrl,
  apiBaseUrl: `${backendUrl}/api/v1`,
} as const
