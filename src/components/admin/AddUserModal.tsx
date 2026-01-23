import React, { useState, useEffect } from 'react';
import { Loader2, UserPlus, Mail, User, Briefcase, Users, Shield, GraduationCap, ShieldCheck, Lock, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string | null;
}

interface ParentOption {
  id: string;
  name: string;
  team: string | null;
}

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: UserData | null;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ open, onClose, onSuccess, initialData }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  
  // Estados do Formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [team, setTeam] = useState('');
  
  // Opções de Gestores (Pais)
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);
  
  // Contagens para Bloqueio Hierárquico
  const [counts, setCounts] = useState({ superintendents: 0, managers: 0 });

  useEffect(() => {
    if (open) {
      fetchCounts();

      if (initialData) {
        setName(initialData.name || '');
        setEmail(initialData.email || '');
        setRole(initialData.role || 'student');
        setTeam(initialData.team || '');
      } else {
        setName('');
        setEmail('');
        setRole('student');
        setTeam('');
      }
    }
  }, [open, initialData]);

  const fetchCounts = async () => {
    const { count: superCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'superintendent');
    const { count: managerCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'manager');
    setCounts({ superintendents: superCount || 0, managers: managerCount || 0 });
  };

  useEffect(() => {
    const fetchParents = async () => {
      // Limpa opções se mudar de cargo (exceto Super que é texto livre)
      if (!initialData || (initialData && role !== initialData.role)) {
         setParentOptions([]); 
         if (role !== 'superintendent') setTeam(''); 
      }

      // Se for Admin, Coordenador ou Superintendente, não busca pai (campo bloqueado ou livre)
      if (['admin', 'coordinator', 'superintendent'].includes(role)) {
        return;
      }

      setLoadingOptions(true);
      try {
        let queryRole = '';
        if (role === 'student') queryRole = 'manager';
        if (role === 'manager') queryRole = 'superintendent';

        if (queryRole) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, name, team')
            .eq('role', queryRole);

          if (error) throw error;
          setParentOptions(data || []);
        }
      } catch (error) {
        console.error("Erro ao buscar gestores:", error);
      } finally {
        setLoadingOptions(false);
      }
    };

    if (open) {
      fetchParents();
    }
  }, [role, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" });
      return;
    }

    if ((role === 'student' || role === 'manager') && !team) {
      toast({ 
        title: "Vínculo Obrigatório", 
        description: role === 'student' ? "Selecione um Gerente." : "Selecione um Superintendente.", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);

    try {
      if (initialData) {
        // MODO EDIÇÃO
        const { error } = await supabase
          .from('profiles')
          .update({ name, role, team: team || null })
          .eq('id', initialData.id);

        if (error) throw error;
        toast({ title: "Usuário atualizado!", description: "Dados salvos com sucesso." });

      } else {
        // MODO CRIAÇÃO
        if (!email.trim()) {
            toast({ title: "Erro", description: "E-mail obrigatório.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const { data, error } = await supabase.functions.invoke('create-batch-users', {
          body: { 
            users: [{
              name,
              email: email.toLowerCase().trim(),
              role,
              team: team || null
            }]
          }
        });

        if (error) throw error;
        if (data.errors && data.errors.length > 0) throw new Error(data.errors[0]);

        toast({ 
          title: "Usuário Convidado!", 
          description: "E-mail de convite enviado.",
          className: "bg-green-600 text-white border-none"
        });
      }
      
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error(error);
      let msg = error.message;
      if (msg.includes('already registered')) msg = "Este e-mail já está cadastrado.";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const renderTeamField = () => {
    // 1. Cargos SEM TIME (Admin / Coordenador) - Bloqueado
    if (['admin', 'coordinator'].includes(role)) {
      return (
        <div className="space-y-2 opacity-50">
          <Label className="flex items-center gap-2">Time / Squad <Lock className="w-3 h-3"/></Label>
          <div className="relative">
            <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value="Acesso Global / Sem Vínculo" disabled className="pl-9 bg-muted" />
          </div>
        </div>
      );
    }

    // 2. Superintendente (DEFINE O TIME - Texto Livre)
    if (role === 'superintendent') {
       return (
        <div className="space-y-2">
          <Label htmlFor="team">Nome da Área / Diretoria</Label>
          <div className="relative">
            <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              id="team" 
              placeholder="Ex: Diretoria Comercial" 
              value={team}
              onChange={e => setTeam(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">Defina o nome da área que este superintendente lidera.</p>
        </div>
       );
    }

    // 3. Cargos COM CHEFE (Aluno / Gerente) - Select
    const label = role === 'student' ? 'Vincular a qual Gerente?' : 'Vincular a qual Superintendente?';
    
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Select value={team} onValueChange={setTeam} disabled={loadingOptions || parentOptions.length === 0}>
          <SelectTrigger className="pl-9 relative">
            <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder={loadingOptions ? 'Carregando...' : 'Selecione o gestor...'} />
          </SelectTrigger>
          <SelectContent>
            {parentOptions.length === 0 ? (
              <SelectItem value="none" disabled>Nenhum gestor encontrado</SelectItem>
            ) : (
              parentOptions.map((parent) => (
                <SelectItem key={parent.id} value={parent.team || parent.name}>
                  {parent.name} <span className="text-muted-foreground text-xs">({parent.team || 'Sem time'})</span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    );
  };

  // Travas Hierárquicas (Agora aplicadas globalmente)
  const isManagerLocked = counts.superintendents === 0;
  const isStudentLocked = counts.managers === 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if(!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Usuário' : 'Adicionar Usuário'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Atualize os dados cadastrais.' : 'Cadastro com regras de hierarquia.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                id="name" 
                placeholder="Ex: João da Silva" 
                className="pl-9" 
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail Corporativo</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                id="email" 
                type="email" 
                placeholder="joao@conx.com.br" 
                className="pl-9" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={!!initialData}
              />
              {initialData && <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select 
                value={role} 
                onValueChange={(val) => { setRole(val); if(!initialData) setTeam(''); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superintendent">
                    <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Superintendente</div>
                  </SelectItem>
                  
                  {/* TRAVA DE GERENTE: Agora aplica na edição também */}
                  <SelectItem value="manager" disabled={isManagerLocked}>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4"/> 
                      Gerente 
                      {isManagerLocked && <Lock className="w-3 h-3 ml-auto opacity-50"/>}
                    </div>
                  </SelectItem>
                  
                  <SelectItem value="coordinator">
                    <div className="flex items-center gap-2"><Shield className="w-4 h-4"/> Coordenador</div>
                  </SelectItem>
                  
                  {/* TRAVA DE ALUNO: Agora aplica na edição também */}
                  <SelectItem value="student" disabled={isStudentLocked}>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4"/> 
                      Aluno 
                      {isStudentLocked && <Lock className="w-3 h-3 ml-auto opacity-50"/>}
                    </div>
                  </SelectItem>
                  
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2 text-red-500"><Shield className="w-4 h-4"/> Administrador</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {renderTeamField()}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading} variant="netflix">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (initialData ? <Save className="w-4 h-4 mr-2"/> : <UserPlus className="w-4 h-4 mr-2" />)}
              {isLoading ? 'Salvando...' : (initialData ? 'Atualizar' : 'Convidar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;