import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    channelId?: string;
    channelTitle?: string;
    channelThumbnail?: string;
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    ownerId?: string;
    loginName?: string;
    loginEmail?: string;
    loginPicture?: string;
    channelId?: string;
    channelTitle?: string;
    channelThumbnail?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}
