import { Router, type IRouter } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { db, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const BASE_URL = process.env.BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;

// ── Passport setup ────────────────────────────────────────────────────────────

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    done(null, user ?? null);
  } catch (err) {
    done(err);
  }
});

// Google
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/api/auth/google/callback`,
  }, async (_at, _rt, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value ?? "";
      const [existing] = await db.select().from(usersTable)
        .where(and(eq(usersTable.provider, "google"), eq(usersTable.providerId, profile.id)));
      if (existing) return done(null, existing);
      const [user] = await db.insert(usersTable).values({
        email,
        name: profile.displayName || email,
        avatar: profile.photos?.[0]?.value,
        provider: "google",
        providerId: profile.id,
      }).returning();
      done(null, user);
    } catch (err) { done(err as Error); }
  }));
}

// GitHub
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/api/auth/github/callback`,
  }, async (_at: string, _rt: string, profile: any, done: any) => {
    try {
      const email = profile.emails?.[0]?.value ?? `${profile.username}@github.com`;
      const [existing] = await db.select().from(usersTable)
        .where(and(eq(usersTable.provider, "github"), eq(usersTable.providerId, profile.id)));
      if (existing) return done(null, existing);
      const [user] = await db.insert(usersTable).values({
        email,
        name: profile.displayName || profile.username || email,
        avatar: profile.photos?.[0]?.value,
        provider: "github",
        providerId: profile.id,
      }).returning();
      done(null, user);
    } catch (err) { done(err as Error); }
  }));
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Google
router.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login?error=google" }),
  (_req, res) => res.redirect("/dashboard")
);

// GitHub
router.get("/auth/github",
  passport.authenticate("github", { scope: ["user:email"] })
);
router.get("/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login?error=github" }),
  (_req, res) => res.redirect("/dashboard")
);

// Me
router.get("/auth/me", (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: "Нэвтрээгүй байна" });
  }
});

// Logout
router.post("/auth/logout", (req, res) => {
  req.logout(() => {
    res.json({ ok: true });
  });
});

export { passport };
export default router;
