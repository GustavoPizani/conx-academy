import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddResourceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: 'book_pdf' | 'podcast_audio';
}

const AddResourceModal: React.FC<AddResourceModalProps> = ({ 
  open, 
  onClose, 
  onSuccess,
  defaultType = 'book_pdf' 
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    cover_image: '',
    type: defaultType as 'book_pdf' | 'podcast_audio',
  });

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

    const { error } = await supabase
      .from('resources')
      .insert({
        title: formData.title.trim(),
        url: formData.url.trim(),
        cover_image: formData.cover_image.trim() || null,
        type: formData.type,
      });

    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao criar recurso',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Recurso criado!',
      description: `O ${formData.type === 'book_pdf' ? 'livro' : 'podcast'} foi adicionado com sucesso.`,
    });

    setFormData({
      title: '',
      url: '',
      cover_image: '',
      type: defaultType,
    });
    
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Adicionar {formData.type === 'book_pdf' ? 'Livro' : 'Podcast'}
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
            <Label htmlFor="cover_image">URL da Imagem de Capa</Label>
            <Input
              id="cover_image"
              value={formData.cover_image}
              onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
              className="bg-surface border-border"
              placeholder="https://..."
            />
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
                'Adicionar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddResourceModal;
