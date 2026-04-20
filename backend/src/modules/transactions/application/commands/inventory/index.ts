import {
  CreateInventoryCountUseCase,
  CreateInventoryCountCommand,
} from '../create-inventory-count.usecase';
import {
  CreateInventoryReservationUseCase,
  CreateInventoryReservationCommand,
} from '../create-inventory-reservation.usecase';
import {
  CreateInventoryBlockUseCase,
  CreateInventoryBlockCommand,
} from '../create-inventory-block.usecase';
import {
  CreateInventoryUnblockUseCase,
  CreateInventoryUnblockCommand,
} from '../create-inventory-unblock.usecase';

export const inventoryCommandHandlers = [
  CreateInventoryCountUseCase,
  CreateInventoryReservationUseCase,
  CreateInventoryBlockUseCase,
  CreateInventoryUnblockUseCase,
];

export const inventoryCommands = [
  CreateInventoryCountCommand,
  CreateInventoryReservationCommand,
  CreateInventoryBlockCommand,
  CreateInventoryUnblockCommand,
];

export {
  CreateInventoryCountUseCase,
  CreateInventoryCountCommand,
  CreateInventoryReservationUseCase,
  CreateInventoryReservationCommand,
  CreateInventoryBlockUseCase,
  CreateInventoryBlockCommand,
  CreateInventoryUnblockUseCase,
  CreateInventoryUnblockCommand,
};
