import { DEFAULT_PHOTO } from "../constants";

export const resolvePhoto = (photoURL, fallback = DEFAULT_PHOTO) => {
  if (!photoURL || (typeof photoURL === "string" && photoURL.startsWith("/"))) {
    return fallback;
  }

  return photoURL;
};

export const resolveUserPhotoURL = (user, fallback = DEFAULT_PHOTO) =>
  resolvePhoto(user?.photoURL ?? user?.authorPhotoURL, fallback);
