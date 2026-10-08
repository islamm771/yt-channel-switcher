import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { getOwnerId } from "@/lib/ownerId";

// بيجيب بيانات قناة اليوتيوب المرتبطة بالـ access token الحالي (اسم + صورة + id)
async function fetchYoutubeChannel(accessToken: string) {
  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const channel = data.items?.[0];
  if (!channel) return null;

  return {
    channelId: channel.id as string,
    title: channel.snippet.title as string,
    thumbnail: channel.snippet.thumbnails?.default?.url as string | undefined,
  };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    // تسجيل الدخول الأساسي — هوية الشخص بس (اسم/إيميل/صورة)، من غير أي صلاحيات يوتيوب
    // ده اللي بيتنادى من صفحة /login
    GoogleProvider({
      id: "google",
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: ["openid", "email", "profile"].join(" "),
        },
      },
    }),
    // ربط قناة يوتيوب — provider منفصل تمامًا، بيتفعّل بس لما المستخدم (وهو مسجّل دخول
    // بالفعل) يضغط "إضافة قناة". بياخد صلاحيات يوتيوب الكاملة
    GoogleProvider({
      id: "google-channel",
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/youtube",
            "https://www.googleapis.com/auth/youtube.upload",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // حالة 1: تسجيل دخول أساسي — بنحفظ هوية الشخص في حقول منفصلة (loginName/...)
      // عشان متتلخبطش بعدين لو ربط قناة بحساب Google مختلف
      if (account?.provider === "google") {
        return {
          ...token,
          loginName: user?.name ?? token.loginName,
          loginEmail: user?.email ?? token.loginEmail,
          loginPicture: user?.image ?? token.loginPicture,
        };
      }

      // حالة 2: ربط قناة يوتيوب جديدة (المستخدم مسجّل دخول بالفعل وضغط "إضافة قناة")
      if (account?.provider === "google-channel") {
        const info = await fetchYoutubeChannel(account.access_token!);
        if (!info) {
          return { ...token, error: "NoChannelFound" };
        }

        const ownerId = await getOwnerId();
        const expiresAt = account.expires_at as number;

        if (ownerId) {
          await prisma.channel.upsert({
            where: { ownerId_channelId: { ownerId, channelId: info.channelId } },
            create: {
              ownerId,
              channelId: info.channelId,
              title: info.title,
              thumbnail: info.thumbnail,
              accessToken: account.access_token!,
              refreshToken: account.refresh_token!,
              expiresAt,
            },
            update: {
              title: info.title,
              thumbnail: info.thumbnail,
              accessToken: account.access_token!,
              // لو جوجل معادتش refresh token جديد (بيحصل أحيانًا)، سيب القديم زي ما هو
              ...(account.refresh_token ? { refreshToken: account.refresh_token } : {}),
              expiresAt,
            },
          });
        }

        // هوية تسجيل الدخول (loginName/loginEmail/loginPicture) بتفضل زي ما هي من غير
        // ما تتلمس هنا — بنحدّث بس بيانات القناة النشطة
        return {
          ...token,
          ownerId,
          channelId: info.channelId,
          channelTitle: info.title,
          channelThumbnail: info.thumbnail,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt,
          error: undefined,
        };
      }

      // حالة 3: تبديل قناة من الـ switcher — useSession().update({ channelId })
      if (trigger === "update" && session?.channelId) {
        const ownerId = token.ownerId ?? (await getOwnerId());
        if (!ownerId) return token;

        // نتأكد إن القناة دي فعلاً ملك نفس الشخص قبل ما نبدّل
        const channel = await prisma.channel.findFirst({
          where: { channelId: session.channelId, ownerId },
        });
        if (!channel) return token;

        return {
          ...token,
          ownerId: channel.ownerId,
          channelId: channel.channelId,
          channelTitle: channel.title,
          channelThumbnail: channel.thumbnail ?? undefined,
          accessToken: channel.accessToken,
          refreshToken: channel.refreshToken,
          expiresAt: channel.expiresAt,
          error: undefined,
        };
      }

      // حالة 4: لسه مفيش قناة نشطة خالص (مستخدم عمل login بس ولسه مربطش حاجة) —
      // منعًا لمحاولة تجديد توكن مش موجود أصلًا
      if (!token.channelId) {
        return token;
      }

      // التوكن لسه شغال
      if (Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }

      // انتهت — جدّدها، وحدّث نسخة الداتابيز كمان عشان تفضل متزامنة
      try {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: token.refreshToken as string,
          }),
        });
        const newToken = await res.json();
        if (!res.ok) throw newToken;

        const expiresAt = Math.floor(Date.now() / 1000) + newToken.expires_in;

        if (token.ownerId && token.channelId) {
          await prisma.channel
            .update({
              where: { ownerId_channelId: { ownerId: token.ownerId, channelId: token.channelId } },
              data: { accessToken: newToken.access_token, expiresAt },
            })
            .catch(() => {
              // لو القناة اتشالت من الداتابيز بإيدك، متعملش crash للسيشن
            });
        }

        return { ...token, accessToken: newToken.access_token, expiresAt, error: undefined };
      } catch {
        return { ...token, error: "RefreshTokenError" };
      }
    },

    async session({ session, token }) {
      // هوية تسجيل الدخول — دايمًا من loginName/loginEmail/loginPicture، مش من
      // أي حساب Google اتستخدم بعدين لربط قناة
      session.user = {
        ...session.user,
        name: token.loginName ?? session.user?.name,
        email: token.loginEmail ?? session.user?.email,
        image: token.loginPicture ?? session.user?.image,
      };

      session.accessToken = token.accessToken as string;
      session.channelId = token.channelId;
      session.channelTitle = token.channelTitle;
      session.channelThumbnail = token.channelThumbnail;
      session.error = token.error as string | undefined;
      return session;
    },
  },
};
