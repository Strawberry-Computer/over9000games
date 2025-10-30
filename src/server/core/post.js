import { context, reddit } from "@devvit/web/server";

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error("subredditName is required");
  }

  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: "over9000games",
      appIconUri: "icon.png",
      backgroundUri: "post-background.jpeg",
    },
    subredditName: subredditName,
    title: "over9000games",
  });
};
