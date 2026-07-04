import { ReactNode } from "react"

export type NextParams = Record<string, string | string[]>
export type NextSearchParams = Record<string, string | string[] | undefined>

export type NextPageProps = {
  params: Promise<NextParams>,
  searchParams: Promise<NextSearchParams>
}

export function checkParams<T extends string>(params: NextParams, requiredKeys: T | T[], errorMessage?: string) {
  const keys = Array.isArray(requiredKeys) ? requiredKeys : [requiredKeys]

  for (const key of keys) {
    if (!(key in params))
      throw new Error(errorMessage || `Missing required param: ${key}`)
  }

  return params as Record<T, string | string[]>
}

export type NextLayoutProps = {
  params: Promise<NextParams>,
  children: ReactNode,
}
