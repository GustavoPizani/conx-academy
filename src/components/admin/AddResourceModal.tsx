import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Upload, Link as LinkIcon, FileText, Video, Headphones } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Interfaces (Simplificado para evitar imports quebrados)
interface Resource {
  id: string;
  title: string;
  type: 'book' | 'video' | 'podcast' | 'article';
  url: string;
  description?: string;
  cover_image?: string;
  author?: string;
  duration?: string;
}

interface AddResourceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Resource | null;
}

const AddResourceModal: React.FC<AddResourceModalProps> = ({ open, onClose, onSuccess, initialData }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form States
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'book' | 'video' | 'podcast' | 'article'>('book');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [duration, setDuration] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialData) {
      setTitle(initialData.title);
      setType(initialData.type);
      setUrl(initialData.url);
      setDescription(initialData.description || '');
      setAuthor(initialData.author || '');
      setDuration(initialData.duration || '');
      setCoverImagePreview(initialData.cover_image || null);
    } else if (open && !initialData) {
      // Reset
      setTitle('');
      setType('book');
      setUrl('');
      setDescription('');
      setAuthor('');
      setDuration('');
      setCoverImage(null);
      setCoverImagePreview(null);
    }
  }, [open, initialData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('resource-covers') // Certifique-se que este bucket existe
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('resource-covers').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      toast({ title: "Erro", description: "Título e URL são obrigatórios.", variant: "destructive" });
      return;
    }

    try {
      setIsLoading(true);
      let publicUrl = initialData?.cover_image || null;

      if (coverImage) {
        try {
          publicUrl = await uploadImage(coverImage);
        } catch (error) {
          console.error("Erro upload imagem:", error);
          toast({ title: "Aviso", description: "Erro ao subir imagem. Salvando sem capa." });
        }
      }

      const payload = {
        title,
        type,
        url,
        description,
        author,
        duration,
        cover_image: publicUrl
      };

      if (initialData?.id) {
        const { error } = await supabase.from('library_resources').update(payload).eq('id', initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('library_resources').insert(payload);
        if (error) throw error;
      }

      toast({ title: "Sucesso!", description: "Recurso salvo na biblioteca." });
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao salvar recurso.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Recurso' : 'Adicionar Novo Recurso'}</DialogTitle>
          {/* AQUI ESTÁ A CORREÇÃO DO AVISO: Adicionamos a Description */}
          <DialogDescription>
            Preencha os detalhes do material (Livro, Vídeo, Podcast ou Artigo) para adicionar à biblioteca.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="book"><div className="flex items-center gap-2"><FileText className="w-4 h-4"/> Livro</div></SelectItem>
                  <SelectItem value="video"><div className="flex items-center gap-2"><Video className="w-4 h-4"/> Vídeo</div></SelectItem>
                  <SelectItem value="podcast"><div className="flex items-center gap-2"><Headphones className="w-4 h-4"/> Podcast</div></SelectItem>
                  <SelectItem value="article"><div className="flex items-center gap-2"><LinkIcon className="w-4 h-4"/> Artigo</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Capa</Label>
              <Input type="file" accept="image/*" onChange={handleImageChange} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">Link / URL *</Label>
            <Input id="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." required />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label htmlFor="author">Autor/Criador</Label>
               <Input id="author" value={author} onChange={e => setAuthor(e.target.value)} />
             </div>
             <div className="space-y-2">
               <Label htmlFor="duration">Duração/Páginas</Label>
               <Input id="duration" value={duration} onChange={e => setDuration(e.target.value)} placeholder="Ex: 1h 30m ou 200 pág" />
             </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Descrição</Label>
            <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddResourceModal;
