import React from 'react';
import { Typography, Divider, Space } from 'antd';

const { Title, Paragraph, Text, Link } = Typography;

const CONTACT_EMAIL = 'essencielglobal@gmail.com';
const SERVICE_NAME = 'Upload Scheduler';
const LAST_UPDATED = 'March 19, 2026';

export const TermsOfService: React.FC = () => {
  return (
    <Typography style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <Title level={2}>Terms of Service</Title>
      <Paragraph type="secondary">Last updated: {LAST_UPDATED}</Paragraph>
      <Divider />

      <Title level={4}>1. Acceptance of Terms</Title>
      <Paragraph>
        By accessing or using {SERVICE_NAME} ("the Service"), you agree to be bound by these
        Terms of Service. If you do not agree to these terms, please do not use the Service.
      </Paragraph>

      <Title level={4}>2. Description of Service</Title>
      <Paragraph>
        {SERVICE_NAME} is a web-based application that allows users to schedule and manage
        video uploads to TikTok. The Service integrates with the TikTok API to publish content
        on your behalf at times you specify.
      </Paragraph>

      <Title level={4}>3. Account and Access</Title>
      <Paragraph>
        To use the Service, you must connect your TikTok account via TikTok's official OAuth
        authorization flow. You are responsible for maintaining the security of your account
        credentials and for all activity that occurs under your account. You must be at least
        18 years old to use the Service.
      </Paragraph>

      <Title level={4}>4. User Responsibilities</Title>
      <Paragraph>
        You agree to:
      </Paragraph>
      <ul>
        <li><Text>Comply with TikTok's Terms of Service and Community Guidelines when uploading content.</Text></li>
        <li><Text>Only upload content that you own or have the right to distribute.</Text></li>
        <li><Text>Not use the Service for any unlawful, harmful, or fraudulent purpose.</Text></li>
        <li><Text>Not attempt to interfere with or disrupt the Service or its infrastructure.</Text></li>
      </ul>

      <Title level={4}>5. Intellectual Property</Title>
      <Paragraph>
        You retain all ownership rights to the content you upload through the Service. By using
        the Service, you grant us a limited, non-exclusive license to process and transmit your
        content solely for the purpose of providing the Service.
      </Paragraph>

      <Title level={4}>6. Third-Party Services</Title>
      <Paragraph>
        The Service relies on the TikTok API and is subject to TikTok's availability, terms, and
        policies. We are not responsible for any changes, outages, or restrictions imposed by
        TikTok that may affect the Service's functionality.
      </Paragraph>

      <Title level={4}>7. Disclaimer of Warranties</Title>
      <Paragraph>
        The Service is provided "as is" and "as available" without warranties of any kind, either
        express or implied. We do not guarantee that the Service will be uninterrupted, error-free,
        or that scheduled uploads will always be published successfully.
      </Paragraph>

      <Title level={4}>8. Limitation of Liability</Title>
      <Paragraph>
        To the maximum extent permitted by law, {SERVICE_NAME} and its operators shall not be
        liable for any indirect, incidental, special, or consequential damages arising from your
        use of the Service, including but not limited to lost revenue, data loss, or failed uploads.
      </Paragraph>

      <Title level={4}>9. Termination</Title>
      <Paragraph>
        We reserve the right to suspend or terminate your access to the Service at any time, with
        or without cause. You may stop using the Service and disconnect your TikTok account at
        any time.
      </Paragraph>

      <Title level={4}>10. Changes to Terms</Title>
      <Paragraph>
        We may update these Terms of Service from time to time. Continued use of the Service after
        changes are posted constitutes acceptance of the revised terms.
      </Paragraph>

      <Title level={4}>11. Contact</Title>
      <Paragraph>
        If you have any questions about these Terms of Service, please contact us
        at <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>.
      </Paragraph>
    </Typography>
  );
};

export const PrivacyPolicy: React.FC = () => {
  return (
    <Typography style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <Title level={2}>Privacy Policy</Title>
      <Paragraph type="secondary">Last updated: {LAST_UPDATED}</Paragraph>
      <Divider />

      <Title level={4}>1. Introduction</Title>
      <Paragraph>
        This Privacy Policy describes how {SERVICE_NAME} ("the Service", "we", "us") collects,
        uses, and protects your personal information. By using the Service, you consent to the
        practices described in this policy.
      </Paragraph>

      <Title level={4}>2. Information We Collect</Title>
      <Paragraph>We collect the following types of information:</Paragraph>
      <ul>
        <li>
          <Text strong>TikTok Account Information:</Text>{' '}
          <Text>When you connect your TikTok account, we receive your TikTok user ID, display name, and profile picture through TikTok's OAuth flow.</Text>
        </li>
        <li>
          <Text strong>OAuth Tokens:</Text>{' '}
          <Text>We store access and refresh tokens provided by TikTok to publish content on your behalf.</Text>
        </li>
        <li>
          <Text strong>Uploaded Content:</Text>{' '}
          <Text>Video files and associated metadata (titles, descriptions, scheduling times) that you provide for scheduled uploads.</Text>
        </li>
        <li>
          <Text strong>Usage Data:</Text>{' '}
          <Text>Basic usage information such as scheduling activity and upload history.</Text>
        </li>
      </ul>

      <Title level={4}>3. How We Use Your Information</Title>
      <Paragraph>We use the collected information to:</Paragraph>
      <ul>
        <li><Text>Authenticate your TikTok account and maintain your session.</Text></li>
        <li><Text>Schedule and publish videos to TikTok on your behalf at your specified times.</Text></li>
        <li><Text>Display your upload history and scheduling status.</Text></li>
        <li><Text>Improve and maintain the Service.</Text></li>
      </ul>

      <Title level={4}>4. Data Storage and Security</Title>
      <Paragraph>
        Your data is stored securely and we implement reasonable technical and organizational
        measures to protect your personal information against unauthorized access, alteration,
        or destruction. OAuth tokens are stored securely and are only used for their intended
        purpose of interacting with the TikTok API.
      </Paragraph>

      <Title level={4}>5. Data Sharing and Third Parties</Title>
      <Paragraph>
        We do not sell, trade, or rent your personal information to third parties. Your content
        is shared with TikTok solely for the purpose of publishing your scheduled uploads. We
        may share information if required by law or to protect our legal rights.
      </Paragraph>

      <Title level={4}>6. Data Retention</Title>
      <Paragraph>
        We retain your data for as long as your account is active or as needed to provide the
        Service. Video files are retained only until they have been successfully uploaded to
        TikTok. You may request deletion of your data at any time by contacting us.
      </Paragraph>

      <Title level={4}>7. Your Rights</Title>
      <Paragraph>You have the right to:</Paragraph>
      <ul>
        <li><Text>Access the personal data we hold about you.</Text></li>
        <li><Text>Request correction of inaccurate data.</Text></li>
        <li><Text>Request deletion of your data.</Text></li>
        <li><Text>Disconnect your TikTok account and revoke our access at any time.</Text></li>
        <li><Text>Export your scheduling data.</Text></li>
      </ul>

      <Title level={4}>8. Cookies and Tracking</Title>
      <Paragraph>
        The Service may use cookies or similar technologies to maintain your session and
        preferences. We do not use third-party tracking or advertising cookies.
      </Paragraph>

      <Title level={4}>9. Children's Privacy</Title>
      <Paragraph>
        The Service is not intended for use by individuals under the age of 18. We do not
        knowingly collect personal information from children.
      </Paragraph>

      <Title level={4}>10. Changes to This Policy</Title>
      <Paragraph>
        We may update this Privacy Policy from time to time. We will notify users of any
        material changes by posting the updated policy with a new "Last updated" date.
      </Paragraph>

      <Title level={4}>11. Contact</Title>
      <Paragraph>
        If you have any questions about this Privacy Policy or wish to exercise your data rights,
        please contact us at <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>.
      </Paragraph>
    </Typography>
  );
};
