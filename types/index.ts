export interface User {
    id: string; // Google's unique user ID
    name: string;
    email: string;
    picture: string; // URL to profile picture
}

export interface MediaFile {
  id?: number;
  userId: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  mimeType: string;
  data: string; // base64 encoded data
  createdAt: Date;
  tags: string[];
  isLocal?: boolean;
  filePath?: string;
}

export enum Priority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

export interface GeneratedPost {
  id?: number;
  userId: string;
  mediaFileId: number;
  mediaFile?: MediaFile; // For display purposes
  platform: SocialPlatform;
  content: string;
  hashtags: string[];
  createdAt: Date;
  status: 'draft' | 'scheduled' | 'published';
  scheduledAt?: Date; // For display purposes
  priority: Priority;
}

export interface ScheduledPost {
    id?: number;
    userId: string;
    postId: number;
    post?: GeneratedPost; // For display purposes
    publishAt: Date;
}

export enum SocialPlatform {
  TikTok = 'TikTok',
  Clapper = 'Clapper',
}

export enum Page {
    Dashboard = 'Dashboard',
    MediaLibrary = 'MediaLibrary',
    VideoEditor = 'VideoEditor',
    GeneratedPosts = 'GeneratedPosts',
    Settings = 'Settings',
    AIOrder = 'AIOrder',
}

// Video Editor Types
export type RenderQuality = 'Low' | 'Medium' | 'High';
export type RenderResolution = '1280x720' | '1920x1080' | '720x1280' | '1080x1920';