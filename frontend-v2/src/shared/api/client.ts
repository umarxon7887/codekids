import axios from 'axios'
import { env } from '@/shared/config/env'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
  },
})
