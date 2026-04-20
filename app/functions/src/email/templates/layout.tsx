import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import type * as React from 'react';

/**
 * Layout editorial dark — matching com a UI do app.
 * Todos os templates transacionais estendem este shell.
 *
 * Regras de design:
 *  - Tudo inline (Tailwind do react-email converte no build).
 *  - Max-width 560px (ótimo pra mobile + desktop).
 *  - Tipografia system-ui (não há fonts custom confiáveis em email clients).
 *  - Contraste AA mesmo em light-mode override do Apple Mail.
 */

const TOKENS = {
  bg: '#0B0B0F',
  surface: '#17171C',
  surfaceHi: '#1F1F25',
  border: '#27272A',
  text: '#FAFAFA',
  textMuted: '#A1A1AA',
  textDim: '#71717A',
  primary: '#818CF8',
  primaryHover: '#A5B4FC',
};

export interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
  footerNote?: string | undefined;
}

export function EmailLayout({ preview, children, footerNote }: EmailLayoutProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body
          style={{
            backgroundColor: TOKENS.bg,
            color: TOKENS.text,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            margin: 0,
            padding: '32px 0',
            WebkitFontSmoothing: 'antialiased',
          }}
        >
          <Container
            style={{
              maxWidth: '560px',
              margin: '0 auto',
              padding: '0 24px',
            }}
          >
            {/* Header */}
            <Section style={{ paddingBottom: '24px' }}>
              <table
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                role="presentation"
                style={{ borderCollapse: 'collapse' }}
              >
                <tr>
                  <td style={{ width: '28px', verticalAlign: 'middle' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        backgroundColor: TOKENS.text,
                        color: TOKENS.bg,
                        borderRadius: '3px',
                        textAlign: 'center',
                        lineHeight: '28px',
                        fontWeight: 700,
                        fontSize: '14px',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      c
                    </div>
                  </td>
                  <td style={{ paddingLeft: '12px', verticalAlign: 'middle' }}>
                    <Text
                      style={{
                        margin: 0,
                        color: TOKENS.text,
                        fontSize: '14px',
                        fontWeight: 600,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      Controle de Trabalhos
                    </Text>
                  </td>
                </tr>
              </table>
            </Section>

            {/* Content */}
            <Section
              style={{
                backgroundColor: TOKENS.surface,
                border: `1px solid ${TOKENS.border}`,
                borderRadius: '8px',
                padding: '32px',
              }}
            >
              {children}
            </Section>

            {/* Footer */}
            <Section style={{ paddingTop: '24px' }}>
              <Hr style={{ borderColor: TOKENS.border, margin: '0 0 16px' }} />
              {footerNote && (
                <Text
                  style={{
                    margin: '0 0 8px',
                    fontSize: '11px',
                    color: TOKENS.textDim,
                    lineHeight: '16px',
                  }}
                >
                  {footerNote}
                </Text>
              )}
              <Text
                style={{
                  margin: 0,
                  fontSize: '11px',
                  color: TOKENS.textDim,
                  lineHeight: '16px',
                }}
              >
                Este e-mail é automático — não responda. Em caso de dúvida, procure seu
                professor responsável.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export const EMAIL_TOKENS = TOKENS;
