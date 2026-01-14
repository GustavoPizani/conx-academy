import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext'; // Importar useAuth
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
  const { user } = useAuth(); // Usar o user do contexto diretamente para verificação estável
  const { isAdmin } = useUserRole(); // Mantemos para uso no template se precisar
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Estado para Edição
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);

  useEffect(() => {
    // Verificação de segurança: Se não tem user ou não é admin, tchau.
    // Usamos user?.role diretamente na dependência para evitar o loop.
    if (user && user.role !== 'admin') {
      navigate('/home');
      return;
    }

    // Só busca se for admin
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user?.role, navigate]); // Dependência estável (string ou undefined)

  const fetchUsers = async () => {
    setIsLoading(true);
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*, teams!team_id(name)')
      .order('name');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setIsLoading(false);
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
    }

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
    setIsLoading(false);
  };

  // Funções de Ação
  const handleEdit = (user: UserWithRole) => {
    setEditingUser(user);
    setShowAddModal(true);
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm("Tem certeza que deseja excluir este usuário completamente (Auth + Banco)? Esta ação não pode ser desfeita.")) {
      // Usar a função RPC que deleta do Auth e do DB
      const { data, error } = await supabase.rpc('delete_user_entirely', {
        user_id_to_delete: userId
      });
      
      if (!error && data) {
        // Toast de sucesso
        const { toast } = await import('sonner');
        toast.success('Usuário excluído com sucesso', {
          description: 'O usuário foi removido da autenticação e do banco de dados.'
        });
        fetchUsers();
      } else {
        console.error("Erro ao excluir", error);
        const { toast } = await import('sonner');
        toast.error('Erro ao excluir usuário', {
          description: error?.message || 'Não foi possível excluir o usuário.'
        });
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
    return colors[role];
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Gerenciar Usuários</h1>
            </div>
            <p className="text-muted-foreground">
              Adicione, edite e gerencie os usuários da plataforma.
            </p>
          </div>
          
          <Button variant="netflix" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Adicionar Usuário
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-surface border-border"
          />
        </div>

        {/* Users List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">
              {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum usuário encontrado.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-surface hover:bg-surface-hover transition-colors"
                  >
                    <Avatar className="h-12 w-12 border-2 border-border">
                      <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{user.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>

                    <div className="hidden sm:block text-sm text-muted-foreground">
                      {user.team_name || '—'}
                    </div>

                    <Badge className={getRoleBadgeColor(user.role)}>
                      {ROLE_LABELS[user.role]}
                    </Badge>

                    {/* Botões de Ação (Adicionados) */}
                    <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                          <Edit className="w-4 h-4 text-blue-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-500 hover:bg-red-900/20" onClick={() => handleDelete(user.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="text-right ml-2">
                      <p className="text-sm font-semibold text-primary">{user.points.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">pontos</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddUserModal
        open={showAddModal}
        onClose={() => {
            setShowAddModal(false);
            setEditingUser(null); // Resetar edição ao fechar
        }}
        onSuccess={fetchUsers}
        initialData={editingUser} // Passar dados de edição
      />
    </div>
  );
};

export default AdminUsers;