import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Lock, Eye, FileAudio, Server, UserCheck, Mail } from 'lucide-react';
import { cn } from '../utils/cn';

export function PrivacyPolicy() {
  const { t } = useTranslation();

  const sections = [
    {
      id: 'information',
      icon: Eye,
      title: t('privacyPolicy.sections.information.title', 'Informações Coletadas'),
      content: [
        {
          subtitle: t('privacyPolicy.sections.information.transactions.title', 'Dados de Transações'),
          text: t('privacyPolicy.sections.information.transactions.text', 'Coletamos informações sobre suas transações financeiras, incluindo valores, datas, categorias, contas e descrições. Esses dados são essenciais para o funcionamento do aplicativo e são armazenados de forma segura em nossa infraestrutura.'),
        },
        {
          subtitle: t('privacyPolicy.sections.information.voice.title', 'Dados de Áudio para Transcrição'),
          text: t('privacyPolicy.sections.information.voice.text', 'Quando você utiliza o recurso de adição por voz, gravamos áudios que são enviados para processamento de transcrição. Esses áudios são convertidos em texto para criar transações e outros dados no aplicativo.'),
        },
        {
          subtitle: t('privacyPolicy.sections.information.account.title', 'Dados da Conta'),
          text: t('privacyPolicy.sections.information.account.text', 'Coletamos seu endereço de e-mail, nome de exibição e identificador de usuário fornecidos pelo Google durante o login. Não temos acesso à sua senha do Google.'),
        },
      ],
    },
    {
      id: 'openai',
      icon: FileAudio,
      title: t('privacyPolicy.sections.openai.title', 'Uso da OpenAI e Retenção de Dados'),
      content: [
        {
          subtitle: t('privacyPolicy.sections.openai.processing.title', 'Processamento de Áudio'),
          text: t('privacyPolicy.sections.openai.processing.text', 'Utilizamos a API da OpenAI (Whisper) para transcrever seus áudios em texto. Os áudios são enviados diretamente para a OpenAI de forma segura e criptografada.'),
        },
        {
          subtitle: t('privacyPolicy.sections.openai.retention.title', 'Retenção de 30 Dias'),
          text: t('privacyPolicy.sections.openai.retention.text', 'Conforme a política de privacidade da OpenAI, os dados de áudio podem ser retidos por até 30 dias para fins de processamento e melhoria dos serviços. Após esse período, os dados são permanentemente excluídos dos servidores da OpenAI.'),
        },
        {
          subtitle: t('privacyPolicy.sections.openai.usage.title', 'Uso dos Dados pela OpenAI'),
          text: t('privacyPolicy.sections.openai.usage.text', 'A OpenAI não utiliza seus dados de áudio para treinar seus modelos de IA. Os dados são processados exclusivamente para fornecer o serviço de transcrição solicitado.'),
        },
      ],
    },
    {
      id: 'security',
      icon: Lock,
      title: t('privacyPolicy.sections.security.title', 'Como Seus Dados São Protegidos'),
      content: [
        {
          subtitle: t('privacyPolicy.sections.security.encryption.title', 'Criptografia'),
          text: t('privacyPolicy.sections.security.encryption.text', 'Todos os dados são transmitidos usando criptografia SSL/TLS. Os dados armazenados em nosso banco de dados são protegidos por criptografia em repouso.'),
        },
        {
          subtitle: t('privacyPolicy.sections.security.access.title', 'Controle de Acesso'),
          text: t('privacyPolicy.sections.security.access.text', 'Seus dados são acessíveis apenas por você através de sua conta autenticada. Utilizamos autenticação OAuth 2.0 via Google para garantir a segurança do login.'),
        },
        {
          subtitle: t('privacyPolicy.sections.security.firebase.title', 'Infraestrutura Segura'),
          text: t('privacyPolicy.sections.security.firebase.text', 'Utilizamos o Firebase, plataforma da Google, para armazenamento de dados. A infraestrutura é certificada e atende aos mais rigorosos padrões de segurança da indústria.'),
        },
      ],
    },
    {
      id: 'rights',
      icon: UserCheck,
      title: t('privacyPolicy.sections.rights.title', 'Seus Direitos (LGPD/GDPR)'),
      content: [
        {
          subtitle: t('privacyPolicy.sections.rights.access.title', 'Direito de Acesso'),
          text: t('privacyPolicy.sections.rights.access.text', 'Você tem o direito de acessar todos os dados que possuímos sobre você através do aplicativo.'),
        },
        {
          subtitle: t('privacyPolicy.sections.rights.correction.title', 'Direito de Correção'),
          text: t('privacyPolicy.sections.rights.correction.text', 'Você pode corrigir ou atualizar seus dados a qualquer momento através das funcionalidades do aplicativo.'),
        },
        {
          subtitle: t('privacyPolicy.sections.rights.deletion.title', 'Direito de Exclusão'),
          text: t('privacyPolicy.sections.rights.deletion.text', 'Você pode excluir sua conta e todos os dados associados a qualquer momento. A exclusão é irreversível e todos os dados são removidos permanentemente.'),
        },
        {
          subtitle: t('privacyPolicy.sections.rights.portability.title', 'Direito à Portabilidade'),
          text: t('privacyPolicy.sections.rights.portability.text', 'Você tem o direito de solicitar uma cópia dos seus dados em formato estruturado e legível por máquina.'),
        },
        {
          subtitle: t('privacyPolicy.sections.rights.consent.title', 'Direito de Revogar Consentimento'),
          text: t('privacyPolicy.sections.rights.consent.text', 'Você pode revogar seu consentimento para o processamento de dados de voz a qualquer momento nas configurações do aplicativo.'),
        },
      ],
    },
    {
      id: 'contact',
      icon: Mail,
      title: t('privacyPolicy.sections.contact.title', 'Contato para Dúvidas'),
      content: [
        {
          text: t('privacyPolicy.sections.contact.text', 'Se você tiver dúvidas sobre esta Política de Privacidade ou sobre como tratamos seus dados, entre em contato conosco através do e-mail:'),
        },
        {
          subtitle: 'privacy@assist.app',
          isEmail: true,
        },
        {
          text: t('privacyPolicy.sections.contact.response', 'Responderemos às suas solicitações em até 30 dias, conforme exigido pela legislação aplicável.'),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-mist text-ink font-sans">
      {/* Header */}
      <header className="sticky top-0 z-sticky bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-glass">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
                "bg-mist hover:bg-slate/10 text-slate hover:text-ink"
              )}
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue/10 text-blue">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-ink">
                  {t('privacyPolicy.title', 'Política de Privacidade')}
                </h1>
                <p className="text-sm text-slate">
                  {t('privacyPolicy.lastUpdated', 'Última atualização')}: {t('privacyPolicy.date', 'Janeiro de 2025')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Introduction */}
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/50 shadow-glass mb-8">
          <p className="text-slate leading-relaxed">
            {t('privacyPolicy.introduction', 'Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações quando você utiliza nosso aplicativo de Fluxo de Caixa Pessoal. Estamos comprometidos em proteger sua privacidade e garantir a segurança dos seus dados pessoais e financeiros.')}
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <section
                key={section.id}
                id={section.id}
                className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/50 shadow-glass scroll-mt-24"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue/10 text-blue">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
                </div>

                <div className="space-y-6">
                  {section.content.map((item, index) => (
                    <div key={index}>
                      {item.subtitle && (
                        <h3 className={cn(
                          "font-medium mb-2",
                          'isEmail' in item && item.isEmail ? "text-blue" : "text-ink"
                        )}>
                          {item.subtitle}
                        </h3>
                      )}
                      {item.text && (
                        <p className="text-slate leading-relaxed">{item.text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate/10 text-center">
          <p className="text-sm text-slate">
            {t('privacyPolicy.footer', 'Ao utilizar nosso aplicativo, você concorda com esta Política de Privacidade.')}
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Link
              to="/terms-of-service"
              className="text-sm text-blue hover:underline"
            >
              {t('privacyPolicy.termsLink', 'Termos de Uso')}
            </Link>
            <span className="text-slate/30">|</span>
            <Link
              to="/"
              className="text-sm text-blue hover:underline"
            >
              {t('privacyPolicy.backToApp', 'Voltar ao Aplicativo')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
