import React from 'react';
import { BookOpen, Headphones, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface Resource {
  id: string;
  title: string;
  author: string;
  cover: string;
  type: 'book' | 'podcast';
  url: string;
  duration?: string;
}

const books: Resource[] = [
  {
    id: 'b1',
    title: 'A Arte da Negociação',
    author: 'Michael Wheeler',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80',
    type: 'book',
    url: 'https://drive.google.com/example',
  },
  {
    id: 'b2',
    title: 'Como Fazer Amigos e Influenciar Pessoas',
    author: 'Dale Carnegie',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80',
    type: 'book',
    url: 'https://drive.google.com/example',
  },
  {
    id: 'b3',
    title: 'O Poder do Hábito',
    author: 'Charles Duhigg',
    cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80',
    type: 'book',
    url: 'https://drive.google.com/example',
  },
  {
    id: 'b4',
    title: 'Mindset: A Nova Psicologia do Sucesso',
    author: 'Carol Dweck',
    cover: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80',
    type: 'book',
    url: 'https://drive.google.com/example',
  },
  {
    id: 'b5',
    title: 'Os 7 Hábitos das Pessoas Altamente Eficazes',
    author: 'Stephen Covey',
    cover: 'https://images.unsplash.com/photo-1535398089889-dd807df1dfaa?w=400&q=80',
    type: 'book',
    url: 'https://drive.google.com/example',
  },
  {
    id: 'b6',
    title: 'Pai Rico, Pai Pobre',
    author: 'Robert Kiyosaki',
    cover: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&q=80',
    type: 'book',
    url: 'https://drive.google.com/example',
  },
];

const podcasts: Resource[] = [
  {
    id: 'p1',
    title: 'Vendas de Alto Impacto',
    author: 'Conx Vendas',
    cover: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&q=80',
    type: 'podcast',
    url: 'https://spotify.com/example',
    duration: '45 min',
  },
  {
    id: 'p2',
    title: 'Liderança na Prática',
    author: 'Conx Academy',
    cover: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&q=80',
    type: 'podcast',
    url: 'https://spotify.com/example',
    duration: '32 min',
  },
  {
    id: 'p3',
    title: 'Motivação Diária',
    author: 'Thiago Admin',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
    type: 'podcast',
    url: 'https://spotify.com/example',
    duration: '15 min',
  },
];

const ResourceCard: React.FC<{ resource: Resource; onClick: () => void }> = ({ resource, onClick }) => {
  return (
    <Card
      onClick={onClick}
      className="bg-card border-border overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={resource.cover}
          alt={resource.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center">
            <ExternalLink className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
        {resource.type === 'podcast' && resource.duration && (
          <span className="absolute top-3 right-3 px-2 py-1 bg-surface/80 text-foreground text-xs font-medium rounded">
            {resource.duration}
          </span>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {resource.title}
        </h3>
        <p className="text-sm text-muted-foreground">{resource.author}</p>
      </CardContent>
    </Card>
  );
};

const Library: React.FC = () => {
  const { toast } = useToast();

  const handleResourceClick = (resource: Resource) => {
    // Log the access for analytics
    console.log(`Resource accessed: ${resource.id} - ${resource.title}`);
    
    toast({
      title: resource.type === 'book' ? 'Abrindo livro...' : 'Abrindo podcast...',
      description: `${resource.title} será aberto em uma nova aba.`,
    });

    // Open in new tab
    window.open(resource.url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Biblioteca</h1>
          <p className="text-muted-foreground">Acesse livros e podcasts para complementar seu aprendizado.</p>
        </div>

        <Tabs defaultValue="books" className="space-y-6">
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

          <TabsContent value="books">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {books.map((book) => (
                <ResourceCard key={book.id} resource={book} onClick={() => handleResourceClick(book)} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="podcasts">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {podcasts.map((podcast) => (
                <ResourceCard key={podcast.id} resource={podcast} onClick={() => handleResourceClick(podcast)} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Library;
