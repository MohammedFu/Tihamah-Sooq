import { Link, useLocation } from "react-router-dom";
import { ErrorState } from "../../../components/ui/ErrorState";

export function SessionExpiredPage() {
  const location = useLocation();
  return <ErrorState fullPage variant="session_expired" action={<Link className="button" state={location.state} to="/login">تسجيل الدخول مجدداً</Link>} />;
}

export function UnauthorizedPage() {
  const location = useLocation();
  return <ErrorState fullPage variant="unauthorized" action={<Link className="button" state={location.state} to="/login">الانتقال إلى تسجيل الدخول</Link>} />;
}
