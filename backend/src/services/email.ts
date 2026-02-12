export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export class EmailService {
    private apiKey: string | undefined;

    constructor(env: { RESEND_API_KEY?: string }) {
        this.apiKey = env.RESEND_API_KEY;
    }

    async sendEmail(options: EmailOptions): Promise<boolean> {
        if (!this.apiKey) {
            console.error('EmailService: RESEND_API_KEY not found in environment');
            return false;
        }

        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: 'Fluxo de Caixa <onboarding@resend.dev>', // Usando o domínio padrão do Resend para testes
                    to: options.to,
                    subject: options.subject,
                    html: options.html,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('EmailService: Failed to send email', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('EmailService: Error sending email', error);
            return false;
        }
    }

    async sendInvitationEmail(
        to: string,
        invitedByName: string,
        familyName: string,
        appUrl: string = 'https://fluxodecaixa.com'
    ) {
        const subject = `Convite para participar da família ${familyName}`;
        const html = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #6366f1;">Olá!</h2>
                <p><strong>${invitedByName}</strong> convidou você para participar do grupo de família <strong>${familyName}</strong> no app Fluxo de Caixa Pessoal.</p>
                <p>Ao aceitar, vocês poderão compartilhar informações financeiras de forma organizada e segura.</p>
                <div style="margin: 30px 0; text-align: center;">
                    <a href="${appUrl}/settings" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver Convite</a>
                </div>
                <p style="font-size: 12px; color: #777;">Se você não esperava por este convite, pode ignorar este email.</p>
            </div>
        `;

        return this.sendEmail({ to, subject, html });
    }
}
