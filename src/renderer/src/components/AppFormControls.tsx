import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

type AppInputProps = React.ComponentProps<typeof Input>

type ScanButtonProps = React.ComponentProps<typeof Button>

function AppInput({ className, ...props }: AppInputProps): React.JSX.Element {
  return <Input className={cn('bg-white focus-visible:ring-1', className)} {...props} />
}

function ScanButton({
  className,
  variant = 'outline',
  ...props
}: ScanButtonProps): React.JSX.Element {
  return (
    <Button
      variant={variant}
      className={cn('cursor-pointer bg-zinc-700 text-zinc-100', className)}
      {...props}
    />
  )
}

function LogButton({
  className,
  variant = 'outline',
  ...props
}: ScanButtonProps): React.JSX.Element {
  return (
    <Button
      variant={variant}
      className={cn('cursor-pointer text-zinc-900', className)}
      {...props}
    />
  )
}

export { AppInput, ScanButton, LogButton }
