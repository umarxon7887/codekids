export interface ErrorDetail {
  path: string
  message: string
}
export interface BackendErrorBody {
  error: {
    code: string
    message: string
    details?: ErrorDetail[]
  }
}
