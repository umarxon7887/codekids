import { Eye, Lock, Mail } from 'lucide-react'
import AuthLayout from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import IconField from '@/components/form/IconFields'

function Login() {
  return (
    <AuthLayout>
      <div className="flex flex-col gap-5">
        <Card className="gap-4 rounded-card p-7 shadow-soft ring-line">
          <CardHeader className="px-0">
            <CardTitle className="text-2xl font-semibold">Kirish</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
              <IconField
                id="email"
                label="Email"
                icon={<Mail />}
                type="email"
                placeholder="Email manzilingiz"
              />
              <IconField
                id="password"
                label="Parol"
                icon={<Lock />}
                type="password"
                placeholder="Parolingizni yozing"
                autoComplete="current-password"
                rightSlot={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Parolni ko'rsatish"
                    className="size-10 rounded-full text-ink-2"
                  >
                    <Eye className="size-5" />
                  </Button>
                }
              />
              <Button type="submit" size="xl" className="mt-1 w-full">
                Kirish
              </Button>
            </form>
          </CardContent>
        </Card>

        <Button variant="outline" size="xl" asChild className="w-full">
          <a href="/guest">Mehmon sifatida mashq qilish</a>
        </Button>

        <p className="text-center text-base text-ink-2">
          Hisobingiz yo'qmi?{' '}
          <a href="/register" className="p-1 font-semibold text-ink">
            Ro'yxatdan o'tish
          </a>
        </p>
      </div>
    </AuthLayout>
  )
}

export default Login
