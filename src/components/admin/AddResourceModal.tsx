import React, { useState, useEffect } from 'react';
import { Loader2, Upload, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Resource } from '@/pages/Library';

interface AddResourceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: 'book_pdf' | 'podcast_audio';
  initialData?: Resource | null;
}

const AddResourceModal: React.FC<AddResourceModalProps> = ({ 
  open, 
  onClose, 
  onSuccess,
  defaultType = 'book_pdf',
  initialData
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [coverType, setCoverType] = useState<'url' | 'upload'>('url');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    cover_image: '',
    type: defaultType as 'book_pdf' | 'podcast_audio',
  });

  useEffect(() => {
    if (open && initialData) {
      setFormData({
        title: initialData.title,
        url: initialData.url,
        cover_image: initialData.cover_image || '',
        type: initialData.type,
      });
      setCoverType('url');
    } else if (open && !initialData) {
      setFormData({
        title: '',
        url: '',
        cover_image: '',
        type: defaultType,
      });
      setCoverType('url');
      setCoverFile(null);
    }
  }, [open, initialData, defaultType]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData({ ...formData, cover_image: url });
    
    if (url.includes('canva.com') && !url.match(/\.(png|jpg|jpeg)$/i)) {
      setUrlError("Link inválido: Este é um link de visualização. Clique com o botão direito na imagem no Canva e escolha 'Copiar endereço da imagem'.");
    } else {
      setUrlError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.url.trim()) {
      toast({
        title: 'Erro',
        description: 'Título e URL são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      let coverUrl = formData.cover_image;

      if (coverType === 'upload' && coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('course-covers')
          .upload(filePath, coverFile);

        if (uploadError) throw new Error("Erro no upload. Verifique se a imagem é menor que 2MB.");

        const { data: { publicUrl } } = supabase.storage
          .from('course-covers')
          .getPublicUrl(filePath);

        coverUrl = publicUrl;
      }

      const payload: any = {
        title: formData.title.trim(),
        url: formData.url.trim(),
        cover_image: coverUrl || null,
        type: formData.type,
      };

      if (initialData?.id) {
        payload.id = initialData.id;
      }

      const { error } = await supabase
        .from('resources')
        .upsert(payload);

      if (error) throw error;

      toast({
        title: initialData ? 'Recurso atualizado!' : 'Recurso criado!',
        description: `O ${formData.type === 'book_pdf' ? 'livro' : 'podcast'} foi salvo com sucesso.`,
      });

      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('Error saving resource:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {initialData ? 'Editar' : 'Adicionar'} {formData.type === 'book_pdf' ? 'Livro' : 'Podcast'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'book_pdf' | 'podcast_audio') => 
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger className="bg-surface border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="book_pdf">Livro (PDF)</SelectItem>
                <SelectItem value="podcast_audio">Podcast (Áudio)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-surface border-border"
              placeholder={formData.type === 'book_pdf' ? 'Nome do livro' : 'Nome do podcast'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="bg-surface border-border"
              placeholder={formData.type === 'book_pdf' ? 'Link do Google Drive' : 'Link do Spotify/áudio'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Imagem de Capa</Label>
            <Tabs value={coverType} onValueChange={(v) => setCoverType(v as 'url' | 'upload')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-surface">
                <TabsTrigger value="url" className="gap-2"><LinkIcon className="w-4 h-4"/> URL</TabsTrigger>
                <TabsTrigger value="upload" className="gap-2"><Upload className="w-4 h-4"/> Upload</TabsTrigger>
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
                  <label htmlFor="resource-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-border border-dashed rounded-lg cursor-pointer bg-surface hover:bg-surface-hover">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground"><span className="font-semibold">Clique para enviar</span></p>
                    </div>
                    <input id="resource-file" type="file" className="hidden" accept="image/*" onChange={(e) => {
                      if (e.target.files?.[0]) setCoverFile(e.target.files[0]);
                    }} />
                  </label>
                </div>
                {coverFile && <p className="text-sm text-primary mt-2">Arquivo: {coverFile.name}</p>}
              </TabsContent>
            </Tabs>
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
                initialData ? 'Salvar' : 'Adicionar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddResourceModal;
