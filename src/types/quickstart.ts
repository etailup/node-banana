export type QuickstartView = "initial" | "templates" | "vibe";

export type TemplateCategory = "product" | "style" | "composition" | "community";

export interface TemplateMetadata {
  nodeCount: number;
  category: TemplateCategory;
  tags: string[];
  previewImage?: string;
}

export interface CommunityWorkflowMeta {
  id: string;
  name: string;
  filename: string;
  author: string;
  size: number;
}
