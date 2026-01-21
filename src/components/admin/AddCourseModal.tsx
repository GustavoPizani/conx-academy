import React, { useState, useEffect } from 'react';
import { Loader2, Trash2, Plus, Upload, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Course } from '@/pages/Courses';

// Interfaces
interface LessonData {
  id?: string;
  title: string;
  video_url: string;
  duration: number;
  position: number;
}

interface AddCourseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Course | null;
}

const roles = ['admin', 'coordinator', 'superintendent', 'manager', 'student'];
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  coordinator: 'Coordenador',
  superintendent: 'Superintendente',
  manager: 'Gerente',
  student: 'Aluno/Corretor'
};

const AddCourseModal: React.FC<AddCourseModalProps> = ({ open, onClose, onSuccess, initialData }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // States do Form
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cover_image: '',
    target_roles: ['student'],
    published: false,
  });

  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const [lessons, setLessons] = useState<LessonData[]>([]);
  const [newLesson, setNewLesson] = useState({
    title: '',
    video_url: '',
    duration: 0,
  });

  // Carregar dados na edição
  useEffect(() => {
    if (open && initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description || '',
        cover_image: initialData.cover_image || '',
        target_roles: initialData.target_roles || ['student'],
        published: initialData.published,
      });

      if (initialData.lessons) {
        const sortedLessons = [...initialData.lessons]
          .sort((a: any, b: any) => a.position - b.position)
          .map((l: any) => ({
             id: l.id,
             title: l.title,
             video_url: l.video_url,
             duration: l.duration,
             position: l.position
          }));
        setLessons(sortedLessons);
      } else {
        setLessons([]);
      }
      
      setImageMode('url');
    } else if (open && !initialData) {
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
      setNewLesson({ title: '', video_url: '', duration: 0 });
    }
  }, [open, initialData]);

  const handleRoleToggle = (role: string) => {
    setFormData(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role],
    }));
  };

  const handleAddLesson = () => {
    if (!newLesson.title || !newLesson.video_url) {
      toast({ title: "Atenção", description: "Título e Link da aula são obrigatórios.", variant: "destructive" });
      return;
    }
    setLessons(prev => [...prev, { ...newLesson, position: prev.length + 1 }]);
    setNewLesson({ title: '', video_url: '', duration: 0 });
  };

  const handleRemoveLesson = (index: number) => {
    setLessons(prev => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, position: i + 1 })));
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData({ ...formData, cover_image: url });
    if (url.includes('canva.com') && !url.match(/\.(png|jpg|jpeg)$/i)) {
      setUrlError("Aviso: Links de edição do Canva não funcionam. Use o link direto da imagem.");
    } else {
      setUrlError(null);
    }
  };

  // --- FUNÇÃO DE UPLOAD COM TIMEOUT ---
  const uploadImage = async (file: File) => {
    console.log("Iniciando upload...");
    
    // Validar tamanho (Max 5MB para evitar travamentos em redes lentas)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("A imagem deve ter no máximo 5MB.");
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Promessa de Upload do Supabase
    const uploadPromise = supabase.storage
      .from('course-covers')
      .upload(filePath, file, {
        upsert: false,
      });

    // Promessa de Timeout (15 segundos)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("O upload demorou muito. Verifique sua conexão ou tente uma imagem menor.")), 15000)
    );

    // Corrida: Quem terminar primeiro ganha
    const result: any = await Promise.race([uploadPromise, timeoutPromise]);

    if (result.error) {
      throw result.error;
    }

    const { data } = supabase.storage.from('course-covers').getPublicUrl(filePath);
    console.log("Upload OK:", data.publicUrl);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Tentando salvar...");
    
    if (!formData.title.trim()) {
      toast({ title: 'Erro', description: 'O título é obrigatório.', variant: 'destructive' });
      return;
    }

    try {
      setIsLoading(true);

      let coverUrl = formData.cover_image;

      // 1. Tenta Upload (com proteção de erro)
      if (imageMode === 'upload' && coverFile) {
        try {
           coverUrl = await uploadImage(coverFile);
        } catch (uplErr: any) {
           console.error("Erro upload:", uplErr);
           toast({ 
             title: "Erro na Imagem", 
             description: uplErr.message || "Falha ao enviar imagem. O curso será salvo sem capa.", 
             variant: "destructive" 
           });
           // Não interrompe o salvamento do curso, apenas ignora a imagem
        }
      }

      // 2. Prepara Dados
      const coursePayload = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        cover_image: coverUrl || null,
        target_roles: formData.target_roles,
        published: formData.published,
      };

      let courseId = initialData?.id;

      // 3. Salva Curso
      if (courseId) {
        const { error: updateError } = await supabase.from('courses').update(coursePayload).eq('id', courseId);
        if (updateError) throw updateError;
      } else {
        const { data: newCourse, error: insertError } = await supabase.from('courses').insert(coursePayload).select().single();
        if (insertError) throw insertError;
        courseId = newCourse.id;
      }

      // 4. Salva Aulas
      if (courseId) {
        if (initialData) {
           await supabase.from('lessons').delete().eq('course_id', courseId);
        }
        if (lessons.length > 0) {
          const lessonsToInsert = lessons.map((l, index) => ({
            course_id: courseId,
            title: l.title,
            video_url: l.video_url,
            duration: l.duration || 0,
            position: index + 1
          }));
          const { error: lessonsError } = await supabase.from('lessons').insert(lessonsToInsert);
          if (lessonsError) throw lessonsError;
        }
      }

      toast({
        title: 'Sucesso!',
        description: 'Curso salvo corretamente.',
        className: "bg-green-600 text-white"
      });

      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('Erro geral:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Erro desconhecido.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false); // Destrava o botão SEMPRE
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Curso' : 'Adicionar Novo Curso'}</DialogTitle>
          <DialogDescription>Gerencie as informações e aulas do curso.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-4 border p-4 rounded-lg bg-surface/50">
            <h3 className="font-semibold text-sm text-muted-foreground">Informações Básicas</h3>
            <div className="grid gap-4">
                <div className="space-y-2">
                    <Label htmlFor="title">Título do Curso <span className="text-red-500">*</span></Label>
                    <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Técnicas de Vendas" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Sobre o que é este curso?" rows={2} />
                </div>
            </div>
          </div>

          <div className="space-y-2 border p-4 rounded-lg bg-surface/50">
             <Label>Capa do Curso</Label>
            <Tabs value={imageMode} onValueChange={(v) => setImageMode(v as 'url' | 'upload')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url" className="gap-2"><LinkIcon className="w-4 h-4"/> URL Externa</TabsTrigger>
                <TabsTrigger value="upload" className="gap-2"><Upload className="w-4 h-4"/> Upload Arquivo</TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="mt-2 space-y-2">
                <Input value={formData.cover_image} onChange={handleUrlChange} placeholder="https://..." className={urlError ? 'border-red-500' : ''} />
                {urlError && <p className="text-xs text-red-500">{urlError}</p>}
              </TabsContent>
              <TabsContent value="upload" className="mt-2">
                <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} className="cursor-pointer" />
                {coverFile && <p className="text-xs text-primary mt-1">Selecionado: {coverFile.name}</p>}
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-2 border p-4 rounded-lg bg-surface/50">
            <Label>Visível para (Cargos)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {roles.map((role) => (
                <div key={role} className="flex items-center gap-2">
                  <Checkbox id={`role-${role}`} checked={formData.target_roles.includes(role)} onCheckedChange={() => handleRoleToggle(role)} />
                  <Label htmlFor={`role-${role}`} className="text-sm font-normal cursor-pointer">{ROLE_LABELS[role] || role}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 border p-4 rounded-lg bg-surface/50">
            <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Aulas ({lessons.length})</Label>
            </div>
            
            <div className="grid gap-2 sm:grid-cols-12 items-end bg-background p-3 rounded border">
                <div className="sm:col-span-5 space-y-1">
                    <Label htmlFor="l-title" className="text-xs">Título</Label>
                    <Input id="l-title" value={newLesson.title} onChange={e => setNewLesson({...newLesson, title: e.target.value})} placeholder="Aula 1" className="h-8" />
                </div>
                <div className="sm:col-span-4 space-y-1">
                    <Label htmlFor="l-url" className="text-xs">Link (Youtube)</Label>
                    <Input id="l-url" value={newLesson.video_url} onChange={e => setNewLesson({...newLesson, video_url: e.target.value})} placeholder="URL" className="h-8" />
                </div>
                <div className="sm:col-span-2 space-y-1">
                    <Label htmlFor="l-dur" className="text-xs">Min</Label>
                    <Input id="l-dur" type="number" value={newLesson.duration || ''} onChange={e => setNewLesson({...newLesson, duration: parseInt(e.target.value) || 0})} placeholder="0" className="h-8" />
                </div>
                <div className="sm:col-span-1">
                    <Button type="button" size="sm" onClick={handleAddLesson} className="w-full h-8 bg-orange-600 hover:bg-orange-700 text-white">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {lessons.map((lesson, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-background border rounded text-sm group">
                        <span className="text-muted-foreground font-mono w-4">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{lesson.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{lesson.video_url}</p>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">{lesson.duration} min</div>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveLesson(idx)}>
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                ))}
                {lessons.length === 0 && <p className="text-center text-xs text-muted-foreground py-2">Nenhuma aula adicionada ainda.</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 px-1">
            <Checkbox id="published" checked={formData.published} onCheckedChange={(c) => setFormData({ ...formData, published: !!c })} />
            <Label htmlFor="published" className="cursor-pointer">Publicar curso imediatamente</Label>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading} className="min-w-[120px]">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                initialData ? 'Salvar Alterações' : 'Criar Curso'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCourseModal;