import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const useConvexPosts = () => {
  const posts = useQuery(api.posts.listPosts);
  return posts ?? [];
};

export default useConvexPosts;
