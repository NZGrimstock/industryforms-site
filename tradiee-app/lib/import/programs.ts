export type DataType = 'customers' | 'jobs' | 'invoices' | 'price_list'

export interface ColumnMap {
  // target field → source column header(s) to try (first match wins)
  [targetField: string]: string[]
}

export interface ProgramConfig {
  id: string
  name: string
  logo: string     // emoji placeholder
  color: string
  exportInstructions: Record<DataType, string[]>
  columnMaps: Record<DataType, ColumnMap>
}

// Target fields per data type (what IndustryForms needs)
export const TARGET_FIELDS: Record<DataType, { key: string; label: string; required: boolean }[]> = {
  customers: [
    { key: 'name',            label: 'Name / Company',    required: true  },
    { key: 'type',            label: 'Type',               required: false },
    { key: 'contact_person',  label: 'Contact person',     required: false },
    { key: 'email',           label: 'Email',              required: false },
    { key: 'phone',           label: 'Phone',              required: false },
    { key: 'billing_address', label: 'Billing address',    required: false },
    { key: 'notes',           label: 'Notes',              required: false },
  ],
  jobs: [
    { key: 'title',       label: 'Job title',     required: true  },
    { key: 'description', label: 'Description',   required: false },
    { key: 'status',      label: 'Status',        required: false },
    { key: 'customer',    label: 'Customer name', required: false },
    { key: 'address',     label: 'Site address',  required: false },
    { key: 'notes',       label: 'Notes',         required: false },
  ],
  invoices: [
    { key: 'invoice_number', label: 'Invoice #',      required: true  },
    { key: 'customer',       label: 'Customer name',  required: true  },
    { key: 'date',           label: 'Invoice date',   required: false },
    { key: 'due_date',       label: 'Due date',       required: false },
    { key: 'total',          label: 'Total (ex GST)', required: false },
    { key: 'status',         label: 'Status',         required: false },
    { key: 'description',    label: 'Description',    required: false },
  ],
  price_list: [
    { key: 'name',       label: 'Item name',  required: true  },
    { key: 'unit',       label: 'Unit',       required: false },
    { key: 'sell_price', label: 'Sell price', required: false },
    { key: 'cost_price', label: 'Cost price', required: false },
    { key: 'category',   label: 'Category',   required: false },
    { key: 'sku',        label: 'SKU / Code', required: false },
  ],
}

const PROGRAMS: ProgramConfig[] = [
  {
    id: 'tradify',
    name: 'Tradify',
    logo: '🔧',
    color: '#0066CC',
    exportInstructions: {
      customers: [
        'In Tradify, go to Contacts → Customers',
        'Click "Export" in the top right',
        'Choose "Export to CSV"',
        'Upload the downloaded file below',
      ],
      jobs: [
        'In Tradify, go to Jobs',
        'Filter to the jobs you want to import',
        'Click "Export" → "Export to CSV"',
        'Upload the downloaded file below',
      ],
      invoices: [
        'In Tradify, go to Invoices',
        'Set the date range you want',
        'Click "Export" → "Export to CSV"',
        'Upload the downloaded file below',
      ],
      price_list: [
        'In Tradify, go to Settings → Price List',
        'Click "Export" → "Export to CSV"',
        'Upload the downloaded file below',
      ],
    },
    columnMaps: {
      customers: {
        name:            ['Company Name', 'Name', 'Customer Name', 'Client Name'],
        type:            ['Type', 'Customer Type'],
        contact_person:  ['Contact Name', 'Contact', 'First Name + Last Name'],
        email:           ['Email', 'Email Address'],
        phone:           ['Phone', 'Mobile', 'Phone Number'],
        billing_address: ['Address', 'Billing Address', 'Street Address'],
        notes:           ['Notes', 'Comments'],
      },
      jobs: {
        title:       ['Job Title', 'Title', 'Name', 'Description'],
        description: ['Description', 'Details', 'Notes'],
        status:      ['Status', 'Job Status'],
        customer:    ['Customer', 'Client', 'Customer Name'],
        address:     ['Site Address', 'Address', 'Location'],
        notes:       ['Notes', 'Comments'],
      },
      invoices: {
        invoice_number: ['Invoice Number', 'Invoice No', 'Invoice #', 'Number'],
        customer:       ['Customer', 'Client', 'Customer Name'],
        date:           ['Invoice Date', 'Date', 'Created Date'],
        due_date:       ['Due Date', 'Payment Due'],
        total:          ['Total', 'Amount', 'Total Excl GST', 'Subtotal'],
        status:         ['Status', 'Invoice Status'],
        description:    ['Description', 'Notes'],
      },
      price_list: {
        name:       ['Name', 'Item Name', 'Description', 'Product'],
        unit:       ['Unit', 'Unit of Measure', 'UOM'],
        sell_price: ['Sell Price', 'Retail Price', 'Price', 'Sell'],
        cost_price: ['Cost Price', 'Cost', 'Buy Price'],
        category:   ['Category', 'Type'],
        sku:        ['SKU', 'Code', 'Part Number', 'Item Code'],
      },
    },
  },
  {
    id: 'servicem8',
    name: 'ServiceM8',
    logo: '📋',
    color: '#FF6B35',
    exportInstructions: {
      customers: [
        'In ServiceM8, go to Clients in the left menu',
        'Click the gear icon → Export Clients',
        'Download as CSV',
        'Upload the downloaded file below',
      ],
      jobs: [
        'In ServiceM8, go to Reports → Job Export',
        'Set your date range',
        'Export to CSV',
        'Upload the downloaded file below',
      ],
      invoices: [
        'In ServiceM8, go to Reports → Invoice Export',
        'Set your date range and export as CSV',
        'Upload the downloaded file below',
      ],
      price_list: [
        'In ServiceM8, go to Settings → Materials & Labour',
        'Click Export at the top',
        'Upload the downloaded CSV below',
      ],
    },
    columnMaps: {
      customers: {
        name:            ['name', 'company_name', 'Company Name', 'Name'],
        type:            ['type', 'client_type'],
        contact_person:  ['contact_name', 'Contact Name', 'First Name'],
        email:           ['email', 'Email'],
        phone:           ['phone', 'Phone', 'mobile'],
        billing_address: ['address', 'billing_address', 'Address'],
        notes:           ['notes', 'Notes'],
      },
      jobs: {
        title:       ['job_description', 'Description', 'Job Description', 'summary'],
        description: ['description', 'Notes', 'notes'],
        status:      ['status', 'Status'],
        customer:    ['client_name', 'company_name', 'Client Name'],
        address:     ['job_address', 'Address', 'site_address'],
        notes:       ['notes', 'Notes'],
      },
      invoices: {
        invoice_number: ['invoice_number', 'Number', 'Invoice Number'],
        customer:       ['client_name', 'company_name', 'Client Name'],
        date:           ['date', 'created_date', 'Invoice Date'],
        due_date:       ['payment_due', 'due_date', 'Due Date'],
        total:          ['total_ex_gst', 'subtotal', 'Total'],
        status:         ['status', 'Status'],
        description:    ['description', 'Description'],
      },
      price_list: {
        name:       ['name', 'Name', 'description', 'item_name'],
        unit:       ['unit', 'Unit', 'unit_of_measure'],
        sell_price: ['sell_price', 'price', 'Sell Price', 'unit_price'],
        cost_price: ['cost_price', 'cost', 'Cost', 'Cost Price'],
        category:   ['category', 'Category', 'type'],
        sku:        ['code', 'Code', 'sku', 'SKU', 'part_number'],
      },
    },
  },
  {
    id: 'fergus',
    name: 'Fergus',
    logo: '🏗️',
    color: '#00A651',
    exportInstructions: {
      customers: [
        'In Fergus, go to Contacts',
        'Use the filter to select All Contacts',
        'Click Export → Export to CSV',
        'Upload the downloaded file below',
      ],
      jobs: [
        'In Fergus, go to Jobs',
        'Filter to the status/date range you need',
        'Click Export → Export to CSV',
        'Upload the downloaded file below',
      ],
      invoices: [
        'In Fergus, go to Finance → Invoices',
        'Filter and click Export → Export to CSV',
        'Upload the downloaded file below',
      ],
      price_list: [
        'In Fergus, go to Settings → Price Book',
        'Click Export at the top right',
        'Upload the downloaded CSV below',
      ],
    },
    columnMaps: {
      customers: {
        name:            ['Company', 'Name', 'Customer Name', 'Organisation'],
        type:            ['Type', 'Contact Type'],
        contact_person:  ['First Name', 'Contact Name', 'Full Name'],
        email:           ['Email', 'Email Address'],
        phone:           ['Phone', 'Mobile', 'Phone Number'],
        billing_address: ['Address', 'Postal Address', 'Billing Address'],
        notes:           ['Notes', 'Internal Notes'],
      },
      jobs: {
        title:       ['Job Name', 'Name', 'Title', 'Description'],
        description: ['Description', 'Details', 'Notes'],
        status:      ['Status', 'Job Status'],
        customer:    ['Contact', 'Client', 'Customer', 'Company'],
        address:     ['Site Address', 'Address'],
        notes:       ['Notes', 'Internal Notes'],
      },
      invoices: {
        invoice_number: ['Invoice Number', 'Invoice No', 'Number'],
        customer:       ['Contact', 'Customer', 'Client'],
        date:           ['Date', 'Invoice Date'],
        due_date:       ['Due Date'],
        total:          ['Amount', 'Total', 'Net Amount'],
        status:         ['Status'],
        description:    ['Description', 'Reference'],
      },
      price_list: {
        name:       ['Name', 'Item', 'Description'],
        unit:       ['Unit', 'UOM'],
        sell_price: ['Sell', 'Sell Price', 'Price'],
        cost_price: ['Cost', 'Cost Price'],
        category:   ['Category'],
        sku:        ['Code', 'SKU'],
      },
    },
  },
  {
    id: 'simpro',
    name: 'Simpro',
    logo: '⚡',
    color: '#E31837',
    exportInstructions: {
      customers: [
        'In Simpro, go to People → Customers',
        'Use the search/filter to find your customers',
        'Click Actions → Export → CSV',
        'Upload the downloaded file below',
      ],
      jobs: [
        'In Simpro, go to Jobs → List view',
        'Filter to the jobs you need',
        'Click Actions → Export → CSV',
        'Upload the downloaded file below',
      ],
      invoices: [
        'In Simpro, go to Accounts → Invoices',
        'Filter by date range',
        'Click Export → CSV',
        'Upload the downloaded file below',
      ],
      price_list: [
        'In Simpro, go to Catalogue → Parts',
        'Click Actions → Export → CSV',
        'Upload the downloaded file below',
      ],
    },
    columnMaps: {
      customers: {
        name:            ['Company Name', 'Company', 'Name', 'Customer Name'],
        type:            ['Type', 'Customer Type'],
        contact_person:  ['Primary Contact', 'Contact Name', 'First Name'],
        email:           ['Email', 'Primary Email'],
        phone:           ['Phone', 'Primary Phone', 'Mobile'],
        billing_address: ['Billing Address', 'Address', 'Street'],
        notes:           ['Notes', 'Comments'],
      },
      jobs: {
        title:       ['Name', 'Job Name', 'Description', 'Title'],
        description: ['Description', 'Notes'],
        status:      ['Status', 'Stage'],
        customer:    ['Customer', 'Company', 'Client'],
        address:     ['Site Address', 'Address', 'Location'],
        notes:       ['Notes', 'Internal Notes'],
      },
      invoices: {
        invoice_number: ['Invoice No', 'Invoice Number', 'No'],
        customer:       ['Customer', 'Company Name'],
        date:           ['Date', 'Invoice Date', 'Created'],
        due_date:       ['Due Date', 'Payment Due'],
        total:          ['Total Ex Tax', 'Total', 'Amount', 'Net'],
        status:         ['Status'],
        description:    ['Description', 'Notes'],
      },
      price_list: {
        name:       ['Name', 'Part Name', 'Description'],
        unit:       ['Unit', 'Sell Unit', 'UOM'],
        sell_price: ['Sell Price', 'Price', 'Trade Price'],
        cost_price: ['Buy Price', 'Cost', 'Cost Price'],
        category:   ['Category', 'Group', 'Type'],
        sku:        ['Part No', 'Code', 'SKU', 'Catalogue No'],
      },
    },
  },
  {
    id: 'aroflo',
    name: 'AroFlo',
    logo: '🔩',
    color: '#4A90D9',
    exportInstructions: {
      customers: [
        'In AroFlo, go to Contacts → All Clients',
        'Click the Export icon in the toolbar',
        'Select CSV format',
        'Upload the downloaded file below',
      ],
      jobs: [
        'In AroFlo, go to Tasks → Search',
        'Apply your filters',
        'Click Export → Spreadsheet (CSV)',
        'Upload the downloaded file below',
      ],
      invoices: [
        'In AroFlo, go to Invoicing',
        'Filter to your date range',
        'Click Export → Spreadsheet (CSV)',
        'Upload the downloaded file below',
      ],
      price_list: [
        'In AroFlo, go to Inventory → Catalogue',
        'Click Export → CSV',
        'Upload the downloaded file below',
      ],
    },
    columnMaps: {
      customers: {
        name:            ['Company', 'Business Name', 'Client Name', 'Name'],
        type:            ['Client Type', 'Type'],
        contact_person:  ['Contact Name', 'Primary Contact'],
        email:           ['Email', 'Primary Email'],
        phone:           ['Phone', 'Mobile', 'Primary Phone'],
        billing_address: ['Address', 'Billing Address'],
        notes:           ['Notes'],
      },
      jobs: {
        title:       ['Task Name', 'Title', 'Description', 'Job Name'],
        description: ['Description', 'Summary', 'Notes'],
        status:      ['Status', 'Task Status'],
        customer:    ['Client', 'Company', 'Customer Name'],
        address:     ['Location', 'Site Address', 'Address'],
        notes:       ['Notes', 'Internal Notes'],
      },
      invoices: {
        invoice_number: ['Invoice Number', 'Invoice No', 'Ref'],
        customer:       ['Client', 'Company', 'Client Name'],
        date:           ['Invoice Date', 'Date'],
        due_date:       ['Due Date'],
        total:          ['Amount', 'Total', 'Ex GST'],
        status:         ['Status'],
        description:    ['Description', 'Notes'],
      },
      price_list: {
        name:       ['Name', 'Catalogue Name', 'Description'],
        unit:       ['Unit', 'Unit Type'],
        sell_price: ['Sell Price', 'Retail', 'Price'],
        cost_price: ['Cost Price', 'Cost'],
        category:   ['Category', 'Group'],
        sku:        ['Code', 'Part Number', 'Catalogue Code'],
      },
    },
  },
  {
    id: 'myob',
    name: 'MYOB',
    logo: '📊',
    color: '#6C3483',
    exportInstructions: {
      customers: [
        'In MYOB, go to Card File → Cards List',
        'Set Type to Customer',
        'Click Print → Export to File',
        'Choose Tab-delimited text (.txt) or CSV',
        'Upload the downloaded file below',
      ],
      jobs: [
        'MYOB does not have a native job export — use the closest equivalent (Activities or Sales)',
        'Go to Reports → Sales → Customer Sales',
        'Export to CSV',
        'Upload the downloaded file below',
      ],
      invoices: [
        'In MYOB, go to Reports → Sales → Invoice Register',
        'Set your date range',
        'Click Export → Spreadsheet',
        'Upload the downloaded file below',
      ],
      price_list: [
        'In MYOB, go to Inventory → Items List',
        'Click Print → Export to File → CSV',
        'Upload the downloaded file below',
      ],
    },
    columnMaps: {
      customers: {
        name:            ['Company Name', 'Name', 'Card Name'],
        type:            ['Type', 'Card Type'],
        contact_person:  ['First Name', 'Contact Name', 'Salutation'],
        email:           ['Email', 'Email Address'],
        phone:           ['Phone 1', 'Phone', 'Mobile'],
        billing_address: ['Street', 'Address 1', 'Billing Address'],
        notes:           ['Notes', 'Memo'],
      },
      jobs: {
        title:       ['Description', 'Activity Name', 'Name'],
        description: ['Description', 'Notes', 'Memo'],
        status:      ['Status'],
        customer:    ['Customer', 'Card Name', 'Company Name'],
        address:     ['Address', 'Delivery Address'],
        notes:       ['Notes', 'Memo'],
      },
      invoices: {
        invoice_number: ['Invoice #', 'Invoice Number', 'Reference'],
        customer:       ['Customer Name', 'Card Name'],
        date:           ['Date', 'Invoice Date'],
        due_date:       ['Due Date', 'Balance Due Date'],
        total:          ['Subtotal', 'Total Ex Tax', 'Amount'],
        status:         ['Status'],
        description:    ['Description', 'Memo'],
      },
      price_list: {
        name:       ['Item Name', 'Name', 'Description'],
        unit:       ['Selling Unit', 'Unit'],
        sell_price: ['Selling Price', 'Price', 'Base Selling Price'],
        cost_price: ['Cost Price', 'Buy Price', 'Last Cost Price'],
        category:   ['Item Type', 'Category'],
        sku:        ['Item Number', 'SKU', 'Code'],
      },
    },
  },
  {
    id: 'other',
    name: 'Other / Custom CSV',
    logo: '📁',
    color: '#6B7280',
    exportInstructions: {
      customers: ['Export your customers as a CSV file from your existing program', 'Upload the file below and map the columns manually'],
      jobs:      ['Export your jobs as a CSV file from your existing program', 'Upload the file below and map the columns manually'],
      invoices:  ['Export your invoices as a CSV file from your existing program', 'Upload the file below and map the columns manually'],
      price_list:['Export your price list / items as a CSV file from your existing program', 'Upload the file below and map the columns manually'],
    },
    columnMaps: { customers: {}, jobs: {}, invoices: {}, price_list: {} },
  },
]

export default PROGRAMS
