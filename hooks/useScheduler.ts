import { useEffect } from 'react';
import * as db from '../services/dbService';
import * as socialService from '../services/socialService';
import { useAuth } from '../contexts/AuthContext';

const CHECK_INTERVAL = 60 * 1000; // 1 minute

export const useScheduler = (onPublishSuccess: () => void) => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            return;
        }

        const checkSchedule = async () => {
            console.log("Scheduler: Checking for posts to publish...");
            const allScheduled = await db.getAllScheduledPosts(user.id);
            const now = new Date();
            const postsToPublish = allScheduled.filter(p => new Date(p.publishAt) <= now);

            if (postsToPublish.length === 0) {
                return;
            }

            console.log(`Scheduler: Found ${postsToPublish.length} post(s) to publish.`);

            for (const scheduledPost of postsToPublish) {
                if (!scheduledPost.post || !scheduledPost.id) continue;
                
                try {
                    // Simulate the API call to the social platform
                    if (scheduledPost.post.platform === 'TikTok') {
                        await socialService.publishToTikTok(scheduledPost.post);
                    } else if (scheduledPost.post.platform === 'Clapper') {
                        await socialService.publishToClapper(scheduledPost.post);
                    }

                    // On success, update post status and remove from schedule
                    const updatedPost = { ...scheduledPost.post, status: 'published' as const };
                    await db.updateGeneratedPost(updatedPost);
                    await db.removeScheduledPost(scheduledPost.id, user.id);

                    console.log(`Scheduler: Successfully published post ID ${scheduledPost.postId}`);

                } catch (error) {
                    console.error(`Scheduler: Failed to auto-publish post ID ${scheduledPost.postId}:`, error);
                    // Optional: Update post status to 'failed' or handle retry logic here
                }
            }
            // Notify the app that data has changed
            onPublishSuccess();
        };

        const intervalId = setInterval(checkSchedule, CHECK_INTERVAL);

        // Run once on startup as well
        checkSchedule();

        return () => clearInterval(intervalId);

    }, [user, onPublishSuccess]);
};
