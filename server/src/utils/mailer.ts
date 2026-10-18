import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export const getMailer = async (): Promise<nodemailer.Transporter> => {
  if (transporter) return transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter;
  }

  // Fallback to ethereal account or dummy transport for dev
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[Mailer] Initialized Ethereal test mailer: ${testAccount.user}`);
    return transporter;
  } catch (err) {
    console.warn('[Mailer] Could not create Ethereal account, using console logger fallback.');
    // Mock transporter that logs to console
    transporter = {
      sendMail: async (mailOptions: any) => {
        console.log('--- [MOCK EMAIL SENT] ---');
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`Content:\n${mailOptions.text || mailOptions.html}`);
        console.log('-------------------------');
        return { messageId: 'mock-id-' + Date.now() };
      },
    } as any;
    return transporter!;
  }
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
}): Promise<void> => {
  try {
    const mail = await getMailer();
    const info = await mail.sendMail({
      from: process.env.EMAIL_FROM || 'no-reply@playnear.local',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, ''),
    });
    if (nodemailer.getTestMessageUrl(info)) {
      console.log(`[Mailer] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (err: any) {
    console.error(`[Mailer] Failed to send email to ${to}:`, err.message);
  }
};
