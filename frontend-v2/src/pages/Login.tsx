import { Eye, Lock, Mail } from 'lucide-react'
import AuthLayout from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-[15px] font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-ink-2" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email manzilingiz"
                    autoComplete="username"
                    className="pl-13"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-[15px] font-medium">
                  Parol
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-ink-2" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Parolingizni yozing"
                    autoComplete="current-password"
                    className="pr-13 pl-13"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Parolni ko'rsatish"
                    className="absolute top-1/2 right-2 size-10 -translate-y-1/2 rounded-full text-ink-2"
                  >
                    <Eye className="size-5" />
                  </Button>
                </div>
              </div>

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
