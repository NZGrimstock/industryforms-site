/**
 * PS2DesignReviewTemplate.tsx — AC2305
 * Producer Statement Design Review (PS2)
 */
import React from 'react';
import {
  Document, Page, View, Text,
  base, COLORS,
  HeaderBar, InstructionBanner, FooterBar,
  FieldRow, FieldRow2Col, SignatureRow, CouncilUseOnly,
  ClauseGrid, CheckItem,
  ALL_CLAUSES_ROW1, ALL_CLAUSES_ROW2, ALL_CLAUSES_ROW3,
  expandClauseCodes,
} from './BaseTemplate';

export const PS2DesignReviewTemplate = ({
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
    { title: `PS2 — ${psNumber}` },
    React.createElement(
      Page,
      { size: 'A4', style: base.page },

      React.createElement(HeaderBar, { formCode: 'Producer statement design review (PS2)', formTitle: '', psNumber, user: profile }),

      React.createElement(InstructionBanner, {
        text: 'TO BE COMPLETED BY THE DESIGN PROFESSIONAL WHO HAS BEEN ENGAGED TO PROVIDE A DESIGN REVIEW',
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
        React.createElement(FieldRow, { label: 'Engaged by:', value: d.engagedBy as string }),

        React.createElement(View, { style: [base.fieldRow, { alignItems: 'flex-start', minHeight: 28 }] },
          React.createElement(Text, { style: base.fieldLabel }, 'To provide design review services in respect of: (Describe work)'),
          React.createElement(View, { style: [base.fieldValue, { paddingTop: 3 }] },
            React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 } },
              React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 3 } },
                React.createElement(View, { style: [base.checkBox, d.reviewScope === 'part' ? base.checkBoxChecked : {}] }),
                React.createElement(Text, { style: { fontSize: 8.5, color: '#1a1a1a' } }, 'Part'),
              ),
              React.createElement(View, { style: { flexDirection: 'row', alignItems: 'center', gap: 3 } },
                React.createElement(View, { style: [base.checkBox, d.reviewScope === 'all' ? base.checkBoxChecked : {}] }),
                React.createElement(Text, { style: { fontSize: 8.5, color: '#1a1a1a' } }, 'All'),
              ),
            ),
            React.createElement(Text, { style: { fontSize: 8.5, color: '#1a1a1a', lineHeight: 1.4 } }, (d.reviewWorkDescription || d.descriptionOfWork || '') as string),
          ),
        ),

        React.createElement(View, { style: [base.fieldRow, { alignItems: 'flex-start', minHeight: 40, paddingTop: 3 }] },
          React.createElement(View, { style: { flexDirection: 'row', width: '100%' } },
            React.createElement(Text, { style: [base.fieldLabel, { paddingTop: 0 }] }, 'NZBC clauses: (circle as applicable)\nNB: all statements must include B2'),
            React.createElement(View, { style: [base.fieldValue, { paddingTop: 2 }] },
              React.createElement(ClauseGrid, { clauses: ALL_CLAUSES_ROW1, selected }),
              React.createElement(ClauseGrid, { clauses: ALL_CLAUSES_ROW2, selected }),
              React.createElement(ClauseGrid, { clauses: ALL_CLAUSES_ROW3, selected }),
            ),
          ),
        ),

        React.createElement(View, { style: { marginTop: 8 } },
          React.createElement(Text, { style: [base.declarationText, base.boldText] }, 'The design has been prepared in accordance with:'),
          React.createElement(CheckItem, {
            label: 'Documents issued by the Ministry of Business Innovation & Employment (verification method / acceptable solution)',
            checked: d.compliancePath === 'MBIE',
          }),
          React.createElement(CheckItem, {
            label: 'Alternative solution (attach schedule if required)',
            checked: d.compliancePath === 'alternative',
          }),
        ),

        React.createElement(View, { style: base.declarationBox },
          React.createElement(Text, { style: base.declarationText },
            'The proposed building work covered by this producer statement design review is described on the drawings referenced below, together with the specifications and other documents set out in the schedule attached to this statement:',
          ),
        ),

        React.createElement(FieldRow, { label: 'Drawings reviewed:', value: (d.drawings || d.drawingTitle) as string }),

        React.createElement(View, { style: { marginTop: 6 } },
          React.createElement(Text, { style: base.declarationText }, 'The producer statement is subject to:'),
          React.createElement(View, { style: { borderBottom: `0.5pt solid ${COLORS.border}`, height: 24, marginVertical: 4 } }),
        ),

        React.createElement(View, { style: base.declarationBox },
          React.createElement(Text, { style: base.declarationText },
            'On the basis of the review undertaken, I believe on reasonable grounds that the proposed building work will comply with the relevant provisions of the Building Code if constructed in accordance with the drawings, specifications and other documents provided or listed with this statement.',
          ),
          React.createElement(Text, { style: base.declarationText },
            'I understand that the Council is reliant on this producer statement for the purposes of establishing compliance with the relevant provisions of the Building Act 2004, Building Regulations and Building Code. I confirm that I hold a current policy of professional indemnity insurance to the value required by the Council.',
          ),
        ),

        React.createElement(SignatureRow, {
          signatureBase64: signature,
          authorName: profile?.full_name as string,
          regNo: (profile?.lbp_number || profile?.cpeng_number) as string,
          date: d.date as string,
          signatureLabel: 'Signed by:',
        }),

        React.createElement(FieldRow, { label: 'Address:', value: (profile?.address || d.address) as string }),
        React.createElement(FieldRow2Col, {
          label1: 'Mobile:', value1: (profile?.phone || d.mobile) as string,
          label2: 'Email:', value2: (profile?.email || d.email) as string,
        }),

        React.createElement(View, { style: { marginTop: 6 } },
          React.createElement(Text, { style: [base.declarationText, base.boldText] }, 'COMMENTS'),
          React.createElement(View, { style: { borderBottom: `0.5pt solid ${COLORS.border}`, height: 40 } }),
        ),

        React.createElement(CouncilUseOnly, null),

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
