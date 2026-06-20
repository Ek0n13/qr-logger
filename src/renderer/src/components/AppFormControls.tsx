import { Input } from '@renderer/components/ui/input'
import { cn } from '@renderer/lib/utils'

type AppInputProps = React.ComponentProps<typeof Input>

function AppInput({ className, ...props }: AppInputProps): React.JSX.Element {
  return <Input className={cn('bg-white focus-visible:ring-1', className)} {...props} />
}

export { AppInput }
