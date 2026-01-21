import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_LABELS, UserRole } from '@/types/auth';
import AddUserModal from '@/components/admin/AddUserModal';

interface UserWithRole {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  team_name: string | null;
  points: number;
}

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin } = useUserRole();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);

  // Função estável de busca
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*, teams!team_id(name)')
        .order('name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) console.error('Erro roles:', rolesError);

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      const usersWithRoles: UserWithRole[] = (profiles || []).map(p => ({
        id: p.id,
        email: p.email,
        name: p.name,
        role: (roleMap.get(p.id) as UserRole) || 'student',
        team_name: p.teams?.name || null,
        points: p.points || 0,
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setIsLoading(false);
    }
  }, []); // Sem dependências externas críticas

  // Efeito de Carga e Proteção
  useEffect(() => {
    if (authLoading) return;

    if (!user || !isAdmin()) {
      navigate('/home');
      return;
    }

    fetchUsers();
  }, [user, authLoading, isAdmin, navigate, fetchUsers]);

  const handleEdit = (user: UserWithRole) => {
    setEditingUser(user);
    setShowAddModal(true);
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este usuário completamente?")) {
      const { error } = await supabase.rpc('delete_user_entirely', { user_id_to_delete: userId });
      if (!error) {
        alert('Usuário excluído.');
        fetchUsers();
      } else {
        alert('Erro ao excluir: ' + error.message);
      }
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      admin: 'bg-red-500/20 text-red-400 border-red-500/30',
      coordinator: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      superintendent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      manager: 'bg-green-500/20 text-green-400 border-green-500/30',
      student: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[role] || colors.student;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Gerenciar Usuários</h1>
            </div>
            <p className="text-muted-foreground">Gestão completa de usuários.</p>
          </div>
          <Button variant="netflix" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-surface border-border" />
        </div>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle>{filteredUsers.length} usuários</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 p-4 rounded-lg bg-surface hover:bg-surface-hover transition-colors">
                    <Avatar><AvatarFallback>{user.name[0]}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{user.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Badge className={getRoleBadgeColor(user.role)}>{ROLE_LABELS[user.role]}</Badge>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}><Edit className="w-4 h-4 text-blue-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <AddUserModal open={showAddModal} onClose={() => { setShowAddModal(false); setEditingUser(null); }} onSuccess={fetchUsers} initialData={editingUser} />
    </div>
  );
};

export default AdminUsers;