export type PackageStatus =
  | "PREALERTED"
  | "RECEIVED_MIA"
  | "IN_TRANSIT"
  | "ARRIVED_HN"
  | "DELIVERED";

export type ShipmentStatus = "REQUESTED" | "ASSIGNED" | "IN_TRANSIT" | "ARRIVED_HN";

export type PickupRequestStatus = "SUBMITTED" | "PREPARED" | "DELIVERED";

export interface PrealertRecord {
  id: string;
  code: string;
  customerId: string;
  trackingRaw: string;
  trackingNormalized: string;
  carrier: string;
  store: string;
  description: string;
  declaredValue: number;
  currency: string;
  status: PackageStatus;
  createdAt: string;
  packageCode: string;
}

export interface PackageRecord {
  id: string;
  code: string;
  publicId: string;
  customerId: string;
  prealertId: string;
  carrier: string;
  trackingRaw: string;
  trackingNormalized: string;
  warehouseId: string;
  locationId: string | null;
  status: PackageStatus;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  description: string;
  declaredValue: number;
  currency: string;
  store: string;
}

export interface ShipmentRecord {
  id: string;
  code: string;
  customerId: string;
  method: "AIR" | "SEA";
  originWarehouseId: string;
  destinationWarehouseId: string;
  packageCodes: string[];
  status: ShipmentStatus;
  createdAt: string;
}

export interface PickupRequestRecord {
  id: string;
  code: string;
  customerId: string;
  warehouseId: string;
  packageCodes: string[];
  status: PickupRequestStatus;
  requestedAt: string;
}

export interface DeliveryRecord {
  id: string;
  code: string;
  customerId: string;
  warehouseId: string;
  packageCodes: string[];
  method: string;
  deliveredAt: string;
}

const prealerts: PrealertRecord[] = [];
const packages: PackageRecord[] = [];
const shipments: ShipmentRecord[] = [];
const pickupRequests: PickupRequestRecord[] = [];
const deliveries: DeliveryRecord[] = [];

const WAREHOUSE_MIA = "MIA";
const WAREHOUSE_TEGUCIGALPA = "TGU";

const normalizeTracking = (value: string) => value.trim().toUpperCase();

const formatDate = (date: Date) => date.toISOString();

const buildCode = (prefix: string) =>
  `${prefix}-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const getPackageByCode = (code: string) => packages.find((item) => item.code === code);

const getPrealertByCode = (code: string) => prealerts.find((item) => item.code === code);

const updatePackageStatus = (
  packageCode: string,
  status: PackageStatus,
  updates: Partial<PackageRecord> = {},
) => {
  const pkg = getPackageByCode(packageCode);

  if (!pkg) {
    throw new Error(`Package ${packageCode} was not found.`);
  }

  Object.assign(pkg, updates, {
    status,
    updatedAt: formatDate(new Date()),
  });

  return pkg;
};

export function listPrealerts() {
  return prealerts;
}

export function listPackages() {
  return packages;
}

export function listShipments() {
  return shipments;
}

export function listPickupRequests() {
  return pickupRequests;
}

export function listDeliveries() {
  return deliveries;
}

export function getPackage(code: string) {
  return getPackageByCode(code);
}

export function getOverview() {
  return {
    summary: {
      totalPrealerts: prealerts.length,
      totalPackages: packages.length,
      receivedInMiami: packages.filter((item) => item.status === "RECEIVED_MIA").length,
      inTransit: packages.filter((item) => item.status === "IN_TRANSIT").length,
      arrivedInHonduras: packages.filter((item) => item.status === "ARRIVED_HN").length,
      delivered: packages.filter((item) => item.status === "DELIVERED").length,
    },
    prealerts,
    packages,
    shipments,
    pickupRequests,
    deliveries,
  };
}

export function createPrealert(input: {
  customerId?: string;
  trackingRaw: string;
  carrier?: string;
  store?: string;
  description?: string;
  declaredValue?: number;
  currency?: string;
}) {
  const trackingRaw = input.trackingRaw?.trim();

  if (!trackingRaw) {
    throw new Error("trackingRaw is required.");
  }

  const trackingNormalized = normalizeTracking(trackingRaw);
  const carrier = input.carrier?.trim() || "Otro";
  const store = input.store?.trim() || "No especificada";
  const description = input.description?.trim() || "Paquete pendiente de recibo";
  const declaredValue = Number(input.declaredValue ?? 0);
  const currency = input.currency?.trim().toUpperCase() || "USD";
  const customerId = input.customerId?.trim() || "customer-demo";
  const now = formatDate(new Date());

  const code = buildCode("KG-P");
  const prealert: PrealertRecord = {
    id: buildCode("PRE"),
    code,
    customerId,
    trackingRaw,
    trackingNormalized,
    carrier,
    store,
    description,
    declaredValue,
    currency,
    status: "PREALERTED",
    createdAt: now,
    packageCode: code,
  };

  const pkg: PackageRecord = {
    id: buildCode("PKG"),
    code,
    publicId: buildCode("PBL"),
    customerId,
    prealertId: prealert.id,
    carrier,
    trackingRaw,
    trackingNormalized,
    warehouseId: WAREHOUSE_MIA,
    locationId: null,
    status: "PREALERTED",
    receivedAt: null,
    createdAt: now,
    updatedAt: now,
    description,
    declaredValue,
    currency,
    store,
  };

  prealerts.unshift(prealert);
  packages.unshift(pkg);

  return {
    prealert,
    package: pkg,
  };
}

export function receivePackage(
  packageCode: string,
  input: {
    locationId?: string;
    warehouseId?: string;
    meassurements?: {
      weightKg?: number;
      lengthCm?: number;
      widthCm?: number;
      heightCm?: number;
    };
  } = {},
) {
  const pkg = getPackageByCode(packageCode);

  if (!pkg) {
    throw new Error(`Package ${packageCode} does not exist.`);
  }

  const receivedAt = formatDate(new Date());

  updatePackageStatus(pkg.code, "RECEIVED_MIA", {
    locationId: input.locationId || "MIA-A-03-12",
    warehouseId: input.warehouseId || WAREHOUSE_MIA,
    receivedAt,
  });

  const prealert = getPrealertByCode(pkg.code);

  if (prealert) {
    prealert.status = "RECEIVED_MIA";
  }

  return {
    package: pkg,
    measurements: input.meassurements || null,
  };
}

export function createShipment(input: {
  customerId?: string;
  packageCodes: string[];
  method?: "AIR" | "SEA";
}) {
  const packageCodes = [...new Set((input.packageCodes || []).filter(Boolean))];

  if (packageCodes.length === 0) {
    throw new Error("At least one packageCode is required.");
  }

  const customerId = input.customerId?.trim() || "customer-demo";
  const shipmentCode = buildCode("KG-S");
  const method = input.method || "AIR";

  const shipment: ShipmentRecord = {
    id: buildCode("SHIP"),
    code: shipmentCode,
    customerId,
    method,
    originWarehouseId: WAREHOUSE_MIA,
    destinationWarehouseId: WAREHOUSE_TEGUCIGALPA,
    packageCodes,
    status: "REQUESTED",
    createdAt: formatDate(new Date()),
  };

  packageCodes.forEach((packageCode) => {
    const pkg = getPackageByCode(packageCode);

    if (!pkg) {
      throw new Error(`Package ${packageCode} does not exist.`);
    }

    if (pkg.status !== "RECEIVED_MIA") {
      throw new Error(`Package ${packageCode} must be received in Miami before creating a shipment.`);
    }

    updatePackageStatus(packageCode, "IN_TRANSIT");
  });

  shipments.unshift(shipment);

  return shipment;
}

export function createPickupRequest(input: {
  customerId?: string;
  warehouseId?: string;
  packageCodes: string[];
}) {
  const packageCodes = [...new Set((input.packageCodes || []).filter(Boolean))];

  if (packageCodes.length === 0) {
    throw new Error("At least one packageCode is required.");
  }

  const customerId = input.customerId?.trim() || "customer-demo";

  const pickupRequest: PickupRequestRecord = {
    id: buildCode("PICK"),
    code: buildCode("KG-R"),
    customerId,
    warehouseId: input.warehouseId || WAREHOUSE_TEGUCIGALPA,
    packageCodes,
    status: "SUBMITTED",
    requestedAt: formatDate(new Date()),
  };

  pickupRequests.unshift(pickupRequest);

  return pickupRequest;
}

export function createDelivery(input: {
  customerId?: string;
  warehouseId?: string;
  pickupRequestCode?: string;
  packageCodes: string[];
  method?: string;
}) {
  const packageCodes = [...new Set((input.packageCodes || []).filter(Boolean))];

  if (packageCodes.length === 0) {
    throw new Error("At least one packageCode is required.");
  }

  const customerId = input.customerId?.trim() || "customer-demo";
  const deliveryCode = buildCode("KG-D");

  packageCodes.forEach((packageCode) => {
    const pkg = getPackageByCode(packageCode);

    if (!pkg) {
      throw new Error(`Package ${packageCode} does not exist.`);
    }

    updatePackageStatus(packageCode, "DELIVERED");
  });

  const delivery: DeliveryRecord = {
    id: buildCode("DLV"),
    code: deliveryCode,
    customerId,
    warehouseId: input.warehouseId || WAREHOUSE_TEGUCIGALPA,
    packageCodes,
    method: input.method || "ENTREGA_LOCAL",
    deliveredAt: formatDate(new Date()),
  };

  deliveries.unshift(delivery);

  if (input.pickupRequestCode) {
    const finding = pickupRequests.find((item) => item.code === input.pickupRequestCode);

    if (finding) {
      finding.status = "DELIVERED";
    }
  }

  return delivery;
}

export function getPackageTimeline(code: string) {
  const pkg = getPackageByCode(code);

  if (!pkg) {
    throw new Error(`Package ${code} does not exist.`);
  }

  return {
    package: pkg,
    shipments: shipments.filter((shipment) => shipment.packageCodes.includes(code)),
    pickupRequests: pickupRequests.filter((request) => request.packageCodes.includes(code)),
    deliveries: deliveries.filter((delivery) => delivery.packageCodes.includes(code)),
  };
}
