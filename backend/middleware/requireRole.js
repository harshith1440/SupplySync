const { getAuth } = require("@clerk/express");

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const auth = getAuth(req);

    if (!auth.isAuthenticated) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const userRole = auth.orgRole;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }

    next();
  };
};

module.exports = requireRole;