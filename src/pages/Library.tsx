import React, { useState, useEffect } from 'react';
import { BookOpen, Headphones, ExternalLink, Plus, Loader2, MoreVertical, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { usePoints } from '@/hooks/usePoints';
import AddResourceModal from '@/components/admin/AddResourceModal';
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

export interface Resource {
  id: string;
  title: string;
  type: 'book_pdf' | 'podcast_audio';
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
  const [addModalType, setAddModalType] = useState<'book_pdf' | 'podcast_audio'>('book_pdf');
  const [activeTab, setActiveTab] = useState('books');
  const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [currentBook, setCurrentBook] = useState<{url: string, title: string} | null>(null);

  const fetchResources = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching resources:', error);
      setIsLoading(false);
      return;
    }

    setResources((data || []) as Resource[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleResourceClick = async (resource: Resource) => {
    // 1. Dar pontos e logar (Mantém igual)
    await awardResourceAccess(resource.id, resource.type);

    if (user?.id) {
      await supabase
        .from('resource_logs')
        .insert({ user_id: user.id, resource_id: resource.id });
    }
    
    // 2. Decisão de Abertura
    if (resource.type === 'book_pdf') {
      // Se for PDF do Supabase (ou link direto acessível), abre no Leitor
      setCurrentBook({ url: resource.url, title: resource.title });
      setReaderOpen(true);
    } else {
      // Se for Podcast ou link externo, mantém comportamento antigo
      toast({
        title: 'Abrindo...',
        description: 'Redirecionando para o conteúdo.',
      });
      window.open(resource.url, '_blank');
    }
  };

  const handleDeleteResource = async () => {
    if (!resourceToDelete) return;

    const { error } = await supabase.from('resources').delete().eq('id', resourceToDelete);

    if (error) {
      console.error('Error deleting resource:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o recurso. Tente novamente.',
        variant: 'destructive',
      });
    } else {
      setResources((prev) => prev.filter((r) => r.id !== resourceToDelete));
      toast({
        title: 'Recurso excluído',
        description: 'O recurso foi removido com sucesso.',
      });
    }
    setResourceToDelete(null);
  };

  const handleEditResource = (resource: Resource) => {
    setEditingResource(resource);
    setShowAddModal(true);
  };

  const handleAddClick = (type: 'book_pdf' | 'podcast_audio') => {
    setAddModalType(type);
    setShowAddModal(true);
  };

  const books = resources.filter(r => r.type === 'book_pdf');
  const podcasts = resources.filter(r => r.type === 'podcast_audio');

  const defaultBookCover = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80';
  const defaultPodcastCover = 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&q=80';

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Biblioteca</h1>
            <p className="text-muted-foreground">Acesse livros e podcasts para complementar seu aprendizado.</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-between items-center">
            <TabsList className="bg-surface">
              <TabsTrigger
                value="books"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <BookOpen className="w-4 h-4" />
                Livros
              </TabsTrigger>
              <TabsTrigger
                value="podcasts"
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Headphones className="w-4 h-4" />
                Podcasts
              </TabsTrigger>
            </TabsList>

            {isAdmin() && (
              <Button 
                variant="netflix" 
                onClick={() => handleAddClick(activeTab === 'books' ? 'book_pdf' : 'podcast_audio')}
              >
                <Plus className="w-4 h-4" />
                Adicionar {activeTab === 'books' ? 'Livro' : 'Podcast'}
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* ABA LIVROS - Usa aspect-[2/3] (Vertical) */}
              <TabsContent value="books">
                {books.length === 0 ? (
                  <div className="text-center py-20">
                    <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum livro disponível</h3>
                    <p className="text-muted-foreground">
                      {isAdmin() ? 'Clique em "Adicionar Livro" para adicionar o primeiro.' : 'Novos livros serão adicionados em breve.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {books.map((book) => (
                      <Card
                        key={book.id}
                        onClick={() => handleResourceClick(book)}
                        className="bg-card border-border overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                      >
                        {/* AQUI ESTÁ A MUDANÇA: aspect-[2/3] para livros */}
                        <div className="relative aspect-[2/3] overflow-hidden">
                          <img
                            src={book.cover_image || defaultBookCover}
                            alt={book.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                              <ExternalLink className="w-6 h-6 text-primary-foreground" />
                            </div>
                          </div>

                          {/* Botão de Favorito */}
                          <div className="absolute top-2 right-12 z-20">
                            <Button 
                              variant="ghost" 
                              className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite('resource', book.id);
                              }}
                            >
                              <Heart 
                                className={`w-4 h-4 transition-all duration-200 ${isFavorite('resource', book.id) ? 'text-red-500 fill-current' : 'text-white'}`} 
                              />
                            </Button>
                          </div>

                          {isAdmin() && (
                            <div className="absolute top-2 right-2 z-20">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditResource(book); }}>
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-600"
                                    onClick={(e) => { e.stopPropagation(); setResourceToDelete(book.id); }}
                                  >
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {book.title}
                          </h3>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ABA PODCASTS - Usa aspect-square (Quadrado) */}
              <TabsContent value="podcasts">
                {podcasts.length === 0 ? (
                  <div className="text-center py-20">
                    <Headphones className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum podcast disponível</h3>
                    <p className="text-muted-foreground">
                      {isAdmin() ? 'Clique em "Adicionar Podcast" para adicionar o primeiro.' : 'Novos podcasts serão adicionados em breve.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {podcasts.map((podcast) => (
                      <Card
                        key={podcast.id}
                        onClick={() => handleResourceClick(podcast)}
                        className="bg-card border-border overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                      >
                        {/* AQUI ESTÁ A MUDANÇA: aspect-square para podcasts */}
                        <div className="relative aspect-square overflow-hidden">
                          <img
                            src={podcast.cover_image || defaultPodcastCover}
                            alt={podcast.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
                              <ExternalLink className="w-6 h-6 text-primary-foreground" />
                            </div>
                          </div>

                          {/* Botão de Favorito */}
                          <div className="absolute top-2 right-12 z-20">
                             <Button 
                              variant="ghost" 
                              className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite('resource', podcast.id);
                              }}
                            >
                              <Heart 
                                className={`w-4 h-4 transition-all duration-200 ${isFavorite('resource', podcast.id) ? 'text-red-500 fill-current' : 'text-white'}`} 
                              />
                            </Button>
                          </div>

                          {isAdmin() && (
                            <div className="absolute top-2 right-2 z-20">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditResource(podcast); }}>
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600 focus:text-red-600"
                                    onClick={(e) => { e.stopPropagation(); setResourceToDelete(podcast.id); }}
                                  >
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {podcast.title}
                          </h3>
                        </CardContent>
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
        onClose={() => {
          setShowAddModal(false);
          setEditingResource(null);
        }}
        onSuccess={fetchResources}
        // Nota: O modal espera defaultType (consertado aqui)
        initialData={editingResource}
      />

      <AlertDialog open={!!resourceToDelete} onOpenChange={() => setResourceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o recurso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteResource}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {currentBook && (
        <BookReader 
          isOpen={readerOpen} 
          onClose={() => setReaderOpen(false)} 
          pdfUrl={currentBook.url}
          title={currentBook.title}
        />
      )}
    </div>
  );
};

export default Library;
