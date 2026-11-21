import type { ErrorDetail } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ErrorDetail[]

  constructor(status: number, code: string, message: string, details: ErrorDetail[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}
