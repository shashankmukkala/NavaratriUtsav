import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// No accounts database for auth itself — Google is the only identity
// provider, and a stateless JWT session just carries the Google user's
// stable id (sub) so submissions can be tagged with who made them, without
// running our own password system. The `users` table below is separate:
// it exists purely so the admin dashboard can show a registered-user
// count, not for authentication.
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
  events: {
    async signIn({ user, account }) {
      const id = account?.providerAccountId;
      if (!id) return;
      // Upsert without created_at — leaves it untouched for a returning
      // user (the column default only applies on first insert) while still
      // bumping last_seen_at every time.
      await supabaseAdmin()
        .from("users")
        .upsert(
          { id, email: user.email ?? null, name: user.name ?? null, image: user.image ?? null, last_seen_at: new Date().toISOString() },
          { onConflict: "id" }
        );
    },
  },
};
