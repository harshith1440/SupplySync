function isRetailerAdmin(auth) {
  return auth?.orgRole === "org:retailer_admin";
}

function retailerOwnershipFilter(auth) {
  const filter = { organizationId: auth.orgId };
  if (!isRetailerAdmin(auth)) filter.retailerUserId = auth.userId;
  return filter;
}

module.exports = { isRetailerAdmin, retailerOwnershipFilter };