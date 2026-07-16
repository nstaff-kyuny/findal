import { supabase } from "@/integrations/supabase/client";

export type CompanyInfo = {
  name: string;
  ceo: string;
  bizNo: string;
  mailOrderNo: string;
  appName: string;
  address: string;
  phone: string;
  email: string;
};

export const COMPANY_INFO: CompanyInfo = {
  name: "(주)엔스태프",
  ceo: "김학균",
  bizNo: "000-00-00000",
  mailOrderNo: "000-000-00000",
  appName: "Find AR (파인달)",
  address: "",
  phone: "",
  email: "",
};

export async function fetchCompanyInfo(): Promise<CompanyInfo> {
  const { data } = await (supabase as any).rpc("get_company_info");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return COMPANY_INFO;
  return {
    name: row.name || COMPANY_INFO.name,
    ceo: row.ceo || COMPANY_INFO.ceo,
    bizNo: row.biz_no || COMPANY_INFO.bizNo,
    mailOrderNo: row.mail_order_no || COMPANY_INFO.mailOrderNo,
    appName: row.app_name || COMPANY_INFO.appName,
    address: row.address || "",
    phone: row.phone || "",
    email: row.email || "",
  };
}
