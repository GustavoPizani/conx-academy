import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { Resource } from "@/types/resource";
import { Pencil, Trash2, BookOpen, Podcast } from "lucide-react";

interface ResourceCardProps {
  resource: Resource;
  onEdit: (resource: Resource) => void;
  onDelete: (resourceId: number) => void;
}

export function ResourceCard({ resource, onEdit, onDelete }: ResourceCardProps) {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const isBook = resource.type === 'book_pdf';

  return (
    <div className="card-netflix group relative">
      <div className="w-full h-40 bg-surface flex items-center justify-center">
        <img 
          src={resource.cover_image || ''} 
          alt={resource.title} 
          className="w-full h-full object-cover"
          // Em caso de erro na imagem, mostra um ícone
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
        {/* Ícone fallback */}
        {isBook ? <BookOpen className="h-16 w-16 text-muted-foreground" /> : <Podcast className="h-16 w-16 text-muted-foreground" />}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg truncate">{resource.title}</h3>
        <p className="text-sm text-muted-foreground">{isBook ? 'Livro' : 'Podcast'}</p>
      </div>

      {/* Botões de Admin */}
      {isAdmin && (
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="outline" size="icon" onClick={() => onEdit(resource)}>
            <Pencil className="h-4 w-4" />
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação não pode ser desfeita. Isso irá excluir permanentemente o recurso "{resource.title}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(resource.id)}>
                  Sim, excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}