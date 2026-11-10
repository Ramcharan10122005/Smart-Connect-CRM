import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initials } from '@/lib/utils';

export function OwnerSelect({ value, onChange, placeholder = 'Select owner...', disabled = false }) {
  const { data: usersData, isLoading } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await api.get('/users?limit=100');
      return res.data?.data || [];
    },
  });

  const users = usersData || [];

  return (
    <Select
      value={value || ''}
      onValueChange={(val) => onChange(val === '__unassigned__' ? null : val)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full rounded-crm font-normal text-sm h-9 bg-background">
        <SelectValue placeholder={isLoading ? 'Loading owners...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-3 text-xs text-muted-foreground">
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Loading team members...
          </div>
        ) : (
          <>
            <SelectItem value="__unassigned__" className="text-muted-foreground italic text-xs">
              (Unassigned)
            </SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id} className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">({user.role})</span>
                </div>
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
}

export default OwnerSelect;
