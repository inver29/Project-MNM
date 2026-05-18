import { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AccountRole } from "@/types/domain";

interface AccessGateProps {
  allowedRoles?: AccountRole[];
  children?: ReactNode;
}

const AccessGate = ({ allowedRoles, children }: AccessGateProps) => {
  const location = useLocation();
  const { isAuthenticated, isReady, user } = useAuth();

  if (!isReady) {
    return <div className="container mx-auto px-4 py-12">Đang kiểm tra quyền truy cập...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/dang-nhap" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.account_role)) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default AccessGate;
