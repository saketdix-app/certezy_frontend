import { Link } from "react-router-dom";
import { ROUTES } from "@/config/app";
import LegalLayout, { ContactBlock, Section } from "./LegalLayout";
import { LEGAL } from "./legal.config";

const SECTIONS = [
    "Acceptance of these terms",
    "Eligibility and accounts",
    "Courses and your licence",
    "Purchases and payment",
    "Refund policy",
    "Certificates and exam preparation",
    "Acceptable use",
    "Reviews and user content",
    "Intellectual property",
    "Third-party services",
    "Communications",
    "Disclaimers",
    "Limitation of liability",
    "Indemnification",
    "Suspension and termination",
    "Governing law and disputes",
    "Changes to these terms",
    "Contact us",
];

export default function TermsOfServicePage() {
    const { brand, company, website } = LEGAL;

    return (
        <LegalLayout
            title="Terms of Service"
            sections={SECTIONS}
            intro={`These Terms of Service govern your use of ${website} and the courses, practice tests and certificates offered by ${brand}. Please read them carefully.`}
        >
            <Section title="Acceptance of these terms">
                <p>
                    These Terms of Service (the &quot;Terms&quot;) are an agreement between you and {company}{" "}
                    (&quot;{brand}&quot;, &quot;we&quot;, &quot;us&quot; or &quot;our&quot;). By creating an
                    account, purchasing a course or otherwise using the Service, you agree to these Terms and
                    to our <Link to={ROUTES.PRIVACY}>Privacy Policy</Link>. If you do not agree, do not use
                    the Service.
                </p>
            </Section>

            <Section title="Eligibility and accounts">
                <ul>
                    <li>
                        You must be at least 18 years old, or at least 13 years old with the consent and
                        supervision of a parent or legal guardian who agrees to these Terms on your behalf.
                    </li>
                    <li>
                        You must provide accurate information and keep it up to date. You are responsible for
                        keeping your password confidential and for all activity under your account.
                    </li>
                    <li>
                        Accounts are personal. You may not share your login or let others access courses you
                        purchased. Tell us immediately at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>{" "}
                        if you suspect unauthorized use.
                    </li>
                </ul>
            </Section>

            <Section title="Courses and your licence">
                <p>
                    When you enroll in a course, we grant you a limited, personal, non-exclusive,
                    non-transferable, revocable licence to access and view the course content through the
                    Service for your own non-commercial learning, for as long as the course remains available
                    on the Service or for the access period stated on the course page.
                </p>
                <p>
                    You may not download (except where a download feature is provided), copy, record, resell,
                    redistribute, publicly display or create derivative works from course content. We may
                    update, reorganize or retire course content to keep it accurate and current.
                </p>
            </Section>

            <Section title="Purchases and payment">
                <ul>
                    <li>
                        Prices are shown on each course page in the currency indicated and may change at any
                        time; changes do not affect purchases already completed. Applicable taxes may be added
                        at checkout.
                    </li>
                    <li>
                        Payments are processed by third-party payment processors such as Razorpay and PayPal.
                        By paying, you also agree to the processor&apos;s terms. We do not store your full
                        card details.
                    </li>
                    <li>
                        Discount links and promotional codes are subject to their stated conditions, have no
                        cash value and may be withdrawn at any time.
                    </li>
                    <li>
                        If a payment is reversed or charged back, we may suspend access to the related course
                        until the matter is resolved.
                    </li>
                </ul>
            </Section>

            <Section title="Refund policy">
                <p>
                    Courses come with a <strong>30-day money-back guarantee</strong>. If you are not
                    satisfied, you can request a full refund within 30 days of purchase by emailing{" "}
                    <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> with your account email and order
                    details. Approved refunds are issued to the original payment method, usually within 5–10
                    business days depending on your bank or payment provider.
                </p>
                <p>
                    When a refund is issued, access to the course and any certificate issued for it are
                    revoked. To prevent abuse, we may decline refund requests where there is evidence of
                    excessive refund requests, content downloading or account sharing. This does not affect
                    any rights you have under applicable consumer protection law.
                </p>
            </Section>

            <Section title="Certificates and exam preparation">
                <p>
                    Certificates of completion issued by {brand} confirm that you completed a {brand} course.
                    Unless expressly stated on the course page, they are not official certifications issued by
                    a certification body, and {brand} courses prepare you for, but do not include or guarantee
                    success in, third-party certification exams.
                </p>
                <p>
                    PMP® and PMI® are registered marks of the Project Management Institute, Inc. AWS®,
                    Microsoft Azure®, CompTIA® and other certification names are trademarks of their
                    respective owners. Their use on the Service identifies the exams our courses relate to and
                    does not imply endorsement, except where an official partnership is expressly stated.
                </p>
            </Section>

            <Section title="Acceptable use">
                <p>You agree not to:</p>
                <ul>
                    <li>break any law or infringe anyone&apos;s rights while using the Service;</li>
                    <li>share, sell or publish course content, test questions or answers;</li>
                    <li>
                        attempt to gain unauthorized access to the Service, other accounts or our systems, or
                        interfere with their operation;
                    </li>
                    <li>use bots, scrapers or other automated means to access or copy the Service;</li>
                    <li>
                        upload malware or content that is unlawful, harassing, hateful, misleading or obscene;
                    </li>
                    <li>impersonate any person or misrepresent your affiliation with anyone.</li>
                </ul>
            </Section>

            <Section title="Reviews and user content">
                <p>
                    You may post reviews, ratings and other content. You keep ownership of your content, and
                    you grant {brand} a worldwide, royalty-free, non-exclusive licence to host, display,
                    reproduce and use it in connection with operating and promoting the Service. Reviews must
                    reflect your genuine experience. We may moderate, decline or remove content that breaches
                    these Terms.
                </p>
            </Section>

            <Section title="Intellectual property">
                <p>
                    The Service, including courses, videos, text, practice questions, graphics, logos and
                    software, is owned by {brand} or its licensors and is protected by copyright, trademark
                    and other laws. Except for the licence granted in these Terms, no rights are transferred
                    to you.
                </p>
                <p>
                    If you believe content on the Service infringes your copyright, send a notice under the
                    Digital Millennium Copyright Act (DMCA) to{" "}
                    <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>, with identification of the work, the
                    infringing material and its location, your contact details, a statement of good-faith
                    belief, and a statement under penalty of perjury that you are authorized to act, signed
                    physically or electronically.
                </p>
            </Section>

            <Section title="Third-party services">
                <p>
                    The Service integrates third-party services, including Google and GitHub sign-in, payment
                    processors, and social networks such as Facebook, Instagram and LinkedIn. Your use of
                    those services is governed by their own terms and privacy policies, and we are not
                    responsible for them.
                </p>
            </Section>

            <Section title="Communications">
                <p>
                    You agree to receive electronic communications from us about your account and purchases,
                    which satisfy any legal requirement that such communications be in writing. You can
                    unsubscribe from marketing emails at any time using the link in each email.
                </p>
            </Section>

            <Section title="Disclaimers">
                <p>
                    THE SERVICE AND ALL CONTENT ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;.
                    TO THE FULLEST EXTENT PERMITTED BY LAW, {brand.toUpperCase()} DISCLAIMS ALL WARRANTIES,
                    EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
                    NON-INFRINGEMENT. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED OR
                    ERROR-FREE, OR THAT ANY COURSE WILL RESULT IN PASSING AN EXAM, EMPLOYMENT, A PROMOTION OR
                    ANY PARTICULAR OUTCOME.
                </p>
            </Section>

            <Section title="Limitation of liability">
                <p>
                    TO THE FULLEST EXTENT PERMITTED BY LAW, {brand.toUpperCase()} AND ITS AFFILIATES,
                    OFFICERS, EMPLOYEES AND PARTNERS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                    CONSEQUENTIAL OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, DATA OR GOODWILL, ARISING FROM
                    YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS
                    LIMITED TO THE AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE
                    CLAIM. Some jurisdictions do not allow these limitations, so they may not apply to you.
                </p>
            </Section>

            <Section title="Indemnification">
                <p>
                    You agree to indemnify and hold harmless {brand} from claims, losses and expenses
                    (including reasonable legal fees) arising from your breach of these Terms or your misuse
                    of the Service.
                </p>
            </Section>

            <Section title="Suspension and termination">
                <p>
                    You may close your account at any time by contacting us. We may suspend or terminate your
                    access if you breach these Terms, if required by law, or to protect the Service or other
                    users. Sections that by their nature should survive termination (including intellectual
                    property, disclaimers, limitation of liability and indemnification) will survive.
                </p>
            </Section>

            <Section title="Governing law and disputes">
                <p>
                    These Terms are governed by the laws of the United States and of the state in which{" "}
                    {brand}
                    &apos;s U.S. operations are registered, without regard to conflict-of-laws rules. Nothing
                    in these Terms limits any rights you have under the mandatory consumer protection laws of
                    your state or country of residence.
                </p>
                <p>
                    Before filing a claim, you agree to contact us at{" "}
                    <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> and try to resolve the dispute
                    informally for at least 30 days. Either party may bring an individual claim in small
                    claims court where it qualifies.
                </p>
            </Section>

            <Section title="Changes to these terms">
                <p>
                    We may update these Terms from time to time. We will post the updated Terms on this page
                    with a new effective date and, for material changes, notify you by email or through the
                    Service. Your continued use of the Service after changes take effect means you accept the
                    updated Terms.
                </p>
            </Section>

            <Section title="Contact us">
                <p>Questions about these Terms can be sent to {brand}:</p>
                <ContactBlock />
            </Section>
        </LegalLayout>
    );
}
