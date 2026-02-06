'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export type UserRole = 'admin' | 'manager' | 'receptionist' | 'employee' | null;

export function useUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('id', user.id)
          .single();
        setRole(data?.role || 'employee');
      }
      setLoading(false);
    }
    getRole();
  }, []);

  return { role, loading };
}