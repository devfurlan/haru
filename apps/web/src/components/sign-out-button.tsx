'use client';

import { LogOut } from 'lucide-react';

import { signOut } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
        <LogOut className="mr-2 h-4 w-4" />
        Sair
      </Button>
    </form>
  );
}
