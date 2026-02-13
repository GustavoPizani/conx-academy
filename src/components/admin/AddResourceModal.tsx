import React, { useState, useEffect } from 'react';
import { Loader2, Upload, Link as LinkIcon, FileText, Headphones, Image as ImageIcon, Presentation } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Resource {
  id: string;
  title: string;
  type: 'book_pdf' | 'podcast_audio' | 'training_pdf';
  url: string;
  cover_image?: string;
}

interface AddResourceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Resource | null;
  defaultType?: 'book_pdf' | 'podcast_audio' | 'training_pdf';
}

const AddResourceModal: React.FC<AddResourceModalProps> = ({ open, onClose, onSuccess, initialData, defaultType }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados do Formulário
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'book_pdf' | 'podcast_audio' | 'training_pdf'>('book_pdf');
  const [url, setUrl] = useState(''); 
  
  // Estados de Upload
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null); 

  useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title || '');
        setType(initialData.type || 'book_pdf');
        setUrl(initialData.url || '');
        setCoverPreview(initialData.cover_image || null);
      } else {
        setTitle('');
        setType(defaultType || 'book_pdf');
        setUrl('');
        setCoverImage(null);
        setCoverPreview(null);
        setBookFile(null);
      }
    }
  }, [open, initialData, defaultType]);

  const uploadToStorage = async (file: File, folder: 'covers' | 'pdfs') => {
    const fileExt = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `${folder}/${Date.now()}_${sanitizedName}.${fileExt}`;

    console.log(`Iniciando upload de ${folder}:`, fileName);

    const { error: uploadError } = await supabase.storage
      .from('library-files')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error(`Erro detalhado upload ${folder}:`, uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage.from('library-files').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({ title: "Erro", description: "O título é obrigatório.", variant: "destructive" });
      return;
    }

    if ((type === 'book_pdf' || type === 'training_pdf') && !bookFile && !url.trim()) {
        toast({ title: "Erro", description: "Selecione um arquivo PDF.", variant: "destructive" });
        return;
    }
    if (type === 'podcast_audio' && !url.trim()) {
        toast({ title: "Erro", description: "O Link do Spotify é obrigatório.", variant: "destructive" });
        return;
    }

    try {
      setIsLoading(true);
      let finalCoverUrl = initialData?.cover_image || null;
      let finalResourceUrl = url;

      // 1. Upload da Capa
      if (coverImage) {
        try {
          finalCoverUrl = await uploadToStorage(coverImage, 'covers');
        } catch (error: any) {
          console.error("Erro capa:", error);
          toast({ title: "Erro na Capa", description: "Falha ao subir imagem. Verifique permissões.", variant: "destructive" });
        }
      }

      // 2. Upload do PDF
      if ((type === 'book_pdf' || type === 'training_pdf') && bookFile) {
        try {
          finalResourceUrl = await uploadToStorage(bookFile, 'pdfs');
        } catch (error: any) {
          console.error("Erro PDF:", error);
          toast({ 
            title: "Erro no Upload do PDF", 
            description: "Falha ao subir arquivo. Verifique o console.", 
            variant: "destructive" 
          });
          setIsLoading(false);
          return;
        }
      }

      // 3. Salvar no Banco
      // CORREÇÃO: Removemos author, duration e description pois não existem no banco
      const payload = {
        title,
        type,
        url: finalResourceUrl,
        cover_image: finalCoverUrl
      };

      if (initialData?.id) {
        const { error } = await supabase.from('resources').update(payload).eq('id', initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('resources').insert(payload);
        if (error) throw error;
      }

      toast({ title: "Sucesso!", description: "Item salvo na biblioteca." });
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error("Erro ao salvar:", JSON.stringify(error, null, 2));
      
      // Tratamento de erro amigável
      let msg = error.message;
      if (error.code === 'PGRST204') {
        msg = "Erro de compatibilidade com o banco de dados (Coluna não encontrada).";
      }

      toast({ 
        title: "Erro ao Salvar", 
        description: msg || "Erro desconhecido.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-background border border-border text-foreground shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {initialData ? 'Editar Item' : 'Adicionar à Biblioteca'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Adicione um Livro (PDF) ou um Podcast (Spotify).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">Título do Material</Label>
            <Input 
                id="title" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
                placeholder={type === 'podcast_audio' ? "Ex: Episódio #42" : "Ex: Manual de Vendas"}
                className="bg-background border-input text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Tipo</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger className="bg-background border-input text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground">
                  <SelectItem value="training_pdf"><div className="flex items-center gap-2"><Presentation className="w-4 h-4"/> Treinamento (PDF)</div></SelectItem>
                  <SelectItem value="book_pdf"><div className="flex items-center gap-2"><FileText className="w-4 h-4"/> Livro (PDF)</div></SelectItem>
                  <SelectItem value="podcast_audio"><div className="flex items-center gap-2"><Headphones className="w-4 h-4"/> Podcast</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-foreground">Capa</Label>
              <div className="flex gap-2 items-center">
                {coverPreview ? (
                  <img src={coverPreview} alt="Preview" className="h-9 w-9 object-cover rounded border border-border" />
                ) : (
                  <div className="h-9 w-9 bg-muted rounded border border-border flex items-center justify-center"><ImageIcon className="w-4 h-4 opacity-50"/></div>
                )}
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  className="text-sm h-9 px-2 py-1 bg-background border-input text-foreground file:text-foreground" 
                />
              </div>
            </div>
          </div>

          {(type === 'book_pdf' || type === 'training_pdf') ? (
            <div className="space-y-2 bg-muted/20 p-4 rounded-lg border border-dashed border-border">
                <Label htmlFor="pdf_file" className="flex items-center gap-2 mb-2 font-semibold text-primary">
                    <Upload className="w-4 h-4" /> Selecionar PDF
                </Label>
                <Input 
                    id="pdf_file" 
                    type="file" 
                    accept=".pdf" 
                    onChange={(e) => setBookFile(e.target.files?.[0] || null)}
                    className="cursor-pointer bg-background border-input text-foreground file:text-foreground" 
                />
                {initialData?.url && !bookFile && (
                    <p className="text-xs text-muted-foreground mt-2 truncate px-1">
                        PDF Atual: <a href={initialData.url} target="_blank" rel="noreferrer" className="underline hover:text-primary">Visualizar</a>
                    </p>
                )}
            </div>
          ) : (
            <div className="space-y-2">
                <Label htmlFor="url" className="flex items-center gap-2 text-foreground">
                    <LinkIcon className="w-4 h-4" /> Link do Spotify
                </Label>
                <Input 
                    id="url" 
                    value={url} 
                    onChange={e => setUrl(e.target.value)} 
                    placeholder="http://googleusercontent.com/spotify.com/3..." 
                    required 
                    className="bg-background border-input text-foreground"
                />
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">Cancelar</Button>
            <Button type="submit" disabled={isLoading} variant="netflix" className="w-full sm:w-auto">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {isLoading ? 'Salvando...' : 'Salvar Conteúdo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddResourceModal;