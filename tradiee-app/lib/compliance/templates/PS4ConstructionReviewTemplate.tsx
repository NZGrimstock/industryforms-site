/**
 * PS4ConstructionReviewTemplate.tsx — AC2315
 * Producer Statement Construction Review (PS4)
 */
import React from 'react';
import {
  Document, Page, View, Text,
  base,
  HeaderBar, InstructionBanner, FooterBar,
  FieldRow, FieldRow2Col, SignatureRow, YesNo,
  ClauseGrid,
  ALL_CLAUSES_ROW1, ALL_CLAUSES_ROW2, ALL_CLAUSES_ROW3,
  expandClauseCodes,
} from './BaseTemplate';

export const PS4ConstructionReviewTemplate = ({
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
  const selected: string[] = expandClauseCodes((d.nzbcClauses as string[]) || []);

  return React.createElement(
    Document,
    { title: `PS4 — ${psNumber}` },
    React.createElement(
      Page,
      { size: 'A4', style: base.page },

      React.createElement(HeaderBar, {
        formCode: 'Producer statement construction review (PS4)',
        formTitle: 'AC2315',
        psNumber,
        user: profile,
      }),

      React.createElement(InstructionBanner, {
        text: 'TO BE COMPLETED BY THE DESIGN PROFESSIONAL WHO HAS BEEN ENGAGED TO OBSERVE CONSTRUCTION',
      }),

      React.createElement(View, { style: base.body },

        React.createElement(FieldRow2Col, {
          label1: 'Author name:', value1: (profile?.full_name || d.authorName) as string,
          label2: 'Author number:', value2: (profile?.lbp_number || profile?.cpeng_number || d.authorNumber) as string,
        }),
        React.createElement(FieldRow, { label: 'Author company:', value: (profile?.company_name || d.authorCompany) as string }),
        React.createElement(FieldRow, { label: 'Building consent No:', value: (d.buildingConsentNo || d.bc_reference) as string }),
        React.createElement(FieldRow, { label: 'Site address:', value: (d.siteAddress || d.project_address) as string }),
        React.createElement(FieldRow, { label: 'Legal description:', value: d.legalDescription as string }),
        React.createElement(FieldRow, { label: "Engaged by: (Owner's name)", value: d.engagedBy as string }),

        React.createElement(View, { style: base.declarationBox },
          React.createElement(Text, { style: base.declarationText },
            'I confirm that I have sighted the above building consent and read the attached conditions of consent. Further, based upon my observations and information supplied by the contractor during the course of construction I believe on reasonable grounds that the building work has been completed in accordance with the building consent and consented plans.',
          ),
          React.createElement(Text, { style: [base.declarationText, base.italicText] },
            'NB Engineer must leave inspection records on site following inspection',
          ),
        ),

        React.createElement(FieldRow, { label: 'Description of building work observed:', value: (d.observationDetails || d.descriptionOfWork) as string }),

        React.createElement(View, { style: [base.fieldRow, { alignItems: 'flex-start', minHeight: 45, paddingTop: 3 }] },
          React.createElement(View, { style: { flexDirection: 'row', width: '100%' } },
            React.createElement(Text, { style: [base.fieldLabel, { paddingTop: 0 }] }, 'NZBC clauses: (select as applicable)\nNB: all statements must include B2'),
            React.createElement(View, { style: [base.fieldValue, { paddingTop: 2 }] },
              React.createElement(ClauseGrid, { clauses: ALL_CLAUSES_ROW1, selected }),
              React.createElement(ClauseGrid, { clauses: ALL_CLAUSES_ROW2, selected }),
              React.createElement(ClauseGrid, { clauses: ALL_CLAUSES_ROW3, selected }),
            ),
          ),
        ),

        React.createElement(View, { style: base.declarationBox },
          React.createElement(Text, { style: base.declarationText },
            'I understand that this producer statement, if accepted, will be relied upon by Council for the purposes of establishing compliance with the above building consent.',
          ),
        ),

        React.createElement(SignatureRow, {
          signatureBase64: signature,
          authorName: profile?.full_name as string,
          regNo: (profile?.lbp_number || profile?.cpeng_number) as string,
          date: d.date as string,
        }),

        React.createElement(FieldRow2Col, {
          label1: 'Address:', value1: (profile?.address || d.address) as string,
          label2: 'Postcode:', value2: (d.postcode) as string,
        }),
        React.createElement(FieldRow2Col, {
          label1: 'Mobile:', value1: (profile?.phone || d.mobile) as string,
          label2: 'Email:', value2: (profile?.email || d.email) as string,
        }),

        React.createElement(View, { style: base.councilBox },
          React.createElement(View, { style: base.councilHeader },
            React.createElement(Text, { style: base.councilHeaderText }, 'COUNCIL USE ONLY'),
          ),
          React.createElement(View, { style: base.councilBody },
            React.createElement(View, { style: base.councilRow },
              React.createElement(View, { style: [base.councilField, { flex: 2 }] },
                React.createElement(Text, { style: base.councilLabel }, 'Received by:'),
                React.createElement(View, { style: base.councilLine }),
              ),
              React.createElement(View, { style: base.councilField },
                React.createElement(Text, { style: base.councilLabel }, 'Register checked:'),
                React.createElement(YesNo, null),
              ),
            ),
            React.createElement(View, { style: base.councilRow },
              React.createElement(View, { style: [base.councilField, { flex: 2 }] },
                React.createElement(Text, { style: base.councilLabel }, 'Signature:'),
                React.createElement(View, { style: base.councilLine }),
              ),
              React.createElement(View, { style: base.councilField },
                React.createElement(Text, { style: base.councilLabel }, 'Registration current:'),
                React.createElement(YesNo, null),
              ),
            ),
            React.createElement(View, { style: [base.councilRow, { alignItems: 'center' }] },
              React.createElement(Text, { style: [base.councilLabel, { flex: 1, fontSize: 8 }] }, 'Producer statement accepted as establishing compliance with the consented plans:'),
              React.createElement(YesNo, null),
            ),
          ),
        ),

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
