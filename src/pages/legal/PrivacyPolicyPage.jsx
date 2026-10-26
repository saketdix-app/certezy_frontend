import { Link } from "react-router-dom";
import { ROUTES } from "@/config/app";
import LegalLayout, { ContactBlock, Section } from "./LegalLayout";
import { LEGAL } from "./legal.config";

const SECTIONS = [
    "Who we are",
    "Information we collect",
    "How we use your information",
    "Cookies, pixels and similar technologies",
    "How we share your information",
    "Social media and advertising partners",
    "Your US privacy rights",
    "Data deletion requests",
    "Data retention",
    "Security",
    "Children's privacy",
    "Email and text messages",
    "International users",
    "Third-party links and services",
    "Changes to this policy",
    "Contact us",
];

export default function PrivacyPolicyPage() {
    const { brand, company, website } = LEGAL;

    return (
        <LegalLayout
            title="Privacy Policy"
            sections={SECTIONS}
            intro={`This Privacy Policy explains how ${brand} collects, uses, shares and protects personal information when you visit ${website}, create an account, enroll in courses, or otherwise interact with us, and the choices and rights you have.`}
        >
            <Section title="Who we are">
                <p>
                    {brand} (&quot;{brand}&quot;, &quot;we&quot;, &quot;us&quot; or &quot;our&quot;) is an
                    online learning platform operated by {company}. We offer IT and professional certification
                    training courses, practice tests and certificates of completion through {website} (the
                    &quot;Service&quot;).
                </p>
                <p>
                    By using the Service you acknowledge the practices described in this Privacy Policy.
                    Please also read our <Link to={ROUTES.TERMS}>Terms of Service</Link>.
                </p>
            </Section>

            <Section title="Information we collect">
                <h3>Information you give us</h3>
                <ul>
                    <li>
                        <strong>Account details:</strong> name, email address, password (stored only as a
                        secure hash), and optional profile details such as phone number and gender.
                    </li>
                    <li>
                        <strong>Purchase details:</strong> the courses you buy, amounts, discount codes and
                        billing details. Card and bank details are entered directly with our payment
                        processors; we do not receive or store full card numbers.
                    </li>
                    <li>
                        <strong>Enquiries and support:</strong> your name, email, phone number and message
                        when you contact us or fill in a form.
                    </li>
                    <li>
                        <strong>Reviews and feedback:</strong> ratings and comments you choose to publish
                        about a course.
                    </li>
                </ul>

                <h3>Information from sign-in providers</h3>
                <p>
                    If you sign in with Google or GitHub, we receive your name, email address, profile picture
                    and account identifier from that provider, as permitted by your settings with them. We do
                    not receive your password for those services.
                </p>

                <h3>Information collected automatically</h3>
                <ul>
                    <li>
                        <strong>Learning activity:</strong> lessons viewed, progress, test attempts and
                        scores, and certificates earned.
                    </li>
                    <li>
                        <strong>Device and usage data:</strong> IP address, browser type, device type, pages
                        visited, referring pages, and the dates and times of your visits.
                    </li>
                    <li>
                        <strong>Cookies and similar technologies:</strong> see the next sections.
                    </li>
                </ul>
                <p>
                    We do not intentionally collect sensitive personal information (such as government ID
                    numbers, health information or precise geolocation) and ask that you do not submit it to
                    us.
                </p>
            </Section>

            <Section title="How we use your information">
                <ul>
                    <li>
                        To create and manage your account and authenticate you, including via Google or
                        GitHub.
                    </li>
                    <li>
                        To deliver courses, track your progress, score practice tests and issue certificates.
                    </li>
                    <li>To process payments, prevent fraud and send receipts and invoices.</li>
                    <li>To respond to enquiries and provide customer support.</li>
                    <li>
                        To send service messages (for example, account, purchase and security notices) and,
                        where permitted, marketing about new courses and offers.
                    </li>
                    <li>
                        To measure and improve the Service, and to understand how our advertising performs.
                    </li>
                    <li>To keep the Service secure, enforce our Terms and comply with legal obligations.</li>
                </ul>
            </Section>

            <Section title="Cookies, pixels and similar technologies">
                <p>
                    We use cookies and similar technologies that are strictly necessary to run the Service,
                    for example to keep you signed in securely. With your consent where required by law, we
                    and our partners may also use analytics and advertising technologies, which may include:
                </p>
                <ul>
                    <li>
                        <strong>Meta Pixel</strong> (Meta Platforms, Inc.), to measure the effectiveness of
                        our Facebook and Instagram ads and to show relevant ads to people who visited our
                        site.
                    </li>
                    <li>
                        <strong>LinkedIn Insight Tag</strong> (LinkedIn Corporation), to measure LinkedIn ad
                        campaigns, report on website demographics and support retargeting.
                    </li>
                    <li>
                        <strong>Analytics tools</strong>, to understand how visitors use the Service.
                    </li>
                </ul>
                <p>
                    You can block or delete cookies in your browser settings, though some features may stop
                    working. You can also control ad personalization through{" "}
                    <a href="https://www.facebook.com/adpreferences" target="_blank" rel="noreferrer">
                        Meta Ad Preferences
                    </a>
                    ,{" "}
                    <a href="https://www.linkedin.com/psettings/advertising" target="_blank" rel="noreferrer">
                        LinkedIn advertising settings
                    </a>{" "}
                    and the industry opt-out tools at{" "}
                    <a href="https://optout.aboutads.info" target="_blank" rel="noreferrer">
                        optout.aboutads.info
                    </a>
                    . We honor Global Privacy Control (GPC) browser signals as a request to opt out of the
                    &quot;sale&quot; or &quot;sharing&quot; of personal information and targeted advertising
                    where required by law.
                </p>
            </Section>

            <Section title="How we share your information">
                <p>We share personal information only as described below:</p>
                <ul>
                    <li>
                        <strong>Service providers</strong> that process data on our behalf under contract,
                        such as cloud hosting and file storage (Amazon Web Services), email delivery, and
                        customer support tools.
                    </li>
                    <li>
                        <strong>Payment processors</strong> such as Razorpay and PayPal, which process
                        payments under their own privacy policies.
                    </li>
                    <li>
                        <strong>Sign-in providers</strong> (Google, GitHub) when you choose to use them.
                    </li>
                    <li>
                        <strong>Advertising and analytics partners</strong> such as Meta and LinkedIn, as
                        described in this policy.
                    </li>
                    <li>
                        <strong>Legal and safety:</strong> when required by law, legal process or government
                        request, or to protect the rights, property and safety of {brand}, our users or
                        others.
                    </li>
                    <li>
                        <strong>Business transfers:</strong> in connection with a merger, acquisition or sale
                        of assets, subject to this policy.
                    </li>
                    <li>
                        <strong>With your consent</strong> or at your direction.
                    </li>
                </ul>
                <p>
                    We do not sell personal information for money. Under some US state laws, using advertising
                    pixels for cross-context behavioral advertising may be considered a &quot;sale&quot; or
                    &quot;sharing&quot;. You can opt out at any time as described in &quot;Your US privacy
                    rights&quot;.
                </p>
            </Section>

            <Section title="Social media and advertising partners">
                <p>
                    We maintain pages on social networks, including Facebook, Instagram and LinkedIn. When you
                    interact with our pages, posts, ads or lead forms on those platforms, the platform&apos;s
                    own privacy policy applies to its processing, and we receive the information you choose to
                    share with us (for example, details submitted through a lead form).
                </p>
                <p>
                    We may upload hashed (encrypted) contact information, such as email addresses, to Meta or
                    LinkedIn to create custom or matched audiences, or to exclude existing students from ads.
                    These platforms use the information only to provide this matching service to us. You can
                    opt out by contacting us at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
                </p>
                <p>
                    Learn more in the{" "}
                    <a href="https://www.facebook.com/privacy/policy" target="_blank" rel="noreferrer">
                        Meta Privacy Policy
                    </a>{" "}
                    and the{" "}
                    <a href="https://www.linkedin.com/legal/privacy-policy" target="_blank" rel="noreferrer">
                        LinkedIn Privacy Policy
                    </a>
                    .
                </p>
            </Section>

            <Section title="Your US privacy rights">
                <p>
                    Depending on where you live, including California (CCPA/CPRA), Virginia, Colorado,
                    Connecticut, Utah, Texas, Oregon and other states with consumer privacy laws, you may have
                    the right to:
                </p>
                <ul>
                    <li>know and access the personal information we hold about you;</li>
                    <li>correct inaccurate personal information;</li>
                    <li>delete your personal information;</li>
                    <li>receive a portable copy of your personal information;</li>
                    <li>
                        opt out of the &quot;sale&quot; or &quot;sharing&quot; of personal information,
                        targeted advertising and profiling with significant effects;
                    </li>
                    <li>appeal our decision on your request.</li>
                </ul>
                <p>
                    To exercise these rights, email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> with
                    the subject &quot;Privacy Request&quot; or use our{" "}
                    <Link to={ROUTES.CONTACT}>contact form</Link>. We will verify your request using
                    information associated with your account and respond within the time required by law
                    (generally 45 days). You may use an authorized agent, who must provide proof of
                    authorization. If we deny your request, you may appeal by replying to our decision; if
                    your appeal is denied you may contact your state Attorney General.
                </p>
                <p>
                    We will not discriminate against you for exercising your privacy rights.
                    <strong> California residents:</strong> in the past 12 months we have collected the
                    categories of information described in &quot;Information we collect&quot; (identifiers,
                    commercial information, internet activity, education-related information and inferences)
                    for the purposes and with the recipients described above. We do not use or disclose
                    sensitive personal information for purposes that require a &quot;limit&quot; right.
                </p>
            </Section>

            <Section title="Data deletion requests" id="data-deletion">
                <p>
                    You can ask us to delete your account and associated personal data at any time, including
                    data received through Google, GitHub, Facebook or LinkedIn sign-in or lead forms:
                </p>
                <ol>
                    <li>
                        Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> from the address linked to
                        your account, with the subject &quot;Data Deletion Request&quot;.
                    </li>
                    <li>Include your full name and, if you have one, your {brand} account email.</li>
                    <li>
                        We will confirm receipt, verify the request and delete your data within 30 days,
                        except information we must keep for legal, tax, accounting or fraud-prevention
                        purposes (for example, purchase and invoice records). We will tell you if anything is
                        retained and why.
                    </li>
                </ol>
                <p>
                    You can also remove {brand}&apos;s access to your Facebook data at any time under Facebook
                    Settings &amp; Privacy → Settings → Apps and Websites.
                </p>
            </Section>

            <Section title="Data retention">
                <p>
                    We keep personal information for as long as your account is active and as needed to
                    provide the Service. After account closure we delete or anonymize it within a reasonable
                    period, except where we must keep it longer to comply with legal, tax or accounting
                    obligations, resolve disputes, or enforce our agreements. Certificate records may be
                    retained so that certificates you share can continue to be verified.
                </p>
            </Section>

            <Section title="Security">
                <p>
                    We use administrative, technical and physical safeguards appropriate to the information we
                    hold, including encrypted connections (HTTPS), hashed passwords, access controls and
                    secure cloud infrastructure. No method of transmission or storage is completely secure, so
                    we cannot guarantee absolute security. If we become aware of a data breach that affects
                    you, we will notify you as required by law.
                </p>
            </Section>

            <Section title="Children's privacy">
                <p>
                    The Service is not directed to children under 13, and we do not knowingly collect personal
                    information from children under 13 in accordance with the Children&apos;s Online Privacy
                    Protection Act (COPPA). Users aged 13 to 17 may use the Service only with the involvement
                    and consent of a parent or legal guardian. If you believe a child under 13 has provided us
                    with personal information, contact us and we will delete it.
                </p>
            </Section>

            <Section title="Email and text messages">
                <p>
                    We send transactional emails about your account and purchases. Marketing emails comply
                    with the CAN-SPAM Act and always include an unsubscribe link; opting out of marketing does
                    not stop transactional messages. We send marketing text messages only with your prior
                    express consent, and you can reply STOP to opt out at any time. Message and data rates may
                    apply.
                </p>
            </Section>

            <Section title="International users">
                <p>
                    {brand} is operated by {company}, and our servers are located in the United States. If you
                    access the Service from outside the United States, your information will be transferred
                    to, stored and processed in the United States and other countries where our service
                    providers operate, whose data protection laws may differ from those of your country. We
                    take steps to protect your information in line with this policy wherever it is processed.
                </p>
            </Section>

            <Section title="Third-party links and services">
                <p>
                    The Service may link to third-party websites and services, such as payment pages, social
                    networks and certification bodies. We are not responsible for their privacy practices;
                    please review their policies before providing information to them.
                </p>
            </Section>

            <Section title="Changes to this policy">
                <p>
                    We may update this Privacy Policy from time to time. We will post the updated version on
                    this page with a new effective date and, if the changes are material, notify you by email
                    or through the Service before they take effect.
                </p>
            </Section>

            <Section title="Contact us">
                <p>Questions or requests about this Privacy Policy can be sent to {brand}:</p>
                <ContactBlock />
            </Section>
        </LegalLayout>
    );
}
