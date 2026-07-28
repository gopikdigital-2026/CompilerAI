import { useEffect } from 'react';
import { ArrowLeft, FileText, Shield, Mail } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../hooks/useLanguage';
import { Globe } from 'lucide-react';

interface LegalPageProps {
  type: 'terms' | 'privacy';
  onNavigate: (page: string) => void;
}

export function LegalPage({ type, onNavigate }: LegalPageProps) {
  const { t } = useTranslation();
  const { lang, setLang } = useLanguage();
  const isTerms = type === 'terms';
  const isEnglish = lang === 'en';

  useEffect(() => {
    document.title = isTerms
      ? `${isEnglish ? 'Terms of Service' : 'Términos de Servicio'} — CompilerAI`
      : `${isEnglish ? 'Privacy Policy' : 'Política de Privacidad'} — CompilerAI`;

    const metaDescription = document.querySelector('meta[name="description"]');
    const descContent = isTerms
      ? (isEnglish
        ? 'Terms of Service for CompilerAI — the AI process automation platform. Read the conditions governing your use of the platform.'
        : 'Términos de Servicio de CompilerAI — la plataforma de automatización de procesos con IA. Lee las condiciones que rigen el uso de la plataforma.')
      : (isEnglish
        ? 'Privacy Policy for CompilerAI — how we collect, use, and protect your data on the AI process automation platform.'
        : 'Política de Privacidad de CompilerAI — cómo recopilamos, usamos y protegemos tus datos en la plataforma de automatización con IA.');

    if (metaDescription) {
      metaDescription.setAttribute('content', descContent);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = descContent;
      document.head.appendChild(meta);
    }
  }, [isTerms, isEnglish]);

  const content = isTerms ? getTermsContent(isEnglish) : getPrivacyContent(isEnglish);

  return (
    <div className="min-h-screen bg-surface-900 text-neutral-100">
      <header className="sticky top-0 z-50 bg-surface-900/95 backdrop-blur-md border-b border-surface-700">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-100 transition-colors">
            <ArrowLeft size={16} /> {t.common.back}
          </button>
          <Logo size="md" />
          <button
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-surface-700 transition-all text-xs font-semibold"
          >
            <Globe size={15} />
            <span className="uppercase tracking-wide">{lang}</span>
          </button>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
            {isTerms ? <FileText size={24} className="text-brand-400" /> : <Shield size={24} className="text-brand-400" />}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-neutral-100">
              {isTerms ? (isEnglish ? 'Terms of Service' : 'Términos de Servicio') : (isEnglish ? 'Privacy Policy' : 'Política de Privacidad')}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              {isEnglish ? 'Last updated: July 28, 2026' : 'Última actualización: 28 de julio de 2026'}
            </p>
          </div>
        </div>

        <div className="prose-legal">
          {content.map((section, i) => (
            <section key={i} className="mb-8">
              <h2 className="text-xl font-semibold text-neutral-100 mb-3">{section.title}</h2>
              {section.paragraphs.map((p, j) => (
                <p key={j} className="text-sm text-neutral-400 leading-relaxed mb-3">{p}</p>
              ))}
              {section.list && (
                <ul className="space-y-2 mb-3">
                  {section.list.map((item, j) => (
                    <li key={j} className="text-sm text-neutral-400 leading-relaxed flex gap-2">
                      <span className="text-brand-400 flex-shrink-0 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-surface-700">
          <div className="flex items-start gap-3 p-4 bg-surface-800 border border-surface-600 rounded-xl">
            <Mail size={18} className="text-brand-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-neutral-300 font-medium">
                {isEnglish ? 'Questions about this document?' : '¿Preguntas sobre este documento?'}
              </p>
              <p className="text-sm text-neutral-500 mt-1">
                {isEnglish ? 'Contact us at' : 'Contáctanos en'}{' '}
                <a href="mailto:gopik.digital@gmail.com" className="text-brand-400 hover:text-brand-300 transition-colors">
                  gopik.digital@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </article>

      <footer className="border-t border-surface-700 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-600">© 2026 CompilerAI — {isEnglish ? 'All rights reserved' : 'Todos los derechos reservados'}</p>
          <div className="flex items-center gap-4 text-xs">
            <button onClick={() => onNavigate('terms')} className="text-neutral-500 hover:text-brand-400 transition-colors">
              {isEnglish ? 'Terms' : 'Términos'}
            </button>
            <button onClick={() => onNavigate('privacy')} className="text-neutral-500 hover:text-brand-400 transition-colors">
              {isEnglish ? 'Privacy' : 'Privacidad'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface LegalSection {
  title: string;
  paragraphs: string[];
  list?: string[];
}

function getTermsContent(en: boolean): LegalSection[] {
  if (en) {
    return [
      {
        title: '1. Acceptance of Terms',
        paragraphs: [
          'By accessing or using CompilerAI ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not access or use the Service.',
          'CompilerAI is an AI-powered process automation platform that enables organizations to design, execute, and monitor automated workflows.',
        ],
      },
      {
        title: '2. Eligibility',
        paragraphs: [
          'You must be at least 18 years old and have the legal capacity to enter into a binding agreement to use the Service. By registering, you represent that you meet these requirements.',
        ],
      },
      {
        title: '3. Account Registration',
        paragraphs: [
          'To access certain features, you must register an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate.',
          'You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.',
        ],
      },
      {
        title: '4. Acceptable Use',
        paragraphs: ['You agree not to use the Service to:'],
        list: [
          'Violate any applicable law, regulation, or third-party rights.',
          'Infringe upon intellectual property, privacy, or confidentiality rights.',
          'Upload or transmit viruses, malware, or any other malicious code.',
          'Attempt to gain unauthorized access to the Service, its systems, or other users\' data.',
          'Use the Service to send unsolicited communications or spam.',
          'Reverse engineer, decompile, or disassemble any part of the Service.',
        ],
      },
      {
        title: '5. Organizations and Multi-User Access',
        paragraphs: [
          'CompilerAI supports organizational accounts with multiple users. The user who creates an organization becomes its owner and is responsible for managing member access, roles, and permissions.',
          'Organization owners are responsible for all activity conducted by their members. You agree to only invite authorized individuals to your organization.',
        ],
      },
      {
        title: '6. Data and Content',
        paragraphs: [
          'You retain all rights to the content and data you submit to the Service. By submitting content, you grant CompilerAI a limited license to process, store, and display your content solely as necessary to provide the Service.',
          'You are responsible for ensuring you have the necessary rights to submit all content and data to the Service.',
        ],
      },
      {
        title: '7. AI-Generated Output',
        paragraphs: [
          'The Service uses artificial intelligence to generate analysis, recommendations, and automated actions. AI-generated output may be incomplete, inaccurate, or unsuitable for your specific situation.',
          'You are responsible for reviewing and validating all AI-generated output before relying on it or taking action based on it. CompilerAI is not liable for decisions made based on AI-generated content.',
        ],
      },
      {
        title: '8. Subscription and Billing',
        paragraphs: [
          'Certain features of the Service may require a paid subscription. Subscription fees are billed in advance on a recurring basis as described at the time of purchase.',
          'You may cancel your subscription at any time. Cancellations take effect at the end of the current billing period. Fees paid are non-refundable unless otherwise required by law.',
        ],
      },
      {
        title: '9. Service Availability',
        paragraphs: [
          'CompilerAI strives to maintain high availability but does not guarantee uninterrupted access. We may modify, suspend, or discontinue the Service, or any part of it, at any time without prior notice.',
          'We are not liable for any downtime, data loss, or service interruption caused by factors beyond our reasonable control.',
        ],
      },
      {
        title: '10. Intellectual Property',
        paragraphs: [
          'The Service, including its design, software, branding, and documentation, is the intellectual property of CompilerAI and its licensors. These Terms do not grant you any right to use our trademarks or trade names.',
        ],
      },
      {
        title: '11. Termination',
        paragraphs: [
          'You may terminate your account at any time through your account settings.',
          'CompilerAI may suspend or terminate your account and access to the Service if you violate these Terms or if we believe your conduct is harmful to the Service or other users.',
          'Upon termination, your right to use the Service ceases immediately. We may retain your data for a reasonable period as described in our Privacy Policy.',
        ],
      },
      {
        title: '12. Disclaimers',
        paragraphs: [
          'The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied. We do not warrant that the Service will be error-free, secure, or available at all times.',
        ],
      },
      {
        title: '13. Limitation of Liability',
        paragraphs: [
          'To the maximum extent permitted by law, CompilerAI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or business arising from your use of the Service.',
        ],
      },
      {
        title: '14. Changes to These Terms',
        paragraphs: [
          'We may update these Terms from time to time. We will notify users of material changes. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.',
        ],
      },
      {
        title: '15. Governing Law',
        paragraphs: [
          'These Terms are governed by and construed in accordance with applicable law. Any disputes arising from these Terms or your use of the Service shall be resolved in the competent courts of the applicable jurisdiction.',
        ],
      },
    ];
  }
  return [
    {
      title: '1. Aceptación de los Términos',
      paragraphs: [
        'Al acceder o utilizar CompilerAI ("el Servicio"), aceptas quedar vinculado por estos Términos de Servicio. Si no estás de acuerdo con estos términos, no debes acceder ni utilizar el Servicio.',
        'CompilerAI es una plataforma de automatización de procesos con IA que permite a las organizaciones diseñar, ejecutar y monitorear flujos de trabajo automatizados.',
      ],
    },
    {
      title: '2. Elegibilidad',
      paragraphs: [
        'Debes tener al menos 18 años y capacidad legal para celebrar un acuerdo vinculante para usar el Servicio. Al registrarte, declaras que cumples con estos requisitos.',
      ],
    },
    {
      title: '3. Registro de Cuenta',
      paragraphs: [
        'Para acceder a ciertas funciones, debes registrar una cuenta. Aceptas proporcionar información precisa, actual y completa durante el registro y mantenerla actualizada.',
        'Eres el único responsable de mantener la confidencialidad de tus credenciales de cuenta y de todas las actividades que ocurran bajo tu cuenta. Debes notificarnos inmediatamente sobre cualquier uso no autorizado de tu cuenta.',
      ],
    },
    {
      title: '4. Uso Aceptable',
      paragraphs: ['Aceptas no usar el Servicio para:'],
      list: [
        'Violar cualquier ley, regulación o derecho de terceros aplicable.',
        'Infringir derechos de propiedad intelectual, privacidad o confidencialidad.',
        'Subir o transmitir virus, malware o cualquier otro código malicioso.',
        'Intentar acceder de forma no autorizada al Servicio, sus sistemas o los datos de otros usuarios.',
        'Usar el Servicio para enviar comunicaciones no solicitadas o spam.',
        'Realizar ingeniería inversa, descompilar o desensamblar cualquier parte del Servicio.',
      ],
    },
    {
      title: '5. Organizaciones y Acceso Multi-Usuario',
      paragraphs: [
        'CompilerAI admite cuentas organizacionales con múltiples usuarios. El usuario que crea una organización se convierte en su propietario y es responsable de gestionar el acceso, roles y permisos de los miembros.',
        'Los propietarios de organizaciones son responsables de toda la actividad realizada por sus miembros. Aceptas invitar únicamente a personas autorizadas a tu organización.',
      ],
    },
    {
      title: '6. Datos y Contenido',
      paragraphs: [
        'Conservas todos los derechos sobre el contenido y los datos que envías al Servicio. Al enviar contenido, concedes a CompilerAI una licencia limitada para procesar, almacenar y mostrar tu contenido únicamente en la medida necesaria para prestar el Servicio.',
        'Eres responsable de asegurarte de tener los derechos necesarios para enviar todo el contenido y los datos al Servicio.',
      ],
    },
    {
      title: '7. Resultados Generados por IA',
      paragraphs: [
        'El Servicio utiliza inteligencia artificial para generar análisis, recomendaciones y acciones automatizadas. Los resultados generados por IA pueden ser incompletos, inexactos o no adecuados para tu situación específica.',
        'Eres responsable de revisar y validar todos los resultados generados por IA antes de confiar en ellos o actuar en base a ellos. CompilerAI no se hace responsable de las decisiones tomadas en base a contenido generado por IA.',
      ],
    },
    {
      title: '8. Suscripción y Facturación',
      paragraphs: [
        'Ciertas funciones del Servicio pueden requerir una suscripción de pago. Las tarifas de suscripción se facturan por adelantado de forma recurrente según lo descrito en el momento de la compra.',
        'Puedes cancelar tu suscripción en cualquier momento. Las cancelaciones surten efecto al final del período de facturación actual. Las tarifas pagadas no son reembolsables a menos que lo exija la ley.',
      ],
    },
    {
      title: '9. Disponibilidad del Servicio',
      paragraphs: [
        'CompilerAI se esfuerza por mantener una alta disponibilidad, pero no garantiza acceso ininterrumpido. Podemos modificar, suspender o discontinuar el Servicio, o cualquier parte del mismo, en cualquier momento sin previo aviso.',
        'No nos hacemos responsables de tiempos de inactividad, pérdida de datos o interrupciones del servicio causadas por factores fuera de nuestro control razonable.',
      ],
    },
    {
      title: '10. Propiedad Intelectual',
      paragraphs: [
        'El Servicio, incluido su diseño, software, branding y documentación, es propiedad intelectual de CompilerAI y sus licenciantes. Estos Términos no te otorgan ningún derecho para usar nuestras marcas o nombres comerciales.',
      ],
    },
    {
      title: '11. Terminación',
      paragraphs: [
        'Puedes terminar tu cuenta en cualquier momento a través de la configuración de tu cuenta.',
        'CompilerAI puede suspender o terminar tu cuenta y acceso al Servicio si violas estos Términos o si consideramos que tu conducta es perjudicial para el Servicio o para otros usuarios.',
        'Al finalizar, tu derecho a usar el Servicio cesa inmediatamente. Podemos conservar tus datos durante un período razonable según lo descrito en nuestra Política de Privacidad.',
      ],
    },
    {
      title: '12. Exenciones de Responsabilidad',
      paragraphs: [
        'El Servicio se proporciona "tal cual" y "según disponibilidad" sin garantías de ningún tipo, ya sean expresas o implícitas. No garantizamos que el Servicio esté libre de errores, sea seguro o esté disponible en todo momento.',
      ],
    },
    {
      title: '13. Limitación de Responsabilidad',
      paragraphs: [
        'En la medida máxima permitida por la ley, CompilerAI no será responsable de ningún daño indirecto, incidental, especial, consecuente o punitivo, ni de ninguna pérdida de beneficios, datos o negocio derivada del uso del Servicio.',
      ],
    },
    {
      title: '14. Cambios a Estos Términos',
      paragraphs: [
        'Podemos actualizar estos Términos de vez en cuando. Notificaremos a los usuarios sobre cambios significativos. El uso continuado del Servicio después de que los cambios surtan efecto constituye la aceptación de los Términos actualizados.',
      ],
    },
    {
      title: '15. Ley Aplicable',
      paragraphs: [
        'Estos Términos se rigen e interpretan de acuerdo con la ley aplicable. Cualquier disputa derivada de estos Términos o del uso del Servicio se resolverá en los tribunales competentes de la jurisdicción aplicable.',
      ],
    },
  ];
}

function getPrivacyContent(en: boolean): LegalSection[] {
  if (en) {
    return [
      {
        title: '1. Introduction',
        paragraphs: [
          'This Privacy Policy describes how CompilerAI ("we", "us") collects, uses, and protects your personal data when you use our AI process automation platform ("the Service").',
          'We are committed to protecting your privacy and complying with applicable data protection regulations.',
        ],
      },
      {
        title: '2. Data We Collect',
        paragraphs: ['We collect the following types of data:'],
        list: [
          'Account data: name, email address, company name, and password (hashed).',
          'Usage data: pages visited, features used, actions taken, and timestamps.',
          'Organization data: organization name, member lists, roles, and permissions.',
          'Content data: workflows, analyses, prompts, and other content you create or submit.',
          'Technical data: IP address, browser type, device information, and session logs.',
          'Billing data: subscription plan and payment method identifiers (processed by our payment provider; we do not store full card numbers).',
        ],
      },
      {
        title: '3. How We Use Your Data',
        paragraphs: ['We use your data to:'],
        list: [
          'Provide, maintain, and improve the Service and its features.',
          'Authenticate your identity and manage your account and organization.',
          'Process and execute the workflows, analyses, and automations you configure.',
          'Generate AI-powered insights, recommendations, and reports.',
          'Communicate with you about your account, updates, and support requests.',
          'Monitor for security, fraud prevention, and service reliability.',
          'Comply with legal obligations.',
        ],
      },
      {
        title: '4. Legal Basis for Processing',
        paragraphs: [
          'We process your personal data based on: your consent when registering; the performance of the contract to provide the Service; our legitimate interests in operating and securing the Service; and compliance with legal obligations.',
        ],
      },
      {
        title: '5. Data Sharing and Third Parties',
        paragraphs: [
          'We do not sell your personal data. We share data with the following categories of third parties only as necessary to operate the Service:',
        ],
        list: [
          'Infrastructure providers: cloud hosting and database services that store and process your data.',
          'Authentication providers: when you use OAuth sign-in (e.g., Google), the provider shares the data authorized by you.',
          'Payment providers: process subscription payments and manage billing.',
          'Analytics providers: help us understand Service usage and improve features.',
          'Legal authorities: when required by law, court order, or to protect our rights and the safety of others.',
        ],
      },
      {
        title: '6. Data Retention',
        paragraphs: [
          'We retain your personal data for as long as your account is active. After account termination, we retain data for a reasonable period to comply with legal obligations, resolve disputes, and enforce our agreements.',
          'You may request early deletion of your data, subject to legal retention requirements.',
        ],
      },
      {
        title: '7. Data Security',
        paragraphs: [
          'We implement industry-standard security measures including encryption in transit (TLS) and at rest, row-level security policies on our database, and strict access controls.',
          'Despite our efforts, no method of transmission or storage is completely secure. We will notify affected users of any data breach in accordance with applicable laws.',
        ],
      },
      {
        title: '8. Your Privacy Rights',
        paragraphs: ['Depending on your jurisdiction, you may have the right to:'],
        list: [
          'Access: request a copy of the personal data we hold about you.',
          'Rectification: request correction of inaccurate or incomplete data.',
          'Erasure: request deletion of your personal data ("right to be forgotten").',
          'Restriction: request that we limit processing of your data.',
          'Portability: receive your data in a structured, machine-readable format.',
          'Objection: object to certain types of processing, including marketing.',
          'Withdraw consent: withdraw your consent at any time where processing is based on consent.',
        ],
      },
      {
        title: '9. Cookies and Tracking',
        paragraphs: [
          'The Service uses essential cookies and similar technologies to maintain your session and provide core functionality. We do not use third-party advertising cookies.',
          'You can control cookies through your browser settings. Disabling essential cookies may affect Service functionality.',
        ],
      },
      {
        title: '10. International Data Transfers',
        paragraphs: [
          'Your data may be processed and stored in countries other than your own. We take appropriate measures to ensure your data is protected in accordance with this Privacy Policy and applicable law, including using standard contractual clauses where required.',
        ],
      },
      {
        title: '11. Children\'s Privacy',
        paragraphs: [
          'The Service is not directed at children under 16. We do not knowingly collect personal data from children. If you believe we have collected data from a child, please contact us and we will delete it.',
        ],
      },
      {
        title: '12. Changes to This Policy',
        paragraphs: [
          'We may update this Privacy Policy from time to time. We will notify users of material changes. Continued use of the Service after changes take effect constitutes acceptance of the updated Policy.',
        ],
      },
      {
        title: '13. Contact',
        paragraphs: [
          'If you have questions about this Privacy Policy or wish to exercise your privacy rights, contact us at gopik.digital@gmail.com.',
        ],
      },
    ];
  }
  return [
    {
      title: '1. Introducción',
      paragraphs: [
        'Esta Política de Privacidad describe cómo CompilerAI ("nosotros") recopila, usa y protege tus datos personales cuando utilizas nuestra plataforma de automatización de procesos con IA ("el Servicio").',
        'Estamos comprometidos a proteger tu privacidad y a cumplir con las normativas de protección de datos aplicables.',
      ],
    },
    {
      title: '2. Datos que Recopilamos',
      paragraphs: ['Recopilamos los siguientes tipos de datos:'],
      list: [
        'Datos de cuenta: nombre, correo electrónico, nombre de empresa y contraseña (hash).',
        'Datos de uso: páginas visitadas, funciones utilizadas, acciones realizadas y marcas de tiempo.',
        'Datos de organización: nombre de organización, listas de miembros, roles y permisos.',
        'Datos de contenido: flujos de trabajo, análisis, prompts y otro contenido que creas o envíes.',
        'Datos técnicos: dirección IP, tipo de navegador, información del dispositivo y registros de sesión.',
        'Datos de facturación: plan de suscripción e identificadores de método de pago (procesados por nuestro proveedor de pagos; no almacenamos números de tarjeta completos).',
      ],
    },
    {
      title: '3. Cómo Usamos tus Datos',
      paragraphs: ['Usamos tus datos para:'],
      list: [
        'Proporcionar, mantener y mejorar el Servicio y sus funciones.',
        'Autenticar tu identidad y gestionar tu cuenta y organización.',
        'Procesar y ejecutar los flujos de trabajo, análisis y automatizaciones que configures.',
        'Generar análisis, recomendaciones e informes basados en IA.',
        'Comunicarnos contigo sobre tu cuenta, actualizaciones y solicitudes de soporte.',
        'Monitorear la seguridad, prevenir fraudes y garantizar la fiabilidad del servicio.',
        'Cumplir con obligaciones legales.',
      ],
    },
    {
      title: '4. Base Legal para el Tratamiento',
      paragraphs: [
        'Tratamos tus datos personales basándonos en: tu consentimiento al registrarte; la ejecución del contrato para prestar el Servicio; nuestros intereses legítimos en operar y asegurar el Servicio; y el cumplimiento de obligaciones legales.',
      ],
    },
    {
      title: '5. Compartición de Datos y Terceros',
      paragraphs: [
        'No vendemos tus datos personales. Compartimos datos con las siguientes categorías de terceros solo en la medida necesaria para operar el Servicio:',
      ],
      list: [
        'Proveedores de infraestructura: servicios de hosting en la nube y bases de datos que almacenan y procesan tus datos.',
        'Proveedores de autenticación: cuando usas inicio de sesión OAuth (ej. Google), el proveedor comparte los datos autorizados por ti.',
        'Proveedores de pagos: procesan pagos de suscripción y gestionan facturación.',
        'Proveedores de analítica: nos ayudan a entender el uso del Servicio y mejorar funciones.',
        'Autoridades legales: cuando lo exija la ley, una orden judicial, o para proteger nuestros derechos y la seguridad de otros.',
      ],
    },
    {
      title: '6. Retención de Datos',
      paragraphs: [
        'Conservamos tus datos personales mientras tu cuenta esté activa. Tras la terminación de la cuenta, conservamos los datos durante un período razonable para cumplir con obligaciones legales, resolver disputas y hacer cumplir nuestros acuerdos.',
        'Puedes solicitar la eliminación anticipada de tus datos, sujeto a los requisitos de retención legal.',
      ],
    },
    {
      title: '7. Seguridad de Datos',
      paragraphs: [
        'Implementamos medidas de seguridad de nivel empresarial incluyendo cifrado en tránsito (TLS) y en reposo, políticas de seguridad a nivel de fila en nuestra base de datos y controles de acceso estrictos.',
        'A pesar de nuestros esfuerzos, ningún método de transmisión o almacenamiento es completamente seguro. Notificaremos a los usuarios afectados sobre cualquier violación de datos de acuerdo con las leyes aplicables.',
      ],
    },
    {
      title: '8. tus Derechos de Privacidad',
      paragraphs: ['Dependiendo de tu jurisdicción, puedes tener derecho a:'],
      list: [
        'Acceso: solicitar una copia de los datos personales que tenemos sobre ti.',
        'Rectificación: solicitar la corrección de datos inexactos o incompletos.',
        'Supresión: solicitar la eliminación de tus datos personales ("derecho al olvido").',
        'Limitación: solicitar que limitemos el tratamiento de tus datos.',
        'Portabilidad: recibir tus datos en un formato estructurado y legible por máquina.',
        'Oposición: oponerte a ciertos tipos de tratamiento, incluido el marketing.',
        'Retirada del consentimiento: retirar tu consentimiento en cualquier momento cuando el tratamiento se basa en el consentimiento.',
      ],
    },
    {
      title: '9. Cookies y Seguimiento',
      paragraphs: [
        'El Servicio utiliza cookies esenciales y tecnologías similares para mantener tu sesión y proporcionar funcionalidad básica. No usamos cookies de publicidad de terceros.',
        'Puedes controlar las cookies a través de la configuración de tu navegador. Desactivar las cookies esenciales puede afectar la funcionalidad del Servicio.',
      ],
    },
    {
      title: '10. Transferencias Internacionales de Datos',
      paragraphs: [
        'Tus datos pueden ser procesados y almacenados en países distintos al tuyo. Tomamos las medidas apropiadas para asegurar que tus datos estén protegidos de acuerdo con esta Política de Privacidad y la ley aplicable, incluyendo el uso de cláusulas contractuales estándar cuando sea necesario.',
      ],
    },
    {
      title: '11. Privacidad de Menores',
      paragraphs: [
        'El Servicio no está dirigido a menores de 16 años. No recopilamos conscientemente datos personales de niños. Si crees que hemos recopilado datos de un menor, contáctanos y los eliminaremos.',
      ],
    },
    {
      title: '12. Cambios a Esta Política',
      paragraphs: [
        'Podemos actualizar esta Política de Privacidad de vez en cuando. Notificaremos a los usuarios sobre cambios significativos. El uso continuado del Servicio después de que los cambios surtan efecto constituye la aceptación de la Política actualizada.',
      ],
    },
    {
      title: '13. Contacto',
      paragraphs: [
        'Si tienes preguntas sobre esta Política de Privacidad o deseas ejercer tus derechos de privacidad, contáctanos en gopik.digital@gmail.com.',
      ],
    },
  ];
}
