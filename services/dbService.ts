import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { MediaFile, GeneratedPost, ScheduledPost, Priority } from '../types';

const DB_NAME = 'AI-Manager-DB';
const DB_VERSION = 3;

interface MyDB extends DBSchema {
  media: {
    key: number;
    value: MediaFile;
    indexes: { 'createdAt': Date, 'by-user': string };
  };
  posts: {
    key: number;
    value: GeneratedPost;
    indexes: { 'createdAt': Date, 'by-user': string };
  };
  schedule: {
      key: number;
      value: ScheduledPost;
      indexes: { 'publishAt': Date, 'by-user': string, 'by-post': number };
  }
}

let dbPromise: Promise<IDBPDatabase<MyDB>> | null = null;

const getDb = (): Promise<IDBPDatabase<MyDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<MyDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, tx) {
        if (oldVersion < 1) {
            const mediaStore = db.createObjectStore('media', { keyPath: 'id', autoIncrement: true });
            mediaStore.createIndex('createdAt', 'createdAt');
            mediaStore.createIndex('by-user', 'userId');

            const postsStore = db.createObjectStore('posts', { keyPath: 'id', autoIncrement: true });
            postsStore.createIndex('createdAt', 'createdAt');
            postsStore.createIndex('by-user', 'userId');

            const scheduleStore = db.createObjectStore('schedule', { keyPath: 'id', autoIncrement: true });
            scheduleStore.createIndex('publishAt', 'publishAt');
        }
        if (oldVersion < 2) {
            const mediaStore = tx.objectStore('media');
            if (!mediaStore.indexNames.contains('by-user')) {
                mediaStore.createIndex('by-user', 'userId');
            }
            const postsStore = tx.objectStore('posts');
            if (!postsStore.indexNames.contains('by-user')) {
                postsStore.createIndex('by-user', 'userId');
            }
        }
        if (oldVersion < 3) {
            const scheduleStore = tx.objectStore('schedule');
            scheduleStore.createIndex('by-user', 'userId');
            scheduleStore.createIndex('by-post', 'postId', { unique: true });
        }
      },
    });
  }
  return dbPromise;
};

// MediaFile Operations
export const addMediaFile = async (mediaFile: Omit<MediaFile, 'id'>): Promise<number> => {
  const db = await getDb();
  return db.add('media', mediaFile as MediaFile);
};

export const updateMediaFile = async (mediaFile: MediaFile, userId: string): Promise<number> => {
    const db = await getDb();
    if (!mediaFile.id) throw new Error("Media file must have an id to be updated.");
    
    const existingFile = await db.get('media', mediaFile.id);
    if (!existingFile || existingFile.userId !== userId) {
        throw new Error("Unauthorized: Cannot update file or file not found.");
    }
    
    const fileToSave = { ...mediaFile, userId: userId };
    return db.put('media', fileToSave);
};


export const getAllMediaFiles = async (userId: string): Promise<MediaFile[]> => {
  const db = await getDb();
  return db.getAllFromIndex('media', 'by-user', userId);
};

export const getMediaFile = async (id: number): Promise<MediaFile | undefined> => {
    const db = await getDb();
    return db.get('media', id);
};

// GeneratedPost Operations
export const addGeneratedPost = async (post: Omit<GeneratedPost, 'id'>): Promise<number> => {
  const db = await getDb();
  return db.add('posts', post as GeneratedPost);
};

export const updateGeneratedPost = async (post: GeneratedPost): Promise<number> => {
    const db = await getDb();
    if (!post.id) throw new Error("Post must have an ID to be updated.");
    const existingPost = await db.get('posts', post.id);
    if (existingPost?.userId !== post.userId) {
        throw new Error("Unauthorized: Cannot update post belonging to another user.");
    }
    return db.put('posts', post);
}

export const deleteGeneratedPost = async (id: number, userId: string): Promise<void> => {
    const db = await getDb();
    const post = await db.get('posts', id);
    if(post?.userId !== userId) {
        throw new Error("Unauthorized: Cannot delete post belonging to another user.");
    }
    // Also remove any associated schedule
    const scheduled = await db.getFromIndex('schedule', 'by-post', id);
    if (scheduled) {
        await db.delete('schedule', scheduled.id!);
    }
    return db.delete('posts', id);
};

export const getAllGeneratedPosts = async (userId: string): Promise<GeneratedPost[]> => {
  const db = await getDb();
  const posts = await db.getAllFromIndex('posts', 'by-user', userId);
  const scheduled = await db.getAllFromIndex('schedule', 'by-user', userId);
  const scheduleMap = new Map<number, ScheduledPost>();
  for (const s of scheduled) {
    scheduleMap.set(s.postId, s);
  }
  
  for (const post of posts) {
      if (post.mediaFileId) {
          const mediaFile = await getMediaFile(post.mediaFileId);
          if(mediaFile?.userId === userId) {
            post.mediaFile = mediaFile;
          }
      }
      if (post.id && scheduleMap.has(post.id)) {
          post.scheduledAt = scheduleMap.get(post.id)?.publishAt;
      }
      if (!post.priority) {
          post.priority = Priority.Medium;
      }
  }
  return posts.reverse();
};

// ScheduledPost Operations
export const addScheduledPost = async (scheduledPost: Omit<ScheduledPost, 'id'>): Promise<number> => {
    const db = await getDb();
    return db.add('schedule', scheduledPost as ScheduledPost);
};

export const unschedulePost = async (postId: number, userId: string): Promise<void> => {
    const db = await getDb();
    const schedule = await db.getFromIndex('schedule', 'by-post', postId);
    if (schedule) {
        if (schedule.userId !== userId) {
            throw new Error("Unauthorized: Cannot unschedule post for another user.");
        }
        await db.delete('schedule', schedule.id!);
        const post = await db.get('posts', postId);
        if(post && post.userId === userId) {
            post.status = 'draft';
            await db.put('posts', post);
        }
    }
}

export const getAllScheduledPosts = async (userId: string): Promise<ScheduledPost[]> => {
    const db = await getDb();
    const scheduled = await db.getAllFromIndex('schedule', 'by-user', userId);
    for (const item of scheduled) {
        if (item.postId) {
            const post = await db.get('posts', item.postId);
            if(post && post.userId === userId) {
                post.mediaFile = await getMediaFile(post.mediaFileId);
                item.post = post;
            }
        }
    }
    return scheduled;
};

export const removeScheduledPost = async (id: number, userId: string): Promise<void> => {
    const db = await getDb();
    const scheduledItem = await db.get('schedule', id);
    if (scheduledItem?.userId !== userId) {
        throw new Error("Unauthorized: Cannot remove schedule entry for another user.");
    }
    return db.delete('schedule', id);
};