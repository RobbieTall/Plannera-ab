import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { createTransport } from "nodemailer";

import { prisma } from "@/lib/prisma";

const fromAddress = process.env.EMAIL_FROM;
const smtpHost = process.env.EMAIL_SERVER_HOST;
const smtpPort = process.env.EMAIL_SERVER_PORT
  ? Number(process.env.EMAIL_SERVER_PORT)
  : undefined;
const smtpUser = process.env.EMAIL_SERVER_USER;
const smtpPassword = process.env.EMAIL_SERVER_PASSWORD;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/signin",
  },
  providers: [
    EmailProvider({
      name: "Email",
      from: fromAddress,
      sendVerificationRequest: async ({ identifier, url }) => {
        if (!fromAddress || !smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
          console.error(
            "Email provider is not fully configured. Set EMAIL_FROM and EMAIL_SERVER_* env vars before sending emails.",
          );
          throw new Error("Email provider configuration is incomplete");
        }

        const transport = createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPassword,
          },
        });

        const result = await transport.sendMail({
          to: identifier,
          from: fromAddress,
          subject: "Sign in to Plannera",
          text: `Sign in by clicking on the following link: ${url}`,
          html: `<p>Sign in by clicking on the following link:</p><p><a href="${url}">Sign in</a></p>`,
        });

        const failed = result.rejected.concat(result.pending).filter(Boolean);
        if (failed.length) {
          throw new Error(`Email(s) (${failed.join(", ")}) could not be sent`);
        }
      },
    }),
  ],
};
