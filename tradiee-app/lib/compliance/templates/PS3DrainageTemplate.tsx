/**
 * PS3DrainageTemplate.tsx — AC2306
 * Producer Statement Construction (PS3) — Drainage
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
  { key: 'E1_water', label: 'NZBC E1 Surface Water: VM1, water test in accordance with clause 8.1' },
  { key: 'E1_air', label: 'NZBC E1 Surface Water: VM1, air test in accordance with clause 8.2 or 8.3' },
  { key: 'AS_water', label: 'AS/NZS 3500.2:2021 Sanitary plumbing and drainage, water test in accordance with clause 15.2' },
  { key: 'AS_air', label: 'AS/NZS 3500.2:2021 Sanitary plumbing and drainage, air pressure test in accordance with clause 15.3' },
  { key: 'pvc', label: 'AS/NZS 2032: 2006 Installation of PVC pipe systems, clause 7.3' },
];

export const PS3DrainageTemplate = ({
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
    { title: `PS3 Drainage — ${psNumber}` },
    React.createElement(
      Page,
      { size: 'A4', style: base.page },

      React.createElement(HeaderBar, {
        formCode: 'Producer statement construction (PS3) Drainage',
        formTitle: 'AC2306',
        psNumber,
        user: profile,
      }),

      React.createElement(View, { style: base.noteBanner },
        React.createElement(Text, { style: base.noteText }, 'All sections of this form must be completed.'),
      ),

      React.createElement(InstructionBanner, {
        text: 'TO BE COMPLETED BY THE DRAINLAYER WHO COMPLETED THE WORK',
      }),

      React.createElement(View, { style: base.body },

        React.createElement(FieldRow2Col, {
          label1: "Author's name:", value1: (profile?.full_name || d.authorName) as string,
          label2: 'Building consent No:', value2: (d.buildingConsentNo || d.bc_reference) as string,
        }),
        React.createElement(FieldRow, { label: "Author's company:", value: (profile?.company_name || d.authorCompany) as string }),
        React.createElement(FieldRow, { label: 'Description of drainage work:', value: (d.descriptionOfWork || d.description_of_work) as string }),
        React.createElement(FieldRow, { label: 'Legal description:', value: d.legalDescription as string }),
        React.createElement(FieldRow, { label: 'Site address:', value: (d.siteAddress || d.project_address) as string }),

        React.createElement(View, { style: base.declarationBox },
          React.createElement(Text, { style: base.declarationText },
            'I have sighted the above building consent and read the attached advice notes. I confirm that the drainage pipe work and fittings have been selected and constructed to comply with the consented plans to the extent required by the above building consent, and with clauses E1 and / or G13 of the Building Regulations 1992.',
          ),
          React.createElement(Text, { style: base.declarationText },
            'I hereby certify that I have personally tested the drainage system by the method indicated below:',
          ),
        ),

        ...TEST_METHODS.map(({ key, label }) =>
          React.createElement(CheckItem, { key, label, checked: selectedMethod === key }),
        ),

        React.createElement(View, { style: base.declarationBox },
          React.createElement(Text, { style: base.declarationText },
            'I understand that Council will rely upon this producer statement, for the purposes of establishing compliance with the above building consent.',
          ),
        ),

        React.createElement(SignatureRow, {
          signatureBase64: signature,
          authorName: profile?.full_name as string,
          date: d.date as string,
        }),

        React.createElement(View, { style: base.regRow },
          React.createElement(Text, { style: base.regLabel }, "Certifying drainlayer's registration No:"),
          React.createElement(Text, { style: base.regValue }, (profile?.lbp_number || d.certifyingDrainlayerRegNo || '') as string),
        ),

        React.createElement(Text, { style: base.contactTitle }, "Drainlayer's contact details:"),
        React.createElement(FieldRow2Col, {
          label1: 'Address:', value1: (profile?.address || d.address) as string,
          label2: 'Postcode:', value2: (profile?.postcode || d.postcode) as string,
        }),
        React.createElement(FieldRow2Col, {
          label1: 'Mobile:', value1: (profile?.phone || d.mobile) as string,
          label2: 'Email:', value2: (profile?.email || d.email) as string,
        }),

        React.createElement(CouncilUseOnly, {
          offices: undefined,
          showRegisterChecked: true,
          showRegistrationCurrent: true,
        }),
      ),

      React.createElement(FooterBar, null),
    ),
  );
};
