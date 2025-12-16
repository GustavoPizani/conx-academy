import React, { useState, useEffect } from 'react';
import { Loader2, Trash2, Plus, Upload, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS, UserRole } from '@/types/auth';
import { Course, Lesson } from '@/pages/Courses';

interface AddCourseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Course | null;
}

const roles: UserRole[] = ['admin', 'coordinator', 'superintendent', 'manager', 'student'];

const AddCourseModal: React.FC<AddCourseModalProps> = ({ open, onClose, onSuccess, initialData }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado do Curso
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cover_image: '',
    target_roles: ['student'] as UserRole[],
    published: false,
  });

  // Estado da Imagem
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Estado das Aulas
  const [lessons, setLessons] = useState<Partial<Lesson>[]>([]);
  const [newLesson, setNewLesson] = useState({
    title: '',
    video_url: '',
    duration: 0,
  });

  // Efeito para carregar dados na edição
  useEffect(() => {
    if (open && initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description || '',
        cover_image: initialData.cover_image || '',
        target_roles: (initialData.target_roles as UserRole[]) || ['student'],
        published: initialData.published,
      });
      
      // Ordenar aulas por posição
      const sortedLessons = [...(initialData.lessons || [])].sort((a, b) => a.position - b.position);
      setLessons(sortedLessons);
      setImageMode('url'); // Padrão para edição, a menos que queira mudar
    } else if (open && !initialData) {
      // Reset form
      setFormData({
        title: '',
        description: '',
        cover_image: '',
        target_roles: ['student'],
        published: false,
      });
      setLessons([]);
      setCoverFile(null);
      setImageMode('url');
    }
  }, [open, initialData]);

  const handleRoleToggle = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role],
    }));
  };

  const handleAddLesson = () => {
    if (!newLesson.title || !newLesson.video_url) return;
    
    setLessons(prev => [
      ...prev, 
      { 
        ...newLesson, 
        position: prev.length + 1 
      }
    ]);
    
    setNewLesson({ title: '', video_url: '', duration: 0 });
  };

  const handleRemoveLesson = (index: number) => {
    setLessons(prev => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, position: i + 1 })));
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData({ ...formData, cover_image: url });
    
    if (url.includes('canva.com') && !url.match(/\.(png|jpg|jpeg)$/i)) {
      setUrlError("Link inválido: Este é um link de visualização.");
    } else {
      setUrlError(null);
    }
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

    try {
      let coverUrl = formData.cover_image;

      // 1. Upload da Imagem (se houver arquivo)
      if (imageMode === 'upload' && coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('course-covers')
          .upload(filePath, coverFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error("Erro no upload. Verifique se a imagem é menor que 2MB.");
        }

        const { data: { publicUrl } } = supabase.storage
          .from('course-covers')
          .getPublicUrl(filePath);

        coverUrl = publicUrl;
      }

      // 2. Salvar/Atualizar Curso
      const courseData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        cover_image: coverUrl || null,
        target_roles: formData.target_roles,
        published: formData.published,
      };

      let courseId = initialData?.id;

      if (initialData) {
        // Update
        const { error: updateError } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', initialData.id);
        
        if (updateError) throw updateError;
      } else {
        // Insert
        const { data: newCourse, error: insertError } = await supabase
          .from('courses')
          .insert(courseData)
          .select()
          .single();
        
        if (insertError) throw insertError;
        courseId = newCourse.id;
      }

      // 3. Salvar Aulas (Estratégia: Deletar antigas e inserir novas para garantir ordem e integridade)
      if (courseId) {
        // Se for edição, deletar aulas existentes primeiro
        if (initialData) {
          const { error: deleteError } = await supabase
            .from('lessons')
            .delete()
            .eq('course_id', courseId);
          
          if (deleteError) throw deleteError;
        }

        // Inserir novas aulas
        if (lessons.length > 0) {
          const lessonsToInsert = lessons.map(l => ({
            course_id: courseId,
            title: l.title,
            video_url: l.video_url,
            duration: l.duration,
            position: l.position
          }));

          const { error: lessonsError } = await supabase
            .from('lessons')
            .insert(lessonsToInsert);

          if (lessonsError) throw lessonsError;
        }
      }

      toast({
        title: initialData ? 'Curso atualizado!' : 'Curso criado!',
        description: initialData ? 'As alterações foram salvas.' : 'O curso foi adicionado com sucesso.',
      });

      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('Error saving course:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {initialData ? 'Editar Curso' : 'Adicionar Novo Curso'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informações Básicas */}
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
            <Label>Imagem de Capa</Label>
            <Tabs value={imageMode} onValueChange={(v) => setImageMode(v as 'url' | 'upload')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-surface">
                <TabsTrigger value="url" className="gap-2"><LinkIcon className="w-4 h-4"/> URL Externa</TabsTrigger>
                <TabsTrigger value="upload" className="gap-2"><Upload className="w-4 h-4"/> Upload Arquivo</TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="mt-2">
                <Input
                  id="cover_image"
                  value={formData.cover_image}
                  onChange={handleUrlChange}
                  className={`bg-surface border-border ${urlError ? 'border-red-500' : ''}`}
                  placeholder="https://..."
                />
                {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
              </TabsContent>
              <TabsContent value="upload" className="mt-2">
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-lg cursor-pointer bg-surface hover:bg-surface-hover">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground"><span className="font-semibold">Clique para enviar</span> ou arraste</p>
                    </div>
                    <input id="dropzone-file" type="file" className="hidden" accept="image/*" onChange={(e) => {
                      if (e.target.files?.[0]) setCoverFile(e.target.files[0]);
                    }} />
                  </label>
                </div>
                {coverFile && <p className="text-sm text-primary mt-2">Arquivo selecionado: {coverFile.name}</p>}
              </TabsContent>
            </Tabs>
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

          {/* Grade Curricular */}
          <div className="space-y-3 pt-4 border-t border-border">
            <Label className="text-lg font-semibold">Grade Curricular</Label>
            
            {/* Lista de Aulas */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {lessons.map((lesson, index) => (
                <div key={index} className="flex items-center gap-2 bg-surface p-3 rounded border border-border">
                  <span className="text-muted-foreground font-mono text-sm w-6">{index + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{lesson.video_url}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{lesson.duration} min</span>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemoveLesson(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {lessons.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma aula adicionada.</p>
              )}
            </div>

            {/* Adicionar Aula */}
            <div className="grid grid-cols-12 gap-2 items-end bg-surface/50 p-3 rounded border border-border">
              <div className="col-span-5 space-y-1">
                <Label htmlFor="lesson-title" className="text-xs">Título da Aula</Label>
                <Input id="lesson-title" value={newLesson.title} onChange={(e) => setNewLesson({...newLesson, title: e.target.value})} className="h-8 text-sm" placeholder="Ex: Introdução" />
              </div>
              <div className="col-span-4 space-y-1">
                <Label htmlFor="lesson-url" className="text-xs">Link do Vídeo</Label>
                <Input id="lesson-url" value={newLesson.video_url} onChange={(e) => setNewLesson({...newLesson, video_url: e.target.value})} className="h-8 text-sm" placeholder="YouTube/Vimeo" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="lesson-duration" className="text-xs">Minutos</Label>
                <Input id="lesson-duration" type="number" value={newLesson.duration || ''} onChange={(e) => setNewLesson({...newLesson, duration: parseInt(e.target.value) || 0})} className="h-8 text-sm" placeholder="0" />
              </div>
              <div className="col-span-1">
                <Button type="button" size="icon" className="h-8 w-8 bg-primary hover:bg-primary/90" onClick={handleAddLesson}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
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
                initialData ? 'Salvar Alterações' : 'Criar Curso'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCourseModal;
