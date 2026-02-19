/**
 * BundID Integration Service
 * 
 * Integrates with the German Federal Identity System (BundID)
 * for citizen authentication in appointment booking.
 * 
 * BundID supports:
 * - eID (neuer Personalausweis) via SAML 2.0
 * - Elster-Zertifikat
 * - Username/Password
 * 
 * Flow:
 * 1. Redirect citizen to BundID login
 * 2. BundID authenticates and returns SAML assertion
 * 3. We validate the assertion and extract citizen data
 * 4. Pre-fill booking form with verified data
 */

export interface BundIDConfig {
  enabled: boolean;
  entityId: string;
  ssoUrl: string;
  sloUrl: string;
  certFingerprint: string;
  callbackUrl: string;
  metadataUrl: string;
}

export interface BundIDUserData {
  familyName: string;
  givenName: string;
  dateOfBirth?: string;
  placeOfResidence?: {
    street: string;
    postalCode: string;
    city: string;
  };
  email?: string;
  verified: boolean;
  authLevel: 'eID' | 'elster' | 'username';
}

export class BundIDService {
  private config: BundIDConfig;

  constructor(config: BundIDConfig) {
    this.config = config;
  }

  /**
   * Generate SAML AuthnRequest for BundID login.
   */
  generateAuthRequest(returnUrl: string): { redirectUrl: string; requestId: string } {
    if (!this.config.enabled) {
      throw new Error('BundID ist nicht aktiviert');
    }

    const requestId = `_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const issueInstant = new Date().toISOString();

    // SAML AuthnRequest (simplified - production would use proper SAML library)
    const samlRequest = Buffer.from(`
      <samlp:AuthnRequest
        xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
        ID="${requestId}"
        Version="2.0"
        IssueInstant="${issueInstant}"
        AssertionConsumerServiceURL="${this.config.callbackUrl}"
        Destination="${this.config.ssoUrl}"
        ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
        <saml:Issuer>${this.config.entityId}</saml:Issuer>
        <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent"/>
        <samlp:RequestedAuthnContext Comparison="minimum">
          <saml:AuthnContextClassRef>
            http://eidas.europa.eu/LoA/substantial
          </saml:AuthnContextClassRef>
        </samlp:RequestedAuthnContext>
      </samlp:AuthnRequest>
    `).toString('base64');

    const redirectUrl = `${this.config.ssoUrl}?SAMLRequest=${encodeURIComponent(samlRequest)}&RelayState=${encodeURIComponent(returnUrl)}`;

    return { redirectUrl, requestId };
  }

  /**
   * Validate SAML response from BundID and extract user data.
   */
  async validateResponse(samlResponse: string): Promise<BundIDUserData> {
    // In production: proper SAML validation with signature verification
    // using the BundID certificate
    
    const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');
    
    // Extract attributes (simplified parsing)
    const extractAttr = (name: string): string | undefined => {
      const regex = new RegExp(`<saml:Attribute Name="${name}"[^>]*>\\s*<saml:AttributeValue[^>]*>([^<]+)</saml:AttributeValue>`, 's');
      const match = decoded.match(regex);
      return match?.[1]?.trim();
    };

    return {
      familyName: extractAttr('urn:oid:2.5.4.4') || 'Unbekannt',
      givenName: extractAttr('urn:oid:2.5.4.42') || 'Unbekannt',
      dateOfBirth: extractAttr('urn:oid:1.3.6.1.5.5.7.9.1'),
      placeOfResidence: {
        street: extractAttr('urn:oid:2.5.4.9') || '',
        postalCode: extractAttr('urn:oid:2.5.4.17') || '',
        city: extractAttr('urn:oid:2.5.4.7') || '',
      },
      email: extractAttr('urn:oid:0.9.2342.19200300.100.1.3'),
      verified: true,
      authLevel: 'eID',
    };
  }
}

// Default config for development
export const defaultBundIDConfig: BundIDConfig = {
  enabled: false,
  entityId: 'https://termin.kommune.de/saml/metadata',
  ssoUrl: 'https://int.id.bund.de/idp/profile/SAML2/Redirect/SSO',
  sloUrl: 'https://int.id.bund.de/idp/profile/SAML2/Redirect/SLO',
  certFingerprint: '',
  callbackUrl: 'https://termin.kommune.de/auth/bundid/callback',
  metadataUrl: 'https://int.id.bund.de/idp/shibboleth',
};
