import { User } from '@supabase/supabase-js';

/**
 * Gets user initials from email address
 * @param user - Supabase user object or email string
 * @returns User initials (e.g., "JD" for john.doe@email.com)
 */
export const getUserInitials = (user: User | null | undefined): string => {
  if (!user?.email) return 'U';
  
  const email = user.email;
  const parts = email.split('@')[0].split(/[._-]/);
  
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  
  return email.substring(0, 2).toUpperCase();
};

/**
 * Gets user display name from email address
 * @param user - Supabase user object or email string
 * @returns User display name (email before @)
 */
export const getUserDisplayName = (user: User | null | undefined): string => {
  if (!user?.email) return 'User';
  return user.email.split('@')[0];
};

