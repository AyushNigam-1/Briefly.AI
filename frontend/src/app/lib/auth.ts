import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { db } from "./mongodb";

export const auth = betterAuth({
    database: mongodbAdapter(db),
    cookies: {
        sessionToken: {
            name: "__Secure-better-auth.session_token",
            options: {
                httpOnly: true,
                secure: true,
                sameSite: "none",
            },
        },
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
        github: {
            clientId: process.env.OAUTH_GITHUB_CLIENT_ID as string,
            clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET as string,
        }
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
    }
});