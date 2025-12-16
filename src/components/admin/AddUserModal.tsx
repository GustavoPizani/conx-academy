import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS, UserRole } from '@/types/auth';
import { createClient } from '@supabase/supabase-js';

interface UserOption {
  id: string;
  name: string;
}

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

const roles: UserRole[] = ['admin', 'coordinator', 'superintendent', 'manager', 'student'];

const AddUserModal: React.FC<AddUserModalProps> = ({ open, onClose, onSuccess, initialData }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Listas de Líderes
  const [managers, setManagers] = useState<UserOption[]>([]);
  const [superintendents, setSuperintendents] = useState<UserOption[]>([]);
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'student' as UserRole,
    leader_id: '', // ID do Gerente ou Superintendente escolhido
  });

  const isEditing = !!initialData;

  // Buscar lista de líderes (Gerentes e Superintendentes)
  useEffect(() => {
    const fetchLeaders = async () => {
      console.log("Buscando líderes...");

      // 1. Busca todos os IDs que são gerentes ou superintendentes
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['manager', 'superintendent']);

      if (rolesError) {
        console.error('Erro ao buscar cargos:', rolesError);
        return;
      }

      if (!rolesData || rolesData.length === 0) {
        console.warn("Nenhum Gerente ou Superintendente encontrado no banco.");
        setManagers([]);
        setSuperintendents([]);
        return;
      }

      // 2. Com os IDs na mão, busca os nomes nos perfis
      const userIds = rolesData.map(r => r.user_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      if (profilesError) {
        console.error('Erro ao buscar perfis:', profilesError);
        return;
      }

      // 3. Monta as listas cruzando os dados
      const mgrs: UserOption[] = [];
      const supers: UserOption[] = [];

      rolesData.forEach(roleItem => {
        const profile = profilesData?.find(p => p.id === roleItem.user_id);
        if (profile) {
          if (roleItem.role === 'manager') {
            mgrs.push({ id: profile.id, name: profile.name });
          } else if (roleItem.role === 'superintendent') {
            supers.push({ id: profile.id, name: profile.name });
          }
        }
      });

      console.log(`Líderes carregados: ${mgrs.length} Gerentes, ${supers.length} Superintendentes.`);

      setManagers(mgrs.sort((a, b) => a.name.localeCompare(b.name)));
      setSuperintendents(supers.sort((a, b) => a.name.localeCompare(b.name)));
    };

    if (open) {
      fetchLeaders();
      // ... (Resto da lógica de reset do formulário mantém igual)
      if (initialData) {
        setFormData({
          email: initialData.email,
          name: initialData.name,
          password: '',
          role: initialData.role,
          leader_id: '',
        });
      } else {
        setFormData({
          email: '',
          name: '',
          password: '',
          role: 'student',
          leader_id: '',
        });
      }
    }
  }, [open, initialData]);

  // Função Auxiliar: Garante que o Líder tenha um time e retorna o ID desse time
  const getOrCreateTeamForLeader = async (leaderId: string, leaderName: string, parentTeamId: string | null = null) => {
    // 1. Verifica se já existe time liderado por ele
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('leader_id', leaderId)
      .maybeSingle();

    if (existingTeam) return existingTeam.id;

    // 2. Se não existe, cria um novo time
    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert({
        name: `Time ${leaderName}`, // Ex: Time Gustavo
        leader_id: leaderId,
        parent_team_id: parentTeamId
      })
      .select()
      .single();

    if (error) throw error;
    return newTeam.id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.name.trim()) {
       toast({ title: 'Erro', description: 'Nome e Email são obrigatórios.', variant: 'destructive' });
       return;
    }
    
    if (!isEditing && (!formData.password.trim() || formData.password.length < 6)) {
      toast({ title: 'Erro', description: 'Senha é obrigatória (min 6 caracteres).', variant: 'destructive' });
      return;
    }

    const isManagementRole = ['admin', 'coordinator'].includes(formData.role);

    // Validação de Hierarquia
    if (!isEditing && !isManagementRole) {
      if (formData.role === 'student' && !formData.leader_id) {
        toast({ title: 'Atenção', description: 'Selecione um Gerente para este aluno.', variant: 'destructive' });
        return;
      }
      if (formData.role === 'manager' && !formData.leader_id) {
        toast({ title: 'Atenção', description: 'Selecione um Superintendente para este gerente.', variant: 'destructive' });
        return;
      }
    }

    setIsLoading(true);

    try {
        let finalTeamId: string | null = null;

        // === LÓGICA DE EQUIPES (HIERARQUIA) ===
        if (!isManagementRole) {
            if (!isEditing && formData.leader_id) {
                // Se for ALUNO -> Entra no time do Gerente Selecionado
                if (formData.role === 'student') {
                    const manager = managers.find(m => m.id === formData.leader_id);
                    if (manager) {
                        finalTeamId = await getOrCreateTeamForLeader(manager.id, manager.name);
                    }
                }
                // Se for GERENTE -> Entra no time do Super, e CRIA seu próprio time filho
                else if (formData.role === 'manager') {
                    const superint = superintendents.find(s => s.id === formData.leader_id);
                    if (superint) {
                        // 1. Garante que o Super tem time
                        const superTeamId = await getOrCreateTeamForLeader(superint.id, superint.name);
                        
                        // 2. O Gerente será membro do time do Super? 
                        // Regra de Negócio: Geralmente o gerente "pertence" ao time do super, 
                        // mas ele LIDERARÁ um novo time filho.
                        // Vamos definir que o Team ID do perfil dele é o time que ele PERTENCE (Super).
                        finalTeamId = superTeamId; 
                    }
                }
            }
        }

        if (isEditing) {
            // === MODO EDIÇÃO ===
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ name: formData.name.trim() })
                .eq('id', initialData.id);

            if (profileError) throw profileError;

            const { error: roleError } = await supabase
                .from('user_roles')
                .update({ role: formData.role })
                .eq('user_id', initialData.id);

            if (roleError) throw roleError;

            toast({ title: 'Sucesso', description: 'Usuário atualizado.' });

        } else {
            // === MODO CRIAÇÃO (CLIENTE TEMP) ===
            const tempClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
            );

            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: formData.email.trim(),
                password: formData.password,
                options: { data: { name: formData.name.trim() } },
            });

            if (authError) throw authError;

            if (authData.user) {
                // Atualizar perfil com o Time calculado
                await supabase.from('profiles').update({
                    name: formData.name.trim(),
                    team_id: finalTeamId,
                    is_first_login: true
                }).eq('id', authData.user.id);

                if (formData.role !== 'student') {
                    await supabase.from('user_roles').update({ role: formData.role }).eq('user_id', authData.user.id);
                }

                // Se criamos um Gerente, vamos criar o Time dele IMEDIATAMENTE (vazio) vinculado ao Super
                if (formData.role === 'manager' && finalTeamId) {
                   await getOrCreateTeamForLeader(authData.user.id, formData.name.trim(), finalTeamId);
                }
            }
            toast({ title: 'Sucesso', description: 'Usuário criado e vinculado à equipe.' });
        }

        onSuccess();
        onClose();

    } catch (error: any) {
        console.error(error);
        toast({ title: 'Erro', description: error.message || 'Erro ao salvar usuário.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isEditing ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-surface border-border" placeholder="Nome completo" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-surface border-border" placeholder="email@exemplo.com" required disabled={isEditing} />
          </div>

          {!isEditing && (
            <div className="space-y-2">
                <Label htmlFor="password">Senha Temporária *</Label>
                <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="bg-surface border-border" placeholder="Mínimo 6 caracteres" required />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Cargo</Label>
            <Select value={formData.role} onValueChange={(value: UserRole) => setFormData({ ...formData, role: value, leader_id: '' })}>
              <SelectTrigger className="bg-surface border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {roles.map((role) => (<SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {/* SELECT INTELIGENTE DE HIERARQUIA */}
          {!isEditing && formData.role === 'student' && (
            <div className="space-y-2">
              <Label htmlFor="leader" className="text-blue-400">Gerente Responsável *</Label>
              <Select value={formData.leader_id} onValueChange={(value) => setFormData({ ...formData, leader_id: value })}>
                <SelectTrigger className="bg-surface border-border"><SelectValue placeholder="Selecione o Gerente" /></SelectTrigger>
                <SelectContent>
                  {managers.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">O aluno será adicionado à equipe deste gerente.</p>
            </div>
          )}

          {!isEditing && formData.role === 'manager' && (
            <div className="space-y-2">
              <Label htmlFor="leader" className="text-purple-400">Superintendente Responsável *</Label>
              <Select value={formData.leader_id} onValueChange={(value) => setFormData({ ...formData, leader_id: value })}>
                <SelectTrigger className="bg-surface border-border"><SelectValue placeholder="Selecione o Superintendente" /></SelectTrigger>
                <SelectContent>
                  {superintendents.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
               <p className="text-xs text-muted-foreground">Uma nova equipe será criada para este gerente.</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="netflix" disabled={isLoading}>
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : isEditing ? 'Salvar' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;