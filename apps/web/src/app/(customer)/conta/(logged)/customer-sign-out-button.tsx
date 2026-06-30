'use client';

import { LogOut } from 'lucide-react';

import { customerSignOut } from '@/app/(customer)/actions';
import { Button } from '@/components/ui/button';

export function CustomerSignOutButton() {
  return (
    <form action={customerSignOut}>
      <Button type="submit" variant="ghost" size="sm">
        <LogOut className="mr-1.5 h-4 w-4" />
        Sair
      </Button>
    </form>
  );
}
