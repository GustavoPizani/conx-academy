import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS, UserRole } from '@/types/auth';
import { Textarea } from '../ui/textarea';

interface AddCourseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const roles: UserRole[] = ['admin', 'coordinator', 'superintendent', 'manager', 'student'];

const courseFormSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres."),
  description: z.string().optional(),
  cover_image: z.string().url("URL da imagem de capa inválida.").optional().or(z.literal('')),
  target_roles: z.array(z.string()).min(1, "Selecione pelo menos um cargo."),
  published: z.boolean(),
  videos: z.array(
    z.object({
      title: z.string().min(1, "O título do vídeo é obrigatório."),
      url: z.string().url("A URL do vídeo deve ser válida."),
    })
  ).optional(),
});

type CourseFormValues = z.infer<typeof courseFormSchema>;

const AddCourseModal: React.FC<AddCourseModalProps> = ({ open, onClose, onSuccess }) => {
  const { toast } = useToast();

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      title: '',
      description: '',
      cover_image: '',
      target_roles: ['student'],
      published: false,
      videos: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "videos",
  });

  const onSubmit = async (data: CourseFormValues) => {
    const { error } = await supabase
      .from('courses')
      .insert({
        title: data.title.trim(),
        description: data.description?.trim() || null,
        cover_image: data.cover_image?.trim() || null,
        target_roles: data.target_roles as UserRole[],
        published: data.published,
        videos: data.videos,
      });

    if (error) {
      toast({
        title: 'Erro ao criar curso',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Curso criado!',
        description: 'O curso foi adicionado com sucesso.',
      });
      form.reset();
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground">Adicionar Novo Curso</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto px-1">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do curso" {...field} className="bg-surface border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descrição do curso" {...field} className="bg-surface border-border" />
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

            <FormField
              control={form.control}
              name="target_roles"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Visível para</FormLabel>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {roles.map((role) => (
                      <FormField
                        key={role}
                        control={form.control}
                        name="target_roles"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={role}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(role)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, role])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== role
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {ROLE_LABELS[role]}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Seção de Vídeos */}
            <div>
              <h3 className="text-lg font-medium mb-4">Vídeos do Curso</h3>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-4 p-4 border rounded-md bg-surface">
                    <div className="flex-grow space-y-2">
                      <FormField
                        control={form.control}
                        name={`videos.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título do Vídeo {index + 1}</FormLabel>
                            <FormControl><Input placeholder="Ex: Módulo 1 - Introdução" {...field} className="bg-input" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`videos.${index}.url`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL do Vídeo {index + 1}</FormLabel>
                            <FormControl><Input placeholder="https://youtube.com/watch?v=..." {...field} className="bg-input" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ title: "", url: "" })}
                  className="w-full"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Vídeo
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="published"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      Publicar imediatamente
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-card pb-4">
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
                  'Criar Curso'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCourseModal;
