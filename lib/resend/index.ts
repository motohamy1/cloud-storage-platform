import { getFirebaseAdmin } from "@/lib/firebase";

const RESEND_API_URL = "https://api.resend.com";

const getApiKey = () => {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not configured. Add it to your environment to send verification emails.",
    );
  }
  return key;
};

const getFromAddress = () => {
  return (
    process.env.RESEND_FROM_EMAIL || "BasketStar <onboarding@resend.dev>"
  );
};

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) => {
  const response = await fetch(`${RESEND_API_URL}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(
      payload.message ?? `Resend request failed (${response.status})`,
    );
  }

  return response.json();
};

export const sendVerificationEmail = async (email: string) => {
  const { auth } = getFirebaseAdmin();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const link = await auth.generateEmailVerificationLink(email, {
    url: `${appUrl}/sign-in?verified=pending`,
  });

  await sendEmail({
    to: email,
    subject: "Verify your BasketStar email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #8B0000;">Verify your email</h2>
        <p>Welcome to BasketStar! Confirm your email address to secure your account and unlock sharing.</p>
        <a href="${link}"
           style="display: inline-block; background: #8B0000; color: #fff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">
          Verify email
        </a>
        <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
          If you didn't create a BasketStar account, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Verify your BasketStar email: ${link}`,
  });
};
