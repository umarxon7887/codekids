import type { ReactNode } from 'react'
import { CodeXml, Grid3x3, Keyboard, Terminal } from 'lucide-react'
import { APP_NAME } from '@/config'

interface AuthLayoutProps {
  children: ReactNode
}

function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="mx-auto grid min-h-dvh max-w-5xl items-center gap-12 px-5 py-10 md:grid-cols-2">
      {/* Chap tomon: brend */}
      <section>
        <div className="flex size-24 items-center justify-center rounded-card bg-butter">
          <CodeXml className="size-10" strokeWidth={2.5} />
        </div>

        <h1 className="mt-6 text-6xl font-bold">{APP_NAME}</h1>
        <p className="mt-3 text-xl text-ink-2">O'yin orqali mantiqiy fikrlashni o'rgan</p>

        <div className="mt-5 flex gap-3">
          <span className="flex size-14 items-center justify-center rounded-full bg-sky text-sky-800">
            <Keyboard className="size-6" />
          </span>
          <span className="flex size-14 items-center justify-center rounded-full bg-mint text-emerald-800">
            <Grid3x3 className="size-6" />
          </span>
          <span className="flex size-14 items-center justify-center rounded-full bg-lav text-violet-800">
            <Terminal className="size-6" />
          </span>
        </div>
      </section>

      {/* O'ng tomon: forma (Login yoki Register) */}
      <section>{children}</section>
    </div>
  )
}

export default AuthLayout
