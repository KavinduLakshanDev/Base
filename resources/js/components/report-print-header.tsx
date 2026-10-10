import AppLogo from '@/components/app-logo';
import { Company } from '@/types';

export interface ReportPrintHeaderProps {
  company: Company;
  title?: string;
  subtitle?: string;
  period?: string;
  extraLines?: Array<{ label: string; value: string }>; // optional extra rows (e.g. report date)
  className?: string;
}

export default function ReportPrintHeader({
  company,
  title,
  subtitle,
  period,
  extraLines = [],
  className = '',
}: ReportPrintHeaderProps) {
  const addressParts = [company.address, company.city, company.state, company.postal_code]
    .filter(Boolean)
    .join(', ');

  return (
    <div className={`hidden print:block print-header mb-4 ${className}`.trim()}>
      <div className="mb-4 text-center">
        <div className="mx-auto mb-2" style={{ width: '140px' }}>
          <AppLogo companyCode={company?.company_code} />
        </div>
        {/* <div className="print-company-name" style={{ marginBottom: '4px' }}>
          {company?.name ?? ''}
        </div> */}
        {addressParts && <div className="text-sm font-small">{addressParts}</div>}
        {company.phone && <div className="text-sm font-small">{`Phone: ${company.phone}`}</div>}
        {subtitle && <div className="text-sm font-small">{subtitle}</div>}
        {title && <div className="print-report-title mt-2">{title}</div>}
      </div>

      {period && (
        <div className="flex justify-between text-[10px] mb-3">
          <div>
            <strong>Period:</strong> {period}
          </div>
        </div>
      )}

      {extraLines.length > 0 && (
        <div className="text-[10px] mb-3">
          {extraLines.map((line) => (
            <div key={line.label} className="flex justify-between">
              <div>
                <strong>{line.label}:</strong>
              </div>
              <div className="text-right">{line.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
