// Prisma enums (re-exported for centralized access)
export {
    PatientStatus,
    LotType,
    LotStatus,
    DispensationStatus,
    MovementType,
    CostType,
    ReprocanStatus,
    PaymentStatus,
    PaymentMethod,
    CashMovementType,
    StrainType,
    ProductPresentationType,
    PhysicalUnitType,
    AppointmentStatus,
    AppointmentReason,
    ReportType,
    MembershipStatus,
} from '@prisma/client';

// Custom enums
export { RoleName } from './role.enum';
export { AuditAction } from './audit-action.enum';
export { SignatureType } from './signature-type.enum';
export { SYSTEM_ORGANIZATION } from './system.constants';
