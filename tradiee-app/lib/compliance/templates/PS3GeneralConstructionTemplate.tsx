/**
 * PS3GeneralConstructionTemplate.tsx — AC2310
 * Producer Statement Construction (PS3) — General construction work
 */
import React from 'react';
import {
  Document, Page, View, Text,
  base,
  HeaderBar, InstructionBanner, FooterBar,
  FieldRow, FieldRow2Col, SignatureRow, CouncilUseOnly,
  ClauseGrid,
  ALL_CLAUSES_ROW1, ALL_CLAUSES_ROW2, ALL_CLAUSES_ROW3,
  expandClauseCodes,
  OFFICES_CNS,
} from './BaseTemplate';

export const PS3GeneralConstructionTemplate = ({
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
  const selected: string[] = expandClauseCodes((d.buildingCodeClauses as string[]) || (d.nzbcClauses as string[]) || []);

  return React.createElement(
    Document,
    { title: `PS3 General Construction — ${psNumber}` },
    React.createElement(
      Page,
      { size: 'A4', style: base.page },

      React.createElement(HeaderBar, {
        formCode: 'Producer statement construction (PS3) General construction work',
        formTitle: 'AC2310',
        psNumber,
        user: profile,
      }),

      React.createElement(View, { style: base.noteBanner },
        React.createElement(Text, { style: base.noteText }, 'All sections of this form must be completed'),
      ),

      React.createElement(InstructionBanner, {
        text: 'TO BE COMPLETED BY THE PERSON WHO HAS UNDERTAKEN THE BUILDING WORK',
      }),

      React.createElement(View, { style: base.body },

        React.createElement(FieldRow2Col, {
          label1: 'Author name:', value1: (profile?.full_name || d.authorName) as string,
          label2: 'Building consent No:', value2: (d.buildingConsentNo || d.bc_reference) as string,
        }),
        React.createElement(FieldRow2Col, {
          label1: 'Author company:', value1: (profile?.company_name || d.authorCompany) as string,
          label2: 'Author Registration No:', value2: (profile?.lbp_number || profile?.cpeng_number || d.authorRegistrationNo) as string,
        }),
        React.createElement(FieldRow, { label: 'Description of building work:', value: (d.descriptionOfWork || d.description_of_work) as string }),
        React.createElement(FieldRow, { label: 'Performance standards and Inspection, maintenance and reporting procedures, if applicable', value: d.performanceStandards as string }),
        React.createElement(FieldRow, { label: 'Legal description:', value: d.legalDescription as string }),
        React.createElement(FieldRow, { label: 'Site address:', value: (d.siteAddress || d.project_address) as string }),

        React.createElement(View, { style: [base.fieldRow, { alignItems: 'flex-start', minHeight: 45, paddingTop: 3 }] },
          React.createElement(View, { style: { flexDirection: 'row', width: '100%' } },
            React.createElement(Text, { style: base.fieldLabel }, 'NZBC clauses:'),
            React.createElement(View, { style: [base.fieldValue, { paddingTop: 2 }] },
              React.createElement(ClauseGrid, { clauses: ALL_CLAUSES_ROW1, selected }),
              React.createElement(ClauseGrid, { clauses: ALL_CLAUSES_ROW2, selected }),
              React.createElement(ClauseGrid, { clauses: ALL_CLAUSES_ROW3, selected }),
            ),
          ),
        ),

        React.createElement(View, { style: base.declarationBox },
          React.createElement(Text, { style: base.declarationText },
            'I have sighted the above building consent and read the attached conditions of consent and confirm that I have undertaken the building work described above in accordance with the consented plans and specifications.',
          ),
          React.createElement(Text, { style: base.declarationText },
            'I understand that Council will rely upon this producer statement, for the purposes of establishing compliance with the above building consent.',
          ),
        ),

        React.createElement(SignatureRow, {
          signatureBase64: signature,
          authorName: profile?.full_name as string,
          regNo: (profile?.lbp_number || profile?.cpeng_number) as string,
          date: d.date as string,
        }),

        React.createElement(Text, { style: base.contactTitle }, "Tradesperson's contact details:"),
        React.createElement(FieldRow, { label: 'Address:', value: (profile?.address || d.address) as string }),
        React.createElement(FieldRow2Col, {
          label1: 'Mobile:', value1: (profile?.phone || d.mobile) as string,
          label2: 'Email:', value2: (profile?.email || d.email) as string,
        }),

        React.createElement(CouncilUseOnly, {
          offices: OFFICES_CNS,
          acceptedLabel: 'Producer statement accepted as establishing compliance with the consented plans:',
        }),

        React.createElement(View, { style: { marginTop: 6 } },
          React.createElement(Text, { style: base.smallText },
            "Producer statements are accepted solely at the Council's discretion; please refer to the Producer Statement Policy which can be found on the Council's website for further details",
          ),
        ),
      ),

      React.createElement(FooterBar, null),
    ),
  );
};
