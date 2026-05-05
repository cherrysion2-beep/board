export interface Announcement {
  id: string;
  date: string; // ISO format
  category: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchFilters {
  keyword: string;
  date: string; // YYYY-MM-DD
}
