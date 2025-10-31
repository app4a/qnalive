'use client'

import { LogOut, User } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LanguageSwitcherMenu } from './language-switcher-menu'

interface UserMenuProps {
  userName: string | null | undefined
  userEmail?: string | null | undefined
}

export function UserMenu({ userName, userEmail }: UserMenuProps) {
  const t = useTranslations('common')
  
  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  // Get user initials for mobile view
  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return 'U'
  }

  const displayName = userName || userEmail
  const initials = getInitials(userName, userEmail)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
          <User className="h-4 w-4 text-gray-600 flex-shrink-0" />
          {/* Show initials on small screens, full name on medium+ */}
          <span className="text-sm font-medium text-gray-700 sm:hidden">
            {initials}
          </span>
          <span className="text-sm font-medium text-gray-700 truncate hidden sm:inline max-w-[120px] md:max-w-[150px]">
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none truncate">{userName}</p>
            {userEmail && (
              <p className="text-xs leading-none text-muted-foreground truncate">
                {userEmail}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <LanguageSwitcherMenu />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('signOut')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

