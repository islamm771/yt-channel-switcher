import { cookies } from "next/headers";

// اسم الكوكي اللي بيحدد "مين صاحب الأداة" — منفصل تمامًا عن جلسة NextAuth،
// عشان ميتأثرش لما تسجّل دخول بحساب Google مختلف لإضافة قناة جديدة
const COOKIE_NAME = "appUserId";

// قراءة بس — الكوكي نفسه بيتظبط في middleware.ts على كل request
export async function getOwnerId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value;
}

export { COOKIE_NAME as OWNER_ID_COOKIE };
