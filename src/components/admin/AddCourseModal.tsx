import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS, UserRole } from '@/types/auth';

interface AddCourseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const roles: UserRole[] = ['admin', 'coordinator', 'superintendent', 'manager', 'student'];

const AddCourseModal: React.FC<AddCourseModalProps> = ({ open, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cover_image: '',
    target_roles: ['student'] as UserRole[],
    published: false,
  });

  const handleRoleToggle = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: 'Erro',
        description: 'O título é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase
      .from('courses')
      .insert({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        cover_image: formData.cover_image.trim() || null,
        target_roles: formData.target_roles,
        published: formData.published,
      });

    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao criar curso',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Curso criado!',
      description: 'O curso foi adicionado com sucesso.',
    });

    setFormData({
      title: '',
      description: '',
      cover_image: '',
      target_roles: ['student'],
      published: false,
    });
    
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Adicionar Novo Curso</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-surface border-border"
              placeholder="Nome do curso"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-surface border-border"
              placeholder="Descrição do curso"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover_image">URL da Imagem de Capa</Label>
            <Input
              id="cover_image"
              value={formData.cover_image}
              onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
              className="bg-surface border-border"
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Visível para</Label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((role) => (
                <div key={role} className="flex items-center gap-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={formData.target_roles.includes(role)}
                    onCheckedChange={() => handleRoleToggle(role)}
                  />
                  <Label htmlFor={`role-${role}`} className="text-sm font-normal cursor-pointer">
                    {ROLE_LABELS[role]}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="published"
              checked={formData.published}
              onCheckedChange={(checked) => setFormData({ ...formData, published: !!checked })}
            />
            <Label htmlFor="published" className="text-sm font-normal cursor-pointer">
              Publicar imediatamente
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="netflix" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Criar Curso'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCourseModal;
