/**
 * PS3PlumbingTemplate.tsx — AC2311
 * Producer Statement Construction (PS3) — Plumbing
 */
import React from 'react';
import {
  Document, Page, View, Text,
  base,
  HeaderBar, InstructionBanner, FooterBar,
  FieldRow, FieldRow2Col, SignatureRow, CouncilUseOnly,
  CheckItem,
} from './BaseTemplate';

const TEST_METHODS = [
  { key: 'pressure_1500', label: 'Pressurised to 1500kPa for 15 mins — NZBC G12/AS1 clause 7.5.1' },
  { key: 'AS3500_4', label: 'AS/NZS 3500.4:2021 Heated water services, clause 11.3 for 30 mins (hot and cold)' },
  { key: 'AS3500_5', label: 'AS/NZS 3500.5:2012 Housing installations, clause 2.23.1 for 30 mins (hot and cold)' },
  { key: 'NZS7643', label: 'NZS 7643 clause 9.3.2' },
];

export const PS3PlumbingTemplate = ({
  statement,
  profile,
  signature,
}: {
  statement: Record<string, unknown>;
  profile: Record<string, unknown>;
  signature?: string | null;
}) => {
  const d = (statement?.statement_data || {}) as Record<string, unknown>;
  const psNumber = (statement?.ps_number || statement?.doc_number || '') as string;
  const selectedMethod = (d.testMethod || '') as string;

  return React.createElement(
    Document,
    { title: `PS3 Plumbing — ${psNumber}` },
    React.createElement(
      Page,
      { size: 'A4', style: base.page },

      React.createElement(HeaderBar, {
        formCode: 'Producer statement construction (PS3) Plumbing',
        formTitle: 'AC2311',
        psNumber,
        user: profile,
      }),

      React.createElement(View, { style: base.noteBanner },
        React.createElement(Text, { style: base.noteText }, 'All sections of this form must be completed.'),
      ),

      React.createElement(InstructionBanner, {
        text: 'TO BE COMPLETED BY THE CERTIFYING PLUMBER WHO COMPLETED THE WORK',
      }),

      React.createElement(View, { style: base.body },

        React.createElement(FieldRow2Col, {
          label1: 'Author name:', value1: (profile?.full_name || d.authorName) as string,
          label2: 'Building consent No:', value2: (d.buildingConsentNo || d.bc_reference) as string,
        }),
        React.createElement(FieldRow, { label: 'Author company:', value: (profile?.company_name || d.authorCompany) as string }),
        React.createElement(FieldRow, { label: 'Description of plumbing work:', value: (d.descriptionOfWork || d.description_of_work) as string }),
        React.createElement(FieldRow, { label: 'Legal description:', value: d.legalDescription as string }),
        React.createElement(FieldRow, { label: 'Site address:', value: (d.siteAddress || d.project_address) as string }),

        React.createElement(View, { style: base.declarationBox },
          React.createElement(Text, { style: base.declarationText },
            'I have sighted the above building consent and read the attached advice notes. I confirm that the plumbing pipe work and fittings have been selected and constructed to comply with the consented plans to the extent required by the above building consent, and with clause G12 of the Building Regulations',
          ),
          React.createElement(Text, { style: base.declarationText },
            'I hereby certify that I have personally tested the water supply system by the method indicated below:',
          ),
        ),

        ...TEST_METHODS.map(({ key, label }) =>
          React.createElement(CheckItem, { key, label, checked: selectedMethod === key }),
        ),

        React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 } },
          React.createElement(Text, { style: [base.declarationText, { flex: 1, marginBottom: 0 }] }, 'Test report attached'),
          React.createElement(View, { style: { flexDirection: 'row', gap: 8, flexShrink: 0 } },
            React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 3 } },
              React.createElement(View, { style: [base.checkBox, d.testReportAttached === 'yes' ? base.checkBoxChecked : {}] }),
              React.createElement(Text, { style: { fontSize: 8.5, color: '#1a1a1a' } }, 'Yes'),
            ),
            React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 3 } },
              React.createElement(View, { style: [base.checkBox, d.testReportAttached === 'no' ? base.checkBoxChecked : {}] }),
              React.createElement(Text, { style: { fontSize: 8.5, color: '#1a1a1a' } }, 'No'),
            ),
          ),
        ),

        React.createElement(View, { style: base.declarationBox },
          React.createElement(Text, { style: base.declarationText },
            'I understand that this producer statement, if accepted, will be relied on by Council for the purposes of establishing compliance with the above building consent.',
          ),
        ),

        React.createElement(SignatureRow, {
          signatureBase64: signature,
          authorName: profile?.full_name as string,
          date: d.date as string,
        }),

        React.createElement(View, { style: base.regRow },
          React.createElement(Text, { style: base.regLabel }, 'Certifying plumber registration No:'),
          React.createElement(Text, { style: base.regValue }, (profile?.lbp_number || d.certifyingPlumberRegNo || '') as string),
        ),

        React.createElement(Text, { style: base.contactTitle }, 'Plumber contact details:'),
        React.createElement(FieldRow2Col, {
          label1: 'Mobile:', value1: (profile?.phone || d.mobile) as string,
          label2: 'Email:', value2: (profile?.email || d.email) as string,
        }),

        React.createElement(CouncilUseOnly, null),
      ),

      React.createElement(FooterBar, null),
    ),
  );
};
