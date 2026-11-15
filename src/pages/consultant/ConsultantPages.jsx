import { useSelector } from "react-redux";

import { selectUser } from "@/features/auth/authSlice";
import CrmOverview from "@/components/crm/CrmOverview";
import LeadsBoard from "@/components/crm/LeadsBoard";
import FollowUpsBoard from "@/components/crm/FollowUpsBoard";
import SalesBoard from "@/components/crm/SalesBoard";
import { AssignmentsBoard, DiscountLinksBoard, IssuedCertificatesBoard } from "@/components/crm/CrmRecords";

/** Consultant workspace pages (own leads only — the server enforces it). */
export function ConsultantOverviewPage() {
    const user = useSelector(selectUser);
    return <CrmOverview name={user?.name} leadsPath="/consultant/leads" />;
}
export const ConsultantLeadsPage = () => <LeadsBoard />;
export const ConsultantFollowUpsPage = () => <FollowUpsBoard />;
export const ConsultantSalesPage = () => <SalesBoard />;
export const ConsultantDiscountsPage = () => <DiscountLinksBoard />;
export const ConsultantAssignmentsPage = () => <AssignmentsBoard />;
export const ConsultantCertificatesPage = () => <IssuedCertificatesBoard />;

/** Admin → Leads / Follow-ups: the same screens across the whole team. */
export const AdminLeadsPage = () => <LeadsBoard isAdmin />;
export const AdminFollowUpsPage = () => <FollowUpsBoard isAdmin />;
export const AdminSalesPage = () => <SalesBoard isAdmin />;
export const AdminCrmDiscountsPage = () => <DiscountLinksBoard isAdmin />;
