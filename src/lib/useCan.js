import { useSelector } from "react-redux";
import { selectUser } from "@/features/auth/authSlice";
import { hasPerm } from "@/config/app";

/** can("can_manage_courses"): Admins always; Sub-Admins per Team → Permissions. */
export default function useCan() {
    const user = useSelector(selectUser);
    return (perm) => hasPerm(user, perm);
}
