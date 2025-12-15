import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddResourceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: 'book_pdf' | 'podcast_audio';
}

const resourceFormSchema = z.object({
  title: z.string().min(3, "O título é obrigatório."),
  url: z.string().url("A URL deve ser válida."),
  cover_image: z.string().url("URL da imagem inválida.").optional().or(z.literal('')),
  type: z.enum(['book_pdf', 'podcast_audio']),
});

type ResourceFormValues = z.infer<typeof resourceFormSchema>;

const AddResourceModal: React.FC<AddResourceModalProps> = ({ 
  open, 
  onClose, 
  onSuccess,
  defaultType = 'book_pdf' 
}) => {
  const { toast } = useToast();

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: {
      title: '',
      url: '',
      cover_image: '',
      type: defaultType,
    },
  });

  useEffect(() => {
    form.reset({ type: defaultType, title: '', url: '', cover_image: '' });
  }, [defaultType, open, form]);

  const onSubmit = async (data: ResourceFormValues) => {
    const { error } = await supabase
      .from('resources')
      .insert({
        title: data.title.trim(),
        url: data.url.trim(),
        cover_image: data.cover_image?.trim() || null,
        type: data.type,
      });

    if (error) {
      toast({
        title: 'Erro ao criar recurso',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Recurso criado!',
        description: `O ${data.type === 'book_pdf' ? 'livro' : 'podcast'} foi adicionado com sucesso.`,
      });
      form.reset();
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Adicionar {form.watch('type') === 'book_pdf' ? 'Livro' : 'Podcast'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-surface border-border">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="book_pdf">Livro (PDF)</SelectItem>
                      <SelectItem value="podcast_audio">Podcast (Áudio)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder={form.watch('type') === 'book_pdf' ? 'Nome do livro' : 'Nome do podcast'} {...field} className="bg-surface border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL *</FormLabel>
                  <FormControl>
                    <Input placeholder={form.watch('type') === 'book_pdf' ? 'Link do Google Drive' : 'Link do Spotify/áudio'} {...field} className="bg-surface border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cover_image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Imagem de Capa</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} className="bg-surface border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="netflix" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  'Adicionar'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddResourceModal;
