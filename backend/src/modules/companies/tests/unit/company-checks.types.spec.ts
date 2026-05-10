import {
  buildDefaultCompanyCheckSettings,
  sanitizeCompanyCheckSettings,
} from '@modules/companies/domain/company-checks.types';

describe('CompanyCheckSettings helpers', () => {
  it('default is all-disabled', () => {
    expect(buildDefaultCompanyCheckSettings()).toEqual({
      enabled: false,
      receiveChecks: false,
      issueChecks: false,
      allowPostdated: false,
      defaultDepositBankAccountKey: null,
      defaultIssueBankAccountKey: null,
    });
  });

  it('sanitize forces dependent flags to false when enabled=false', () => {
    const out = sanitizeCompanyCheckSettings({
      enabled: false,
      receiveChecks: true,
      issueChecks: true,
      allowPostdated: true,
    });
    expect(out.enabled).toBe(false);
    expect(out.receiveChecks).toBe(false);
    expect(out.issueChecks).toBe(false);
    expect(out.allowPostdated).toBe(false);
  });

  it('sanitize coerces truthy variants', () => {
    const out = sanitizeCompanyCheckSettings({
      enabled: 'true',
      receiveChecks: 1,
      issueChecks: true,
      allowPostdated: '1',
      defaultDepositBankAccountKey: '  acct-1  ',
      defaultIssueBankAccountKey: '',
    });
    expect(out).toEqual({
      enabled: true,
      receiveChecks: true,
      issueChecks: true,
      allowPostdated: true,
      defaultDepositBankAccountKey: 'acct-1',
      defaultIssueBankAccountKey: null,
    });
  });
});
