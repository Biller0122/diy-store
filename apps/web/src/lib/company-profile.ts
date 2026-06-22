import { vendureShopFetch } from './vendure';

export type CompanyProfile = {
  id: string;
  isCompany: boolean;
  companyName: string | null;
  companySlug: string | null;
  companyLogo: string | null;
  companyCover: string | null;
  companyPhone: string | null;
  companyDescription: string | null;
  companyPortfolio: string[];
};

export type CompanyImageTarget = 'LOGO' | 'COVER' | 'PORTFOLIO';

const FIELDS = `
  id isCompany companyName companySlug companyLogo companyCover
  companyPhone companyDescription companyPortfolio
`;

/** Нэвтэрсэн customer-ийн өөрийн компанийн профайл (null = нэвтрээгүй). */
export async function fetchMyCompanyProfile(): Promise<CompanyProfile | null> {
  const data = await vendureShopFetch<{ myCompanyProfile: CompanyProfile | null }>(
    `query { myCompanyProfile { ${FIELDS} } }`,
    undefined,
    { revalidate: 0 },
  );
  return data.myCompanyProfile;
}

/** Нийтийн компанийн профайл slug-аар (PII-гүй). */
export async function fetchCompanyProfile(slug: string): Promise<CompanyProfile | null> {
  const data = await vendureShopFetch<{ companyProfile: CompanyProfile | null }>(
    `query ($slug: String!) { companyProfile(slug: $slug) { ${FIELDS} } }`,
    { slug },
    { revalidate: 60 },
  );
  return data.companyProfile;
}

export async function fetchCompanyProfiles(
  take = 24,
  skip = 0,
): Promise<{ items: CompanyProfile[]; total: number }> {
  const data = await vendureShopFetch<{ companyProfiles: { items: CompanyProfile[]; total: number } }>(
    `query ($take: Int, $skip: Int) { companyProfiles(take: $take, skip: $skip) { total items { ${FIELDS} } } }`,
    { take, skip },
    { revalidate: 60 },
  );
  return data.companyProfiles;
}

export type UpdateCompanyProfileInput = {
  companyName?: string;
  companyPhone?: string;
  companyDescription?: string;
  companyPortfolio?: string[];
  isCompany?: boolean;
};

export async function updateCompanyProfile(input: UpdateCompanyProfileInput): Promise<CompanyProfile> {
  const data = await vendureShopFetch<{ updateCompanyProfile: CompanyProfile }>(
    `mutation ($input: UpdateCompanyProfileInput!) { updateCompanyProfile(input: $input) { ${FIELDS} } }`,
    { input },
  );
  return data.updateCompanyProfile;
}

export async function uploadCompanyImage(
  file: { filename: string; mimeType: string; dataUrl: string },
  target: CompanyImageTarget,
): Promise<string> {
  const data = await vendureShopFetch<{ uploadCompanyProfileImage: string }>(
    `mutation ($input: CompanyProfileImageInput!) { uploadCompanyProfileImage(input: $input) }`,
    { input: { ...file, target } },
  );
  return data.uploadCompanyProfileImage;
}

/** File → dataURL (base64) — upload mutation-д өгөхөд бэлэн. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Зураг уншихад алдаа гарлаа'));
    reader.readAsDataURL(file);
  });
}
