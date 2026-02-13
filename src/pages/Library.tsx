import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Headphones, ExternalLink, Plus, Loader2, MoreVertical, Heart, Presentation, Book } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { usePoints } from '@/hooks/usePoints';
import AddResourceModal, { ResourceType } from '@/components/admin/AddResourceModal';
import BookReader from '@/components/library/BookReader';
import { useFavorites } from '@/hooks/useFavorites';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  url: string;
  cover_image: string | null;
}

const Library: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { awardResourceAccess } = usePoints();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<ResourceType>('training_pdf');
  const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  
  const [readerOpen, setReaderOpen] = useState(false);
  const [currentBook, setCurrentBook] = useState<{url: string, title: string, id: string, type: ResourceType} | null>(null);

  const [activeTab, setActiveTab] = useState('trainings');

  const fetchResources = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching resources:', error);
      } else {
        setResources((data || []) as Resource[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleResourceClick = async (resource: Resource) => {
    if (!user) return;
    
    await awardResourceAccess(resource.id, resource.type);
    await supabase.from('resource_logs').insert({ user_id: user.id, resource_id: resource.id });
    
    // Lista de tipos que abrem no Leitor Interno (PDF e EPUB)
    const readerTypes = ['book_pdf', 'training_pdf', 'ebook_epub'];

    if (readerTypes.includes(resource.type)) {
      setCurrentBook({ 
        url: resource.url, 
        title: resource.title, 
        id: resource.id,
        type: resource.type 
      });
      setReaderOpen(true);
    } else {
      toast({ title: 'Abrindo...', description: 'Redirecionando para o conteúdo.' });
      window.open(resource.url, '_blank');
    }
  };

  const handleDeleteResource = async () => {
    if (!resourceToDelete) return;
    const { error } = await supabase.from('resources').delete().eq('id', resourceToDelete);

    if (error) {
      toast({ title: 'Erro ao excluir', description: 'Tente novamente.', variant: 'destructive' });
    } else {
      setResources((prev) => prev.filter((r) => r.id !== resourceToDelete));
      toast({ title: 'Recurso excluído', description: 'Removido com sucesso.' });
    }
    setResourceToDelete(null);
  };

  const handleEditResource = (resource: Resource) => {
    setEditingResource(resource);
    setShowAddModal(true);
  };

  const handleAddClick = (type: ResourceType) => {
    setAddModalType(type);
    setEditingResource(null);
    setShowAddModal(true);
  };

  // Filtros
  const trainings = resources.filter(r => r.type === 'training_pdf');
  // Livros incluem PDFs e ePubs
  const books = resources.filter(r => ['book_pdf', 'ebook_epub'].includes(r.type));
  const podcasts = resources.filter(r => r.type === 'podcast_audio');

  const defaultCover = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&q=80';

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Biblioteca</h1>
            <p className="text-muted-foreground">Acesse treinamentos, livros e podcasts.</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList className="bg-surface w-full sm:w-auto overflow-x-auto justify-start">
              <TabsTrigger value="trainings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Presentation className="w-4 h-4" /> Treinamentos
              </TabsTrigger>
              <TabsTrigger value="books" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <BookOpen className="w-4 h-4" /> Livros
              </TabsTrigger>
              <TabsTrigger value="podcasts" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Headphones className="w-4 h-4" /> Podcasts
              </TabsTrigger>
            </TabsList>

            {isAdmin() && (
              <Button 
                variant="netflix" 
                onClick={() => {
                  if (activeTab === 'podcasts') handleAddClick('podcast_audio');
                  else if (activeTab === 'books') handleAddClick('book_pdf');
                  else handleAddClick('training_pdf');
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Item
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* TREINAMENTOS */}
              <TabsContent value="trainings">
                {trainings.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">Nenhum treinamento disponível.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {trainings.map((item) => (
                      <Card key={item.id} onClick={() => handleResourceClick(item)} className="bg-card border-border group cursor-pointer hover:scale-[1.02] transition-all">
                        <div className="relative aspect-[2/3] overflow-hidden">
                          <img src={item.cover_image || defaultCover} alt={item.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                          {isAdmin() && (
                             <div className="absolute top-2 right-2 z-20">
                               <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/50 text-white rounded-full" onClick={(e) => { e.stopPropagation(); handleEditResource(item); }}>
                                 <MoreVertical className="w-4 h-4" />
                               </Button>
                             </div>
                          )}
                        </div>
                        <CardContent className="p-3"><h3 className="font-medium line-clamp-2 text-sm">{item.title}</h3></CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* LIVROS */}
              <TabsContent value="books">
                {books.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">Nenhum livro disponível.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {books.map((book) => (
                      <Card key={book.id} onClick={() => handleResourceClick(book)} className="bg-card border-border group cursor-pointer hover:scale-[1.02] transition-all">
                        <div className="relative aspect-[2/3] overflow-hidden">
                          <img src={book.cover_image || defaultCover} alt={book.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                          
                          {/* Badge de ePub */}
                          {book.type === 'ebook_epub' && (
                            <div className="absolute top-2 left-2 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded font-bold shadow-sm">
                              ePUB
                            </div>
                          )}

                          <div className="absolute top-2 right-2 flex gap-1 z-20">
                             <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/50 text-white hover:bg-black/70 rounded-full" onClick={(e) => { e.stopPropagation(); toggleFavorite('resource', book.id); }}>
                               <Heart className={`w-4 h-4 ${isFavorite('resource', book.id) ? 'fill-red-500 text-red-500' : ''}`} />
                             </Button>
                             {isAdmin() && (
                               <DropdownMenu>
                                 <DropdownMenuTrigger asChild>
                                   <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/50 text-white hover:bg-black/70 rounded-full"><MoreVertical className="w-4 h-4" /></Button>
                                 </DropdownMenuTrigger>
                                 <DropdownMenuContent>
                                   <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditResource(book); }}>Editar</DropdownMenuItem>
                                   <DropdownMenuItem className="text-red-500" onClick={(e) => { e.stopPropagation(); setResourceToDelete(book.id); }}>Excluir</DropdownMenuItem>
                                 </DropdownMenuContent>
                               </DropdownMenu>
                             )}
                          </div>
                        </div>
                        <CardContent className="p-3"><h3 className="font-medium line-clamp-2 text-sm">{book.title}</h3></CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* PODCASTS */}
              <TabsContent value="podcasts">
                {podcasts.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">Nenhum podcast disponível.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {podcasts.map((podcast) => (
                      <Card key={podcast.id} onClick={() => handleResourceClick(podcast)} className="bg-card border-border group cursor-pointer hover:scale-[1.02]">
                        <div className="relative aspect-square overflow-hidden">
                          <img src={podcast.cover_image || defaultCover} alt={podcast.title} className="w-full h-full object-cover" />
                        </div>
                        <CardContent className="p-3"><h3 className="font-medium line-clamp-2 text-sm">{podcast.title}</h3></CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      <AddResourceModal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingResource(null); }}
        onSuccess={fetchResources}
        defaultType={addModalType}
        initialData={editingResource}
      />

      <AlertDialog open={!!resourceToDelete} onOpenChange={() => setResourceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600" onClick={handleDeleteResource}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {currentBook && (
        <BookReader 
          isOpen={readerOpen} 
          onClose={() => setReaderOpen(false)} 
          url={currentBook.url} 
          title={currentBook.title}
          resourceId={currentBook.id}
          type={currentBook.type} // Passando o tipo para decidir entre PDF e ePUB
        />
      )}
    </div>
  );
};

export default Library;