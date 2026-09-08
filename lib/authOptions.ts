import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// No accounts database — Google is the only identity provider, and a
// stateless JWT session just carries the Google user's stable id (sub) so
// submissions can be tagged with who made them, without running our own
// user table or password system.
export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) token.sub = account.providerAccountId;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.sub;
      return session;
    },
  },
};
