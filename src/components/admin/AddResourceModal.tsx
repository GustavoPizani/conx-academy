import React, { useState, useEffect } from 'react';
import { Loader2, Upload, Link as LinkIcon, FileText, Headphones, Image as ImageIcon, Presentation, Book, Globe } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
// Importação para extrair capa do ePub
import ePub from 'epubjs';

export type ResourceType = 'book_pdf' | 'podcast_audio' | 'training_pdf' | 'ebook_epub';

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  url: string;
  cover_image?: string;
}

interface AddResourceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Resource | null;
  defaultType?: ResourceType;
}

const AddResourceModal: React.FC<AddResourceModalProps> = ({ open, onClose, onSuccess, initialData, defaultType }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isExtractingCover, setIsExtractingCover] = useState(false); // Estado para feedback visual
  
  // Estados do Formulário
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ResourceType>('book_pdf');
  const [url, setUrl] = useState(''); 
  
  // Estados da Capa
  const [coverInputType, setCoverInputType] = useState<'file' | 'url'>('file');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  // Arquivo Principal
  const [fileToUpload, setFileToUpload] = useState<File | null>(null); 

  useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title || '');
        setType(initialData.type as ResourceType);
        setUrl(initialData.url || '');
        setCoverPreview(initialData.cover_image || null);
        if (initialData.cover_image && initialData.cover_image.startsWith('http')) {
            setCoverImageUrl(initialData.cover_image);
            setCoverInputType('url');
        }
      } else {
        setTitle('');
        setType(defaultType || 'book_pdf');
        setUrl('');
        setCoverImageFile(null);
        setCoverImageUrl('');
        setCoverPreview(null);
        setFileToUpload(null);
        setCoverInputType('file');
      }
    }
  }, [open, initialData, defaultType]);

  // --- NOVA LÓGICA: Extração Automática de Capa ePub ---
  useEffect(() => {
    const extractEpubCover = async () => {
      if (type === 'ebook_epub' && fileToUpload) {
        try {
          setIsExtractingCover(true);
          const reader = new FileReader();
          
          reader.onload = async (e) => {
            if (e.target?.result) {
              try {
                // Abre o ePub em memória
                const book = ePub(e.target.result as ArrayBuffer);
                // Tenta pegar a URL da capa
                const coverUrl = await book.coverUrl();
                
                if (coverUrl) {
                  // A URL retornada é um Blob URL interno, precisamos converter para File
                  const response = await fetch(coverUrl);
                  const blob = await response.blob();
                  const file = new File([blob], "extracted_cover.jpg", { type: blob.type });
                  
                  // Seta automaticamente como a capa selecionada
                  setCoverImageFile(file);
                  setCoverPreview(URL.createObjectURL(file));
                  toast({ title: "Capa encontrada!", description: "A capa foi extraída do ePub automaticamente." });
                } else {
                  console.log("Nenhuma capa encontrada no metadata do ePub.");
                }
              } catch (err) {
                console.error("Erro interno ao ler ePub:", err);
              }
            }
          };
          
          reader.readAsArrayBuffer(fileToUpload);
        } catch (error) {
          console.error("Erro na extração:", error);
        } finally {
          setIsExtractingCover(false);
        }
      }
    };

    extractEpubCover();
  }, [fileToUpload, type]); // Roda sempre que o arquivo ou tipo mudar

  const uploadToStorage = async (file: File, folder: 'covers' | 'pdfs' | 'epubs') => {
    const fileExt = file.name.split('.').pop();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `${folder}/${Date.now()}_${sanitizedName}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('library-files')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('library-files').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCoverImageUrl(val);
    setCoverPreview(val);
  };

  const isFileBased = type !== 'podcast_audio';

  const getFileAccept = () => type === 'ebook_epub' ? '.epub' : '.pdf';
  const getFileLabel = () => type === 'ebook_epub' ? 'Selecionar arquivo .ePub' : 'Selecionar arquivo PDF';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Erro", description: "Título obrigatório.", variant: "destructive" });
      return;
    }

    if (isFileBased && !fileToUpload && !url.trim()) {
        toast({ title: "Erro", description: "Selecione o arquivo.", variant: "destructive" });
        return;
    }

    try {
      setIsLoading(true);
      
      // 1. Upload da Capa (Manual ou Extraída Automaticamente)
      let finalCoverUrl = initialData?.cover_image || null;
      
      // Se tiver um arquivo de capa (seja manual ou extraído do ePub), faz upload
      if (coverImageFile) {
        finalCoverUrl = await uploadToStorage(coverImageFile, 'covers');
      } else if (coverImageUrl.trim()) {
        finalCoverUrl = coverImageUrl.trim();
      }

      // 2. Upload do Arquivo Principal
      let finalResourceUrl = url;
      if (isFileBased && fileToUpload) {
        const folder = type === 'ebook_epub' ? 'epubs' : 'pdfs';
        finalResourceUrl = await uploadToStorage(fileToUpload, folder);
      }

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

      toast({ title: "Sucesso!", description: "Item salvo." });
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast({ title: "Erro", description: "Falha ao salvar recurso.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-background border border-border text-foreground">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Item' : 'Adicionar à Biblioteca'}</DialogTitle>
          <DialogDescription>Suporta PDFs, ePubs e Podcasts.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ex: Manual de Vendas" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Conteúdo</Label>
              <Select value={type} onValueChange={(v: ResourceType) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="training_pdf"><div className="flex items-center gap-2"><Presentation className="w-4 h-4"/> Treinamento (PDF)</div></SelectItem>
                  <SelectItem value="book_pdf"><div className="flex items-center gap-2"><FileText className="w-4 h-4"/> Livro (PDF)</div></SelectItem>
                  <SelectItem value="ebook_epub"><div className="flex items-center gap-2"><Book className="w-4 h-4"/> E-book (.ePub)</div></SelectItem>
                  <SelectItem value="podcast_audio"><div className="flex items-center gap-2"><Headphones className="w-4 h-4"/> Podcast</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* LÓGICA DA CAPA:
               - Se for ePub: Mostra apenas o preview automático (sem inputs).
               - Se NÃO for ePub: Mostra os botões de Arquivo/Link.
            */}
            <div className="space-y-2">
                <Label>Capa {type === 'ebook_epub' && '(Automática)'}</Label>
                
                {type !== 'ebook_epub' && (
                    <div className="flex gap-2 mb-2">
                        <Button 
                            type="button" 
                            variant={coverInputType === 'file' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setCoverInputType('file')}
                            className="flex-1 text-xs"
                        >
                            <Upload className="w-3 h-3 mr-1" /> Arquivo
                        </Button>
                        <Button 
                            type="button" 
                            variant={coverInputType === 'url' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setCoverInputType('url')}
                            className="flex-1 text-xs"
                        >
                            <Globe className="w-3 h-3 mr-1" /> Link
                        </Button>
                    </div>
                )}

                <div className="flex gap-2 items-center">
                    {/* Preview da Capa */}
                    {coverPreview ? (
                        <div className="relative">
                            <img src={coverPreview} alt="Preview" className="h-9 w-9 object-cover rounded border" />
                            {isExtractingCover && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-9 w-9 bg-muted rounded border flex items-center justify-center shrink-0">
                            {isExtractingCover ? <Loader2 className="w-4 h-4 animate-spin"/> : <ImageIcon className="w-4 h-4 opacity-50"/>}
                        </div>
                    )}
                    
                    {/* Inputs manuais (SÓ SE NÃO FOR EPUB) */}
                    {type !== 'ebook_epub' && (
                        coverInputType === 'file' ? (
                            <Input type="file" accept="image/*" onChange={handleCoverFileChange} className="text-sm h-9 px-2 py-1" />
                        ) : (
                            <Input 
                                type="url" 
                                placeholder="https://..." 
                                value={coverImageUrl} 
                                onChange={handleCoverUrlChange} 
                                className="text-sm h-9 px-2" 
                            />
                        )
                    )}
                    
                    {/* Mensagem para ePub */}
                    {type === 'ebook_epub' && (
                        <p className="text-xs text-muted-foreground italic">
                            {isExtractingCover ? "Extraindo capa..." : coverPreview ? "Capa extraída do arquivo." : "Selecione o arquivo para extrair a capa."}
                        </p>
                    )}
                </div>
            </div>
          </div>

          {isFileBased ? (
            <div className="space-y-2 bg-muted/20 p-4 rounded-lg border border-dashed">
                <Label htmlFor="file_upload" className="flex items-center gap-2 mb-2 font-semibold text-primary">
                    <Upload className="w-4 h-4" /> {getFileLabel()}
                </Label>
                <Input 
                  id="file_upload" 
                  type="file" 
                  accept={getFileAccept()} 
                  onChange={(e) => setFileToUpload(e.target.files?.[0] || null)} 
                  className="cursor-pointer" 
                />
                {initialData?.url && !fileToUpload && (
                    <p className="text-xs text-muted-foreground mt-2 truncate px-1">Arquivo Atual: <a href={initialData.url} target="_blank" rel="noreferrer" className="underline">Download</a></p>
                )}
            </div>
          ) : (
            <div className="space-y-2">
                <Label htmlFor="url" className="flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Link do Spotify</Label>
                <Input id="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="http://googleusercontent.com/spotify..." required />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading || isExtractingCover} variant="netflix">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddResourceModal;