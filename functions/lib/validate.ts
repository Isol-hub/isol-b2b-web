export interface ValidationError {
  field: string
  max: number
}

export function assertMaxLen(value: string | null | undefined, field: string, max: number): void {
  if (value && value.length > max) throw { field, max } as ValidationError
}

export function isValidationError(err: unknown): err is ValidationError {
  return typeof err === 'object' && err !== null && 'field' in err && 'max' in err
}
