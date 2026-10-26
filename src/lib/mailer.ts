/**
 * Transactional email abstraction.
 * No SMTP provider is configured yet (requirements §8 asks the client for one). Until then,
 * messages are logged in development/test and dropped in production with a warning, so the
 * password-reset flow is wired end to end without a hard dependency.
 */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

const consoleMailer: Mailer = {
  async send(message) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`[mailer] No mail transport configured; dropping message to ${message.to}: ${message.subject}`);
      return;
    }
    console.info(`[mailer] To: ${message.to}\nSubject: ${message.subject}\n${message.text}`);
  },
};

let current: Mailer = consoleMailer;

export function setMailer(mailer: Mailer) {
  current = mailer;
}

export function sendMail(message: MailMessage): Promise<void> {
  return current.send(message);
}
