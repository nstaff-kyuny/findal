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
  const { data } = await (supabase as any).from("company_info").select("*").eq("id", true).maybeSingle();
  if (!data) return COMPANY_INFO;
  return {
    name: data.name || COMPANY_INFO.name,
    ceo: data.ceo || COMPANY_INFO.ceo,
    bizNo: data.biz_no || COMPANY_INFO.bizNo,
    mailOrderNo: data.mail_order_no || COMPANY_INFO.mailOrderNo,
    appName: data.app_name || COMPANY_INFO.appName,
    address: data.address || "",
    phone: data.phone || "",
    email: data.email || "",
  };
}
