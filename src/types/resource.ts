export type ResourceType = 'book_pdf' | 'podcast_audio';

export interface Resource {
  id: number;
  created_at: string;
  title: string;
  url: string;
  cover_image: string | null;
  type: ResourceType;
}