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
import { Course } from "@/types/course";
import { Pencil, Trash2 } from "lucide-react";

interface CourseCardProps {
  course: Course;
  onEdit: (course: Course) => void;
  onDelete: (courseId: number) => void;
}

export function CourseCard({ course, onEdit, onDelete }: CourseCardProps) {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  return (
    <div className="card-netflix group relative">
      <img 
        src={course.cover_image || 'https://placehold.co/600x400/ff6600/white?text=ConX'} 
        alt={course.title} 
        className="w-full h-40 object-cover"
      />
      <div className="p-4">
        <h3 className="font-bold text-lg truncate">{course.title}</h3>
        <p className="text-sm text-muted-foreground truncate">{course.description || 'Sem descrição'}</p>
      </div>

      {/* Botões de Admin */}
      {isAdmin && (
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="outline" size="icon" onClick={() => onEdit(course)}>
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
                  Essa ação não pode ser desfeita. Isso irá excluir permanentemente o curso "{course.title}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(course.id)}>
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