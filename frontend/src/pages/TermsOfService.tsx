import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft, CheckCircle, Mic, AlertTriangle, Copyright, RefreshCw } from 'lucide-react';
import { cn } from '../utils/cn';

export function TermsOfService() {
  const { t } = useTranslation();

  const sections = [
    {
      id: 'acceptance',
      icon: CheckCircle,
      title: t('termsOfService.sections.acceptance.title', 'Aceitação dos Termos'),
      content: [
        {
          text: t('termsOfService.sections.acceptance.text1', 'Ao acessar e usar o Assist - Fluxo de Caixa Pessoal, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não poderá usar nosso aplicativo.'),
        },
        {
          text: t('termsOfService.sections.acceptance.text2', 'Estes termos constituem um acordo legal entre você e o Assist. O uso continuado do aplicativo após quaisquer alterações a estes termos significa que você aceita tais alterações.'),
        },
        {
          subtitle: t('termsOfService.sections.acceptance.eligibility.title', 'Elegibilidade'),
          text: t('termsOfService.sections.acceptance.eligibility.text', 'Você deve ter pelo menos 18 anos de idade para usar este aplicativo. Ao usar o Assist, você declara e garante que tem capacidade legal para celebrar um contrato vinculativo.'),
        },
      ],
    },
    {
      id: 'voice',
      icon: Mic,
      title: t('termsOfService.sections.voice.title', 'Uso do Serviço de Voz'),
      content: [
        {
          text: t('termsOfService.sections.voice.text1', 'O Assist oferece um recurso de adição por voz que utiliza a API da OpenAI para transcrever áudios em texto. Ao usar este recurso, você concorda com os seguintes termos:'),
        },
        {
          subtitle: t('termsOfService.sections.voice.consent.title', 'Consentimento Explícito'),
          text: t('termsOfService.sections.voice.consent.text', 'Você deve conceder consentimento explícito antes de usar o recurso de voz. Este consentimento pode ser revogado a qualquer momento nas configurações do aplicativo.'),
        },
        {
          subtitle: t('termsOfService.sections.voice.dataProcessing.title', 'Processamento de Dados de Áudio'),
          text: t('termsOfService.sections.voice.dataProcessing.text', 'Você entende e concorda que seus áudios serão enviados para processamento pela OpenAI. Os áudios são convertidos em texto e os dados de áudio originais são retidos pela OpenAI por até 30 dias conforme sua política de privacidade.'),
        },
        {
          subtitle: t('termsOfService.sections.voice.accuracy.title', 'Precisão da Transcrição'),
          text: t('termsOfService.sections.voice.accuracy.text', 'Embora nos esforcemos para fornecer transcrições precisas, não garantimos que todas as transcrições serão perfeitas. Você é responsável por verificar e corrigir as informações transcritas antes de salvá-las.'),
        },
        {
          subtitle: t('termsOfService.sections.voice.prohibited.title', 'Uso Proibido'),
          text: t('termsOfService.sections.voice.prohibited.text', 'Você concorda em não usar o recurso de voz para gravar ou transmitir conteúdo ilegal, difamatório, obsceno ou que viole os direitos de terceiros.'),
        },
      ],
    },
    {
      id: 'liability',
      icon: AlertTriangle,
      title: t('termsOfService.sections.liability.title', 'Limitações de Responsabilidade'),
      content: [
        {
          text: t('termsOfService.sections.liability.text1', 'O Assist é fornecido "como está" e "conforme disponível", sem garantias de qualquer tipo, expressas ou implícitas.'),
        },
        {
          subtitle: t('termsOfService.sections.liability.financial.title', 'Decisões Financeiras'),
          text: t('termsOfService.sections.liability.financial.text', 'O Assist é uma ferramenta para ajudar no acompanhamento de suas finanças pessoais. Não somos responsáveis por quaisquer decisões financeiras que você tome com base nas informações fornecidas pelo aplicativo. Recomendamos consultar um profissional financeiro qualificado para conselhos financeiros personalizados.'),
        },
        {
          subtitle: t('termsOfService.sections.liability.dataLoss.title', 'Perda de Dados'),
          text: t('termsOfService.sections.liability.dataLoss.text', 'Embora implementemos medidas para proteger seus dados, não garantimos que os dados estarão sempre disponíveis ou livres de perda. Recomendamos que você mantenha registros alternativos de informações financeiras importantes.'),
        },
        {
          subtitle: t('termsOfService.sections.liability.damages.title', 'Limitação de Danos'),
          text: t('termsOfService.sections.liability.damages.text', 'Em nenhuma circunstância seremos responsáveis por danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda de lucros, dados ou uso, decorrentes do uso ou incapacidade de usar o aplicativo.'),
        },
      ],
    },
    {
      id: 'intellectual',
      icon: Copyright,
      title: t('termsOfService.sections.intellectual.title', 'Propriedade Intelectual'),
      content: [
        {
          text: t('termsOfService.sections.intellectual.text1', 'Todo o conteúdo, recursos e funcionalidades do Assist, incluindo mas não se limitando a código, design, logotipos, textos, gráficos e interfaces, são propriedade exclusiva do Assist e estão protegidos por leis de direitos autorais, marcas registradas e outras leis de propriedade intelectual.'),
        },
        {
          subtitle: t('termsOfService.sections.intellectual.license.title', 'Licença de Uso'),
          text: t('termsOfService.sections.intellectual.license.text', 'Concedemos a você uma licença limitada, não exclusiva, não transferível e revogável para usar o aplicativo para fins pessoais e não comerciais. Esta licença não inclui o direito de modificar, copiar, distribuir, transmitir, exibir, reproduzir ou criar trabalhos derivados do aplicativo.'),
        },
        {
          subtitle: t('termsOfService.sections.intellectual.restrictions.title', 'Restrições'),
          text: t('termsOfService.sections.intellectual.restrictions.text', 'Você concorda em não: (a) descompilar, fazer engenharia reversa ou tentar obter o código-fonte do aplicativo; (b) remover quaisquer avisos de direitos autorais ou propriedade; (c) transferir, sublicenciar ou vender o aplicativo; (d) usar o aplicativo para fins ilegais ou não autorizados.'),
        },
      ],
    },
    {
      id: 'changes',
      icon: RefreshCw,
      title: t('termsOfService.sections.changes.title', 'Alterações nos Termos'),
      content: [
        {
          text: t('termsOfService.sections.changes.text1', 'Reservamos o direito de modificar ou substituir estes Termos de Uso a qualquer momento, a nosso critério exclusivo. Alterações significativas serão notificadas através do aplicativo ou por e-mail.'),
        },
        {
          subtitle: t('termsOfService.sections.changes.notification.title', 'Notificação de Alterações'),
          text: t('termsOfService.sections.changes.notification.text', 'Quando fizermos alterações materiais a estes termos, atualizaremos a data da "última atualização" no topo desta página e notificaremos os usuários através de uma notificação no aplicativo.'),
        },
        {
          subtitle: t('termsOfService.sections.changes.continuedUse.title', 'Uso Continuado'),
          text: t('termsOfService.sections.changes.continuedUse.text', 'Seu uso continuado do Assist após a publicação de quaisquer alterações a estes termos constitui aceitação dessas alterações. Se você não concordar com os novos termos, deve parar de usar o aplicativo.'),
        },
        {
          subtitle: t('termsOfService.sections.changes.severability.title', 'Divisibilidade'),
          text: t('termsOfService.sections.changes.severability.text', 'Se qualquer disposição destes termos for considerada inválida ou inexequível, essa disposição será limitada ou eliminada na menor extensão necessária, e as disposições restantes permanecerão em pleno vigor e efeito.'),
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
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-ink">
                  {t('termsOfService.title', 'Termos de Uso')}
                </h1>
                <p className="text-sm text-slate">
                  {t('termsOfService.lastUpdated', 'Última atualização')}: {t('termsOfService.date', 'Janeiro de 2025')}
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
            {t('termsOfService.introduction', 'Bem-vindo ao Assist - Fluxo de Caixa Pessoal. Estes Termos de Uso estabelecem as regras e condições para o uso de nosso aplicativo. Por favor, leia atentamente antes de usar nossos serviços.')}
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
                        <h3 className="font-medium text-ink mb-2">
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

        {/* Contact Section */}
        <section className="bg-blue/5 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-blue/20 shadow-glass mt-6">
          <h2 className="text-lg font-semibold text-ink mb-4">
            {t('termsOfService.contact.title', 'Contato')}
          </h2>
          <p className="text-slate leading-relaxed mb-4">
            {t('termsOfService.contact.text', 'Se você tiver alguma dúvida sobre estes Termos de Uso, entre em contato conosco:')}
          </p>
          <p className="text-blue font-medium">
            legal@assist.app
          </p>
        </section>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate/10 text-center">
          <p className="text-sm text-slate">
            {t('termsOfService.footer', 'Ao utilizar nosso aplicativo, você concorda com estes Termos de Uso.')}
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <Link
              to="/privacy-policy"
              className="text-sm text-blue hover:underline"
            >
              {t('termsOfService.privacyLink', 'Política de Privacidade')}
            </Link>
            <span className="text-slate/30">|</span>
            <Link
              to="/"
              className="text-sm text-blue hover:underline"
            >
              {t('termsOfService.backToApp', 'Voltar ao Aplicativo')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
