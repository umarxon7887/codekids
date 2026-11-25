import type { ComponentProps, ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
interface IconFieldProps extends ComponentProps<'input'> {
  id: string
  label: string
  icon: ReactNode
  rightSlot?: ReactNode
}

function IconField({ id, label, icon, rightSlot, className, ...props }: IconFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[15px] font-medium">
        {label}
      </Label>

      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-ink-2 [&_svg]:size-5">
          {icon}
        </span>

        <Input id={id} className={cn('pl-13', rightSlot && 'pr-13', className)} {...props} />

        {rightSlot && <div className="absolute top-1/2 right-2 -translate-y-1/2">{rightSlot}</div>}
      </div>
    </div>
  )
}

export default IconField
